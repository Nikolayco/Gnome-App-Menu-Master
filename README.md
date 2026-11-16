# GNOME App Menu Master

🌍 **[Türkçe](README.tr.md) | English**

> An all-in-one, lightweight, and rock-solid **GNOME Shell App Grid & Application Menu Manager** for GNOME 45, 46, 47, and 48.
> Replaces multiple single-purpose extensions (Alphabetical App Grid, App Grid Uninstall, Add to Desktop, App Hider, AppImage Manager, Custom Grid Size) with one unified, conflict-free extension.

Automatically detects your system language and displays in **English** or **Turkish** (`en` / `tr`).

---

## ✨ Key Features

### 1. Three View Modes (`View` Tab)
- **Folder / Grouped Grid:** Classic GNOME App Grid with smart folder support.
- **Ungrouped Flat Alphabetical Grid:** Displays all applications (including those inside folders) in a single flat A–Z grid without deleting your folder configurations.
- **Alphabetical List View:** Multi-column (1–4 columns) scrollable list view with category filter chips (`All`, `Internet`, `Office`, `Development`, etc.) and optional application descriptions.
- **Custom Grid Dimensions:** Customize Main Grid rows (2–10) and columns (3–12), two-line application labels, custom font size, and hide page indicators.
- **Top Panel Quick Access Button:** Optional status area icon to switch views, sort immediately, or auto-categorize with one click.

### 2. Locale-Aware Smart Sorting (`Sorting` Tab)
- **A → Z / Z → A / Manual:** Uses `Intl.Collator` for accurate locale-aware sorting (including Turkish characters `Ç, Ğ, İ, Ö, Ş, Ü` and natural numeric sorting).
- **Pin Folders First:** Keep folders at the beginning of the App Grid.
- **Sort Inside Folders:** Automatically sorts applications inside multi-page folders without page overflow errors.
- **Auto-Sort on Install/Remove:** Automatically keeps the grid sorted when applications are installed or uninstalled.

### 3. Folder & Category Management (`Folders` Tab)
- **One-Click Auto-Categorize:** Groups installed applications into standard category folders (*Internet, Office, Development, Graphics, Sound & Video, Games, System, Utilities*) based on `.desktop` categories while preserving your custom folders.
- **Interactive Folder Editor:** Create new folders, rename existing folders, delete folders, or toggle which apps belong to a folder from a clean Libadwaita dialog.

### 4. Right-Click Context Menu & App Hiding (`Right-Click & Hide` Tab)
Right-clicking any application icon in the App Grid (or List View) adds configurable actions:
- **Add / Remove Desktop Shortcut:** Creates a trusted (`metadata::trusted`), executable `.desktop` shortcut on your Desktop.
- **Move to Folder Submenu:** Move any app into a folder or back to the Main Grid directly from the context menu.
- **Hide from Menu:** Hide unwanted icons without uninstalling them; restore anytime from the searchable **Hidden Applications Manager** in Preferences.
- **Open `.desktop` Location:** Opens the folder containing the `.desktop` launcher.
- **Uninstall Application:** Detects and removes **APT/DEB** packages (via `pkexec apt-get remove`), **Flatpak** apps (both `--user` and `--system`), **AppImage** packages, and local WebApps/shortcuts.

### 5. Built-in AppImage Manager (`AppImage` Tab)
- **Monitored Directory:** Watches `~/Applications` (or any custom folder you select) in real time.
- **Automatic Menu Integration:** Makes `.AppImage` files executable, extracts their internal `.desktop` metadata and icons, and creates menu launchers automatically (with `libfuse2` / `--appimage-extract-and-run` detection).
- **Deep Icon Search:** Searches deeper inside the AppImage squashfs payload when icons are not in standard root paths.
- **Package List & Management:** View detected `.AppImage` files with size info, open their directory, rescan on demand, or delete them directly from Preferences.

### 6. JSON Backup & Reset (`Backup & Reset` Tab)
- Export all extension settings, custom folders, and hidden app lists to a single `.json` file and restore them on any machine.

---

## 📦 Installation

### Option 1: From GNOME Extensions Website (Recommended)
Once published on [extensions.gnome.org](https://extensions.gnome.org/), toggle the switch to install directly from your browser.

### Option 2: Install from Release ZIP
```bash
gnome-extensions install --force app-menu-master@nikolayco.local.shell-extension.zip
gnome-extensions enable app-menu-master@nikolayco.local
```

### Option 3: Install from Source (GitHub)
```bash
git clone https://github.com/Nikolayco/Gnome-App-Menu-Master.git
cd Gnome-App-Menu-Master
./install.sh
```
> **Note:** On Wayland, log out and log back in if the extension is installed for the first time. On X11, press `Alt+F2`, type `r`, and press `Enter`.

---

## 🛠️ Building the EGO (`extensions.gnome.org`) Package

To generate a standards-compliant `.shell-extension.zip` bundle ready for upload to [extensions.gnome.org/upload](https://extensions.gnome.org/upload/):

```bash
./pack.sh
```
This creates `app-menu-master@nikolayco.local.shell-extension.zip`.

---

## 📄 License

Distributed under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)**. See [`LICENSE`](LICENSE) for details.
