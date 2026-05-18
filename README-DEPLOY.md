# Sprint Timer - Render.com Deploy

## 🚀 Render.com'a Deploy Adımları

### 1. GitHub'a Yükle

```bash
cd c:\Users\comma\Desktop\kronometre
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/sprint-timer.git
git push -u origin main
```

### 2. Render.com'da Proje Oluştur

1. https://render.com adresine git
2. "Sign Up" ile üye ol (GitHub ile giriş yap)
3. "New +" → "Web Service" seç
4. GitHub repo'nu bağla
5. Ayarlar:
   - **Name:** sprint-timer
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

6. "Create Web Service" bas

### 3. Deploy Tamamlandı!

URL: `https://sprint-timer.onrender.com`

### 4. Telefondan Kullan

1. Tarayıcıda aç: `https://sprint-timer.onrender.com`
2. "Ana ekrana ekle" (PWA)
3. Kullanmaya başla!

## 📱 Kullanım

**Start Telefonu:**
- "Start Telefonu" seç
- QR kod gösterilir

**Finish Telefonu:**
- "Finish Telefonu" seç
- QR'ı tara veya kodu gir
- Bağlan!

## ⚙️ Ayarlar

**Custom Domain (Ücretli):**
- Render Dashboard → Settings → Custom Domain
- Alan adınızı ekle

**Environment Variables:**
- PORT: Otomatik (Render ayarlar)

## 🐛 Sorun Giderme

**Server uyuyor:**
- İlk istek 30 saniye sürebilir (cold start)
- Ücretli plan ile çözülür

**HTTPS hatası:**
- Render otomatik HTTPS sağlar
- Kamera için gerekli

## 📞 Destek

Sorun olursa: [GitHub Issues](https://github.com/KULLANICI_ADI/sprint-timer/issues)
