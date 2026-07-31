# 🌏 Kalkulator Jejak Karbon Harian & Bank Sampah — Kampung Baru, Kota Parepare

Website untuk warga Kampung Baru yang berisi **dua layanan**:

1. **Kalkulator Jejak Karbon Harian** — mengukur dampak kegiatan sehari-hari
   (listrik, gas, kendaraan, sampah, dll.) lengkap dengan **saran praktis**,
   **penyimpanan ke Google Sheets**, dan **dashboard admin**.
2. **Bank Sampah** — warga bisa **mengecek sendiri tabungan sampahnya**
   (berat, kantong, dan pendapatan) hanya dengan memasukkan ID Nasabah, serta
   **mengajukan pencairan**. Petugas punya **dashboard admin tersendiri**
   (akun terpisah) untuk mengelola nasabah, setoran, dan pencairan.

Dibuat dengan **HTML5 + CSS3 + JavaScript murni (tanpa framework)** — ringan,
responsif (mobile-first), dan di-*hosting* gratis di **Vercel**.

### 🗺️ Halaman

| Halaman | Berkas | Untuk siapa |
| --- | --- | --- |
| Beranda + Kalkulator Jejak Karbon | `index.html` | Semua warga |
| Dashboard admin data karbon | *pop-up di `index.html`* (footer → 🔒 Admin Data Karbon) | Petugas data karbon |
| **Cek Bank Sampah** | `bank-sampah.html` | Semua warga |
| **Dashboard admin Bank Sampah** | `admin-bank-sampah.html` | Petugas bank sampah |

> 🔐 **Akses admin sengaja dipisah.** Admin data karbon memakai *password* di
> `KONFIGURASI.ADMIN`, sedangkan admin bank sampah memakai **username + password
> sendiri** di `KONFIGURASI.BANK_SAMPAH.ADMIN`, dengan spreadsheet & Apps Script
> yang berbeda pula. Petugas bank sampah tidak bisa membuka data karbon, dan sebaliknya.

---

## ✨ Fitur

- 📱 **Mobile-first & responsif** — nyaman dibuka dari HP maupun laptop.
- 🎨 **Tampilan profesional & beranimasi** — hero foto kota + chip keunggulan, bagian **"3 Langkah Mudah"**, kartu, gauge, count-up, pop-up saran.
- 🧮 **Kalkulator lengkap** — listrik (kWh **atau** tagihan Rp), gas elpiji, bensin, pengelolaan sampah, dan kegiatan lain.
- 🟢 **Kategori otomatis** — Rendah / Sedang / Tinggi + **keterangan yang hangat & detail** dan saran yang menyesuaikan jawaban warga.
- 🔎 **Perbandingan "setara dengan"** — angka kg CO₂ diubah jadi hal yang mudah dibayangkan warga (jumlah pohon, km naik motor, kali cas HP) + total per tahun.
- 🌡️ **Dampak pada suhu bumi (bila dilakukan bersama-sama)** — memperkirakan kenaikan suhu bumi bila **seluruh dunia (± 8 miliar jiwa)** berkebiasaan sama, memakai acuan ilmiah **0,45°C per 1 triliun ton CO₂** ([SRM360](https://srm360.org/article/every-tonne-of-co2-adds-to-global-warming/), sejalan dengan IPCC). Skala mudah diganti ke tingkat nasional lewat `js/config.js`.
- 👋 **Sapaan personal** — hasil menyapa warga dengan namanya sendiri.
- 💾 **Simpan ke Google Sheets** (via Google Apps Script) + **cadangan otomatis** di perangkat (localStorage).
- 🔒 **Dashboard admin** — lihat semua data warga, **edit** & **hapus** tiap data, serta **unduh ke Excel (.xlsx)** atau **CSV** (tanpa pustaka pihak ketiga).
- 🌐 **Bahasa Indonesia yang sangat awam** — mudah dimengerti semua warga.
- 📝 **Penjelasan & contoh di tiap isian rumit** — mis. "Beli barang baru" dan
  "Makan daging per minggu" dilengkapi daftar ✅ termasuk / ❌ tidak termasuk
  beserta contoh pengisiannya, supaya warga tidak salah menafsirkan.

### ♻️ Fitur Bank Sampah

- 🔎 **Cek mandiri lewat ID Nasabah** — warga cukup memasukkan ID (mis. `BS-0001`)
  atau **NIK**-nya untuk melihat seluruh tabungan sampahnya.
- ⚖️ **Rincian berat & kantong** — total keseluruhan, **dipisah sampah kering &
  sampah basah**, plus **setoran yang baru saja dimasukkan** petugas.
- 💰 **Rincian pendapatan** — Pendapatan Keseluruhan, **Belum Dicairkan**, dan
  **Sudah Dicairkan**, lengkap dengan riwayat setoran.
- 💬 **Tombol "Ajukan Pencairan lewat WhatsApp"** — pengajuan warga langsung
  dikirim ke **WhatsApp pengelola bank sampah** dalam bentuk pesan siap kirim
  (Nama, NIK, ID Nasabah, rincian sampah, ringkasan pendapatan, dan jumlah yang
  ingin dicairkan). Pengajuannya **tetap tercatat** di dashboard petugas.
  Tombolnya **hidup setiap kali warga menyetor sampah** — begitu ada setoran
  yang belum dicairkan, berapa pun jumlahnya. Warga **cukup mengajukan sekali**:
  selama pengajuannya masih diproses petugas, tombolnya nonaktif; setelah uang
  dicairkan, tombolnya hidup lagi begitu warga menyetor sampah berikutnya.
- 📍 **Peta lokasi bank sampah** di beranda & halaman warga — lengkap dengan
  patokan **"tepat di belakang Posyandu"**, tombol **petunjuk arah**, dan
  **nomor WA pengelola**.
- 🧮 **Hitung otomatis untuk petugas** — pendapatan = `berat × harga per kg`;
  bila sampah tidak ditimbang, berat diperkirakan dari **jumlah kantong**.
- 🗂️ **Dashboard admin bank sampah** dengan 4 tab: Data Warga, Setoran Sampah,
  Pencairan, dan **Cara Pakai** (panduan lengkap untuk petugas).
- 🔎 **Penyaring lengkap** — cari nama/ID/NIK/HP, RT, RW, status nasabah, sisa
  tabungan, keaktifan menyetor, jenis sampah, status pencairan, rentang tanggal,
  dan berbagai pilihan pengurutan.
- ⬇️ **Unduh Excel sesuai penyaring** — yang terunduh persis yang sedang tampil.
- 🔐 **Akun admin terpisah** (username + password sendiri) dan **spreadsheet terpisah**.

---

## 📁 Struktur Berkas

```
index.html                      Beranda + Kalkulator Jejak Karbon (+ pop-up admin karbon)
bank-sampah.html                ♻️  Halaman warga: Cek Bank Sampah
admin-bank-sampah.html          🔒 Dashboard admin Bank Sampah (akun terpisah)

css/styles.css                  Gaya & animasi umum (dipakai semua halaman)
css/bank-sampah.css             Gaya khusus halaman bank sampah & dashboardnya

js/config.js                    ⚙️  SEMUA pengaturan: faktor emisi, tarif, kategori,
                                   URL Apps Script, password admin, harga sampah  ← SERING DIUBAH
js/calculator.js                Rumus perhitungan emisi, kategori, & saran
js/storage.js                   Kirim data karbon ke Google Sheets + cadangan lokal
js/xlsx-export.js               Pembuat berkas Excel (.xlsx) & CSV mandiri
js/admin.js                     Logika dashboard admin data karbon
js/main.js                      Penghubung semua bagian + animasi (halaman utama)
js/bank-sampah-storage.js       Lapisan data bank sampah (nasabah, setoran, pengajuan)
js/bank-sampah-lokasi.js        Peta lokasi & nomor WA pengelola (beranda + halaman warga)
js/bank-sampah.js               Logika halaman warga "Cek Bank Sampah"
js/admin-bank-sampah.js         Logika dashboard admin bank sampah

apps-script/Code.gs             Backend Google Apps Script — DATA KARBON
apps-script/CodeBankSampah.gs   Backend Google Apps Script — BANK SAMPAH (spreadsheet lain)
assets/                         Tempat logo & foto latar (lihat assets/README.md)
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

## 🔒 Dashboard Admin (Data Karbon)

1. Di bagian **footer** website, klik **"🔒 Admin Data Karbon"**.
2. Masukkan **password** (sesuai `ADMIN.password` di `js/config.js`).
3. Data warga akan tampil dalam tabel. Anda bisa:
   - **↻ Muat Ulang** — mengambil data terbaru.
   - **⬇️ Unduh Excel (.xlsx)** — file Excel asli.
   - **⬇️ Unduh CSV** — juga bisa dibuka di Excel.

> Data juga bisa dibuka langsung dari **Google Sheet** Anda dan diunduh lewat
> menu **File ▸ Download ▸ Microsoft Excel (.xlsx)**.

---

## ♻️ Bank Sampah

Fitur bank sampah punya **penyimpanan sendiri** (spreadsheet + Apps Script yang
berbeda dari data karbon) supaya akses petugasnya benar-benar terpisah.

### 👨‍👩‍👧 Untuk warga — halaman `bank-sampah.html`

1. Buka menu **♻️ Cek Bank Sampah** di beranda (atau langsung `/bank-sampah`).
2. Masukkan **ID Nasabah** dari buku tabungan (mis. `BS-0001`) — boleh juga **NIK**.
3. Akan tampil: **Nama Warga**, **NIK**, **berat & jumlah kantong keseluruhan**
   (dipisah *sampah kering* dan *sampah basah*), **setoran yang baru saja
   dimasukkan**, **Pendapatan Keseluruhan**, **Belum Dicairkan**,
   **Sudah Dicairkan**, dan riwayat setoran.
4. Bila tabungannya sudah cukup, tombol **💬 Ajukan Pencairan lewat WhatsApp**
   bisa ditekan. Muncul kotak berisi nomor WA pengelola, jumlah yang diajukan,
   dan **pratinjau isi pesannya**. Setelah tombol hijau ditekan, WhatsApp
   terbuka dengan pesan yang sudah lengkap — warga tinggal menekan *kirim*.
   Pengajuannya juga **tercatat otomatis** di dashboard petugas.
5. Di bagian bawah halaman ada **peta lokasi bank sampah** (tepat di belakang
   Posyandu) beserta tombol **petunjuk arah** dan **chat pengelola**.

> Halaman ini juga bisa dibuka lewat tautan langsung berisi ID, mis.
> `bank-sampah.html?id=BS-0001` — praktis untuk dibagikan lewat WhatsApp.

### 🧑‍💼 Untuk petugas — halaman `admin-bank-sampah.html`

Masuk dengan **username + password** dari `KONFIGURASI.BANK_SAMPAH.ADMIN`
(bawaan: `petugasbanksampah` / `banksampah116` — **GANTI!**).
Dashboardnya punya 4 tab:

| Tab | Isi |
| --- | --- |
| 👥 **Data Warga** | Tambah / ubah / hapus nasabah, lihat rincian tabungan tiap warga, penyaring (cari, RT, RW, status, sisa tabungan, keaktifan menyetor, pengurutan), unduh Excel. |
| ⚖️ **Setoran Sampah** | Catat setoran (otomatis menghitung pendapatan), ubah/hapus setoran, tandai/batalkan "Sudah Dicairkan", penyaring (cari, jenis, status, RT, rentang tanggal, pengurutan) + baris TOTAL, unduh Excel. |
| 💵 **Pencairan** | Proses pengajuan warga (**✅ Setujui & Tandai Cair** / **✖️ Tolak**) dan **pencairan langsung** bila warga datang ke sekretariat. |
| 📖 **Cara Pakai** | Panduan lengkap alur kerja harian, cara mengisi setoran, arti istilah, dan catatan keamanan — bisa dibaca petugas kapan saja. |

**Alur kerja singkat:** daftarkan warga → catat ID Nasabah di buku tabungannya →
catat setoran tiap kali warga menyetor → setujui pencairan saat uang diserahkan.

### 🗄️ Menghubungkan Bank Sampah ke Google Sheets

Tanpa pengaturan, fitur ini **sudah berjalan** tetapi datanya hanya tersimpan di
perangkat yang dipakai petugas (localStorage). Agar bisa dibuka dari HP/laptop
mana pun, hubungkan ke Google Sheets:

1. Buat **Google Sheet BARU** (jangan pakai sheet data karbon), mis. beri nama
   *"Bank Sampah Kampung Baru"*.
2. Menu **Extensions ▸ Apps Script**, hapus kode contoh, lalu **tempel seluruh
   isi `apps-script/CodeBankSampah.gs`**.
3. Ganti `var TOKEN_RAHASIA = '…'` dengan kata sandi rahasia Anda sendiri.
4. **Deploy ▸ New deployment ▸ Web app** — *Execute as:* `Me`,
   *Who has access:* `Anyone` — lalu salin URL `…/exec`.
5. Isi di `js/config.js`:

```js
BANK_SAMPAH: {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/…/exec', // ← URL tadi
  token: 'rahasia-bank-sampah-116',   // ← HARUS SAMA dengan TOKEN_RAHASIA di CodeBankSampah.gs
  ADMIN: {
    username: 'GANTI-username-petugas',
    password: 'GANTI-password-petugas',
  },
  …
}
```

Sheet-nya akan otomatis membuat 3 tab: **Nasabah**, **Setoran**, dan **Pengajuan**.

> ⚠️ Sama seperti backend data karbon: setiap kali `CodeBankSampah.gs` diubah,
> Anda **wajib** melakukan **Deploy ▸ Manage deployments ▸ (pensil) ▸
> Version: New version ▸ Deploy**. Kalau tidak, Web App masih menjalankan kode lama.

### ⚙️ Pengaturan Bank Sampah di `js/config.js`

| Pengaturan | Arti | Default |
| --- | --- | --- |
| `BANK_SAMPAH.APPS_SCRIPT_URL` | URL Web App khusus bank sampah (kosong = simpan di perangkat) | `''` |
| `BANK_SAMPAH.token` | Kata sandi rahasia, harus sama dengan `TOKEN_RAHASIA` di `CodeBankSampah.gs` | `rahasia-bank-sampah-116` |
| `BANK_SAMPAH.ADMIN.username` | Username petugas bank sampah | `petugasbanksampah` |
| `BANK_SAMPAH.ADMIN.password` | Password petugas bank sampah | `banksampah116` |
| `BANK_SAMPAH.PREFIX_ID` | Awalan ID nasabah otomatis (`BS-0001`, …) | `BS` |
| `BANK_SAMPAH.HARGA_PER_KG.kering` | Harga beli sampah kering per kg (Rp) | `2000` |
| `BANK_SAMPAH.HARGA_PER_KG.basah` | Harga beli sampah basah per kg (Rp) | `500` |
| `BANK_SAMPAH.KG_PER_KANTONG` | Perkiraan berat 1 kantong bila tidak ditimbang (kg) | `3` |
| `BANK_SAMPAH.MIN_PENCAIRAN` | Tabungan minimal yang boleh diajukan warga (Rp). **`0` = tanpa batas minimal** — tombol pengajuan hidup begitu ada setoran yang belum dicairkan | `0` |
| `BANK_SAMPAH.PENGELOLA.nama` | Nama pengelola yang menerima chat WhatsApp | `Pengelola Bank Sampah Kampung Baru` |
| `BANK_SAMPAH.PENGELOLA.wa` | Nomor WA untuk tautan `wa.me` — **format internasional**, tanpa `+` & spasi (`0813…` → `62813…`) | `6281355210234` |
| `BANK_SAMPAH.PENGELOLA.waTampil` | Nomor WA yang ditampilkan di layar | `+62 813-5521-0234` |
| `BANK_SAMPAH.LOKASI.nama` | Nama tempat pada kartu peta | `Bank Sampah Kampung Baru` |
| `BANK_SAMPAH.LOKASI.patokan` | Patokan lokasi | `Tepat di belakang Posyandu` |
| `BANK_SAMPAH.LOKASI.alamat` | Alamat lengkap | `Kelurahan Kampung Baru, Kec. Bacukiki Barat, Kota Parepare` |
| `BANK_SAMPAH.LOKASI.lat` / `.lng` | Titik koordinat untuk tombol **petunjuk arah** | `-4.020724` / `119.625485` |

> **Batas minimal pencairan.** Nilai bawaannya `0`, artinya warga boleh
> mengajukan pencairan begitu setorannya dicatat petugas — tidak perlu menunggu
> tabungannya mencapai jumlah tertentu. Bila pengelola ingin memberlakukan batas
> lagi, isi `MIN_PENCAIRAN` di `js/config.js` **dan** `var MIN_PENCAIRAN` di
> `apps-script/CodeBankSampah.gs` dengan angka yang sama, lalu deploy ulang Web
> App-nya agar pemeriksaan di server ikut menyesuaikan.

> **Mengganti peta.** Gambar petanya sendiri adalah `<iframe>` Google Maps yang
> ditulis langsung di `index.html` & `bank-sampah.html` (cari komentar
> `LOKASI & PETA BANK SAMPAH`). Untuk memindahkan titiknya: buka Google Maps ▸
> **Bagikan ▸ Sematkan peta**, salin `src` iframe-nya ke kedua halaman, lalu
> samakan juga `LOKASI.lat` & `LOKASI.lng` di `js/config.js` supaya tombol
> petunjuk arahnya ikut menunjuk ke tempat yang sama.

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
| `PEMANASAN.derajat_per_triliun_ton_co2` | °C kenaikan suhu bumi per 1 triliun ton CO₂ | `0.45` |
| `PEMANASAN.jumlah_rumah_tangga` | jumlah rumah tangga untuk skenario "bersama-sama" | `2000000000` |
| `PEMANASAN.jumlah_jiwa` | jumlah jiwa (untuk narasi skala) | `8000000000` |
| `PEMANASAN.label_wilayah` | kata untuk narasi (mis. `di seluruh dunia`) | `di seluruh dunia` |
| `PEMANASAN.tahun_proyeksi` | rentang tahun proyeksi kenaikan suhu | `30` |

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
  proteksi harus dilakukan di sisi server. Ini berlaku untuk **kedua** dashboard
  (data karbon maupun bank sampah).
- **Pemisahan akses admin** dilakukan lewat akun, spreadsheet, dan Apps Script
  yang berbeda — jadi petugas bank sampah tidak melihat data karbon dan
  sebaliknya. Namun karena keduanya client-side, jangan pakai kata sandi yang
  sama dengan akun penting lain.
- **Halaman Cek Bank Sampah bisa dibuka siapa saja yang tahu ID Nasabah**
  (itulah cara warga mengaksesnya tanpa perlu membuat akun). Karena itu halaman
  tersebut hanya menampilkan data tabungan warga bersangkutan — bukan daftar
  seluruh warga. Sampaikan ke warga agar ID Nasabahnya tidak disebarkan
  sembarangan, dan **jangan** memakai NIK sebagai ID Nasabah.
- **No. HP & NIK warga dibuat opsional.** Sampaikan kepada warga bahwa data
  dipakai hanya untuk keperluan program lingkungan & bank sampah.
- Angka faktor emisi & batas kategori adalah **perkiraan yang masuk akal**;
  silakan disesuaikan bila Dinas Lingkungan Hidup memiliki data resmi terbaru.

---

Dibuat dengan 💚 untuk warga **Kampung Baru, Kota Parepare** ·
Program KKN × Dinas Lingkungan Hidup Kota Parepare.
