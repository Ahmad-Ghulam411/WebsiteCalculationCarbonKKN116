/* ============================================================================
 *  AKUN PETUGAS BANK SAMPAH — ganti Nama Pengguna & Kata Sandi
 *  ----------------------------------------------------------------------------
 *  Berkas ini HANYA dipakai halaman admin (admin-bank-sampah.html). Isinya:
 *
 *    1. Pengacak sandi (SHA-256) — kata sandi TIDAK PERNAH disimpan apa adanya
 *       dan TIDAK PERNAH ikut menempel di alamat URL. Yang berjalan hanyalah
 *       "sidik jari"-nya sepanjang 64 huruf, yang tidak bisa dikembalikan
 *       menjadi kata sandi aslinya.
 *
 *    2. Tempat menyimpan akun. Ada tiga lapis, dipakai berurutan:
 *         a. GOOGLE SHEETS (tab "AkunAdmin") — sumber kebenaran utama, supaya
 *            akun baru langsung berlaku di HP/laptop mana pun.
 *         b. CADANGAN DI PERANGKAT (localStorage) — dipakai kalau Google
 *            Sheets sedang tidak bisa dihubungi, supaya petugas tidak terkunci
 *            di luar dashboardnya sendiri.
 *         c. AKUN BAWAAN di js/config.js — dipakai selama akun belum pernah
 *            diganti sama sekali.
 *
 *    3. Pemeriksaan saat masuk, pilihan "Ingatkan Saya", & aksi mengganti akun.
 *
 *  ⚠️  SUPAYA AKUN BARU BERLAKU DI SEMUA PERANGKAT, apps-script/CodeBankSampah.gs
 *      WAJIB di-deploy ulang (Deploy ▸ Manage deployments ▸ ✏️ ▸ Version:
 *      New version ▸ Deploy). Selama belum, penggantian akun tetap bisa
 *      dilakukan — hanya saja berlakunya di perangkat yang dipakai saja, dan
 *      dashboard akan memberi tahu hal itu dengan jelas.
 *
 *  CATATAN JUJUR SOAL KEAMANAN: seluruh halaman ini berjalan di browser, jadi
 *  penggantian akun ini adalah PENGHALANG DASAR — bukan pengaman tingkat bank.
 *  Meski begitu ia tetap berguna: setelah diganti, kata sandi tidak lagi
 *  tertulis apa adanya di js/config.js yang bisa dibaca siapa saja.
 * ========================================================================== */

/* Kunci penyimpanan cadangan akun di perangkat */
const KUNCI_BS_AKUN = 'bankSampahAkunPetugas';

/* Kunci penyimpanan pilihan "Ingatkan Saya" di perangkat */
const KUNCI_BS_INGAT = 'bankSampahIngatPetugas';

const AkunPetugas = (function () {
  'use strict';

  /* Ditempel di depan kata sandi sebelum diacak ("garam"), supaya sidik sandi
   * di sini tidak sama dengan sidik sandi aplikasi lain walau sandinya sama.
   * ⚠️ HARUS SAMA PERSIS dengan GARAM_SANDI di apps-script/CodeBankSampah.gs. */
  const GARAM = 'BankSampahKampungBaru116';

  /* Aturan sandi baru — dipakai formulir "Akun Petugas" */
  const MIN_SANDI = 8;
  const MIN_USER = 4;
  const MAKS_USER = 32;
  const POLA_USER = /^[A-Za-z0-9._-]+$/;

  /* =======================================================================
   *  1) PENGACAK SANDI — SHA-256 (ditulis sendiri agar berjalan di semua
   *     browser, termasuk saat berkas dibuka langsung tanpa server web)
   * ===================================================================== */

  /* Tetapan resmi SHA-256 (32 bit pertama dari akar pangkat tiga
   * 64 bilangan prima pertama). Jangan diubah. */
  const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  /** Memutar bit ke kanan (rotasi 32 bit). */
  function putar(x, n) { return (x >>> n) | (x << (32 - n)); }

  /** Mengubah teks menjadi deretan byte UTF-8 (emoji & huruf beraksen ikut aman).
   *  Hasilnya sengaja dibuat sama persis dengan TextEncoder bawaan browser
   *  MAUPUN Utilities.Charset.UTF_8 di Apps Script — termasuk untuk potongan
   *  emoji yang rusak (kode D800–DFFF yang berdiri sendiri), yang oleh
   *  keduanya diganti menjadi tanda tanya berlian "�" (U+FFFD). */
  function keUtf8(teks) {
    const s = String(teks === null || teks === undefined ? '' : teks);
    const byte = [];
    for (let i = 0; i < s.length; i++) {
      let kode = s.codePointAt(i);
      if (kode > 0xffff) i++;                        // emoji memakai dua posisi di dalam teks
      if (kode >= 0xd800 && kode <= 0xdfff) kode = 0xfffd; // potongan emoji yang rusak
      if (kode < 0x80) {
        byte.push(kode);
      } else if (kode < 0x800) {
        byte.push(0xc0 | (kode >> 6), 0x80 | (kode & 63));
      } else if (kode < 0x10000) {
        byte.push(0xe0 | (kode >> 12), 0x80 | ((kode >> 6) & 63), 0x80 | (kode & 63));
      } else {
        byte.push(0xf0 | (kode >> 18), 0x80 | ((kode >> 12) & 63),
                  0x80 | ((kode >> 6) & 63), 0x80 | (kode & 63));
      }
    }
    return byte;
  }

  function hex32(x) {
    let teks = (x >>> 0).toString(16);
    while (teks.length < 8) teks = '0' + teks;
    return teks;
  }

  /** Sidik jari SHA-256 sebuah teks → 64 huruf kecil (0-9, a-f). */
  function sha256(teks) {
    const pesan = keUtf8(teks);
    const panjangBit = pesan.length * 8;

    // Pengganjal wajib: 1 bit "1", lalu nol, lalu panjang pesan (64 bit).
    pesan.push(0x80);
    while (pesan.length % 64 !== 56) pesan.push(0);
    const tinggi = Math.floor(panjangBit / 4294967296);
    const rendah = panjangBit % 4294967296;
    pesan.push((tinggi >>> 24) & 255, (tinggi >>> 16) & 255, (tinggi >>> 8) & 255, tinggi & 255);
    pesan.push((rendah >>> 24) & 255, (rendah >>> 16) & 255, (rendah >>> 8) & 255, rendah & 255);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    const w = new Array(64);
    for (let i = 0; i < pesan.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        const j = i + t * 4;
        w[t] = (pesan[j] << 24) | (pesan[j + 1] << 16) | (pesan[j + 2] << 8) | pesan[j + 3];
      }
      for (let t = 16; t < 64; t++) {
        const x = w[t - 15], y = w[t - 2];
        const s0 = putar(x, 7) ^ putar(x, 18) ^ (x >>> 3);
        const s1 = putar(y, 17) ^ putar(y, 19) ^ (y >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }

      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = putar(e, 6) ^ putar(e, 11) ^ putar(e, 25);
        const pilih = (e & f) ^ (~e & g);
        const t1 = (h + S1 + pilih + K256[t] + w[t]) | 0;
        const S0 = putar(a, 2) ^ putar(a, 13) ^ putar(a, 22);
        const mayoritas = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mayoritas) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }

      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }

    return hex32(h0) + hex32(h1) + hex32(h2) + hex32(h3) +
           hex32(h4) + hex32(h5) + hex32(h6) + hex32(h7);
  }

  /** Nama pengguna selalu dibandingkan tanpa rewel huruf besar/kecil & spasi. */
  function rapikanUser(user) {
    return String(user === null || user === undefined ? '' : user).trim();
  }
  function kunciUser(user) { return rapikanUser(user).toLowerCase(); }

  /**
   * Sidik jari sebuah kata sandi. Nama pengguna ikut diacak, jadi mengganti
   * nama pengguna otomatis mengubah sidiknya juga.
   * ⚠️ HARUS SAMA PERSIS dengan hashSandi() di apps-script/CodeBankSampah.gs.
   */
  function hash(user, sandi) {
    return sha256(GARAM + '|' + kunciUser(user) + '|' +
      String(sandi === null || sandi === undefined ? '' : sandi));
  }

  /** Membandingkan dua sidik sandi tanpa membocorkan di huruf ke berapa bedanya. */
  function sidikSama(a, b) {
    const x = String(a || '').toLowerCase();
    const y = String(b || '').toLowerCase();
    if (x.length !== y.length || !x.length) return false;
    let beda = 0;
    for (let i = 0; i < x.length; i++) beda |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return beda === 0;
  }

  /* =======================================================================
   *  2) TEMPAT MENYIMPAN AKUN
   * ===================================================================== */

  function cfg() { return (KONFIGURASI && KONFIGURASI.BANK_SAMPAH) || {}; }

  /** Akun bawaan pabrik — apa adanya dari js/config.js. */
  function akunBawaan() {
    const bawaan = cfg().ADMIN || {};
    const user = rapikanUser(bawaan.username) || 'admin';
    return { username: user, sidik: hash(user, bawaan.password || ''), bawaan: true, diubah: '' };
  }

  /** Cadangan akun di perangkat ini — null bila belum pernah ada penggantian. */
  function akunPerangkat() {
    try {
      const isi = JSON.parse(localStorage.getItem(KUNCI_BS_AKUN) || 'null');
      if (!isi || typeof isi !== 'object') return null;
      const user = rapikanUser(isi.username);
      const sidik = String(isi.sidik || '').trim().toLowerCase();
      if (!user || sidik.length !== 64) return null;
      return { username: user, sidik: sidik, bawaan: false, diubah: String(isi.diubah || '') };
    } catch (e) {
      return null;
    }
  }

  function simpanPerangkat(akun) {
    try {
      localStorage.setItem(KUNCI_BS_AKUN, JSON.stringify({
        username: rapikanUser(akun.username),
        sidik: String(akun.sidik || '').toLowerCase(),
        diubah: akun.diubah || '',
      }));
      return true;
    } catch (e) {
      console.warn('Akun petugas tidak bisa disimpan di perangkat ini:', e);
      return false;
    }
  }

  /** Membuang cadangan akun di perangkat ini (kembali memakai akun bawaan). */
  function lupakanPerangkat() {
    try { localStorage.removeItem(KUNCI_BS_AKUN); return true; } catch (e) { return false; }
  }

  /** Akun yang berlaku di perangkat ini: cadangan bila ada, kalau tidak yang bawaan. */
  function akunBerlaku() { return akunPerangkat() || akunBawaan(); }

  /* =======================================================================
   *  2b) "INGATKAN SAYA" — tetap masuk walau website ditutup
   *  ---------------------------------------------------------------------
   *  Biasanya petugas hanya dianggap "sedang masuk" selama tab-nya terbuka
   *  (sessionStorage). Kalau kotak "Ingatkan Saya" dicentang, satu catatan
   *  kecil ditinggal di perangkat supaya kunjungan berikutnya bisa langsung
   *  masuk tanpa mengetik ulang.
   *
   *  Yang disimpan HANYA nama pengguna + SIDIK sandinya (SHA-256), persis
   *  seperti cadangan akun di atas — kata sandi aslinya tidak pernah ikut
   *  tersimpan dan tidak bisa dikembalikan dari sidik itu.
   *
   *  CATATAN JUJUR: sidik ini tetap bisa dibaca oleh siapa pun yang memegang
   *  perangkatnya, dan cukup untuk masuk ke dashboard. Karena itu kotaknya
   *  diberi peringatan agar TIDAK dicentang di HP/laptop yang dipakai
   *  bersama-sama. Ingatan ini dibuang saat petugas menekan "🚪 Keluar",
   *  saat masa berlakunya habis, dan saat server menolak akunnya (mis.
   *  kata sandinya sudah diganti dari perangkat lain).
   * ===================================================================== */

  /* Berapa lama ingatan bertahan. Setiap kali berhasil dipakai masuk,
   * masa berlakunya diperpanjang lagi dari hari itu. */
  const INGAT_HARI = 30;
  const INGAT_MS = INGAT_HARI * 24 * 60 * 60 * 1000;

  const POLA_SIDIK = /^[0-9a-f]{64}$/;

  /** Membuang ingatan "Ingatkan Saya" di perangkat ini. */
  function lupakanIngatan() {
    try { localStorage.removeItem(KUNCI_BS_INGAT); return true; } catch (e) { return false; }
  }

  /**
   * Ingatan yang masih berlaku di perangkat ini — null bila tidak ada.
   * Catatan yang rusak atau sudah kedaluwarsa langsung dibuang di sini,
   * jadi pemanggilnya tidak perlu mengurus pembersihan.
   */
  function bacaIngatan() {
    let isi;
    try {
      isi = JSON.parse(localStorage.getItem(KUNCI_BS_INGAT) || 'null');
    } catch (e) {
      lupakanIngatan();
      return null;
    }
    if (!isi || typeof isi !== 'object') return null;

    const user = rapikanUser(isi.username);
    const sidik = String(isi.sidik || '').trim().toLowerCase();
    const berlaku = Number(isi.berlaku);

    if (!user || !POLA_SIDIK.test(sidik) || !isFinite(berlaku) || berlaku <= 0) {
      lupakanIngatan();
      return null;
    }
    if (Date.now() >= berlaku) {           // sudah lewat 30 hari
      lupakanIngatan();
      return null;
    }
    return { username: user, sidik: sidik, berlaku: berlaku };
  }

  /** Menyimpan / memperpanjang ingatan. false bila penyimpanan browser menolak. */
  function simpanIngatan(username, sidik) {
    const user = rapikanUser(username);
    const jari = String(sidik || '').trim().toLowerCase();
    if (!user || !POLA_SIDIK.test(jari)) return false;

    const sekarang = Date.now();
    try {
      localStorage.setItem(KUNCI_BS_INGAT, JSON.stringify({
        username: user, sidik: jari, dibuat: sekarang, berlaku: sekarang + INGAT_MS,
      }));
      return true;
    } catch (e) {
      console.warn('"Ingatkan Saya" tidak bisa disimpan di perangkat ini:', e);
      return false;
    }
  }

  /** Dipakai layar masuk saat kotak "Ingatkan Saya" dicentang. */
  function ingat(user, sandi) {
    return simpanIngatan(user, hash(user, sandi));
  }

  /** Keterangan singkat untuk layar "masuk otomatis" — sidiknya TIDAK ikut. */
  function infoIngatan() {
    const ingatan = bacaIngatan();
    return ingatan ? { username: ingatan.username, berlaku: ingatan.berlaku } : null;
  }

  /** Menyegarkan ingatan sesudah akun diganti — HANYA bila petugas memang
   *  sedang memakainya, supaya penggantian akun tidak diam-diam
   *  menghidupkan "Ingatkan Saya" yang tidak pernah dicentang. */
  function perbaruiIngatan(username, sidik) {
    if (bacaIngatan()) simpanIngatan(username, sidik);
  }

  /**
   * true bila ingatan yang sedang diperiksa MASIH ingatan yang tersimpan.
   *
   * Pemeriksaan ke Google Sheets bisa makan waktu sampai satu menit, dan
   * selama itu petugas mungkin sudah menekan "Masuk dengan akun lain" —
   * atau malah sudah masuk memakai akun yang berbeda. Jawaban yang datang
   * TERLAMBAT tidak boleh menghidupkan kembali ingatan yang sudah dibuang,
   * dan tidak boleh menimpa/menghapus ingatan yang baru.
   */
  function ingatanMasihSama(ingatan) {
    const kini = bacaIngatan();
    return !!kini && kini.sidik === ingatan.sidik &&
      kunciUser(kini.username) === kunciUser(ingatan.username);
  }

  /** Memperpanjang masa berlaku ingatan sesudah berhasil dipakai masuk. */
  function perpanjangIngatan(ingatan, username) {
    if (!ingatanMasihSama(ingatan)) return;
    simpanIngatan(rapikanUser(username) || ingatan.username, ingatan.sidik);
  }

  function waktuSekarang() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** Mencocokkan nama pengguna + kata sandi dengan akun yang berlaku di perangkat. */
  function cocokDiPerangkat(user, sandi) {
    const akun = akunBerlaku();
    return kunciUser(user) === kunciUser(akun.username) && sidikSama(hash(user, sandi), akun.sidik);
  }

  /* =======================================================================
   *  3) BERBICARA DENGAN GOOGLE SHEETS
   * ===================================================================== */

  /* Kenapa nama isiannya diawali "akun"? Gerbang depan Google (script.google.com)
   * memakai sendiri beberapa nama isian umum seperti "user". Permintaan yang
   * ikut membawa nama itu bisa ditolak sebelum sampai ke skrip kita. Awalan
   * "akun" membuat namanya pasti tidak bertabrakan. */
  function paramAkun(tambahan) {
    return Object.assign({ token: cfg().token || '' }, tambahan || {});
  }

  /* Catatan: BankSampah dibuat dengan "const" di js/bank-sampah-storage.js,
   * jadi ia TIDAK menempel di window — pemeriksaannya harus memakai "typeof",
   * bukan window.BankSampah (yang selalu undefined). */
  function pakaiServer() {
    return typeof BankSampah !== 'undefined' &&
      typeof BankSampah.pakaiServer === 'function' &&
      BankSampah.pakaiServer();
  }

  /**
   * Menerjemahkan balasan server yang BUKAN "ok" dan BUKAN "salah sandi"
   * menjadi alasan yang bisa DIMENGERTI PETUGAS.
   *
   * Pesan asli dari server sengaja tidak diteruskan ke layar: isinya bahasa
   * teknis yang tidak bisa ditindaklanjuti petugas bank sampah. Pesan itu
   * cukup dicatat di konsol browser untuk keperluan pemeriksaan.
   * Layar hanya perlu memberi tahu bahwa urusannya bukan tugas petugas —
   * bagian "hubungi anggota KKN" ditambahkan oleh js/admin-bank-sampah.js.
   *
   * @returns {string} alasan mengapa penyimpanan online tidak bisa dipakai
   */
  function alasanServer(resp) {
    const pesan = String((resp && resp.pesan) || '');
    if (pesan) console.warn('Balasan penyimpanan online:', pesan);

    if (resp && resp.tanpaBalasan) {
      return 'Penyimpanan online belum menjawab (koneksi lambat atau server sedang sibuk).';
    }
    if (/tidak dikenal/i.test(pesan)) {
      return 'Penyimpanan online belum siap menerima penggantian akun.';
    }
    return 'Penyimpanan online sedang tidak bisa dihubungi.';
  }

  /* =======================================================================
   *  4) MASUK DASHBOARD
   * ===================================================================== */

  /**
   * Memeriksa nama pengguna & kata sandi saat petugas menekan "Masuk".
   *
   * Urutannya:
   *   - Kalau Google Sheets dipakai → dialah yang memutuskan. Jawaban "salah"
   *     dari server bersifat FINAL (supaya sandi lama benar-benar mati setelah
   *     diganti dari perangkat lain).
   *   - Kalau server tidak menjawab / belum di-deploy ulang → dicocokkan dengan
   *     akun cadangan di perangkat ini, atau akun bawaan js/config.js.
   *
   * @returns {Promise<{ok:boolean, pesan:string, username:string,
   *                    sumber:string, catatan:string}>}
   */
  function masuk(user, sandi) {
    const nama = rapikanUser(user);
    if (!nama || !String(sandi || '')) {
      return Promise.resolve({
        ok: false, sumber: 'formulir', username: '', catatan: '',
        pesan: 'Nama pengguna dan kata sandi wajib diisi.',
      });
    }

    if (!pakaiServer()) return Promise.resolve(hasilPerangkat(nama, sandi, ''));

    return BankSampah.panggilServerBaca(paramAkun({
      action: 'masukAdmin',
      akunUser: nama,
      akunSidik: hash(nama, sandi),
    })).then(function (resp) {
      if (resp && resp.ok) {
        /* Server membenarkan. Cadangan di perangkat disamakan dengan keadaan
         * di server:
         *   - server sudah punya akun hasil penggantian → dicatat, supaya
         *     petugas tetap bisa masuk saat internetnya mati;
         *   - server masih memakai akun BAWAAN → catatan lama dibuang, supaya
         *     perangkat ini tidak mengira akunnya pernah diganti. */
        if (resp.tersimpan) {
          simpanPerangkat({
            username: rapikanUser(resp.username) || nama,
            sidik: hash(nama, sandi),
            diubah: resp.diubah || '',
          });
        } else {
          lupakanPerangkat();
        }
        return {
          ok: true, sumber: 'server', catatan: '', bawaan: !resp.tersimpan,
          username: rapikanUser(resp.username) || nama, pesan: '',
        };
      }
      if (resp && resp.salah) {
        return {
          ok: false, sumber: 'server', username: '', catatan: '', bawaan: false,
          pesan: 'Nama pengguna atau kata sandi salah. Coba lagi.',
        };
      }
      return hasilPerangkat(nama, sandi, alasanServer(resp));
    });
  }

  const PESAN_INGAT_KEDALUWARSA =
    'Akun petugas sudah diganti, jadi "Ingatkan Saya" yang lama tidak berlaku lagi. ' +
    'Silakan masuk memakai akun yang terbaru.';

  /**
   * MASUK OTOMATIS — dipakai saat halaman dibuka dan petugas pernah
   * mencentang "Ingatkan Saya" di perangkat ini.
   *
   * Sidik yang tersimpan diperiksa ULANG persis seperti saat mengetik kata
   * sandi, jadi ingatan lama tidak bisa dipakai lagi begitu akunnya diganti:
   *   - Google Sheets menjawab "salah" → ingatan DIBUANG, petugas diminta
   *     masuk memakai akun terbaru.
   *   - Google Sheets tidak menjawab   → dicocokkan dengan catatan akun di
   *     perangkat ini (ingatan TIDAK dibuang, siapa tahu servernya cuma
   *     sedang sibuk).
   *
   * @returns {Promise<{ok:boolean, alasan:string, pesan:string,
   *                    username:string, sumber:string, catatan:string}>}
   *          alasan: '' berhasil · 'kosong' tidak ada ingatan ·
   *                  'ditolak' ingatan sudah tidak berlaku (sudah dibuang) ·
   *                  'gagal' belum bisa dipastikan (ingatan dibiarkan)
   */
  function masukTersimpan() {
    const ingatan = bacaIngatan();
    if (!ingatan) {
      return Promise.resolve({
        ok: false, alasan: 'kosong', sumber: '', username: '',
        catatan: '', bawaan: false, pesan: '',
      });
    }

    if (!pakaiServer()) return Promise.resolve(hasilIngatPerangkat(ingatan, ''));

    return BankSampah.panggilServerBaca(paramAkun({
      action: 'masukAdmin',
      akunUser: ingatan.username,
      akunSidik: ingatan.sidik,
    })).then(function (resp) {
      /* Jawaban yang datang terlambat tidak boleh mengubah catatan apa pun
       * bila ingatannya sudah berganti/dibuang selagi menunggu. */
      const masihSama = ingatanMasihSama(ingatan);

      if (resp && resp.ok) {
        const nama = rapikanUser(resp.username) || ingatan.username;
        /* Cadangan akun di perangkat disamakan dengan keadaan di server —
         * sama persis seperti pada masuk() di atas. */
        if (masihSama) {
          if (resp.tersimpan) {
            simpanPerangkat({ username: nama, sidik: ingatan.sidik, diubah: resp.diubah || '' });
          } else {
            lupakanPerangkat();
          }
          perpanjangIngatan(ingatan, ingatan.username);
        }
        return {
          ok: true, alasan: '', sumber: 'server', catatan: '',
          bawaan: !resp.tersimpan, username: nama, pesan: '',
        };
      }
      if (resp && resp.salah) {
        if (masihSama) lupakanIngatan();
        return {
          ok: false, alasan: 'ditolak', sumber: 'server', username: ingatan.username,
          catatan: '', bawaan: false, pesan: PESAN_INGAT_KEDALUWARSA,
        };
      }
      return hasilIngatPerangkat(ingatan, alasanServer(resp));
    });
  }

  /** Memeriksa ingatan tanpa server — dicocokkan dengan akun di perangkat ini. */
  function hasilIngatPerangkat(ingatan, alasan) {
    const akun = akunBerlaku();
    const cocok = kunciUser(ingatan.username) === kunciUser(akun.username) &&
      sidikSama(ingatan.sidik, akun.sidik);

    if (!cocok) {
      /* Kalau memang tidak ada server, catatan di perangkat inilah kata
       * terakhirnya — ingatan yang tidak cocok tidak ada gunanya disimpan.
       * Kalau servernya ADA tapi sedang diam, ingatan dibiarkan: bisa jadi
       * ia masih benar dan hanya belum sempat diperiksa. */
      if (!pakaiServer()) lupakanIngatan();
      return {
        ok: false, alasan: pakaiServer() ? 'gagal' : 'ditolak', sumber: 'perangkat',
        username: ingatan.username, bawaan: false, catatan: alasan,
        pesan: pakaiServer()
          ? 'Masuk otomatis belum bisa dipastikan karena penyimpanan online sedang tidak ' +
            'menjawab. Silakan masuk seperti biasa.'
          : PESAN_INGAT_KEDALUWARSA,
      };
    }

    perpanjangIngatan(ingatan, akun.username);
    return {
      ok: true, alasan: '', sumber: 'perangkat', username: akun.username,
      bawaan: !!akun.bawaan, pesan: '',
      catatan: alasan ? alasan + ' Untuk sementara akun dicocokkan dengan catatan di perangkat ini.' : '',
    };
  }

  /** Hasil pemeriksaan tanpa server (cadangan di perangkat / akun bawaan). */
  function hasilPerangkat(nama, sandi, alasan) {
    const akun = akunBerlaku();
    if (!cocokDiPerangkat(nama, sandi)) {
      return {
        ok: false, sumber: 'perangkat', username: '', catatan: alasan, bawaan: false,
        pesan: 'Nama pengguna atau kata sandi salah. Coba lagi.',
      };
    }
    return {
      ok: true, sumber: 'perangkat', username: akun.username, pesan: '', bawaan: !!akun.bawaan,
      catatan: alasan ? alasan + ' Untuk sementara akun dicocokkan dengan catatan di perangkat ini.' : '',
    };
  }

  /* =======================================================================
   *  5) MENGGANTI AKUN
   * ===================================================================== */

  /** Memeriksa isian formulir SEBELUM apa pun dikirim ke server. */
  function periksaIsian(o) {
    const userLama = rapikanUser(o.userLama);
    const userBaru = rapikanUser(o.userBaru);
    const sandiLama = String(o.sandiLama || '');
    const sandiBaru = String(o.sandiBaru || '');
    const ulangi = String(o.ulangi || '');

    if (!userLama || !sandiLama) {
      return { ok: false, isian: 'lama', pesan: 'Isi dulu nama pengguna & kata sandi Anda yang sekarang.' };
    }
    if (!userBaru) {
      return { ok: false, isian: 'userBaru', pesan: 'Nama pengguna baru belum diisi.' };
    }
    if (userBaru.length < MIN_USER || userBaru.length > MAKS_USER) {
      return { ok: false, isian: 'userBaru',
        pesan: 'Nama pengguna baru harus ' + MIN_USER + '–' + MAKS_USER + ' huruf.' };
    }
    if (!POLA_USER.test(userBaru)) {
      return { ok: false, isian: 'userBaru',
        pesan: 'Nama pengguna baru hanya boleh huruf, angka, titik, garis bawah (_), dan strip (-) — tanpa spasi.' };
    }
    if (!sandiBaru) {
      return { ok: false, isian: 'sandiBaru', pesan: 'Kata sandi baru belum diisi.' };
    }
    if (sandiBaru.length < MIN_SANDI) {
      return { ok: false, isian: 'sandiBaru',
        pesan: 'Kata sandi baru minimal ' + MIN_SANDI + ' huruf/angka.' };
    }
    if (/^\s|\s$/.test(sandiBaru)) {
      return { ok: false, isian: 'sandiBaru',
        pesan: 'Kata sandi baru tidak boleh diawali atau diakhiri spasi — nanti sulit diketik ulang.' };
    }
    if (kunciUser(sandiBaru) === kunciUser(userBaru)) {
      return { ok: false, isian: 'sandiBaru',
        pesan: 'Kata sandi baru jangan sama dengan nama penggunanya — terlalu mudah ditebak.' };
    }
    if (sandiBaru === sandiLama) {
      return { ok: false, isian: 'sandiBaru',
        pesan: 'Kata sandi baru masih sama dengan yang lama. Pakai kata sandi yang benar-benar berbeda.' };
    }
    if (ulangi !== sandiBaru) {
      return { ok: false, isian: 'ulangi', pesan: 'Ulangan kata sandi baru belum sama. Periksa lagi.' };
    }
    return { ok: true, userLama: userLama, userBaru: userBaru, sandiLama: sandiLama, sandiBaru: sandiBaru };
  }

  /** Sekadar penilaian ringan untuk penunjuk kekuatan sandi di layar. */
  function nilaiSandi(sandi) {
    const teks = String(sandi || '');
    if (!teks) return { tingkat: 0, label: '', kelas: '' };
    let nilai = 0;
    if (teks.length >= MIN_SANDI) nilai++;
    if (teks.length >= 12) nilai++;
    if (/[a-z]/.test(teks) && /[A-Z]/.test(teks)) nilai++;
    if (/[0-9]/.test(teks)) nilai++;
    if (/[^A-Za-z0-9]/.test(teks)) nilai++;
    if (teks.length < MIN_SANDI) return { tingkat: 1, label: 'Terlalu pendek (minimal ' + MIN_SANDI + ')', kelas: 'lemah' };
    if (nilai <= 2) return { tingkat: 1, label: 'Masih lemah — tambahkan angka atau huruf besar', kelas: 'lemah' };
    if (nilai === 3) return { tingkat: 2, label: 'Lumayan aman', kelas: 'sedang' };
    return { tingkat: 3, label: 'Kuat 👍', kelas: 'kuat' };
  }

  /**
   * Mengganti akun petugas. Kata sandi lama WAJIB benar.
   *
   * @returns {Promise<{ok:boolean, pesan:string, sumber:string,
   *                    hanyaPerangkat:boolean, catatan:string, username:string}>}
   *          hanyaPerangkat=true berarti akun barunya baru berlaku di perangkat
   *          ini saja (Google Sheets belum bisa dihubungi / belum di-deploy ulang).
   */
  function ubah(o) {
    const periksa = periksaIsian(o);
    if (!periksa.ok) {
      return Promise.resolve({
        ok: false, sumber: 'formulir', hanyaPerangkat: false, catatan: '',
        username: '', isian: periksa.isian, pesan: periksa.pesan,
      });
    }

    const sidikLama = hash(periksa.userLama, periksa.sandiLama);
    const sidikBaru = hash(periksa.userBaru, periksa.sandiBaru);

    if (!pakaiServer()) return Promise.resolve(ubahDiPerangkat(periksa, sidikBaru, ''));

    return BankSampah.panggilServer(paramAkun({
      action: 'ubahAkunAdmin',
      akunUser: periksa.userLama,
      akunSidik: sidikLama,
      akunUserBaru: periksa.userBaru,
      akunSidikBaru: sidikBaru,
    })).then(function (resp) {
      if (resp && resp.ok) {
        simpanPerangkat({
          username: periksa.userBaru, sidik: sidikBaru, diubah: resp.diubah || '',
        });
        /* Kalau petugas sedang memakai "Ingatkan Saya", ingatannya ikut
         * disegarkan — kalau tidak, kunjungan berikutnya akan ditolak
         * server karena masih membawa sidik sandi yang lama. */
        perbaruiIngatan(periksa.userBaru, sidikBaru);
        return {
          ok: true, sumber: 'server', hanyaPerangkat: false, catatan: '',
          username: periksa.userBaru,
          pesan: 'Akun petugas berhasil diganti dan sudah tersimpan di Google Sheets.',
        };
      }
      if (resp && resp.salah) {
        return {
          ok: false, sumber: 'server', hanyaPerangkat: false, catatan: '',
          username: '', isian: 'lama',
          pesan: resp.pesan || 'Nama pengguna atau kata sandi lama salah.',
        };
      }
      return ubahDiPerangkat(periksa, sidikBaru, alasanServer(resp));
    });
  }

  /** Mengganti akun tanpa server — hanya berlaku di perangkat yang dipakai. */
  function ubahDiPerangkat(periksa, sidikBaru, alasan) {
    if (!cocokDiPerangkat(periksa.userLama, periksa.sandiLama)) {
      return {
        ok: false, sumber: 'perangkat', hanyaPerangkat: false, isian: 'lama',
        catatan: alasan,
        pesan: 'Nama pengguna atau kata sandi lama salah. Akun tidak jadi diganti.',
      };
    }

    const tersimpan = simpanPerangkat({
      username: periksa.userBaru, sidik: sidikBaru, diubah: waktuSekarang(),
    });
    if (!tersimpan) {
      return {
        ok: false, sumber: 'perangkat', hanyaPerangkat: false, catatan: alasan, username: '',
        pesan: 'Akun baru gagal disimpan di perangkat ini (penyimpanan browser penuh atau ditolak). ' +
          'Akun lama masih berlaku.',
      };
    }

    perbaruiIngatan(periksa.userBaru, sidikBaru);

    return {
      ok: true, sumber: 'perangkat', hanyaPerangkat: pakaiServer(), catatan: alasan,
      username: periksa.userBaru,
      pesan: pakaiServer()
        ? 'Akun baru tersimpan, TETAPI baru berlaku di perangkat ini.'
        : 'Akun petugas berhasil diganti dan tersimpan di perangkat ini.',
    };
  }

  /* =======================================================================
   *  6) KETERANGAN AKUN YANG SEDANG BERLAKU (untuk ditampilkan di layar)
   * ===================================================================== */

  /** Keterangan cepat tanpa menunggu server — dipakai saat halaman dibuka. */
  function infoCepat() {
    const akun = akunBerlaku();
    return {
      username: akun.username,
      diubah: akun.diubah || '',
      bawaan: !!akun.bawaan,
      sumber: akun.bawaan ? 'bawaan' : 'perangkat',
    };
  }

  /** Menanyakan akun yang berlaku ke Google Sheets (sidik sandinya TIDAK ikut). */
  function info() {
    if (!pakaiServer()) return Promise.resolve(Object.assign({ ok: true }, infoCepat()));

    return BankSampah.panggilServerBaca(paramAkun({ action: 'infoAkunAdmin' }))
      .then(function (resp) {
        if (resp && resp.ok) {
          return {
            ok: true,
            username: rapikanUser(resp.username),
            diubah: String(resp.diubah || ''),
            bawaan: !resp.tersimpan,
            sumber: 'server',
          };
        }
        return Object.assign({ ok: false, catatan: alasanServer(resp) }, infoCepat());
      });
  }

  return {
    // pengacak
    sha256: sha256,
    hash: hash,

    // masuk & ganti akun
    masuk: masuk,
    ubah: ubah,
    periksaIsian: periksaIsian,
    nilaiSandi: nilaiSandi,

    // "Ingatkan Saya"
    ingat: ingat,
    infoIngatan: infoIngatan,
    masukTersimpan: masukTersimpan,
    lupakanIngatan: lupakanIngatan,

    // keterangan akun
    info: info,
    infoCepat: infoCepat,

    // dipakai pengujian & pemulihan
    akunBawaan: akunBawaan,
    akunPerangkat: akunPerangkat,
    lupakanAkunPerangkat: lupakanPerangkat,

    // aturan (dipakai tampilan agar tulisannya tidak kembar-beda)
    ATURAN: {
      MIN_SANDI: MIN_SANDI, MIN_USER: MIN_USER, MAKS_USER: MAKS_USER,
      INGAT_HARI: INGAT_HARI,
    },
  };
})();
