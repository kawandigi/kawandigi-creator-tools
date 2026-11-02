# KawanDigi Creator Studio 🎬✨

> **AI UGC Video & Drama Series Generator Suite**
> Dirancang khusus untuk Kreator Affiliate & Sutradara Micro-Drama dengan integrasi **Google Flow (Veo)** dan **Google Gemini / Imagen 3**.

---

## 🚀 Keunggulan Utama & Fitur

1. **Zero-VPS / 100% Serverless & Gratis Selamanya**
   - Berjalan murni di sisi browser klien (*Single Page Application*).
   - Biaya hosting = **Rp 0** di Cloudflare Pages / GitHub Pages.
   - Tidak memerlukan server Node.js, Python, ataupun database berat.
   - Responsif di Desktop, Tablet, Android Chrome, dan iPhone Safari (dapat diinstall sebagai PWA).

2. **BYOK Architecture (Bring Your Own Key)**
   - Member menggunakan API Key Google AI Studio pribadi mereka masing-masing.
   - Anda sebagai pemilik webapp tidak menanggung biaya API atau kuota token sepeser pun.
   - Aman: API Key tersimpan di `localStorage` peramban perangkat member masing-masing.

3. **Tool 1: AI UGC Affiliate Video Creator**
   - **Ekstraksi URL Otomatis**: Cukup tempel link etalase produk dari TikTok Shop, Shopee, atau Tokopedia.
   - **Formula AIDA Konversi Tinggi**: Merancang naskah persuasi (Attention, Interest, Desire, Action) beserta call-to-action dan hashtag viral.
   - **Optimasi Durasi Google Flow (Batas 10 Detik per Klip)**:
     - **10 Detik**: 1 Scene (Quick Hook & Promo)
     - **20 Detik**: 2 Scene (Hook + Solution)
     - **30 Detik**: 3 Scene (Hook + Demo + CTA)
     - **60 Detik**: 6 Scene (Full Storytelling Review)
   - **Prompt Sinematik 9:16 Vertikal**: Prompt bahasa Inggris presisi siap *copy-paste* langsung ke Google Flow / Veo.
   - **Pratinjau Gambar AI (Google Imagen 3)**: Preview visual adegan sebelum membuat video di Google Flow.

4. **Tool 2: AI Drama & Micro-Series Creator**
   - **Format Serial Populer**: Mirip drama pendek TikTok / ReelShort / DramaBox.
   - **Kunci Konsistensi Karakter (*Character Lock*)**: Deskripsi visual tokoh utama (protagonis) dan lawan (antagonis) dikunci otomatis ke dalam setiap scene prompt video agar wajah dan seragam tidak berubah-ubah.
   - **Cliffhanger Hook Generator**: Di akhir episode, AI membuat adegan gantung dramatis yang memicu penonton wajib menanti episode berikutnya.

5. **Sistem Lisensi & Penjualan Terpisah (Monetisasi)**
   - Anda dapat menjual tool secara terpisah (A La Carte) atau sistem paket All-Access VIP:
     - **AI UGC Affiliate Creator**: Rp 39.000 / bulan
     - **AI Drama Creator**: Rp 49.000 / bulan
     - **Paket All-Access VIP**: Rp 69.000 / bulan
   - **Free Trial**: Disediakan 3x coba gratis untuk setiap tool baru agar calon pembeli tertarik sebelum membeli lisensi.

---

## 🔑 Format Kode Lisensi

Format kode lisensi yang valid dan dapat diaktivasi oleh member:

| Tipe Lisensi | Format Kode Lisensi | Akses |
| :--- | :--- | :--- |
| **All-Access VIP** | `KAWANDIGI-VIP-UNLIMITED` atau diawali `KD-VIP-...` | Membuka seluruh tool tanpa batas |
| **UGC Affiliate Pro** | `KAWANDIGI-UGC-PRO` atau diawali `KD-UGC-...` | Membuka Tool UGC Affiliate Creator |
| **Drama Creator Pro** | `KAWANDIGI-DRAMA-PRO` atau diawali `KD-DRAMA-...` | Membuka Tool AI Drama & Series Creator |

*(Contoh kode yang bisa Anda bagikan ke pembeli: `KD-UGC-88294`, `KD-DRAMA-11029`, `KD-VIP-99901`)*

---

## 🌐 Cara Deploy ke Cloudflare Pages (1-Klik Gratis)

### Langkah 1: Push Project ke GitHub
Buka terminal di folder project ini:
```bash
git init
git add .
git commit -m "Initial release: KawanDigi Creator Studio"
git branch -M main
git remote add origin https://github.com/USERNAME/kawandigi-creator-studio.git
git push -u origin main
```

### Langkah 2: Hubungkan ke Cloudflare Pages
1. Buka dashboard [Cloudflare Dashboard](https://dash.cloudflare.com/) > menu **Workers & Pages**.
2. Klik tombol **Create Application** > pilih tab **Pages** > **Connect to Git**.
3. Pilih repository GitHub `kawandigi-creator-studio`.
4. Pada bagian **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: Kosongkan (tidak perlu build script)
   - **Build output directory**: `/` (root folder)
5. Klik **Save and Deploy**.

Dalam 15–30 detik, webapp KawanDigi Creator Studio Anda sudah langsung aktif di domain gratis:
`https://kawandigi-creator-studio.pages.dev` (atau custom domain Anda sendiri seperti `studio.kawandigi.com`).

---

## 📱 Panduan Member Mengambil Google API Key Gratis

1. Kunjungi [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Login dengan akun Google.
3. Klik tombol biru **"Get API key"** atau **"Create API key"**.
4. Salin kode yang diawali dengan `AIzaSy...`.
5. Buka **KawanDigi Creator Studio**, klik tombol **API Key** di pojok kanan atas, lalu tempelkan dan simpan.

---

## 📂 Struktur Direktori

```text
KawanDigi-Creator-Studio/
├── index.html                 # Antarmuka SPA Modern (Tailwind CSS & Lucide Icons)
├── style.css                  # Custom Styles, Font Jakarta Sans, Toast, Glassmorphism
├── app.js                     # Main Controller & Event Listener
├── manifest.json              # PWA Mobile Manifest (Android & iPhone)
├── README.md                  # Panduan Lengkap & Dokumentasi
├── modules/
│   ├── gemini_api.js          # Google Gemini 2.5 Flash & Imagen 3 API Client
│   ├── license_manager.js     # Validasi Lisensi & Limitasi Trial
│   ├── ugc_creator.js         # Scraper URL & Generator Naskah UGC Multi-Scene (10s–60s)
│   └── drama_creator.js       # Serial Drama, Character Lock & Cliffhanger
└── assets/
    ├── icons/                 # PWA Icons
    └── presets/               # Niche & Prompt Presets
```

---

© 2026 KawanDigi Studio. All rights reserved.
