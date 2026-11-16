import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';

import { autoCategorizeApps, matchCategoryId } from './categorizer.js';
import { getCollator } from './i18n.js';

const SHELL_SCHEMA = 'org.gnome.shell';

export class AppSorter {
    constructor(settings, getAppDisplayFn) {
        this._settings = settings;
        this._getAppDisplay = getAppDisplayFn;
        this._shellSettings = new Gio.Settings({ schema_id: SHELL_SCHEMA });
        this._appSystem = Shell.AppSystem.get_default();
        this._collator = getCollator();
        this._isSorting = false;
        this._debounceId = 0;
        this._installedChangedId = 0;
        this._origCompareItems = null;
        this._origRedisplay = null;
        this._origFolderCompareItems = null;
    }

    enable() {
        const sorter = this;

        if (!this._origCompareItems && AppDisplay.AppDisplay?.prototype?._compareItems) {
            this._origCompareItems = AppDisplay.AppDisplay.prototype._compareItems;
            AppDisplay.AppDisplay.prototype._compareItems = function (a, b) {
                const sortMode = sorter._settings.get_string('sort-mode');
                if (sortMode === 'manual')
                    return sorter._origCompareItems.call(this, a, b);
                return sorter.compareIcons(a, b);
            };
        }

        if (!this._origRedisplay && AppDisplay.AppDisplay?.prototype?._redisplay) {
            this._origRedisplay = AppDisplay.AppDisplay.prototype._redisplay;
            AppDisplay.AppDisplay.prototype._redisplay = function () {
                const sortMode = sorter._settings.get_string('sort-mode');
                if (sortMode === 'manual')
                    return sorter._origRedisplay.call(this);

                this._folderIcons.forEach(icon => {
                    icon.view._redisplay();
                });

                const currentApps = this._orderedItems.slice();
                const currentAppIds = currentApps.map(icon => icon.id);

                const newApps = this._loadApps().sort(this._compareItems.bind(this));
                const newAppIds = newApps.map(icon => icon.id);

                const removedApps = currentApps.filter(icon => !newAppIds.includes(icon.id));

                removedApps.forEach(icon => {
                    this._removeItem(icon);
                    if (!(icon instanceof AppDisplay.FolderIcon))
                        icon.destroy();
                });

                const { itemsPerPage } = this._grid;
                const safePerPage = Math.max(1, itemsPerPage || 24);

                for (const icon of currentApps) {
                    if (!removedApps.includes(icon) && this._items.has(icon.id)) {
                        try {
                            this._removeItem(icon);
                        } catch (_e) {
                            // ignore
                        }
                    }
                }

                newApps.forEach((icon, i) => {
                    const page = Math.floor(i / safePerPage);
                    const position = i % safePerPage;

                    try {
                        this._addItem(icon, page, position);
                    } catch (_err) {
                        try {
                            this._addItem(icon, -1, -1);
                        } catch (_e2) {
                            // ignore fallback error
                        }
                    }
                });

                this._orderedItems = newApps;
                this.emit('view-loaded');
            };
        }

        if (!this._origFolderCompareItems && AppDisplay.FolderView?.prototype?._loadApps) {
            this._origFolderCompareItems = AppDisplay.FolderView.prototype._loadApps;
            AppDisplay.FolderView.prototype._loadApps = function () {
                const items = sorter._origFolderCompareItems.call(this);
                const sortMode = sorter._settings.get_string('sort-mode');
                const sortInside = sorter._settings.get_boolean('sort-inside-folders');
                if (sortMode !== 'manual' && sortInside && items.length > 1) {
                    const descending = sortMode === 'za';
                    items.sort((a, b) => sorter._compareNames(a.name || '', b.name || '', descending));
                    this._apps = items.map(icon => icon.app);
                }
                return items;
            };
        }

        this._installedChangedId = this._appSystem.connect('installed-changed', () => {
            if (this._settings.get_boolean('auto-categorize-on-install'))
                autoCategorizeApps();
            if (this._settings.get_boolean('auto-sort-on-change'))
                this.scheduleSort(600);
        });
    }

    destroy() {
        if (this._installedChangedId) {
            this._appSystem.disconnect(this._installedChangedId);
            this._installedChangedId = 0;
        }
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        if (this._origCompareItems) {
            AppDisplay.AppDisplay.prototype._compareItems = this._origCompareItems;
            this._origCompareItems = null;
        }
        if (this._origRedisplay) {
            AppDisplay.AppDisplay.prototype._redisplay = this._origRedisplay;
            this._origRedisplay = null;
        }
        if (this._origFolderCompareItems) {
            AppDisplay.FolderView.prototype._loadApps = this._origFolderCompareItems;
            this._origFolderCompareItems = null;
        }
    }

    scheduleSort(delayMs = 250) {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._debounceId = 0;
            this.sortAll();
            return GLib.SOURCE_REMOVE;
        });
    }

    _compareNames(aName, bName, descending) {
        const cmp = this._collator.compare(aName || '', bName || '');
        return descending ? -cmp : cmp;
    }

    compareIcons(a, b) {
        const sortMode = this._settings.get_string('sort-mode');
        const descending = sortMode === 'za';
        const foldersFirst = this._settings.get_boolean('folders-first');
        const viewMode = this._settings.get_string('view-mode');
        const uncategorizedLast =
            viewMode === 'folders-grid' && this._settings.get_boolean('uncategorized-last');

        const aIsFolder = a instanceof AppDisplay.FolderIcon;
        const bIsFolder = b instanceof AppDisplay.FolderIcon;

        if (foldersFirst && aIsFolder !== bIsFolder)
            return aIsFolder ? -1 : 1;

        if (uncategorizedLast && !aIsFolder && !bIsFolder) {
            const aInfo = a.app?.get_app_info?.() ?? Gio.DesktopAppInfo.new(a.id);
            const bInfo = b.app?.get_app_info?.() ?? Gio.DesktopAppInfo.new(b.id);
            const aUncat = !matchCategoryId(aInfo);
            const bUncat = !matchCategoryId(bInfo);
            if (aUncat !== bUncat)
                return aUncat ? 1 : -1;
        }

        return this._compareNames(a.name || a.id || '', b.name || b.id || '', descending);
    }

    sortAll() {
        if (this._isSorting)
            return;

        const sortMode = this._settings.get_string('sort-mode');
        if (sortMode === 'manual')
            return;

        this._isSorting = true;
        try {
            const appDisplay = this._getAppDisplay();
            if (appDisplay && !appDisplay._pageManager?._updatingPages)
                appDisplay._redisplay();
        } catch (e) {
            console.error('[AppMenuMaster] Sort error:', e);
        } finally {
            this._isSorting = false;
        }
    }
}
