import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class AppImageWatcher {
    constructor(settings, onChanged) {
        this._settings = settings;
        this._onChanged = onChanged;
        this._monitor = null;
        this._debounceId = 0;
        this._cachePath = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            'app-menu-master',
            'appimages.json',
        ]);
        this._cache = this._loadCache();
    }

    getMonitoredDirectory() {
        const custom = (this._settings.get_string('appimage-directory') || '').trim();
        if (custom)
            return custom;
        return GLib.build_filenamev([GLib.get_home_dir(), 'Applications']);
    }

    enable() {
        this.restart();
    }

    restart() {
        this._stopMonitor();
        if (!this._settings.get_boolean('appimage-enabled'))
            return;

        const dirPath = this.getMonitoredDirectory();
        const dirFile = Gio.File.new_for_path(dirPath);
        if (!dirFile.query_exists(null)) {
            try {
                dirFile.make_directory_with_parents(null);
            } catch (_e) {
                return;
            }
        }

        this.rescan().catch(e => console.error('[AppMenuMaster] AppImage rescan error:', e));

        try {
            this._monitor = dirFile.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect('changed', (_mon, _file, _other, eventType) => {
                if (
                    eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
                    eventType === Gio.FileMonitorEvent.CREATED ||
                    eventType === Gio.FileMonitorEvent.DELETED ||
                    eventType === Gio.FileMonitorEvent.MOVED_IN ||
                    eventType === Gio.FileMonitorEvent.MOVED_OUT ||
                    eventType === Gio.FileMonitorEvent.RENAMED
                ) {
                    this._scheduleRescan(600);
                }
            });
        } catch (e) {
            console.error('[AppMenuMaster] AppImage monitor error:', e);
        }
    }

    destroy() {
        this._stopMonitor();
    }

    _stopMonitor() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }
    }

    _scheduleRescan(delayMs = 500) {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._debounceId = 0;
            this.rescan().catch(e => console.error('[AppMenuMaster] AppImage rescan error:', e));
            return GLib.SOURCE_REMOVE;
        });
    }

    _loadCache() {
        try {
            const file = Gio.File.new_for_path(this._cachePath);
            if (!file.query_exists(null))
                return {};
            const [ok, bytes] = file.load_contents(null);
            if (!ok || !bytes)
                return {};
            return JSON.parse(new TextDecoder().decode(bytes)) || {};
        } catch (_e) {
            return {};
        }
    }

    _saveCache() {
        try {
            const file = Gio.File.new_for_path(this._cachePath);
            const parent = file.get_parent();
            if (parent && !parent.query_exists(null))
                parent.make_directory_with_parents(null);
            const data = new TextEncoder().encode(JSON.stringify(this._cache, null, 2));
            file.replace_contents(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } catch (_e) {
            // ignore
        }
    }

    _hasLibfuse2() {
        const candidates = [
            '/lib/x86_64-linux-gnu/libfuse.so.2',
            '/usr/lib/x86_64-linux-gnu/libfuse.so.2',
            '/lib64/libfuse.so.2',
            '/usr/lib64/libfuse.so.2',
            '/usr/lib/libfuse.so.2',
            '/lib/libfuse.so.2',
            '/lib/aarch64-linux-gnu/libfuse.so.2',
            '/usr/lib/aarch64-linux-gnu/libfuse.so.2',
        ];
        return candidates.some(p => GLib.file_test(p, GLib.FileTest.EXISTS));
    }

    _ensureExecutable(filePath) {
        try {
            const f = Gio.File.new_for_path(filePath);
            const info = f.query_info('unix::mode', Gio.FileQueryInfoFlags.NONE, null);
            const mode = info.get_attribute_uint32('unix::mode');
            if (!(mode & 0o100))
                f.set_attribute_uint32('unix::mode', mode | 0o755, Gio.FileQueryInfoFlags.NONE, null);
        } catch (_e) {
            // ignore
        }
    }

    async rescan() {
        if (!this._settings.get_boolean('appimage-enabled'))
            return;

        const dirPath = this.getMonitoredDirectory();
        const dirFile = Gio.File.new_for_path(dirPath);
        if (!dirFile.query_exists(null))
            return;

        let enumerator;
        try {
            enumerator = dirFile.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        } catch (_e) {
            return;
        }

        const currentFiles = new Set();
        let changed = false;

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            if (info.get_file_type() !== Gio.FileType.REGULAR)
                continue;
            const name = info.get_name();
            if (!name.toLowerCase().endsWith('.appimage'))
                continue;
            const fullPath = GLib.build_filenamev([dirPath, name]);
            currentFiles.add(fullPath);
            const added = await this._integrateAppImage(fullPath);
            if (added)
                changed = true;
        }
        enumerator.close(null);

        for (const cachedPath of Object.keys(this._cache)) {
            if (!currentFiles.has(cachedPath) || !GLib.file_test(cachedPath, GLib.FileTest.EXISTS)) {
                this._removeIntegratedAppImage(cachedPath);
                changed = true;
            }
        }

        if (changed) {
            this._saveCache();
            if (this._onChanged)
                this._onChanged();
        }
    }

    async _integrateAppImage(filePath) {
        const existing = this._cache[filePath];
        if (existing && existing.desktopFile && GLib.file_test(existing.desktopFile, GLib.FileTest.EXISTS)) {
            if (!existing.iconPath || GLib.file_test(existing.iconPath, GLib.FileTest.EXISTS))
                return false;
        }

        this._ensureExecutable(filePath);
        const meta = await this._extractMetadata(filePath);

        const appsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'applications']);
        GLib.mkdir_with_parents(appsDir, 0o755);

        const slug = meta.slug;
        const desktopFilePath = GLib.build_filenamev([appsDir, `${slug}.desktop`]);
        const needExtractRun = !this._hasLibfuse2();
        const execCmd = needExtractRun
            ? `"${filePath}" --appimage-extract-and-run`
            : `"${filePath}"`;

        const desktopText = [
            '[Desktop Entry]',
            '# Managed by App Menu Master',
            `Name=${meta.name}`,
            `Exec=${execCmd}`,
            `TryExec=${filePath}`,
            `Icon=${meta.iconPath || 'application-x-appimage'}`,
            'Terminal=false',
            'Type=Application',
            `Categories=${meta.categories || 'Utility;'}`,
            'StartupNotify=true',
            '',
        ].join('\n');

        const dFile = Gio.File.new_for_path(desktopFilePath);
        dFile.replace_contents(
            new TextEncoder().encode(desktopText),
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );

        this._cache[filePath] = {
            name: meta.name,
            slug,
            desktopFile: desktopFilePath,
            iconPath: meta.iconPath,
        };
        return true;
    }

    _removeIntegratedAppImage(filePath) {
        const entry = this._cache[filePath];
        if (entry) {
            if (entry.desktopFile && GLib.file_test(entry.desktopFile, GLib.FileTest.EXISTS)) {
                try {
                    Gio.File.new_for_path(entry.desktopFile).delete(null);
                } catch (_e) {
                    // ignore
                }
            }
            if (entry.iconPath && GLib.file_test(entry.iconPath, GLib.FileTest.EXISTS)) {
                try {
                    Gio.File.new_for_path(entry.iconPath).delete(null);
                } catch (_e) {
                    // ignore
                }
            }
            delete this._cache[filePath];
        }
    }

    async _extractMetadata(filePath) {
        const baseName = GLib.path_get_basename(filePath).replace(/\.AppImage$/i, '');
        const cleanTitle = baseName
            .replace(/[-._\s](v?\d+(\.\d+){1,3}|x86_64|aarch64|amd64|linux).*$/i, '')
            .replace(/[-_.]+/g, ' ')
            .trim() || baseName;

        const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'appimage';

        const tmpDir = GLib.build_filenamev([GLib.get_tmp_dir(), `amm-appimage-${GLib.uuid_string_random()}`]);
        GLib.mkdir_with_parents(tmpDir, 0o700);

        let name = cleanTitle;
        let categories = 'Utility;';
        let iconPath = null;

        try {
            const [ok, pid] = GLib.spawn_async(
                tmpDir,
                [filePath, '--appimage-extract'],
                null,
                GLib.SpawnFlags.DO_NOT_REAP_CHILD | GLib.SpawnFlags.STDERR_TO_DEV_NULL | GLib.SpawnFlags.STDOUT_TO_DEV_NULL,
                null
            );

            if (ok) {
                await new Promise(resolve => {
                    GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, p => {
                        GLib.spawn_close_pid(p);
                        resolve();
                    });
                });

                const squashRoot = Gio.File.new_for_path(GLib.build_filenamev([tmpDir, 'squashfs-root']));
                if (squashRoot.query_exists(null)) {
                    const parsed = this._parseSquashDesktop(squashRoot);
                    if (parsed.name)
                        name = parsed.name;
                    if (parsed.categories)
                        categories = parsed.categories;

                    const foundIcon = this._locateSquashIcon(
                        squashRoot,
                        parsed.icon,
                        slug,
                        this._settings.get_boolean('appimage-deep-icon-search')
                    );

                    if (foundIcon) {
                        const isSvg = foundIcon.toLowerCase().endsWith('.svg');
                        const ext = isSvg ? 'svg' : 'png';
                        const subDir = isSvg ? 'scalable' : '256x256';
                        const targetIconDir = GLib.build_filenamev([
                            GLib.get_user_data_dir(),
                            'icons',
                            'hicolor',
                            subDir,
                            'apps',
                        ]);
                        GLib.mkdir_with_parents(targetIconDir, 0o755);
                        const destIconPath = GLib.build_filenamev([targetIconDir, `${slug}.${ext}`]);
                        Gio.File.new_for_path(foundIcon).copy(
                            Gio.File.new_for_path(destIconPath),
                            Gio.FileCopyFlags.OVERWRITE,
                            null,
                            null
                        );
                        iconPath = destIconPath;
                    }
                }
            }
        } catch (_e) {
            // fallback to filename metadata
        } finally {
            try {
                GLib.spawn_async(null, ['rm', '-rf', tmpDir], null, GLib.SpawnFlags.SEARCH_PATH, null);
            } catch (_e) {
                // ignore
            }
        }

        return { name, slug, categories, iconPath };
    }

    _parseSquashDesktop(squashRoot) {
        const result = { name: null, icon: null, categories: null };
        try {
            const enumerator = squashRoot.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            let desktopChild = null;
            while ((info = enumerator.next_file(null)) !== null) {
                if (info.get_name().endsWith('.desktop')) {
                    desktopChild = squashRoot.get_child(info.get_name());
                    break;
                }
            }
            enumerator.close(null);

            if (!desktopChild)
                return result;

            const [ok, bytes] = desktopChild.load_contents(null);
            if (!ok || !bytes)
                return result;

            const text = new TextDecoder().decode(bytes);
            for (const line of text.split('\n')) {
                if (!result.name && line.startsWith('Name='))
                    result.name = line.slice(5).trim();
                else if (!result.icon && line.startsWith('Icon='))
                    result.icon = line.slice(5).trim();
                else if (!result.categories && line.startsWith('Categories='))
                    result.categories = line.slice(11).trim();
            }
        } catch (_e) {
            // ignore
        }
        return result;
    }

    _locateSquashIcon(squashRoot, iconKey, slug, deepSearch) {
        const rootPath = squashRoot.get_path();
        const baseKey = iconKey ? iconKey.replace(/\.(png|svg|xpm|ico)$/i, '') : slug;

        const directCandidates = [];
        if (iconKey) {
            directCandidates.push(
                GLib.build_filenamev([rootPath, iconKey]),
                GLib.build_filenamev([rootPath, `${baseKey}.png`]),
                GLib.build_filenamev([rootPath, `${baseKey}.svg`]),
                GLib.build_filenamev([rootPath, 'usr', 'share', 'pixmaps', `${baseKey}.png`]),
                GLib.build_filenamev([rootPath, 'usr', 'share', 'pixmaps', `${baseKey}.svg`])
            );
        }
        directCandidates.push(GLib.build_filenamev([rootPath, '.DirIcon']));

        for (const cand of directCandidates) {
            if (GLib.file_test(cand, GLib.FileTest.IS_REGULAR))
                return cand;
        }

        if (deepSearch)
            return this._searchIconRecursive(squashRoot, baseKey.toLowerCase(), 0);

        return null;
    }

    _searchIconRecursive(dirFile, targetLower, depth) {
        if (depth > 5)
            return null;

        let enumerator;
        try {
            enumerator = dirFile.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        } catch (_e) {
            return null;
        }

        const subdirs = [];
        let fallbackImg = null;
        let info;

        while ((info = enumerator.next_file(null)) !== null) {
            const name = info.get_name();
            const child = dirFile.get_child(name);
            if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                subdirs.push(child);
            } else {
                const lower = name.toLowerCase();
                if (lower.endsWith('.png') || lower.endsWith('.svg')) {
                    if (lower === `${targetLower}.png` || lower === `${targetLower}.svg` || lower.includes(targetLower)) {
                        enumerator.close(null);
                        return child.get_path();
                    }
                    if (!fallbackImg && (lower.includes('icon') || lower.includes('logo')))
                        fallbackImg = child.get_path();
                }
            }
        }
        enumerator.close(null);

        for (const sub of subdirs) {
            const found = this._searchIconRecursive(sub, targetLower, depth + 1);
            if (found)
                return found;
        }

        return fallbackImg;
    }
}
