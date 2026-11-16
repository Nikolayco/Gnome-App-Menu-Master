import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import { AppMenu } from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { findAppFolder, getAppFoldersSettings, getFolderSettings, moveAppToFolder } from './categorizer.js';
import { t } from './i18n.js';

function runCommandAsync(argv) {
    return new Promise((resolve, reject) => {
        try {
            const proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            proc.communicate_utf8_async(null, null, (source, res) => {
                try {
                    const [, stdout, stderr] = source.communicate_utf8_finish(res);
                    resolve({
                        ok: source.get_successful(),
                        status: source.get_exit_status(),
                        stdout: (stdout || '').trim(),
                        stderr: (stderr || '').trim(),
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

function getDesktopDir() {
    let dir = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
    if (!dir) {
        const masaustu = GLib.build_filenamev([GLib.get_home_dir(), 'Masaüstü']);
        const desktop = GLib.build_filenamev([GLib.get_home_dir(), 'Desktop']);
        dir = GLib.file_test(masaustu, GLib.FileTest.IS_DIR) ? masaustu : desktop;
    }
    return dir;
}

function createConfirmUninstallDialog(appName, detailText, onConfirm) {
    const dialog = new ModalDialog.ModalDialog({ styleClass: 'app-menu-master-dialog' });

    const content = new St.BoxLayout({
        vertical: true,
        style_class: 'app-menu-master-dialog-content',
    });

    const title = new St.Label({
        text: t('Uninstall %s?', appName),
        style_class: 'app-menu-master-dialog-title',
    });
    content.add_child(title);

    const desc = new St.Label({
        text: detailText,
        style_class: 'app-menu-master-dialog-desc',
    });
    if (desc.clutter_text)
        desc.clutter_text.line_wrap = true;
    content.add_child(desc);

    dialog.contentLayout.add_child(content);

    dialog.addButton({
        label: t('Cancel'),
        action: () => dialog.close(),
        key: Clutter.KEY_Escape,
    });

    dialog.addButton({
        label: t('Uninstall'),
        action: () => {
            dialog.close();
            onConfirm();
        },
        key: Clutter.KEY_Return,
        default: true,
    });

    return dialog;
}

export class AppContextMenuManager {
    constructor(settings, onLayoutChanged) {
        this._settings = settings;
        this._onLayoutChanged = onLayoutChanged;
        this._origSetApp = null;
        this._patchedMenus = new Set();
    }

    enable() {
        if (this._origSetApp)
            return;

        const manager = this;
        this._origSetApp = AppMenu.prototype.setApp;

        AppMenu.prototype.setApp = function (app) {
            manager._origSetApp.call(this, app);
            manager._rebuildCustomItems(this, app);
        };
    }

    destroy() {
        if (this._origSetApp) {
            AppMenu.prototype.setApp = this._origSetApp;
            this._origSetApp = null;
        }

        for (const menu of this._patchedMenus)
            this._clearCustomItems(menu);

        this._patchedMenus.clear();
    }

    _clearCustomItems(menu) {
        if (!menu || !menu._ammItems)
            return;
        for (const item of menu._ammItems) {
            try {
                item.destroy();
            } catch (_e) {
                // ignore already destroyed
            }
        }
        menu._ammItems = [];
    }

    _rebuildCustomItems(menu, app) {
        this._clearCustomItems(menu);

        if (!app)
            return;

        if (!menu._ammTracked) {
            menu._ammTracked = true;
            this._patchedMenus.add(menu);
            menu.connect('destroy', () => {
                this._patchedMenus.delete(menu);
            });
        }

        const appId = app.get_id();
        const appInfo = app.get_app_info();
        if (!appId || !appInfo)
            return;

        const showDesktop = this._settings.get_boolean('menu-add-desktop');
        const showFolder = this._settings.get_boolean('menu-move-folder');
        const showHide = this._settings.get_boolean('menu-hide-app');
        const showOpenFile = this._settings.get_boolean('menu-open-desktop-file');
        const showUninstall = this._settings.get_boolean('menu-uninstall');

        if (!showDesktop && !showFolder && !showHide && !showOpenFile && !showUninstall)
            return;

        const items = [];
        const sep = new PopupMenu.PopupSeparatorMenuItem();
        menu.addMenuItem(sep);
        items.push(sep);

        // 1. Add / Remove Desktop Shortcut
        if (showDesktop) {
            const desktopDir = getDesktopDir();
            const targetPath = GLib.build_filenamev([desktopDir, appId]);
            const existsOnDesktop = GLib.file_test(targetPath, GLib.FileTest.EXISTS);

            const desktopItem = new PopupMenu.PopupMenuItem(
                existsOnDesktop ? t('Remove Desktop Shortcut') : t('Add Desktop Shortcut')
            );
            desktopItem.connect('activate', () => {
                menu.close();
                if (existsOnDesktop)
                    this._removeDesktopShortcut(app.get_name(), targetPath);
                else
                    this._addDesktopShortcut(app.get_name(), appInfo, targetPath);
            });
            menu.addMenuItem(desktopItem);
            items.push(desktopItem);
        }

        // 2. Move to Folder Submenu
        if (showFolder) {
            const folderSub = new PopupMenu.PopupSubMenuMenuItem(t('Move to Folder'));
            const foldersSettings = getAppFoldersSettings();
            const folderIds = foldersSettings.get_strv('folder-children');
            const currentFolder = findAppFolder(appId);

            if (currentFolder) {
                const removeItem = new PopupMenu.PopupMenuItem(t('Remove from Folder (Main Grid)'));
                removeItem.connect('activate', () => {
                    menu.close();
                    moveAppToFolder(appId, null);
                    this._onLayoutChanged();
                });
                folderSub.menu.addMenuItem(removeItem);
                if (folderIds.length > 0)
                    folderSub.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }

            if (folderIds.length === 0) {
                const emptyItem = new PopupMenu.PopupMenuItem(t('No folders yet'));
                emptyItem.setSensitive(false);
                folderSub.menu.addMenuItem(emptyItem);
            } else {
                for (const folderId of folderIds) {
                    const fs = getFolderSettings(folderId);
                    const folderName = fs.get_string('name') || folderId;
                    const isCurrent = folderId === currentFolder;
                    const label = isCurrent ? `✓ ${folderName}` : folderName;
                    const fItem = new PopupMenu.PopupMenuItem(label);
                    fItem.setSensitive(!isCurrent);
                    fItem.connect('activate', () => {
                        menu.close();
                        moveAppToFolder(appId, folderId);
                        this._onLayoutChanged();
                    });
                    folderSub.menu.addMenuItem(fItem);
                }
            }

            menu.addMenuItem(folderSub);
            items.push(folderSub);
        }

        // 3. Hide from Menu
        if (showHide) {
            const hideItem = new PopupMenu.PopupMenuItem(t('Hide from Menu'));
            hideItem.connect('activate', () => {
                menu.close();
                const hidden = this._settings.get_strv('hidden-apps');
                if (!hidden.includes(appId)) {
                    hidden.push(appId);
                    this._settings.set_strv('hidden-apps', hidden);
                    Main.notify('App Menu Master', t('%s hidden from menu. You can restore it in Settings.', app.get_name()));
                }
            });
            menu.addMenuItem(hideItem);
            items.push(hideItem);
        }

        // 4. Open .desktop Location
        if (showOpenFile) {
            const desktopFilePath = appInfo.get_filename();
            if (desktopFilePath) {
                const openLocItem = new PopupMenu.PopupMenuItem(t('Open .desktop Location'));
                openLocItem.connect('activate', () => {
                    menu.close();
                    try {
                        const file = Gio.File.new_for_path(desktopFilePath);
                        const parent = file.get_parent();
                        if (parent)
                            Gio.AppInfo.launch_default_for_uri(parent.get_uri(), null);
                    } catch (e) {
                        Main.notify('App Menu Master', t('Could not open location: %s', e.message));
                    }
                });
                menu.addMenuItem(openLocItem);
                items.push(openLocItem);
            }
        }

        // 5. Uninstall Application
        if (showUninstall) {
            const uninstallItem = new PopupMenu.PopupMenuItem(t('Uninstall Application...'));
            uninstallItem.connect('activate', () => {
                menu.close();
                this._handleUninstall(app, appInfo);
            });
            menu.addMenuItem(uninstallItem);
            items.push(uninstallItem);
        }

        menu._ammItems = items;
    }

    async _addDesktopShortcut(appName, appInfo, targetPath) {
        try {
            const srcPath = appInfo.get_filename();
            if (!srcPath) {
                Main.notify('App Menu Master', t('Could not find .desktop file for this application.'));
                return;
            }

            const srcFile = Gio.File.new_for_path(srcPath);
            const destFile = Gio.File.new_for_path(targetPath);

            const parent = destFile.get_parent();
            if (parent && !parent.query_exists(null))
                parent.make_directory_with_parents(null);

            srcFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
            destFile.set_attribute_uint32('unix::mode', 0o755, Gio.FileQueryInfoFlags.NONE, null);

            await runCommandAsync(['gio', 'set', targetPath, 'metadata::trusted', 'true']);
            Main.notify('App Menu Master', t('%s added to desktop.', appName));
        } catch (e) {
            Main.notify('App Menu Master', t('Failed to add desktop shortcut: %s', e.message));
        }
    }

    _removeDesktopShortcut(appName, targetPath) {
        try {
            const file = Gio.File.new_for_path(targetPath);
            if (file.query_exists(null)) {
                file.delete(null);
                Main.notify('App Menu Master', t('%s desktop shortcut removed.', appName));
            }
        } catch (e) {
            Main.notify('App Menu Master', t('Failed to remove shortcut: %s', e.message));
        }
    }

    async _detectAptPackage(appId, desktopPath) {
        const candidates = [];
        if (desktopPath)
            candidates.push(desktopPath);
        if (appId)
            candidates.push(`/usr/share/applications/${appId}`);

        for (const candidate of candidates) {
            if (!GLib.file_test(candidate, GLib.FileTest.EXISTS))
                continue;
            try {
                const dpkgRes = await runCommandAsync(['dpkg', '-S', candidate]);
                if (dpkgRes.ok && dpkgRes.stdout) {
                    const pkgName = dpkgRes.stdout.split('\n')[0].split(':')[0].trim();
                    if (pkgName)
                        return pkgName;
                }
            } catch (_e) {
                // ignore
            }
        }
        return null;
    }

    async _handleUninstall(app, appInfo) {
        const appName = app.get_name() || app.get_id();
        const appId = app.get_id();
        const desktopPath = appInfo.get_filename() || '';
        const method = this._settings.get_string('uninstall-method');

        if (method === 'store') {
            try {
                await runCommandAsync(['gnome-software', `--details=${appId}`]);
            } catch (_e) {
                Main.notify('App Menu Master', t('Could not open Software Center.'));
            }
            return;
        }

        // 1. Flatpak check (supports both user and system installations)
        const flatpakId = appInfo.get_string('X-Flatpak');
        if (flatpakId || desktopPath.includes('/flatpak/')) {
            const targetId = flatpakId || appId.replace(/\.desktop$/, '');
            const isSystemFlatpak = desktopPath.startsWith('/var/lib/flatpak/');
            const dialog = createConfirmUninstallDialog(
                appName,
                t('This Flatpak application (%s) will be permanently removed from your system.', targetId),
                async () => {
                    Main.notify('App Menu Master', t('Uninstalling %s...', appName));
                    let res = await runCommandAsync(['flatpak', 'uninstall', '--noninteractive', '-y', targetId]);
                    if (!res.ok && isSystemFlatpak)
                        res = await runCommandAsync(['pkexec', 'flatpak', 'uninstall', '--system', '--noninteractive', '-y', targetId]);
                    if (res.ok) {
                        Main.notify('App Menu Master', t('%s was successfully uninstalled.', appName));
                        this._onLayoutChanged();
                    } else {
                        Main.notify('App Menu Master', t('Uninstall failed: %s', res.stderr || res.stdout));
                    }
                }
            );
            dialog.open();
            return;
        }

        // 2. APT / DEB package check (handles ~/.local/share/applications overrides too)
        const pkgName = await this._detectAptPackage(appId, desktopPath);
        if (pkgName) {
            const userAppsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'applications']);
            const hasLocalCopy = desktopPath.startsWith(userAppsDir);
            const dialog = createConfirmUninstallDialog(
                appName,
                t('System package "%s" (APT) will be removed. Administrator password will be required.', pkgName),
                async () => {
                    Main.notify('App Menu Master', t('Uninstalling package %s...', pkgName));
                    const rmRes = await runCommandAsync(['pkexec', 'apt-get', 'remove', '-y', '--auto-remove', pkgName]);
                    if (rmRes.ok) {
                        if (hasLocalCopy && GLib.file_test(desktopPath, GLib.FileTest.EXISTS)) {
                            try {
                                Gio.File.new_for_path(desktopPath).delete(null);
                            } catch (_e) {
                                // ignore
                            }
                        }
                        Main.notify('App Menu Master', t('%s (%s) was successfully uninstalled.', appName, pkgName));
                        this._onLayoutChanged();
                    } else {
                        Main.notify('App Menu Master', t('Uninstall cancelled or failed: %s', rmRes.stderr));
                    }
                }
            );
            dialog.open();
            return;
        }

        // 3. User local shortcut / WebApp / AppImage (~/.local/share/applications)
        const userAppsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'applications']);
        if (desktopPath.startsWith(userAppsDir)) {
            let execLine = '';
            try {
                execLine = appInfo.get_commandline() || '';
            } catch (_e) {
                // ignore
            }
            const appImageMatch = execLine.match(/(\/[^\s"']+\.AppImage)/i);
            const appImagePath = appImageMatch ? appImageMatch[1] : null;

            const detailMsg = appImagePath
                ? t('This AppImage application (%s) and its menu shortcut will be deleted.', appImagePath)
                : t('This user application / shortcut (%s) will be permanently deleted from the menu.', desktopPath);

            const dialog = createConfirmUninstallDialog(
                appName,
                detailMsg,
                () => {
                    try {
                        if (appImagePath && GLib.file_test(appImagePath, GLib.FileTest.EXISTS))
                            Gio.File.new_for_path(appImagePath).delete(null);
                        Gio.File.new_for_path(desktopPath).delete(null);
                        Main.notify('App Menu Master', t('%s was removed.', appName));
                        this._onLayoutChanged();
                    } catch (e) {
                        Main.notify('App Menu Master', t('Could not delete: %s', e.message));
                    }
                }
            );
            dialog.open();
            return;
        }

        Main.notify('App Menu Master', t('Could not detect automatic uninstall source for %s.', appName));
    }
}
