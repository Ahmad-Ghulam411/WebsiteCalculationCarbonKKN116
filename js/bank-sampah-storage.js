/* ============================================================================
 *  PENYIMPANAN DATA BANK SAMPAH
 *  ----------------------------------------------------------------------------
 *  Menangani EMPAT jenis data:
 *    1. NASABAH       — data warga yang menabung sampah (nama, NIK, alamat, dll.)
 *    2. SETORAN       — setiap kali warga menyetor sampah (jenis, berat, Rp)
 *    3. PENGAJUAN     — permintaan warga untuk mencairkan pendapatannya
 *    4. SETORAN WARGA — catatan setoran yang DIISI SENDIRI OLEH WARGA beserta
 *                       foto buktinya, menunggu disetujui/ditolak petugas.
 *                       Setelah disetujui, barulah menjadi SETORAN resmi (2).
 *
 *  Sumber data:
 *    - Bila KONFIGURASI.BANK_SAMPAH.APPS_SCRIPT_URL diisi → Google Sheets
 *      (lewat JSONP, agar balasan server benar-benar bisa dibaca browser).
 *    - Bila dikosongkan → tersimpan di perangkat ini saja (localStorage),
 *      sehingga fitur tetap bisa dicoba/dilatih tanpa internet.
 *
 *  CATATAN: berkas ini SENGAJA berdiri sendiri (tidak memakai js/storage.js)
 *  supaya data bank sampah benar-benar terpisah dari data jejak karbon.
 * ========================================================================== */

/* Kunci penyimpanan di perangkat */
const KUNCI_BS_NASABAH       = 'bankSampahNasabah';
const KUNCI_BS_SETORAN       = 'bankSampahSetoran';
const KUNCI_BS_PENGAJUAN     = 'bankSampahPengajuan';
const KUNCI_BS_SETORAN_WARGA = 'bankSampahSetoranWarga';

/* ---------------------------------------------------------------------------
 * SKEMA KOLOM — urutan & judulnya HARUS sama dengan apps-script/CodeBankSampah.gs
 * ------------------------------------------------------------------------- */
const SKEMA_BS_NASABAH = [
  { kunci: 'id',            judul: 'ID Nasabah' },
  { kunci: 'nama',          judul: 'Nama Warga' },
  { kunci: 'nik',           judul: 'NIK' },
  { kunci: 'alamat',        judul: 'Alamat' },
  { kunci: 'rt',            judul: 'RT' },
  { kunci: 'rw',            judul: 'RW' },
  { kunci: 'noHp',          judul: 'No. HP' },
  { kunci: 'tanggalDaftar', judul: 'Tanggal Daftar' },
  { kunci: 'status',        judul: 'Status' },
  { kunci: 'catatan',       judul: 'Catatan' },
];

const SKEMA_BS_SETORAN = [
  { kunci: 'id',          judul: 'ID Setoran' },
  { kunci: 'idWarga',     judul: 'ID Nasabah' },
  { kunci: 'tanggal',     judul: 'Tanggal Setor' },
  { kunci: 'jenis',       judul: 'Jenis Sampah' },
  { kunci: 'berat',       judul: 'Berat (kg)' },
  { kunci: 'kantong',     judul: 'Jumlah Kantong' },
  { kunci: 'hargaPerKg',  judul: 'Harga per kg (Rp)' },
  { kunci: 'pendapatan',  judul: 'Pendapatan (Rp)' },
  { kunci: 'status',      judul: 'Status Pencairan' },
  { kunci: 'tanggalCair', judul: 'Tanggal Dicairkan' },
  { kunci: 'catatan',     judul: 'Catatan' },
];

const SKEMA_BS_PENGAJUAN = [
  { kunci: 'id',            judul: 'ID Pengajuan' },
  { kunci: 'idWarga',       judul: 'ID Nasabah' },
  { kunci: 'nama',          judul: 'Nama Warga' },
  { kunci: 'tanggal',       judul: 'Tanggal Pengajuan' },
  { kunci: 'jumlah',        judul: 'Jumlah Diajukan (Rp)' },
  { kunci: 'status',        judul: 'Status' },
  { kunci: 'tanggalProses', judul: 'Tanggal Diproses' },
  { kunci: 'catatan',       judul: 'Catatan' },
];

/* Catatan setoran yang diisi SENDIRI oleh warga (menunggu persetujuan petugas).
 * Urutannya HARUS sama dengan KOLOM_SETORAN_WARGA di CodeBankSampah.gs */
const SKEMA_BS_SETORAN_WARGA = [
  { kunci: 'id',             judul: 'ID Catatan' },
  { kunci: 'tanggal',        judul: 'Tanggal Isi' },
  { kunci: 'idWarga',        judul: 'ID Nasabah' },
  { kunci: 'nama',           judul: 'Nama Lengkap' },
  { kunci: 'nik',            judul: 'NIK' },
  { kunci: 'alamat',         judul: 'Alamat' },
  { kunci: 'rt',             judul: 'RT' },
  { kunci: 'rw',             judul: 'RW' },
  { kunci: 'noHp',           judul: 'No. HP/WA' },
  { kunci: 'terdaftar',      judul: 'Sudah Terdaftar' },
  { kunci: 'jenis',          judul: 'Jenis Sampah' },
  { kunci: 'jenisLain',      judul: 'Keterangan Lain-lain' },
  { kunci: 'berat',          judul: 'Perkiraan Berat (kg)' },
  { kunci: 'kantong',        judul: 'Jumlah Kantong' },
  { kunci: 'catatan',        judul: 'Catatan Warga' },
  { kunci: 'foto',           judul: 'Foto Bukti' },
  { kunci: 'status',         judul: 'Status' },
  { kunci: 'tanggalProses',  judul: 'Tanggal Diproses' },
  { kunci: 'catatanPetugas', judul: 'Catatan Petugas' },
  { kunci: 'idSetoran',      judul: 'ID Setoran Hasil' },
];

/* Nilai tetap yang dipakai di banyak tempat */
const BS_JENIS = { KERING: 'Kering', BASAH: 'Basah' };
const BS_JENIS_LAIN = 'Lain-lain';
const BS_STATUS_CAIR = { BELUM: 'Belum Dicairkan', SUDAH: 'Sudah Dicairkan' };
const BS_STATUS_AJU = { DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };
const BS_STATUS_SETOR = { MENUNGGU: 'Menunggu', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

const BankSampah = (function () {
  'use strict';

  function cfg() { return KONFIGURASI.BANK_SAMPAH; }
  function urlServer() { return (cfg().APPS_SCRIPT_URL || '').trim(); }

  /** true bila data disimpan di Google Sheets, false bila hanya di perangkat. */
  function pakaiServer() { return urlServer().length > 0; }

  /* =======================================================================
   *  BANTU — penyimpanan di perangkat (localStorage)
   * ===================================================================== */
  function ambilLokal(kunci) {
    try {
      const isi = JSON.parse(localStorage.getItem(kunci) || '[]');
      return Array.isArray(isi) ? isi : [];
    } catch (e) {
      return [];
    }
  }

  function tulisLokal(kunci, arr) {
    try {
      localStorage.setItem(kunci, JSON.stringify(arr));
      return true;
    } catch (e) {
      console.warn('Tidak bisa menyimpan data bank sampah di perangkat:', e);
      return false;
    }
  }

  /* =======================================================================
   *  BANTU — panggilan ke Apps Script lewat JSONP
   *  (GET + callback, supaya balasan server { ok, pesan, … } bisa dibaca
   *   browser — beda dengan POST "no-cors" yang balasannya tak terbaca)
   * ===================================================================== */

  /* Lama browser menunggu balasan server sebelum menyerah.
   * HARUS lebih lama dari LockService.waitLock(20 detik) di
   * apps-script/CodeBankSampah.gs. Kalau lebih pendek, penyimpanan yang
   * sebenarnya BERHASIL bisa terlihat "gagal" di layar petugas — sebab
   * Apps Script tetap menuntaskan pekerjaannya walau browser sudah pergi. */
  const BATAS_TUNGGU_MS = 30000;

  /* Balasan yang telat masih dibiarkan lewat selama tenggang ini, supaya
   * tidak memunculkan error "… is not defined" di konsol browser. */
  const TENGGANG_TELAT_MS = 60000;

  /* ---------------------------------------------------------------------
   *  NAMA ISIAN YANG "DIPESAN" OLEH GOOGLE
   *  -------------------------------------------------------------------
   *  Gerbang depan Google (script.google.com) memakai sendiri beberapa nama
   *  isian. Kalau permintaan kita ikut membawa nama itu, permintaannya
   *  DITOLAK dengan galat 400 — skripnya memang tetap berjalan dan datanya
   *  TETAP tersimpan, tetapi balasannya tidak pernah sampai ke browser.
   *  Akibatnya di layar warga muncul "server belum menjawab" padahal
   *  datanya sudah masuk (dan kalau warga menekan kirim lagi, datanya dobel).
   *
   *  "rt" (RT tempat tinggal warga) ternyata salah satu nama itu. Karena itu
   *  di perjalanan namanya diganti "rtWarga", lalu DIKEMBALIKAN menjadi "rt"
   *  oleh apps-script/CodeBankSampah.gs. Nama kolom di Google Sheets maupun
   *  di seluruh berkas ini tetap "rt" seperti semula.
   *
   *  ⚠️  Karena itu apps-script/CodeBankSampah.gs WAJIB di-deploy ulang
   *      (Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy).
   *      Selama belum, setoran tetap tercatat — hanya kolom RT-nya kosong.
   * ------------------------------------------------------------------- */
  const NAMA_DIPESAN = { rt: 'rtWarga' };

  /** Menyalin isian permintaan sambil mengganti nama yang dipesan Google. */
  function paramAman(params) {
    const aman = {};
    Object.keys(params || {}).forEach(function (k) {
      aman[NAMA_DIPESAN[k] || k] = params[k];
    });
    return aman;
  }

  /** Balasan semu saat server tidak menjawab (BEDA dengan server menolak). */
  function balasanKosong() {
    return {
      ok: false,
      tanpaBalasan: true,
      pesan: 'Balasan dari server bank sampah tidak sampai ke perangkat ini.',
    };
  }

  /**
   * Memanggil Apps Script. SELALU menghasilkan objek:
   *   - balasan asli server (punya .ok), atau
   *   - { ok:false, tanpaBalasan:true } bila server tak menjawab tepat waktu.
   *
   * Catatan penting: "tanpaBalasan" TIDAK sama dengan "gagal". Permintaan
   * tulis yang balasannya hilang di jalan tetap sering tersimpan di Sheets,
   * jadi pemanggilnya wajib memeriksa ulang keadaan sebenarnya.
   */
  function jsonp(params) {
    const url = urlServer();
    if (!url) return Promise.resolve(balasanKosong());

    return new Promise(function (resolve) {
      const cbName = 'jsonp_bs_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      let selesai = false;

      function bersihkan() {
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (resp) {
        if (selesai) { bersihkan(); return; } // balasan telat — cukup dibereskan
        selesai = true;
        bersihkan();
        resolve((resp && typeof resp === 'object') ? resp : balasanKosong());
      };

      function menyerah() {
        if (selesai) return;
        selesai = true;
        // Skrip & callback-nya sengaja TIDAK langsung dibuang: balasan yang
        // telat masih boleh memanggilnya tanpa menimbulkan error di konsol.
        setTimeout(bersihkan, TENGGANG_TELAT_MS);
        resolve(balasanKosong());
      }

      const kirim = paramAman(params);
      const query = new URLSearchParams();
      Object.keys(kirim).forEach(function (k) {
        const v = kirim[k];
        query.set(k, (v === null || v === undefined) ? '' : String(v));
      });
      query.set('callback', cbName);

      const pemisah = url.indexOf('?') >= 0 ? '&' : '?';
      script.src = url + pemisah + query.toString();
      script.onerror = menyerah;
      document.body.appendChild(script);

      setTimeout(menyerah, BATAS_TUNGGU_MS);
    });
  }

  /** Khusus aksi BACA (list/cek): boleh dicoba sekali lagi bila balasannya
   *  hilang, karena membaca tidak mengubah apa pun di Google Sheets. */
  function jsonpBaca(params) {
    return jsonp(params).then(function (resp) {
      return (resp && resp.tanpaBalasan) ? jsonp(params) : resp;
    });
  }

  /** Membungkus jsonp() menjadi balasan { ok, pesan } yang selalu terisi.
   *  Isi balasan lain dari server (mis. "id" nasabah baru) ikut diteruskan.
   *  Aksi TULIS sengaja tidak diulang otomatis agar data tidak dobel. */
  function kirimAksi(params) {
    return jsonp(params).then(function (resp) {
      if (resp && resp.ok) {
        return Object.assign({}, resp, { ok: true, pesan: resp.pesan || 'Berhasil.' });
      }
      if (resp && resp.tanpaBalasan) {
        return {
          ok: false,
          tanpaBalasan: true,
          pesan: 'Server bank sampah belum menjawab. Perubahannya bisa jadi TETAP ' +
            'tersimpan — periksa daftarnya setelah dimuat ulang.',
        };
      }
      return { ok: false, pesan: (resp && resp.pesan) || 'Server bank sampah menolak permintaan ini.' };
    });
  }

  /* =======================================================================
   *  BANTU — mengirim data BESAR (setoran warga + foto bukti)
   *  ---------------------------------------------------------------------
   *  JSONP di atas memakai GET, jadi seluruh datanya ikut menempel di
   *  alamat URL — panjangnya terbatas dan tidak mungkin memuat foto.
   *  Untuk itu dipakai POST, dengan dua cara yang saling menutupi:
   *
   *    1. fetch()  — paling cepat & balasannya bisa langsung dibaca.
   *                  Sengaja memakai URLSearchParams supaya jenis isinya
   *                  "application/x-www-form-urlencoded", yaitu jenis yang
   *                  TIDAK memicu pemeriksaan CORS tambahan oleh peramban.
   *    2. <form> ke <iframe> tersembunyi — cara lama yang hampir selalu
   *       berhasil (pengiriman formulir tidak dibatasi CORS), tetapi
   *       balasannya tidak bisa dibaca. Karena itu, setelahnya kita
   *       MEMERIKSA SENDIRI ke server apakah catatannya benar-benar masuk.
   * ===================================================================== */

  function jeda(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /** Percobaan pertama: POST biasa yang balasannya bisa dibaca. */
  function postFetch(params) {
    const url = urlServer();
    if (!url || typeof fetch !== 'function' || typeof URLSearchParams !== 'function') {
      return Promise.resolve(null);
    }

    const kirim = paramAman(params);
    const isi = new URLSearchParams();
    Object.keys(kirim).forEach(function (k) {
      const v = kirim[k];
      isi.set(k, (v === null || v === undefined) ? '' : String(v));
    });

    return fetch(url, { method: 'POST', body: isi })
      .then(function (r) { return r.json(); })
      .then(function (resp) { return (resp && typeof resp === 'object') ? resp : null; })
      .catch(function () { return null; }); // diblokir CORS / jaringan putus
  }

  /** Percobaan kedua: kirim lewat formulir tersembunyi (balasan tak terbaca). */
  function postBingkai(params) {
    const url = urlServer();
    if (!url) return Promise.resolve(false);

    return new Promise(function (resolve) {
      const nama = 'bs_kirim_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const bingkai = document.createElement('iframe');
      bingkai.name = nama;
      bingkai.setAttribute('aria-hidden', 'true');
      bingkai.style.display = 'none';
      document.body.appendChild(bingkai);

      const form = document.createElement('form');
      form.action = url;
      form.method = 'POST';
      form.target = nama;
      form.style.display = 'none';

      const kirim = paramAman(params);
      Object.keys(kirim).forEach(function (k) {
        // <textarea> dipakai karena isian foto bisa sangat panjang.
        const kotak = document.createElement('textarea');
        kotak.name = k;
        const v = kirim[k];
        kotak.value = (v === null || v === undefined) ? '' : String(v);
        form.appendChild(kotak);
      });

      document.body.appendChild(form);

      let selesai = false;
      const beres = function (terkirim) {
        if (selesai) return;
        selesai = true;
        setTimeout(function () {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (bingkai.parentNode) bingkai.parentNode.removeChild(bingkai);
        }, 1000);
        resolve(terkirim);
      };

      bingkai.addEventListener('load', function () { beres(true); });
      setTimeout(function () { beres(false); }, BATAS_TUNGGU_MS);

      try {
        form.submit();
      } catch (e) {
        beres(false);
      }
    });
  }

  /* =======================================================================
   *  BANTU — umum
   * ===================================================================== */
  function tanggalHariIni() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function waktuSekarang() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    return tanggalHariIni() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function keAngka(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v === null || v === undefined ? '' : v)
      .replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function rupiah(n) {
    return 'Rp ' + Math.round(keAngka(n)).toLocaleString('id-ID');
  }

  function kg(n) {
    const v = keAngka(n);
    return v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kg';
  }

  /** Menormalkan ID agar pencarian warga tidak rewel soal huruf besar/spasi. */
  function normalId(id) {
    return String(id === null || id === undefined ? '' : id).trim().toUpperCase().replace(/\s+/g, '');
  }

  /** Membuat ID nasabah berikutnya: BS-0001, BS-0002, … */
  function idNasabahBaru(daftarNasabah) {
    const prefix = (cfg().PREFIX_ID || 'BS').toUpperCase();
    let tertinggi = 0;
    (daftarNasabah || []).forEach(function (n) {
      const cocok = normalId(n.id).match(/(\d+)$/);
      if (cocok) tertinggi = Math.max(tertinggi, parseInt(cocok[1], 10));
    });
    return prefix + '-' + String(tertinggi + 1).padStart(4, '0');
  }

  /** ID acak untuk setoran & pengajuan (tidak pernah dilihat warga). */
  function idAcak(awalan) {
    return awalan + '-' + Date.now().toString(36).toUpperCase() +
      '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  /* =======================================================================
   *  JENIS SAMPAH  (Botol Plastik, Kardus, Rak Telur, Gelas Plastik, …)
   *  Seluruhnya diatur di KONFIGURASI.BANK_SAMPAH.JENIS — lihat js/config.js.
   * ===================================================================== */

  /** Daftar jenis sampah yang diterima bank sampah, apa adanya dari config. */
  function daftarJenis() {
    const daftar = cfg().JENIS;
    return Array.isArray(daftar) && daftar.length ? daftar : [
      { nama: BS_JENIS.KERING, ikon: '🧴', harga: cfg().HARGA_PER_KG.kering, ket: '' },
      { nama: BS_JENIS.BASAH, ikon: '🍂', harga: cfg().HARGA_PER_KG.basah, ket: '' },
    ];
  }

  /** Mencari keterangan satu jenis sampah menurut namanya (tanpa rewel huruf besar). */
  function cariJenis(nama) {
    const kunci = String(nama === null || nama === undefined ? '' : nama).trim().toLowerCase();
    if (!kunci) return null;
    return daftarJenis().filter(function (j) {
      return String(j.nama).trim().toLowerCase() === kunci;
    })[0] || null;
  }

  /** Harga per kg untuk satu jenis sampah. Jenis lama (Kering/Basah) tetap terlayani. */
  function hargaJenis(nama) {
    const j = cariJenis(nama);
    if (j) return keAngka(j.harga);
    const harga = cfg().HARGA_PER_KG || {};
    return kelompokJenis(nama) === 'basah' ? keAngka(harga.basah) : keAngka(harga.kering);
  }

  /** Mengelompokkan jenis apa pun menjadi 'kering' atau 'basah'.
   *  Dipakai agar riwayat lama (yang hanya mengenal dua kelompok) tetap terbaca. */
  function kelompokJenis(nama) {
    const teks = String(nama === null || nama === undefined ? '' : nama).toLowerCase();
    if (teks.indexOf('basah') >= 0 || teks.indexOf('organik') >= 0) return 'basah';
    const j = cariJenis(nama);
    if (j && j.kelompok) return String(j.kelompok).toLowerCase();
    return 'kering';
  }

  /** Nama jenis yang enak dibaca — "Lain-lain" ikut menyebut keterangannya. */
  function labelJenis(jenis, jenisLain) {
    const nama = String(jenis || '').trim() || '—';
    const lain = String(jenisLain || '').trim();
    return (lain && cariJenis(nama) && cariJenis(nama).isian) ? nama + ' (' + lain + ')' : nama;
  }

  /* =======================================================================
   *  MEMBACA DATA
   * ===================================================================== */

  /**
   * Mengambil SELURUH data bank sampah (untuk dashboard admin).
   * @returns {Promise<{ok:boolean, sumber:string, pesan:string,
   *                    nasabah:Array, setoran:Array, pengajuan:Array}>}
   */
  function muatSemua() {
    if (!pakaiServer()) {
      return Promise.resolve({
        ok: true,
        sumber: 'lokal',
        pesan: '',
        nasabah: ambilLokal(KUNCI_BS_NASABAH),
        setoran: ambilLokal(KUNCI_BS_SETORAN),
        pengajuan: ambilLokal(KUNCI_BS_PENGAJUAN),
        setoranWarga: ambilLokal(KUNCI_BS_SETORAN_WARGA),
      });
    }

    return jsonpBaca({ action: 'list', token: cfg().token }).then(function (resp) {
      if (resp && resp.ok) {
        return {
          ok: true,
          sumber: 'sheet',
          pesan: '',
          nasabah: Array.isArray(resp.nasabah) ? resp.nasabah : [],
          setoran: Array.isArray(resp.setoran) ? resp.setoran : [],
          pengajuan: Array.isArray(resp.pengajuan) ? resp.pengajuan : [],
          setoranWarga: Array.isArray(resp.setoranWarga) ? resp.setoranWarga : [],
        };
      }
      return {
        ok: false,
        sumber: 'sheet',
        tanpaBalasan: !!(resp && resp.tanpaBalasan),
        pesan: (resp && resp.pesan) || 'Tidak bisa menghubungi server bank sampah.',
        nasabah: [], setoran: [], pengajuan: [], setoranWarga: [],
      };
    });
  }

  /**
   * Mencari SATU nasabah beserta seluruh setoran, pengajuan, DAN catatan
   * setoran yang diisinya sendiri (yang masih menunggu persetujuan / ditolak
   * sekalipun). Dipakai halaman "Cek Bank Sampah" milik warga — tidak butuh
   * token, cukup tahu ID nasabahnya.
   *
   * Catatan: foto bukti sengaja TIDAK ikut dibawa. Isinya tidak dipakai di
   * riwayat warga, dan tanpa foto balasannya jauh lebih ringan untuk HP.
   *
   * @returns {Promise<{ok:boolean, pesan:string, nasabah:Object|null,
   *                    setoran:Array, pengajuan:Array, setoranWarga:Array}>}
   */
  function cekWarga(id) {
    const kunci = normalId(id);
    if (!kunci) {
      return Promise.resolve({
        ok: false, pesan: 'ID nasabah belum diisi.',
        nasabah: null, setoran: [], pengajuan: [], setoranWarga: [],
      });
    }

    if (!pakaiServer()) {
      const nasabah = ambilLokal(KUNCI_BS_NASABAH).filter(function (n) {
        return normalId(n.id) === kunci || normalId(n.nik) === kunci;
      })[0] || null;

      if (!nasabah) {
        return Promise.resolve({
          ok: false, pesan: 'ID nasabah tidak ditemukan.',
          nasabah: null, setoran: [], pengajuan: [], setoranWarga: [],
        });
      }
      const idAsli = normalId(nasabah.id);
      return Promise.resolve({
        ok: true,
        pesan: '',
        nasabah: nasabah,
        setoran: ambilLokal(KUNCI_BS_SETORAN).filter(function (s) { return normalId(s.idWarga) === idAsli; }),
        pengajuan: ambilLokal(KUNCI_BS_PENGAJUAN).filter(function (p) { return normalId(p.idWarga) === idAsli; }),
        setoranWarga: ambilLokal(KUNCI_BS_SETORAN_WARGA)
          .filter(function (s) { return normalId(s.idWarga) === idAsli; })
          .map(tanpaFoto),
      });
    }

    return jsonpBaca({ action: 'cek', id: kunci }).then(function (resp) {
      if (resp && resp.ok && resp.nasabah) {
        return {
          ok: true,
          pesan: '',
          nasabah: resp.nasabah,
          setoran: Array.isArray(resp.setoran) ? resp.setoran : [],
          pengajuan: Array.isArray(resp.pengajuan) ? resp.pengajuan : [],
          /* Kosong bila apps-script/CodeBankSampah.gs belum di-deploy ulang —
           * halaman tetap berjalan, riwayatnya saja yang belum lengkap. */
          setoranWarga: Array.isArray(resp.setoranWarga) ? resp.setoranWarga : [],
        };
      }
      return {
        ok: false,
        tanpaBalasan: !!(resp && resp.tanpaBalasan),
        pesan: (resp && resp.pesan) || 'Tidak bisa menghubungi server bank sampah. Coba lagi sebentar.',
        nasabah: null, setoran: [], pengajuan: [], setoranWarga: [],
      };
    });
  }

  /** Salinan sebuah catatan setoran warga tanpa isi foto buktinya. */
  function tanpaFoto(s) {
    return Object.assign({}, s, { foto: '' });
  }

  /* =======================================================================
   *  MENGHITUNG RINGKASAN  (dipakai halaman warga & dashboard admin)
   * ===================================================================== */
  /**
   * Merangkum setoran seorang warga menjadi angka-angka yang ditampilkan.
   * Fungsi murni — tidak menyentuh penyimpanan, jadi hasilnya sama
   * baik data berasal dari Google Sheets maupun dari perangkat.
   *
   * @param {Array} setoran      - setoran RESMI (sudah masuk tabungan warga)
   * @param {Array} pengajuan    - pengajuan pencairan warga
   * @param {Array} [setoranWarga] - catatan setoran yang diisi sendiri oleh
   *        warga. Yang statusnya "Menunggu"/"Ditolak" ikut ditampilkan di
   *        riwayat tetapi TIDAK dihitung sebagai tabungan; yang sudah
   *        "Disetujui" tidak diulang, karena baris resminya sudah ada di
   *        `setoran` (lihat gabungRiwayat).
   */
  function ringkas(setoran, pengajuan, setoranWarga) {
    /* Baris ber-ID kembar (mis. sisa kiriman ulang saat jaringan warga putus)
     * dibuang lebih dulu, supaya tabungannya tidak terhitung dua kali. */
    const daftar = tanpaKembar(setoran).sort(function (a, b) {
      return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
    });

    const kosong = { berat: 0, kantong: 0, pendapatan: 0, jumlahSetoran: 0 };
    const kering = Object.assign({}, kosong);
    const basah = Object.assign({}, kosong);
    let pendapatanTotal = 0;
    let belumCair = 0;
    let sudahCair = 0;

    /* Rincian per jenis sampah. Seluruh jenis yang dikenal selalu ikut
     * (walau nol) supaya tampilannya tidak "meloncat-loncat", ditambah
     * jenis tak dikenal yang mungkin masih ada di riwayat lama. */
    const perJenis = daftarJenis().map(function (j) {
      return Object.assign({ nama: j.nama, ikon: j.ikon || '♻️', ket: j.ket || '', dikenal: true }, kosong);
    });
    const cariEmber = function (nama) {
      const kunci = String(nama || '').trim().toLowerCase() || '—';
      let ember = perJenis.filter(function (e) {
        return String(e.nama).trim().toLowerCase() === kunci;
      })[0];
      if (!ember) {
        ember = Object.assign({ nama: String(nama || '').trim() || '—', ikon: '♻️', ket: '', dikenal: false }, kosong);
        perJenis.push(ember);
      }
      return ember;
    };

    daftar.forEach(function (s) {
      const berat = keAngka(s.berat);
      const kantong = keAngka(s.kantong);
      const nilai = keAngka(s.pendapatan);
      const ember = (kelompokJenis(s.jenis) === 'basah') ? basah : kering;

      ember.berat += berat;
      ember.kantong += kantong;
      ember.pendapatan += nilai;
      ember.jumlahSetoran += 1;

      const rinci = cariEmber(s.jenis);
      rinci.berat += berat;
      rinci.kantong += kantong;
      rinci.pendapatan += nilai;
      rinci.jumlahSetoran += 1;

      pendapatanTotal += nilai;
      if (String(s.status || '') === BS_STATUS_CAIR.SUDAH) sudahCair += nilai;
      else belumCair += nilai;
    });

    const pengajuanUrut = (pengajuan || []).slice().sort(function (a, b) {
      return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
    });
    const menunggu = pengajuanUrut.filter(function (p) {
      return String(p.status || '') === BS_STATUS_AJU.DIAJUKAN;
    });

    /* Riwayat lengkap: setoran resmi + catatan yang baru diisi warga. */
    const gabungan = gabungRiwayat(daftar, setoranWarga);

    return {
      setoran: daftar,
      setoranTerakhir: daftar.length ? daftar[0] : null,
      kering: kering,
      basah: basah,
      perJenis: perJenis,
      totalBerat: kering.berat + basah.berat,
      totalKantong: kering.kantong + basah.kantong,
      jumlahSetoran: daftar.length,
      pendapatanTotal: pendapatanTotal,
      belumCair: belumCair,
      sudahCair: sudahCair,
      pengajuan: pengajuanUrut,
      pengajuanMenunggu: menunggu.length ? menunggu[0] : null,

      /* Riwayat gabungan (terbaru dulu) — satu setoran hanya muncul sekali. */
      riwayat: gabungan.riwayat,
      setoranMenunggu: gabungan.menunggu,
      setoranDitolak: gabungan.ditolak,
      perkiraanMenunggu: gabungan.perkiraanMenunggu,
    };
  }

  /* -----------------------------------------------------------------------
   *  RIWAYAT GABUNGAN — setoran petugas + catatan warga, tanpa data dobel
   *
   *  Perjalanan satu setoran warga:
   *    1. Warga mengisi formulir       → catatan "Menunggu"          (belum bernilai)
   *    2a. Petugas MENOLAK             → catatan "Ditolak"           (tetap terlihat)
   *    2b. Petugas MENYETUJUI          → catatan "Disetujui" DAN lahir satu
   *        setoran RESMI di buku setoran; nomornya dicatat pada kolom
   *        "ID Setoran Hasil" (idSetoran).
   *
   *  Karena itu langkah 2b TIDAK boleh ditampilkan dua kali. Yang dipakai
   *  adalah baris resminya (yang memuat berat & harga hasil timbangan
   *  petugas), lalu ditandai bahwa asalnya dari catatan warga sendiri.
   * --------------------------------------------------------------------- */

  /* Penanda yang ditulis otomatis pada catatan setoran resmi hasil
   * persetujuan — dipakai sebagai cadangan bila kolom "ID Setoran Hasil"
   * belum sempat terisi (mis. data lama). Kembarannya ada di
   * apps-script/CodeBankSampah.gs → catatanSetoranDari(). */
  const PENANDA_ASAL_WARGA = 'Dicatat sendiri oleh warga';

  function kunciBaris(nilai) {
    return String(nilai === null || nilai === undefined ? '' : nilai).trim().toUpperCase();
  }

  /** Membuang baris ber-ID sama sambil menjaga urutan aslinya. */
  function tanpaKembar(daftar) {
    const sudah = {};
    return (daftar || []).filter(function (b) {
      const kunci = kunciBaris(b && b.id);
      if (!kunci) return true;              // tanpa ID → tidak bisa dipastikan kembar
      if (sudah[kunci]) return false;
      sudah[kunci] = true;
      return true;
    });
  }

  /** Status sebuah catatan warga; yang kosong dianggap masih "Menunggu". */
  function statusSetoranWarga(s) {
    return String((s && s.status) || '').trim() || BS_STATUS_SETOR.MENUNGGU;
  }

  /** Perkiraan berat (kg) catatan warga — bila belum ditimbang, ditaksir dari kantong. */
  function beratPerkiraan(s) {
    const berat = keAngka(s && s.berat);
    if (berat > 0) return berat;
    return keAngka(s && s.kantong) * (cfg().KG_PER_KANTONG || 3);
  }

  /** Perkiraan pendapatan catatan warga — angka pastinya menunggu timbangan petugas. */
  function perkiraanPendapatan(s) {
    return Math.round(beratPerkiraan(s) * hargaJenis(s && s.jenis));
  }

  /** Membuang penanda asal dari catatan setoran — asalnya sudah ditandai
   *  tersendiri di tampilan, jadi tidak perlu diulang sebagai tulisan. */
  function catatanTanpaPenanda(teks) {
    const isi = String(teks === null || teks === undefined ? '' : teks).trim();
    if (isi.indexOf(PENANDA_ASAL_WARGA) !== 0) return isi;
    return isi.slice(PENANDA_ASAL_WARGA.length).replace(/^\s*·\s*/, '').trim();
  }

  /**
   * Menggabungkan setoran resmi dengan catatan warga menjadi SATU daftar
   * riwayat (terbaru dulu). Tiap barisnya:
   *   { id, tanggal, jenis, berat, kantong, pendapatan, catatan,
   *     resmi, dariWarga, status, statusCair, perkiraan }
   *   - resmi     : sudah masuk tabungan warga (berat & harga dari petugas)
   *   - dariWarga : setorannya dicatat sendiri oleh warga
   *   - status    : Menunggu / Ditolak / Disetujui / '' (dicatat petugas)
   *   - statusCair: Belum / Sudah Dicairkan — hanya untuk baris resmi
   *   - perkiraan : nilai rupiahnya masih taksiran, belum ditimbang petugas
   */
  function gabungRiwayat(setoranResmi, setoranWarga) {
    const resmi = setoranResmi || [];
    const catatanWarga = tanpaKembar(setoranWarga).sort(function (a, b) {
      return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
    });

    /* ID setoran resmi yang benar-benar ada — dipakai untuk mencocokkan
     * catatan warga yang sudah disetujui dengan baris resminya. */
    const adaResmi = {};
    resmi.forEach(function (s) {
      const kunci = kunciBaris(s.id);
      if (kunci) adaResmi[kunci] = true;
    });

    const asalWarga = {};   // ID setoran resmi → catatan warga asalnya
    catatanWarga.forEach(function (w) {
      const kunci = kunciBaris(w.idSetoran);
      if (kunci && adaResmi[kunci]) asalWarga[kunci] = w;
    });

    const riwayat = resmi.map(function (s) {
      const asal = asalWarga[kunciBaris(s.id)] || null;
      const dariWarga = !!asal || String(s.catatan || '').indexOf(PENANDA_ASAL_WARGA) === 0;
      return {
        id: String(s.id || ''),
        tanggal: s.tanggal || '',
        jenis: asal ? labelJenis(asal.jenis, asal.jenisLain) : String(s.jenis || ''),
        berat: keAngka(s.berat),
        kantong: keAngka(s.kantong),
        pendapatan: keAngka(s.pendapatan),
        catatan: catatanTanpaPenanda(s.catatan),
        resmi: true,
        dariWarga: dariWarga,
        status: dariWarga ? BS_STATUS_SETOR.DISETUJUI : '',
        statusCair: String(s.status || BS_STATUS_CAIR.BELUM),
        perkiraan: false,
      };
    });

    /* Catatan warga yang BELUM menjadi setoran resmi. Yang sudah "Disetujui"
     * sengaja dilewati — barisnya sudah ikut di daftar resmi di atas. */
    const belumResmi = [];
    catatanWarga.forEach(function (w) {
      const status = statusSetoranWarga(w);
      if (status === BS_STATUS_SETOR.DISETUJUI) return;

      const ditolak = status === BS_STATUS_SETOR.DITOLAK;
      belumResmi.push({
        id: String(w.id || ''),
        tanggal: w.tanggal || '',
        jenis: labelJenis(w.jenis, w.jenisLain),
        berat: keAngka(w.berat),
        kantong: keAngka(w.kantong),
        pendapatan: ditolak ? 0 : perkiraanPendapatan(w),
        catatan: String(w.catatanPetugas || w.catatan || '').trim(),
        resmi: false,
        dariWarga: true,
        status: status,
        statusCair: '',
        perkiraan: !ditolak,
      });
    });

    const menunggu = belumResmi.filter(function (b) { return b.status !== BS_STATUS_SETOR.DITOLAK; });
    const ditolak = belumResmi.filter(function (b) { return b.status === BS_STATUS_SETOR.DITOLAK; });

    return {
      riwayat: riwayat.concat(belumResmi).sort(function (a, b) {
        return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
      }),
      menunggu: menunggu,
      ditolak: ditolak,
      perkiraanMenunggu: menunggu.reduce(function (jumlah, b) { return jumlah + b.pendapatan; }, 0),
    };
  }

  /* =======================================================================
   *  MENGUBAH DATA — NASABAH
   * ===================================================================== */
  function simpanNasabah(record) {
    const data = Object.assign({}, record);
    data.tanggalDaftar = data.tanggalDaftar || tanggalHariIni();
    data.status = data.status || 'Aktif';

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_NASABAH);
      data.id = normalId(data.id) || idNasabahBaru(daftar);
      const bentrok = daftar.some(function (n) { return normalId(n.id) === normalId(data.id); });
      if (bentrok) return Promise.resolve({ ok: false, pesan: 'ID nasabah ' + data.id + ' sudah dipakai.' });
      daftar.push(data);
      tulisLokal(KUNCI_BS_NASABAH, daftar);
      return Promise.resolve({ ok: true, pesan: 'Nasabah tersimpan.', id: data.id });
    }

    return kirimAksi(Object.assign({ action: 'simpanNasabah', token: cfg().token }, data));
  }

  function ubahNasabah(id, record) {
    const kunci = normalId(id);

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_NASABAH);
      const i = daftar.findIndex(function (n) { return normalId(n.id) === kunci; });
      if (i < 0) return Promise.resolve({ ok: false, pesan: 'Nasabah tidak ditemukan.' });
      daftar[i] = Object.assign({}, daftar[i], record, { id: daftar[i].id });
      tulisLokal(KUNCI_BS_NASABAH, daftar);
      return Promise.resolve({ ok: true, pesan: 'Data nasabah diperbarui.' });
    }

    return kirimAksi(Object.assign({ action: 'editNasabah', token: cfg().token }, record, { id: kunci }));
  }

  /** Menghapus nasabah BESERTA seluruh setoran & pengajuannya. */
  function hapusNasabah(id) {
    const kunci = normalId(id);

    if (!pakaiServer()) {
      tulisLokal(KUNCI_BS_NASABAH, ambilLokal(KUNCI_BS_NASABAH).filter(function (n) {
        return normalId(n.id) !== kunci;
      }));
      tulisLokal(KUNCI_BS_SETORAN, ambilLokal(KUNCI_BS_SETORAN).filter(function (s) {
        return normalId(s.idWarga) !== kunci;
      }));
      tulisLokal(KUNCI_BS_PENGAJUAN, ambilLokal(KUNCI_BS_PENGAJUAN).filter(function (p) {
        return normalId(p.idWarga) !== kunci;
      }));
      return Promise.resolve({ ok: true, pesan: 'Nasabah dan seluruh riwayatnya dihapus.' });
    }

    return kirimAksi({ action: 'hapusNasabah', token: cfg().token, id: kunci });
  }

  /* =======================================================================
   *  MENGUBAH DATA — SETORAN
   * ===================================================================== */
  function simpanSetoran(record) {
    const data = Object.assign({}, record);
    data.tanggal = data.tanggal || tanggalHariIni();
    data.status = data.status || BS_STATUS_CAIR.BELUM;
    data.tanggalCair = data.tanggalCair || '';
    data.idWarga = normalId(data.idWarga);

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN);
      data.id = data.id || idAcak('ST');
      daftar.push(data);
      tulisLokal(KUNCI_BS_SETORAN, daftar);
      return Promise.resolve({ ok: true, pesan: 'Setoran tersimpan.', id: data.id });
    }

    return kirimAksi(Object.assign({ action: 'simpanSetoran', token: cfg().token }, data));
  }

  function ubahSetoran(id, record) {
    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN);
      const i = daftar.findIndex(function (s) { return String(s.id) === String(id); });
      if (i < 0) return Promise.resolve({ ok: false, pesan: 'Setoran tidak ditemukan.' });
      daftar[i] = Object.assign({}, daftar[i], record, { id: daftar[i].id });
      tulisLokal(KUNCI_BS_SETORAN, daftar);
      return Promise.resolve({ ok: true, pesan: 'Setoran diperbarui.' });
    }

    return kirimAksi(Object.assign({ action: 'editSetoran', token: cfg().token }, record, { id: id }));
  }

  function hapusSetoran(id) {
    if (!pakaiServer()) {
      tulisLokal(KUNCI_BS_SETORAN, ambilLokal(KUNCI_BS_SETORAN).filter(function (s) {
        return String(s.id) !== String(id);
      }));
      return Promise.resolve({ ok: true, pesan: 'Setoran dihapus.' });
    }
    return kirimAksi({ action: 'hapusSetoran', token: cfg().token, id: id });
  }

  /**
   * Menandai setoran sebagai SUDAH DICAIRKAN.
   * @param {Object} opsi - { idSetoran } untuk satu setoran, atau
   *                        { idWarga } untuk seluruh setoran warga tersebut.
   */
  function tandaiCair(opsi) {
    const tanggal = tanggalHariIni();

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN);
      let jumlah = 0;
      daftar.forEach(function (s) {
        const cocok = opsi.idSetoran
          ? String(s.id) === String(opsi.idSetoran)
          : normalId(s.idWarga) === normalId(opsi.idWarga);
        if (cocok && String(s.status) !== BS_STATUS_CAIR.SUDAH) {
          s.status = BS_STATUS_CAIR.SUDAH;
          s.tanggalCair = tanggal;
          jumlah += 1;
        }
      });
      tulisLokal(KUNCI_BS_SETORAN, daftar);
      return Promise.resolve({ ok: true, pesan: jumlah + ' setoran ditandai sudah dicairkan.' });
    }

    return kirimAksi({
      action: 'tandaiCair',
      token: cfg().token,
      id: opsi.idSetoran || '',
      idWarga: opsi.idWarga || '',
    });
  }

  /** Mengembalikan status setoran menjadi BELUM dicairkan (bila salah tandai). */
  function batalCair(idSetoran) {
    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN);
      const i = daftar.findIndex(function (s) { return String(s.id) === String(idSetoran); });
      if (i < 0) return Promise.resolve({ ok: false, pesan: 'Setoran tidak ditemukan.' });
      daftar[i].status = BS_STATUS_CAIR.BELUM;
      daftar[i].tanggalCair = '';
      tulisLokal(KUNCI_BS_SETORAN, daftar);
      return Promise.resolve({ ok: true, pesan: 'Tanda pencairan dibatalkan.' });
    }
    return kirimAksi({ action: 'batalCair', token: cfg().token, id: idSetoran });
  }

  /* =======================================================================
   *  MENGUBAH DATA — PENGAJUAN PENCAIRAN
   * ===================================================================== */
  /** Dipanggil warga dari halaman "Cek Bank Sampah" (tanpa token). */
  function ajukanPencairan(idWarga, nama, jumlah) {
    const kunci = normalId(idWarga);

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_PENGAJUAN);
      const sudahAda = daftar.some(function (p) {
        return normalId(p.idWarga) === kunci && String(p.status) === BS_STATUS_AJU.DIAJUKAN;
      });
      if (sudahAda) {
        return Promise.resolve({ ok: false, pesan: 'Masih ada pengajuan yang belum diproses petugas.' });
      }
      daftar.push({
        id: idAcak('PC'),
        idWarga: kunci,
        nama: nama || '',
        tanggal: waktuSekarang(),
        jumlah: Math.round(keAngka(jumlah)),
        status: BS_STATUS_AJU.DIAJUKAN,
        tanggalProses: '',
        catatan: '',
      });
      tulisLokal(KUNCI_BS_PENGAJUAN, daftar);
      return Promise.resolve({ ok: true, pesan: 'Pengajuan pencairan terkirim.' });
    }

    return kirimAksi({ action: 'ajukan', id: kunci, nama: nama || '', jumlah: Math.round(keAngka(jumlah)) });
  }

  /**
   * Petugas memproses pengajuan warga.
   * Bila disetujui, seluruh setoran warga yang belum cair ikut ditandai.
   * @param {string} status - BS_STATUS_AJU.DISETUJUI | BS_STATUS_AJU.DITOLAK
   */
  function prosesPengajuan(id, status, catatan) {
    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_PENGAJUAN);
      const i = daftar.findIndex(function (p) { return String(p.id) === String(id); });
      if (i < 0) return Promise.resolve({ ok: false, pesan: 'Pengajuan tidak ditemukan.' });
      daftar[i].status = status;
      daftar[i].tanggalProses = tanggalHariIni();
      if (catatan) daftar[i].catatan = catatan;
      tulisLokal(KUNCI_BS_PENGAJUAN, daftar);

      if (status === BS_STATUS_AJU.DISETUJUI) {
        return tandaiCair({ idWarga: daftar[i].idWarga }).then(function () {
          return { ok: true, pesan: 'Pengajuan disetujui & pendapatan ditandai sudah dicairkan.' };
        });
      }
      return Promise.resolve({ ok: true, pesan: 'Pengajuan ditandai ' + status.toLowerCase() + '.' });
    }

    return kirimAksi({
      action: 'prosesPengajuan',
      token: cfg().token,
      id: id,
      status: status,
      catatan: catatan || '',
    });
  }

  function hapusPengajuan(id) {
    if (!pakaiServer()) {
      tulisLokal(KUNCI_BS_PENGAJUAN, ambilLokal(KUNCI_BS_PENGAJUAN).filter(function (p) {
        return String(p.id) !== String(id);
      }));
      return Promise.resolve({ ok: true, pesan: 'Pengajuan dihapus.' });
    }
    return kirimAksi({ action: 'hapusPengajuan', token: cfg().token, id: id });
  }

  /* =======================================================================
   *  PENDAFTARAN MANDIRI OLEH WARGA  (tanpa token — dipanggil dari
   *  halaman warga saat yang mengisi belum jadi nasabah)
   * ===================================================================== */
  /**
   * Mendaftarkan warga baru dari halaman warga dan mengembalikan
   * ID Nasabahnya. Nomor ID sengaja dibuat SERVER, bukan browser, supaya
   * dua warga yang mendaftar bersamaan tidak mendapat nomor yang sama.
   * Bila NIK / No. HP-nya sudah pernah terdaftar, ID lama itulah yang
   * dipakai kembali — jadi warga tidak punya dua ID.
   */
  function daftarMandiri(record) {
    const data = Object.assign({}, record);
    data.tanggalDaftar = data.tanggalDaftar || tanggalHariIni();
    data.status = data.status || 'Aktif';
    data.catatan = data.catatan || 'Mendaftar sendiri lewat halaman Bank Sampah';

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_NASABAH);
      const lama = cocokNasabahLama(daftar, data);
      if (lama) return Promise.resolve({ ok: true, pesan: 'Data lama dipakai kembali.', id: lama.id, lama: true });

      data.id = idNasabahBaru(daftar);
      daftar.push(data);
      tulisLokal(KUNCI_BS_NASABAH, daftar);
      return Promise.resolve({ ok: true, pesan: 'Nasabah baru terdaftar.', id: data.id });
    }

    // Aksi baca-tulis kecil — aman dipakai lewat JSONP seperti aksi lainnya.
    const kiriman = Object.assign({ action: 'daftarMandiri' }, data);

    return kirimAksi(kiriman).then(function (hasil) {
      if (hasil.ok || !hasil.tanpaBalasan) return hasil;

      /* Balasannya hilang di jalan — padahal warganya bisa jadi SUDAH masuk
       * ke Sheets. Khusus pendaftaran, mengulang itu AMAN: server mencocokkan
       * NIK (atau No. HP + nama) lebih dulu, sehingga warga yang tadi sempat
       * tersimpan akan menerima ID LAMA-nya kembali, bukan ID kedua. Sekali
       * ulang biasanya cukup untuk memungut ID itu, sehingga setoran warga
       * tidak jadi batal hanya karena balasan pertama tersesat. */
      return jeda(1500).then(function () { return kirimAksi(kiriman); });
    });
  }

  /** Mencari nasabah yang sudah ada berdasarkan NIK, lalu No. HP + nama. */
  function cocokNasabahLama(daftar, data) {
    const nik = normalId(data.nik);
    if (nik) {
      const lewatNik = daftar.filter(function (n) { return normalId(n.nik) === nik; })[0];
      if (lewatNik) return lewatNik;
    }
    const hp = nomorKunci(data.noHp);
    const nama = String(data.nama || '').trim().toLowerCase();
    if (!hp || !nama) return null;
    return daftar.filter(function (n) {
      return nomorKunci(n.noHp) === hp &&
        String(n.nama || '').trim().toLowerCase() === nama;
    })[0] || null;
  }

  /** Menyeragamkan No. HP sebelum dibandingkan — kembarannya ada di
   *  apps-script/CodeBankSampah.gs. Google Sheets menyimpan "08979802427"
   *  sebagai angka sehingga 0 di depannya hilang; tanpa penyeragaman ini
   *  warga yang sama bisa terdaftar berkali-kali. */
  function nomorKunci(v) {
    let d = String(v === null || v === undefined ? '' : v).replace(/[^0-9]/g, '');
    if (!d) return '';
    if (d.indexOf('620') === 0) d = d.slice(2);                        // 62 + 08xx…
    if (d.indexOf('62') === 0 && d.charAt(2) === '8') d = d.slice(2);  // 62 + 8xx…
    return d.replace(/^0+/, '');
  }

  /* =======================================================================
   *  SETORAN YANG DICATAT SENDIRI OLEH WARGA (+ foto bukti)
   * ===================================================================== */

  /**
   * Mengirim catatan setoran milik warga ke buku petugas.
   * Karena membawa FOTO, pengirimannya lewat POST — lihat penjelasan pada
   * postFetch()/postBingkai() di atas. ID catatannya dibuat di sini juga,
   * supaya kalau balasan server hilang di jalan kita masih bisa memeriksa
   * sendiri apakah catatannya sudah masuk.
   *
   * @returns {Promise<{ok:boolean, pesan:string, id:string}>}
   */
  function kirimSetoranWarga(record) {
    const data = Object.assign({}, record);
    data.id = data.id || idAcak('SW');
    data.tanggal = data.tanggal || waktuSekarang();
    data.status = BS_STATUS_SETOR.MENUNGGU;
    data.tanggalProses = '';
    data.catatanPetugas = '';
    data.idSetoran = '';
    data.idWarga = normalId(data.idWarga);

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN_WARGA);
      daftar.push(data);
      if (!tulisLokal(KUNCI_BS_SETORAN_WARGA, daftar)) {
        // Foto besar bisa membuat penyimpanan perangkat penuh — simpan tanpa foto.
        daftar[daftar.length - 1] = Object.assign({}, data, { foto: '' });
        tulisLokal(KUNCI_BS_SETORAN_WARGA, daftar);
        return Promise.resolve({
          ok: true, id: data.id,
          pesan: 'Setoran tercatat, tetapi fotonya tidak muat di penyimpanan perangkat ini.',
        });
      }
      return Promise.resolve({ ok: true, pesan: 'Setoran tercatat.', id: data.id });
    }

    const kiriman = Object.assign({ action: 'setorWarga' }, data);

    return postFetch(kiriman).then(function (resp) {
      if (resp && resp.ok) {
        return { ok: true, pesan: resp.pesan || 'Setoran tercatat.', id: resp.id || data.id };
      }
      // Server menjawab dan MENOLAK — tidak perlu dicoba lagi.
      if (resp && resp.pesan) return { ok: false, pesan: resp.pesan };

      // Balasannya tidak terbaca (CORS/jaringan). Kirim ulang lewat formulir
      // tersembunyi, lalu periksa sendiri hasilnya ke server.
      return postBingkai(kiriman).then(function () {
        return tungguSetoranWargaMasuk(data.id, 3);
      });
    });
  }

  /** Memeriksa berulang apakah catatan setoran warga sudah sampai di server. */
  function tungguSetoranWargaMasuk(id, sisa) {
    return jeda(2500).then(function () {
      return jsonp({ action: 'cekSetorWarga', id: id }).then(function (resp) {
        if (resp && resp.ok && resp.ada) {
          return { ok: true, pesan: 'Setoran tercatat.', id: id };
        }
        if (sisa > 0) return tungguSetoranWargaMasuk(id, sisa - 1);
        return {
          ok: false,
          tanpaBalasan: true,
          id: id,
          pesan: 'Server bank sampah belum menjawab. Catatan Anda bisa jadi TETAP masuk — ' +
            'tetap kirim chat WhatsAppnya agar petugas tahu.',
        };
      });
    });
  }

  /**
   * Petugas menyetujui / menolak catatan setoran warga.
   * Bila DISETUJUI, catatan itu diubah menjadi setoran resmi (masuk ke
   * tabungan warga) memakai berat & harga yang sudah dipastikan petugas.
   *
   * @param {string} id      - ID catatan setoran warga
   * @param {string} status  - BS_STATUS_SETOR.DISETUJUI | .DITOLAK
   * @param {Object} [opsi]  - { berat, kantong, hargaPerKg, tanggal, catatan }
   */
  function prosesSetoranWarga(id, status, opsi) {
    const pilihan = opsi || {};

    if (!pakaiServer()) {
      const daftar = ambilLokal(KUNCI_BS_SETORAN_WARGA);
      const i = daftar.findIndex(function (s) { return String(s.id) === String(id); });
      if (i < 0) return Promise.resolve({ ok: false, pesan: 'Catatan setoran tidak ditemukan.' });
      if (String(daftar[i].status) !== BS_STATUS_SETOR.MENUNGGU) {
        return Promise.resolve({ ok: false, pesan: 'Catatan ini sudah pernah diproses.' });
      }

      daftar[i].status = status;
      daftar[i].tanggalProses = tanggalHariIni();
      daftar[i].catatanPetugas = pilihan.catatan || '';

      if (status !== BS_STATUS_SETOR.DISETUJUI) {
        tulisLokal(KUNCI_BS_SETORAN_WARGA, daftar);
        return Promise.resolve({ ok: true, pesan: 'Setoran warga ditolak.' });
      }

      const asli = daftar[i];
      const berat = keAngka(pilihan.berat) || keAngka(asli.berat) ||
        keAngka(asli.kantong) * (cfg().KG_PER_KANTONG || 3);
      const harga = keAngka(pilihan.hargaPerKg) || hargaJenis(asli.jenis);

      return simpanSetoran({
        idWarga: asli.idWarga,
        tanggal: pilihan.tanggal || tanggalHariIni(),
        jenis: asli.jenis,
        berat: Math.round(berat * 100) / 100,
        kantong: keAngka(pilihan.kantong) || keAngka(asli.kantong),
        hargaPerKg: harga,
        pendapatan: Math.round(berat * harga),
        catatan: catatanSetoranDari(asli),
      }).then(function (hasil) {
        daftar[i].idSetoran = hasil.id || '';
        tulisLokal(KUNCI_BS_SETORAN_WARGA, daftar);
        return { ok: true, pesan: 'Setoran warga disetujui & masuk ke tabungannya.' };
      });
    }

    return kirimAksi({
      action: 'prosesSetoranWarga',
      token: cfg().token,
      id: id,
      status: status,
      catatan: pilihan.catatan || '',
      berat: pilihan.berat === undefined ? '' : pilihan.berat,
      kantong: pilihan.kantong === undefined ? '' : pilihan.kantong,
      hargaPerKg: pilihan.hargaPerKg === undefined ? '' : pilihan.hargaPerKg,
      tanggal: pilihan.tanggal || '',
    });
  }

  /** Menyusun catatan setoran resmi dari catatan yang ditulis warga. */
  function catatanSetoranDari(asli) {
    const bagian = ['Dicatat sendiri oleh warga'];
    const lain = String(asli.jenisLain || '').trim();
    if (lain) bagian.push('Lain-lain: ' + lain);
    const catatan = String(asli.catatan || '').trim();
    if (catatan) bagian.push(catatan);
    return bagian.join(' · ');
  }

  function hapusSetoranWarga(id) {
    if (!pakaiServer()) {
      tulisLokal(KUNCI_BS_SETORAN_WARGA, ambilLokal(KUNCI_BS_SETORAN_WARGA).filter(function (s) {
        return String(s.id) !== String(id);
      }));
      return Promise.resolve({ ok: true, pesan: 'Catatan setoran warga dihapus.' });
    }
    return kirimAksi({ action: 'hapusSetoranWarga', token: cfg().token, id: id });
  }

  /**
   * Alamat gambar yang bisa dipasang di <img> / dibuka di tab baru.
   * Isi kolom "foto" bisa berupa: data URL (mode perangkat), ID berkas
   * Google Drive (mode Google Sheets), atau URL biasa.
   */
  function tautanFoto(foto, untukTampil) {
    const teks = String(foto === null || foto === undefined ? '' : foto).trim();
    if (!teks) return '';
    if (teks.indexOf('data:') === 0) return teks;
    if (/^https?:\/\//i.test(teks)) return teks;
    return untukTampil
      ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(teks) + '&sz=w1200'
      : 'https://drive.google.com/file/d/' + encodeURIComponent(teks) + '/view';
  }

  /* =======================================================================
   *  API PUBLIK
   * ===================================================================== */
  return {
    // membaca
    muatSemua: muatSemua,
    cekWarga: cekWarga,
    ringkas: ringkas,
    pakaiServer: pakaiServer,

    /* Jalur langsung ke Apps Script — dipakai js/bank-sampah-akun.js (akun
     * petugas), yang perlu membaca sendiri balasan mentah dari server
     * (mis. penanda "salah" saat kata sandi lama tidak cocok).
     *   panggilServer      → sekali kirim, untuk aksi yang MENGUBAH data.
     *   panggilServerBaca  → untuk aksi MEMBACA; boleh dicoba sekali lagi
     *                        bila balasannya hilang di jalan. */
    panggilServer: jsonp,
    panggilServerBaca: jsonpBaca,

    // nasabah
    simpanNasabah: simpanNasabah,
    ubahNasabah: ubahNasabah,
    hapusNasabah: hapusNasabah,
    idNasabahBaru: idNasabahBaru,

    // setoran
    simpanSetoran: simpanSetoran,
    ubahSetoran: ubahSetoran,
    hapusSetoran: hapusSetoran,
    tandaiCair: tandaiCair,
    batalCair: batalCair,

    // pengajuan pencairan
    ajukanPencairan: ajukanPencairan,
    prosesPengajuan: prosesPengajuan,
    hapusPengajuan: hapusPengajuan,

    // setoran yang dicatat sendiri oleh warga (+ foto bukti)
    daftarMandiri: daftarMandiri,
    kirimSetoranWarga: kirimSetoranWarga,
    prosesSetoranWarga: prosesSetoranWarga,
    hapusSetoranWarga: hapusSetoranWarga,

    // jenis sampah
    daftarJenis: daftarJenis,
    cariJenis: cariJenis,
    hargaJenis: hargaJenis,
    kelompokJenis: kelompokJenis,
    labelJenis: labelJenis,

    // bantu tampilan
    rupiah: rupiah,
    kg: kg,
    keAngka: keAngka,
    normalId: normalId,
    tanggalHariIni: tanggalHariIni,
    waktuSekarang: waktuSekarang,
    tautanFoto: tautanFoto,
  };
})();
