import GLib from 'gi://GLib';

const TR_STRINGS = {
    // View Modes & Panel Menu
    'View: Folder Grid': 'Görünüm: Klasörlü Izgara',
    'View: Flat Grid': 'Görünüm: Düz Izgara',
    'View: List': 'Görünüm: Liste',
    'Sort Alphabetically Now': 'Şimdi Alfabetik Sırala',
    'Auto-Categorize Folders': 'Klasörleri Otomatik Kategorize Et',
    'Extension Settings...': 'Eklenti Ayarları...',
    '%d category folders updated.': '%d kategori klasörü güncellendi.',
    'All': 'Tümü',

    // Default Category Folder Names
    'Internet': 'İnternet',
    'Office': 'Ofis',
    'Development': 'Geliştirme',
    'Graphics': 'Grafik',
    'Sound & Video': 'Ses ve Video',
    'Games': 'Oyunlar',
    'System': 'Sistem',
    'Utilities': 'Araçlar',
    'folder': 'klasor',

    // Context Menu & Dialogs
    'Uninstall %s?': '%s kaldırılsın mı?',
    'Cancel': 'İptal',
    'Uninstall': 'Kaldır',
    'Remove Desktop Shortcut': 'Masaüstünden Kısayolu Kaldır',
    'Add Desktop Shortcut': 'Masaüstüne Kısayol Ekle',
    'Move to Folder': 'Klasöre Taşı',
    'Remove from Folder (Main Grid)': 'Klasörden Çıkar (Ana Izgara)',
    'No folders yet': 'Henüz klasör yok',
    'Hide from Menu': 'Menüden Gizle',
    '%s hidden from menu. You can restore it in Settings.': '%s menüden gizlendi. Ayarlardan geri açabilirsiniz.',
    'Open .desktop Location': '.desktop Konumunu Aç',
    'Could not open location: %s': 'Konum açılamadı: %s',
    'Uninstall Application...': 'Uygulamayı Kaldır...',
    'Could not find .desktop file for this application.': 'Uygulamanın .desktop dosyası bulunamadı.',
    '%s added to desktop.': '%s masaüstüne eklendi.',
    'Failed to add desktop shortcut: %s': 'Masaüstü kısayolu eklenemedi: %s',
    '%s desktop shortcut removed.': '%s masaüstü kısayolu kaldırıldı.',
    'Failed to remove shortcut: %s': 'Kısayol kaldırılamadı: %s',
    'Could not open Software Center.': 'Yazılım Merkezi açılamadı.',
    'This Flatpak application (%s) will be permanently removed from your system.': 'Bu Flatpak uygulaması (%s) sistemden kalıcı olarak kaldırılacak.',
    'Uninstalling %s...': '%s kaldırılıyor...',
    '%s was successfully uninstalled.': '%s başarıyla kaldırıldı.',
    'Uninstall failed: %s': 'Kaldırma başarısız: %s',
    'System package "%s" (APT) will be removed. Administrator password will be required.': '"%s" sistem paketi (APT) kaldırılacak. Yönetici parolası istenecektir.',
    'Uninstalling package %s...': '%s paketi kaldırılıyor...',
    '%s (%s) was successfully uninstalled.': '%s (%s) başarıyla kaldırıldı.',
    'Uninstall cancelled or failed: %s': 'Kaldırma iptal edildi veya başarısız: %s',
    'This AppImage application (%s) and its menu shortcut will be deleted.': 'Bu AppImage uygulaması (%s) ve menü kısayolu silinecek.',
    'This user application / shortcut (%s) will be permanently deleted from the menu.': 'Bu kullanıcı uygulaması / kısayolu (%s) menüden kalıcı olarak silinecek.',
    '%s was removed.': '%s kaldırıldı.',
    'Could not delete: %s': 'Silinemedi: %s',
    'Could not detect automatic uninstall source for %s.': '%s için otomatik kaldırma kaynağı tespit edilemedi.',

    // Preferences - View Page
    'View': 'Görünüm',
    'Menu and Application View': 'Menü ve Uygulama Görünümü',
    'Choose how applications are listed in the App Grid.': 'Uygulamaların App Grid üzerinde nasıl listeleneceğini seçin.',
    'Folder / Grouped Grid': 'Klasörlü / Gruplu Izgara',
    'Ungrouped Flat Alphabetical Grid': 'Gruplamasız Düz Alfabetik Izgara',
    'List View (Alphabetical)': 'Liste Görünümü (Alfabetik)',
    'View Mode': 'Görünüm Modu',
    'List View Columns': 'Liste Görünümü Sütun Sayısı',
    'Number of columns shown in list mode': 'Liste modundayken kaç sütun gösterileceği',
    'Show Application Descriptions in List View': 'Liste Görünümünde Açıklama Göster',
    'Hide Page Indicators (Dots)': 'Sayfa Göstergelerini (Noktaları) Gizle',
    'Show Quick Access Icon in Top Panel': 'Üst Panelde Hızlı Erişim Simgesi Göster',
    'Adds a menu to switch views and sort with one click': 'Görünüm değiştirme ve tek tıkla sıralama menüsü ekler',
    'Grid Size and Labels': 'Izgara Boyutu ve Etiketler',
    'Use Custom Grid Size': 'Özel Izgara Boyutu Kullan',
    'Main Grid Rows': 'Ana Izgara Satır Sayısı',
    'Main Grid Columns': 'Ana Izgara Sütun Sayısı',
    'Icon Size (List Mode)': 'İkon Boyutu (Liste Modu)',
    '0 = Default': '0 = Varsayılan',
    'Label Font Size (pt)': 'Etiket Yazı Boyutu (pt)',
    'Show Long Application Names on Two Lines': 'Uzun Uygulama Adlarını İki Satırda Göster',

    // Preferences - Sort Page
    'Sorting': 'Sıralama',
    'Alphabetical and Smart Sorting': 'Alfabetik ve Akıllı Sıralama',
    'Locale-aware alphabetical sorting and automatic arrangement settings.': 'Türkçe karakter duyarlı sıralama ve otomatik düzenleme ayarları.',
    'Alphabetical (A → Z)': 'Alfabetik (A → Z)',
    'Reverse Alphabetical (Z → A)': 'Ters Alfabetik (Z → A)',
    'Manual (Auto-Sort Disabled)': 'Manuel (Otomatik Sıralama Kapalı)',
    'Sorting Method': 'Sıralama Yöntemi',
    'Always Pin Folders First': 'Klasörleri Her Zaman En Başa Sabitle',
    'Show Uncategorized Apps (Web Apps, etc.) Last': 'Kategorisiz Uygulamaları (Web App vb.) En Sonda Göster',
    'Apps without a category are placed at the end in folder view': 'Herhangi bir kategoriye girmeyen uygulamalar klasörlü görünümde en sona yerleştirilir',
    'Also Sort Apps Inside Folders': 'Klasör İçindeki Uygulamaları da Sırala',
    'Auto-Sort When Apps Are Installed or Removed': 'Yeni Uygulama Kurulduğunda Otomatik Sırala',
    'Sort Now': 'Şimdi Sırala',
    'Immediately rearranges the main grid and folder contents': 'Tüm ana ızgarayı ve klasör içlerini anında yeniden düzenler',
    'Applications sorted.': 'Uygulamalar sıralandı.',

    // Preferences - Folders Page
    'Folders': 'Klasörler',
    'Automatic Grouping by Category': 'Türe Göre Otomatik Gruplama',
    'Groups applications by .desktop categories (Internet, Office, Development, Graphics, Sound & Video, Games, System, Utilities).': 'Uygulamaları .desktop kategorilerine göre (İnternet, Ofis, Geliştirme, Grafik, Ses/Video, Oyunlar, Sistem, Araçlar) gruplar.',
    'Auto-Group Newly Installed Applications': 'Yeni Uygulamaları Otomatik Türüne Göre Grupla',
    'Automatically adds newly installed apps to their matching category folder': 'Yeni bir program kurulduğunda ilgili kategori klasörüne otomatik eklenir',
    'Group All Applications by Category Now': 'Tüm Uygulamaları Şimdi Türlerine Göre Grupla',
    'Scans installed applications and creates/updates category folders': 'Yüklü uygulamaları tarar ve kategori klasörlerini oluşturur/günceller',
    'Auto-Group': 'Otomatik Grupla',
    '%d category folders updated (%d apps grouped).': '%d kategori klasörü oluşturuldu (%d uygulama gruplandı).',
    'Ungroup and Show Flat Alphabetical': 'Gruplamadan Çıkar ve Alfabetik Göster',
    'Lists all applications A-Z in a flat grid without folders': 'Klasörleri göstermeden tüm uygulamaları A-Z düz ızgarada listeler',
    'Make Flat Alphabetical': 'Düz Alfabetik Yap',
    'Grouping disabled; applications sorted alphabetically.': 'Gruplama kapatıldı, uygulamalar alfabetik sıralandı.',
    'Create New Folder': 'Yeni Klasör Oluştur',
    'Folder Name': 'Klasör Adı',
    'Create Folder': 'Klasör Oluştur',
    'Folder "%s" created.': '"%s" klasörü oluşturuldu.',
    'Existing Folders': 'Mevcut Klasörler',
    'Use the field above to create a folder or click "Auto-Group".': 'Yukarıdan yeni klasör oluşturabilir veya "Otomatik Grupla" butonunu kullanabilirsiniz.',
    '%d apps': '%d uygulama',
    'Edit Apps in Folder': 'Klasördeki Uygulamaları Düzenle',
    'Rename': 'Yeniden Adlandır',
    'Delete Folder': 'Klasörü Sil',
    'Folder "%s" deleted.': '"%s" klasörü silindi.',
    'Rename Folder': 'Klasörü Yeniden Adlandır',
    'Save': 'Kaydet',
    '%s — Applications': '%s — Uygulamalar',

    // Preferences - Context Menu & Hide Page
    'Right-Click & Hide': 'Sağ Tık & Gizleme',
    'Application Right-Click Menu Items': 'Uygulama Sağ Tık Menüsü Öğeleri',
    'Choose which shortcut actions appear when right-clicking application icons.': 'Uygulama simgelerine sağ tıklandığında görünecek kısayol eylemlerini seçin.',
    'Add / Remove Desktop Shortcut': 'Masaüstüne Kısayol Ekle / Kaldır',
    'Move to Folder Submenu': 'Klasöre Taşı Alt Menüsü',
    'Open .desktop File Location': '.desktop Konumunu Aç',
    'Uninstall Application': 'Uygulamayı Kaldır',
    'Automatic (APT / Flatpak / Local)': 'Otomatik (APT / Flatpak / Yerel)',
    'Direct Package Manager (pkexec)': 'Doğrudan Paket Yöneticisi (pkexec)',
    'Open in Software Center': 'Yazılım Merkezinde Aç',
    'Application Uninstall Method': 'Uygulama Kaldırma Yöntemi',
    'Hidden Applications Manager': 'Uygulama Gizleme Yöneticisi',
    'Toggled (active) applications are hidden from the app menu.': 'Açık (aktif) olan uygulamalar menüden gizlenir.',
    'Search applications...': 'Uygulama ara...',

    // Preferences - Backup & Reset Page
    'Backup & Reset': 'Yedekle & Sıfırla',
    'Configuration Backup': 'Yapılandırma Yedekleme',
    'Export or import all extension settings, folders, and hidden apps as JSON.': 'Tüm eklenti ayarlarını, klasörleri ve gizlenen uygulamaları JSON olarak dışa/içe aktarın.',
    'Export Settings and Folders (JSON)': 'Ayarları ve Klasörleri Dışa Aktar (JSON)',
    'Export...': 'Dışa Aktar...',
    'Restore from Backup (JSON)': 'Yedekten Geri Yükle (JSON)',
    'Import...': 'İçe Aktar...',
    'Reset': 'Sıfırlama',
    'Reset to Defaults': 'Varsayılana Sıfırla',
    'Restores all extension settings and App Grid layout to their defaults': 'Tüm eklenti ayarlarını ve App Grid layout düzenini varsayılan haline döndürür',
    'Reset All': 'Sıfırla',
    'All settings and layout reset to defaults.': 'Tüm ayarlar ve düzen sıfırlandı.',
    'Save Backup': 'Yedeği Kaydet',
    'app-menu-master-backup.json': 'app-menu-master-yedek.json',
    'Backup saved successfully.': 'Yedek başarıyla kaydedildi.',
    'Select Backup File': 'Yedek Dosyası Seç',
    'Backup restored successfully.': 'Yedek başarıyla geri yüklendi.',
    'Failed to read backup: %s': 'Yedek okunamadı: %s',

    // Preferences - AppImage Page
    'AppImage': 'AppImage',
    'AppImage Manager': 'AppImage Yöneticisi',
    'Automatically detects .AppImage files in the monitored directory, extracts icons, and creates menu shortcuts.': 'İzlenen klasördeki .AppImage dosyalarını otomatik algılar, ikonlarını çıkarır ve uygulama menüsüne kısayol oluşturur.',
    'Enable AppImage Monitoring': 'AppImage Klasör İzlemeyi Etkinleştir',
    'Automatically integrates .AppImage packages into the application menu': '.AppImage paketlerini uygulama menüsüne otomatik entegre eder',
    'Monitored Directory': 'İzlenen Klasör',
    'Select Monitored Directory': 'İzlenen Klasörü Seçin',
    'Deep Icon Search': 'Derin İkon Araması (Deep Icon Search)',
    'Search deeper inside the AppImage package if icons are not in standard locations': 'İkonlar standart konumda değilse AppImage paketi içinde derinlemesine arama yap',
    'Rescan Directory Now': 'Klasörü Şimdi Yeniden Tara',
    'Re-checks all .AppImage files in the monitored folder and updates shortcuts': 'İzlenen klasördeki tüm .AppImage dosyalarını yeniden tarar ve kısayolları günceller',
    'Rescan Now': 'Şimdi Tara',
    'AppImage directory scan triggered.': 'AppImage klasör taraması başlatıldı.',
    'Detected AppImage Packages': 'Algılanan AppImage Paketleri',
    'No .AppImage files found in the monitored directory.': 'İzlenen klasörde henüz .AppImage dosyası bulunamadı.',
    'Delete AppImage': 'AppImage Dosyasını Sil',
    '%s deleted.': '%s silindi.',
};

export function isTurkishLocale() {
    try {
        const langs = GLib.get_language_names();
        return langs.some(l => l.toLowerCase().startsWith('tr'));
    } catch (_e) {
        return false;
    }
}

export function getCollator() {
    const locale = isTurkishLocale() ? 'tr' : undefined;
    return new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
}

export function t(msgid, ...args) {
    let str = (isTurkishLocale() && TR_STRINGS[msgid]) ? TR_STRINGS[msgid] : msgid;
    if (args.length > 0) {
        let idx = 0;
        str = str.replace(/%[sd]/g, () => {
            const val = args[idx++];
            return val !== undefined ? String(val) : '';
        });
    }
    return str;
}
