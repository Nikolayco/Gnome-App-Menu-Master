# GNOME App Menu Master

🌍 **Türkçe | [English](README.md)**

> GNOME 45, 46, 47 ve 48 için hepsi bir arada, hafif ve kararlı **App Grid & Uygulama Menüsü Yöneticisi**.
> Alfabetik sıralama, klasör/liste görünümü, özel ızgara boyutu, sağ tıkla masaüstüne kısayol ekleme, uygulama gizleme, uygulama kaldırma ve **AppImage** klasör izleme özelliklerini tek bir çakışmasız eklentide birleştirir.

Sistem dilinizi otomatik algılar ve **Türkçe** veya **İngilizce** (`tr` / `en`) olarak çalışır.

---

## ✨ Başlıca Özellikler

### 1. Üç Farklı Görünüm Modu (`Görünüm` Sekmesi)
- **Klasörlü / Gruplu Izgara:** Klasör destekli standart GNOME uygulama ızgarası.
- **Gruplamasız Düz Alfabetik Izgara:** Mevcut klasörlerinizi silmeden, klasör içindeki uygulamalar dahil tüm uygulamaları tek bir düz A–Z ızgarada listeler.
- **Alfabetik Liste Görünümü:** Kategori filtre çubuğu (`Tümü`, `İnternet`, `Ofis`, `Geliştirme` vb.), uygulama açıklamaları ve 1–4 sütun desteği sunan modern kaydırılabilir liste görünümü.
- **Özel Izgara Boyutu ve Etiketler:** Ana ızgara satır (2–10) ve sütun (3–12) sayısı, uzun uygulama adlarını iki satırda gösterme, özel yazı tipi boyutu ve sayfa noktalarını gizleme.
- **Üst Panel Hızlı Erişim Simgesi:** Tek tıkla görünüm değiştirmek, sıralamak ve gruplamak için isteğe bağlı üst panel menüsü.

### 2. Türkçe Karakter Duyarlı Akıllı Sıralama (`Sıralama` Sekmesi)
- **A → Z / Z → A / Manuel:** `Intl.Collator` ile Türkçe karakterleri (`Ç, Ğ, İ, Ö, Ş, Ü`) ve sayıları doğru sırada dizilim.
- **Klasörleri En Başa Sabitle:** Klasörleri her zaman uygulama ızgarasının başında tutar.
- **Klasör İçi Sıralama:** Çok sayfalı klasörlerin içindeki uygulamaları sayfa taşması hatası olmadan alfabetik sıralar.
- **Otomatik Sıralama:** Yeni uygulama kurulduğunda veya kaldırıldığında ızgarayı otomatik düzenler.

### 3. Klasör & Kategori Yönetimi (`Klasörler` Sekmesi)
- **Tek Tıkla Otomatik Gruplama:** Yüklü uygulamaları `.desktop` kategorilerine göre (*İnternet, Ofis, Geliştirme, Grafik, Ses ve Video, Oyunlar, Sistem, Araçlar*) otomatik klasörlere ayırır; kendi oluşturduğunuz özel klasörleri korur.
- **Klasör Düzenleyici:** Yeni klasör oluşturma, yeniden adlandırma, silme ve klasör içindeki uygulamaları anahtarlarla seçip kaydetme.

### 4. Sağ Tık Menüsü & Uygulama Gizleme (`Sağ Tık & Gizleme` Sekmesi)
Uygulama simgelerine sağ tıklandığında açılan menüye şu işlevleri ekler:
- **Masaüstüne Kısayol Ekle / Kaldır:** Masaüstüne çalıştırılabilir (`chmod +x` ve `metadata::trusted`) kısayol ekler veya kaldırır.
- **Klasöre Taşı Alt Menüsü:** Uygulamayı doğrudan sağ tık menüsünden istediğiniz klasöre taşır veya ana ızgaraya çıkarır.
- **Menüden Gizle:** Uygulamayı silmeden menüden gizler; Ayarlar içindeki arama destekli **Uygulama Gizleme Yöneticisi** ile istediğiniz zaman geri açabilirsiniz.
- **`.desktop` Konumunu Aç:** Kısayol dosyasının bulunduğu klasörü dosya yöneticisinde açar.
- **Uygulamayı Kaldır:** **APT/DEB** paketlerini (`pkexec apt-get remove`), **Flatpak** uygulamalarını (hem `--user` hem `--system`), **AppImage** paketlerini ve yerel WebApp kısayollarını algılayıp onay penceresiyle kaldırır.

### 5. Dahili AppImage Yöneticisi (`AppImage` Sekmesi)
- **İzlenen Klasör (Monitored Directory):** `~/Applications` (veya seçtiğiniz herhangi bir klasörü) gerçek zamanlı izler.
- **Otomatik Menü Entegrasyonu:** Klasöre atılan `.AppImage` dosyalarına çalıştırma izni verir, içindeki `.desktop` bilgilerini ve ikonları çıkarır ve uygulama menüsüne otomatik ekler (`libfuse2` yoksa otomatik `--appimage-extract-and-run` ekler).
- **Derin İkon Araması (Deep Icon Search):** İkon standart konumda değilse AppImage paketi içinde derinlemesine arama yapar.
- **Paket Listesi:** Algılanan `.AppImage` dosyalarını boyutlarıyla listeler, konumunu açar veya tek tıkla siler.

### 6. JSON Yedekleme & Sıfırlama (`Yedekle & Sıfırla` Sekmesi)
- Tüm eklenti ayarlarını, klasör yapısını ve gizlenen uygulamaları tek bir `.json` dosyasına dışa aktarın veya yedekten geri yükleyin.

---

## 📦 Kurulum

### Yöntem 1: ZIP Paketinden Kurulum
```bash
gnome-extensions install --force app-menu-master@nikolayco.local.shell-extension.zip
gnome-extensions enable app-menu-master@nikolayco.local
```

### Yöntem 2: Kaynak Koddan Kurulum (GitHub)
```bash
git clone https://github.com/Nikolayco/Gnome-App-Menu-Master.git
cd Gnome-App-Menu-Master
./install.sh
```
> **Not:** İlk kurulumda Wayland kullanıyorsanız oturumu kapatıp açın; X11 kullanıyorsanız `Alt+F2` tuşlarına basıp `r` yazarak Enter'a basın.

---

## 🛠️ `extensions.gnome.org` Paketi Oluşturma

[extensions.gnome.org/upload](https://extensions.gnome.org/upload/) adresine doğrudan yüklenmeye hazır `.shell-extension.zip` paketini üretmek için:

```bash
./pack.sh
```

---

## 📄 Lisans

Bu proje **GNU Genel Kamu Lisansı v3.0 veya sonrası (GPL-3.0-or-later)** altında lisanslanmıştır. Ayrıntılar için [`LICENSE`](LICENSE) dosyasına bakın.
