/**
 * ============================================================================
 *  BACKEND GOOGLE APPS SCRIPT — BANK SAMPAH
 *  Kampung Baru, Kota Parepare
 * ----------------------------------------------------------------------------
 *  ⚠️  BERKAS INI TERPISAH dari apps-script/Code.gs (data jejak karbon).
 *      Pasang di SPREADSHEET YANG BERBEDA dan deploy sebagai Web App
 *      TERSENDIRI, supaya petugas bank sampah tidak bisa membuka data karbon
 *      dan sebaliknya.
 *
 *  Menyimpan 4 tabel (tab/sheet):
 *    1. "Nasabah"      — data warga penabung sampah
 *    2. "Setoran"      — setiap kali warga menyetor sampah
 *    3. "Pengajuan"    — permintaan warga untuk mencairkan pendapatan
 *    4. "SetoranWarga" — catatan setoran yang DIISI SENDIRI OLEH WARGA
 *                        beserta foto buktinya, menunggu disetujui/ditolak
 *                        petugas. Foto disimpan di Google Drive, yang
 *                        tercatat di sheet hanyalah ID berkasnya.
 *
 *  CARA PASANG (ringkas — lihat README.md untuk lengkapnya):
 *   1. Buka Google Sheet BARU (sheet.new), beri nama mis. "Bank Sampah Kampung Baru".
 *   2. Menu  Extensions ▸ Apps Script.
 *   3. Hapus kode contoh, tempel SELURUH isi berkas ini.
 *   4. Ganti TOKEN_RAHASIA di bawah agar SAMA dengan
 *      KONFIGURASI.BANK_SAMPAH.token di js/config.js.
 *   5. Deploy ▸ New deployment ▸ pilih "Web app".
 *        - Execute as        : Me
 *        - Who has access    : Anyone
 *   6. Salin URL "Web app" (…/exec) → tempel ke
 *      KONFIGURASI.BANK_SAMPAH.APPS_SCRIPT_URL di js/config.js.
 *   7. Saat pertama kali ada warga mengirim FOTO BUKTI, Google akan meminta
 *      izin tambahan untuk membuat berkas di Google Drive Anda. Setujui saja
 *      (Review permissions ▸ pilih akun ▸ Advanced ▸ Go to … ▸ Allow).
 *      Fotonya masuk ke folder "Foto Setoran Bank Sampah" di Drive Anda.
 *
 *  Setiap kali berkas ini diubah, WAJIB deploy versi baru:
 *  Deploy ▸ Manage deployments ▸ (pensil) ▸ Version: New version ▸ Deploy.
 * ============================================================================
 */

// ⚠️  GANTI token ini. HARUS SAMA dengan KONFIGURASI.BANK_SAMPAH.token di js/config.js
var TOKEN_RAHASIA = 'rahasia-bank-sampah-116';

// Pendapatan minimal (Rp) yang boleh diajukan warga untuk dicairkan.
// Samakan dengan KONFIGURASI.BANK_SAMPAH.MIN_PENCAIRAN di js/config.js.
var MIN_PENCAIRAN = 10000;

/* Nama tab/sheet */
var SHEET_NASABAH       = 'Nasabah';
var SHEET_SETORAN       = 'Setoran';
var SHEET_PENGAJUAN     = 'Pengajuan';
var SHEET_SETORAN_WARGA = 'SetoranWarga';

/* Nama folder Google Drive tempat foto bukti setoran warga disimpan.
 * Folder ini dibuat otomatis saat foto pertama masuk. */
var FOLDER_FOTO = 'Foto Setoran Bank Sampah';

/* Harga beli per kg (Rp) tiap jenis sampah — samakan dengan
 * KONFIGURASI.BANK_SAMPAH.JENIS di js/config.js. Dipakai sebagai cadangan
 * bila petugas tidak mengisi sendiri harganya saat menyetujui setoran warga. */
var HARGA_JENIS = {
  'botol plastik': 3000,
  'kardus': 1500,
  'rak telur': 1000,
  'gelas plastik': 2500,
  'lain-lain': 1000,
  'kering': 2000, // pengelompokan lama
  'basah': 500,   // pengelompokan lama
};

/* Perkiraan berat 1 kantong bila warga/petugas tidak menimbang (kg).
 * Samakan dengan KONFIGURASI.BANK_SAMPAH.KG_PER_KANTONG di js/config.js. */
var KG_PER_KANTONG = 3;

/* Nilai status — HARUS sama persis dengan js/bank-sampah-storage.js */
var STATUS_BELUM     = 'Belum Dicairkan';
var STATUS_SUDAH     = 'Sudah Dicairkan';
var STATUS_DIAJUKAN  = 'Diajukan';
var STATUS_DISETUJUI = 'Disetujui';
var STATUS_MENUNGGU  = 'Menunggu';

/* Urutan kolom — HARUS sama dengan SKEMA_BS_* di js/bank-sampah-storage.js */
var KOLOM_NASABAH = ['id', 'nama', 'nik', 'alamat', 'rt', 'rw', 'noHp', 'tanggalDaftar', 'status', 'catatan'];
var JUDUL_NASABAH = ['ID Nasabah', 'Nama Warga', 'NIK', 'Alamat', 'RT', 'RW', 'No. HP',
                     'Tanggal Daftar', 'Status', 'Catatan'];

var KOLOM_SETORAN = ['id', 'idWarga', 'tanggal', 'jenis', 'berat', 'kantong',
                     'hargaPerKg', 'pendapatan', 'status', 'tanggalCair', 'catatan'];
var JUDUL_SETORAN = ['ID Setoran', 'ID Nasabah', 'Tanggal Setor', 'Jenis Sampah', 'Berat (kg)',
                     'Jumlah Kantong', 'Harga per kg (Rp)', 'Pendapatan (Rp)', 'Status Pencairan',
                     'Tanggal Dicairkan', 'Catatan'];

var KOLOM_PENGAJUAN = ['id', 'idWarga', 'nama', 'tanggal', 'jumlah', 'status', 'tanggalProses', 'catatan'];
var JUDUL_PENGAJUAN = ['ID Pengajuan', 'ID Nasabah', 'Nama Warga', 'Tanggal Pengajuan',
                       'Jumlah Diajukan (Rp)', 'Status', 'Tanggal Diproses', 'Catatan'];

var KOLOM_SETORAN_WARGA = ['id', 'tanggal', 'idWarga', 'nama', 'nik', 'alamat', 'rt', 'rw', 'noHp',
                           'terdaftar', 'jenis', 'jenisLain', 'berat', 'kantong', 'catatan', 'foto',
                           'status', 'tanggalProses', 'catatanPetugas', 'idSetoran'];
var JUDUL_SETORAN_WARGA = ['ID Catatan', 'Tanggal Isi', 'ID Nasabah', 'Nama Lengkap', 'NIK', 'Alamat',
                           'RT', 'RW', 'No. HP/WA', 'Sudah Terdaftar', 'Jenis Sampah',
                           'Keterangan Lain-lain', 'Perkiraan Berat (kg)', 'Jumlah Kantong',
                           'Catatan Warga', 'Foto Bukti', 'Status', 'Tanggal Diproses',
                           'Catatan Petugas', 'ID Setoran Hasil'];

/* Aksi yang BOLEH dipanggil warga tanpa token (hanya butuh ID nasabah) */
var AKSI_PUBLIK = ['cek', 'ajukan', 'daftarMandiri', 'setorWarga', 'cekSetorWarga'];

/* ==========================================================================
 *  PINTU MASUK
 *  ------------------------------------------------------------------------
 *  - GET (JSONP) dipakai untuk hampir semua permintaan, supaya balasan
 *    server benar-benar bisa dibaca browser.
 *  - POST dipakai untuk data BESAR yang tidak muat di alamat URL, yaitu
 *    setoran warga yang membawa FOTO BUKTI.
 * ======================================================================== */
function doGet(e) {
  var p = normalkanParam((e && e.parameter) ? e.parameter : {});
  return balas(tangani(p), p.callback);
}

function doPost(e) {
  var p = normalkanParam((e && e.parameter) ? e.parameter : {});
  return balas(tangani(p), p.callback);
}

/**
 * Mengembalikan nama isian yang sengaja disamarkan browser.
 *
 * KENAPA PERLU?
 *   Gerbang depan Google memakai sendiri nama isian "rt". Permintaan dari
 *   browser yang ikut membawa "rt" DITOLAK dengan galat 400 sebelum
 *   balasannya sampai — walaupun skrip ini sebenarnya tetap berjalan dan
 *   datanya TETAP tersimpan. Di layar warga hal itu terlihat seperti
 *   "server belum menjawab", lalu warga menekan kirim lagi dan datanya dobel.
 *
 *   Karena itu js/bank-sampah-storage.js mengirim RT dengan nama "rtWarga",
 *   dan di sinilah namanya dikembalikan menjadi "rt". Nama kolom di sheet
 *   tetap "RT" seperti biasa — tidak ada yang berubah bagi petugas.
 */
function normalkanParam(p) {
  var hasil = {};
  Object.keys(p).forEach(function (k) { hasil[k] = p[k]; });
  if (hasil.rt === undefined && hasil.rtWarga !== undefined) hasil.rt = hasil.rtWarga;
  return hasil;
}

function tangani(p) {
  var aksi = p.action || '';
  if (!aksi) return { ok: true, pesan: 'Backend Bank Sampah Kampung Baru aktif.' };

  // Aksi milik petugas wajib menyertakan token rahasia
  if (AKSI_PUBLIK.indexOf(aksi) < 0 && p.token !== TOKEN_RAHASIA) {
    return { ok: false, pesan: 'Token tidak sah. Periksa js/config.js dan deploy ulang Apps Script.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (aksi) {
      case 'list':            return aksiList();
      case 'cek':             return aksiCek(p);
      case 'ajukan':          return aksiAjukan(p);

      case 'daftarMandiri':      return aksiDaftarMandiri(p);
      case 'setorWarga':         return aksiSetorWarga(p);
      case 'cekSetorWarga':      return aksiCekSetorWarga(p);
      case 'prosesSetoranWarga': return aksiProsesSetoranWarga(p);
      case 'hapusSetoranWarga':  return aksiHapusBaris(sheetSetoranWarga(), p.id, 'Catatan setoran warga');

      case 'simpanNasabah':   return aksiSimpanNasabah(p);
      case 'editNasabah':     return aksiEditNasabah(p);
      case 'hapusNasabah':    return aksiHapusNasabah(p);

      case 'simpanSetoran':   return aksiSimpanSetoran(p);
      case 'editSetoran':     return aksiEditBaris(sheetSetoran(), KOLOM_SETORAN, p);
      case 'hapusSetoran':    return aksiHapusBaris(sheetSetoran(), p.id, 'Setoran');
      case 'tandaiCair':      return aksiTandaiCair(p, true);
      case 'batalCair':       return aksiTandaiCair(p, false);

      case 'prosesPengajuan': return aksiProsesPengajuan(p);
      case 'hapusPengajuan':  return aksiHapusBaris(sheetPengajuan(), p.id, 'Pengajuan');

      default: return { ok: false, pesan: 'Aksi "' + aksi + '" tidak dikenal.' };
    }
  } catch (err) {
    return { ok: false, pesan: String(err) };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ==========================================================================
 *  AKSI — MEMBACA
 * ======================================================================== */
function aksiList() {
  return {
    ok: true,
    nasabah: bacaSemua(sheetNasabah(), KOLOM_NASABAH),
    setoran: bacaSemua(sheetSetoran(), KOLOM_SETORAN),
    pengajuan: bacaSemua(sheetPengajuan(), KOLOM_PENGAJUAN),
    setoranWarga: bacaSemua(sheetSetoranWarga(), KOLOM_SETORAN_WARGA),
  };
}

/* Warga mencari datanya sendiri memakai ID nasabah (atau NIK). */
function aksiCek(p) {
  var kunci = normalId(p.id);
  if (!kunci) return { ok: false, pesan: 'ID nasabah belum diisi.' };

  var semua = bacaSemua(sheetNasabah(), KOLOM_NASABAH);
  var nasabah = null;
  for (var i = 0; i < semua.length; i++) {
    if (normalId(semua[i].id) === kunci || normalId(semua[i].nik) === kunci) {
      nasabah = semua[i];
      break;
    }
  }
  if (!nasabah) return { ok: false, pesan: 'ID nasabah tidak ditemukan.' };

  var idAsli = normalId(nasabah.id);
  return {
    ok: true,
    nasabah: nasabah,
    setoran: bacaSemua(sheetSetoran(), KOLOM_SETORAN).filter(function (s) {
      return normalId(s.idWarga) === idAsli;
    }),
    pengajuan: bacaSemua(sheetPengajuan(), KOLOM_PENGAJUAN).filter(function (x) {
      return normalId(x.idWarga) === idAsli;
    }),
  };
}

/* ==========================================================================
 *  AKSI — NASABAH
 * ======================================================================== */
function aksiSimpanNasabah(p) {
  var sheet = sheetNasabah();
  var semua = bacaSemua(sheet, KOLOM_NASABAH);

  var id = normalId(p.id) || idNasabahBaru(semua);
  for (var i = 0; i < semua.length; i++) {
    if (normalId(semua[i].id) === id) {
      return { ok: false, pesan: 'ID nasabah ' + id + ' sudah dipakai warga lain.' };
    }
  }

  var data = {};
  KOLOM_NASABAH.forEach(function (k) { data[k] = (p[k] === undefined || p[k] === null) ? '' : p[k]; });
  data.id = id;
  if (!data.tanggalDaftar) data.tanggalDaftar = tanggalHariIni();
  if (!data.status) data.status = 'Aktif';

  sheet.appendRow(KOLOM_NASABAH.map(function (k) { return data[k]; }));
  return { ok: true, pesan: 'Nasabah tersimpan.', id: id };
}

function aksiEditNasabah(p) {
  var sheet = sheetNasabah();
  var baris = cariBaris(sheet, normalId(p.id));
  if (baris < 0) return { ok: false, pesan: 'Nasabah tidak ditemukan.' };

  var lama = bacaBaris(sheet, baris, KOLOM_NASABAH);
  var baru = KOLOM_NASABAH.map(function (k) {
    if (k === 'id') return lama.id; // ID nasabah tidak boleh berubah
    return (p[k] === undefined || p[k] === null) ? lama[k] : p[k];
  });
  sheet.getRange(baris, 1, 1, KOLOM_NASABAH.length).setValues([baru]);
  return { ok: true, pesan: 'Data nasabah diperbarui.' };
}

/* Menghapus nasabah beserta seluruh setoran & pengajuannya. */
function aksiHapusNasabah(p) {
  var id = normalId(p.id);
  var sheet = sheetNasabah();
  var baris = cariBaris(sheet, id);
  if (baris < 0) return { ok: false, pesan: 'Nasabah tidak ditemukan.' };

  sheet.deleteRow(baris);
  hapusBarisMilikWarga(sheetSetoran(), KOLOM_SETORAN, id);
  hapusBarisMilikWarga(sheetPengajuan(), KOLOM_PENGAJUAN, id);
  return { ok: true, pesan: 'Nasabah dan seluruh riwayatnya dihapus.' };
}

/* ==========================================================================
 *  AKSI — SETORAN
 * ======================================================================== */
function aksiSimpanSetoran(p) {
  var idWarga = normalId(p.idWarga);
  if (cariBaris(sheetNasabah(), idWarga) < 0) {
    return { ok: false, pesan: 'ID nasabah ' + idWarga + ' belum terdaftar.' };
  }

  var data = {};
  KOLOM_SETORAN.forEach(function (k) { data[k] = (p[k] === undefined || p[k] === null) ? '' : p[k]; });
  data.id = data.id || idAcak('ST');
  data.idWarga = idWarga;
  if (!data.tanggal) data.tanggal = tanggalHariIni();
  if (!data.status) data.status = STATUS_BELUM;

  sheetSetoran().appendRow(KOLOM_SETORAN.map(function (k) { return data[k]; }));
  return { ok: true, pesan: 'Setoran tersimpan.', id: data.id };
}

/* Menandai setoran sudah/belum dicairkan.
 *   p.id      → satu setoran saja
 *   p.idWarga → seluruh setoran milik warga tersebut */
function aksiTandaiCair(p, jadikanSudah) {
  var sheet = sheetSetoran();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, pesan: 'Belum ada setoran.' };

  var nilai = sheet.getRange(2, 1, lastRow - 1, KOLOM_SETORAN.length).getValues();
  var kolStatus = KOLOM_SETORAN.indexOf('status');
  var kolCair = KOLOM_SETORAN.indexOf('tanggalCair');
  var kolId = KOLOM_SETORAN.indexOf('id');
  var kolWarga = KOLOM_SETORAN.indexOf('idWarga');

  var idSetoran = String(p.id || '').trim();
  var idWarga = normalId(p.idWarga);
  var statusBaru = jadikanSudah ? STATUS_SUDAH : STATUS_BELUM;
  var tanggal = jadikanSudah ? tanggalHariIni() : '';
  var jumlah = 0;

  for (var i = 0; i < nilai.length; i++) {
    var cocok = idSetoran
      ? String(nilai[i][kolId]).trim() === idSetoran
      : (idWarga && normalId(nilai[i][kolWarga]) === idWarga);
    if (!cocok) continue;
    if (String(nilai[i][kolStatus]) === statusBaru) continue;

    sheet.getRange(i + 2, kolStatus + 1).setValue(statusBaru);
    sheet.getRange(i + 2, kolCair + 1).setValue(tanggal);
    jumlah++;
  }

  if (!jumlah) return { ok: true, pesan: 'Tidak ada setoran yang perlu diubah.' };
  return {
    ok: true,
    pesan: jumlah + ' setoran ditandai "' + statusBaru.toLowerCase() + '".',
  };
}

/* ==========================================================================
 *  AKSI — PENGAJUAN PENCAIRAN
 * ======================================================================== */
/* Dipanggil warga dari halaman "Cek Bank Sampah" (tanpa token).
 * Jumlah yang dicatat dihitung ULANG di sini dari isi Sheet — nilai yang
 * dikirim browser tidak dipercaya begitu saja. */
function aksiAjukan(p) {
  var id = normalId(p.id);
  if (!id) return { ok: false, pesan: 'ID nasabah belum diisi.' };

  var barisNasabah = cariBaris(sheetNasabah(), id);
  if (barisNasabah < 0) return { ok: false, pesan: 'ID nasabah tidak ditemukan.' };
  var nasabah = bacaBaris(sheetNasabah(), barisNasabah, KOLOM_NASABAH);

  var pengajuan = bacaSemua(sheetPengajuan(), KOLOM_PENGAJUAN);
  for (var i = 0; i < pengajuan.length; i++) {
    if (normalId(pengajuan[i].idWarga) === id && String(pengajuan[i].status) === STATUS_DIAJUKAN) {
      return { ok: false, pesan: 'Masih ada pengajuan yang belum diproses petugas. Mohon ditunggu.' };
    }
  }

  var belum = 0;
  bacaSemua(sheetSetoran(), KOLOM_SETORAN).forEach(function (s) {
    if (normalId(s.idWarga) === id && String(s.status) !== STATUS_SUDAH) {
      belum += keAngka(s.pendapatan);
    }
  });

  if (belum < MIN_PENCAIRAN) {
    return {
      ok: false,
      pesan: 'Pendapatan yang bisa dicairkan baru Rp ' + Math.round(belum).toLocaleString('id-ID') +
        '. Minimal Rp ' + MIN_PENCAIRAN.toLocaleString('id-ID') + '.',
    };
  }

  sheetPengajuan().appendRow([
    idAcak('PC'), id, nasabah.nama, waktuSekarang(),
    Math.round(belum), STATUS_DIAJUKAN, '', '',
  ]);
  return { ok: true, pesan: 'Pengajuan pencairan terkirim ke petugas bank sampah.' };
}

/* Petugas menyetujui / menolak pengajuan warga. */
function aksiProsesPengajuan(p) {
  var sheet = sheetPengajuan();
  var baris = cariBaris(sheet, String(p.id || '').trim());
  if (baris < 0) return { ok: false, pesan: 'Pengajuan tidak ditemukan.' };

  var data = bacaBaris(sheet, baris, KOLOM_PENGAJUAN);
  var status = String(p.status || '').trim() || STATUS_DISETUJUI;

  sheet.getRange(baris, KOLOM_PENGAJUAN.indexOf('status') + 1).setValue(status);
  sheet.getRange(baris, KOLOM_PENGAJUAN.indexOf('tanggalProses') + 1).setValue(tanggalHariIni());
  if (p.catatan) sheet.getRange(baris, KOLOM_PENGAJUAN.indexOf('catatan') + 1).setValue(p.catatan);

  if (status === STATUS_DISETUJUI) {
    aksiTandaiCair({ idWarga: data.idWarga }, true);
    return { ok: true, pesan: 'Pengajuan disetujui & pendapatan ditandai sudah dicairkan.' };
  }
  return { ok: true, pesan: 'Pengajuan ditandai "' + status.toLowerCase() + '".' };
}

/* ==========================================================================
 *  AKSI — PENDAFTARAN MANDIRI OLEH WARGA  (tanpa token)
 * ======================================================================== */
/* Warga yang belum jadi nasabah mendaftarkan dirinya sendiri dari halaman
 * bank-sampah.html. NOMOR ID DIBUAT DI SINI (bukan di browser) supaya dua
 * warga yang mendaftar bersamaan tidak mendapat nomor yang sama.
 * Bila NIK — atau kombinasi No. HP + nama — sudah pernah terdaftar, ID lama
 * itulah yang dikembalikan, jadi warga tidak berakhir punya dua ID. */
function aksiDaftarMandiri(p) {
  var nama = String(p.nama || '').trim();
  if (!nama) return { ok: false, pesan: 'Nama lengkap belum diisi.' };

  var sheet = sheetNasabah();
  var semua = bacaSemua(sheet, KOLOM_NASABAH);

  var lama = cariNasabahLama(semua, p);
  if (lama) return { ok: true, pesan: 'Data lama dipakai kembali.', id: lama.id, lama: true };

  var id = idNasabahBaru(semua);
  var data = {};
  KOLOM_NASABAH.forEach(function (k) { data[k] = (p[k] === undefined || p[k] === null) ? '' : p[k]; });
  data.id = id;
  data.nama = nama;
  data.tanggalDaftar = data.tanggalDaftar || tanggalHariIni();
  data.status = data.status || 'Aktif';
  data.catatan = data.catatan || 'Mendaftar sendiri lewat halaman Bank Sampah';

  sheet.appendRow(KOLOM_NASABAH.map(function (k) { return data[k]; }));
  return { ok: true, pesan: 'Nasabah baru terdaftar.', id: id };
}

/* Mencocokkan warga dengan data yang sudah ada: NIK dulu, lalu No. HP + nama. */
function cariNasabahLama(semua, p) {
  var nik = normalId(p.nik);
  var i;
  if (nik) {
    for (i = 0; i < semua.length; i++) {
      if (normalId(semua[i].nik) === nik) return semua[i];
    }
  }
  var hp = nomorKunci(p.noHp);
  var nama = String(p.nama || '').trim().toLowerCase();
  if (!hp || !nama) return null;
  for (i = 0; i < semua.length; i++) {
    if (nomorKunci(semua[i].noHp) === hp &&
        String(semua[i].nama || '').trim().toLowerCase() === nama) return semua[i];
  }
  return null;
}

/**
 * Menyeragamkan No. HP sebelum dibandingkan.
 *
 * Google Sheets menyimpan "08979802427" sebagai ANGKA, sehingga angka 0 di
 * depannya hilang dan yang terbaca tinggal 8979802427. Kalau dibandingkan
 * apa adanya dengan yang diketik warga, keduanya dianggap berbeda — warga
 * yang sama jadi didaftarkan berulang kali. Di sini semuanya disamakan:
 * awalan +62 / 62 diubah ke bentuk lokal, lalu angka 0 di depan dibuang.
 */
function nomorKunci(v) {
  var d = angkaSaja(v);
  if (!d) return '';
  if (d.indexOf('620') === 0) d = d.slice(2);                        // 62 + 08xx…
  if (d.indexOf('62') === 0 && d.charAt(2) === '8') d = d.slice(2);  // 62 + 8xx…
  return d.replace(/^0+/, '');
}

/* ==========================================================================
 *  AKSI — SETORAN YANG DICATAT SENDIRI OLEH WARGA (+ foto bukti)
 * ======================================================================== */
/* Dipanggil warga (tanpa token) lewat POST, karena membawa foto.
 * Catatan ini BELUM masuk ke tabungan — statusnya "Menunggu" sampai
 * petugas menyetujuinya di dashboard. */
function aksiSetorWarga(p) {
  var nama = String(p.nama || '').trim();
  var jenis = String(p.jenis || '').trim();
  if (!nama)  return { ok: false, pesan: 'Nama lengkap belum diisi.' };
  if (!jenis) return { ok: false, pesan: 'Jenis sampah belum dipilih.' };

  var idWarga = normalId(p.idWarga);
  if (idWarga && cariBaris(sheetNasabah(), idWarga) < 0) {
    return { ok: false, pesan: 'ID nasabah ' + idWarga + ' tidak ditemukan.' };
  }

  var sheet = sheetSetoranWarga();
  var id = String(p.id || '').trim() || idAcak('SW');

  // Kiriman ulang (mis. jaringan warga putus lalu dikirim lagi) tidak digandakan.
  if (cariBaris(sheet, id) >= 0) {
    return { ok: true, pesan: 'Setoran sudah tercatat sebelumnya.', id: id };
  }

  var data = {};
  KOLOM_SETORAN_WARGA.forEach(function (k) {
    data[k] = (p[k] === undefined || p[k] === null) ? '' : p[k];
  });
  data.id = id;
  data.idWarga = idWarga;
  data.nama = nama;
  data.jenis = jenis;
  data.tanggal = data.tanggal || waktuSekarang();
  data.terdaftar = idWarga ? 'Ya' : 'Tidak';
  data.status = STATUS_MENUNGGU;
  data.tanggalProses = '';
  data.catatanPetugas = '';
  data.idSetoran = '';
  data.foto = simpanFotoDrive(p.foto, p.fotoTipe, id, nama);

  sheet.appendRow(KOLOM_SETORAN_WARGA.map(function (k) { return data[k]; }));
  return { ok: true, pesan: 'Setoran tercatat & menunggu persetujuan petugas.', id: id };
}

/* Dipakai halaman warga untuk memastikan catatannya benar-benar masuk,
 * saat balasan POST-nya tidak sampai ke perangkat warga. */
function aksiCekSetorWarga(p) {
  var id = String(p.id || '').trim();
  if (!id) return { ok: false, pesan: 'ID catatan belum diisi.' };

  var sheet = sheetSetoranWarga();
  var baris = cariBaris(sheet, id);
  if (baris < 0) return { ok: true, ada: false };

  var data = bacaBaris(sheet, baris, KOLOM_SETORAN_WARGA);
  return { ok: true, ada: true, status: data.status, idWarga: data.idWarga };
}

/* Petugas menyetujui / menolak catatan setoran warga.
 * Bila DISETUJUI, catatan itu langsung menjadi setoran resmi di tabungan
 * warga — memakai berat & harga yang sudah dipastikan petugas. */
function aksiProsesSetoranWarga(p) {
  var sheet = sheetSetoranWarga();
  var baris = cariBaris(sheet, String(p.id || '').trim());
  if (baris < 0) return { ok: false, pesan: 'Catatan setoran warga tidak ditemukan.' };

  var data = bacaBaris(sheet, baris, KOLOM_SETORAN_WARGA);
  if (String(data.status || '') !== STATUS_MENUNGGU) {
    return { ok: false, pesan: 'Catatan ini sudah pernah diproses (' + data.status + ').' };
  }

  var status = String(p.status || '').trim() || STATUS_DISETUJUI;
  sheet.getRange(baris, KOLOM_SETORAN_WARGA.indexOf('status') + 1).setValue(status);
  sheet.getRange(baris, KOLOM_SETORAN_WARGA.indexOf('tanggalProses') + 1).setValue(tanggalHariIni());
  sheet.getRange(baris, KOLOM_SETORAN_WARGA.indexOf('catatanPetugas') + 1).setValue(p.catatan || '');

  if (status !== STATUS_DISETUJUI) {
    return { ok: true, pesan: 'Setoran warga ditandai "' + status.toLowerCase() + '".' };
  }

  var idWarga = normalId(data.idWarga);
  if (!idWarga || cariBaris(sheetNasabah(), idWarga) < 0) {
    return { ok: false, pesan: 'ID nasabah pada catatan ini tidak terdaftar, jadi setorannya ' +
      'belum bisa dimasukkan ke tabungan. Daftarkan dulu warganya di tab Data Warga.' };
  }

  var kantong = keAngka(p.kantong !== '' && p.kantong !== undefined ? p.kantong : data.kantong);
  var berat = keAngka(p.berat !== '' && p.berat !== undefined ? p.berat : data.berat);
  if (berat <= 0) berat = kantong * KG_PER_KANTONG;
  if (berat <= 0) {
    return { ok: false, pesan: 'Berat setoran belum terisi. Timbang dulu sampahnya, ' +
      'lalu isi beratnya saat menyetujui.' };
  }

  var harga = keAngka(p.hargaPerKg !== '' && p.hargaPerKg !== undefined ? p.hargaPerKg : 0);
  if (harga <= 0) harga = hargaJenis(data.jenis);

  var idSetoran = idAcak('ST');
  var setoran = {
    id: idSetoran,
    idWarga: idWarga,
    tanggal: String(p.tanggal || '').trim() || tanggalHariIni(),
    jenis: data.jenis,
    berat: Math.round(berat * 100) / 100,
    kantong: kantong,
    hargaPerKg: harga,
    pendapatan: Math.round(berat * harga),
    status: STATUS_BELUM,
    tanggalCair: '',
    catatan: catatanSetoranDari(data),
  };
  sheetSetoran().appendRow(KOLOM_SETORAN.map(function (k) { return setoran[k]; }));
  sheet.getRange(baris, KOLOM_SETORAN_WARGA.indexOf('idSetoran') + 1).setValue(idSetoran);

  return {
    ok: true,
    pesan: 'Setoran warga disetujui — ' + setoran.berat + ' kg masuk ke tabungannya (Rp ' +
      setoran.pendapatan.toLocaleString('id-ID') + ').',
    id: idSetoran,
  };
}

/* Menyusun catatan setoran resmi dari catatan yang ditulis warga. */
function catatanSetoranDari(data) {
  var bagian = ['Dicatat sendiri oleh warga'];
  var lain = String(data.jenisLain || '').trim();
  if (lain) bagian.push('Lain-lain: ' + lain);
  var catatan = String(data.catatan || '').trim();
  if (catatan) bagian.push(catatan);
  return bagian.join(' · ');
}

/* ==========================================================================
 *  FOTO BUKTI — disimpan di Google Drive, sheet hanya menyimpan ID berkasnya
 * ======================================================================== */

/**
 * ⚠️ JALANKAN FUNGSI INI SEKALI SEBELUM WARGA MULAI MENGIRIM FOTO. ⚠️
 *
 * KENAPA PERLU?
 *   Web App ini di-deploy dengan "Execute as: Me", jadi ia berjalan memakai
 *   akun Google ANDA. Warga membukanya tanpa login. Karena itu kotak izin
 *   Google TIDAK MUNGKIN muncul di HP warga — izinnya harus ANDA berikan
 *   sendiri dari editor Apps Script. Selama izin Drive belum diberikan,
 *   setoran warga TETAP tercatat tetapi kolom "Foto Bukti"-nya kosong.
 *
 * CARA MENJALANKAN (cukup sekali seumur proyek):
 *   1. Buka Google Sheet bank sampah ▸ menu Extensions ▸ Apps Script.
 *   2. Di bar atas editor, pada kotak pilihan di sebelah tombol ▶ Run,
 *      pilih  siapkanIzinFoto
 *   3. Klik ▶ Run.
 *   4. Muncul kotak "Authorization required" ▸ Review permissions ▸
 *      pilih akun Google Anda ▸ Advanced ▸ "Go to … (unsafe)" ▸ Allow.
 *      (Tulisan "unsafe" itu wajar — Google menandai semua skrip buatan
 *       sendiri yang belum diverifikasi, bukan berarti berbahaya.)
 *   5. Lihat panel "Execution log" di bawah editor. Kalau berhasil, akan
 *      muncul tautan folder "Foto Setoran Bank Sampah" di Drive Anda.
 *
 * Sesudah itu, foto dari warga akan tersimpan otomatis tanpa diminta izin lagi.
 */
function siapkanIzinFoto() {
  var folder = ambilFolderFoto();

  // Membuat lalu membuang berkas percobaan — sekaligus membuktikan bahwa
  // izin "buat berkas" dan "bagikan tautan" benar-benar sudah aktif.
  var uji = folder.createFile(
    Utilities.newBlob('Berkas percobaan izin bank sampah.', 'text/plain', 'uji-izin.txt'));

  var pesanBerbagi;
  try {
    uji.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    pesanBerbagi = '✅ Berbagi lewat tautan AKTIF — foto bisa tampil di dashboard petugas.';
  } catch (izin) {
    pesanBerbagi = '⚠️ Akun ini TIDAK BOLEH berbagi berkas ke publik (biasanya akun ' +
      'sekolah/kantor). Fotonya tetap tersimpan, tetapi pratinjaunya di dashboard ' +
      'mungkin kosong — petugas masih bisa membukanya sambil masuk memakai akun ini.';
  }
  uji.setTrashed(true);

  var laporan = [
    '✅ Izin Google Drive sudah aktif untuk skrip bank sampah.',
    pesanBerbagi,
    '📁 Folder foto: ' + folder.getUrl(),
    'Silakan coba kirim satu setoran dari halaman warga, lalu periksa kolom ' +
      '"Foto Bukti" di tab SetoranWarga — sekarang harus terisi.',
  ].join('\n');

  Logger.log(laporan);
  return laporan;
}

/**
 * Menyimpan foto kiriman warga ke Google Drive.
 * Isi foto dikirim browser dalam bentuk base64 "web-safe" (memakai - dan _
 * sebagai ganti + dan /), supaya tidak rusak saat melewati POST formulir.
 * @returns {string} ID berkas Drive-nya, atau '' bila tidak ada foto.
 */
function simpanFotoDrive(isiBase64, tipe, idCatatan, namaWarga) {
  var isi = String(isiBase64 || '').trim();
  if (!isi) return '';

  // Buang awalan "data:image/jpeg;base64," bila browser sempat menyertakannya.
  var pisah = isi.indexOf('base64,');
  if (pisah >= 0) {
    var kepala = isi.substring(0, pisah);
    var cocok = kepala.match(/data:([^;]+)/);
    if (cocok && !tipe) tipe = cocok[1];
    isi = isi.substring(pisah + 7);
  }
  isi = isi.replace(/\s/g, '');
  if (!isi) return '';

  try {
    var jenisBerkas = String(tipe || 'image/jpeg');
    var akhiran = jenisBerkas.indexOf('png') >= 0 ? '.png'
      : (jenisBerkas.indexOf('webp') >= 0 ? '.webp' : '.jpg');
    var namaBerkas = 'setoran-' + String(idCatatan || 'tanpa-id') + '-' +
      String(namaWarga || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') + akhiran;

    var blob = Utilities.newBlob(Utilities.base64DecodeWebSafe(isi), jenisBerkas, namaBerkas);
    var berkas = ambilFolderFoto().createFile(blob);
    try {
      berkas.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (izin) {
      // Sebagian akun sekolah/kantor melarang berbagi ke publik. Fotonya tetap
      // tersimpan — petugas bisa membukanya selama masuk dengan akun pemilik.
      console.warn('Foto tersimpan tetapi tidak bisa dibagikan lewat tautan: ' + izin);
    }
    return berkas.getId();
  } catch (err) {
    /* Foto gagal disimpan TIDAK BOLEH membatalkan setoran warga — lebih baik
     * catatannya masuk tanpa foto daripada hilang sama sekali.
     *
     * Penyebab tersering: izin Google Drive belum diberikan. Perbaikannya:
     * jalankan fungsi siapkanIzinFoto() sekali dari editor Apps Script.
     * Pesan di bawah bisa dibaca di menu "Executions" (⏱️) Apps Script. */
    console.error('GAGAL menyimpan foto setoran ke Drive: ' + err +
      ' — jalankan fungsi siapkanIzinFoto() sekali dari editor Apps Script ' +
      'untuk memberi izin Drive, lalu coba lagi.');
    return '';
  }
}

function ambilFolderFoto() {
  var daftar = DriveApp.getFoldersByName(FOLDER_FOTO);
  return daftar.hasNext() ? daftar.next() : DriveApp.createFolder(FOLDER_FOTO);
}

/* ==========================================================================
 *  AKSI UMUM — edit / hapus satu baris berdasarkan kolom "id"
 * ======================================================================== */
function aksiEditBaris(sheet, kolom, p) {
  var baris = cariBaris(sheet, String(p.id || '').trim());
  if (baris < 0) return { ok: false, pesan: 'Data tidak ditemukan.' };

  var lama = bacaBaris(sheet, baris, kolom);
  var baru = kolom.map(function (k) {
    if (k === 'id') return lama.id;
    return (p[k] === undefined || p[k] === null) ? lama[k] : p[k];
  });
  sheet.getRange(baris, 1, 1, kolom.length).setValues([baru]);
  return { ok: true, pesan: 'Data diperbarui.' };
}

function aksiHapusBaris(sheet, id, label) {
  var baris = cariBaris(sheet, String(id || '').trim());
  if (baris < 0) return { ok: false, pesan: label + ' tidak ditemukan.' };
  sheet.deleteRow(baris);
  return { ok: true, pesan: label + ' dihapus.' };
}

/* ==========================================================================
 *  BANTU — SHEET
 * ======================================================================== */
function sheetNasabah()      { return ambilSheet(SHEET_NASABAH, JUDUL_NASABAH); }
function sheetSetoran()      { return ambilSheet(SHEET_SETORAN, JUDUL_SETORAN); }
function sheetPengajuan()    { return ambilSheet(SHEET_PENGAJUAN, JUDUL_PENGAJUAN); }
function sheetSetoranWarga() { return ambilSheet(SHEET_SETORAN_WARGA, JUDUL_SETORAN_WARGA); }

function ambilSheet(nama, judul) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nama);
  if (!sheet) sheet = ss.insertSheet(nama);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(judul);
    sheet.getRange(1, 1, 1, judul.length)
      .setFontWeight('bold').setBackground('#0e5e33').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function bacaSemua(sheet, kolom) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var nilai = sheet.getRange(2, 1, lastRow - 1, kolom.length).getValues();
  return nilai.map(function (row) { return keObjek(row, kolom); });
}

function bacaBaris(sheet, baris, kolom) {
  var nilai = sheet.getRange(baris, 1, 1, kolom.length).getValues()[0];
  return keObjek(nilai, kolom);
}

function keObjek(row, kolom) {
  var tz = Session.getScriptTimeZone();
  var obj = {};
  for (var i = 0; i < kolom.length; i++) {
    var v = row[i];
    if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    obj[kolom[i]] = v;
  }
  return obj;
}

/* Mencari nomor baris nyata di Sheet berdasarkan isi kolom pertama (id).
 * Mengembalikan -1 bila tidak ketemu. */
function cariBaris(sheet, id) {
  if (!id) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var nilai = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var cari = String(id).trim().toUpperCase();
  for (var i = 0; i < nilai.length; i++) {
    if (String(nilai[i][0]).trim().toUpperCase() === cari) return i + 2;
  }
  return -1;
}

/* Menghapus seluruh baris milik satu warga (dari bawah ke atas agar
 * nomor baris tidak bergeser saat dihapus). */
function hapusBarisMilikWarga(sheet, kolom, idWarga) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var kol = kolom.indexOf('idWarga');
  var nilai = sheet.getRange(2, 1, lastRow - 1, kolom.length).getValues();
  for (var i = nilai.length - 1; i >= 0; i--) {
    if (normalId(nilai[i][kol]) === idWarga) sheet.deleteRow(i + 2);
  }
}

/* ==========================================================================
 *  BANTU — UMUM
 * ======================================================================== */
function normalId(id) {
  return String(id === null || id === undefined ? '' : id).trim().toUpperCase().replace(/\s+/g, '');
}

function keAngka(v) {
  var n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function angkaSaja(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[^0-9]/g, '');
}

/* Harga beli per kg untuk satu jenis sampah (lihat HARGA_JENIS di atas). */
function hargaJenis(nama) {
  var kunci = String(nama === null || nama === undefined ? '' : nama).trim().toLowerCase();
  if (HARGA_JENIS.hasOwnProperty(kunci)) return HARGA_JENIS[kunci];
  if (kunci.indexOf('basah') >= 0 || kunci.indexOf('organik') >= 0) return HARGA_JENIS['basah'];
  return HARGA_JENIS['lain-lain'];
}

function idNasabahBaru(semua) {
  var tertinggi = 0;
  semua.forEach(function (n) {
    var cocok = normalId(n.id).match(/(\d+)$/);
    if (cocok) tertinggi = Math.max(tertinggi, parseInt(cocok[1], 10));
  });
  var nomor = String(tertinggi + 1);
  while (nomor.length < 4) nomor = '0' + nomor;
  return 'BS-' + nomor;
}

function idAcak(awalan) {
  var acak = String(Math.floor(Math.random() * 1000));
  while (acak.length < 3) acak = '0' + acak;
  return awalan + '-' + Date.now().toString(36).toUpperCase() + '-' + acak;
}

function tanggalHariIni() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function waktuSekarang() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function balas(obj, callback) {
  var teks = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + teks + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(teks).setMimeType(ContentService.MimeType.JSON);
}
