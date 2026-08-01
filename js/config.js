/* ============================================================================
 *  KONFIGURASI KALKULATOR JEJAK KARBON — KAMPUNG BARU, KOTA PAREPARE
 *  ----------------------------------------------------------------------------
 *  SEMUA NILAI DI BAWAH INI SENGAJA DIBUAT MUDAH DIUBAH.
 *  Petugas Dinas Lingkungan Hidup / mahasiswa KKN cukup mengganti angkanya
 *  di sini tanpa perlu menyentuh kode perhitungan.
 *
 *  SUMBER DATA RESMI (dipakai sebagai acuan Dinas Lingkungan Hidup):
 *   - Listrik : "Faktor Emisi GRK Sistem Ketenagalistrikan Tahun 2019",
 *               Ditjen Ketenagalistrikan, Kementerian ESDM.
 *               Parepare berada di "Sistem Sulselbar" (Sulawesi Selatan–Barat),
 *               Operating Margin (OM) = 0,73 ton CO₂/MWh = 0,73 kg CO₂/kWh.
 *   - BBM/Gas : "Nilai Faktor Emisi (FE) CO₂ Nasional dan NCV", Kementerian ESDM
 *               (dihitung: FE[ton CO₂/TJ] × NCV[TJ/Gg] ÷ 1000 × massa jenis).
 *               Bensin ≈ 2,31 kg/L · Solar ≈ 2,68 kg/L · LPG ≈ 3,0 kg/kg.
 *   - Batas kategori : mengacu rata-rata emisi rumah tangga & per kapita
 *               nasional (lihat catatan pada bagian AMBANG_KATEGORI).
 *  Silakan perbarui bila Dinas LH memiliki angka resmi yang lebih baru.
 * ========================================================================== */

const KONFIGURASI = {

  /* ------------------------------------------------------------------
   * 1) FAKTOR EMISI  (berapa kg CO₂e untuk setiap 1 satuan aktivitas)
   * ------------------------------------------------------------------ */
  FAKTOR_EMISI: {
    listrik_per_kwh: 0.73,   // 1 kWh → 0,73 kg CO₂  (Sistem Sulselbar OM, ESDM 2019)
    lpg_per_kg: 3.00,        // 1 kg gas elpiji → 3,0 kg CO₂  (ESDM Nasional)
    bensin_per_liter: 2.31,  // 1 liter bensin  → 2,31 kg CO₂ (ESDM Nasional)
    solar_per_liter: 2.68,   // 1 liter solar   → 2,68 kg CO₂ (ESDM Nasional, bila dipakai)

    // Sampah — dibedakan berdasarkan cara membuang
    sampah_bakar_per_kg: 1.20, // 1 kg sampah DIBAKAR → 1,20 kg CO₂e (asap + metana)
    sampah_tpa_per_kg: 0.70,   // 1 kg sampah ke TPA  → 0,70 kg CO₂e (gas metana)

    // Aktivitas tambahan (opsional)
    ac_per_jam: 0.64,                    // 1 jam AC (± 1 PK) → 0,64 kg CO₂
    transportasi_umum_per_perjalanan: 1.50, // 1 kali naik angkot/bus → 1,50 kg CO₂
    barang_baru_per_item: 5.00,          // 1 barang baru (baju/elektronik) → 5 kg CO₂
    daging_per_porsi: 3.00,              // 1 porsi daging → 3 kg CO₂
  },

  /* ------------------------------------------------------------------
   * 2) KREDIT / POTONGAN emisi sampah (nilai 0–1, mis. 0,15 = potong 15%)
   * ------------------------------------------------------------------ */
  KREDIT: {
    memilah: 0.15,  // rajin memilah sampah → emisi sampah dipotong 15%
    kompos: 0.25,   // mengompos sampah organik → emisi sampah dipotong 25%
  },

  /* ------------------------------------------------------------------
   * 3) PERKIRAAN BERAT SAMPAH
   * ------------------------------------------------------------------ */
  SAMPAH: {
    kg_per_kantong: 3,          // 1 kantong sampah ± 3 kg
    kg_per_orang_per_hari: 0.5, // bila kantong tidak diisi → 0,5 kg/orang/hari
  },

  /* ------------------------------------------------------------------
   * 4) TARIF LISTRIK — untuk mengubah "Tagihan Rp" menjadi "kWh"
   *    (kWh = Tagihan ÷ Tarif). Sesuaikan dengan golongan tarif warga.
   * ------------------------------------------------------------------ */
  TARIF_LISTRIK_PER_KWH: 1444.70, // Rp per kWh (golongan rumah tangga umum)

  /* ------------------------------------------------------------------
   * 5) BATAS KATEGORI (kg CO₂e per hari, untuk satu rumah tangga)
   *    Rendah  : di bawah rendah_maks
   *    Sedang  : rendah_maks sampai sedang_maks
   *    Tinggi  : di atas sedang_maks
   *
   *    Dasar acuan: rata-rata emisi energi rumah tangga di Indonesia untuk
   *    cakupan kalkulator ini (listrik + elpiji + kendaraan + sampah)
   *    ± 6–8 kg CO₂e/hari/rumah tangga, atau setara ± 2 kg CO₂e/hari/orang.
   *    Maka: di bawah rata-rata = Rendah, sekitar rata-rata = Sedang,
   *    jauh di atas rata-rata = Tinggi. Sesuaikan bila Dinas LH punya data lokal.
   * ------------------------------------------------------------------ */
  AMBANG_KATEGORI: {
    rendah_maks: 5,   // < 5 kg/hari   → Rendah  (di bawah rata-rata)
    sedang_maks: 12,  // 5–12 kg/hari  → Sedang  (sekitar rata-rata) ; > 12 → Tinggi
  },

  /* ------------------------------------------------------------------
   * 5b) DAMPAK PADA SUHU BUMI  (untuk pesan "bayangkan jika bersama-sama")
   *
   *   Ilmuwan iklim memakai hubungan LINEAR: setiap tambahan CO₂ menaikkan
   *   suhu bumi dengan takaran tetap. Menurut SRM360
   *   ("Every tonne of CO₂ adds to global warming", srm360.org) dan sejalan
   *   dengan angka TCRE IPCC:
   *
   *      setiap 1 TRILIUN ton CO₂  →  suhu bumi naik ± 0,45 °C
   *
   *   Dari sini kita bisa memperkirakan dampak bila banyak rumah tangga
   *   berperilaku sama. Angka penduduk/rumah tangga memakai perkiraan
   *   SELURUH DUNIA — silakan ganti bila ingin memakai skala lain
   *   (mis. Indonesia: ± 70.000.000 rumah tangga & 280.000.000 jiwa).
   * ------------------------------------------------------------------ */
  PEMANASAN: {
    derajat_per_triliun_ton_co2: 0.45, // °C per 1 triliun (1e12) ton CO₂  (SRM360 / TCRE)
    jumlah_rumah_tangga: 2000000000,   // ± 2 miliar rumah tangga di seluruh dunia
    jumlah_jiwa: 8000000000,           // ± 8 miliar jiwa (hampir seluruh penduduk bumi)
    label_wilayah: 'di seluruh dunia', // ikut narasi (mis. 'di Indonesia' bila skala nasional)
    tahun_proyeksi: 30,                // proyeksi 1 generasi (± 30 tahun)
  },

  /* ------------------------------------------------------------------
   * 6) PENYIMPANAN DATA (Google Sheets lewat Google Apps Script)
   *    Tempel URL "Web App" hasil deploy Apps Script Anda di sini.
   *    Panduan lengkap ada di README.md.
   *    Bila dikosongkan, data tetap tersimpan sementara di perangkat
   *    (localStorage) sebagai cadangan.
   * ------------------------------------------------------------------ */
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwBrb-oacuz1HMd3_rthuRxbuY7wFGNpUf4s4Nhylae2nG1hWh0noWOmQqGst0jEzgj6Q/exec', // contoh: 'https://script.google.com/macros/s/AKfycb.../exec'

  /* ------------------------------------------------------------------
   * 7) DASHBOARD ADMIN
   *    - password : untuk membuka halaman admin (GANTI!)
   *    - token    : kata sandi rahasia yang HARUS SAMA dengan di Code.gs
   *      (dipakai agar tidak sembarang orang bisa menarik data warga)
   * ------------------------------------------------------------------ */
  ADMIN: {
    password: 'kampungbaru116',
    token: 'rahasia-kkn-116-kampungbaru',
  },

  /* ------------------------------------------------------------------
   * 7b) BANTUAN SISTEM WEB — anggota KKN yang mengurus programnya
   *
   *   Petugas & pengelola bank sampah TIDAK perlu mengurus hal teknis
   *   (berkas program, penyimpanan online, dan sejenisnya). Tugas mereka
   *   cukup mengelola DATA WARGA. Kalau ada yang tidak beres pada
   *   dashboard, mereka cukup menghubungi nomor di bawah ini — nomornya
   *   muncul sendiri di layar dashboard, jadi tidak perlu dihafal.
   *
   *   Ganti isian ini bila penanggung jawabnya berganti orang.
   * ------------------------------------------------------------------ */
  BANTUAN: {
    nama: 'Ahmad Ghulam Ghazi',
    peran: 'Anggota KKN 116',

    /* Nomor untuk tautan wa.me — WAJIB format internasional: tanpa tanda "+",
     * tanpa spasi, dan angka 0 di depan diganti 62.
     * Contoh: 0897 9802 427  →  628979802427 */
    wa: '628979802427',

    /* Nomor yang ditampilkan di layar (boleh pakai spasi/strip) */
    waTampil: '0897-9802-427',
  },

  /* ------------------------------------------------------------------
   * 8) INFO KONTAK (dipakai di footer)
   * ------------------------------------------------------------------ */
  KONTAK: {
    instansi: 'Dinas Lingkungan Hidup Kota Parepare',
    telepon: '081280933445',
    alamat: 'Jl. Jend. Ahmad Yani Km. 6, Parepare',
  },

  /* ------------------------------------------------------------------
   * 9) BANK SAMPAH  (halaman "Cek Bank Sampah" & dashboard adminnya)
   *
   *    ⚠️ SENGAJA DIPISAH dari data karbon di atas:
   *       - Spreadsheet & Apps Script-nya BERBEDA (URL sendiri).
   *       - Username & password adminnya BERBEDA.
   *    Jadi petugas bank sampah tidak bisa membuka data karbon,
   *    dan sebaliknya.
   
   * ------------------------------------------------------------------ */
  BANK_SAMPAH: {
    /* URL "Web App" hasil deploy apps-script/CodeBankSampah.gs.
     * Bila dikosongkan, seluruh data bank sampah tersimpan di perangkat
     * (localStorage) sehingga fitur tetap bisa dicoba tanpa internet. */
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwWq3ECb3T-Sww_VT8X06M0hcehX3zylYflJd0QIzu1IHq_h6_EHlrpEcgMPHwZVJoB/exec',

    /* Kata sandi rahasia — HARUS SAMA dengan TOKEN_RAHASIA di CodeBankSampah.gs */
    token: 'rahasia-bank-sampah-116',

    /* Akun admin bank sampah (GANTI!) — beda dari admin data karbon */
    ADMIN: {
      username: 'petugasbanksampah116',
      password: 'banksampahkampung',
    },

    /* Awalan ID nasabah yang dibuat otomatis → BS-0001, BS-0002, … */
    PREFIX_ID: 'BS',

    /* ----------------------------------------------------------------
     * JENIS SAMPAH YANG DITERIMA BANK SAMPAH
     *
     * Daftar inilah yang muncul di SEMUA tempat sekaligus:
     *   - pilihan "Setoran Sampah" pada formulir warga (bank-sampah.html)
     *   - pilihan & penyaring "Jenis Sampah" di dashboard petugas
     *   - tabel "Perkiraan Harga Sampah" di halaman warga
     *
     * Menambah / menghapus jenis cukup dilakukan di sini.
     *   nama   : ditulis apa adanya ke Google Sheets — JANGAN diubah
     *            setelah ada data masuk, nanti riwayat lama tidak cocok.
     *   harga  : harga beli per kg (Rp) → dipakai menghitung pendapatan warga.
     *   ikon   : emoji untuk mempercantik tampilan.
     *   ket    : keterangan singkat supaya warga tidak salah pilih.
     *   isian  : true → warga wajib menuliskan keterangannya sendiri
     *            (dipakai oleh "Lain-lain").
     * ---------------------------------------------------------------- */
    JENIS: [
      { nama: 'Botol Plastik', ikon: '🍶', harga: 3000,
        ket: 'Botol air mineral & botol minuman. Buang isinya, lalu keringkan.' },
      { nama: 'Kardus', ikon: '📦', harga: 1500,
        ket: 'Kardus bekas, dus mi instan, dus air mineral. Dilipat & jangan basah.' },
      { nama: 'Rak Telur', ikon: '🥚', harga: 1000,
        ket: 'Tatakan/rak telur dari kertas. Pastikan tidak berjamur.' },
      { nama: 'Gelas Plastik', ikon: '🥤', harga: 2500,
        ket: 'Gelas air mineral & gelas minuman. Lepas sedotan dan bilas dulu.' },
      { nama: 'Lain-lain', ikon: '♻️', harga: 1000, isian: true,
        ket: 'Jenis lain (kaleng, besi, kertas, dll.) — tuliskan keterangannya.' },
    ],

    /* Harga beli sampah per kg (Rp) untuk PENGELOMPOKAN LAMA
     * (kering/basah). Masih dipakai supaya riwayat setoran yang sudah
     * terlanjur tercatat sebagai "Kering"/"Basah" tetap terbaca. Setoran
     * baru memakai daftar JENIS di atas. */
    HARGA_PER_KG: {
      kering: 2000, // plastik, kertas, kaleng, botol
      basah: 500,   // sisa dapur/organik untuk kompos
    },

    /* ----------------------------------------------------------------
     * SETORAN MANDIRI OLEH WARGA (halaman bank-sampah.html)
     *
     * Warga — sudah terdaftar maupun belum — mencatat sendiri sampah yang
     * disetor beserta FOTO BUKTINYA. Catatan itu masuk ke dashboard
     * petugas untuk DISETUJUI atau DITOLAK, sekaligus disiapkan sebagai
     * chat WhatsApp ke pengelola.
     * ---------------------------------------------------------------- */
    SETORAN_WARGA: {
      /* Foto bukti dikecilkan dulu di HP warga sebelum dikirim, supaya
       * hemat kuota dan tidak ditolak server. */
      FOTO_MAKS_PIKSEL: 1000,  // sisi terpanjang foto (piksel)
      FOTO_MUTU: 0.72,         // mutu JPEG 0–1 (makin kecil, makin ringan)
      FOTO_MAKS_KB: 600,       // batas akhir ukuran foto yang dikirim (KB)
    },

    /* Perkiraan berat 1 kantong (kg) — dipakai bila petugas hanya
     * menghitung jumlah kantong, bukan menimbang. */
    KG_PER_KANTONG: 3,

    /* Pendapatan minimal (Rp) yang boleh diajukan warga untuk dicairkan */
    MIN_PENCAIRAN: 10000,

    /* ----------------------------------------------------------------
     * PENGELOLA BANK SAMPAH  (dihubungi warga lewat WhatsApp)
     *
     * Saat warga menekan "Ajukan Pencairan Pendapatan", halaman warga
     * langsung membuka WhatsApp ke nomor ini dengan pesan yang sudah
     * berisi Nama, NIK, ID Nasabah, rincian sampah, dan jumlah yang
     * ingin dicairkan.
     * ---------------------------------------------------------------- */
    PENGELOLA: {
      nama: 'Pengelola Bank Sampah Kampung Baru',

      /* Nomor untuk tautan wa.me — WAJIB format internasional:
       * tanpa tanda "+", tanpa spasi, dan angka 0 di depan diganti 62.
       * Contoh: 0813 5521 0234  →  6281355210234 */
      wa: '6281355210234',

      /* Nomor yang ditampilkan di layar (boleh pakai spasi/strip) */
      waTampil: '+62 813-5521-0234',
    },

    /* ----------------------------------------------------------------
     * LOKASI SEKRETARIAT BANK SAMPAH
     * Dipakai untuk peta, keterangan patokan, & tombol petunjuk arah.
     * Titik koordinat diambil dari peta Google Maps "Bank Sampah
     * Kampung Baru".
     * ---------------------------------------------------------------- */
    LOKASI: {
      nama: 'Bank Sampah Kampung Baru',
      patokan: 'Tepat di belakang Posyandu',
      alamat: 'Kelurahan Kampung Baru, Kec. Bacukiki Barat, Kota Parepare',
      lat: -4.020724,
      lng: 119.625485,
    },
  },
};

// Nama "kunci" penyimpanan cadangan di perangkat (localStorage)
const KUNCI_SIMPANAN_LOKAL = 'jejakKarbonKampungBaru';
