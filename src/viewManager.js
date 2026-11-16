import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import { AppMenu } from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getAppFoldersSettings, getFolderSettings, matchCategoryId } from './categorizer.js';
import { getCollator, t } from './i18n.js';

export class ViewManager {
    constructor(settings, getAppDisplayFn) {
        this._settings = settings;
        this._getAppDisplay = getAppDisplayFn;
        this._appSystem = Shell.AppSystem.get_default();
        this._shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
        this._collator = getCollator();

        this._origAppDisplayLoadApps = null;
        this._origFolderViewLoadApps = null;
        this._origAppIconUpdate = null;

        this._origGridRows = null;
        this._origGridCols = null;

        this._listScroll = null;
        this._listMenuManager = null;
        this._activeListMenu = null;
        this._selectedListFolder = null;
        this._installedChangedId = 0;
        this._isRedisplaying = false;
    }

    enable() {
        const vm = this;

        if (!this._origAppDisplayLoadApps) {
            this._origAppDisplayLoadApps = AppDisplay.AppDisplay.prototype._loadApps;
            AppDisplay.AppDisplay.prototype._loadApps = function () {
                const viewMode = vm._settings.get_string('view-mode');
                const hidden = new Set(vm._settings.get_strv('hidden-apps'));

                if (!this._ammFolderCache)
                    this._ammFolderCache = new Map();

                for (const [fId, fIcon] of this._ammFolderCache.entries()) {
                    try {
                        if (!fIcon || !fIcon.view)
                            this._ammFolderCache.delete(fId);
                        else if (!this._items.has(fId))
                            this._items.set(fId, fIcon);
                    } catch (_e) {
                        this._ammFolderCache.delete(fId);
                    }
                }

                const baseItems = vm._origAppDisplayLoadApps.call(this);

                for (const item of baseItems) {
                    if (item instanceof AppDisplay.FolderIcon && !this._ammFolderCache.has(item.id)) {
                        this._ammFolderCache.set(item.id, item);
                        const fid = item.id;
                        item.connect('destroy', () => {
                            this._ammFolderCache?.delete(fid);
                        });
                    }
                }

                if (viewMode === 'flat-grid') {
                    const flatItems = [];
                    const seenIds = new Set();

                    for (const item of baseItems) {
                        if (item instanceof AppDisplay.FolderIcon)
                            continue;
                        if (!hidden.has(item.id)) {
                            flatItems.push(item);
                            seenIds.add(item.id);
                        }
                    }

                    const isDraggable =
                        global.settings.is_writable('favorite-apps') ||
                        global.settings.is_writable('app-picker-layout');
                    const appSys = Shell.AppSystem.get_default();

                    for (const appInfo of (this._appInfoList || [])) {
                        const appId = appInfo.get_id();
                        if (!appId || seenIds.has(appId) || hidden.has(appId))
                            continue;
                        let icon = this._items.get(appId);
                        if (!icon) {
                            const app = appSys.lookup_app(appId);
                            if (!app)
                                continue;
                            icon = new AppDisplay.AppIcon(app, { isDraggable });
                            icon.connect('notify::pressed', () => {
                                if (icon.pressed)
                                    this.updateDragFocus(icon);
                            });
                        }
                        flatItems.push(icon);
                        seenIds.add(appId);
                    }

                    return flatItems;
                }

                return baseItems.filter(item => !hidden.has(item.id));
            };
        }

        if (!this._origFolderViewLoadApps && AppDisplay.FolderView?.prototype?._loadApps) {
            this._origFolderViewLoadApps = AppDisplay.FolderView.prototype._loadApps;
            AppDisplay.FolderView.prototype._loadApps = function () {
                const items = vm._origFolderViewLoadApps.call(this);
                const hidden = new Set(vm._settings.get_strv('hidden-apps'));
                const filtered = items.filter(item => !hidden.has(item.id));
                this._apps = filtered.map(icon => icon.app);
                return filtered;
            };
        }

        if (!this._origAppIconUpdate && AppDisplay.AppIcon?.prototype?._updateIcon) {
            this._origAppIconUpdate = AppDisplay.AppIcon.prototype._updateIcon;
            AppDisplay.AppIcon.prototype._updateIcon = function () {
                vm._origAppIconUpdate.call(this);
                vm._applyIconAndLabelStyle(this);
            };
        }

        this._installedChangedId = this._appSystem.connect('installed-changed', () => {
            if (this._settings.get_string('view-mode') === 'list')
                this._rebuildListView();
        });

        this.applyAll();
    }

    destroy() {
        if (this._installedChangedId) {
            this._appSystem.disconnect(this._installedChangedId);
            this._installedChangedId = 0;
        }

        if (this._origAppDisplayLoadApps) {
            AppDisplay.AppDisplay.prototype._loadApps = this._origAppDisplayLoadApps;
            this._origAppDisplayLoadApps = null;
        }
        if (this._origFolderViewLoadApps) {
            AppDisplay.FolderView.prototype._loadApps = this._origFolderViewLoadApps;
            this._origFolderViewLoadApps = null;
        }
        if (this._origAppIconUpdate) {
            AppDisplay.AppIcon.prototype._updateIcon = this._origAppIconUpdate;
            this._origAppIconUpdate = null;
        }

        this._destroyListView();
        this._restoreGridSize();

        const appDisplay = this._getAppDisplay();
        if (appDisplay) {
            if (appDisplay._pageIndicators)
                appDisplay._pageIndicators.visible = true;
            if (appDisplay._scrollView)
                appDisplay._scrollView.visible = true;
            this._safeRedisplay(appDisplay);
        }
    }

    _safeRedisplay(appDisplay) {
        if (!appDisplay || this._isRedisplaying || appDisplay._pageManager?._updatingPages)
            return;

        this._isRedisplaying = true;
        try {
            appDisplay._redisplay();
        } catch (e) {
            console.warn('[AppMenuMaster] _redisplay warning, resetting app-picker-layout:', e.message);
            try {
                this._shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', []));
                appDisplay._redisplay();
            } catch (e2) {
                console.error('[AppMenuMaster] _redisplay recovery error:', e2);
            }
        } finally {
            this._isRedisplaying = false;
        }
    }

    _applyIconAndLabelStyle(appIcon) {
        const fontSize = this._settings.get_int('label-font-size');
        const twoLine = this._settings.get_boolean('two-line-labels');
        const label = appIcon.label;

        if (label && label.clutter_text) {
            if (twoLine) {
                label.clutter_text.line_wrap = true;
                label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
                label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
                label.clutter_text.single_line_mode = false;
            } else {
                label.clutter_text.line_wrap = false;
                label.clutter_text.single_line_mode = true;
                label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            }

            if (fontSize > 0)
                label.style = `font-size: ${fontSize}pt;`;
            else
                label.style = null;
        }
    }

    _restoreGridSize() {
        const appDisplay = this._getAppDisplay();
        if (!appDisplay || !appDisplay._grid?.layoutManager)
            return;

        const lm = appDisplay._grid.layoutManager;
        if (this._origGridRows !== null) {
            lm.rowsPerPage = this._origGridRows;
            this._origGridRows = null;
        }
        if (this._origGridCols !== null) {
            lm.columnsPerPage = this._origGridCols;
            this._origGridCols = null;
        }
    }

    applyAll() {
        const appDisplay = this._getAppDisplay();
        if (!appDisplay)
            return;

        const viewMode = this._settings.get_string('view-mode');
        const hideIndicators = this._settings.get_boolean('hide-page-indicators');
        const customGrid = this._settings.get_boolean('custom-grid-size');

        const lm = appDisplay._grid?.layoutManager;
        if (lm) {
            if (this._origGridRows === null)
                this._origGridRows = lm.rowsPerPage;
            if (this._origGridCols === null)
                this._origGridCols = lm.columnsPerPage;

            const targetRows = customGrid ? this._settings.get_int('grid-rows') : this._origGridRows;
            const targetCols = customGrid ? this._settings.get_int('grid-columns') : this._origGridCols;

            if (lm.rowsPerPage !== targetRows || lm.columnsPerPage !== targetCols) {
                const emptyVariant = new GLib.Variant('aa{sv}', []);
                if (!this._shellSettings.get_value('app-picker-layout').equal(emptyVariant))
                    this._shellSettings.set_value('app-picker-layout', emptyVariant);
                lm.rowsPerPage = targetRows;
                lm.columnsPerPage = targetCols;
            }
        }

        if (viewMode === 'list') {
            if (appDisplay._scrollView)
                appDisplay._scrollView.visible = false;
            if (appDisplay._pageIndicators)
                appDisplay._pageIndicators.visible = false;
            this._ensureListView(appDisplay);
        } else {
            this._destroyListView();
            if (appDisplay._scrollView)
                appDisplay._scrollView.visible = true;
            if (appDisplay._pageIndicators)
                appDisplay._pageIndicators.visible = !hideIndicators;
            this._safeRedisplay(appDisplay);
        }
    }

    _destroyListView() {
        if (this._activeListMenu) {
            this._activeListMenu.destroy();
            this._activeListMenu = null;
        }
        this._listMenuManager = null;

        if (this._listScroll) {
            this._listScroll.destroy();
            this._listScroll = null;
        }
    }

    _ensureListView(appDisplay) {
        if (!this._listScroll) {
            this._listScroll = new St.ScrollView({
                style_class: 'amm-list-scroll',
                x_expand: true,
                y_expand: true,
                hscrollbar_policy: St.PolicyType.NEVER,
                vscrollbar_policy: St.PolicyType.AUTOMATIC,
                overlay_scrollbars: true,
            });
            appDisplay.add_child(this._listScroll);
            this._listMenuManager = new PopupMenu.PopupMenuManager(appDisplay);
        }
        this._rebuildListView();
    }

    _rebuildListView() {
        if (!this._listScroll)
            return;

        const rootBox = new St.BoxLayout({
            vertical: true,
            style_class: 'amm-list-root',
            x_expand: true,
        });

        const foldersSettings = getAppFoldersSettings();
        const folderIds = foldersSettings.get_strv('folder-children');

        const filterBar = new St.BoxLayout({
            style_class: 'amm-list-filter-bar',
            x_align: Clutter.ActorAlign.CENTER,
        });

        const addFilterChip = (label, folderId) => {
            const isSelected = this._selectedListFolder === folderId;
            const btn = new St.Button({
                label,
                style_class: isSelected ? 'amm-filter-chip amm-filter-chip-active' : 'amm-filter-chip',
                can_focus: true,
            });
            btn.connect('clicked', () => {
                this._selectedListFolder = folderId;
                this._rebuildListView();
            });
            filterBar.add_child(btn);
        };

        addFilterChip(t('All'), null);
        for (const fId of folderIds) {
            const fs = getFolderSettings(fId);
            const appsInFolder = fs.get_strv('apps');
            if (appsInFolder.length === 0)
                continue;
            const name = fs.get_string('name') || fId;
            addFilterChip(name, fId);
        }
        rootBox.add_child(filterBar);

        const hiddenApps = new Set(this._settings.get_strv('hidden-apps'));
        let folderAppSet = null;
        if (this._selectedListFolder && folderIds.includes(this._selectedListFolder)) {
            const fs = getFolderSettings(this._selectedListFolder);
            folderAppSet = new Set(fs.get_strv('apps'));
        }

        const apps = [];
        for (const info of this._appSystem.get_installed()) {
            if (!info.should_show())
                continue;
            const id = info.get_id();
            if (!id || hiddenApps.has(id))
                continue;
            if (folderAppSet && !folderAppSet.has(id))
                continue;
            const app = this._appSystem.lookup_app(id);
            if (app)
                apps.push(app);
        }

        const sortMode = this._settings.get_string('sort-mode');
        const desc = sortMode === 'za';
        apps.sort((a, b) => {
            const cmp = this._collator.compare(a.get_name() || '', b.get_name() || '');
            return desc ? -cmp : cmp;
        });

        const cols = Math.max(1, this._settings.get_int('list-columns'));
        const showDesc = this._settings.get_boolean('list-show-descriptions');
        const customIconSize = this._settings.get_int('icon-size');
        const iconSize = customIconSize > 0 ? Math.min(customIconSize, 48) : 36;

        const gridTable = new St.Widget({
            style_class: 'amm-list-grid',
            x_expand: true,
            layout_manager: new Clutter.GridLayout({
                column_spacing: 12,
                row_spacing: 8,
                column_homogeneous: true,
            }),
        });
        const gridLayout = gridTable.layout_manager;

        apps.forEach((app, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            const card = new St.Button({
                style_class: 'amm-list-card',
                x_expand: true,
                can_focus: true,
                button_mask: St.ButtonMask.ONE | St.ButtonMask.THREE,
            });

            const cardBox = new St.BoxLayout({
                style_class: 'amm-list-card-box',
                x_expand: true,
            });

            const icon = app.create_icon_texture(iconSize);
            icon.set_y_align(Clutter.ActorAlign.CENTER);
            cardBox.add_child(icon);

            const textBox = new St.BoxLayout({
                vertical: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                style_class: 'amm-list-text-box',
            });

            const nameLabel = new St.Label({
                text: app.get_name() || app.get_id(),
                style_class: 'amm-list-app-name',
            });
            textBox.add_child(nameLabel);

            if (showDesc) {
                const descText = app.get_description();
                if (descText) {
                    const descLabel = new St.Label({
                        text: descText,
                        style_class: 'amm-list-app-desc',
                    });
                    descLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
                    textBox.add_child(descLabel);
                }
            }

            cardBox.add_child(textBox);
            card.set_child(cardBox);

            card.connect('clicked', (_btn, clickedButton) => {
                if (clickedButton === 3) {
                    this._openListContextMenu(card, app);
                } else {
                    app.activate();
                    Main.overview.hide();
                }
            });

            gridLayout.attach(card, col, row, 1, 1);
        });

        rootBox.add_child(gridTable);
        this._listScroll.set_child(rootBox);
    }

    _openListContextMenu(actor, app) {
        if (this._activeListMenu) {
            this._activeListMenu.destroy();
            this._activeListMenu = null;
        }

        const menu = new AppMenu(actor, St.Side.LEFT, {
            favoritesSection: true,
            showSingleWindows: false,
        });
        menu.setApp(app);
        Main.uiGroup.add_child(menu.actor);
        this._listMenuManager.addMenu(menu);
        this._activeListMenu = menu;

        menu.connect('open-state-changed', (_m, isOpen) => {
            if (!isOpen) {
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    if (this._activeListMenu === menu) {
                        menu.destroy();
                        this._activeListMenu = null;
                    }
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        menu.open(true);
    }
}
