# 🌏 Kalkulator Jejak Karbon Harian & Bank Sampah — Kampung Baru, Kota Parepare

Website untuk warga Kampung Baru yang berisi **tiga layanan**:

1. **Kalkulator Jejak Karbon Harian** — mengukur dampak kegiatan sehari-hari
   (listrik, gas, kendaraan, sampah, dll.) lengkap dengan **saran praktis**,
   **penyimpanan ke Google Sheets**, dan **dashboard admin**.
2. **Bank Sampah** — warga bisa **mencatat sendiri setoran sampahnya**
   (lengkap dengan **foto bukti**, baik yang sudah terdaftar maupun belum),
   **mengecek tabungan sampahnya** (berat, kantong, dan pendapatan) hanya dengan
   memasukkan ID Nasabah, serta **mengajukan pencairan**. Petugas punya
   **dashboard admin tersendiri** (akun terpisah) untuk **menyetujui/menolak
   setoran warga** serta mengelola nasabah, setoran, dan pencairan.
3. **Peta Mitigasi Bencana** — **peta interaktif** zona rawan bencana Kelurahan
   Kampung Baru (tsunami, banjir rob, gelombang pasang) lengkap dengan
   **jalur evakuasi berpanah**, **titik kumpul**, **instruksi evakuasi**, dan
   **nomor darurat**. Warga bisa **mengklik jalan atau area mana pun** untuk
   melihat koordinat, zona wilayahnya, dan petunjuk arah ke titik kumpul.

Dibuat dengan **HTML5 + CSS3 + JavaScript murni (tanpa framework)** — ringan,
responsif (mobile-first), dan di-*hosting* gratis di **Vercel**.

### 🗺️ Halaman

| Halaman | Berkas | Untuk siapa |
| --- | --- | --- |
| Beranda + Kalkulator Jejak Karbon | `index.html` | Semua warga |
| Dashboard admin data karbon | *pop-up di `index.html`* (footer → 🔒 Admin Data Karbon) | Petugas data karbon |
| **Cek Bank Sampah** | `bank-sampah.html` | Semua warga |
| **Dashboard admin Bank Sampah** | `admin-bank-sampah.html` | Petugas bank sampah |
| **Peta Mitigasi Bencana** | `peta-mitigasi-bencana.html` | Semua warga |

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

- 📸 **Warga mencatat sendiri setorannya** — formulir di halaman warga berisi
  **Nama Lengkap, Alamat, RT/RW, No. HP/WA**, pilihan **jenis sampah**
  (Botol Plastik, Kardus, Rak Telur, Gelas Plastik, dan **Lain-lain** dengan
  kolom keterangannya sendiri), perkiraan berat/kantong, dan **foto bukti
  sampah** yang bisa langsung dipotret dari HP.
  - **Sudah terdaftar?** Cukup isi **ID Nasabah atau NIK**, lalu nama & alamat
    terisi otomatis.
  - **Belum terdaftar?** **ID Nasabah baru dibuat otomatis** oleh sistem dan
    langsung ditampilkan supaya bisa dicatat warga.
  - Begitu terkirim, warga mendapat **chat WhatsApp siap kirim** untuk pengelola
    berisi seluruh data yang tadi diisi — **dan pada saat yang sama** catatannya
    masuk ke **dashboard petugas untuk disetujui atau ditolak**.
- 🔎 **Cek mandiri lewat ID Nasabah** — warga cukup memasukkan ID (mis. `BS-0001`)
  atau **NIK**-nya untuk melihat seluruh tabungan sampahnya.
- ⚖️ **Rincian berat & kantong** — total keseluruhan, **dirinci per jenis sampah**,
  plus **setoran yang baru saja dimasukkan** petugas.
- 💰 **Rincian pendapatan** — Pendapatan Keseluruhan, **Belum Dicairkan**, dan
  **Sudah Dicairkan**, lengkap dengan riwayat setoran.
- 📜 **Riwayat setoran yang menyatu** — satu daftar berisi **semuanya**: setoran
  yang dicatat petugas **dan** setoran yang **dicatat sendiri oleh warga**,
  apa pun statusnya (**⏳ Menunggu Persetujuan**, **✅ Disetujui**, **❌ Ditolak**).
  Setoran warga yang sudah disetujui **tidak ditampilkan dua kali**.
- 💬 **Tombol "Ajukan Pencairan lewat WhatsApp"** — pengajuan warga langsung
  dikirim ke **WhatsApp pengelola bank sampah** dalam bentuk pesan siap kirim
  (Nama, NIK, ID Nasabah, rincian sampah, ringkasan pendapatan, dan jumlah yang
  ingin dicairkan). Pengajuannya **tetap tercatat** di dashboard petugas.
  Tombolnya otomatis nonaktif bila tabungan belum mencapai batas minimal atau
  masih ada pengajuan yang diproses.
- 📍 **Peta lokasi bank sampah** di beranda & halaman warga — lengkap dengan
  patokan **"tepat di belakang Posyandu"**, tombol **petunjuk arah**, dan
  **nomor WA pengelola**.
- 🧮 **Hitung otomatis untuk petugas** — pendapatan = `berat × harga per kg`;
  bila sampah tidak ditimbang, berat diperkirakan dari **jumlah kantong**.
- ♻️ **Jenis sampah diatur di satu tempat** — daftar **Botol Plastik, Kardus,
  Rak Telur, Gelas Plastik, Lain-lain** beserta harganya ada di
  `BANK_SAMPAH.JENIS` (`js/config.js`) dan langsung ikut berubah di formulir
  warga, formulir petugas, penyaring, serta tabel harga.
- ✅ **Persetujuan setoran oleh petugas** — setoran kiriman warga **belum
  menambah tabungan** siapa pun sampai petugas memeriksa fotonya, menimbang
  ulang, lalu menekan **✅ Setujui** (atau **✖️ Tolak** disertai alasannya).
- 🗂️ **Dashboard admin bank sampah** dengan 6 tab: Data Warga,
  **Setoran dari Warga**, Setoran Sampah, Pencairan, **Cara Pakai**
  (panduan lengkap untuk petugas), dan **Akun Petugas**.
- 🔐 **Petugas bisa mengganti sendiri nama pengguna & kata sandinya** lewat tab
  **🔐 Akun Petugas** — tanpa menyentuh kode sama sekali. Nama pengguna **dan**
  kata sandi lama wajib dimasukkan lebih dulu sebagai bukti, kata sandi baru
  harus diketik dua kali, dan begitu tersimpan **akun lama langsung tidak
  berlaku** di semua perangkat. Kata sandinya **tidak pernah disimpan apa
  adanya** — yang tercatat di Google Sheets hanya *sidik acaknya* (SHA-256).
- 🔓 **"Ingatkan Saya" di layar masuk** — bila dicentang, petugas **tetap masuk
  walau website ditutup** (sampai 30 hari), jadi tidak perlu mengetik akun
  setiap kali membuka dashboard. Menekan **🚪 Keluar** membatalkannya, dan
  ingatan itu **otomatis mati** begitu kata sandinya diganti dari perangkat lain.
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
peta-mitigasi-bencana.html      🗺️  Peta Mitigasi Bencana Kelurahan Kampung Baru

css/styles.css                  Gaya & animasi umum (dipakai semua halaman)
css/bank-sampah.css             Gaya khusus halaman bank sampah & dashboardnya
css/peta-mitigasi.css           Gaya khusus halaman peta mitigasi bencana

js/config.js                    ⚙️  SEMUA pengaturan: faktor emisi, tarif, kategori,
                                   URL Apps Script, password admin, harga sampah  ← SERING DIUBAH
js/calculator.js                Rumus perhitungan emisi, kategori, & saran
js/storage.js                   Kirim data karbon ke Google Sheets + cadangan lokal
js/xlsx-export.js               Pembuat berkas Excel (.xlsx) & CSV mandiri
js/admin.js                     Logika dashboard admin data karbon
js/main.js                      Penghubung semua bagian + animasi (halaman utama)
js/bank-sampah-storage.js       Lapisan data bank sampah (nasabah, setoran,
                                   pengajuan, & setoran kiriman warga + fotonya)
js/bantuan.js                   🆘 Kontak anggota KKN yang mengurus sistem webnya —
                                   dipakai semua halaman saat ada gangguan
js/bank-sampah-lokasi.js        Peta lokasi & nomor WA pengelola (beranda + halaman warga)
js/bank-sampah.js               Logika halaman warga "Cek Bank Sampah"
js/bank-sampah-akun.js          🔐 Akun petugas: pengacak sandi (SHA-256), pemeriksaan
                                   saat masuk, "Ingatkan Saya" (masuk otomatis), &
                                   penggantian nama pengguna/kata sandi
js/admin-bank-sampah.js         Logika dashboard admin bank sampah
js/peta-mitigasi.js             🗺️  Logika peta interaktif mitigasi bencana (Leaflet)

data/peta-mitigasi-data.js      Data peta: batas kelurahan, zona rawan, jalan,
                                   jalur evakuasi, fasilitas ← dibuat otomatis
vendor/leaflet/                 Pustaka peta Leaflet 1.9.4 (disertakan lokal, bukan CDN,
                                   agar peta tetap terbuka walau jaringan bermasalah)
tools/peta-mitigasi/            Skrip pembangkit data peta + cara memperbaruinya
                                   (lihat tools/peta-mitigasi/README.md)

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
   (dirinci **per jenis sampah**), **setoran yang baru saja dimasukkan**,
   **Pendapatan Keseluruhan**, **Belum Dicairkan**, **Sudah Dicairkan**, dan
   **📜 Riwayat Setoran Anda**.
4. **📜 Riwayat Setoran Anda menggabungkan semuanya** — setoran yang dicatat
   petugas maupun yang **dicatat sendiri oleh warga** lewat bagian
   **“📸 Catat Setoran Sampah”**, jadi tidak ada setoran yang “hilang”:

   | Lencana di kolom Status | Artinya | Ikut jadi tabungan? |
   |---|---|---|
   | **⏳ Menunggu Persetujuan** | Catatan warga sudah masuk ke dashboard, petugas belum menimbang. Kolom Pendapatan masih **perkiraan** (ditulis `± Rp …`). | Belum |
   | **❌ Ditolak** | Petugas tidak menerima setoran itu. Alasannya ada di kolom **Catatan**. | Tidak |
   | **✅ Disetujui** | Sudah ditimbang & dimasukkan petugas ke tabungan. Angkanya memakai **hasil timbangan petugas**. | Ya |
   | **Belum / Sudah Dicairkan** | Keadaan uangnya. Muncul untuk setiap setoran yang sudah masuk tabungan. | — |

   Baris yang berasal dari catatan warga sendiri ditandai **📱 dicatat sendiri**.
   Setoran warga yang **sudah disetujui hanya muncul SEKALI** (memakai baris
   resminya), jadi **tidak ada data dobel**. Setoran yang baru saja dikirim
   lewat formulir juga **langsung muncul** di riwayat tanpa perlu mencari ulang.
5. Bila tabungannya sudah cukup, tombol **💬 Ajukan Pencairan lewat WhatsApp**
   bisa ditekan. Muncul kotak berisi nomor WA pengelola, jumlah yang diajukan,
   dan **pratinjau isi pesannya**. Setelah tombol hijau ditekan, WhatsApp
   terbuka dengan pesan yang sudah lengkap — warga tinggal menekan *kirim*.
   Pengajuannya juga **tercatat otomatis** di dashboard petugas.
6. Di bagian bawah halaman ada **peta lokasi bank sampah** (tepat di belakang
   Posyandu) beserta tombol **petunjuk arah** dan **chat pengelola**.

> ⚠️ Agar setoran kiriman warga ikut muncul di riwayat saat memakai Google
> Sheets, `apps-script/CodeBankSampah.gs` **wajib di-deploy ulang** (lihat
> peringatan di bagian pemasangan). Selama belum, halaman tetap berjalan normal
> — riwayatnya saja yang masih berisi setoran dari petugas saja.

#### 📸 Mencatat setoran sampah sendiri (bagian **“Catat Setoran Sampah”**)

Warga **tidak perlu menunggu petugas** untuk mencatat setorannya. Bagian ini
ada di tengah halaman `bank-sampah.html` (menu **📸 Catat Setoran**):

1. **Pilih status pendaftaran.**
   - **✅ Sudah terdaftar** → isi **ID Nasabah atau NIK**, tekan **🔎 Cek**;
     nama & alamatnya langsung terisi sendiri.
   - **🆕 Belum terdaftar** → tidak perlu mengisi apa pun. **ID Nasabah baru
     dibuat otomatis** saat setoran dikirim (nomornya dibuat *server* supaya
     dua warga yang mendaftar bersamaan tidak dapat nomor yang sama), lalu
     ditampilkan besar-besar agar bisa dicatat warga.
2. **Isi data diri** — Nama Lengkap, Alamat, RT, RW, dan No. HP/WA.
3. **Pilih jenis sampah** — Botol Plastik, Kardus, Rak Telur, Gelas Plastik,
   atau **Lain-lain** (kalau memilih ini, kolom keterangannya **wajib diisi**).
   Lalu isi **perkiraan berat (kg)** *atau* **jumlah kantong** — salah satu saja.
4. **Sertakan foto bukti sampah.** Boleh memotret langsung dari kamera HP.
   Fotonya **dikecilkan otomatis di HP warga** (maksimal ± 1000 piksel & ± 600 KB)
   supaya hemat kuota, lalu disimpan di **Google Drive** milik pengelola —
   yang tercatat di spreadsheet hanya ID berkasnya.
5. **Tekan “💬 Kirim Setoran & Chat Pengelola”.** Dua hal terjadi sekaligus:
   - catatannya masuk ke tab **📥 Setoran dari Warga** di dashboard petugas
     dengan status **Menunggu**, dan
   - muncul kotak berisi **chat WhatsApp siap kirim** untuk pengelola —
     berisi data diri, jenis sampah, perkiraan berat, perkiraan pendapatan,
     dan nomor catatannya. Warga tinggal menekan *kirim* di WhatsApp
     (fotonya **tidak perlu** dilampirkan lagi, sudah ikut terkirim).
6. Menyetor beberapa jenis sekaligus? Tekan **➕ Catat Setoran Lain** — data
   dirinya tetap terisi, tinggal pilih jenis & foto berikutnya.

> ⚠️ Setoran ini **belum menambah tabungan** warga. Angka beratnya masih
> perkiraan. Tabungan baru bertambah setelah **petugas menimbang dan
> menyetujuinya** di dashboard.
>
> Walaupun begitu, catatannya **langsung terlihat** oleh warga di
> **📜 Riwayat Setoran Anda** dengan lencana **⏳ Menunggu Persetujuan** —
> lalu berubah sendiri menjadi **✅ Disetujui** (beserta angka hasil timbangan
> petugas) atau **❌ Ditolak** (beserta alasannya) setelah diproses.

> Halaman ini juga bisa dibuka lewat tautan langsung berisi ID, mis.
> `bank-sampah.html?id=BS-0001` — praktis untuk dibagikan lewat WhatsApp.

### 🧑‍💼 Untuk petugas — halaman `admin-bank-sampah.html`

Masuk dengan **username + password**. Selama akun belum pernah diganti, yang
berlaku adalah **akun bawaan** dari `KONFIGURASI.BANK_SAMPAH.ADMIN`
(`petugasbanksampah116` / `banksampahkampung` — **GANTI lewat tab
🔐 Akun Petugas!**). Dashboardnya punya 6 tab:

| Tab | Isi |
| --- | --- |
| 👥 **Data Warga** | Tambah / ubah / hapus nasabah, lihat rincian tabungan tiap warga, penyaring (cari, RT, RW, status, sisa tabungan, keaktifan menyetor, pengurutan), unduh Excel. |
| 📥 **Setoran dari Warga** | Catatan setoran yang **diisi sendiri warga** dari HP-nya, lengkap dengan **foto bukti**. Tombol **👁️ Periksa** membuka fotonya ukuran besar + seluruh datanya, lalu petugas mengisi **berat hasil timbangan** dan menekan **✅ Setujui** (jadi setoran resmi) atau **✖️ Tolak** (disertai alasan). Punya penyaring & unduh Excel sendiri. |
| ⚖️ **Setoran Sampah** | Catat setoran (otomatis menghitung pendapatan), ubah/hapus setoran, tandai/batalkan "Sudah Dicairkan", penyaring (cari, jenis, status, RT, rentang tanggal, pengurutan) + baris TOTAL, unduh Excel. |
| 💵 **Pencairan** | Proses pengajuan warga (**✅ Setujui & Tandai Cair** / **✖️ Tolak**) dan **pencairan langsung** bila warga datang ke sekretariat. |
| 📖 **Cara Pakai** | Panduan lengkap alur kerja harian, cara mengisi setoran, arti istilah, dan catatan keamanan — bisa dibaca petugas kapan saja. |
| 🔐 **Akun Petugas** | **Ganti nama pengguna & kata sandi sendiri**, tanpa menyentuh kode. Wajib memasukkan akun lama dulu sebagai bukti. |

**Alur kerja singkat:** daftarkan warga (atau biarkan mereka mendaftar sendiri) →
catat ID Nasabah di buku tabungannya → **periksa & setujui setoran yang dikirim
warga** / catat sendiri setoran yang dibawa ke sekretariat → setujui pencairan
saat uang diserahkan.

> 🔔 Angka **📥 Setoran Warga Menunggu** di baris statistik dan **lencana merah**
> pada tab menunjukkan berapa catatan yang masih perlu diperiksa.

### 🔓 "Ingatkan Saya" — tidak perlu mengetik akun setiap kali

Biasanya petugas dianggap "sedang masuk" hanya selama tab-nya terbuka: begitu
website ditutup, kunjungan berikutnya harus mengetik akun lagi. Kalau kotak
**"Ingatkan Saya"** di layar masuk dicentang, dashboard menitipkan satu catatan
kecil di perangkat itu, sehingga kunjungan berikutnya **langsung masuk sendiri**
tanpa mengetik apa pun.

| Kejadian | Yang terjadi pada "Ingatkan Saya" |
| --- | --- |
| Website / tab ditutup, lalu dibuka lagi | ✅ **Tetap masuk** — dashboard terbuka sendiri |
| Sudah lewat **30 hari** sejak terakhir dipakai | 🔄 Habis masa berlakunya, diminta masuk seperti biasa |
| Menekan tombol **🚪 Keluar** | 🚫 **Dilupakan** — itulah gunanya tombol Keluar |
| Kata sandi diganti **dari perangkat lain** | 🚫 Ditolak server & dilupakan, disertai keterangan di layar |
| Kata sandi diganti **dari perangkat ini** | ✅ Ikut disegarkan sendiri, tetap masuk otomatis |
| Internet mati saat membuka dashboard | ✅ Dicocokkan dengan catatan akun di perangkat ini |

Selagi menunggu jawaban Google Sheets, layar menampilkan **"⏳ Sedang masuk
otomatis…"** beserta tombol **"Masuk dengan akun lain"** — jadi petugas tidak
pernah terkunci menunggu bila internetnya sedang lambat.

**Apa yang sebenarnya disimpan?** Hanya nama pengguna + **sidik acak SHA-256**
kata sandinya — persis seperti yang dikirim ke server saat masuk biasa. Kata
sandi aslinya **tidak pernah ikut tersimpan** dan tidak bisa dikembalikan dari
sidik itu. Setiap kali masuk otomatis, sidik tersebut **tetap diperiksa ulang ke
Google Sheets**, jadi ingatan lama benar-benar mati begitu akunnya diganti.

> ⚠️ **Jangan dicentang di HP/laptop yang dipakai bersama-sama.** Siapa pun yang
> memegang perangkat itu bisa langsung membuka dashboard tanpa kata sandi —
> peringatan ini juga tertulis di layar masuk.

### 🔐 Mengganti Nama Pengguna & Kata Sandi Petugas

Akun bawaan di `js/config.js` **tertulis apa adanya** dan bisa dibaca siapa saja
yang membuka berkas itu. Karena itu, sesudah website terpasang, **gantilah akun
petugas lewat dashboard** — tidak perlu menyentuh kode lagi:

1. Masuk ke `admin-bank-sampah.html` seperti biasa.
2. Buka tab **🔐 Akun Petugas**.
3. Isi **nama pengguna & kata sandi yang sekarang** (ini buktinya bahwa yang
   mengganti benar-benar Anda — bukan orang yang kebetulan menemukan layar ini
   dalam keadaan terbuka).
4. Isi **nama pengguna baru** (4–32 huruf/angka, tanpa spasi) dan **kata sandi
   baru** (minimal 8 huruf) — kata sandi baru diketik **dua kali**.
5. Klik **🔐 Simpan Akun Baru**, lalu **🚪 Keluar & Masuk Ulang** untuk
   memastikan akun barunya benar-benar berlaku.

Setelah tersimpan, **akun lama langsung mati** — di HP/laptop mana pun.

**Bagaimana kata sandinya disimpan?** Tidak pernah apa adanya. Browser
mengubahnya lebih dulu menjadi *sidik acak* **SHA-256** sepanjang 64 huruf, dan
hanya sidik itulah yang berjalan di jaringan dan tersimpan di tab **`AkunAdmin`**
Google Sheet. Sidik tersebut tidak bisa dikembalikan menjadi kata sandi aslinya —
jadi walaupun ada yang mengintip isi spreadsheet atau alamat permintaannya,
kata sandi Anda tetap tidak terbaca.

> ⚠️ **Agar berlaku di semua perangkat, `apps-script/CodeBankSampah.gs` harus
> di-deploy ulang** (*Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸
> Deploy*). Kalau belum, penggantian akun **tetap bisa dilakukan** — tetapi
> hanya berlaku di perangkat yang dipakai, dan dashboard akan mengatakannya
> terus terang di layar.

> 🔑 **Lupa kata sandi?** Buka Google Sheet bank sampah ▸ tab **`AkunAdmin`** ▸
> **hapus barisnya** (baris di bawah judul). Akun otomatis kembali ke akun
> bawaan di `js/config.js`. **Seluruh data warga, setoran, dan pencairan tetap
> aman** — yang terhapus hanya catatan akunnya.

> 📝 Sebelum akun pernah diganti, yang dipakai adalah `var AKUN_AWAL` di
> `CodeBankSampah.gs`. Samakan isinya dengan `BANK_SAMPAH.ADMIN` di
> `js/config.js` supaya penggantian pertama tidak ditolak.

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

Sheet-nya akan otomatis membuat 4 tab: **Nasabah**, **Setoran**, **Pengajuan**,
dan **SetoranWarga** (catatan setoran kiriman warga + foto buktinya).

> ⚠️ Sama seperti backend data karbon: setiap kali `CodeBankSampah.gs` diubah,
> Anda **wajib** melakukan **Deploy ▸ Manage deployments ▸ (pensil) ▸
> Version: New version ▸ Deploy**. Kalau tidak, Web App masih menjalankan kode lama.

#### ⚠️ Nama isian “rt” yang dipesan Google — kenapa RT dikirim sebagai `rtWarga`

Gerbang depan Google (`script.google.com`) memakai sendiri nama isian **`rt`**.
Permintaan dari browser yang ikut membawa isian bernama `rt` **ditolak dengan
galat 400** — padahal skripnya **tetap berjalan dan datanya tetap tersimpan**,
hanya balasannya yang tidak pernah sampai ke browser.

Dulu hal ini membuat warga **yang belum terdaftar** selalu melihat pesan
*“Server bank sampah belum menjawab…”* saat menyetor, walaupun namanya
sebenarnya sudah masuk ke tab **Nasabah** — dan setiap kali dicoba lagi,
warganya bertambah satu baris lagi.

Karena itu `js/bank-sampah-storage.js` mengirim RT dengan nama **`rtWarga`**,
lalu `CodeBankSampah.gs` mengembalikannya menjadi `rt`. **Nama kolom di
spreadsheet tetap “RT”** — tidak ada yang berubah bagi petugas.

> 🔁 **Karena itu `CodeBankSampah.gs` WAJIB di-deploy ulang** (Deploy ▸ Manage
> deployments ▸ ✏️ ▸ Version: **New version** ▸ Deploy). Selama belum
> di-deploy ulang, setoran warga **tetap tercatat dan tidak lagi error** —
> hanya kolom **RT**-nya saja yang kosong.

Kalau suatu saat menambah kolom baru, **hindari nama `rt`** (dan uji dulu nama
barunya) supaya masalah yang sama tidak terulang.

#### 📷 Izin Google Drive untuk foto bukti setoran

Foto yang dikirim warga **tidak** ditaruh di dalam spreadsheet (kepanjangan),
melainkan disimpan sebagai berkas gambar di **Google Drive milik pemilik Apps
Script**, di folder **“Foto Setoran Bank Sampah”** yang dibuat otomatis. Yang
tercatat di kolom *Foto Bukti* hanyalah **ID berkasnya**.

Karena itu, saat **foto pertama** masuk, Google akan meminta **izin tambahan**:

1. Buka Apps Script ▸ jalankan/kirim setoran pertama.
2. Muncul **Review permissions** → pilih akun Google Anda →
   **Advanced** → **Go to … (unsafe)** → **Allow**.
3. Setelah itu foto otomatis dibagikan sebagai *"siapa saja yang punya tautan
   bisa melihat"*, supaya bisa tampil di dashboard petugas.

> Kalau akun Google Anda milik sekolah/kantor yang **melarang berbagi ke publik**,
> fotonya tetap tersimpan dan bisa dibuka petugas selama mereka masuk memakai
> akun pemilik Drive-nya — hanya pratinjau di dashboard yang mungkin kosong.
> Bila foto sama sekali gagal disimpan, **setorannya tetap tercatat** (kolom
> fotonya saja yang kosong), sehingga warga tidak dirugikan.

### ⚙️ Pengaturan Bank Sampah di `js/config.js`

| Pengaturan | Arti | Default |
| --- | --- | --- |
| `BANK_SAMPAH.APPS_SCRIPT_URL` | URL Web App khusus bank sampah (kosong = simpan di perangkat) | `''` |
| `BANK_SAMPAH.token` | Kata sandi rahasia, harus sama dengan `TOKEN_RAHASIA` di `CodeBankSampah.gs` | `rahasia-bank-sampah-116` |
| `BANK_SAMPAH.ADMIN.username` | Username **bawaan** petugas — hanya berlaku sampai akun diganti lewat tab **🔐 Akun Petugas** | `petugasbanksampah116` |
| `BANK_SAMPAH.ADMIN.password` | Password **bawaan** petugas — hanya berlaku sampai akun diganti lewat tab **🔐 Akun Petugas** | `banksampahkampung` |
| `BANK_SAMPAH.PREFIX_ID` | Awalan ID nasabah otomatis (`BS-0001`, …) | `BS` |
| `BANK_SAMPAH.JENIS` | **Daftar jenis sampah + harga per kg + ikon + keterangan.** Dipakai serentak oleh formulir warga, formulir petugas, penyaring, dan tabel harga | Botol Plastik `3000`, Kardus `1500`, Rak Telur `1000`, Gelas Plastik `2500`, Lain-lain `1000` |
| `BANK_SAMPAH.HARGA_PER_KG.kering` | Harga sampah kering per kg (Rp) — **hanya untuk riwayat lama** | `2000` |
| `BANK_SAMPAH.HARGA_PER_KG.basah` | Harga sampah basah per kg (Rp) — **hanya untuk riwayat lama** | `500` |
| `BANK_SAMPAH.SETORAN_WARGA.FOTO_MAKS_PIKSEL` | Sisi terpanjang foto bukti setelah dikecilkan (piksel) | `1000` |
| `BANK_SAMPAH.SETORAN_WARGA.FOTO_MUTU` | Mutu JPEG foto bukti (0–1) | `0.72` |
| `BANK_SAMPAH.SETORAN_WARGA.FOTO_MAKS_KB` | Batas ukuran foto yang dikirim (KB) | `600` |
| `BANK_SAMPAH.KG_PER_KANTONG` | Perkiraan berat 1 kantong bila tidak ditimbang (kg) | `3` |
| `BANK_SAMPAH.MIN_PENCAIRAN` | Tabungan minimal yang boleh diajukan warga (Rp) | `10000` |
| `BANK_SAMPAH.PENGELOLA.nama` | Nama pengelola yang menerima chat WhatsApp | `Pengelola Bank Sampah Kampung Baru` |
| `BANK_SAMPAH.PENGELOLA.wa` | Nomor WA untuk tautan `wa.me` — **format internasional**, tanpa `+` & spasi (`0813…` → `62813…`) | `6281355210234` |
| `BANK_SAMPAH.PENGELOLA.waTampil` | Nomor WA yang ditampilkan di layar | `+62 813-5521-0234` |
| `BANK_SAMPAH.LOKASI.nama` | Nama tempat pada kartu peta | `Bank Sampah Kampung Baru` |
| `BANK_SAMPAH.LOKASI.patokan` | Patokan lokasi | `Tepat di belakang Posyandu` |
| `BANK_SAMPAH.LOKASI.alamat` | Alamat lengkap | `Kelurahan Kampung Baru, Kec. Bacukiki Barat, Kota Parepare` |
| `BANK_SAMPAH.LOKASI.lat` / `.lng` | Titik koordinat untuk tombol **petunjuk arah** | `-4.020724` / `119.625485` |

> Bila `MIN_PENCAIRAN` diubah, ubah juga `var MIN_PENCAIRAN` di
> `apps-script/CodeBankSampah.gs` agar pemeriksaan di server ikut menyesuaikan.

> **`BANK_SAMPAH.ADMIN` hanyalah akun bawaan.** Begitu petugas mengganti akunnya
> dari tab **🔐 Akun Petugas**, isian ini **tidak berlaku lagi** — yang dipakai
> adalah akun di tab `AkunAdmin` pada Google Sheet. Bila Anda memakai Google
> Sheets, samakan juga `var AKUN_AWAL` di `apps-script/CodeBankSampah.gs`
> (dipakai sebelum akun pernah diganti), lalu **deploy versi baru**.

> **Mengubah jenis sampah / harganya.** Cukup ubah `BANK_SAMPAH.JENIS` di
> `js/config.js` — seluruh halaman langsung ikut. Bila Anda memakai Google
> Sheets, samakan juga `var HARGA_JENIS` di `apps-script/CodeBankSampah.gs`
> (dipakai sebagai cadangan saat petugas tidak mengisi sendiri harganya), lalu
> **deploy versi baru**. Jangan mengganti **nama** jenis yang sudah terlanjur
> ada datanya — riwayat lama dicocokkan berdasarkan namanya. Kalau tetap
> diganti, setoran lama tetap aman: jenisnya ditampilkan apa adanya dan tetap
> muncul di penyaring dengan tanda *(jenis lama)*.

> **Mengganti peta.** Gambar petanya sendiri adalah `<iframe>` Google Maps yang
> ditulis langsung di `index.html` & `bank-sampah.html` (cari komentar
> `LOKASI & PETA BANK SAMPAH`). Untuk memindahkan titiknya: buka Google Maps ▸
> **Bagikan ▸ Sematkan peta**, salin `src` iframe-nya ke kedua halaman, lalu
> samakan juga `LOKASI.lat` & `LOKASI.lng` di `js/config.js` supaya tombol
> petunjuk arahnya ikut menunjuk ke tempat yang sama.

---

## 🗺️ Peta Mitigasi Bencana

Halaman `peta-mitigasi-bencana.html` menampilkan **peta interaktif** Kelurahan
Kampung Baru beserta sebagian kelurahan tetangga di sisi kiri dan kanan.

### Isi halaman

- **Peta interaktif besar** (Leaflet + citra satelit Esri, bisa diganti ke peta jalan)
  dengan zona **merah / kuning / hijau**, **arah evakuasi berpanah di seluruh jalan**, **titik kumpul**,
  batas kelurahan, nama jalan, dan fasilitas umum.
- **Instruksi Evakuasi** — 4 langkah yang harus dilakukan warga saat bencana.
- **Informasi Legenda Map** — arti tiap warna & simbol.
- **Kelas Bahaya** — tabel data resmi dari dokumen KRB Kota Parepare.
- **Nomor Emergency** — 112, BPBD, Polisi, Ambulans, Damkar, Basarnas (bisa langsung ditelepon).
- **Keterangan** — sumber data & cara membaca peta.

### Yang bisa diklik warga

| Diklik | Yang muncul |
| --- | --- |
| Area berwarna | Zona, ancaman, luas, dan tindakan yang harus dilakukan |
| Garis jalan | Nama jalan, koordinat, zona, jarak & arah ke titik kumpul |
| Garis hijau berpanah | Panjang jalur, perkiraan waktu jalan kaki, jalan yang dilewati |
| Titik mana pun | Koordinat, zona wilayahnya, dan petunjuk arah ke titik kumpul |
| Tombol 🧭 "Di Zona Mana Saya?" | Posisi warga lewat GPS + zona tempat ia berdiri |

### Zona & dasar penyusunannya

Zona dibagi berdasarkan **ketinggian lahan (DEM SRTM 30 m)**, dikalibrasi supaya
luasnya mendekati angka **Dokumen Kajian Risiko Bencana Kota Parepare 2022–2026**
untuk Kelurahan Kampung Baru:

| Zona | Ketinggian | Luas | Pembanding dokumen KRB |
| --- | --- | --- | --- |
| 🔴 Merah — Risiko Tinggi | 0 – 9 mdpl | 5,32 Ha (11,6%) | bahaya tsunami **5,49 Ha**, kelas **TINGGI** |
| 🟡 Kuning — Risiko Sedang | 9 – 15 mdpl | 12,62 Ha (27,5%) | gelombang ekstrim & abrasi 10,98 Ha; banjir 2,40 Ha |
| 🟢 Hijau — Risiko Rendah | > 15 mdpl | 27,95 Ha (60,9%) | sisa wilayah |

**Titik kumpul:** `-4.019402, 119.626271` — lapangan/area terbuka sekitar
Jl. Kesuma Timur, berada di **zona hijau ± 15 mdpl**, ± 322 m dari zona merah.

### Memperbarui data peta

Data peta ada di `data/peta-mitigasi-data.js` dan **sudah jadi** — tidak perlu
dibuat ulang untuk menjalankan situs. Bila batas wilayah berubah, ada jalan baru,
atau titik kumpul dipindahkan, jalankan ulang skrip di `tools/peta-mitigasi/`
(petunjuk lengkapnya ada di `tools/peta-mitigasi/README.md`).

> ⚠️ Peta ini adalah **alat bantu edukasi dan panduan evakuasi mandiri**, bukan
> dokumen resmi tata ruang. Selalu utamakan informasi dan arahan resmi dari
> **BMKG, BPBD Kota Parepare, dan aparat kelurahan**.

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

Lihat **`assets/README.md`**. Ringkasnya:

- **`LogoKKarbon.png`** — logo resmi website. Dipakai sebagai logo di menu atas
  sekaligus ikon situs (gambar kecil di tab peramban dan pintasan layar utama
  ponsel). Halaman web memanggil salinan kecilnya — `logo-kkarbon-32.png`,
  `logo-kkarbon-180.png`, dan `logo-kkarbon-192.png` — agar tetap ringan. Bila
  logo diganti, salinan itu perlu dibuat ulang; perintahnya ada di
  `assets/README.md`.
- **`latar-parepare.jpg`** — foto latar hero.

Bila berkasnya belum ada, website tetap tampil rapi memakai emblem & gradien
bawaan.

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

> **Penting saat mengubah tampilan.** Halaman `.html` selalu diambil baru dari
> server, sedangkan berkas di `css/` dan `js/` boleh disimpan peramban. Dulu
> keduanya bisa berpasangan salah — HTML baru dengan CSS lama dari *cache* —
> dan itu sempat membuat tombol "✕ Keluar" di peta mitigasi muncul polos serta
> mendorong judul peta sampai terpotong. Dua pengaman dipakai sekarang:
>
> 1. `vercel.json` menyetel `Cache-Control: public, max-age=0, must-revalidate`
>    untuk `/css/` dan `/js/`, jadi peramban selalu memastikan berkasnya masih
>    yang terbaru sebelum memakainya.
> 2. `peta-mitigasi-bencana.html` memanggil berkas petanya dengan penanda versi
>    (`css/peta-mitigasi.css?v=3` dan `js/peta-mitigasi.js?v=3`).
>    **Naikkan angka `?v=` itu setiap kali salah satu berkas tersebut diubah.**

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
- **Segera ganti akun petugas bank sampah lewat tab 🔐 Akun Petugas.** Selama
  masih memakai akun bawaan, kata sandinya tertulis apa adanya di `js/config.js`
  dan bisa dibaca siapa saja yang membuka berkas itu. Setelah diganti, yang
  tersimpan hanyalah **sidik acak SHA-256** di Google Sheets — kata sandinya
  tidak lagi tertulis di mana pun, dan tidak pernah ikut menempel di alamat URL.
  (Pemeriksaannya tetap berjalan di browser, jadi ini **memperkecil** risiko,
  bukan menghapusnya.)
- **Pemisahan akses admin** dilakukan lewat akun, spreadsheet, dan Apps Script
  yang berbeda — jadi petugas bank sampah tidak melihat data karbon dan
  sebaliknya. Namun karena keduanya client-side, jangan pakai kata sandi yang
  sama dengan akun penting lain.
- **Ganti akun petugas setiap ada pergantian pengurus**, agar petugas lama tidak
  lagi bisa membuka data warga.
- **Halaman Cek Bank Sampah bisa dibuka siapa saja yang tahu ID Nasabah**
  (itulah cara warga mengaksesnya tanpa perlu membuat akun). Karena itu halaman
  tersebut hanya menampilkan data tabungan warga bersangkutan — bukan daftar
  seluruh warga. Sampaikan ke warga agar ID Nasabahnya tidak disebarkan
  sembarangan, dan **jangan** memakai NIK sebagai ID Nasabah.
- **No. HP & NIK warga dibuat opsional.** Sampaikan kepada warga bahwa data
  dipakai hanya untuk keperluan program lingkungan & bank sampah.
- **Formulir “Catat Setoran Sampah” terbuka untuk umum** — memang harus begitu,
  karena warga yang belum terdaftar pun boleh memakainya. Akibatnya siapa pun
  bisa mengirim catatan setoran. Itu sebabnya setiap catatan **wajib disetujui
  petugas** dulu sebelum menambah tabungan, dan **foto bukti diwajibkan**.
  Periksa fotonya baik-baik sebelum menekan ✅ Setujui; catatan yang mencurigakan
  cukup ditolak atau dihapus.
- **Foto bukti setoran tersimpan di Google Drive pemilik Apps Script** dan
  dibagikan sebagai *"siapa saja yang punya tautan bisa melihat"* agar bisa
  tampil di dashboard. Tautannya panjang & acak sehingga sulit ditebak, tetapi
  **jangan menyebarkan tautannya**. Foto yang sudah tidak diperlukan boleh
  dihapus dari folder **“Foto Setoran Bank Sampah”** di Drive.
- Angka faktor emisi & batas kategori adalah **perkiraan yang masuk akal**;
  silakan disesuaikan bila Dinas Lingkungan Hidup memiliki data resmi terbaru.

---

Dibuat dengan 💚 untuk warga **Kampung Baru, Kota Parepare** ·
Program KKN × Dinas Lingkungan Hidup Kota Parepare.
