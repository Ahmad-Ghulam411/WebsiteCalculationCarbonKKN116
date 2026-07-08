/* ============================================================================
 *  LOGIKA PERHITUNGAN JEJAK KARBON
 *  ----------------------------------------------------------------------------
 *  Semua aktivitas diubah ke satuan "per HARI" lalu dijumlahkan.
 *   - data bulanan  → dibagi 30
 *   - data mingguan → dibagi 7
 * ========================================================================== */

/**
 * Menghitung emisi harian (kg CO₂e/hari) dari data yang diisi warga.
 * @param {Object} data - data dari formulir
 * @returns {Object} { rincian, total, kwhBulan, sampahKgHari }
 */
function hitungEmisi(data) {
  const F = KONFIGURASI.FAKTOR_EMISI;

  /* ---- 1. LISTRIK -------------------------------------------------- */
  let kwhBulan = 0;
  if (data.modeListrik === 'tagihan') {
    // Ubah rupiah tagihan menjadi perkiraan kWh
    kwhBulan = (data.tagihanListrik || 0) / KONFIGURASI.TARIF_LISTRIK_PER_KWH;
  } else {
    kwhBulan = data.kwhListrik || 0;
  }
  const emisiListrik = (kwhBulan / 30) * F.listrik_per_kwh;

  /* ---- 2. GAS ELPIJI ---------------------------------------------- */
  // jenisTabung berisi berat tabung dalam kg (3 atau 12)
  const kgLpgBulan = (data.jenisTabung || 0) * (data.jumlahTabung || 0);
  const emisiGas = (kgLpgBulan / 30) * F.lpg_per_kg;

  /* ---- 3. KENDARAAN BERMOTOR (bensin) ----------------------------- */
  const emisiKendaraan = ((data.bensinMinggu || 0) / 7) * F.bensin_per_liter;

  /* ---- 4. SAMPAH --------------------------------------------------- */
  let sampahKgHari;
  if (data.kantongMinggu && data.kantongMinggu > 0) {
    sampahKgHari = (data.kantongMinggu * KONFIGURASI.SAMPAH.kg_per_kantong) / 7;
  } else {
    const jiwa = data.anggotaKeluarga && data.anggotaKeluarga > 0 ? data.anggotaKeluarga : 1;
    sampahKgHari = jiwa * KONFIGURASI.SAMPAH.kg_per_orang_per_hari;
  }
  // Membakar sampah menghasilkan emisi lebih besar daripada dibuang ke TPA
  const faktorDasarSampah = data.membakar ? F.sampah_bakar_per_kg : F.sampah_tpa_per_kg;
  let emisiSampah = sampahKgHari * faktorDasarSampah;
  // Potongan bila warga memilah / mengompos
  if (data.memilah) emisiSampah *= (1 - KONFIGURASI.KREDIT.memilah);
  if (data.mengompos) emisiSampah *= (1 - KONFIGURASI.KREDIT.kompos);

  /* ---- 5. AKTIVITAS LAIN (opsional) ------------------------------- */
  const emisiAC = (data.acJam || 0) * F.ac_per_jam;                             // jam/hari
  const emisiTransUmum = ((data.transUmumMinggu || 0) * F.transportasi_umum_per_perjalanan) / 7;
  const emisiBarang = ((data.barangBaruBulan || 0) * F.barang_baru_per_item) / 30;
  const emisiDaging = ((data.dagingMinggu || 0) * F.daging_per_porsi) / 7;
  const emisiLain = emisiAC + emisiTransUmum + emisiBarang + emisiDaging;

  /* ---- TOTAL ------------------------------------------------------- */
  const rincian = {
    listrik: bulatkan(emisiListrik),
    gas: bulatkan(emisiGas),
    kendaraan: bulatkan(emisiKendaraan),
    sampah: bulatkan(emisiSampah),
    lain: bulatkan(emisiLain),
  };
  const total = bulatkan(emisiListrik + emisiGas + emisiKendaraan + emisiSampah + emisiLain);

  return { rincian, total, kwhBulan: bulatkan(kwhBulan), sampahKgHari: bulatkan(sampahKgHari) };
}

/** Membulatkan ke 2 angka di belakang koma. */
function bulatkan(nilai) {
  if (!isFinite(nilai) || isNaN(nilai)) return 0;
  return Math.round(nilai * 100) / 100;
}

/**
 * Menentukan kategori jejak karbon berdasarkan total harian.
 * @param {number} total - kg CO₂e/hari
 * @returns {Object} { nama, ikon, kelas, keterangan }
 */
function tentukanKategori(total) {
  const A = KONFIGURASI.AMBANG_KATEGORI;
  if (total < A.rendah_maks) {
    return {
      nama: 'Rendah',
      ikon: '🌱',
      kelas: 'rendah',
      keterangan: 'Bagus sekali! Gaya hidup Anda sudah ramah lingkungan. Pertahankan, ya!',
    };
  }
  if (total <= A.sedang_maks) {
    return {
      nama: 'Sedang',
      ikon: '🌤️',
      kelas: 'sedang',
      keterangan: 'Lumayan baik. Masih ada beberapa kebiasaan yang bisa diperbaiki agar lebih hemat dan sehat.',
    };
  }
  return {
    nama: 'Tinggi',
    ikon: '🔥',
    kelas: 'tinggi',
    keterangan: 'Jejak karbon Anda cukup besar. Yuk, coba ubah beberapa kebiasaan agar lebih ramah lingkungan.',
  };
}

/**
 * Membuat daftar saran praktis yang mudah dipahami warga,
 * disesuaikan dengan jawaban mereka.
 * @param {Object} data   - data formulir
 * @param {Object} hasil  - hasil dari hitungEmisi()
 * @returns {string[]} daftar kalimat saran
 */
function buatSaran(data, hasil) {
  const saran = [];
  const r = hasil.rincian;

  // --- Listrik ---
  if (r.listrik >= 3) {
    saran.push('💡 Pemakaian listrik Anda cukup besar. Cabut colokan alat yang tidak dipakai, dan ganti lampu biasa dengan lampu LED yang lebih hemat.');
  } else if (r.listrik > 0) {
    saran.push('💡 Matikan lampu dan kipas saat ruangan kosong. Kebiasaan kecil ini menghemat listrik dan uang.');
  }
  if ((data.acJam || 0) >= 4) {
    saran.push('❄️ AC Anda menyala cukup lama. Setel suhu di 24–25°C dan bersihkan filternya rutin agar lebih hemat listrik.');
  }

  // --- Gas ---
  if (r.gas >= 1.5) {
    saran.push('🍳 Saat memasak, tutup panci agar lebih cepat matang dan gas lebih irit. Matikan kompor tepat waktu.');
  }

  // --- Kendaraan ---
  if (r.kendaraan >= 2) {
    saran.push('🛵 Untuk jarak dekat, coba jalan kaki atau bersepeda. Selain hemat bensin, badan jadi lebih sehat.');
    saran.push('🚌 Sesekali gunakan transportasi umum atau berangkat bersama (nebeng) untuk mengurangi asap kendaraan.');
  } else if (r.kendaraan > 0) {
    saran.push('🛵 Rawat kendaraan (servis rutin, cek tekanan ban) agar bensin lebih irit dan asap lebih sedikit.');
  }

  // --- Sampah ---
  if (data.membakar) {
    saran.push('🚫🔥 Sebaiknya JANGAN membakar sampah. Asapnya berbahaya untuk pernapasan dan menambah polusi. Kumpulkan lalu buang ke TPS/petugas kebersihan.');
  }
  if (!data.memilah) {
    saran.push('♻️ Mulai pisahkan sampah basah (sisa makanan) dan sampah kering (plastik, kertas). Sampah kering bisa dijual ke bank sampah.');
  }
  if (!data.mengompos) {
    saran.push('🌱 Sampah sisa dapur bisa dijadikan kompos (pupuk alami) untuk tanaman. Mudah dan mengurangi sampah ke TPA.');
  }
  saran.push('🛍️ Bawa tas belanja sendiri dan hindari kantong plastik sekali pakai saat ke pasar atau warung.');

  // --- Aktivitas lain ---
  if ((data.barangBaruBulan || 0) >= 3) {
    saran.push('👕 Beli barang secukupnya. Perbaiki barang yang masih bisa dipakai sebelum membeli yang baru.');
  }
  if ((data.dagingMinggu || 0) >= 5) {
    saran.push('🥗 Perbanyak sayur dan lauk lokal seperti tempe/tahu. Selain sehat, produksinya lebih ramah lingkungan.');
  }

  // --- Umum ---
  saran.push('🌳 Tanam pohon atau tanaman di sekitar rumah. Tanaman membantu menyerap karbon dan membuat udara lebih segar.');
  saran.push('💧 Hemat air bersih. Matikan keran saat tidak dipakai — menghemat air juga menghemat energi.');

  return saran;
}
