import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    autoCategorizeApps,
    createFolder,
    deleteFolder,
    getAppFoldersSettings,
    getFolderSettings,
    renameFolder,
} from './src/categorizer.js';
import { getCollator, t } from './src/i18n.js';

export default class AppMenuMasterPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        this._collator = getCollator();
        window.set_default_size(760, 680);

        this._buildViewPage(window, settings);
        this._buildSortPage(window, settings);
        this._buildFoldersPage(window, settings);
        this._buildContextAndHidePage(window, settings);
        this._buildAppImagePage(window, settings);
        this._buildBackupPage(window, settings);
    }

    _buildViewPage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('View'),
            icon_name: 'view-grid-symbolic',
        });

        const modeGroup = new Adw.PreferencesGroup({
            title: t('Menu and Application View'),
            description: t('Choose how applications are listed in the App Grid.'),
        });

        const viewModes = [
            { id: 'folders-grid', label: t('Folder / Grouped Grid') },
            { id: 'flat-grid', label: t('Ungrouped Flat Alphabetical Grid') },
            { id: 'list', label: t('List View (Alphabetical)') },
        ];
        const viewModel = Gtk.StringList.new(viewModes.map(m => m.label));
        const viewRow = new Adw.ComboRow({
            title: t('View Mode'),
            model: viewModel,
        });
        const currentView = settings.get_string('view-mode');
        const currentIdx = Math.max(0, viewModes.findIndex(m => m.id === currentView));
        viewRow.set_selected(currentIdx);
        viewRow.connect('notify::selected', () => {
            const sel = viewModes[viewRow.get_selected()];
            if (sel)
                settings.set_string('view-mode', sel.id);
        });
        modeGroup.add(viewRow);

        const listColsRow = new Adw.SpinRow({
            title: t('List View Columns'),
            subtitle: t('Number of columns shown in list mode'),
            adjustment: new Gtk.Adjustment({ lower: 1, upper: 4, step_increment: 1 }),
        });
        settings.bind('list-columns', listColsRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        modeGroup.add(listColsRow);

        const listDescRow = new Adw.SwitchRow({
            title: t('Show Application Descriptions in List View'),
        });
        settings.bind('list-show-descriptions', listDescRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        modeGroup.add(listDescRow);

        const hideIndRow = new Adw.SwitchRow({
            title: t('Hide Page Indicators (Dots)'),
        });
        settings.bind('hide-page-indicators', hideIndRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        modeGroup.add(hideIndRow);

        const panelBtnRow = new Adw.SwitchRow({
            title: t('Show Quick Access Icon in Top Panel'),
            subtitle: t('Adds a menu to switch views and sort with one click'),
        });
        settings.bind('show-panel-button', panelBtnRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        modeGroup.add(panelBtnRow);

        page.add(modeGroup);

        const gridGroup = new Adw.PreferencesGroup({
            title: t('Grid Size and Labels'),
        });

        const customGridRow = new Adw.SwitchRow({
            title: t('Use Custom Grid Size'),
        });
        settings.bind('custom-grid-size', customGridRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(customGridRow);

        const rowsSpin = new Adw.SpinRow({
            title: t('Main Grid Rows'),
            adjustment: new Gtk.Adjustment({ lower: 2, upper: 10, step_increment: 1 }),
        });
        settings.bind('grid-rows', rowsSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(rowsSpin);

        const colsSpin = new Adw.SpinRow({
            title: t('Main Grid Columns'),
            adjustment: new Gtk.Adjustment({ lower: 3, upper: 12, step_increment: 1 }),
        });
        settings.bind('grid-columns', colsSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(colsSpin);

        const iconSpin = new Adw.SpinRow({
            title: t('Icon Size (List Mode)'),
            subtitle: t('0 = Default'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 128, step_increment: 4 }),
        });
        settings.bind('icon-size', iconSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(iconSpin);

        const fontSpin = new Adw.SpinRow({
            title: t('Label Font Size (pt)'),
            subtitle: t('0 = Default'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 24, step_increment: 1 }),
        });
        settings.bind('label-font-size', fontSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(fontSpin);

        const twoLineRow = new Adw.SwitchRow({
            title: t('Show Long Application Names on Two Lines'),
        });
        settings.bind('two-line-labels', twoLineRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        gridGroup.add(twoLineRow);

        page.add(gridGroup);
        window.add(page);
    }

    _buildSortPage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('Sorting'),
            icon_name: 'view-sort-ascending-symbolic',
        });

        const sortGroup = new Adw.PreferencesGroup({
            title: t('Alphabetical and Smart Sorting'),
            description: t('Locale-aware alphabetical sorting and automatic arrangement settings.'),
        });

        const sortModes = [
            { id: 'az', label: t('Alphabetical (A → Z)') },
            { id: 'za', label: t('Reverse Alphabetical (Z → A)') },
            { id: 'manual', label: t('Manual (Auto-Sort Disabled)') },
        ];
        const sortModel = Gtk.StringList.new(sortModes.map(m => m.label));
        const sortRow = new Adw.ComboRow({
            title: t('Sorting Method'),
            model: sortModel,
        });
        const curSort = settings.get_string('sort-mode');
        sortRow.set_selected(Math.max(0, sortModes.findIndex(m => m.id === curSort)));
        sortRow.connect('notify::selected', () => {
            const sel = sortModes[sortRow.get_selected()];
            if (sel)
                settings.set_string('sort-mode', sel.id);
        });
        sortGroup.add(sortRow);

        const foldersFirstRow = new Adw.SwitchRow({
            title: t('Always Pin Folders First'),
        });
        settings.bind('folders-first', foldersFirstRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        sortGroup.add(foldersFirstRow);

        const uncatLastRow = new Adw.SwitchRow({
            title: t('Show Uncategorized Apps (Web Apps, etc.) Last'),
            subtitle: t('Apps without a category are placed at the end in folder view'),
        });
        settings.bind('uncategorized-last', uncatLastRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        sortGroup.add(uncatLastRow);

        const sortInsideRow = new Adw.SwitchRow({
            title: t('Also Sort Apps Inside Folders'),
        });
        settings.bind('sort-inside-folders', sortInsideRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        sortGroup.add(sortInsideRow);

        const autoSortRow = new Adw.SwitchRow({
            title: t('Auto-Sort When Apps Are Installed or Removed'),
        });
        settings.bind('auto-sort-on-change', autoSortRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        sortGroup.add(autoSortRow);

        const sortNowRow = new Adw.ActionRow({
            title: t('Sort Now'),
            subtitle: t('Immediately rearranges the main grid and folder contents'),
        });
        const sortBtn = new Gtk.Button({
            label: t('Sort Now'),
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        sortBtn.connect('clicked', () => {
            if (settings.get_string('sort-mode') === 'manual')
                settings.set_string('sort-mode', 'az');
            settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
            window.add_toast(new Adw.Toast({ title: t('Applications sorted.') }));
        });
        sortNowRow.add_suffix(sortBtn);
        sortGroup.add(sortNowRow);

        page.add(sortGroup);
        window.add(page);
    }

    _buildFoldersPage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('Folders'),
            icon_name: 'folder-symbolic',
        });

        const autoGroup = new Adw.PreferencesGroup({
            title: t('Automatic Grouping by Category'),
            description: t('Groups applications by .desktop categories (Internet, Office, Development, Graphics, Sound & Video, Games, System, Utilities).'),
        });

        const autoCatSwitch = new Adw.SwitchRow({
            title: t('Auto-Group Newly Installed Applications'),
            subtitle: t('Automatically adds newly installed apps to their matching category folder'),
        });
        settings.bind('auto-categorize-on-install', autoCatSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        autoGroup.add(autoCatSwitch);

        const autoCatRow = new Adw.ActionRow({
            title: t('Group All Applications by Category Now'),
            subtitle: t('Scans installed applications and creates/updates category folders'),
        });
        const autoCatBtn = new Gtk.Button({
            label: t('Auto-Group'),
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        autoCatBtn.connect('clicked', () => {
            const res = autoCategorizeApps();
            settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
            this._refreshFolderList(folderListGroup, window, settings);
            window.add_toast(new Adw.Toast({
                title: t('%d category folders updated (%d apps grouped).', res.folderCount, res.appCount),
            }));
        });
        autoCatRow.add_suffix(autoCatBtn);
        autoGroup.add(autoCatRow);

        const ungroupRow = new Adw.ActionRow({
            title: t('Ungroup and Show Flat Alphabetical'),
            subtitle: t('Lists all applications A-Z in a flat grid without folders'),
        });
        const ungroupBtn = new Gtk.Button({
            label: t('Make Flat Alphabetical'),
            valign: Gtk.Align.CENTER,
        });
        ungroupBtn.connect('clicked', () => {
            settings.set_string('view-mode', 'flat-grid');
            if (settings.get_string('sort-mode') === 'manual')
                settings.set_string('sort-mode', 'az');
            settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
            window.add_toast(new Adw.Toast({ title: t('Grouping disabled; applications sorted alphabetically.') }));
        });
        ungroupRow.add_suffix(ungroupBtn);
        autoGroup.add(ungroupRow);

        page.add(autoGroup);

        const createGroup = new Adw.PreferencesGroup({
            title: t('Create New Folder'),
        });
        const newFolderEntry = new Adw.EntryRow({
            title: t('Folder Name'),
        });
        const addBtn = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: t('Create Folder'),
            css_classes: ['suggested-action'],
        });
        addBtn.connect('clicked', () => {
            const name = newFolderEntry.get_text().trim();
            if (!name)
                return;
            createFolder(name);
            newFolderEntry.set_text('');
            settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
            this._refreshFolderList(folderListGroup, window, settings);
            window.add_toast(new Adw.Toast({ title: t('Folder "%s" created.', name) }));
        });
        newFolderEntry.add_suffix(addBtn);
        createGroup.add(newFolderEntry);
        page.add(createGroup);

        const folderListGroup = new Adw.PreferencesGroup({
            title: t('Existing Folders'),
        });
        this._folderRows = [];
        this._refreshFolderList(folderListGroup, window, settings);
        page.add(folderListGroup);

        window.add(page);
    }

    _refreshFolderList(group, window, settings) {
        for (const r of this._folderRows)
            group.remove(r);
        this._folderRows = [];

        const foldersSettings = getAppFoldersSettings();
        const folderIds = foldersSettings.get_strv('folder-children');

        if (folderIds.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: t('No folders yet'),
                subtitle: t('Use the field above to create a folder or click "Auto-Group".'),
            });
            group.add(emptyRow);
            this._folderRows.push(emptyRow);
            return;
        }

        for (const folderId of folderIds) {
            const fs = getFolderSettings(folderId);
            const name = fs.get_string('name') || folderId;
            const apps = fs.get_strv('apps');

            const row = new Adw.ActionRow({
                title: name,
                subtitle: t('%d apps', apps.length),
            });

            const editAppsBtn = new Gtk.Button({
                icon_name: 'view-list-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: t('Edit Apps in Folder'),
            });
            editAppsBtn.connect('clicked', () => {
                this._openFolderAppsDialog(window, folderId, name, () => {
                    settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
                    this._refreshFolderList(group, window, settings);
                });
            });

            const renameBtn = new Gtk.Button({
                icon_name: 'document-edit-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: t('Rename'),
            });
            renameBtn.connect('clicked', () => {
                this._openRenameDialog(window, folderId, name, () => {
                    settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
                    this._refreshFolderList(group, window, settings);
                });
            });

            const delBtn = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: t('Delete Folder'),
                css_classes: ['destructive-action'],
            });
            delBtn.connect('clicked', () => {
                deleteFolder(folderId);
                settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
                this._refreshFolderList(group, window, settings);
                window.add_toast(new Adw.Toast({ title: t('Folder "%s" deleted.', name) }));
            });

            row.add_suffix(editAppsBtn);
            row.add_suffix(renameBtn);
            row.add_suffix(delBtn);
            group.add(row);
            this._folderRows.push(row);
        }
    }

    _openRenameDialog(parentWindow, folderId, currentName, onDone) {
        const dialog = new Adw.Window({
            transient_for: parentWindow,
            modal: true,
            title: t('Rename Folder'),
            default_width: 360,
            default_height: 160,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 16,
            margin_bottom: 16,
            margin_start: 16,
            margin_end: 16,
        });

        const entry = new Gtk.Entry({ text: currentName });
        box.append(entry);

        const btnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            halign: Gtk.Align.END,
        });
        const cancelBtn = new Gtk.Button({ label: t('Cancel') });
        cancelBtn.connect('clicked', () => dialog.close());
        const saveBtn = new Gtk.Button({ label: t('Save'), css_classes: ['suggested-action'] });
        saveBtn.connect('clicked', () => {
            renameFolder(folderId, entry.get_text());
            dialog.close();
            onDone();
        });
        btnBox.append(cancelBtn);
        btnBox.append(saveBtn);
        box.append(btnBox);

        dialog.set_content(box);
        dialog.present();
    }

    _openFolderAppsDialog(parentWindow, folderId, folderName, onDone) {
        const dialog = new Adw.Window({
            transient_for: parentWindow,
            modal: true,
            title: t('%s — Applications', folderName),
            default_width: 480,
            default_height: 540,
        });

        const fs = getFolderSettings(folderId);
        const selectedSet = new Set(fs.get_strv('apps'));

        const toolbarView = new Adw.ToolbarView();
        const header = new Adw.HeaderBar();
        const saveBtn = new Gtk.Button({ label: t('Save'), css_classes: ['suggested-action'] });
        saveBtn.connect('clicked', () => {
            fs.set_strv('apps', Array.from(selectedSet));
            Gio.Settings.sync();
            dialog.close();
            onDone();
        });
        header.pack_end(saveBtn);
        toolbarView.add_top_bar(header);

        const scrolled = new Gtk.ScrolledWindow({ vexpand: true });
        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        const allApps = Gio.AppInfo.get_all()
            .filter(i => i.should_show())
            .sort((a, b) => this._collator.compare(a.get_display_name() || '', b.get_display_name() || ''));

        for (const info of allApps) {
            const id = info.get_id();
            const row = new Adw.SwitchRow({
                title: info.get_display_name() || id,
                subtitle: id,
                active: selectedSet.has(id),
            });
            row.connect('notify::active', () => {
                if (row.get_active())
                    selectedSet.add(id);
                else
                    selectedSet.delete(id);
            });
            listBox.append(row);
        }

        scrolled.set_child(listBox);
        toolbarView.set_content(scrolled);
        dialog.set_content(toolbarView);
        dialog.present();
    }

    _buildContextAndHidePage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('Right-Click & Hide'),
            icon_name: 'view-more-symbolic',
        });

        const menuGroup = new Adw.PreferencesGroup({
            title: t('Application Right-Click Menu Items'),
            description: t('Choose which shortcut actions appear when right-clicking application icons.'),
        });

        const toggles = [
            ['menu-add-desktop', t('Add / Remove Desktop Shortcut')],
            ['menu-move-folder', t('Move to Folder Submenu')],
            ['menu-hide-app', t('Hide from Menu')],
            ['menu-open-desktop-file', t('Open .desktop File Location')],
            ['menu-uninstall', t('Uninstall Application')],
        ];

        for (const [key, title] of toggles) {
            const row = new Adw.SwitchRow({ title });
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            menuGroup.add(row);
        }

        const uninstallMethods = [
            { id: 'auto', label: t('Automatic (APT / Flatpak / Local)') },
            { id: 'pkexec', label: t('Direct Package Manager (pkexec)') },
            { id: 'store', label: t('Open in Software Center') },
        ];
        const umModel = Gtk.StringList.new(uninstallMethods.map(m => m.label));
        const umRow = new Adw.ComboRow({
            title: t('Application Uninstall Method'),
            model: umModel,
        });
        const curUm = settings.get_string('uninstall-method');
        umRow.set_selected(Math.max(0, uninstallMethods.findIndex(m => m.id === curUm)));
        umRow.connect('notify::selected', () => {
            const sel = uninstallMethods[umRow.get_selected()];
            if (sel)
                settings.set_string('uninstall-method', sel.id);
        });
        menuGroup.add(umRow);

        page.add(menuGroup);

        const hideGroup = new Adw.PreferencesGroup({
            title: t('Hidden Applications Manager'),
            description: t('Toggled (active) applications are hidden from the app menu.'),
        });

        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: t('Search applications...'),
            margin_bottom: 8,
        });
        hideGroup.add(searchEntry);

        const hiddenSet = new Set(settings.get_strv('hidden-apps'));
        const allApps = Gio.AppInfo.get_all()
            .filter(i => i.should_show())
            .sort((a, b) => this._collator.compare(a.get_display_name() || '', b.get_display_name() || ''));

        const appRows = [];
        for (const info of allApps) {
            const id = info.get_id();
            const title = info.get_display_name() || id;
            const row = new Adw.SwitchRow({
                title,
                subtitle: id,
                active: hiddenSet.has(id),
            });
            row.connect('notify::active', () => {
                const current = new Set(settings.get_strv('hidden-apps'));
                if (row.get_active())
                    current.add(id);
                else
                    current.delete(id);
                settings.set_strv('hidden-apps', Array.from(current));
            });
            hideGroup.add(row);
            appRows.push({ row, searchText: `${title} ${id}`.toLowerCase() });
        }

        searchEntry.connect('search-changed', () => {
            const q = searchEntry.get_text().trim().toLowerCase();
            for (const item of appRows)
                item.row.set_visible(!q || item.searchText.includes(q));
        });

        page.add(hideGroup);
        window.add(page);
    }

    _buildAppImagePage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('AppImage'),
            icon_name: 'application-x-executable-symbolic',
        });

        const generalGroup = new Adw.PreferencesGroup({
            title: t('AppImage Manager'),
            description: t('Automatically detects .AppImage files in the monitored directory, extracts icons, and creates menu shortcuts.'),
        });

        const enableRow = new Adw.SwitchRow({
            title: t('Enable AppImage Monitoring'),
            subtitle: t('Automatically integrates .AppImage packages into the application menu'),
        });
        settings.bind('appimage-enabled', enableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(enableRow);

        const defaultDir = GLib.build_filenamev([GLib.get_home_dir(), 'Applications']);
        const getEffectiveDir = () => {
            const val = (settings.get_string('appimage-directory') || '').trim();
            return val || defaultDir;
        };

        const dirRow = new Adw.ActionRow({
            title: t('Monitored Directory'),
        });
        const dirBtn = new Gtk.Button({
            label: getEffectiveDir(),
            valign: Gtk.Align.CENTER,
        });
        dirBtn.connect('clicked', () => {
            const dlg = new Gtk.FileDialog({
                title: t('Select Monitored Directory'),
            });
            dlg.select_folder(window, null, (d, res) => {
                try {
                    const folder = d.select_folder_finish(res);
                    if (folder) {
                        const path = folder.get_path();
                        settings.set_string('appimage-directory', path);
                        dirBtn.set_label(path);
                        this._refreshAppImageList(listGroup, window, settings, getEffectiveDir);
                    }
                } catch (_e) {
                    // user cancelled
                }
            });
        });
        dirRow.add_suffix(dirBtn);
        dirRow.activatable_widget = dirBtn;
        generalGroup.add(dirRow);

        const deepIconRow = new Adw.SwitchRow({
            title: t('Deep Icon Search'),
            subtitle: t('Search deeper inside the AppImage package if icons are not in standard locations'),
        });
        settings.bind('appimage-deep-icon-search', deepIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(deepIconRow);

        const rescanRow = new Adw.ActionRow({
            title: t('Rescan Directory Now'),
            subtitle: t('Re-checks all .AppImage files in the monitored folder and updates shortcuts'),
        });
        const rescanBtn = new Gtk.Button({
            label: t('Rescan Now'),
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        rescanBtn.connect('clicked', () => {
            settings.set_int('appimage-rescan-trigger', settings.get_int('appimage-rescan-trigger') + 1);
            this._refreshAppImageList(listGroup, window, settings, getEffectiveDir);
            window.add_toast(new Adw.Toast({ title: t('AppImage directory scan triggered.') }));
        });
        rescanRow.add_suffix(rescanBtn);
        generalGroup.add(rescanRow);

        page.add(generalGroup);

        const listGroup = new Adw.PreferencesGroup({
            title: t('Detected AppImage Packages'),
        });
        this._appImageRows = [];
        this._refreshAppImageList(listGroup, window, settings, getEffectiveDir);
        page.add(listGroup);

        window.add(page);
    }

    _refreshAppImageList(group, window, settings, getEffectiveDir) {
        for (const r of (this._appImageRows || []))
            group.remove(r);
        this._appImageRows = [];

        const dirPath = getEffectiveDir();
        const dirFile = Gio.File.new_for_path(dirPath);
        const files = [];

        if (dirFile.query_exists(null)) {
            try {
                const enumerator = dirFile.enumerate_children('standard::name,standard::type,standard::size', Gio.FileQueryInfoFlags.NONE, null);
                let info;
                while ((info = enumerator.next_file(null)) !== null) {
                    if (info.get_file_type() === Gio.FileType.REGULAR && info.get_name().toLowerCase().endsWith('.appimage')) {
                        files.push({
                            name: info.get_name(),
                            path: GLib.build_filenamev([dirPath, info.get_name()]),
                            sizeMb: (info.get_size() / (1024 * 1024)).toFixed(1),
                        });
                    }
                }
                enumerator.close(null);
            } catch (_e) {
                // ignore
            }
        }

        if (files.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: t('No .AppImage files found in the monitored directory.'),
                subtitle: dirPath,
            });
            group.add(emptyRow);
            this._appImageRows.push(emptyRow);
            return;
        }

        files.sort((a, b) => this._collator.compare(a.name, b.name));

        for (const item of files) {
            const row = new Adw.ActionRow({
                title: item.name,
                subtitle: `${item.path} (${item.sizeMb} MB)`,
            });

            const openFolderBtn = new Gtk.Button({
                icon_name: 'folder-open-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: t('Open .desktop File Location'),
            });
            openFolderBtn.connect('clicked', () => {
                try {
                    Gio.AppInfo.launch_default_for_uri(Gio.File.new_for_path(dirPath).get_uri(), null);
                } catch (_e) {
                    // ignore
                }
            });

            const delBtn = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: t('Delete AppImage'),
                css_classes: ['destructive-action'],
            });
            delBtn.connect('clicked', () => {
                try {
                    Gio.File.new_for_path(item.path).delete(null);
                    settings.set_int('appimage-rescan-trigger', settings.get_int('appimage-rescan-trigger') + 1);
                    this._refreshAppImageList(group, window, settings, getEffectiveDir);
                    window.add_toast(new Adw.Toast({ title: t('%s deleted.', item.name) }));
                } catch (e) {
                    window.add_toast(new Adw.Toast({ title: t('Could not delete: %s', e.message) }));
                }
            });

            row.add_suffix(openFolderBtn);
            row.add_suffix(delBtn);
            group.add(row);
            this._appImageRows.push(row);
        }
    }

    _buildBackupPage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: t('Backup & Reset'),
            icon_name: 'document-save-symbolic',
        });

        const backupGroup = new Adw.PreferencesGroup({
            title: t('Configuration Backup'),
            description: t('Export or import all extension settings, folders, and hidden apps as JSON.'),
        });

        const exportRow = new Adw.ActionRow({
            title: t('Export Settings and Folders (JSON)'),
        });
        const exportBtn = new Gtk.Button({ label: t('Export...'), valign: Gtk.Align.CENTER });
        exportBtn.connect('clicked', () => this._exportBackup(window, settings));
        exportRow.add_suffix(exportBtn);
        backupGroup.add(exportRow);

        const importRow = new Adw.ActionRow({
            title: t('Restore from Backup (JSON)'),
        });
        const importBtn = new Gtk.Button({ label: t('Import...'), valign: Gtk.Align.CENTER });
        importBtn.connect('clicked', () => this._importBackup(window, settings));
        importRow.add_suffix(importBtn);
        backupGroup.add(importRow);

        page.add(backupGroup);

        const resetGroup = new Adw.PreferencesGroup({
            title: t('Reset'),
        });
        const resetRow = new Adw.ActionRow({
            title: t('Reset to Defaults'),
            subtitle: t('Restores all extension settings and App Grid layout to their defaults'),
        });
        const resetBtn = new Gtk.Button({
            label: t('Reset All'),
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });
        resetBtn.connect('clicked', () => {
            const keys = settings.settings_schema.list_keys();
            for (const key of keys)
                settings.reset(key);
            const shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
            shellSettings.reset('app-picker-layout');
            window.add_toast(new Adw.Toast({ title: t('All settings and layout reset to defaults.') }));
        });
        resetRow.add_suffix(resetBtn);
        resetGroup.add(resetRow);

        page.add(resetGroup);
        window.add(page);
    }

    _exportBackup(window, settings) {
        const dialog = new Gtk.FileDialog({
            title: t('Save Backup'),
            initial_name: t('app-menu-master-backup.json'),
        });

        dialog.save(window, null, (dlg, res) => {
            try {
                const file = dlg.save_finish(res);
                if (!file)
                    return;

                const data = {
                    version: 1,
                    settings: {},
                    folders: {},
                };

                for (const key of settings.settings_schema.list_keys())
                    data.settings[key] = settings.get_value(key).recursiveUnpack();

                const foldersSettings = getAppFoldersSettings();
                const folderIds = foldersSettings.get_strv('folder-children');
                data.folderChildren = folderIds;
                for (const fid of folderIds) {
                    const fs = getFolderSettings(fid);
                    data.folders[fid] = {
                        name: fs.get_string('name'),
                        apps: fs.get_strv('apps'),
                    };
                }

                const json = JSON.stringify(data, null, 2);
                const bytes = new TextEncoder().encode(json);
                file.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                window.add_toast(new Adw.Toast({ title: t('Backup saved successfully.') }));
            } catch (_e) {
                // user cancelled or error
            }
        });
    }

    _importBackup(window, settings) {
        const dialog = new Gtk.FileDialog({ title: t('Select Backup File') });
        dialog.open(window, null, (dlg, res) => {
            try {
                const file = dlg.open_finish(res);
                if (!file)
                    return;

                const [ok, contents] = file.load_contents(null);
                if (!ok)
                    return;

                const json = new TextDecoder().decode(contents);
                const data = JSON.parse(json);

                if (data.settings) {
                    for (const [key, val] of Object.entries(data.settings)) {
                        const schemaKey = settings.settings_schema.get_key(key);
                        if (!schemaKey)
                            continue;
                        const typeStr = schemaKey.get_value_type().dup_string();
                        settings.set_value(key, new GLib.Variant(typeStr, val));
                    }
                }

                if (Array.isArray(data.folderChildren) && data.folders) {
                    const foldersSettings = getAppFoldersSettings();
                    foldersSettings.set_strv('folder-children', data.folderChildren);
                    for (const fid of data.folderChildren) {
                        const fData = data.folders[fid];
                        if (!fData)
                            continue;
                        const fs = getFolderSettings(fid);
                        if (fData.name)
                            fs.set_string('name', fData.name);
                        if (Array.isArray(fData.apps))
                            fs.set_strv('apps', fData.apps);
                    }
                    Gio.Settings.sync();
                }

                settings.set_int('sort-trigger', settings.get_int('sort-trigger') + 1);
                window.add_toast(new Adw.Toast({ title: t('Backup restored successfully.') }));
            } catch (e) {
                window.add_toast(new Adw.Toast({ title: t('Failed to read backup: %s', e.message) }));
            }
        });
    }
}
