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
 *  Menyimpan 3 tabel (tab/sheet):
 *    1. "Nasabah"   — data warga penabung sampah
 *    2. "Setoran"   — setiap kali warga menyetor sampah
 *    3. "Pengajuan" — permintaan warga untuk mencairkan pendapatan
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
 *
 *  Setiap kali berkas ini diubah, WAJIB deploy versi baru:
 *  Deploy ▸ Manage deployments ▸ (pensil) ▸ Version: New version ▸ Deploy.
 * ============================================================================
 */

// ⚠️  GANTI token ini. HARUS SAMA dengan KONFIGURASI.BANK_SAMPAH.token di js/config.js
var TOKEN_RAHASIA = 'rahasia-bank-sampah-116';

// Pendapatan minimal (Rp) yang boleh diajukan warga untuk dicairkan.
// Diisi 0 = TIDAK ADA batas minimal, jadi warga boleh mengajukan pencairan
// begitu setorannya dicatat petugas — berapa pun jumlahnya.
// Samakan dengan KONFIGURASI.BANK_SAMPAH.MIN_PENCAIRAN di js/config.js.
var MIN_PENCAIRAN = 0;

/* Nama tab/sheet */
var SHEET_NASABAH   = 'Nasabah';
var SHEET_SETORAN   = 'Setoran';
var SHEET_PENGAJUAN = 'Pengajuan';

/* Nilai status — HARUS sama persis dengan js/bank-sampah-storage.js */
var STATUS_BELUM     = 'Belum Dicairkan';
var STATUS_SUDAH     = 'Sudah Dicairkan';
var STATUS_DIAJUKAN  = 'Diajukan';
var STATUS_DISETUJUI = 'Disetujui';

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

/* Aksi yang BOLEH dipanggil warga tanpa token (hanya butuh ID nasabah) */
var AKSI_PUBLIK = ['cek', 'ajukan'];

/* ==========================================================================
 *  PINTU MASUK — semua permintaan lewat GET (JSONP) supaya balasan server
 *  benar-benar bisa dibaca browser. doPost disediakan sebagai cadangan.
 * ======================================================================== */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  return balas(tangani(p), p.callback);
}

function doPost(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  return balas(tangani(p), p.callback);
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
 * dikirim browser tidak dipercaya begitu saja.
 *
 * Aturannya sama dengan yang dipakai halaman warga:
 *   - Boleh mengajukan begitu ada setoran yang belum dicairkan (tanpa
 *     batas minimal, kecuali MIN_PENCAIRAN di atas sengaja diisi).
 *   - Hanya SATU pengajuan yang boleh menggantung. Selama pengajuan
 *     sebelumnya masih berstatus "Diajukan", pengajuan baru ditolak.
 *   - Setelah petugas menyetujui, seluruh setoran ditandai "Sudah
 *     Dicairkan" sehingga warga bisa mengajukan lagi begitu menyetor
 *     sampah berikutnya. */
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

  if (belum <= 0) {
    return {
      ok: false,
      pesan: 'Belum ada pendapatan baru yang bisa dicairkan. Setor sampah lagi, ya.',
    };
  }

  if (MIN_PENCAIRAN > 0 && belum < MIN_PENCAIRAN) {
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
function sheetNasabah()   { return ambilSheet(SHEET_NASABAH, JUDUL_NASABAH); }
function sheetSetoran()   { return ambilSheet(SHEET_SETORAN, JUDUL_SETORAN); }
function sheetPengajuan() { return ambilSheet(SHEET_PENGAJUAN, JUDUL_PENGAJUAN); }

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
