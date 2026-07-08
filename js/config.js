/* ============================================================================
 *  KONFIGURASI KALKULATOR JEJAK KARBON — KAMPUNG BARU, KOTA PAREPARE
 *  ----------------------------------------------------------------------------
 *  SEMUA NILAI DI BAWAH INI SENGAJA DIBUAT MUDAH DIUBAH.
 *  Petugas Dinas Lingkungan Hidup / mahasiswa KKN cukup mengganti angkanya
 *  di sini tanpa perlu menyentuh kode perhitungan.
 *
 *  Sumber angka = perkiraan umum (rata-rata Indonesia). Silakan sesuaikan
 *  bila ada data resmi yang lebih baru.
 * ========================================================================== */

const KONFIGURASI = {

  /* ------------------------------------------------------------------
   * 1) FAKTOR EMISI  (berapa kg CO₂e untuk setiap 1 satuan aktivitas)
   * ------------------------------------------------------------------ */
  FAKTOR_EMISI: {
    listrik_per_kwh: 0.85,   // 1 kWh listrik  → 0,85 kg CO₂  (rata-rata jaringan PLN)
    lpg_per_kg: 2.98,        // 1 kg gas elpiji → 2,98 kg CO₂
    bensin_per_liter: 2.30,  // 1 liter bensin  → 2,30 kg CO₂
    solar_per_liter: 2.68,   // 1 liter solar   → 2,68 kg CO₂ (bila dipakai)

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
   * ------------------------------------------------------------------ */
  AMBANG_KATEGORI: {
    rendah_maks: 5,   // < 5 kg/hari  → Rendah
    sedang_maks: 15,  // 5–15 kg/hari → Sedang ; > 15 → Tinggi
  },

  /* ------------------------------------------------------------------
   * 6) PENYIMPANAN DATA (Google Sheets lewat Google Apps Script)
   *    Tempel URL "Web App" hasil deploy Apps Script Anda di sini.
   *    Panduan lengkap ada di README.md.
   *    Bila dikosongkan, data tetap tersimpan sementara di perangkat
   *    (localStorage) sebagai cadangan.
   * ------------------------------------------------------------------ */
  APPS_SCRIPT_URL: '', // contoh: 'https://script.google.com/macros/s/AKfycb.../exec'

  /* ------------------------------------------------------------------
   * 7) DASHBOARD ADMIN
   *    - password : untuk membuka halaman admin (GANTI!)
   *    - token    : kata sandi rahasia yang HARUS SAMA dengan di Code.gs
   *      (dipakai agar tidak sembarang orang bisa menarik data warga)
   * ------------------------------------------------------------------ */
  ADMIN: {
    password: 'admin123',
    token: 'rahasia-kkn-116',
  },

  /* ------------------------------------------------------------------
   * 8) INFO KONTAK (dipakai di footer)
   * ------------------------------------------------------------------ */
  KONTAK: {
    instansi: 'Dinas Lingkungan Hidup Kota Parepare',
    telepon: '081280933445',
    alamat: 'Jl. Jend. Ahmad Yani Km. 6, Parepare',
  },
};

// Nama "kunci" penyimpanan cadangan di perangkat (localStorage)
const KUNCI_SIMPANAN_LOKAL = 'jejakKarbonKampungBaru';
