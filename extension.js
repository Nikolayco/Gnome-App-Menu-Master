import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { autoCategorizeApps, getAppFoldersSettings } from './src/categorizer.js';
import { AppImageWatcher } from './src/appImageWatcher.js';
import { AppContextMenuManager } from './src/contextMenu.js';
import { t } from './src/i18n.js';
import { AppSorter } from './src/sorter.js';
import { ViewManager } from './src/viewManager.js';

export default class AppMenuMasterExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._settingsChangedIds = [];
        this._startupId = 0;
        this._panelButton = null;

        this._sorter = new AppSorter(this._settings, () => this._getAppDisplay());
        this._viewManager = new ViewManager(this._settings, () => this._getAppDisplay());
        this._contextMenu = new AppContextMenuManager(this._settings, () => {
            this._sorter.scheduleSort(150);
            this._viewManager.applyAll();
        });
        this._appImageWatcher = new AppImageWatcher(this._settings, () => {
            this._sorter.scheduleSort(300);
            this._viewManager.applyAll();
        });

        this._contextMenu.enable();
        this._sorter.enable();
        this._appImageWatcher.enable();

        if (Main.layoutManager._startingUp) {
            this._startupId = Main.layoutManager.connect('startup-complete', () => {
                if (this._startupId) {
                    Main.layoutManager.disconnect(this._startupId);
                    this._startupId = 0;
                }
                this._onReady();
            });
        } else {
            this._onReady();
        }
    }

    _onReady() {
        this._viewManager.enable();

        if (this._settings.get_boolean('auto-categorize-on-install')) {
            const folders = getAppFoldersSettings().get_strv('folder-children');
            if (folders.length === 0)
                autoCategorizeApps();
        }

        if (this._settings.get_string('sort-mode') !== 'manual')
            this._sorter.scheduleSort(500);

        this._updatePanelButton();
        this._connectSettings();
    }

    _getAppDisplay() {
        const controls = Main.overview?._overview?._controls ?? Main.overview?._overview?.controls;
        return controls?._appDisplay ?? controls?.appDisplay ?? null;
    }

    _connectSettings() {
        const sortKeys = [
            'sort-mode',
            'folders-first',
            'uncategorized-last',
            'sort-inside-folders',
            'sort-trigger',
        ];
        for (const key of sortKeys) {
            this._settingsChangedIds.push(
                this._settings.connect(`changed::${key}`, () => {
                    this._sorter.scheduleSort(150);
                    this._viewManager.applyAll();
                })
            );
        }

        const viewKeys = [
            'view-mode',
            'list-columns',
            'list-show-descriptions',
            'hide-page-indicators',
            'custom-grid-size',
            'grid-rows',
            'grid-columns',
            'folder-rows',
            'folder-columns',
            'icon-size',
            'label-font-size',
            'two-line-labels',
            'hidden-apps',
        ];
        for (const key of viewKeys) {
            this._settingsChangedIds.push(
                this._settings.connect(`changed::${key}`, () => {
                    this._viewManager.applyAll();
                    if (key === 'view-mode' || key === 'grid-rows' || key === 'grid-columns' || key === 'custom-grid-size' || key === 'hidden-apps')
                        this._sorter.scheduleSort(150);
                })
            );
        }

        this._settingsChangedIds.push(
            this._settings.connect('changed::show-panel-button', () => {
                this._updatePanelButton();
            }),
            this._settings.connect('changed::appimage-enabled', () => {
                this._appImageWatcher?.restart();
            }),
            this._settings.connect('changed::appimage-directory', () => {
                this._appImageWatcher?.restart();
            }),
            this._settings.connect('changed::appimage-rescan-trigger', () => {
                this._appImageWatcher?.rescan();
            })
        );
    }

    _updatePanelButton() {
        const show = this._settings.get_boolean('show-panel-button');
        if (show && !this._panelButton) {
            this._panelButton = new PanelMenu.Button(0.0, 'App Menu Master', false);
            const icon = new St.Icon({
                icon_name: 'view-app-grid-symbolic',
                style_class: 'system-status-icon',
            });
            this._panelButton.add_child(icon);

            const viewModes = [
                { id: 'folders-grid', label: t('View: Folder Grid') },
                { id: 'flat-grid', label: t('View: Flat Grid') },
                { id: 'list', label: t('View: List') },
            ];

            for (const vm of viewModes) {
                const item = new PopupMenu.PopupMenuItem(vm.label);
                item.connect('activate', () => {
                    this._settings.set_string('view-mode', vm.id);
                });
                this._panelButton.menu.addMenuItem(item);
            }

            this._panelButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const sortNowItem = new PopupMenu.PopupMenuItem(t('Sort Alphabetically Now'));
            sortNowItem.connect('activate', () => {
                if (this._settings.get_string('sort-mode') === 'manual')
                    this._settings.set_string('sort-mode', 'az');
                this._sorter.sortAll();
            });
            this._panelButton.menu.addMenuItem(sortNowItem);

            const autoCatItem = new PopupMenu.PopupMenuItem(t('Auto-Categorize Folders'));
            autoCatItem.connect('activate', () => {
                const res = autoCategorizeApps();
                this._sorter.scheduleSort(200);
                Main.notify('App Menu Master', t('%d category folders updated.', res.folderCount));
            });
            this._panelButton.menu.addMenuItem(autoCatItem);

            this._panelButton.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const prefsItem = new PopupMenu.PopupMenuItem(t('Extension Settings...'));
            prefsItem.connect('activate', () => {
                this.openPreferences();
            });
            this._panelButton.menu.addMenuItem(prefsItem);

            Main.panel.addToStatusArea(this.uuid, this._panelButton);
        } else if (!show && this._panelButton) {
            this._panelButton.destroy();
            this._panelButton = null;
        }
    }

    disable() {
        if (this._startupId) {
            Main.layoutManager.disconnect(this._startupId);
            this._startupId = 0;
        }

        for (const id of this._settingsChangedIds)
            this._settings.disconnect(id);
        this._settingsChangedIds = [];

        if (this._panelButton) {
            this._panelButton.destroy();
            this._panelButton = null;
        }

        if (this._appImageWatcher) {
            this._appImageWatcher.destroy();
            this._appImageWatcher = null;
        }

        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        if (this._viewManager) {
            this._viewManager.destroy();
            this._viewManager = null;
        }

        if (this._sorter) {
            this._sorter.destroy();
            this._sorter = null;
        }

        this._settings = null;
    }
}
