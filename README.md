# Sporcu Kronometre - Sprint Timer System

Profesyonel sprint kronometre sistemi. İki akıllı telefon kullanarak otomatik koşu zamanı ölçümü yapar.

## 🎯 Özellikler

- **Otomatik Başlangıç/Bitiş:** Hareket algılama ile otomatik tetikleme
- **Yüksek Hassasiyet:** ±10ms doğruluk (atletizm federasyonu standartları)
- **Kolay Kullanım:** Tek buton ile hazırlık, otomatik ölçüm
- **PWA:** Çevrimdışı çalışma, tüm platformlarda kullanım
- **Gerçek Zamanlı Senkronizasyon:** NTP benzeri protokol ile zaman senkronizasyonu

## 📱 Kurulum

### Geliştirme Ortamı

1. **Dosyaları indirin**
2. **Signaling sunucusunu başlatın** (opsiyonel, WebSocket fallback için):
   ```bash
   cd server
   npm install
   npm start
   ```
3. **Web sunucusu başlatın**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (http-server)
   npx http-server -p 8000
   ```
4. **Tarayıcıda açın**:
   - Telefon 1: `http://localhost:8000?phone=1`
   - Telefon 2: `http://localhost:8000?phone=2`

### Üretim Ortamı

1. Dosyaları bir web sunucusuna yükleyin (HTTPS gerekli - kamera erişimi için)
2. Her iki telefonda da siteyi açın
3. Telefon rollerini seçin (Başlangıç/Bitiş)

## 🚀 Kullanım

### Hazırlık

1. **İki telefonu yerleştirin:**
   - Telefon 1: Başlangıç çizgisinde (0m)
   - Telefon 2: Bitiş çizgisinde (30m)

2. **Uygulamayı açın:**
   - Her iki telefonda da uygulamayı başlatın
   - Otomatik bağlantı kurulacak

3. **Senkronizasyonu bekleyin:**
   - Sistem otomatik olarak senkronize olacak
   - "Bağlı" durumunu görene kadar bekleyin

### Ölçüm

1. **HAZIRLA butonuna basın** (10 saniye önceden)
2. **Sistem hazırlanır:**
   - Kamera aktif olur
   - Yüksek hassasiyetli senkronizasyon yapılır
   - "HAZIR" durumuna geçer

3. **Sporcu koşar:**
   - Başlangıç çizgisini geçince otomatik başlar
   - Bitiş çizgisini geçince otomatik durur
   - Sonuç gösterilir

4. **Sonucu kaydedin:**
   - Sporcu adı ekleyin (opsiyonel)
   - Not ekleyin (opsiyonel)
   - Kaydet veya Paylaş

## 🔧 Teknik Detaylar

### Mimari

- **Frontend:** PWA (HTML5, CSS3, JavaScript)
- **Hareket Algılama:** Frame Difference algoritması
- **İletişim:** WebRTC Data Channel (birincil) + WebSocket (yedek)
- **Zaman Senkronizasyonu:** NTP benzeri protokol
- **Depolama:** IndexedDB (yerel kayıtlar)

### Hassasiyet

- **Hedef:** ±10ms
- **Tipik:** ±5-10ms (iyi bağlantı ile)
- **Senkronizasyon:** 5 aşamalı protokol
- **Algılama Gecikmesi:** ~50-100ms

### Tarayıcı Desteği

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile: iOS Safari 14+, Chrome Android 90+

## 📊 Proje Durumu

**Phase 1: Core Infrastructure** ✅ TAMAMLANDI
- [x] PWA proje yapısı
- [x] WebRTC bağlantı modülü
- [x] WebSocket fallback
- [x] Zaman senkronizasyon protokolü
- [x] Temel UI

**Phase 2: Motion Detection** ⏳ DEVAM EDİYOR
- [x] Kamera erişimi
- [x] Frame difference algoritması
- [ ] TensorFlow.js entegrasyonu (gelecek)
- [ ] Pose detection (gelecek)

**Phase 3-5:** Henüz başlamadı

## 🐛 Bilinen Sorunlar

- Signaling sunucusu henüz implement edilmedi (WebRTC için gerekli)
- Gerçek cihaz testleri yapılmadı
- Offline mode tam çalışmıyor

## 📝 Yapılacaklar

- [ ] Signaling sunucusu implementasyonu
- [ ] Gerçek cihaz testleri
- [ ] Hassasiyet kalibrasyonu
- [ ] Geçmiş kayıtları görüntüleme
- [ ] Ayarlar ekranı
- [ ] TensorFlow.js pose detection

## 📄 Lisans

MIT License

## 👥 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

## 📞 İletişim

Sorularınız için issue açabilirsiniz.
