/* ============================================================================
 *  PENYIMPANAN DATA BANK SAMPAH
 *  ----------------------------------------------------------------------------
 *  Menangani TIGA jenis data:
 *    1. NASABAH   — data warga yang menabung sampah (nama, NIK, alamat, dll.)
 *    2. SETORAN   — setiap kali warga menyetor sampah (kering/basah, berat, Rp)
 *    3. PENGAJUAN — permintaan warga untuk mencairkan pendapatannya
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
const KUNCI_BS_NASABAH   = 'bankSampahNasabah';
const KUNCI_BS_SETORAN   = 'bankSampahSetoran';
const KUNCI_BS_PENGAJUAN = 'bankSampahPengajuan';

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

/* Nilai tetap yang dipakai di banyak tempat */
const BS_JENIS = { KERING: 'Kering', BASAH: 'Basah' };
const BS_STATUS_CAIR = { BELUM: 'Belum Dicairkan', SUDAH: 'Sudah Dicairkan' };
const BS_STATUS_AJU = { DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

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

      const query = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        const v = params[k];
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
        };
      }
      return {
        ok: false,
        sumber: 'sheet',
        tanpaBalasan: !!(resp && resp.tanpaBalasan),
        pesan: (resp && resp.pesan) || 'Tidak bisa menghubungi server bank sampah.',
        nasabah: [], setoran: [], pengajuan: [],
      };
    });
  }

  /**
   * Mencari SATU nasabah beserta seluruh setoran & pengajuannya.
   * Dipakai halaman "Cek Bank Sampah" milik warga — tidak butuh token,
   * cukup tahu ID nasabahnya.
   * @returns {Promise<{ok:boolean, pesan:string, nasabah:Object|null,
   *                    setoran:Array, pengajuan:Array}>}
   */
  function cekWarga(id) {
    const kunci = normalId(id);
    if (!kunci) {
      return Promise.resolve({ ok: false, pesan: 'ID nasabah belum diisi.', nasabah: null, setoran: [], pengajuan: [] });
    }

    if (!pakaiServer()) {
      const nasabah = ambilLokal(KUNCI_BS_NASABAH).filter(function (n) {
        return normalId(n.id) === kunci || normalId(n.nik) === kunci;
      })[0] || null;

      if (!nasabah) {
        return Promise.resolve({ ok: false, pesan: 'ID nasabah tidak ditemukan.', nasabah: null, setoran: [], pengajuan: [] });
      }
      const idAsli = normalId(nasabah.id);
      return Promise.resolve({
        ok: true,
        pesan: '',
        nasabah: nasabah,
        setoran: ambilLokal(KUNCI_BS_SETORAN).filter(function (s) { return normalId(s.idWarga) === idAsli; }),
        pengajuan: ambilLokal(KUNCI_BS_PENGAJUAN).filter(function (p) { return normalId(p.idWarga) === idAsli; }),
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
        };
      }
      return {
        ok: false,
        tanpaBalasan: !!(resp && resp.tanpaBalasan),
        pesan: (resp && resp.pesan) || 'Tidak bisa menghubungi server bank sampah. Coba lagi sebentar.',
        nasabah: null, setoran: [], pengajuan: [],
      };
    });
  }

  /* =======================================================================
   *  MENGHITUNG RINGKASAN  (dipakai halaman warga & dashboard admin)
   * ===================================================================== */
  /**
   * Merangkum setoran seorang warga menjadi angka-angka yang ditampilkan.
   * Fungsi murni — tidak menyentuh penyimpanan, jadi hasilnya sama
   * baik data berasal dari Google Sheets maupun dari perangkat.
   */
  function ringkas(setoran, pengajuan) {
    const daftar = (setoran || []).slice().sort(function (a, b) {
      return String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
    });

    const kosong = { berat: 0, kantong: 0, pendapatan: 0, jumlahSetoran: 0 };
    const kering = Object.assign({}, kosong);
    const basah = Object.assign({}, kosong);
    let pendapatanTotal = 0;
    let belumCair = 0;
    let sudahCair = 0;

    daftar.forEach(function (s) {
      const berat = keAngka(s.berat);
      const kantong = keAngka(s.kantong);
      const nilai = keAngka(s.pendapatan);
      const ember = (String(s.jenis || '').toLowerCase().indexOf('basah') >= 0) ? basah : kering;

      ember.berat += berat;
      ember.kantong += kantong;
      ember.pendapatan += nilai;
      ember.jumlahSetoran += 1;

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

    return {
      setoran: daftar,
      setoranTerakhir: daftar.length ? daftar[0] : null,
      kering: kering,
      basah: basah,
      totalBerat: kering.berat + basah.berat,
      totalKantong: kering.kantong + basah.kantong,
      jumlahSetoran: daftar.length,
      pendapatanTotal: pendapatanTotal,
      belumCair: belumCair,
      sudahCair: sudahCair,
      pengajuan: pengajuanUrut,
      pengajuanMenunggu: menunggu.length ? menunggu[0] : null,
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
   *  API PUBLIK
   * ===================================================================== */
  return {
    // membaca
    muatSemua: muatSemua,
    cekWarga: cekWarga,
    ringkas: ringkas,
    pakaiServer: pakaiServer,

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

    // bantu tampilan
    rupiah: rupiah,
    kg: kg,
    keAngka: keAngka,
    normalId: normalId,
    tanggalHariIni: tanggalHariIni,
  };
})();
