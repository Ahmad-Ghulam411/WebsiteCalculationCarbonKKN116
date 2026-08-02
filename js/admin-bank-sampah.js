/* ============================================================================
 *  DASHBOARD ADMIN BANK SAMPAH
 *  ----------------------------------------------------------------------------
 *  Halaman khusus petugas bank sampah — TERPISAH dari admin data jejak karbon
 *  (nama pengguna & kata sandinya sendiri, di KONFIGURASI.BANK_SAMPAH.ADMIN).
 *
 *  Isi dashboard:
 *    Tab 1 — Data Warga        : tambah / ubah / hapus nasabah + penyaring
 *    Tab 2 — Setoran dari Warga: catatan setoran + FOTO yang dikirim warga
 *                                sendiri dari HP-nya → disetujui / ditolak
 *    Tab 3 — Setoran Sampah    : catat timbangan sampah + penyaring + tandai cair
 *    Tab 4 — Pencairan         : proses pengajuan warga & pencairan langsung
 *    Tab 5 — Cara Pakai        : panduan penggunaan untuk petugas
 *    Tab 6 — Akun Petugas      : ganti nama pengguna & kata sandi sendiri
 *
 *  Catatan keamanan: seluruh pemeriksaan berjalan di browser, jadi ini
 *  PENGHALANG DASAR — sama seperti dashboard admin jejak karbon. Meski begitu,
 *  begitu akun diganti lewat tab "🔐 Akun Petugas", kata sandinya tidak lagi
 *  tertulis apa adanya di js/config.js: yang tersimpan hanya sidik acaknya
 *  (SHA-256) di Google Sheets. Lihat js/bank-sampah-akun.js.
 * ========================================================================== */

(function () {
  'use strict';

  const KUNCI_SESI = 'bankSampahSesiPetugas';
  const KUNCI_SESI_NAMA = 'bankSampahNamaPetugas';

  /* Data mentah hasil pemuatan terakhir */
  let data = { nasabah: [], setoran: [], pengajuan: [], setoranWarga: [] };
  let sumber = 'lokal';

  /* Ringkasan per warga: { 'BS-0001': {…hasil BankSampah.ringkas} } */
  let ringkasanWarga = {};

  /* Baris yang sedang ditampilkan (dipakai saat mengunduh Excel) */
  let tampilWarga = [];
  let tampilSetoran = [];
  let tampilPengajuan = [];
  let tampilMasuk = [];

  /* Mode ubah — null berarti sedang menambah data baru */
  let ubahWargaId = null;
  let ubahSetoranId = null;

  /* Catatan setoran warga yang sedang diperiksa di kotak "Periksa Setoran" */
  let masukDiperiksa = null;

  /* Nama pengguna yang dipakai masuk — ditampilkan di tab "🔐 Akun Petugas" */
  let namaPetugas = '';

  /* Penjaga supaya tombol yang sedang bekerja tidak diklik dua kali */
  let sedangMasuk = false;
  let sedangSimpanAkun = false;

  /* Petugas menekan "Masuk dengan akun lain" saat masuk otomatis masih
   * berjalan — jawaban yang datang belakangan harus diabaikan. */
  let otomatisDibatalkan = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    isiNilaiKonfigurasi();
    wiringMasuk();
    wiringTab();
    wiringFormWarga();
    wiringFilterWarga();
    wiringFormSetoran();
    wiringFilterSetoran();
    wiringSetoranWarga();
    wiringPencairan();
    wiringAkun();
    wiringModal();

    if (sesiAktif()) {
      namaPetugas = ambilNamaSesi();
      bukaDashboard();
      return;
    }

    /* Belum ada sesi di tab ini. Kalau petugas pernah mencentang
     * "Ingatkan Saya", coba masuk sendiri tanpa mengetik ulang. */
    cobaMasukOtomatis();
  }

  /* =======================================================================
   *  BANTU UMUM
   * ===================================================================== */
  function $(id) { return document.getElementById(id); }
  function nilai(id) { const e = $(id); return e ? String(e.value).trim() : ''; }
  function angka(id) { return BankSampah.keAngka(nilai(id)); }

  function escHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let toastTimer = null;
  function toast(pesan) {
    const t = $('toast');
    if (!t) return;
    t.textContent = pesan;
    t.classList.add('tampil');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('tampil'); }, 4600);
  }

  function tanggalRamah(v) {
    const teks = String(v === null || v === undefined ? '' : v).trim();
    if (!teks) return '—';
    const cocok = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!cocok) return teks;
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return parseInt(cocok[3], 10) + ' ' + bulan[parseInt(cocok[2], 10) - 1] + ' ' + cocok[1];
  }

  function angkaRamah(n) {
    return BankSampah.keAngka(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }

  /** Tanggal (yyyy-mm-dd) untuk membandingkan rentang penyaring. */
  function kunciTanggal(v) {
    const cocok = String(v === null || v === undefined ? '' : v).match(/^(\d{4}-\d{2}-\d{2})/);
    return cocok ? cocok[1] : '';
  }

  /** Membandingkan isi formulir dengan isi Google Sheets.
   *  Angka dibandingkan sebagai angka, karena Sheets menyimpan "02" jadi 2. */
  function samaNilai(a, b) {
    const teksA = String(a === null || a === undefined ? '' : a).trim();
    const teksB = String(b === null || b === undefined ? '' : b).trim();
    if (teksA.toLowerCase() === teksB.toLowerCase()) return true;
    if (!teksA || !teksB) return false;
    const angkaA = Number(teksA);
    const angkaB = Number(teksB);
    return !isNaN(angkaA) && !isNaN(angkaB) && angkaA === angkaB;
  }

  function isiNilaiKonfigurasi() {
    const bs = KONFIGURASI.BANK_SAMPAH;
    const kg = bs.KG_PER_KANTONG || 3;
    const set = function (id, v) { const e = $(id); if (e) e.textContent = v; };
    set('ketKgKantong', kg);
    set('panduanKgKantong', kg);

    isiKontakBantuan();
    isiPilihanJenis();
    $('sHarga').value = hargaJenisTerpilih();
    $('sTanggal').value = BankSampah.tanggalHariIni();
    $('wTanggal').value = BankSampah.tanggalHariIni();
  }

  /* Nama & nomor anggota KKN yang mengurus sistem webnya — lihat js/bantuan.js.
   * Petugas bank sampah tidak perlu tahu urusan teknis: setiap kali ada yang
   * tidak beres, layar cukup menunjuk ke satu orang yang bisa dihubungi. */
  function saranHubungi() { return Bantuan.saranHubungi(); }
  function isiKontakBantuan() { Bantuan.isiHalaman(); }

  /** Mengisi seluruh pilihan "Jenis Sampah" dari KONFIGURASI.BANK_SAMPAH.JENIS. */
  function isiPilihanJenis() {
    const jenis = BankSampah.daftarJenis();

    const sel = $('sJenis');
    if (sel) {
      const terpilih = sel.value; // jangan sampai isian petugas berpindah sendiri
      sel.innerHTML = jenis.map(function (j) {
        const ket = j.ket ? ' — ' + ringkasKet(j.ket) : '';
        return '<option value="' + escHtml(j.nama) + '">' +
          escHtml((j.ikon ? j.ikon + ' ' : '') + j.nama + ket) + '</option>';
      }).join('');
      if (terpilih) pilihJenisSetoran(terpilih);
    }

    // Penyaring boleh memuat jenis lama yang masih ada di riwayat, supaya
    // setoran "Kering"/"Basah" dari sebelumnya tetap bisa dicari.
    const nama = jenis.map(function (j) { return j.nama; });
    data.setoran.forEach(function (s) {
      const v = String(s.jenis || '').trim();
      if (v && nama.indexOf(v) < 0) nama.push(v);
    });
    isiSelect('fsJenis', nama, 'Semua Jenis');
    isiSelect('fmJenis', jenis.map(function (j) { return j.nama; }), 'Semua Jenis');
  }

  /** Memendekkan keterangan panjang agar muat di dalam <option>. */
  function ringkasKet(teks) {
    const bersih = String(teks || '').trim();
    return bersih.length > 46 ? bersih.slice(0, 45).replace(/[\s.,]+$/, '') + '…' : bersih;
  }

  function hargaJenisTerpilih() {
    return BankSampah.hargaJenis(nilai('sJenis') || (BankSampah.daftarJenis()[0] || {}).nama);
  }

  /* =======================================================================
   *  MASUK / KELUAR
   * ===================================================================== */
  function sesiAktif() {
    try { return sessionStorage.getItem(KUNCI_SESI) === 'aktif'; } catch (e) { return false; }
  }

  function ambilNamaSesi() {
    try { return sessionStorage.getItem(KUNCI_SESI_NAMA) || ''; } catch (e) { return ''; }
  }

  function simpanSesi(nama) {
    try {
      sessionStorage.setItem(KUNCI_SESI, 'aktif');
      sessionStorage.setItem(KUNCI_SESI_NAMA, nama || '');
    } catch (e) {}
  }

  function keluarDashboard() {
    try {
      sessionStorage.removeItem(KUNCI_SESI);
      sessionStorage.removeItem(KUNCI_SESI_NAMA);
    } catch (e) {}
    /* "Ingatkan Saya" ikut dilupakan. Menekan "🚪 Keluar" artinya
     * BENAR-BENAR keluar — bukan sekadar menutup website. Tanpa baris ini,
     * halaman yang dimuat ulang di bawah akan langsung masuk lagi sendiri. */
    AkunPetugas.lupakanIngatan();
    window.location.reload();
  }

  function wiringMasuk() {
    const form = $('formMasuk');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        masuk();
      });
    }
    const keluar = $('btnKeluar');
    if (keluar) keluar.addEventListener('click', keluarDashboard);

    const muat = $('btnMuat');
    if (muat) muat.addEventListener('click', muatData);

    /* Lama berlakunya "Ingatkan Saya" ditulis dari satu sumber saja,
     * supaya tulisan di layar tidak pernah beda dengan aturannya. */
    const ketHari = $('ketIngatHari');
    if (ketHari) ketHari.textContent = AkunPetugas.ATURAN.INGAT_HARI;

    const batal = $('btnBatalOtomatis');
    if (batal) batal.addEventListener('click', batalkanMasukOtomatis);
  }

  /* ------------------------- Masuk otomatis ------------------------------ */

  /**
   * Mencoba masuk memakai catatan "Ingatkan Saya" di perangkat ini.
   *
   * Sidik sandinya tetap diperiksa ulang ke Google Sheets (lihat
   * AkunPetugas.masukTersimpan), jadi ingatan lama otomatis mati begitu
   * akun petugas diganti dari perangkat lain.
   */
  function cobaMasukOtomatis() {
    const ingatan = AkunPetugas.infoIngatan();
    if (!ingatan) return;                    // tidak pernah dicentang / sudah kedaluwarsa

    sedangMasuk = true;                      // formulir dikunci selama menunggu
    otomatisDibatalkan = false;
    tampilLayarOtomatis(ingatan.username);

    AkunPetugas.masukTersimpan().then(function (hasil) {
      if (otomatisDibatalkan) return;        // petugas memilih masuk dengan akun lain
      sedangMasuk = false;

      if (!hasil.ok) {
        sudahiLayarOtomatis(ingatan.username);
        pesanMasuk(hasil.pesan, hasil.catatan);
        return;
      }

      namaPetugas = hasil.username;
      simpanSesi(namaPetugas);

      /* Urutan pesannya disamakan dengan masuk biasa, supaya peringatan akun
       * bawaan tidak pernah terlewat hanya karena petugas selalu masuk
       * otomatis. Kalau tidak ada yang perlu diperingatkan, barulah sapaan. */
      if (hasil.catatan) {
        toast('ℹ️ ' + hasil.catatan);
      } else if (hasil.bawaan) {
        toast('🔐 Anda masih memakai akun bawaan. Sebaiknya diganti lewat tab "🔐 Akun Petugas".');
      } else {
        toast('👋 Selamat datang kembali, ' + namaPetugas + '.');
      }

      bukaDashboard();
    }).catch(function (err) {
      if (otomatisDibatalkan) return;
      sedangMasuk = false;
      sudahiLayarOtomatis(ingatan.username);
      pesanMasuk('Masuk otomatis gagal. Silakan masuk seperti biasa.', String(err));
    });
  }

  /** Petugas menekan "Masuk dengan akun lain" saat masuk otomatis berjalan. */
  function batalkanMasukOtomatis() {
    otomatisDibatalkan = true;
    sedangMasuk = false;
    AkunPetugas.lupakanIngatan();
    sudahiLayarOtomatis('');
    pesanMasuk('', '');
    const kotakUser = $('inputUser');
    if (kotakUser) { kotakUser.value = ''; kotakUser.focus(); }
    const ingat = $('inputIngat');
    if (ingat) ingat.checked = false;
  }

  /** Menyembunyikan formulir & menampilkan keterangan "sedang masuk otomatis". */
  function tampilLayarOtomatis(nama) {
    const panel = $('masukOtomatis');
    const form = $('formMasuk');
    if (panel) panel.classList.remove('tersembunyi');
    if (form) form.classList.add('tersembunyi');
    const kotakNama = $('masukOtomatisNama');
    if (kotakNama) kotakNama.textContent = nama || '—';
  }

  /** Mengembalikan formulir biasa saat masuk otomatis selesai / gagal. */
  function sudahiLayarOtomatis(nama) {
    const panel = $('masukOtomatis');
    const form = $('formMasuk');
    if (panel) panel.classList.add('tersembunyi');
    if (form) form.classList.remove('tersembunyi');

    if (!nama) return;
    /* Gagalnya bukan salah petugas — nama penggunanya diisikan lagi dan
     * kotak "Ingatkan Saya" tetap dicentang, jadi ia cukup mengetik
     * kata sandinya sekali untuk kembali diingat. */
    const kotakUser = $('inputUser');
    const ingat = $('inputIngat');
    if (kotakUser) kotakUser.value = nama;
    if (ingat) ingat.checked = true;
    const kotakSandi = $('inputSandi');
    if (kotakSandi) kotakSandi.focus();
  }

  /** Menulis pesan di layar masuk. Baris kedua (kecil) dipakai untuk
   *  menerangkan keadaan server, mis. "Google Sheets belum menjawab". */
  function pesanMasuk(teks, catatan) {
    const kotak = $('pesanMasuk');
    if (!kotak) return;
    if (!teks && !catatan) { kotak.textContent = ''; return; }
    kotak.innerHTML = escHtml(teks || '') +
      (catatan ? '<br><small>' + escHtml(catatan) + '</small>' : '');
  }

  /**
   * Memeriksa akun petugas lalu membuka dashboard.
   *
   * Pemeriksaannya menunggu jawaban Google Sheets (lihat AkunPetugas.masuk),
   * jadi tombolnya dikunci dulu supaya tidak diklik berkali-kali.
   */
  function masuk() {
    if (sedangMasuk) return;

    const user = nilai('inputUser');
    const sandi = $('inputSandi').value;
    const tombol = $('btnMasuk');

    sedangMasuk = true;
    if (tombol) { tombol.disabled = true; tombol.textContent = '⏳ Memeriksa akun…'; }
    pesanMasuk('', '');

    const beres = function () {
      sedangMasuk = false;
      if (tombol) { tombol.disabled = false; tombol.textContent = '🔓 Masuk Dashboard'; }
    };

    AkunPetugas.masuk(user, sandi).then(function (hasil) {
      beres();

      if (!hasil.ok) {
        pesanMasuk(hasil.pesan, hasil.catatan);
        $('inputSandi').value = '';
        $('inputSandi').focus();
        return;
      }

      pesanMasuk('', '');
      namaPetugas = hasil.username || user;
      simpanSesi(namaPetugas);

      /* "Ingatkan Saya" — yang disimpan nama pengguna + SIDIK sandinya,
       * yaitu pasangan yang barusan diterima. Kalau tidak dicentang,
       * ingatan lama (bila ada) sekalian dibuang. */
      const ingat = $('inputIngat');
      if (ingat && ingat.checked) {
        if (!AkunPetugas.ingat(user, sandi)) {
          toast('⚠️ "Ingatkan Saya" tidak bisa disimpan di perangkat ini. ' +
            'Anda tetap masuk, hanya saja nanti perlu mengetik akun lagi.');
        }
      } else {
        AkunPetugas.lupakanIngatan();
      }

      $('inputSandi').value = '';

      if (hasil.catatan) {
        toast('ℹ️ ' + hasil.catatan);
      } else if (hasil.bawaan) {
        // Selama akun bawaan masih dipakai, kata sandinya tertulis apa adanya
        // di js/config.js — siapa pun yang membuka berkas itu bisa membacanya.
        toast('🔐 Anda masih memakai akun bawaan. Sebaiknya diganti lewat tab "🔐 Akun Petugas".');
      }

      bukaDashboard();
    }).catch(function (err) {
      beres();
      pesanMasuk('Terjadi gangguan saat memeriksa akun. Coba lagi.', String(err));
    });
  }

  function bukaDashboard() {
    $('layarMasuk').classList.add('tersembunyi');
    $('layarDashboard').classList.remove('tersembunyi');
    // Keterangan akun sengaja tidak ditanyakan sekarang: kotaknya baru terlihat
    // saat tab "🔐 Akun Petugas" dibuka, dan bukaTab() yang mengurusnya.
    muatData();
  }

  /* =======================================================================
   *  MEMUAT DATA
   * ===================================================================== */
  /** Memuat ulang seluruh data dari server. Promise-nya berisi hasil
   *  pemuatan { ok, tanpaBalasan, … } supaya pemanggilnya tahu apakah data
   *  di layar sudah boleh dipercaya untuk diperiksa. */
  function muatData() {
    const pita = $('pitaSumber');
    pita.className = 'adm-pita adm-pita-info';
    pita.textContent = '⏳ Memuat data bank sampah…';
    $('btnMuat').disabled = true;

    return BankSampah.muatSemua().then(function (hasil) {
      $('btnMuat').disabled = false;
      sumber = hasil.sumber;

      if (!hasil.ok) {
        /* Pesan asli dari server sengaja TIDAK ditampilkan: isinya bahasa
         * teknis yang tidak bisa ditindaklanjuti petugas. Cukup disimpan di
         * catatan browser supaya bisa ditanyakan bila diperlukan. */
        console.warn('Gagal memuat data bank sampah:', hasil.pesan);

        pita.className = 'adm-pita adm-pita-salah';
        pita.textContent = hasil.tanpaBalasan
          ? '❌ Penyimpanan data belum menjawab (koneksi lambat atau server sedang sibuk). ' +
            'Data di layar mungkin belum yang terbaru — klik "↻ Muat Ulang" untuk mencoba lagi.'
          : '❌ Data belum bisa diambil dari penyimpanan. Coba klik "↻ Muat Ulang" sekali lagi. ' +
            'Kalau tetap begini, data Anda tetap aman — ' + saranHubungi();
        hitungUlang();
        renderSemua();
        return hasil;
      }

      data = {
        nasabah: hasil.nasabah,
        setoran: hasil.setoran,
        pengajuan: hasil.pengajuan,
        setoranWarga: hasil.setoranWarga || [],
      };

      if (sumber === 'sheet') {
        pita.className = 'adm-pita adm-pita-info';
        pita.textContent = '☁️ Data tersimpan online — bisa dibuka dari HP/laptop mana pun.';
      } else {
        pita.className = 'adm-pita adm-pita-hati';
        pita.textContent = '📱 Data baru tersimpan di PERANGKAT INI saja, jadi belum bisa dibuka dari ' +
          'HP/laptop lain dan bisa hilang bila data browser dibersihkan. ' + saranHubungi();
      }

      hitungUlang();
      renderSemua();
      return hasil;
    });
  }

  /* =======================================================================
   *  MENGIRIM PERUBAHAN KE SERVER
   *  ---------------------------------------------------------------------
   *  Google Apps Script kadang selesai menyimpan TAPI balasannya tidak
   *  sampai ke browser (koneksi lambat / server sedang antre). Dulu keadaan
   *  ini dianggap "gagal": pesan merah muncul dan daftar tidak dimuat ulang,
   *  padahal datanya sudah masuk — makanya baru terlihat setelah halaman
   *  di-refresh. Sekarang daftar SELALU dimuat ulang lebih dulu, baru
   *  kesimpulannya disampaikan ke petugas.
   * ===================================================================== */

  /** Aksi sederhana (hapus / tandai cair / proses pengajuan). */
  function tanganiAksi(janji, ikon, saatBeres) {
    return janji.then(function (hasil) {
      if (hasil.ok) {
        toast(ikon + ' ' + hasil.pesan);
        if (saatBeres) saatBeres();
        return muatData();
      }
      if (!hasil.tanpaBalasan) { toast('❌ ' + hasil.pesan); return; }

      toast('⏳ Balasan server lambat — daftar dimuat ulang. Mohon periksa hasilnya di tabel.');
      return muatData();
    });
  }

  /** Menghitung ringkasan tabungan tiap warga sekali saja, lalu dipakai bersama. */
  function hitungUlang() {
    ringkasanWarga = {};
    data.nasabah.forEach(function (n) {
      const id = BankSampah.normalId(n.id);
      const setoran = data.setoran.filter(function (s) { return BankSampah.normalId(s.idWarga) === id; });
      const pengajuan = data.pengajuan.filter(function (p) { return BankSampah.normalId(p.idWarga) === id; });
      const catatanWarga = data.setoranWarga.filter(function (s) { return BankSampah.normalId(s.idWarga) === id; });
      ringkasanWarga[id] = BankSampah.ringkas(setoran, pengajuan, catatanWarga);
    });
  }

  function cariNasabah(id) {
    const kunci = BankSampah.normalId(id);
    return data.nasabah.filter(function (n) { return BankSampah.normalId(n.id) === kunci; })[0] || null;
  }

  function ringkasanDari(id) {
    return ringkasanWarga[BankSampah.normalId(id)] || BankSampah.ringkas([], []);
  }

  function renderSemua() {
    renderStat();
    isiPilihanPenyaring();
    isiPilihanJenis();
    isiPilihanWarga();
    renderWarga();
    renderSetoran();
    renderSetoranWarga();
    renderPengajuan();
  }

  /* =======================================================================
   *  RINGKASAN ANGKA DI ATAS
   * ===================================================================== */
  function renderStat() {
    let berat = 0, belum = 0;
    data.setoran.forEach(function (s) {
      berat += BankSampah.keAngka(s.berat);
      if (String(s.status || '') !== BS_STATUS_CAIR.SUDAH) belum += BankSampah.keAngka(s.pendapatan);
    });
    const menunggu = data.pengajuan.filter(function (p) {
      return String(p.status || '') === BS_STATUS_AJU.DIAJUKAN;
    }).length;
    const masukMenunggu = data.setoranWarga.filter(function (s) {
      return String(s.status || BS_STATUS_SETOR.MENUNGGU) === BS_STATUS_SETOR.MENUNGGU;
    }).length;

    $('statNasabah').textContent = data.nasabah.length;
    $('statBerat').textContent = angkaRamah(berat) + ' kg';
    $('statBelum').textContent = BankSampah.rupiah(belum);
    $('statPengajuan').textContent = menunggu;
    $('statSetorWarga').textContent = masukMenunggu;

    aturLencana('lencanaPengajuan', menunggu);
    aturLencana('lencanaSetorWarga', masukMenunggu);
  }

  function aturLencana(id, jumlah) {
    const lencana = $(id);
    if (!lencana) return;
    lencana.textContent = jumlah;
    lencana.classList.toggle('tersembunyi', jumlah === 0);
  }

  /* =======================================================================
   *  TAB
   * ===================================================================== */
  function wiringTab() {
    document.querySelectorAll('.adm-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { bukaTab(tab.getAttribute('data-tab')); });
    });
  }

  function bukaTab(nama) {
    document.querySelectorAll('.adm-tab').forEach(function (t) {
      t.classList.toggle('aktif', t.getAttribute('data-tab') === nama);
    });
    const peta = {
      warga: 'panelWarga', masuk: 'panelMasuk', setoran: 'panelSetoran',
      pencairan: 'panelPencairan', panduan: 'panelPanduan', akun: 'panelAkun',
    };
    Object.keys(peta).forEach(function (k) {
      $(peta[k]).classList.toggle('aktif', k === nama);
    });

    if (nama === 'akun') {
      segarkanKotakAkun();
    } else {
      // Kata sandi yang terlanjur diketik jangan ditinggal di layar.
      kosongkanSandiAkun();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* =======================================================================
   *  TAB 1 — DATA WARGA
   * ===================================================================== */
  function wiringFormWarga() {
    $('formWarga').addEventListener('submit', function (ev) {
      ev.preventDefault();
      simpanWarga();
    });
    $('btnBatalWarga').addEventListener('click', resetFormWarga);
  }

  function wiringFilterWarga() {
    ['fwCari', 'fwRt', 'fwRw', 'fwStatus', 'fwSaldo', 'fwSetor', 'fwUrut'].forEach(function (id) {
      const e = $(id);
      if (e) e.addEventListener('input', renderWarga);
    });
    $('btnResetWarga').addEventListener('click', function () {
      ['fwCari', 'fwRt', 'fwRw', 'fwStatus', 'fwSaldo', 'fwSetor'].forEach(function (id) { $(id).value = ''; });
      $('fwUrut').value = 'nama';
      renderWarga();
    });
    $('btnUnduhWarga').addEventListener('click', unduhWarga);
  }

  function simpanWarga() {
    const record = {
      id: nilai('wId'),
      nama: nilai('wNama'),
      nik: nilai('wNik'),
      alamat: nilai('wAlamat'),
      rt: nilai('wRt'),
      rw: nilai('wRw'),
      noHp: nilai('wHp'),
      tanggalDaftar: nilai('wTanggal') || BankSampah.tanggalHariIni(),
      status: nilai('wStatus') || 'Aktif',
      catatan: nilai('wCatatan'),
    };

    if (!record.nama) {
      toast('⚠️ Nama warga wajib diisi.');
      $('wNama').focus();
      return;
    }
    if (record.nik && !/^\d{16}$/.test(record.nik)) {
      toast('⚠️ NIK harus 16 angka. Kosongkan kalau belum tahu.');
      $('wNik').focus();
      return;
    }

    const tombol = $('btnSimpanWarga');
    const labelTombol = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = '⏳ Menyimpan…';

    // Disimpan dulu: formulir akan direset sebelum balasan dipakai.
    const idDiubah = ubahWargaId;
    const idSebelum = data.nasabah.map(function (n) { return BankSampah.normalId(n.id); });

    const janji = idDiubah
      ? BankSampah.ubahNasabah(idDiubah, record)
      : BankSampah.simpanNasabah(record);

    janji.then(function (hasil) {
      tombol.disabled = false;
      tombol.textContent = labelTombol;

      if (hasil.ok) {
        // Langsung tampilkan di tabel, tanpa menunggu pemuatan ulang selesai.
        catatWargaLokal(Object.assign({}, record, { id: hasil.id || record.id || idDiubah }));
        beresSimpanWarga(idDiubah, hasil.id || record.id || idDiubah);
        muatData();
        return;
      }

      if (!hasil.tanpaBalasan) { toast('❌ ' + hasil.pesan); return; }

      // Balasan hilang di jalan — datanya sering TETAP tersimpan di Sheets.
      // Muat ulang dulu, baru simpulkan berhasil atau tidak.
      toast('⏳ Balasan server lambat. Memeriksa apakah data warga sudah masuk…');
      muatData().then(function (muat) {
        if (!muat.ok) {
          // Daftar pun gagal dimuat → belum bisa disimpulkan. JANGAN suruh
          // menyimpan ulang, nanti datanya malah dobel.
          toast('⚠️ Server bank sampah sedang tidak bisa dihubungi, jadi belum ketahuan ' +
            'apakah datanya masuk. Klik "↻ Muat Ulang" dulu sebelum menyimpan lagi.');
          return;
        }

        const tersimpan = idDiubah
          ? (ubahanWargaMasuk(idDiubah, record) ? cariNasabah(idDiubah) : null)
          : cariWargaBaru(record, idSebelum);

        if (tersimpan) {
          beresSimpanWarga(idDiubah, tersimpan.id);
        } else {
          toast('❌ Server bank sampah tidak menjawab dan datanya belum masuk. ' +
            'Periksa koneksi internet, lalu simpan sekali lagi.');
        }
      });
    });
  }

  /** Dipanggil saat data warga sudah dipastikan tersimpan di server. */
  function beresSimpanWarga(idDiubah, id) {
    toast('✅ ' + (idDiubah
      ? 'Data warga diperbarui.'
      : 'Warga baru tersimpan.' + (id ? ' ID Nasabahnya: ' + id : '')));
    resetFormWarga();
  }

  /** Menaruh warga yang baru disimpan ke daftar di layar SEKARANG JUGA,
   *  supaya petugas tidak perlu menunggu pemuatan ulang dari Google Sheets
   *  (yang butuh beberapa detik) untuk melihat hasilnya. */
  function catatWargaLokal(warga) {
    const id = BankSampah.normalId(warga.id);
    if (!id) return;
    const i = data.nasabah.findIndex(function (n) { return BankSampah.normalId(n.id) === id; });
    if (i < 0) data.nasabah.push(warga);
    else data.nasabah[i] = Object.assign({}, data.nasabah[i], warga);
    hitungUlang();
    renderSemua();
  }

  /** Mencari warga yang ternyata sudah masuk walau balasan server hilang.
   *  Bila ID diisi petugas, cukup dicocokkan dengan ID itu; bila ID dibuat
   *  otomatis oleh server, dicari baris baru yang namanya sama. */
  function cariWargaBaru(record, idSebelum) {
    const diminta = BankSampah.normalId(record.id);
    if (diminta) {
      const n = cariNasabah(diminta);
      return (n && samaNilai(n.nama, record.nama)) ? n : null;
    }
    return data.nasabah.filter(function (n) {
      return idSebelum.indexOf(BankSampah.normalId(n.id)) < 0 && samaNilai(n.nama, record.nama);
    })[0] || null;
  }

  /** Memastikan perubahan data warga benar-benar tercatat di Google Sheets. */
  function ubahanWargaMasuk(id, record) {
    const n = cariNasabah(id);
    if (!n) return false;
    return ['nama', 'nik', 'alamat', 'rt', 'rw', 'noHp', 'status', 'catatan']
      .every(function (k) { return samaNilai(n[k], record[k]); });
  }

  function resetFormWarga() {
    ubahWargaId = null;
    $('formWarga').reset();
    $('wTanggal').value = BankSampah.tanggalHariIni();
    $('wId').readOnly = false;
    $('judulFormWarga').textContent = '➕ Tambah Warga Bank Sampah Baru';
    $('ketFormWarga').innerHTML = 'Isi data warga yang mendaftar jadi nasabah. Yang bertanda ' +
      '<span class="wajib">*</span> wajib diisi. ID Nasabah akan dibuat otomatis kalau dikosongkan.';
    $('btnSimpanWarga').textContent = '💾 Simpan Data Warga';
    $('btnBatalWarga').classList.add('tersembunyi');
  }

  function mulaiUbahWarga(id) {
    const n = cariNasabah(id);
    if (!n) return;
    ubahWargaId = n.id;

    $('wId').value = n.id;
    $('wId').readOnly = true; // ID nasabah tidak boleh berubah — sudah dipegang warga
    $('wNama').value = n.nama || '';
    $('wNik').value = n.nik || '';
    $('wAlamat').value = n.alamat || '';
    $('wRt').value = n.rt || '';
    $('wRw').value = n.rw || '';
    $('wHp').value = n.noHp || '';
    $('wTanggal').value = kunciTanggal(n.tanggalDaftar) || BankSampah.tanggalHariIni();
    $('wStatus').value = String(n.status || 'Aktif').indexOf('Non') === 0 ? 'Nonaktif' : 'Aktif';
    $('wCatatan').value = n.catatan || '';

    $('judulFormWarga').textContent = '✏️ Ubah Data: ' + (n.nama || n.id);
    $('ketFormWarga').textContent = 'Perbaiki data yang perlu diubah, lalu klik "Simpan Perubahan". ' +
      'ID Nasabah sengaja dikunci karena sudah dipegang warga.';
    $('btnSimpanWarga').textContent = '💾 Simpan Perubahan';
    $('btnBatalWarga').classList.remove('tersembunyi');

    bukaTab('warga');
  }

  function hapusWarga(id) {
    const n = cariNasabah(id);
    if (!n) return;
    const r = ringkasanDari(id);
    const pesan = 'Hapus warga "' + (n.nama || id) + '" (' + id + ')?\n\n' +
      'Ikut terhapus: ' + r.jumlahSetoran + ' setoran dan ' + r.pengajuan.length + ' pengajuan pencairan.\n' +
      'Tindakan ini TIDAK BISA dibatalkan.\n\n' +
      'Kalau warga hanya berhenti menabung, sebaiknya ubah statusnya jadi "Nonaktif" saja.';
    if (!window.confirm(pesan)) return;

    tanganiAksi(BankSampah.hapusNasabah(id), '🗑️', function () {
      if (ubahWargaId === id) resetFormWarga();
    });
  }

  function saringWarga() {
    const cari = nilai('fwCari').toLowerCase();
    const rt = nilai('fwRt');
    const rw = nilai('fwRw');
    const status = nilai('fwStatus');
    const saldo = nilai('fwSaldo');
    const setor = nilai('fwSetor');
    const urut = nilai('fwUrut') || 'nama';

    let hasil = data.nasabah.filter(function (n) {
      const r = ringkasanDari(n.id);

      if (cari) {
        const gabung = [n.id, n.nama, n.nik, n.noHp, n.alamat].join(' ').toLowerCase();
        if (gabung.indexOf(cari) < 0) return false;
      }
      if (rt && String(n.rt || '') !== rt) return false;
      if (rw && String(n.rw || '') !== rw) return false;
      if (status && String(n.status || 'Aktif') !== status) return false;
      if (saldo === 'ada' && r.belumCair <= 0) return false;
      if (saldo === 'kosong' && r.belumCair > 0) return false;
      if (setor === 'pernah' && r.jumlahSetoran === 0) return false;
      if (setor === 'belum' && r.jumlahSetoran > 0) return false;
      return true;
    });

    hasil.sort(function (a, b) {
      const ra = ringkasanDari(a.id);
      const rb = ringkasanDari(b.id);
      switch (urut) {
        case 'id':     return String(a.id).localeCompare(String(b.id));
        case 'berat':  return rb.totalBerat - ra.totalBerat;
        case 'belum':  return rb.belumCair - ra.belumCair;
        case 'baru':   return String(b.tanggalDaftar || '').localeCompare(String(a.tanggalDaftar || ''));
        default:       return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
      }
    });

    return hasil;
  }

  function renderWarga() {
    tampilWarga = saringWarga();
    const wadah = $('tabelWarga');

    $('infoJumlahWarga').textContent =
      'Menampilkan ' + tampilWarga.length + ' dari ' + data.nasabah.length + ' warga';

    if (!data.nasabah.length) {
      wadah.innerHTML = '<p class="adm-kosong">Belum ada warga terdaftar.<br>' +
        'Mulai dengan mengisi formulir <strong>“Tambah Warga Bank Sampah Baru”</strong> di atas. 👆</p>';
      return;
    }
    if (!tampilWarga.length) {
      wadah.innerHTML = '<p class="adm-kosong">Tidak ada warga yang cocok dengan penyaring. ' +
        'Coba klik <strong>“↺ Bersihkan Penyaring”</strong>.</p>';
      return;
    }

    let html = '<div class="adm-tabel-wadah"><table class="adm-tabel"><thead><tr>' +
      '<th>No.</th><th>ID Nasabah</th><th>Nama Warga</th><th>NIK</th><th>Alamat</th>' +
      '<th>RT</th><th>RW</th><th>No. HP</th><th>Terdaftar</th><th>Status</th>' +
      '<th class="adm-kanan">Setoran</th><th class="adm-kanan">Berat Total</th>' +
      '<th class="adm-kanan">Kering</th><th class="adm-kanan">Basah</th><th class="adm-kanan">Kantong</th>' +
      '<th class="adm-kanan">Pendapatan</th><th class="adm-kanan">Belum Cair</th><th class="adm-kanan">Sudah Cair</th>' +
      '<th>Aksi</th></tr></thead><tbody>';

    tampilWarga.forEach(function (n, i) {
      const r = ringkasanDari(n.id);
      const aktif = String(n.status || 'Aktif').indexOf('Non') !== 0;
      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + escHtml(n.id) + '</strong></td>' +
        '<td>' + escHtml(n.nama || '—') + '</td>' +
        '<td>' + escHtml(n.nik || '—') + '</td>' +
        '<td>' + escHtml(n.alamat || '—') + '</td>' +
        '<td>' + escHtml(n.rt || '—') + '</td>' +
        '<td>' + escHtml(n.rw || '—') + '</td>' +
        '<td>' + escHtml(n.noHp || '—') + '</td>' +
        '<td>' + escHtml(tanggalRamah(n.tanggalDaftar)) + '</td>' +
        '<td><span class="bs-badge ' + (aktif ? 'bs-badge-hijau' : 'bs-badge-abu') + '">' +
          escHtml(n.status || 'Aktif') + '</span></td>' +
        '<td class="adm-kanan">' + r.jumlahSetoran + '×</td>' +
        '<td class="adm-kanan">' + angkaRamah(r.totalBerat) + ' kg</td>' +
        '<td class="adm-kanan">' + angkaRamah(r.kering.berat) + ' kg</td>' +
        '<td class="adm-kanan">' + angkaRamah(r.basah.berat) + ' kg</td>' +
        '<td class="adm-kanan">' + angkaRamah(r.totalKantong) + '</td>' +
        '<td class="adm-kanan">' + BankSampah.rupiah(r.pendapatanTotal) + '</td>' +
        '<td class="adm-kanan"><strong>' + BankSampah.rupiah(r.belumCair) + '</strong></td>' +
        '<td class="adm-kanan">' + BankSampah.rupiah(r.sudahCair) + '</td>' +
        '<td class="adm-aksi-sel">' +
          btn('lihat', n.id, '👁️ Rincian') +
          btn('setor', n.id, '➕ Setor') +
          btn('edit', n.id, '✏️ Ubah') +
          (r.belumCair > 0 ? btn('cairwarga', n.id, '💵 Cairkan') : '') +
          btn('hapus', n.id, '🗑️ Hapus') +
        '</td></tr>';
    });

    wadah.innerHTML = html + '</tbody></table></div>';
    pasangAksi(wadah, {
      lihat: lihatWarga,
      setor: setorUntukWarga,
      edit: mulaiUbahWarga,
      cairwarga: cairkanWarga,
      hapus: hapusWarga,
    });
  }

  /** Membuat tombol aksi di dalam tabel. */
  function btn(aksi, id, teks) {
    const kelas = {
      lihat: 'adm-btn-lihat', setor: 'adm-btn-setor', edit: 'adm-btn-edit',
      cairwarga: 'adm-btn-cair', cair: 'adm-btn-cair', batalcair: 'adm-btn-batal',
      hapus: 'adm-btn-hapus', setuju: 'adm-btn-cair', tolak: 'adm-btn-batal',
      periksa: 'adm-btn-periksa',
    }[aksi] || 'adm-btn-edit';
    return '<button type="button" class="adm-btn ' + kelas + '" data-aksi="' + aksi +
      '" data-id="' + escHtml(id) + '">' + teks + '</button>';
  }

  /** Warna lencana untuk tiap jenis sampah — mengikuti urutan di config. */
  function warnaJenis(jenis) {
    if (BankSampah.kelompokJenis(jenis) === 'basah') return 'bs-badge-hijau';
    const warna = ['bs-badge-biru', 'bs-badge-kuning', 'bs-badge-hijau', 'bs-badge-biru', 'bs-badge-abu'];
    const urutan = BankSampah.daftarJenis().map(function (j) {
      return String(j.nama).trim().toLowerCase();
    }).indexOf(String(jenis || '').trim().toLowerCase());
    return urutan >= 0 ? warna[urutan % warna.length] : 'bs-badge-abu';
  }

  /** Lencana satu baris riwayat: status persetujuan (bila dicatat warga)
   *  ditambah keadaan pencairannya (bila sudah jadi setoran resmi). */
  function lencanaRiwayat(s) {
    const lencana = [];
    const badge = function (warna, teks) {
      return '<span class="bs-badge ' + warna + '">' + escHtml(teks) + '</span>';
    };

    if (s.status === BS_STATUS_SETOR.MENUNGGU) lencana.push(badge('bs-badge-kuning', '⏳ Menunggu'));
    else if (s.status === BS_STATUS_SETOR.DITOLAK) lencana.push(badge('bs-badge-merah', '❌ Ditolak'));
    else if (s.status === BS_STATUS_SETOR.DISETUJUI) lencana.push(badge('bs-badge-hijau', '✅ Disetujui'));
    else if (s.status) lencana.push(badge('bs-badge-abu', s.status));

    if (s.resmi) {
      const sudah = String(s.statusCair || '').indexOf('Sudah') === 0;
      lencana.push(badge(sudah ? 'bs-badge-abu' : 'bs-badge-biru', s.statusCair || '—'));
    }
    return lencana.join(' ');
  }

  /** Menyambungkan tombol data-aksi di dalam tabel ke fungsinya. */
  function pasangAksi(wadah, peta) {
    wadah.querySelectorAll('button[data-aksi]').forEach(function (b) {
      const fn = peta[b.getAttribute('data-aksi')];
      if (fn) b.addEventListener('click', function () { fn(b.getAttribute('data-id')); });
    });
  }

  function lihatWarga(id) {
    const n = cariNasabah(id);
    if (!n) return;
    const r = ringkasanDari(id);

    $('modalWargaJudul').textContent = '👤 ' + (n.nama || id);

    let html = '<div class="bs-identitas-rincian" style="grid-template-columns:1fr 1fr;margin-top:0;border-top:none;padding-top:0">' +
      kotak('ID Nasabah', escHtml(n.id)) +
      kotak('NIK', escHtml(n.nik || '—')) +
      kotak('Alamat', escHtml([n.alamat, n.rt ? 'RT ' + n.rt : '', n.rw ? 'RW ' + n.rw : '']
        .filter(function (x) { return String(x || '').trim(); }).join(' · ') || '—')) +
      kotak('No. HP', escHtml(n.noHp || '—')) +
      '</div>';

    html += '<div class="bs-uang-grid" style="margin-top:16px">' +
      '<div class="bs-uang bs-uang-total"><span class="bs-uang-label">Pendapatan</span>' +
        '<div class="bs-uang-angka">' + BankSampah.rupiah(r.pendapatanTotal) + '</div></div>' +
      '<div class="bs-uang bs-uang-belum"><span class="bs-uang-label">Belum Cair</span>' +
        '<div class="bs-uang-angka">' + BankSampah.rupiah(r.belumCair) + '</div></div>' +
      '<div class="bs-uang bs-uang-sudah"><span class="bs-uang-label">Sudah Cair</span>' +
        '<div class="bs-uang-angka">' + BankSampah.rupiah(r.sudahCair) + '</div></div>' +
      '</div>';

    const rincian = (r.perJenis || []).filter(function (j) { return j.jumlahSetoran > 0; });
    if (rincian.length) {
      html += '<div class="bs-jenis-grid" style="margin-top:16px">' +
        rincian.map(function (j) {
          return jenisKotak('', (j.ikon || '♻️') + ' ' + j.nama, j);
        }).join('') + '</div>';
    }

    /* Riwayat gabungan — sama persis dengan yang dilihat warga di halaman
     * "Cek Bank Sampah": setoran petugas + catatan warga yang masih
     * menunggu/ditolak, tanpa data dobel. */
    html += '<h4 style="margin:18px 0 8px;color:var(--hijau-tua)">Riwayat Setoran</h4>';
    const riwayat = r.riwayat || [];
    if (!riwayat.length) {
      html += '<p class="adm-kosong">Warga ini belum pernah menyetor sampah.</p>';
    } else {
      if ((r.setoranMenunggu || []).length) {
        html += '<p class="adm-catatan">⏳ ' + r.setoranMenunggu.length + ' catatan warga ini ' +
          'masih menunggu persetujuan (perkiraan ' + BankSampah.rupiah(r.perkiraanMenunggu) +
          ') — belum masuk tabungan. Proses di tab <strong>“📥 Setoran Warga”</strong>.</p>';
      }
      html += '<div class="bs-tabel-wadah"><table class="bs-tabel"><thead><tr>' +
        '<th>Tanggal</th><th>Jenis</th><th>Berat</th><th>Kantong</th><th>Pendapatan</th>' +
        '<th>Status</th><th>Catatan</th></tr></thead><tbody>';
      riwayat.forEach(function (s) {
        html += '<tr' + (s.resmi ? '' : ' class="bs-baris-' +
            (s.status === BS_STATUS_SETOR.DITOLAK ? 'ditolak' : 'menunggu') + '"') + '>' +
          '<td>' + escHtml(tanggalRamah(s.tanggal)) + '</td>' +
          '<td>' + escHtml(s.jenis || '—') +
            (s.dariWarga ? '<small class="bs-riwayat-asal">📱 dicatat warga</small>' : '') + '</td>' +
          '<td>' + (s.berat > 0 ? angkaRamah(s.berat) + ' kg' : '—') + '</td>' +
          '<td>' + (s.kantong > 0 ? angkaRamah(s.kantong) : '—') + '</td>' +
          '<td>' + (s.resmi ? BankSampah.rupiah(s.pendapatan)
            : '<span class="bs-riwayat-perkiraan">' +
              (s.perkiraan ? '± ' + BankSampah.rupiah(s.pendapatan) : '—') + '</span>') + '</td>' +
          '<td>' + lencanaRiwayat(s) + '</td>' +
          '<td class="bs-tabel-catatan">' + escHtml(s.catatan || '—') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    $('modalWargaIsi').innerHTML = html;
    const modal = $('modalWarga');
    modal.classList.add('tampil');
    modal.setAttribute('aria-hidden', 'false');
  }

  function kotak(label, isi) {
    return '<div><span class="bs-label-kecil" style="color:var(--tinta-lembut)">' + label +
      '</span><strong style="color:var(--tinta)">' + isi + '</strong></div>';
  }

  function jenisKotak(kelas, judul, bagian) {
    return '<div class="bs-jenis ' + kelas + '">' +
      '<div class="bs-jenis-nama">' + escHtml(judul) + '</div>' +
      '<div class="bs-jenis-baris"><span>Berat</span><strong>' + angkaRamah(bagian.berat) + ' kg</strong></div>' +
      '<div class="bs-jenis-baris"><span>Kantong</span><strong>' + angkaRamah(bagian.kantong) + '</strong></div>' +
      '<div class="bs-jenis-baris"><span>Pendapatan</span><strong>' + BankSampah.rupiah(bagian.pendapatan) + '</strong></div>' +
      '</div>';
  }

  function wiringModal() {
    const tutup = function () {
      const m = $('modalWarga');
      m.classList.remove('tampil');
      m.setAttribute('aria-hidden', 'true');
    };
    $('modalWargaTutup').addEventListener('click', tutup);
    $('modalWargaLatar').addEventListener('click', tutup);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      tutup();
      tutupModalMasuk();
    });
  }

  /* =======================================================================
   *  TAB 2 — SETORAN SAMPAH
   * ===================================================================== */
  function wiringFormSetoran() {
    $('formSetoran').addEventListener('submit', function (ev) {
      ev.preventDefault();
      simpanSetoran();
    });
    $('btnBatalSetoran').addEventListener('click', resetFormSetoran);

    // Harga & kolom "Lain-lain" mengikuti jenis sampah yang dipilih
    $('sJenis').addEventListener('change', function () {
      $('sHarga').value = hargaJenisTerpilih();
      aturKolomJenisLain();
      hitungSetoran();
    });
    aturKolomJenisLain();

    ['sBerat', 'sKantong', 'sHarga'].forEach(function (id) {
      $(id).addEventListener('input', hitungSetoran);
    });
    hitungSetoran();
  }

  /** Kolom keterangan hanya bisa diisi bila jenisnya memang butuh (Lain-lain). */
  function aturKolomJenisLain() {
    const kolom = $('sJenisLain');
    if (!kolom) return;
    const keterangan = BankSampah.cariJenis(nilai('sJenis'));
    const perlu = !!(keterangan && keterangan.isian);
    kolom.disabled = !perlu;
    if (!perlu) kolom.value = '';
  }

  /** Berat yang dipakai: hasil timbangan; bila kosong → perkiraan dari kantong. */
  function beratDipakai() {
    const berat = angka('sBerat');
    if (berat > 0) return berat;
    return angka('sKantong') * (KONFIGURASI.BANK_SAMPAH.KG_PER_KANTONG || 3);
  }

  function hitungSetoran() {
    const berat = beratDipakai();
    const rp = berat * angka('sHarga');
    $('hitungBerat').textContent = angkaRamah(berat) + ' kg';
    $('hitungRp').textContent = BankSampah.rupiah(rp);
  }

  function simpanSetoran() {
    const idWarga = nilai('sWarga');
    if (!idWarga) {
      toast('⚠️ Pilih dulu nama warga yang menyetor.');
      $('sWarga').focus();
      return;
    }

    const berat = beratDipakai();
    if (berat <= 0) {
      toast('⚠️ Isi berat (kg) atau jumlah kantong sampahnya.');
      $('sBerat').focus();
      return;
    }

    const jenis = nilai('sJenis') || (BankSampah.daftarJenis()[0] || {}).nama || BS_JENIS.KERING;
    const keterangan = BankSampah.cariJenis(jenis);
    const jenisLain = nilai('sJenisLain');
    if (keterangan && keterangan.isian && !jenisLain) {
      toast('⚠️ Jenis "' + jenis + '" perlu keterangan. Tulis sampah apa yang disetorkan.');
      $('sJenisLain').focus();
      return;
    }

    const harga = angka('sHarga');
    const record = {
      idWarga: idWarga,
      tanggal: nilai('sTanggal') || BankSampah.tanggalHariIni(),
      jenis: jenis,
      berat: Math.round(berat * 100) / 100,
      kantong: angka('sKantong'),
      hargaPerKg: harga,
      pendapatan: Math.round(berat * harga),
      catatan: [jenisLain ? 'Lain-lain: ' + jenisLain : '', nilai('sCatatan')]
        .filter(Boolean).join(' · '),
    };

    const tombol = $('btnSimpanSetoran');
    const labelTombol = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = '⏳ Menyimpan…';

    const idDiubah = ubahSetoranId;
    const idSebelum = data.setoran.map(function (s) { return String(s.id); });

    const janji = idDiubah
      ? BankSampah.ubahSetoran(idDiubah, record)
      : BankSampah.simpanSetoran(record);

    janji.then(function (hasil) {
      tombol.disabled = false;
      tombol.textContent = labelTombol;

      if (hasil.ok) {
        catatSetoranLokal(Object.assign({}, record, { id: hasil.id || idDiubah }));
        beresSimpanSetoran(idDiubah, record);
        muatData();
        return;
      }

      if (!hasil.tanpaBalasan) { toast('❌ ' + hasil.pesan); return; }

      toast('⏳ Balasan server lambat. Memeriksa apakah setoran sudah masuk…');
      muatData().then(function (muat) {
        if (!muat.ok) {
          toast('⚠️ Server bank sampah sedang tidak bisa dihubungi, jadi belum ketahuan ' +
            'apakah setorannya masuk. Klik "↻ Muat Ulang" dulu sebelum menyimpan lagi.');
          return;
        }

        const tersimpan = idDiubah
          ? cocokSetoran(data.setoran.filter(function (s) { return String(s.id) === String(idDiubah); })[0], record)
          : !!cariSetoranBaru(record, idSebelum);

        if (tersimpan) {
          beresSimpanSetoran(idDiubah, record);
        } else {
          toast('❌ Server bank sampah tidak menjawab dan setorannya belum masuk. ' +
            'Periksa koneksi internet, lalu simpan sekali lagi.');
        }
      });
    });
  }

  /** Dipanggil saat setoran sudah dipastikan tersimpan di server. */
  function beresSimpanSetoran(idDiubah, record) {
    const n = cariNasabah(record.idWarga);
    toast('✅ ' + (idDiubah ? 'Setoran diperbarui.' :
      'Setoran ' + angkaRamah(record.berat) + ' kg tersimpan untuk ' + ((n && n.nama) || record.idWarga) +
      ' (' + BankSampah.rupiah(record.pendapatan) + ').'));
    resetFormSetoran();
  }

  /** Menampilkan setoran yang baru disimpan tanpa menunggu pemuatan ulang. */
  function catatSetoranLokal(setoran) {
    if (!setoran.id) return;
    const lengkap = Object.assign({ status: BS_STATUS_CAIR.BELUM, tanggalCair: '' }, setoran);
    const i = data.setoran.findIndex(function (s) { return String(s.id) === String(lengkap.id); });
    if (i < 0) data.setoran.push(lengkap);
    else data.setoran[i] = Object.assign({}, data.setoran[i], setoran);
    hitungUlang();
    renderSemua();
  }

  /** Mencari setoran yang ternyata sudah masuk walau balasan server hilang.
   *  ID setoran dibuat server, jadi dicocokkan dari isinya. */
  function cariSetoranBaru(record, idSebelum) {
    return data.setoran.filter(function (s) {
      return idSebelum.indexOf(String(s.id)) < 0 && cocokSetoran(s, record);
    })[0] || null;
  }

  function cocokSetoran(s, record) {
    if (!s) return false;
    return BankSampah.normalId(s.idWarga) === BankSampah.normalId(record.idWarga) &&
      kunciTanggal(s.tanggal) === kunciTanggal(record.tanggal) &&
      samaNilai(s.jenis, record.jenis) &&
      samaNilai(s.catatan, record.catatan) &&
      BankSampah.keAngka(s.berat) === BankSampah.keAngka(record.berat) &&
      BankSampah.keAngka(s.kantong) === BankSampah.keAngka(record.kantong) &&
      BankSampah.keAngka(s.hargaPerKg) === BankSampah.keAngka(record.hargaPerKg) &&
      BankSampah.keAngka(s.pendapatan) === BankSampah.keAngka(record.pendapatan);
  }

  function resetFormSetoran() {
    ubahSetoranId = null;
    const sisaWarga = nilai('sWarga');
    $('formSetoran').reset();
    $('sWarga').value = sisaWarga; // petugas sering mencatat beberapa setoran berturut-turut
    $('sTanggal').value = BankSampah.tanggalHariIni();
    $('sHarga').value = hargaJenisTerpilih();
    aturKolomJenisLain();
    $('judulFormSetoran').textContent = '➕ Catat Setoran Sampah';
    $('ketFormSetoran').innerHTML = 'Isi setiap kali warga menyetor sampah. Pendapatan warga dihitung ' +
      'otomatis dari <strong>berat × harga per kg</strong>.';
    $('btnSimpanSetoran').textContent = '💾 Simpan Setoran';
    $('btnBatalSetoran').classList.add('tersembunyi');
    hitungSetoran();
  }

  function setorUntukWarga(id) {
    resetFormSetoran();
    $('sWarga').value = BankSampah.normalId(id);
    bukaTab('setoran');
    setTimeout(function () { $('sBerat').focus(); }, 250);
  }

  /** Memilih jenis pada formulir. Jenis dari riwayat lama (mis. "Kering")
   *  ditambahkan sementara supaya isian yang sedang diubah tidak berpindah
   *  ke jenis lain tanpa disadari petugas. */
  function pilihJenisSetoran(jenis) {
    const sel = $('sJenis');
    const teks = String(jenis || '').trim();
    if (!sel || !teks) return;

    const ada = Array.prototype.some.call(sel.options, function (o) { return o.value === teks; });
    if (!ada) {
      const opsi = document.createElement('option');
      opsi.value = teks;
      opsi.textContent = teks + ' (jenis lama)';
      sel.appendChild(opsi);
    }
    sel.value = teks;
  }

  function mulaiUbahSetoran(id) {
    const s = data.setoran.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!s) return;
    ubahSetoranId = s.id;

    $('sWarga').value = BankSampah.normalId(s.idWarga);
    $('sTanggal').value = kunciTanggal(s.tanggal) || BankSampah.tanggalHariIni();
    pilihJenisSetoran(s.jenis);
    aturKolomJenisLain();
    $('sBerat').value = BankSampah.keAngka(s.berat) || '';
    $('sKantong').value = BankSampah.keAngka(s.kantong) || '';
    $('sHarga').value = BankSampah.keAngka(s.hargaPerKg) || hargaJenisTerpilih();
    $('sCatatan').value = s.catatan || '';

    const n = cariNasabah(s.idWarga);
    $('judulFormSetoran').textContent = '✏️ Ubah Setoran ' + tanggalRamah(s.tanggal) +
      ((n && n.nama) ? ' — ' + n.nama : '');
    $('ketFormSetoran').textContent = 'Perbaiki angka yang salah, lalu klik "Simpan Perubahan".';
    $('btnSimpanSetoran').textContent = '💾 Simpan Perubahan';
    $('btnBatalSetoran').classList.remove('tersembunyi');

    hitungSetoran();
    bukaTab('setoran');
  }

  function hapusSetoran(id) {
    const s = data.setoran.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!s) return;
    const n = cariNasabah(s.idWarga);
    if (!window.confirm('Hapus setoran ' + angkaRamah(s.berat) + ' kg (' +
      BankSampah.rupiah(s.pendapatan) + ') milik ' + ((n && n.nama) || s.idWarga) + ' tanggal ' +
      tanggalRamah(s.tanggal) + '?\n\nTindakan ini tidak bisa dibatalkan.')) return;

    tanganiAksi(BankSampah.hapusSetoran(id), '🗑️', function () {
      if (ubahSetoranId === id) resetFormSetoran();
    });
  }

  function tandaiCairSetoran(id) {
    tanganiAksi(BankSampah.tandaiCair({ idSetoran: id }), '💵');
  }

  function batalkanCairSetoran(id) {
    if (!window.confirm('Kembalikan setoran ini menjadi "Belum Dicairkan"?')) return;
    tanganiAksi(BankSampah.batalCair(id), '↺');
  }

  function wiringFilterSetoran() {
    ['fsCari', 'fsJenis', 'fsStatus', 'fsRt', 'fsDari', 'fsSampai', 'fsUrut'].forEach(function (id) {
      const e = $(id);
      if (e) e.addEventListener('input', renderSetoran);
    });
    $('btnResetSetoran').addEventListener('click', function () {
      ['fsCari', 'fsJenis', 'fsStatus', 'fsRt', 'fsDari', 'fsSampai'].forEach(function (id) { $(id).value = ''; });
      $('fsUrut').value = 'baru';
      renderSetoran();
    });
    $('btnUnduhSetoran').addEventListener('click', unduhSetoran);
  }

  function saringSetoran() {
    const cari = nilai('fsCari').toLowerCase();
    const jenis = nilai('fsJenis');
    const status = nilai('fsStatus');
    const rt = nilai('fsRt');
    const dari = nilai('fsDari');
    const sampai = nilai('fsSampai');
    const urut = nilai('fsUrut') || 'baru';

    let hasil = data.setoran.filter(function (s) {
      const n = cariNasabah(s.idWarga);

      if (cari) {
        const gabung = [s.idWarga, (n && n.nama) || '', s.catatan || ''].join(' ').toLowerCase();
        if (gabung.indexOf(cari) < 0) return false;
      }
      if (jenis && String(s.jenis || '') !== jenis) return false;
      if (status) {
        const st = String(s.status || BS_STATUS_CAIR.BELUM);
        if (status === BS_STATUS_CAIR.SUDAH && st !== BS_STATUS_CAIR.SUDAH) return false;
        if (status === BS_STATUS_CAIR.BELUM && st === BS_STATUS_CAIR.SUDAH) return false;
      }
      if (rt && String((n && n.rt) || '') !== rt) return false;

      const tgl = kunciTanggal(s.tanggal);
      if (dari && (!tgl || tgl < dari)) return false;
      if (sampai && (!tgl || tgl > sampai)) return false;
      return true;
    });

    hasil.sort(function (a, b) {
      const na = cariNasabah(a.idWarga);
      const nb = cariNasabah(b.idWarga);
      switch (urut) {
        case 'lama':  return kunciTanggal(a.tanggal).localeCompare(kunciTanggal(b.tanggal));
        case 'besar': return BankSampah.keAngka(b.pendapatan) - BankSampah.keAngka(a.pendapatan);
        case 'berat': return BankSampah.keAngka(b.berat) - BankSampah.keAngka(a.berat);
        case 'nama':  return String((na && na.nama) || '').localeCompare(String((nb && nb.nama) || ''), 'id');
        default:      return kunciTanggal(b.tanggal).localeCompare(kunciTanggal(a.tanggal));
      }
    });

    return hasil;
  }

  function renderSetoran() {
    tampilSetoran = saringSetoran();
    const wadah = $('tabelSetoran');

    $('infoJumlahSetoran').textContent =
      'Menampilkan ' + tampilSetoran.length + ' dari ' + data.setoran.length + ' setoran';

    if (!data.setoran.length) {
      wadah.innerHTML = '<p class="adm-kosong">Belum ada setoran tercatat.<br>' +
        'Gunakan formulir <strong>“Catat Setoran Sampah”</strong> di atas saat warga menyetor. 👆</p>';
      return;
    }
    if (!tampilSetoran.length) {
      wadah.innerHTML = '<p class="adm-kosong">Tidak ada setoran yang cocok dengan penyaring. ' +
        'Coba klik <strong>“↺ Bersihkan Penyaring”</strong>.</p>';
      return;
    }

    let totalBerat = 0, totalRp = 0, totalKantong = 0;

    let html = '<div class="adm-tabel-wadah"><table class="adm-tabel"><thead><tr>' +
      '<th>No.</th><th>Tanggal</th><th>ID Nasabah</th><th>Nama Warga</th><th>RT/RW</th>' +
      '<th>Jenis</th><th class="adm-kanan">Berat</th><th class="adm-kanan">Kantong</th>' +
      '<th class="adm-kanan">Harga/kg</th><th class="adm-kanan">Pendapatan</th>' +
      '<th>Status</th><th>Tgl Cair</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>';

    tampilSetoran.forEach(function (s, i) {
      const n = cariNasabah(s.idWarga);
      const sudah = String(s.status || '').indexOf('Sudah') === 0;
      totalBerat += BankSampah.keAngka(s.berat);
      totalKantong += BankSampah.keAngka(s.kantong);
      totalRp += BankSampah.keAngka(s.pendapatan);

      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + escHtml(tanggalRamah(s.tanggal)) + '</td>' +
        '<td><strong>' + escHtml(s.idWarga) + '</strong></td>' +
        '<td>' + escHtml((n && n.nama) || '(warga terhapus)') + '</td>' +
        '<td>' + escHtml(n ? [n.rt ? 'RT ' + n.rt : '', n.rw ? 'RW ' + n.rw : ''].filter(Boolean).join(' / ') || '—' : '—') + '</td>' +
        '<td><span class="bs-badge ' + warnaJenis(s.jenis) + '">' +
          escHtml(s.jenis || '—') + '</span></td>' +
        '<td class="adm-kanan">' + angkaRamah(s.berat) + ' kg</td>' +
        '<td class="adm-kanan">' + angkaRamah(s.kantong) + '</td>' +
        '<td class="adm-kanan">' + BankSampah.rupiah(s.hargaPerKg) + '</td>' +
        '<td class="adm-kanan"><strong>' + BankSampah.rupiah(s.pendapatan) + '</strong></td>' +
        '<td><span class="bs-badge ' + (sudah ? 'bs-badge-abu' : 'bs-badge-kuning') + '">' +
          escHtml(s.status || BS_STATUS_CAIR.BELUM) + '</span></td>' +
        '<td>' + escHtml(sudah ? tanggalRamah(s.tanggalCair) : '—') + '</td>' +
        '<td>' + escHtml(s.catatan || '—') + '</td>' +
        '<td class="adm-aksi-sel">' +
          btn('edit', s.id, '✏️ Ubah') +
          (sudah ? btn('batalcair', s.id, '↺ Batal Cair') : btn('cair', s.id, '💵 Tandai Cair')) +
          btn('hapus', s.id, '🗑️ Hapus') +
        '</td></tr>';
    });

    html += '</tbody><tfoot><tr>' +
      '<td colspan="6">TOTAL (sesuai penyaring)</td>' +
      '<td class="adm-kanan">' + angkaRamah(totalBerat) + ' kg</td>' +
      '<td class="adm-kanan">' + angkaRamah(totalKantong) + '</td>' +
      '<td></td>' +
      '<td class="adm-kanan">' + BankSampah.rupiah(totalRp) + '</td>' +
      '<td colspan="4"></td></tr></tfoot></table></div>';

    wadah.innerHTML = html;
    pasangAksi(wadah, {
      edit: mulaiUbahSetoran,
      cair: tandaiCairSetoran,
      batalcair: batalkanCairSetoran,
      hapus: hapusSetoran,
    });
  }

  /* =======================================================================
   *  TAB 2 — SETORAN YANG DICATAT SENDIRI OLEH WARGA
   *  ---------------------------------------------------------------------
   *  Catatan ini BELUM menambah tabungan siapa pun. Petugas memeriksa
   *  fotonya, menimbang sampah yang dibawa, lalu menyetujui (berubah jadi
   *  setoran resmi) atau menolaknya.
   * ===================================================================== */
  function wiringSetoranWarga() {
    ['fmCari', 'fmStatus', 'fmJenis', 'fmUrut'].forEach(function (id) {
      const e = $(id);
      if (e) e.addEventListener('input', renderSetoranWarga);
    });
    $('btnResetMasuk').addEventListener('click', function () {
      $('fmCari').value = '';
      $('fmJenis').value = '';
      $('fmStatus').value = BS_STATUS_SETOR.MENUNGGU;
      $('fmUrut').value = 'baru';
      renderSetoranWarga();
    });
    $('btnUnduhMasuk').addEventListener('click', unduhMasuk);

    ['mBerat', 'mKantong', 'mHarga'].forEach(function (id) {
      const e = $(id);
      if (e) e.addEventListener('input', hitungMasuk);
    });

    $('btnSetujuiMasuk').addEventListener('click', setujuiMasuk);
    $('btnTolakMasuk').addEventListener('click', tolakMasuk);

    const tutup = $('modalMasukTutup');
    const latar = $('modalMasukLatar');
    if (tutup) tutup.addEventListener('click', tutupModalMasuk);
    if (latar) latar.addEventListener('click', tutupModalMasuk);
  }

  function cariMasuk(id) {
    return data.setoranWarga.filter(function (s) { return String(s.id) === String(id); })[0] || null;
  }

  function statusMasuk(s) {
    return String((s && s.status) || BS_STATUS_SETOR.MENUNGGU);
  }

  function saringMasuk() {
    const cari = nilai('fmCari').toLowerCase();
    const status = nilai('fmStatus');
    const jenis = nilai('fmJenis');
    const urut = nilai('fmUrut') || 'baru';

    const hasil = data.setoranWarga.filter(function (s) {
      if (cari) {
        const gabung = [s.idWarga, s.nama, s.noHp, s.alamat, s.jenisLain].join(' ').toLowerCase();
        if (gabung.indexOf(cari) < 0) return false;
      }
      if (status && statusMasuk(s) !== status) return false;
      if (jenis && String(s.jenis || '') !== jenis) return false;
      return true;
    });

    hasil.sort(function (a, b) {
      switch (urut) {
        case 'lama': return String(a.tanggal || '').localeCompare(String(b.tanggal || ''));
        case 'nama': return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
        default:     return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
      }
    });

    return hasil;
  }

  function renderSetoranWarga() {
    tampilMasuk = saringMasuk();
    const wadah = $('tabelMasuk');
    if (!wadah) return;

    $('infoJumlahMasuk').textContent =
      'Menampilkan ' + tampilMasuk.length + ' dari ' + data.setoranWarga.length + ' catatan';

    if (!data.setoranWarga.length) {
      wadah.innerHTML = '<p class="adm-kosong">Belum ada setoran yang dicatat warga. 🎉<br>' +
        'Catatan muncul di sini begitu warga mengisi formulir ' +
        '<strong>“📸 Catat Setoran Sampah”</strong> di halaman Bank Sampah.</p>';
      return;
    }
    if (!tampilMasuk.length) {
      wadah.innerHTML = '<p class="adm-kosong">Tidak ada catatan yang cocok dengan penyaring. ' +
        'Coba klik <strong>“↺ Bersihkan Penyaring”</strong>.</p>';
      return;
    }

    const warnaStatus = {};
    warnaStatus[BS_STATUS_SETOR.MENUNGGU] = 'bs-badge-kuning';
    warnaStatus[BS_STATUS_SETOR.DISETUJUI] = 'bs-badge-hijau';
    warnaStatus[BS_STATUS_SETOR.DITOLAK] = 'bs-badge-merah';

    let html = '<div class="adm-tabel-wadah"><table class="adm-tabel"><thead><tr>' +
      '<th>No.</th><th>Foto</th><th>Tanggal Isi</th><th>ID Nasabah</th><th>Nama Lengkap</th>' +
      '<th>Alamat</th><th>RT/RW</th><th>No. HP/WA</th><th>Terdaftar</th><th>Jenis Sampah</th>' +
      '<th class="adm-kanan">Perkiraan Berat</th><th class="adm-kanan">Kantong</th>' +
      '<th>Catatan Warga</th><th>Status</th><th>Tgl Proses</th><th>Catatan Petugas</th>' +
      '<th>Aksi</th></tr></thead><tbody>';

    tampilMasuk.forEach(function (s, i) {
      const st = statusMasuk(s);
      const menunggu = st === BS_STATUS_SETOR.MENUNGGU;
      const gambar = BankSampah.tautanFoto(s.foto, true);
      const buka = BankSampah.tautanFoto(s.foto, false);

      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + (gambar
          ? '<a href="' + escHtml(buka) + '" target="_blank" rel="noopener" title="Buka foto ukuran penuh">' +
            '<img class="adm-foto-kecil" src="' + escHtml(gambar) + '" alt="Foto setoran ' +
            escHtml(s.nama || '') + '" loading="lazy"></a>'
          : '<span class="adm-tanpa-foto">tanpa foto</span>') + '</td>' +
        '<td>' + escHtml(tanggalRamah(s.tanggal)) + '</td>' +
        '<td><strong>' + escHtml(s.idWarga || '—') + '</strong></td>' +
        '<td>' + escHtml(s.nama || '—') + '</td>' +
        '<td>' + escHtml(s.alamat || '—') + '</td>' +
        '<td>' + escHtml([s.rt ? 'RT ' + s.rt : '', s.rw ? 'RW ' + s.rw : ''].filter(Boolean).join(' / ') || '—') + '</td>' +
        '<td>' + escHtml(s.noHp || '—') + '</td>' +
        '<td><span class="bs-badge ' + (String(s.terdaftar) === 'Ya' ? 'bs-badge-abu' : 'bs-badge-biru') + '">' +
          escHtml(String(s.terdaftar) === 'Ya' ? 'Lama' : 'Baru') + '</span></td>' +
        '<td><span class="bs-badge ' + warnaJenis(s.jenis) + '">' +
          escHtml(BankSampah.labelJenis(s.jenis, s.jenisLain)) + '</span></td>' +
        '<td class="adm-kanan">' + (BankSampah.keAngka(s.berat) ? angkaRamah(s.berat) + ' kg' : '—') + '</td>' +
        '<td class="adm-kanan">' + (BankSampah.keAngka(s.kantong) ? angkaRamah(s.kantong) : '—') + '</td>' +
        '<td>' + escHtml(s.catatan || '—') + '</td>' +
        '<td><span class="bs-badge ' + (warnaStatus[st] || 'bs-badge-abu') + '">' + escHtml(st) + '</span></td>' +
        '<td>' + escHtml(s.tanggalProses ? tanggalRamah(s.tanggalProses) : '—') + '</td>' +
        '<td>' + escHtml(s.catatanPetugas || '—') + '</td>' +
        '<td class="adm-aksi-sel">' +
          btn('periksa', s.id, menunggu ? '👁️ Periksa' : '👁️ Lihat') +
          btn('hapus', s.id, '🗑️ Hapus') +
        '</td></tr>';
    });

    wadah.innerHTML = html + '</tbody></table></div>';
    pasangAksi(wadah, { periksa: lihatMasuk, hapus: hapusMasuk });
  }

  /* ---------------------------------------------------------------------
   *  Kotak "Periksa Setoran Warga"
   * ------------------------------------------------------------------- */
  function lihatMasuk(id) {
    const s = cariMasuk(id);
    if (!s) return;
    masukDiperiksa = s;

    const st = statusMasuk(s);
    const menunggu = st === BS_STATUS_SETOR.MENUNGGU;
    const gambar = BankSampah.tautanFoto(s.foto, true);
    const buka = BankSampah.tautanFoto(s.foto, false);
    const n = cariNasabah(s.idWarga);

    $('modalMasukJudul').textContent = (menunggu ? '🔍 Periksa Setoran — ' : '📄 Setoran — ') +
      (s.nama || s.idWarga || 'Warga');

    let html = '<div class="adm-periksa-status bs-badge ' +
      (menunggu ? 'bs-badge-kuning' : (st === BS_STATUS_SETOR.DISETUJUI ? 'bs-badge-hijau' : 'bs-badge-merah')) +
      '">' + escHtml(st) + '</div>';

    html += gambar
      ? '<a class="adm-foto-besar" href="' + escHtml(buka) + '" target="_blank" rel="noopener">' +
        '<img src="' + escHtml(gambar) + '" alt="Foto bukti setoran ' + escHtml(s.nama || '') + '">' +
        '<span>🔎 Klik untuk membuka foto ukuran penuh</span></a>'
      : '<p class="adm-kosong">Warga tidak menyertakan foto (atau fotonya gagal tersimpan).</p>';

    html += '<div class="bs-identitas-rincian adm-periksa-rincian">' +
      kotak('ID Nasabah', escHtml(s.idWarga || '—') +
        (String(s.terdaftar) === 'Ya' ? '' : ' <small>(nasabah baru)</small>')) +
      kotak('Nama Lengkap', escHtml(s.nama || '—')) +
      kotak('NIK', escHtml(s.nik || (n && n.nik) || '—')) +
      kotak('No. HP/WA', escHtml(s.noHp || '—')) +
      kotak('Alamat', escHtml(s.alamat || '—')) +
      kotak('RT / RW', escHtml([s.rt || '—', s.rw || '—'].join(' / '))) +
      kotak('Jenis Sampah', escHtml(BankSampah.labelJenis(s.jenis, s.jenisLain))) +
      kotak('Tanggal Diisi Warga', escHtml(tanggalRamah(s.tanggal))) +
      kotak('Perkiraan Berat', BankSampah.keAngka(s.berat) ? angkaRamah(s.berat) + ' kg' : '—') +
      kotak('Jumlah Kantong', BankSampah.keAngka(s.kantong) ? angkaRamah(s.kantong) : '—') +
      kotak('Catatan Warga', escHtml(s.catatan || '—')) +
      kotak('Nomor Catatan', escHtml(s.id)) +
      '</div>';

    if (!n) {
      html += '<div class="adm-catatan">⚠️ ID Nasabah pada catatan ini <strong>tidak ada</strong> di ' +
        'Data Warga. Daftarkan dulu warganya di tab <strong>👥 Data Warga</strong> sebelum menyetujui.</div>';
    }
    if (!menunggu) {
      html += '<div class="adm-catatan">Catatan ini sudah diproses pada <strong>' +
        escHtml(tanggalRamah(s.tanggalProses)) + '</strong>.' +
        (s.catatanPetugas ? ' Catatan petugas: <strong>' + escHtml(s.catatanPetugas) + '</strong>.' : '') +
        (s.idSetoran ? ' Nomor setoran resminya: <strong>' + escHtml(s.idSetoran) + '</strong>.' : '') +
        '</div>';
    }

    $('modalMasukIsi').innerHTML = html;

    // Kotak persetujuan hanya untuk catatan yang masih menunggu.
    $('modalMasukAksi').classList.toggle('tersembunyi', !menunggu);
    if (menunggu) {
      $('mBerat').value = BankSampah.keAngka(s.berat) || '';
      $('mKantong').value = BankSampah.keAngka(s.kantong) || '';
      $('mHarga').value = BankSampah.hargaJenis(s.jenis);
      $('mTanggal').value = kunciTanggal(s.tanggal) || BankSampah.tanggalHariIni();
      $('mCatatan').value = '';
      hitungMasuk();
    }

    const modal = $('modalMasuk');
    modal.classList.add('tampil');
    modal.setAttribute('aria-hidden', 'false');
  }

  function tutupModalMasuk() {
    const modal = $('modalMasuk');
    if (!modal) return;
    modal.classList.remove('tampil');
    modal.setAttribute('aria-hidden', 'true');
    masukDiperiksa = null;
  }

  /** Berat yang dipakai saat menyetujui: hasil timbangan, atau perkiraan kantong. */
  function beratMasuk() {
    const berat = angka('mBerat');
    if (berat > 0) return berat;
    return angka('mKantong') * (KONFIGURASI.BANK_SAMPAH.KG_PER_KANTONG || 3);
  }

  function hitungMasuk() {
    const berat = beratMasuk();
    $('mHitungBerat').textContent = angkaRamah(berat) + ' kg';
    $('mHitungRp').textContent = BankSampah.rupiah(berat * angka('mHarga'));
  }

  function setujuiMasuk() {
    const s = masukDiperiksa;
    if (!s) return;

    const berat = beratMasuk();
    if (berat <= 0) {
      toast('⚠️ Isi dulu berat hasil timbangan (atau jumlah kantongnya).');
      $('mBerat').focus();
      return;
    }
    if (!cariNasabah(s.idWarga)) {
      toast('⚠️ ID Nasabah "' + (s.idWarga || '-') + '" belum ada di Data Warga. Daftarkan dulu warganya.');
      return;
    }

    const harga = angka('mHarga');
    if (!window.confirm('Setujui setoran ' + BankSampah.labelJenis(s.jenis, s.jenisLain) + ' dari ' +
      (s.nama || s.idWarga) + '?\n\n' +
      'Yang dicatat: ' + angkaRamah(berat) + ' kg × ' + BankSampah.rupiah(harga) + ' = ' +
      BankSampah.rupiah(Math.round(berat * harga)) + '\n\n' +
      'Setoran ini langsung menambah tabungan warga tersebut.')) return;

    kunciTombolMasuk(true);
    tanganiAksi(
      BankSampah.prosesSetoranWarga(s.id, BS_STATUS_SETOR.DISETUJUI, {
        berat: Math.round(berat * 100) / 100,
        kantong: angka('mKantong'),
        hargaPerKg: harga,
        tanggal: nilai('mTanggal') || BankSampah.tanggalHariIni(),
        catatan: nilai('mCatatan'),
      }),
      '✅',
      tutupModalMasuk
    ).then(function () { kunciTombolMasuk(false); });
  }

  function tolakMasuk() {
    const s = masukDiperiksa;
    if (!s) return;

    if (!window.confirm('Tolak catatan setoran dari ' + (s.nama || s.idWarga) + '?\n\n' +
      'Tabungan warga tidak berubah, dan mereka bisa mencatat setoran lagi nanti.')) return;

    const alasan = nilai('mCatatan') ||
      (window.prompt('Alasan penolakan (boleh dikosongkan) — akan terlihat di daftar:', '') || '');

    kunciTombolMasuk(true);
    tanganiAksi(
      BankSampah.prosesSetoranWarga(s.id, BS_STATUS_SETOR.DITOLAK, { catatan: alasan }),
      '✖️',
      tutupModalMasuk
    ).then(function () { kunciTombolMasuk(false); });
  }

  function kunciTombolMasuk(kunci) {
    $('btnSetujuiMasuk').disabled = kunci;
    $('btnTolakMasuk').disabled = kunci;
    $('btnSetujuiMasuk').textContent = kunci ? '⏳ Memproses…' : '✅ Setujui & Masukkan ke Tabungan';
  }

  function hapusMasuk(id) {
    const s = cariMasuk(id);
    if (!s) return;
    if (!window.confirm('Hapus catatan setoran dari ' + (s.nama || s.idWarga) + ' tanggal ' +
      tanggalRamah(s.tanggal) + '?\n\n' +
      (s.idSetoran
        ? 'Setoran resmi yang sudah masuk ke tabungan TIDAK ikut terhapus.'
        : 'Catatan ini belum pernah masuk ke tabungan warga.') +
      '\nTindakan ini tidak bisa dibatalkan.')) return;

    tanganiAksi(BankSampah.hapusSetoranWarga(id), '🗑️', function () {
      if (masukDiperiksa && String(masukDiperiksa.id) === String(id)) tutupModalMasuk();
    });
  }

  /* =======================================================================
   *  TAB 4 — PENCAIRAN
   * ===================================================================== */
  function wiringPencairan() {
    ['fpCari', 'fpStatus', 'fpUrut'].forEach(function (id) {
      const e = $(id);
      if (e) e.addEventListener('input', renderPengajuan);
    });
    $('btnResetPengajuan').addEventListener('click', function () {
      $('fpCari').value = '';
      $('fpStatus').value = BS_STATUS_AJU.DIAJUKAN;
      $('fpUrut').value = 'baru';
      renderPengajuan();
    });
    $('btnUnduhPengajuan').addEventListener('click', unduhPengajuan);

    $('cairWarga').addEventListener('change', function () {
      const id = nilai('cairWarga');
      const info = $('cairInfo');
      if (!id) {
        info.textContent = 'Pilih nama warga untuk melihat sisa tabungannya.';
        return;
      }
      const r = ringkasanDari(id);
      info.textContent = 'Tabungan yang belum dicairkan: ' + BankSampah.rupiah(r.belumCair) +
        ' dari ' + r.jumlahSetoran + ' setoran.';
    });

    $('btnCairLangsung').addEventListener('click', function () {
      const id = nilai('cairWarga');
      if (!id) { toast('⚠️ Pilih dulu warganya.'); return; }
      cairkanWarga(id);
    });
  }

  function cairkanWarga(id) {
    const n = cariNasabah(id);
    const r = ringkasanDari(id);
    if (r.belumCair <= 0) { toast('ℹ️ Warga ini tidak punya tabungan yang belum dicairkan.'); return; }

    if (!window.confirm('Tandai seluruh tabungan ' + ((n && n.nama) || id) + ' sebesar ' +
      BankSampah.rupiah(r.belumCair) + ' sebagai SUDAH DICAIRKAN?\n\n' +
      'Lakukan ini hanya setelah uangnya benar-benar diserahkan ke warga.')) return;

    BankSampah.tandaiCair({ idWarga: id }).then(function (hasil) {
      if (!hasil.ok && !hasil.tanpaBalasan) { toast('❌ ' + hasil.pesan); return; }

      const ikon = hasil.ok ? '💵' : '⏳';
      const pesan = hasil.ok ? hasil.pesan
        : 'Balasan server lambat — daftar dimuat ulang. Mohon periksa status pencairannya di tabel.';

      // Bila warga punya pengajuan yang masih menunggu, sekalian ditutup.
      const menunggu = r.pengajuanMenunggu;
      if (menunggu) {
        BankSampah.prosesPengajuan(menunggu.id, BS_STATUS_AJU.DISETUJUI, 'Dicairkan langsung oleh petugas')
          .then(function () { selesaiCair(ikon, pesan); });
      } else {
        selesaiCair(ikon, pesan);
      }
    });
  }

  function selesaiCair(ikon, pesan) {
    toast(ikon + ' ' + pesan);
    $('cairWarga').value = '';
    $('cairInfo').textContent = 'Pilih nama warga untuk melihat sisa tabungannya.';
    muatData();
  }

  function prosesPengajuan(id, status) {
    const p = data.pengajuan.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return;

    const pesan = (status === BS_STATUS_AJU.DISETUJUI)
      ? 'Setujui pencairan ' + BankSampah.rupiah(p.jumlah) + ' untuk ' + (p.nama || p.idWarga) + '?\n\n' +
        'Seluruh setoran warga ini akan ditandai SUDAH DICAIRKAN. ' +
        'Lakukan setelah uangnya diserahkan.'
      : 'Tolak pengajuan pencairan ' + BankSampah.rupiah(p.jumlah) + ' dari ' + (p.nama || p.idWarga) + '?\n\n' +
        'Tabungan warga tidak berubah dan mereka bisa mengajukan lagi nanti.';
    if (!window.confirm(pesan)) return;

    let catatan = '';
    if (status === BS_STATUS_AJU.DITOLAK) {
      catatan = window.prompt('Alasan penolakan (boleh dikosongkan) — akan tersimpan sebagai catatan:', '') || '';
    }

    tanganiAksi(BankSampah.prosesPengajuan(id, status, catatan), '✅');
  }

  function hapusPengajuan(id) {
    if (!window.confirm('Hapus catatan pengajuan ini? Tabungan warga tidak ikut berubah.')) return;
    tanganiAksi(BankSampah.hapusPengajuan(id), '🗑️');
  }

  function saringPengajuan() {
    const cari = nilai('fpCari').toLowerCase();
    const status = nilai('fpStatus');
    const urut = nilai('fpUrut') || 'baru';

    let hasil = data.pengajuan.filter(function (p) {
      if (cari) {
        const gabung = [p.idWarga, p.nama || '', p.catatan || ''].join(' ').toLowerCase();
        if (gabung.indexOf(cari) < 0) return false;
      }
      if (status && String(p.status || '') !== status) return false;
      return true;
    });

    hasil.sort(function (a, b) {
      switch (urut) {
        case 'lama':  return String(a.tanggal || '').localeCompare(String(b.tanggal || ''));
        case 'besar': return BankSampah.keAngka(b.jumlah) - BankSampah.keAngka(a.jumlah);
        default:      return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
      }
    });

    return hasil;
  }

  function renderPengajuan() {
    tampilPengajuan = saringPengajuan();
    const wadah = $('tabelPengajuan');

    $('infoJumlahPengajuan').textContent =
      'Menampilkan ' + tampilPengajuan.length + ' dari ' + data.pengajuan.length + ' pengajuan';

    if (!tampilPengajuan.length) {
      wadah.innerHTML = '<p class="adm-kosong">' +
        (data.pengajuan.length
          ? 'Tidak ada pengajuan yang cocok dengan penyaring.'
          : 'Belum ada pengajuan pencairan dari warga. 🎉<br>' +
            'Pengajuan muncul di sini setelah warga menekan tombol ' +
            '<strong>“Ajukan Pencairan Pendapatan”</strong> di halaman Cek Bank Sampah.') +
        '</p>';
      return;
    }

    const warnaStatus = {};
    warnaStatus[BS_STATUS_AJU.DIAJUKAN] = 'bs-badge-kuning';
    warnaStatus[BS_STATUS_AJU.DISETUJUI] = 'bs-badge-hijau';
    warnaStatus[BS_STATUS_AJU.DITOLAK] = 'bs-badge-merah';

    let html = '<div class="adm-tabel-wadah"><table class="adm-tabel"><thead><tr>' +
      '<th>No.</th><th>Tanggal Ajukan</th><th>ID Nasabah</th><th>Nama Warga</th><th>No. HP</th>' +
      '<th class="adm-kanan">Jumlah</th><th>Status</th><th>Tgl Proses</th><th>Catatan</th>' +
      '<th>Aksi</th></tr></thead><tbody>';

    tampilPengajuan.forEach(function (p, i) {
      const n = cariNasabah(p.idWarga);
      const st = String(p.status || BS_STATUS_AJU.DIAJUKAN);
      const menunggu = st === BS_STATUS_AJU.DIAJUKAN;

      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + escHtml(tanggalRamah(p.tanggal)) + '</td>' +
        '<td><strong>' + escHtml(p.idWarga) + '</strong></td>' +
        '<td>' + escHtml(p.nama || (n && n.nama) || '—') + '</td>' +
        '<td>' + escHtml((n && n.noHp) || '—') + '</td>' +
        '<td class="adm-kanan"><strong>' + BankSampah.rupiah(p.jumlah) + '</strong></td>' +
        '<td><span class="bs-badge ' + (warnaStatus[st] || 'bs-badge-abu') + '">' + escHtml(st) + '</span></td>' +
        '<td>' + escHtml(p.tanggalProses ? tanggalRamah(p.tanggalProses) : '—') + '</td>' +
        '<td>' + escHtml(p.catatan || '—') + '</td>' +
        '<td class="adm-aksi-sel">' +
          (menunggu ? btn('setuju', p.id, '✅ Setujui & Tandai Cair') + btn('tolak', p.id, '✖️ Tolak') : '') +
          btn('hapus', p.id, '🗑️ Hapus') +
        '</td></tr>';
    });

    wadah.innerHTML = html + '</tbody></table></div>';
    pasangAksi(wadah, {
      setuju: function (id) { prosesPengajuan(id, BS_STATUS_AJU.DISETUJUI); },
      tolak: function (id) { prosesPengajuan(id, BS_STATUS_AJU.DITOLAK); },
      hapus: hapusPengajuan,
    });
  }

  /* =======================================================================
   *  TAB 6 — AKUN PETUGAS  (ganti nama pengguna & kata sandi)
   *  ---------------------------------------------------------------------
   *  Seluruh urusan sandi-menyandi ada di js/bank-sampah-akun.js. Di sini
   *  hanya urusan tampilan: mengisi kotak keterangan, memeriksa isian di
   *  layar, dan menampilkan hasilnya.
   * ===================================================================== */
  function wiringAkun() {
    const form = $('formAkun');
    if (!form) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      simpanAkunBaru();
    });

    $('btnBatalAkun').addEventListener('click', function () {
      resetFormAkun();
      $('akUserLama').focus();
    });

    $('btnGantiLagi').addEventListener('click', function () {
      $('akBerhasil').classList.add('tersembunyi');
      form.classList.remove('tersembunyi');
      resetFormAkun();
      $('akUserLama').focus();
    });

    $('btnKeluarAkun').addEventListener('click', keluarDashboard);

    /* Tombol mata 👁️ — supaya petugas bisa memastikan ketikannya benar. */
    document.querySelectorAll('.adm-sandi-lihat').forEach(function (tombol) {
      tombol.addEventListener('click', function () {
        const kotak = $(tombol.getAttribute('data-lihat'));
        if (!kotak) return;
        const sedangTerlihat = kotak.type === 'text';
        kotak.type = sedangTerlihat ? 'password' : 'text';
        tombol.textContent = sedangTerlihat ? '👁️' : '🙈';
        tombol.setAttribute('aria-label',
          sedangTerlihat ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi');
        kotak.focus();
      });
    });

    $('akSandiBaru').addEventListener('input', petunjukSandi);
    $('akUlangi').addEventListener('input', petunjukSandi);
  }

  /** Menampilkan penilaian kekuatan sandi & kecocokan ulangannya. */
  function petunjukSandi() {
    const sandi = $('akSandiBaru').value;
    const ulangi = $('akUlangi').value;

    const nilaiSandi = AkunPetugas.nilaiSandi(sandi);
    const kotakNilai = $('akNilaiSandi');
    kotakNilai.textContent = nilaiSandi.label;
    kotakNilai.className = 'adm-sandi-nilai' + (nilaiSandi.kelas ? ' ' + nilaiSandi.kelas : '');

    const kotakCocok = $('akCocokSandi');
    if (!ulangi) {
      kotakCocok.textContent = '';
      kotakCocok.className = '';
      return;
    }
    const cocok = ulangi === sandi;
    kotakCocok.textContent = cocok ? '✅ Sudah sama.' : '❌ Belum sama dengan kata sandi baru di atas.';
    kotakCocok.className = 'adm-sandi-nilai ' + (cocok ? 'kuat' : 'lemah');
  }

  /** Pesan merah/kuning di bawah formulir akun. */
  function pesanAkun(teks, catatan, jenis) {
    const kotak = $('akPesan');
    if (!kotak) return;
    if (!teks && !catatan) {
      kotak.classList.add('tersembunyi');
      kotak.textContent = '';
      return;
    }
    kotak.className = 'adm-akun-pesan' + (jenis === 'hati' ? ' hati' : '');
    kotak.innerHTML = escHtml(teks || '') +
      (catatan ? '<br><small>' + escHtml(catatan) + '</small>' : '');
  }

  function kosongkanSandiAkun() {
    ['akSandiLama', 'akSandiBaru', 'akUlangi'].forEach(function (id) {
      const kotak = $(id);
      if (kotak) { kotak.value = ''; kotak.type = 'password'; }
    });
    document.querySelectorAll('.adm-sandi-lihat').forEach(function (t) { t.textContent = '👁️'; });
    const nilaiKotak = $('akNilaiSandi');
    const cocokKotak = $('akCocokSandi');
    if (nilaiKotak) { nilaiKotak.textContent = ''; nilaiKotak.className = 'adm-sandi-nilai'; }
    if (cocokKotak) { cocokKotak.textContent = ''; cocokKotak.className = ''; }
  }

  function resetFormAkun() {
    const form = $('formAkun');
    if (form) form.reset();
    kosongkanSandiAkun();
    pesanAkun('', '');
  }

  /** Memindahkan sorotan ke isian yang bermasalah. */
  function fokusIsianAkun(isian) {
    const peta = {
      lama: 'akSandiLama', userBaru: 'akUserBaru',
      sandiBaru: 'akSandiBaru', ulangi: 'akUlangi',
    };
    const kotak = $(peta[isian] || 'akUserLama');
    if (kotak) kotak.focus();
  }

  /* ------------------ Kotak "akun yang sedang berlaku" ------------------- */
  function tulisKotakAkun(nama, ket, hati) {
    const kotakNama = $('akunNamaSekarang');
    const kotakKet = $('akunKetSekarang');
    if (kotakNama) kotakNama.textContent = nama || '—';
    if (kotakKet) {
      kotakKet.textContent = ket || '';
      kotakKet.className = 'adm-akun-ket' + (hati ? ' hati' : '');
    }
  }

  /** Menerangkan akun mana yang sedang dipakai & di mana ia tersimpan. */
  function segarkanKotakAkun() {
    if (!$('akunNamaSekarang')) return;

    const cepat = AkunPetugas.infoCepat();
    const nama = namaPetugas || cepat.username;
    const kapan = function (waktu) { return waktu ? ' Terakhir diganti: ' + waktu + '.' : ''; };

    if (!BankSampah.pakaiServer()) {
      tulisKotakAkun(nama,
        'Akun ini berlaku di PERANGKAT INI saja, karena dashboard belum tersambung ke ' +
        'penyimpanan online.' + kapan(cepat.diubah) + ' ' + saranHubungi(), true);
      return;
    }

    tulisKotakAkun(nama, 'Memeriksa akun…', false);

    AkunPetugas.info().then(function (info) {
      const diPerangkat = AkunPetugas.akunPerangkat();

      if (!info.ok) {
        console.warn('Keterangan akun belum bisa dipastikan:', info.catatan);
        tulisKotakAkun(nama,
          'Keterangan akun belum bisa dipastikan karena penyimpanan online sedang tidak ' +
          'menjawab. Untuk sementara dipakai catatan akun di perangkat ini. Coba buka lagi ' +
          'tab ini sebentar lagi.', true);
        return;
      }

      if (!info.bawaan) {
        tulisKotakAkun(info.username,
          'Tersimpan online, jadi berlaku di semua HP/laptop.' + kapan(info.diubah), false);
        return;
      }

      if (diPerangkat) {
        tulisKotakAkun(diPerangkat.username,
          '⚠️ Akun ini baru berlaku di PERANGKAT INI — dari HP/laptop lain, akun yang berlaku ' +
          'masih yang lama. ' + saranHubungi() + ' Sesudah dibereskan, ganti akunnya sekali lagi ' +
          'dari sini agar berlaku di mana saja.',
          true);
        return;
      }

      tulisKotakAkun(info.username,
        'Ini masih akun BAWAAN yang dipakai sejak dashboard dipasang, dan sudah diketahui ' +
        'orang lain di luar petugas. Sebaiknya segera diganti lewat formulir di bawah.',
        true);
    });
  }

  /* ------------------------ Menyimpan akun baru -------------------------- */
  function simpanAkunBaru() {
    if (sedangSimpanAkun) return;

    const isian = {
      userLama: nilai('akUserLama'),
      sandiLama: $('akSandiLama').value,
      userBaru: nilai('akUserBaru'),
      sandiBaru: $('akSandiBaru').value,
      ulangi: $('akUlangi').value,
    };

    const tombol = $('btnSimpanAkun');
    sedangSimpanAkun = true;
    tombol.disabled = true;
    tombol.textContent = '⏳ Menyimpan akun baru…';
    pesanAkun('', '');

    const beres = function () {
      sedangSimpanAkun = false;
      tombol.disabled = false;
      tombol.textContent = '🔐 Simpan Akun Baru';
    };

    AkunPetugas.ubah(isian).then(function (hasil) {
      beres();

      if (!hasil.ok) {
        pesanAkun(hasil.pesan, hasil.catatan);
        fokusIsianAkun(hasil.isian);
        return;
      }

      namaPetugas = hasil.username;
      simpanSesi(namaPetugas);
      tampilkanAkunBerhasil(hasil);
      toast('🔐 Akun petugas berhasil diganti.');
    }).catch(function (err) {
      beres();
      pesanAkun('Terjadi gangguan saat menyimpan akun. Akun lama masih berlaku.', String(err));
    });
  }

  function tampilkanAkunBerhasil(hasil) {
    resetFormAkun(); // isian & kata sandi tidak boleh tertinggal di layar

    $('formAkun').classList.add('tersembunyi');
    $('akBerhasil').classList.remove('tersembunyi');
    $('akBerhasilUser').textContent = hasil.username;
    if (hasil.catatan) console.warn('Catatan penggantian akun:', hasil.catatan);
    $('akBerhasilPesan').textContent = hasil.hanyaPerangkat
      ? 'Akun baru tersimpan, TETAPI untuk sementara hanya berlaku di perangkat ini — dari ' +
        'HP/laptop lain, akun yang berlaku masih yang lama. ' + saranHubungi() +
        ' Sesudah dibereskan, ganti akunnya sekali lagi dari sini agar berlaku di mana saja.'
      : 'Mulai sekarang, masuk ke dashboard ini memakai akun yang baru. ' +
        'Kata sandi lama sudah tidak berlaku lagi.';

    segarkanKotakAkun();
    $('akBerhasil').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* =======================================================================
   *  PILIHAN PADA PENYARING & FORMULIR
   * ===================================================================== */
  function isiPilihanPenyaring() {
    const rt = [], rw = [];
    data.nasabah.forEach(function (n) {
      const a = String(n.rt || '').trim();
      const b = String(n.rw || '').trim();
      if (a && rt.indexOf(a) < 0) rt.push(a);
      if (b && rw.indexOf(b) < 0) rw.push(b);
    });
    const urutAngka = function (a, b) { return String(a).localeCompare(String(b), 'id', { numeric: true }); };
    rt.sort(urutAngka);
    rw.sort(urutAngka);

    isiSelect('fwRt', rt, 'Semua RT');
    isiSelect('fwRw', rw, 'Semua RW');
    isiSelect('fsRt', rt, 'Semua RT');
  }

  function isiSelect(id, daftar, labelKosong) {
    const sel = $(id);
    if (!sel) return;
    const terpilih = sel.value;
    sel.innerHTML = '<option value="">' + labelKosong + '</option>' +
      daftar.map(function (v) {
        return '<option value="' + escHtml(v) + '">' + escHtml(v) + '</option>';
      }).join('');
    if (daftar.indexOf(terpilih) >= 0) sel.value = terpilih;
  }

  function isiPilihanWarga() {
    const urut = data.nasabah.slice().sort(function (a, b) {
      return String(a.nama || '').localeCompare(String(b.nama || ''), 'id');
    });
    const opsi = '<option value="">— Pilih warga —</option>' + urut.map(function (n) {
      return '<option value="' + escHtml(n.id) + '">' + escHtml((n.nama || '(tanpa nama)') + ' — ' + n.id) +
        '</option>';
    }).join('');

    ['sWarga', 'cairWarga'].forEach(function (id) {
      const sel = $(id);
      if (!sel) return;
      const terpilih = sel.value;
      sel.innerHTML = opsi;
      sel.value = terpilih;
    });
  }

  /* =======================================================================
   *  UNDUH EXCEL  (mengikuti penyaring yang sedang aktif)
   * ===================================================================== */
  function unduh(namaBerkas, judul, baris) {
    if (!baris.length) { toast('⚠️ Tidak ada data untuk diunduh.'); return; }
    const tanggal = BankSampah.tanggalHariIni();
    EksporExcel.unduhXlsx(namaBerkas + '-' + tanggal + '.xlsx', [judul].concat(baris));
    toast('⬇️ Berkas Excel sedang diunduh.');
  }

  function unduhWarga() {
    const judul = ['ID Nasabah', 'Nama Warga', 'NIK', 'Alamat', 'RT', 'RW', 'No. HP', 'Tanggal Daftar',
      'Status', 'Jumlah Setoran', 'Berat Total (kg)', 'Berat Kering (kg)', 'Berat Basah (kg)',
      'Jumlah Kantong', 'Pendapatan Total (Rp)', 'Belum Dicairkan (Rp)', 'Sudah Dicairkan (Rp)', 'Catatan'];
    const baris = tampilWarga.map(function (n) {
      const r = ringkasanDari(n.id);
      return [n.id, n.nama || '', n.nik || '', n.alamat || '', n.rt || '', n.rw || '', n.noHp || '',
        n.tanggalDaftar || '', n.status || 'Aktif', r.jumlahSetoran,
        r.totalBerat, r.kering.berat, r.basah.berat, r.totalKantong,
        r.pendapatanTotal, r.belumCair, r.sudahCair, n.catatan || ''];
    });
    unduh('data-warga-bank-sampah', judul, baris);
  }

  function unduhSetoran() {
    const judul = ['Tanggal Setor', 'ID Nasabah', 'Nama Warga', 'RT', 'RW', 'Jenis Sampah',
      'Berat (kg)', 'Jumlah Kantong', 'Harga per kg (Rp)', 'Pendapatan (Rp)',
      'Status Pencairan', 'Tanggal Dicairkan', 'Catatan'];
    const baris = tampilSetoran.map(function (s) {
      const n = cariNasabah(s.idWarga);
      return [s.tanggal || '', s.idWarga, (n && n.nama) || '', (n && n.rt) || '', (n && n.rw) || '',
        s.jenis || '', BankSampah.keAngka(s.berat), BankSampah.keAngka(s.kantong),
        BankSampah.keAngka(s.hargaPerKg), BankSampah.keAngka(s.pendapatan),
        s.status || BS_STATUS_CAIR.BELUM, s.tanggalCair || '', s.catatan || ''];
    });
    unduh('setoran-bank-sampah', judul, baris);
  }

  function unduhPengajuan() {
    const judul = ['Tanggal Pengajuan', 'ID Nasabah', 'Nama Warga', 'No. HP', 'Jumlah (Rp)',
      'Status', 'Tanggal Diproses', 'Catatan'];
    const baris = tampilPengajuan.map(function (p) {
      const n = cariNasabah(p.idWarga);
      return [p.tanggal || '', p.idWarga, p.nama || (n && n.nama) || '', (n && n.noHp) || '',
        BankSampah.keAngka(p.jumlah), p.status || '', p.tanggalProses || '', p.catatan || ''];
    });
    unduh('pengajuan-pencairan-bank-sampah', judul, baris);
  }

  function unduhMasuk() {
    const judul = ['Tanggal Isi', 'ID Catatan', 'ID Nasabah', 'Nama Lengkap', 'NIK', 'Alamat',
      'RT', 'RW', 'No. HP/WA', 'Sudah Terdaftar', 'Jenis Sampah', 'Keterangan Lain-lain',
      'Perkiraan Berat (kg)', 'Jumlah Kantong', 'Catatan Warga', 'Tautan Foto', 'Status',
      'Tanggal Diproses', 'Catatan Petugas', 'ID Setoran Hasil'];
    const baris = tampilMasuk.map(function (s) {
      const foto = BankSampah.tautanFoto(s.foto, false);
      return [s.tanggal || '', s.id, s.idWarga || '', s.nama || '', s.nik || '', s.alamat || '',
        s.rt || '', s.rw || '', s.noHp || '', s.terdaftar || '', s.jenis || '', s.jenisLain || '',
        BankSampah.keAngka(s.berat), BankSampah.keAngka(s.kantong), s.catatan || '',
        // Foto berbentuk data URL terlalu panjang untuk sel Excel — cukup ditandai.
        (foto.indexOf('data:') === 0 ? '(tersimpan di perangkat petugas)' : foto),
        statusMasuk(s), s.tanggalProses || '', s.catatanPetugas || '', s.idSetoran || ''];
    });
    unduh('setoran-dari-warga-bank-sampah', judul, baris);
  }

})();
