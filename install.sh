#!/usr/bin/env bash
set -euo pipefail

UUID="app-menu-master@nikolayco.local"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"
TARGET_DIR="$EXT_DIR/$UUID"

echo "[1/3] GSettings şeması derleniyor..."
glib-compile-schemas "$SCRIPT_DIR/schemas"

echo "[2/3] Eklenti kuruluyor: $TARGET_DIR"
mkdir -p "$EXT_DIR"
if [ -L "$TARGET_DIR" ] || [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi
ln -s "$SCRIPT_DIR" "$TARGET_DIR"

echo "[3/3] Eklenti etkinleştiriliyor..."
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions enable "$UUID" || true
fi

echo ""
echo "Kurulum tamamlandı!"
echo "Ayarları açmak için: gnome-extensions prefs $UUID"
echo "Wayland üzerinde güvenli test için:"
echo "  dbus-run-session -- gnome-shell --nested --wayland"
echo ""
echo "Not: Mevcut oturumunuzda eklentinin tam yüklenmesi için oturumu kapatıp açmanız (Wayland) veya Alt+F2 -> r (X11) yapmanız gerekebilir."
