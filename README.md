# 🌏 Kalkulator Jejak Karbon Harian — Kampung Baru, Kota Parepare

Website **satu halaman** (single-page) untuk membantu warga Kampung Baru
mengukur **jejak karbon harian** dari kegiatan sehari-hari (listrik, gas,
kendaraan, sampah, dll.), lengkap dengan **saran praktis**, **penyimpanan
data ke Google Sheets**, dan **dashboard admin** yang bisa mengunduh data
warga ke **Excel**.

Dibuat dengan **HTML5 + CSS3 + JavaScript murni (tanpa framework)** — ringan,
responsif (mobile-first), dan di-*hosting* gratis di **Vercel**.

---

## ✨ Fitur

- 📱 **Mobile-first & responsif** — nyaman dibuka dari HP maupun laptop.
- 🎨 **Tampilan profesional & beranimasi** — hero foto kota + chip keunggulan, bagian **"3 Langkah Mudah"**, kartu, gauge, count-up, pop-up saran.
- 🧮 **Kalkulator lengkap** — listrik (kWh **atau** tagihan Rp), gas elpiji, bensin, pengelolaan sampah, dan kegiatan lain.
- 🟢 **Kategori otomatis** — Rendah / Sedang / Tinggi + **keterangan yang hangat & detail** dan saran yang menyesuaikan jawaban warga.
- 🔎 **Perbandingan "setara dengan"** — angka kg CO₂ diubah jadi hal yang mudah dibayangkan warga (jumlah pohon, km naik motor, kali cas HP) + total per tahun.
- 👋 **Sapaan personal** — hasil menyapa warga dengan namanya sendiri.
- 💾 **Simpan ke Google Sheets** (via Google Apps Script) + **cadangan otomatis** di perangkat (localStorage).
- 🔒 **Dashboard admin** — lihat semua data warga, **edit** & **hapus** tiap data, serta **unduh ke Excel (.xlsx)** atau **CSV** (tanpa pustaka pihak ketiga).
- 🌐 **Bahasa Indonesia yang sangat awam** — mudah dimengerti semua warga.

---

## 📁 Struktur Berkas

```
index.html               Halaman utama (semua bagian ada di sini)
css/styles.css           Seluruh gaya & animasi
js/config.js             ⚙️  Pengaturan: faktor emisi, tarif, kategori, URL, password  ← SERING DIUBAH
js/calculator.js         Rumus perhitungan emisi, kategori, & saran
js/storage.js            Kirim data ke Google Sheets + cadangan lokal
js/xlsx-export.js        Pembuat berkas Excel (.xlsx) & CSV mandiri
js/admin.js              Logika dashboard admin
js/main.js               Penghubung semua bagian + animasi
apps-script/Code.gs      Kode backend untuk Google Apps Script
assets/                  Tempat logo & foto latar (lihat assets/README.md)
```

---

## 🚀 Menjalankan di Komputer (untuk mencoba)

Karena situs ini statis, cukup buka lewat server statis sederhana:

```bash
# dengan Python
python3 -m http.server 8000
# lalu buka http://localhost:8000 di browser
```

> Boleh juga langsung membuka `index.html`, tetapi disarankan lewat server
> agar semua fitur (termasuk penyimpanan) berjalan normal.

Tanpa pengaturan apa pun, kalkulator **sudah berfungsi** dan menyimpan data ke
perangkat (localStorage). Untuk menyimpan **terpusat ke Google Sheets**,
ikuti langkah di bawah.

---

## 🗄️ Menghubungkan ke Google Sheets (menyimpan data warga)

### Langkah 1 — Buat Spreadsheet & Apps Script
1. Buka [sheet.new](https://sheet.new) untuk membuat Google Sheet baru
   (mis. beri nama **"Data Jejak Karbon Kampung Baru"**).
2. Klik menu **Extensions ▸ Apps Script**.
3. Hapus kode contoh, lalu **tempel seluruh isi** `apps-script/Code.gs`.
4. Pada baris `var TOKEN_RAHASIA = 'rahasia-kkn-116';` — **ganti** dengan kata
   sandi rahasia Anda sendiri (bebas). **Ingat baik-baik**, karena harus sama
   dengan yang di `js/config.js`.
5. Simpan (ikon 💾).

### Langkah 2 — Deploy sebagai Web App
1. Klik **Deploy ▸ New deployment**.
2. Klik ikon ⚙️ (Select type) → pilih **Web app**.
3. Isi:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Klik **Deploy**, lalu **izinkan** (authorize) akun Google Anda.
5. **Salin URL Web app** (bentuknya `https://script.google.com/macros/s/…/exec`).

### Langkah 3 — Masukkan ke website
Buka `js/config.js` dan isi dua hal ini:

```js
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/…/exec', // ← tempel URL tadi
ADMIN: {
  password: 'GANTI-password-admin',
  token: 'rahasia-kkn-116', // ← HARUS SAMA dengan TOKEN_RAHASIA di Code.gs
},
```

Selesai! Sekarang setiap warga yang mengisi kalkulator akan tersimpan otomatis
ke Google Sheet Anda, dan bisa dilihat dari perangkat mana pun lewat dashboard admin.

> **Jika mengubah kode Apps Script setelahnya**, lakukan **Deploy ▸ Manage
> deployments ▸ (pensil) ▸ Version: New version ▸ Deploy** agar perubahan aktif.
> Meng-*edit* `Code.gs` di editor Apps Script **tidak otomatis** memperbarui
> URL Web App yang sudah dipakai website Anda — Anda **wajib** membuat
> "New version" seperti di atas setiap kali kode ini berubah.
>
> ⚠️ **Fitur Edit & Hapus di dashboard admin tidak akan tersimpan permanen**
> (data kembali seperti semula setelah dimuat ulang) selama Web App yang
> ter-*deploy* masih menjalankan versi `Code.gs` yang lama — termasuk versi
> sebelum perbaikan terbaru (yang membuat aksi edit/hapus terverifikasi lewat
> `doGet`, bukan lagi POST `no-cors` yang balasannya tak terbaca browser).
> **Tempel ulang seluruh isi `apps-script/Code.gs` versi terbaru** ke proyek
> Apps Script Anda, lalu **deploy ulang versi baru** — kalau tidak, tombol
> Edit/Hapus akan tampak berhasil di layar tapi diam-diam gagal, dan data
> lama akan muncul kembali begitu dashboard dimuat ulang.

---

## 🔒 Dashboard Admin

1. Di bagian **footer** website, klik **"🔒 Masuk Admin"**.
2. Masukkan **password** (sesuai `ADMIN.password` di `js/config.js`).
3. Data warga akan tampil dalam tabel. Anda bisa:
   - **↻ Muat Ulang** — mengambil data terbaru.
   - **⬇️ Unduh Excel (.xlsx)** — file Excel asli.
   - **⬇️ Unduh CSV** — juga bisa dibuka di Excel.

> Data juga bisa dibuka langsung dari **Google Sheet** Anda dan diunduh lewat
> menu **File ▸ Download ▸ Microsoft Excel (.xlsx)**.

---

## ⚙️ Mengubah Angka Perhitungan

Semua angka ada di **`js/config.js`** dan diberi penjelasan. Contoh yang sering diubah:

| Pengaturan | Arti | Default |
| --- | --- | --- |
| `FAKTOR_EMISI.listrik_per_kwh` | kg CO₂ per 1 kWh listrik | `0.73` |
| `FAKTOR_EMISI.lpg_per_kg` | kg CO₂ per 1 kg elpiji | `3.00` |
| `FAKTOR_EMISI.bensin_per_liter` | kg CO₂ per 1 liter bensin | `2.31` |
| `FAKTOR_EMISI.solar_per_liter` | kg CO₂ per 1 liter solar | `2.68` |
| `TARIF_LISTRIK_PER_KWH` | Rp per kWh (untuk konversi tagihan) | `1444.70` |
| `AMBANG_KATEGORI.rendah_maks` | batas atas kategori "Rendah" (kg/hari) | `5` |
| `AMBANG_KATEGORI.sedang_maks` | batas atas kategori "Sedang" (kg/hari) | `12` |

Cukup ubah angkanya, simpan, lalu muat ulang halaman.

### 📚 Sumber data resmi (acuan Dinas Lingkungan Hidup)

Angka faktor emisi memakai data resmi pemerintah agar dapat dipertanggungjawabkan:

- **Listrik — 0,73 kg CO₂/kWh.** Parepare berada di **Sistem Sulselbar**
  (Sulawesi Selatan–Barat). Nilai *Operating Margin* (OM) sistem ini = 0,73
  ton CO₂/MWh menurut *"Faktor Emisi GRK Sistem Ketenagalistrikan Tahun 2019"*,
  Ditjen Ketenagalistrikan, **Kementerian ESDM**.
- **Bensin 2,31 · Solar 2,68 kg/liter · LPG 3,0 kg/kg.** Dihitung dari
  *"Nilai Faktor Emisi (FE) CO₂ Nasional dan Nilai Kalor Netto (NCV)"*,
  **Kementerian ESDM** — rumus: `FE (ton CO₂/TJ) × NCV (TJ/Gg) ÷ 1000 × massa jenis`.
- **Batas kategori** mengacu rata-rata emisi energi rumah tangga di Indonesia
  untuk cakupan kalkulator ini (± 6–8 kg CO₂e/hari/rumah tangga, atau ± 2
  kg/hari/orang): di bawah rata-rata = **Rendah**, sekitar rata-rata =
  **Sedang**, jauh di atas rata-rata = **Tinggi**.

> Semua angka ini adalah **variabel** di `js/config.js`. Bila Dinas LH Parepare
> memiliki angka lokal/terbaru, cukup ganti nilainya di sana.

---

## 🖼️ Mengganti Logo & Foto Latar

Lihat **`assets/README.md`**. Ringkasnya: taruh `logo-parepare.png` dan
`latar-parepare.jpg` di folder `assets/`. Bila belum ada, website tetap tampil
rapi memakai emblem & gradien bawaan.

---

## 🌐 Menerbitkan Gratis dengan Vercel

Situs ini **statis** (tanpa proses build), jadi Vercel langsung menyajikan
`index.html` di root — tidak perlu framework atau perintah build apa pun.

### Cara termudah (lewat web)
1. Push kode ini ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new) dan login (bisa pakai akun GitHub).
3. Klik **Import** pada repositori ini.
4. Biarkan pengaturan default:
   - **Framework Preset**: `Other`
   - **Build Command**: *(kosongkan)*
   - **Output Directory**: *(kosongkan / biarkan root)*
5. Klik **Deploy**. Beberapa saat kemudian situs bisa diakses lewat
   `https://<nama-proyek>.vercel.app`.

Setiap kali Anda **push** perubahan ke branch, Vercel otomatis men-*deploy*
ulang. Berkas `vercel.json` sudah menyertakan pengaturan *clean URLs* dan
*caching* untuk `assets/`, `css/`, dan `js/`.

### Alternatif (lewat terminal)
```bash
npm i -g vercel   # sekali saja
vercel            # deploy pratinjau
vercel --prod     # deploy ke produksi
```

---

## 🔐 Catatan Keamanan & Privasi

- Password & token admin di `config.js` bersifat **client-side**, jadi hanya
  **penghalang dasar** — bukan pengamanan penuh. Untuk keamanan sungguhan,
  proteksi harus dilakukan di sisi server.
- **No. HP warga dibuat opsional.** Sampaikan kepada warga bahwa data dipakai
  hanya untuk keperluan program lingkungan.
- Angka faktor emisi & batas kategori adalah **perkiraan yang masuk akal**;
  silakan disesuaikan bila Dinas Lingkungan Hidup memiliki data resmi terbaru.

---

Dibuat dengan 💚 untuk warga **Kampung Baru, Kota Parepare** ·
Program KKN × Dinas Lingkungan Hidup Kota Parepare.
