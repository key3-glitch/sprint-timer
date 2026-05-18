# 🚀 Sporcu Kronometre - Başlangıç Rehberi

## ⚡ Hızlı Başlangıç

### 1. Sunucuyu Başlatın (Opsiyonel)

Signaling sunucusu WebRTC bağlantısı için gereklidir. Eğer sadece WebSocket kullanacaksanız bu adımı atlayabilirsiniz.

```bash
cd server
npm install
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacak.

### 2. Web Sunucusu Başlatın

Kamera erişimi için HTTPS veya localhost gereklidir.

**Python ile:**
```bash
python -m http.server 8000
```

**Node.js ile:**
```bash
npx http-server -p 8000
```

**VS Code Live Server ile:**
- index.html'e sağ tıklayın
- "Open with Live Server" seçin

### 3. Tarayıcıda Açın

**Telefon 1 (Başlangıç Çizgisi - 0m):**
```
http://localhost:8000?phone=1
```

**Telefon 2 (Bitiş Çizgisi - 30m):**
```
http://localhost:8000?phone=2
```

> **Not:** Gerçek cihazlarda test etmek için bilgisayarınızın IP adresini kullanın:
> `http://192.168.1.100:8000?phone=1`

## 📱 Kullanım Adımları

### Hazırlık

1. **İki telefonu yerleştirin:**
   - Telefon 1: Başlangıç çizgisinde (0m)
   - Telefon 2: Bitiş çizgisinde (30m)
   - Telefonları sabit bir yere koyun (tripod önerilir)

2. **Uygulamayı açın:**
   - Her iki telefonda da yukarıdaki URL'leri açın
   - Kamera izni verin
   - Bağlantı otomatik kurulacak

3. **Bağlantıyı kontrol edin:**
   - "Bağlı ✓" durumunu görmelisiniz
   - Senkronizasyon hassasiyetini kontrol edin (±10ms ideal)

### Ölçüm

1. **HAZIRLA butonuna basın** (koşudan 10 saniye önce)
   - Sistem 10 saniye geri sayım yapacak
   - Kamera aktif olacak
   - Yüksek hassasiyetli senkronizasyon yapılacak

2. **"HAZIR 🟢" durumunu bekleyin**
   - Kamera önizlemesinde sarı çizgiyi göreceksiniz
   - Bu çizgi algılama bölgesidir
   - Sporcu bu çizgiyi geçince otomatik başlar

3. **Sporcu koşsun!**
   - Başlangıç çizgisini geçince otomatik başlar
   - Bitiş çizgisini geçince otomatik durur
   - Sonuç her iki telefonda da gösterilir

4. **Sonucu kaydedin:**
   - Sporcu adı ekleyin (opsiyonel)
   - Not ekleyin (opsiyonel)
   - "Kaydet" veya "Paylaş" butonuna basın

## 🔧 Sorun Giderme

### Kamera Açılmıyor

- **Çözüm 1:** Tarayıcı izinlerini kontrol edin
- **Çözüm 2:** HTTPS veya localhost kullandığınızdan emin olun
- **Çözüm 3:** Tarayıcıyı yeniden başlatın

### Bağlantı Kurulamıyor

- **Çözüm 1:** Her iki telefon da aynı WiFi ağında olmalı
- **Çözüm 2:** Signaling sunucusunun çalıştığından emin olun
- **Çözüm 3:** Firewall ayarlarını kontrol edin

### Hareket Algılanmıyor

- **Çözüm 1:** Kameranın çizgiyi net görebildiğinden emin olun
- **Çözüm 2:** Aydınlatmayı iyileştirin
- **Çözüm 3:** Algılama hassasiyetini ayarlayın (gelecek özellik)

### Zaman Hassasiyeti Düşük (>20ms)

- **Çözüm 1:** İnternet bağlantısını kontrol edin
- **Çözüm 2:** Diğer uygulamaları kapatın
- **Çözüm 3:** HAZIRLA butonuna tekrar basın (yeniden senkronize eder)

## 📊 Sistem Gereksinimleri

### Minimum

- **Tarayıcı:** Chrome 90+, Safari 14+, Firefox 88+
- **İşletim Sistemi:** iOS 14+, Android 8+, Windows 10+
- **Kamera:** 15 FPS, 480p
- **İnternet:** 1 Mbps (WiFi önerilir)

### Önerilen

- **Tarayıcı:** Chrome 100+, Safari 15+
- **İşletim Sistemi:** iOS 15+, Android 11+
- **Kamera:** 30 FPS, 720p
- **İnternet:** 5 Mbps WiFi
- **Donanım:** Tripod veya telefon tutucu

## 🎯 İpuçları

### Daha İyi Hassasiyet İçin

1. **Sabit Bağlantı:** WiFi kullanın, mobil veri yerine
2. **Yakın Mesafe:** Telefonlar birbirine ne kadar yakınsa o kadar iyi
3. **İyi Aydınlatma:** Kameranın net görmesi önemli
4. **Sabit Konum:** Telefonları tripod ile sabitleyin
5. **Hazırlık Süresi:** HAZIRLA butonuna erken basın (10 saniye önceden)

### Daha İyi Algılama İçin

1. **Çizgi Konumu:** Sarı çizgiyi sporcunun geçeceği yere ayarlayın
2. **Kamera Açısı:** Kamera yere paralel olmalı
3. **Arka Plan:** Sade arka plan daha iyi algılama sağlar
4. **Mesafe:** Kamera 2-3 metre uzakta olmalı

## 📝 Notlar

- **İlk Kullanım:** İlk bağlantı 5-10 saniye sürebilir
- **Pil Tüketimi:** Kamera kullanımı pili hızlı tüketir, şarj cihazı öneririz
- **Veri Kullanımı:** Minimal veri kullanır (~1 MB/saat)
- **Offline Mod:** Henüz tam desteklenmiyor

## 🆘 Yardım

Sorun yaşıyorsanız:

1. README.md dosyasını okuyun
2. Tarayıcı konsolunu kontrol edin (F12)
3. GitHub'da issue açın
4. Detaylı hata mesajlarını paylaşın

## 🎉 Başarılar!

Artık profesyonel sprint ölçümü yapabilirsiniz. İyi koşular! 🏃‍♂️💨
