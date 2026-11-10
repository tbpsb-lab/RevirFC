# ⚽ RevirFC 27 - Kapalı Devre Halı Saha Kulüp Ekosistemi

EA Sports FC 27 tarzı dinamik oyuncu kartları, $C(11,5) = 462$ kombinasyonlu kadro dengeleme algoritması, anti-trol 360° maç karnesi ve sosyal soyunma odası ile 20 kişilik kemik kadro için tasarlanmış uçtan uca dijital halı saha platformu.

---

## 🌟 Öne Çıkan Özellikler

### 1. 🛡️ Kapalı Kulüp Girişi & Soyunma Odası Güvenliği (Auth & RBAC)
- **Onay Kapısı (Approval Gate):** Dışarıdan kayıt olan kullanıcılar `pending` (onay bekliyor) ekranına düşer. İçerideki maçlar, kartlar veya fotoğraflar yönetici onayı olmadan görüntülenemez.
- **Profil Eşleştirme (Claim Player Profile):** Yönetici yeni bir üyeyi onaylarken sistemdeki 20 oyuncu kartından biriyle eşleştirir.
- **3 Kademeli Yetki:** Yönetici (Admin), Kaptan (Organizatör), Oyuncu (Üye).

### 2. 🎴 EA Sports FC 27 Tarzı Dinamik Oyuncu Kartları
- **6 Temel Halı Saha Metriği:** PAC (Kondisyon), SHO (Bitiricilik), PAS (Oyun Kurma), DRI (Dar Alan Tekniği), DEF (Kademe), PHY (İkili Mücadele & Direnç).
- **Dinamik Kart Temaları:**
  - 🥇 **Altın Nadir (Gold Rare):** Standart kart.
  - 🏆 **TOTW (Siyah-Altın):** Geçen maçın MVP'si o hafta sahaya siyah parlayan kartla çıkar.
  - 🔥 **In-Form (Alevli):** Son 3 maçta reytingi sürekli yükselen oyuncular.
  - 🩹 **Revir Kartı (Bandaj İkonlu):** "Hafif Sakat" bildirimi yapan oyuncunun kartında sargı rozeti ve revir teması belirir.
- **PlayStyles+ Rozetleri:** Ciğersiz (relentless), Balyoz (power_shot), Ahtapot (octopus), Beton Duvar (wall), İleride Bekleyen (poacher), Maestro, Ayak Tenisçisi.

### 3. 📋 Maç Öncesi "Akıllı Check-In" & Revir Bildirimi
- **3 Saniyelik Check-In:**
  - 🟢 **%100 Hazırım:** 1.00x normal güç.
  - 🩹 **Hafif Sakatlık / Kas Çekmesi:** PAC -%25, OVR -%10, otomatik az koşturan rol (stoper / kaleci).
  - 🟠 **Yorgun / Nöbet-Mesai:** PAC -%15, iki takıma birden yorgun oyuncu yığılmasını engelleyen filtre.
  - 🔥 **Ekstra Formda:** PAC +%5 tempo çarpanı.
- **Akıllı Yedek Kulübesi:** İlk 12 kişi asil kadroya girer; 13. ve 14. kişiler sırayla yedeğe yazılır. Asilden biri "Sakatlandım" derse 1. yedek anında asile geçer.

### 4. 🧠 462 Kombinasyonlu Dengeleme Motoru & Görsel Halı Saha Tahtası
- 12 oyuncuyu 6'ya 6 iki takıma ayırmak için $C(11, 5) = 462$ olası kadro kombinasyonunu saniyeler içinde simüle eder.
- Takımların efektif OVR farkını, mevki dağılımını (1 GK, 2 DEF, 2 MID, 1 FWD) ve revir/yorgunluk dengesini optimize eder.
- **WhatsApp'a Gönder:** Yeşil zemindeki taktik diziliş tek tıkla yüksek çözünürlüklü PNG olarak indirilir.

### 5. 📊 360° Maç Sonu Puanlama & Üstel Hareketli Ortalama (EMA)
- **Anti-Trol Trimmed Mean:** Bir oyuncuya verilen en yüksek ve en düşük 1 oy hesaplama dışı bırakılır.
- **Ağırlıklı Ortalama:** %50 Rakip Takım, %40 Takım Arkadaşı, %10 Kendi Öz Puanı.
- **EMA Reyting Güncellemesi:**
  $$OVR_{yeni} = Round(0.85 \times OVR_{eski} + 0.15 \times P_{maç\_100})$$
- **Öz Algı vs. Saha Gerçeği:** Kendine yüksek verip sahadan düşük puan alanlara *"Özgüven Patlaması 🚀"*, mütevazı kalanlara *"Gizli Kahraman 🛡️"* rozeti.

### 6. 🗣️ Sosyal Soyunma Odası & Fotoğraf Arşivi
- **Haftanın Manşeti:** En çok tepki alan yorum ana sayfada sabitlenir.
- **Halı Saha Tepkileri:** 🔥 (Alev), 😂 (Kahkaha), 🎻 (Ağlama Duvarı), 🚑 (Revir), 🐐 (GOAT).
- **Anonim Soyunma Odası Fısıltısı 🕵️:** Açık isim veya gizli yorum paylaşımı.
- **İstemci Tarafı WebP Sıkıştırma:** 8 MB'lık fotoğraflar tarayıcıda ~180 KB'a sıkıştırılır.
- **Oyuncu Etiketleme:** Fotoğraflar etiketlenen oyuncunun profiline otomatik işlenir.
- **Kulüp Kasası / Tatlı & Çay Çetelesi:** Günün Bidonu seçilenlerin baklava borçları takip edilir.

---

## 🚀 Kurulum ve Başlatma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi
npm run build
```

---

## 🔥 Firebase Bağlantısı

Proje kökünde `.env` dosyası oluşturup Firebase console ayarlarınızı yapıştırın:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=revir-fc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=revir-fc
VITE_FIREBASE_STORAGE_BUCKET=revir-fc.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Not:** Firebase anahtarları girilmediğinde sistem otomatik olarak **Yerel Hibrit Demo Modu**'nda çalışır; tüm kartlar, oylamalar, taktik tahtası ve test kullanıcıları anında deneyimlenebilir.
