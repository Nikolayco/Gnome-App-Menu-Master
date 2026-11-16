import Gio from 'gi://Gio';

import { t } from './i18n.js';

const APP_FOLDERS_SCHEMA = 'org.gnome.desktop.app-folders';
const FOLDER_SCHEMA = 'org.gnome.desktop.app-folders.folder';
const FOLDER_PATH_PREFIX = '/org/gnome/desktop/app-folders/folders/';

const CATEGORY_MAP = [
    {
        id: 'internet',
        nameKey: 'Internet',
        aliases: ['İnternet', 'Internet'],
        categories: ['Network', 'WebBrowser', 'Email', 'InstantMessaging', 'FileTransfer', 'RemoteAccess', 'WebApps'],
    },
    {
        id: 'office',
        nameKey: 'Office',
        aliases: ['Ofis', 'Office'],
        categories: ['Office', 'WordProcessor', 'Spreadsheet', 'Presentation', 'Calendar', 'Finance', 'Dictionary', 'Education'],
    },
    {
        id: 'development',
        nameKey: 'Development',
        aliases: ['Geliştirme', 'Programlama', 'Development'],
        categories: ['Development', 'IDE', 'TextEditor', 'RevisionControl', 'Building', 'Debugger'],
    },
    {
        id: 'graphics',
        nameKey: 'Graphics',
        aliases: ['Grafik', 'Graphics'],
        categories: ['Graphics', '2DGraphics', '3DGraphics', 'Photography', 'VectorGraphics', 'RasterGraphics'],
    },
    {
        id: 'multimedia',
        nameKey: 'Sound & Video',
        aliases: ['Ses ve Video', 'Sound & Video', 'Multimedia'],
        categories: ['AudioVideo', 'Audio', 'Video', 'Player', 'Recorder', 'Music'],
    },
    {
        id: 'games',
        nameKey: 'Games',
        aliases: ['Oyunlar', 'Games'],
        categories: ['Game', 'ActionGame', 'AdventureGame', 'ArcadeGame', 'BoardGame', 'StrategyGame', 'Simulation'],
    },
    {
        id: 'system',
        nameKey: 'System',
        aliases: ['Sistem', 'System'],
        categories: ['System', 'Settings', 'PackageManager', 'Monitor', 'Security', 'TerminalEmulator'],
    },
    {
        id: 'utilities',
        nameKey: 'Utilities',
        aliases: ['Araçlar', 'Utilities', 'Accessories'],
        categories: ['Utility', 'Archiving', 'Compression', 'Calculator', 'Clock', 'Accessibility', 'Accessories'],
    },
];

export function matchCategoryId(info) {
    if (!info || typeof info.get_categories !== 'function')
        return null;
    const rawCats = info.get_categories() || '';
    const catTokens = rawCats.split(';').filter(Boolean);
    if (catTokens.length === 0)
        return null;

    for (const cat of CATEGORY_MAP) {
        if (catTokens.some(token => cat.categories.includes(token)))
            return cat.id;
    }
    return null;
}

export function getAppFoldersSettings() {
    return new Gio.Settings({ schema_id: APP_FOLDERS_SCHEMA });
}

export function getFolderSettings(folderId) {
    return new Gio.Settings({
        schema_id: FOLDER_SCHEMA,
        path: `${FOLDER_PATH_PREFIX}${folderId}/`,
    });
}

export function findAppFolder(appId) {
    const foldersSettings = getAppFoldersSettings();
    const children = foldersSettings.get_strv('folder-children');
    for (const folderId of children) {
        const fs = getFolderSettings(folderId);
        const apps = fs.get_strv('apps');
        if (apps.includes(appId))
            return folderId;
    }
    return null;
}

export function moveAppToFolder(appId, targetFolderId) {
    const foldersSettings = getAppFoldersSettings();
    const children = foldersSettings.get_strv('folder-children');

    for (const folderId of children) {
        const fs = getFolderSettings(folderId);
        const apps = fs.get_strv('apps');
        const filtered = apps.filter(id => id !== appId);
        if (filtered.length !== apps.length)
            fs.set_strv('apps', filtered);
    }

    if (targetFolderId && children.includes(targetFolderId)) {
        const targetSettings = getFolderSettings(targetFolderId);
        const targetApps = targetSettings.get_strv('apps');
        if (!targetApps.includes(appId)) {
            targetApps.push(appId);
            targetSettings.set_strv('apps', targetApps);
        }
    }
    Gio.Settings.sync();
}

export function createFolder(name) {
    const cleanName = name.trim();
    if (!cleanName)
        return null;

    const foldersSettings = getAppFoldersSettings();
    const children = foldersSettings.get_strv('folder-children');

    let slug = cleanName
        .toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!slug)
        slug = t('folder');

    let folderId = slug;
    let counter = 2;
    while (children.includes(folderId)) {
        folderId = `${slug}-${counter}`;
        counter++;
    }

    const fs = getFolderSettings(folderId);
    fs.set_string('name', cleanName);
    fs.set_strv('apps', []);

    children.push(folderId);
    foldersSettings.set_strv('folder-children', children);
    Gio.Settings.sync();
    return folderId;
}

export function renameFolder(folderId, newName) {
    const cleanName = newName.trim();
    if (!cleanName)
        return;
    const fs = getFolderSettings(folderId);
    fs.set_string('name', cleanName);
    Gio.Settings.sync();
}

export function deleteFolder(folderId) {
    const foldersSettings = getAppFoldersSettings();
    const children = foldersSettings.get_strv('folder-children');
    const fs = getFolderSettings(folderId);
    fs.reset('name');
    fs.reset('apps');
    fs.reset('categories');
    fs.reset('excluded-apps');
    foldersSettings.set_strv('folder-children', children.filter(id => id !== folderId));
    Gio.Settings.sync();
}

export function autoCategorizeApps() {
    const foldersSettings = getAppFoldersSettings();
    const existingChildren = foldersSettings.get_strv('folder-children');
    const newChildren = [...existingChildren];

    const catMapIds = new Set(CATEGORY_MAP.map(c => c.id));
    const alreadyInCustomFolder = new Set();

    const nameToExistingId = new Map();
    for (const fid of existingChildren) {
        const fs = getFolderSettings(fid);
        const fname = (fs.get_string('name') || '').trim().toLowerCase();
        if (fname)
            nameToExistingId.set(fname, fid);

        if (!catMapIds.has(fid)) {
            for (const appId of fs.get_strv('apps'))
                alreadyInCustomFolder.add(appId);
        }
    }

    const allApps = Gio.AppInfo.get_all().filter(info => info.should_show());
    const buckets = new Map();
    for (const cat of CATEGORY_MAP)
        buckets.set(cat.id, []);

    for (const info of allApps) {
        const appId = info.get_id();
        if (!appId || alreadyInCustomFolder.has(appId))
            continue;

        const matchedId = matchCategoryId(info);
        if (matchedId)
            buckets.get(matchedId).push(appId);
    }

    let folderCount = 0;
    let appCount = 0;

    for (const cat of CATEGORY_MAP) {
        const apps = buckets.get(cat.id);
        if (!apps || apps.length === 0)
            continue;

        const localizedName = t(cat.nameKey);
        let existingSameNameId = nameToExistingId.get(localizedName.toLowerCase());
        if (!existingSameNameId && cat.aliases) {
            for (const alias of cat.aliases) {
                const found = nameToExistingId.get(alias.toLowerCase());
                if (found) {
                    existingSameNameId = found;
                    break;
                }
            }
        }
        const targetId = existingSameNameId || cat.id;

        if (!newChildren.includes(targetId))
            newChildren.push(targetId);

        const fs = getFolderSettings(targetId);
        if (!existingSameNameId)
            fs.set_string('name', localizedName);

        const currentApps = fs.get_strv('apps');
        const mergedApps = Array.from(new Set([...currentApps, ...apps]));
        if (JSON.stringify(currentApps) !== JSON.stringify(mergedApps))
            fs.set_strv('apps', mergedApps);

        folderCount++;
        appCount += apps.length;
    }

    if (JSON.stringify(existingChildren) !== JSON.stringify(newChildren))
        foldersSettings.set_strv('folder-children', newChildren);

    Gio.Settings.sync();

    const shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
    if (shellSettings.get_value('app-picker-layout').n_children() > 0) {
        shellSettings.reset('app-picker-layout');
        Gio.Settings.sync();
    }

    return { folderCount, appCount };
}
