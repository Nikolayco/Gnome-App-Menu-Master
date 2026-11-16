#!/usr/bin/env bash
set -euo pipefail

UUID="app-menu-master@nikolayco.local"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"
TARGET_DIR="$EXT_DIR/$UUID"

echo "[1/3] Compiling GSettings schema / GSettings şeması derleniyor..."
glib-compile-schemas "$SCRIPT_DIR/schemas"

echo "[2/3] Installing extension to / Eklenti kuruluyor: $TARGET_DIR"
mkdir -p "$EXT_DIR"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR/schemas" "$TARGET_DIR/src"

cp "$SCRIPT_DIR/metadata.json" "$SCRIPT_DIR/extension.js" "$SCRIPT_DIR/prefs.js" "$SCRIPT_DIR/stylesheet.css" "$TARGET_DIR/"
cp "$SCRIPT_DIR/schemas/"*.xml "$SCRIPT_DIR/schemas/gschemas.compiled" "$TARGET_DIR/schemas/"
cp "$SCRIPT_DIR/src/"*.js "$TARGET_DIR/src/"

echo "[3/3] Adding extension to enabled-extensions / Etkin eklentilere ekleniyor..."
python3 - "$UUID" << 'PYEOF'
import subprocess, sys, ast

uuid = sys.argv[1]

def get_list(key):
    out = subprocess.check_output(['gsettings', 'get', 'org.gnome.shell', key], text=True).strip()
    if out.startswith('@as '):
        out = out[4:].strip()
    try:
        return list(ast.literal_eval(out))
    except Exception:
        return []

def set_list(key, arr):
    subprocess.check_call(['gsettings', 'set', 'org.gnome.shell', key, str(arr)])

enabled = get_list('enabled-extensions')
if uuid not in enabled:
    enabled.append(uuid)
    set_list('enabled-extensions', enabled)

disabled = get_list('disabled-extensions')
if uuid in disabled:
    disabled = [x for x in disabled if x != uuid]
    set_list('disabled-extensions', disabled)
PYEOF

if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions enable "$UUID" >/dev/null 2>&1 || true
fi

echo ""
echo "✅ Installation complete! / Kurulum tamamlandı!"
echo "👉 If this is a fresh install, reload GNOME Shell once so it detects the new folder:"
echo "   - X11: Press Alt+F2, type 'r', and press Enter."
echo "   - Wayland: Log out and log back in."
echo "👉 Open Preferences / Ayarları açmak için: gnome-extensions prefs $UUID"
