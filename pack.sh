#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/2] Compiling GSettings schema..."
glib-compile-schemas "$SCRIPT_DIR/schemas"

echo "[2/2] Building extensions.gnome.org package..."
rm -f app-menu-master@nikolayco.local.shell-extension.zip
gnome-extensions pack "$SCRIPT_DIR" \
    --force \
    --extra-source="src" \
    --out-dir="$SCRIPT_DIR"

echo ""
echo "✅ Package ready for https://extensions.gnome.org/upload/ :"
ls -lh "$SCRIPT_DIR/app-menu-master@nikolayco.local.shell-extension.zip"
