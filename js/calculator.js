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
      keterangan: 'Bagus sekali! Kegiatan sehari-hari Anda sudah cukup ramah lingkungan. ' +
        'Jejak karbon Anda masih di bawah rata-rata warga pada umumnya. ' +
        'Pertahankan kebiasaan baik ini, dan ajak tetangga ikut serta, ya! 🌿',
    };
  }
  if (total <= A.sedang_maks) {
    return {
      nama: 'Sedang',
      ikon: '🌤️',
      kelas: 'sedang',
      keterangan: 'Jejak karbon Anda masih tergolong wajar, kira-kira setara rata-rata rumah tangga. ' +
        'Kabar baiknya, masih ada beberapa kebiasaan kecil yang bisa diperbaiki. ' +
        'Dengan sedikit perubahan, tagihan bisa lebih hemat dan udara lebih bersih. 💪',
    };
  }
  return {
    nama: 'Tinggi',
    ikon: '🔥',
    kelas: 'tinggi',
    keterangan: 'Jejak karbon Anda cukup besar — di atas rata-rata rumah tangga. ' +
      'Jangan khawatir, ini bukan berarti buruk, tapi tanda bahwa ada banyak peluang untuk berhemat. ' +
      'Coba mulai dari 1–2 saran di bawah ini dulu. Setiap langkah kecil sangat berarti. 🙌',
  };
}

/**
 * Mengubah angka jejak karbon (kg CO₂e/hari) menjadi perbandingan yang
 * MUDAH DIBAYANGKAN oleh warga — supaya angka terasa nyata, bukan sekadar
 * angka. Semua faktor sengaja dibuat sederhana & dapat diperkirakan.
 * @param {number} totalHari - kg CO₂e per hari
 * @returns {Object} { perTahun, pohon, kmMotor, ponsel }
 */
function hitungSetara(totalHari) {
  const perTahun = totalHari * 365;

  // 1 pohon dewasa menyerap ± 21,77 kg CO₂ per tahun (rata-rata acuan umum).
  // Kita hitung: berapa pohon yang perlu ditanam agar emisi SETAHUN terserap.
  const pohon = Math.max(1, Math.round(perTahun / 21.77));

  // 1 km motor ≈ 0,1 kg CO₂ (± 2,31 kg/L bensin ÷ ± 40 km/L).
  // Jadi total harian setara jarak sekian km berkendara motor.
  const kmMotor = Math.round(totalHari / 0.1);

  // 1 kali mengisi penuh baterai HP ≈ 0,005 kg CO₂. Angka ringan untuk
  // menggambarkan bahwa emisi harian setara mengecas HP ratusan kali.
  const ponsel = Math.round(totalHari / 0.005);

  return {
    perTahun: bulatkan(perTahun),
    pohon: pohon,
    kmMotor: kmMotor,
    ponsel: ponsel,
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

  // Cari sumber emisi terbesar agar saran utama menyasar yang paling berdampak
  const sumber = [
    { kunci: 'listrik', nilai: r.listrik },
    { kunci: 'gas', nilai: r.gas },
    { kunci: 'kendaraan', nilai: r.kendaraan },
    { kunci: 'sampah', nilai: r.sampah },
    { kunci: 'lain', nilai: r.lain },
  ].sort(function (a, b) { return b.nilai - a.nilai; });
  const terbesar = sumber[0];

  const namaSumber = {
    listrik: 'listrik', gas: 'gas dapur', kendaraan: 'kendaraan',
    sampah: 'sampah', lain: 'kegiatan lain',
  };
  if (terbesar && terbesar.nilai > 0) {
    saran.push('📌 Penyumbang karbon terbesar Anda adalah ' + namaSumber[terbesar.kunci] +
      '. Kalau ingin cepat berdampak, fokuslah memperbaiki bagian ini lebih dulu.');
  }

  // --- Listrik ---
  if (r.listrik >= 3) {
    saran.push('💡 Pemakaian listrik Anda cukup besar. Cabut colokan charger, TV, dan alat lain saat tidak dipakai — ' +
      'walau mati, alat yang masih tercolok tetap "mencuri" listrik. Ganti lampu biasa dengan lampu LED: lebih terang, ' +
      'tahan lama, dan bisa menghemat tagihan hingga sepertiganya.');
  } else if (r.listrik > 0) {
    saran.push('💡 Sudah cukup hemat listrik. Biar makin baik: matikan lampu dan kipas saat ruangan kosong, ' +
      'dan manfaatkan cahaya matahari di siang hari agar lampu tak perlu menyala.');
  }
  if ((data.acJam || 0) >= 4) {
    saran.push('❄️ AC Anda menyala cukup lama. Setel suhu di 24–25°C (bukan paling dingin), tutup pintu & jendela saat AC hidup, ' +
      'dan bersihkan filternya sebulan sekali. Setiap 1°C lebih hangat bisa menghemat listrik yang lumayan.');
  }

  // --- Gas ---
  if (r.gas >= 1.5) {
    saran.push('🍳 Saat memasak, tutup panci agar panas tidak terbuang — masakan lebih cepat matang dan gas lebih irit. ' +
      'Kecilkan api saat air sudah mendidih, dan siapkan semua bahan sebelum kompor dinyalakan.');
  }

  // --- Kendaraan ---
  if (r.kendaraan >= 2) {
    saran.push('🛵 Untuk jarak dekat (ke warung, masjid, atau rumah tetangga), coba jalan kaki atau bersepeda. ' +
      'Hemat bensin, tidak macet, dan badan jadi lebih sehat.');
    saran.push('🚌 Sesekali berangkat bersama tetangga (nebeng bergantian) atau naik angkot/bus. ' +
      'Satu kendaraan untuk beberapa orang jauh lebih hemat daripada masing-masing membawa motor.');
  } else if (r.kendaraan > 0) {
    saran.push('🛵 Rawat kendaraan secara rutin: servis berkala, ganti oli tepat waktu, dan cek tekanan angin ban. ' +
      'Mesin yang sehat membuat bensin lebih irit dan asapnya lebih sedikit.');
  }

  // --- Sampah ---
  if (data.membakar) {
    saran.push('🚫🔥 Mohon JANGAN membakar sampah. Asapnya mengandung racun yang berbahaya bagi pernapasan — ' +
      'terutama anak-anak dan orang tua — serta menambah polusi. Lebih baik kumpulkan dan serahkan ke petugas ' +
      'kebersihan atau buang ke TPS terdekat.');
  }
  if (!data.memilah) {
    saran.push('♻️ Mulai pisahkan sampah menjadi dua: sampah basah (sisa makanan, kulit buah) dan sampah kering ' +
      '(plastik, kertas, kaleng, botol). Sampah kering yang bersih bisa dijual ke bank sampah dan menambah penghasilan.');
  } else {
    saran.push('👏 Terima kasih sudah memilah sampah! Kebiasaan ini sangat membantu petugas dan lingkungan. Teruskan, ya.');
  }
  if (!data.mengompos) {
    saran.push('🌱 Sampah sisa dapur (sayur, nasi, kulit buah) bisa diubah menjadi kompos — pupuk alami gratis untuk ' +
      'tanaman di halaman. Caranya mudah: kumpulkan di ember/lubang tanah, tutup, dan biarkan menjadi tanah subur.');
  }
  saran.push('🛍️ Bawa tas belanja sendiri dari rumah saat ke pasar atau warung, dan tolak kantong plastik sekali pakai. ' +
    'Satu tas kain bisa dipakai ratusan kali menggantikan plastik.');

  // --- Aktivitas lain ---
  if ((data.barangBaruBulan || 0) >= 3) {
    saran.push('👕 Beli barang seperlunya saja. Perbaiki dulu barang yang masih bisa dipakai sebelum membeli baru — ' +
      'lebih hemat uang dan mengurangi sampah.');
  }
  if ((data.dagingMinggu || 0) >= 5) {
    saran.push('🥗 Coba selingi menu dengan lauk nabati seperti tempe, tahu, dan sayur lokal. Selain lebih murah dan sehat, ' +
      'produksinya jauh lebih ramah lingkungan dibanding daging.');
  }

  // --- Umum ---
  saran.push('🌳 Tanam pohon atau tanaman di sekitar rumah. Selain membuat udara lebih segar dan halaman lebih teduh, ' +
    'tanaman ikut menyerap karbon setiap hari.');
  saran.push('💧 Hemat air bersih: matikan keran saat menggosok gigi atau menyabun, dan perbaiki keran yang bocor. ' +
    'Menghemat air juga menghemat energi untuk memompanya.');

  return saran;
}
