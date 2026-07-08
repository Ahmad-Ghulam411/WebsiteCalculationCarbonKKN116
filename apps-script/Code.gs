/**
 * ============================================================================
 *  BACKEND GOOGLE APPS SCRIPT
 *  Kalkulator Jejak Karbon Harian — Kampung Baru, Kota Parepare
 * ----------------------------------------------------------------------------
 *  Fungsi:
 *   - doPost() : menerima data warga dari website lalu menambahkannya sebagai
 *                1 baris di Google Sheet.
 *   - doGet()  : mengembalikan seluruh data (format JSONP) untuk dashboard admin.
 *
 *  CARA PASANG (ringkas — lihat README.md untuk lengkapnya):
 *   1. Buka Google Sheet baru (sheet.new).
 *   2. Menu  Extensions ▸ Apps Script.
 *   3. Hapus kode contoh, tempel SELURUH isi berkas ini.
 *   4. Ganti TOKEN_RAHASIA di bawah agar SAMA dengan token di js/config.js.
 *   5. Deploy ▸ New deployment ▸ pilih "Web app".
 *        - Execute as        : Me
 *        - Who has access    : Anyone
 *   6. Salin URL "Web app" (…/exec) → tempel ke APPS_SCRIPT_URL di js/config.js.
 * ============================================================================
 */

// ⚠️  GANTI token ini. HARUS SAMA dengan KONFIGURASI.ADMIN.token di js/config.js
var TOKEN_RAHASIA = 'rahasia-kkn-116-kampungbaru';

// Nama tab/sheet tempat data disimpan
var NAMA_SHEET = 'Data Jejak Karbon Kampung Baru';

// Urutan kolom — HARUS sama dengan SKEMA_KOLOM di js/storage.js
var KOLOM = [
  'waktu', 'nama', 'alamat', 'anggotaKeluarga', 'noHp',
  'modeListrik', 'nilaiListrik', 'kwhBulan',
  'jenisTabung', 'jumlahTabung', 'bensinMinggu',
  'memilah', 'mengompos', 'membakar', 'kantongMinggu',
  'acJam', 'transUmumMinggu', 'barangBaruBulan', 'dagingMinggu',
  'emisiListrik', 'emisiGas', 'emisiKendaraan', 'emisiSampah', 'emisiLain',
  'total', 'kategori'
];

// Judul kolom yang ramah dibaca (baris header di Sheet)
var JUDUL = [
  'Waktu Isi', 'Nama', 'Alamat / RT-RW', 'Jumlah Anggota Keluarga', 'No. HP',
  'Mode Listrik', 'Input Listrik (kWh / Rp)', 'Perkiraan kWh/bulan',
  'Jenis Tabung (kg)', 'Jumlah Tabung/bulan', 'Bensin (L/minggu)',
  'Memilah Sampah', 'Mengompos', 'Membakar Sampah', 'Kantong Sampah/minggu',
  'AC (jam/hari)', 'Transportasi Umum/minggu', 'Barang Baru/bulan', 'Porsi Daging/minggu',
  'Emisi Listrik', 'Emisi Gas', 'Emisi Kendaraan', 'Emisi Sampah', 'Emisi Lain',
  'TOTAL (kg CO2e/hari)', 'Kategori'
];

/* ---------------- Menyimpan / mengubah / menghapus data (POST) ----------- *
 *  action = 'simpan' (bawaan) : menambah 1 baris data baru.
 *  action = 'edit'            : mengganti isi 1 baris (butuh param "baris").
 *  action = 'hapus'           : menghapus 1 baris (butuh param "baris").
 *
 *  "baris" = indeks data (mulai 0) sesuai urutan yang dikirim doGet(list).
 *  Baris nyata di Sheet = baris + 2  (1 untuk header, 1 karena Sheet 1-based).
 * ------------------------------------------------------------------------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var p = (e && e.parameter) ? e.parameter : {};

    if (p.token !== TOKEN_RAHASIA) {
      return keluarJson({ ok: false, pesan: 'Token tidak sah.' });
    }

    var aksi = p.action || 'simpan';
    var sheet = ambilSheet();

    if (aksi === 'hapus') {
      var barisHapus = barisNyata(p, sheet);
      if (barisHapus < 0) return keluarJson({ ok: false, pesan: 'Baris tidak ditemukan.' });
      sheet.deleteRow(barisHapus);
      return keluarJson({ ok: true, pesan: 'Data terhapus.' });
    }

    if (aksi === 'edit') {
      var barisEdit = barisNyata(p, sheet);
      if (barisEdit < 0) return keluarJson({ ok: false, pesan: 'Baris tidak ditemukan.' });
      var barisBaru = KOLOM.map(function (k) {
        return (p[k] !== undefined && p[k] !== null) ? p[k] : '';
      });
      sheet.getRange(barisEdit, 1, 1, KOLOM.length).setValues([barisBaru]);
      return keluarJson({ ok: true, pesan: 'Data diperbarui.' });
    }

    // Bawaan: simpan data baru
    var baris = KOLOM.map(function (k) {
      return (p[k] !== undefined && p[k] !== null) ? p[k] : '';
    });
    sheet.appendRow(baris);

    return keluarJson({ ok: true, pesan: 'Data tersimpan.' });
  } catch (err) {
    return keluarJson({ ok: false, pesan: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* Menerjemahkan param "baris" (indeks data 0-based) menjadi nomor baris nyata
 * di Sheet. Mengembalikan -1 bila tidak sah / di luar jangkauan. */
function barisNyata(p, sheet) {
  var idx = parseInt(p.baris, 10);
  if (isNaN(idx) || idx < 0) return -1;
  var target = idx + 2; // +1 header, +1 karena Sheet 1-based
  if (target > sheet.getLastRow()) return -1;
  return target;
}

/* ------------------- Membaca data untuk admin (GET/JSONP) ---------------- */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var cb = p.callback;

  if (p.action === 'list') {
    if (p.token !== TOKEN_RAHASIA) {
      return balas({ ok: false, pesan: 'Token tidak sah.' }, cb);
    }
    return balas({ ok: true, data: ambilSemua() }, cb);
  }

  return balas({ ok: true, pesan: 'Backend Kalkulator Jejak Karbon aktif.' }, cb);
}

/* ------------------------------ Bantu ------------------------------------ */
function ambilSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(NAMA_SHEET);
  if (!sheet) sheet = ss.insertSheet(NAMA_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(JUDUL);
    sheet.getRange(1, 1, 1, JUDUL.length).setFontWeight('bold').setBackground('#0e5e33').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ambilSemua() {
  var sheet = ambilSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var nilai = sheet.getRange(2, 1, lastRow - 1, KOLOM.length).getValues();
  var tz = Session.getScriptTimeZone();
  return nilai.map(function (row) {
    var obj = {};
    for (var i = 0; i < KOLOM.length; i++) {
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd HH:mm:ss');
      obj[KOLOM[i]] = v;
    }
    return obj;
  });
}

function balas(obj, callback) {
  var teks = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + teks + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(teks).setMimeType(ContentService.MimeType.JSON);
}

function keluarJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
