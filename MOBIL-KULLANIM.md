# 📱 Sporcu Kronometre - Mobil Kullanım Rehberi

## 🎯 Gereksinimler

- **2 Akıllı Telefon** (Android veya iOS)
- **1 Bilgisayar** (signaling sunucusu için)
- **WiFi Ağı** (tüm cihazlar aynı ağda olmalı)
- **2 Tripod** (telefonları sabitlemek için)

---

## 🚀 Kurulum Adımları

### 1. Bilgisayarda Sunucuları Başlatın

```bash
# Terminal 1: Web Sunucusu
cd c:\Users\comma\Desktop\kronometre
python -m http.server 8000

# Terminal 2: Signaling Sunucusu
cd c:\Users\comma\Desktop\kronometre\server
node server.js
```

### 2. Bilgisayarın IP Adresini Öğrenin

**Windows:**
```bash
ipconfig
```

**Örnek Çıktı:**
```
IPv4 Address: 192.168.1.100
```

Bu IP adresini not edin!

### 3. Telefonlarda Uygulamayı Açın

**Her iki telefonda da:**

1. **Tarayıcıyı açın** (Chrome veya Safari)
2. **Adres çubuğuna yazın:**
   ```
   http://192.168.1.100:8000
   ```
   (192.168.1.100 yerine kendi IP adresinizi yazın)

3. **Kamera izni verin** (sorulduğunda)

---

## 🎮 Kullanım Adımları

### Adım 1: Telefon Rollerini Seçin

**Telefon 1:**
- "Telefon 1 - Başlangıç Çizgisi (0m)" butonuna basın
- Bağlantı otomatik kurulacak

**Telefon 2:**
- "Telefon 2 - Bitiş Çizgisi (30m)" butonuna basın
- Bağlantı otomatik kurulacak

### Adım 2: Telefonları Yerleştirin

1. **Telefon 1'i başlangıç çizgisine** (0m) yerleştirin
   - Tripod kullanın
   - Kamera çizgiye bakmalı
   - Yükseklik: ~1 metre

2. **Telefon 2'yi bitiş çizgisine** (30m) yerleştirin
   - Tripod kullanın
   - Kamera çizgiye bakmalı
   - Yükseklik: ~1 metre

### Adım 3: Sistemi Hazırlayın

1. **Her iki telefonda da "HAZIRLA" butonuna basın**
   - 10 saniye geri sayım başlayacak
   - Kameralar aktif olacak
   - Sistem kalibre edilecek

2. **"HAZIR 🟢" durumunu bekleyin**
   - Sarı çizgi görünecek
   - Ekranda "🔒 Ekran Aktif" yazısı olacak
   - Sistem hazır!

### Adım 4: Koşuyu Başlatın

1. **Sporcu başlangıç çizgisine gelsin**
2. **Sporcu koşmaya başlasın**
   - Telefon 1 otomatik algılayacak → START
   - Telefon 2'de zamanlayıcı başlayacak
3. **Sporcu bitiş çizgisini geçsin**
   - Telefon 2 otomatik algılayacak → STOP
   - Sonuç her iki telefonda da gösterilecek

### Adım 5: Sonucu Kaydedin

1. **Sporcu adını girin** (opsiyonel)
2. **Not ekleyin** (opsiyonel)
3. **"Kaydet" butonuna basın**
4. **"Yeni Koşu" ile devam edin**

---

## 🔧 Sorun Giderme

### Telefon Bağlanamıyor

**Çözüm 1:** IP adresini kontrol edin
- Bilgisayar ve telefonlar aynı WiFi'de mi?
- IP adresi doğru mu?

**Çözüm 2:** Firewall'u kapatın
- Windows Firewall'da port 8000 ve 3000'i açın

**Çözüm 3:** Sunucuları yeniden başlatın
- Her iki sunucuyu da kapatıp tekrar başlatın

### Kamera Açılmıyor

**Çözüm 1:** İzinleri kontrol edin
- Tarayıcı ayarlarından kamera iznini verin

**Çözüm 2:** HTTPS kullanın
- Localhost dışında HTTPS gerekli
- Geliştirme için HTTP yeterli

### Hareket Algılanmıyor

**Çözüm 1:** Aydınlatmayı iyileştirin
- Kamera net görmeli
- Gölge olmamalı

**Çözüm 2:** Kamera açısını ayarlayın
- Kamera çizgiye dik olmalı
- Yükseklik: 1-1.5 metre

**Çözüm 3:** Daha hızlı hareket edin
- Yavaş hareket algılanmayabilir

### Ekran Kapanıyor

**Çözüm:** Wake Lock aktif mi?
- "🔒 Ekran Aktif" yazısını görüyor musunuz?
- Görmüyorsanız tarayıcı Wake Lock API'yi desteklemiyor
- Telefon ayarlarından "Ekran zaman aşımı"nı uzatın

---

## 📊 İpuçları

### Daha İyi Hassasiyet İçin

1. **Sabit Bağlantı:** WiFi kullanın (5GHz tercih edilir)
2. **Yakın Mesafe:** Router'a yakın olun
3. **İyi Aydınlatma:** Gün ışığı ideal
4. **Sabit Konum:** Tripod şart
5. **Hazırlık Süresi:** HAZIRLA'ya erken basın

### Pil Tasarrufu

1. **Şarj Cihazı:** Uzun kullanım için şarj cihazı bağlayın
2. **Ekran Parlaklığı:** Orta seviyede tutun
3. **Arka Plan Uygulamaları:** Kapatın

### Güvenlik

1. **Telefon Sabitleme:** Tripod kullanın, düşmesin
2. **Güneş Işığı:** Telefon aşırı ısınmasın
3. **Yedekleme:** Sonuçları düzenli kaydedin

---

## 🎯 Örnek Senaryo

### Atletizm Antrenmanı

**Ekipman:**
- 2x iPhone (veya Android)
- 2x Tripod
- 1x Laptop (WiFi hotspot)
- 30m mesafe işaretleri

**Kurulum:**
1. Laptop'ta hotspot aç
2. Sunucuları başlat
3. Telefonları bağla ve yerleştir
4. Sistemi hazırla

**Kullanım:**
1. Sporcu 1 koşar → Sonuç: 4.35s
2. Kaydet
3. Sporcu 2 koşar → Sonuç: 4.52s
4. Kaydet
5. Devam et...

**Sonuç:**
- 10 sporcunun zamanı kaydedildi
- Ortalama: 4.48s
- En iyi: 4.35s

---

## 📱 Desteklenen Tarayıcılar

### Android
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Samsung Internet 14+

### iOS
- ✅ Safari 14+
- ✅ Chrome 90+ (iOS)

---

## 🆘 Destek

Sorun yaşıyorsanız:
1. README.md dosyasını okuyun
2. BASLANGIC.md dosyasını okuyun
3. Tarayıcı konsolunu kontrol edin (F12)
4. Hata mesajlarını not edin

---

## 🎉 Başarılar!

Artık profesyonel sprint ölçümü yapabilirsiniz!

**İyi koşular!** 🏃‍♂️💨
