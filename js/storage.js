/* ============================================================================
 *  PENYIMPANAN DATA WARGA
 *  ----------------------------------------------------------------------------
 *  - Menyimpan ke Google Sheets lewat Google Apps Script (POST "no-cors").
 *  - Selalu menyimpan salinan cadangan di perangkat (localStorage).
 *  - Membaca kembali data untuk dashboard admin lewat JSONP (anti-CORS),
 *    dengan cadangan localStorage bila gagal.
 * ========================================================================== */

/* Urutan & judul kolom — dipakai bersama oleh dashboard admin & ekspor Excel.
 * HARUS sama urutannya dengan header di apps-script/Code.gs. */
const SKEMA_KOLOM = [
  { kunci: 'waktu',            judul: 'Waktu Isi' },
  { kunci: 'nama',             judul: 'Nama' },
  { kunci: 'alamat',           judul: 'Alamat / RT-RW' },
  { kunci: 'anggotaKeluarga',  judul: 'Jumlah Anggota Keluarga' },
  { kunci: 'noHp',             judul: 'No. HP' },
  { kunci: 'modeListrik',      judul: 'Mode Listrik' },
  { kunci: 'nilaiListrik',     judul: 'Input Listrik (kWh / Rp)' },
  { kunci: 'kwhBulan',         judul: 'Perkiraan kWh/bulan' },
  { kunci: 'jenisTabung',      judul: 'Jenis Tabung (kg)' },
  { kunci: 'jumlahTabung',     judul: 'Jumlah Tabung/bulan' },
  { kunci: 'bensinMinggu',     judul: 'Bensin (L/minggu)' },
  { kunci: 'memilah',          judul: 'Memilah Sampah' },
  { kunci: 'mengompos',        judul: 'Mengompos' },
  { kunci: 'membakar',         judul: 'Membakar Sampah' },
  { kunci: 'kantongMinggu',    judul: 'Kantong Sampah/minggu' },
  { kunci: 'acJam',            judul: 'AC (jam/hari)' },
  { kunci: 'transUmumMinggu',  judul: 'Transportasi Umum/minggu' },
  { kunci: 'barangBaruBulan',  judul: 'Barang Baru/bulan' },
  { kunci: 'dagingMinggu',     judul: 'Porsi Daging/minggu' },
  { kunci: 'emisiListrik',     judul: 'Emisi Listrik' },
  { kunci: 'emisiGas',         judul: 'Emisi Gas' },
  { kunci: 'emisiKendaraan',   judul: 'Emisi Kendaraan' },
  { kunci: 'emisiSampah',      judul: 'Emisi Sampah' },
  { kunci: 'emisiLain',        judul: 'Emisi Lain' },
  { kunci: 'total',            judul: 'TOTAL (kg CO2e/hari)' },
  { kunci: 'kategori',         judul: 'Kategori' },
];

/* ---------- Cadangan lokal (localStorage) ---------- */
function ambilDataLokal() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_SIMPANAN_LOKAL) || '[]');
  } catch (e) {
    return [];
  }
}

function simpanDataLokal(record) {
  try {
    const arr = ambilDataLokal();
    arr.push(record);
    localStorage.setItem(KUNCI_SIMPANAN_LOKAL, JSON.stringify(arr));
  } catch (e) {
    console.warn('Tidak bisa menyimpan cadangan lokal:', e);
  }
}

function perbaruiDataLokal(index, record) {
  try {
    const arr = ambilDataLokal();
    if (index >= 0 && index < arr.length) {
      arr[index] = record;
      localStorage.setItem(KUNCI_SIMPANAN_LOKAL, JSON.stringify(arr));
    }
  } catch (e) {
    console.warn('Tidak bisa memperbarui cadangan lokal:', e);
  }
}

function hapusDataLokal(index) {
  try {
    const arr = ambilDataLokal();
    if (index >= 0 && index < arr.length) {
      arr.splice(index, 1);
      localStorage.setItem(KUNCI_SIMPANAN_LOKAL, JSON.stringify(arr));
    }
  } catch (e) {
    console.warn('Tidak bisa menghapus cadangan lokal:', e);
  }
}

/* ---------- Kirim ke Google Sheets ---------- */
function kirimKeSheet(record) {
  const url = KONFIGURASI.APPS_SCRIPT_URL;
  if (!url) return Promise.resolve({ status: 'lokal' }); // belum dikonfigurasi

  const body = new URLSearchParams();
  body.append('action', 'simpan');
  body.append('token', KONFIGURASI.ADMIN.token);
  Object.keys(record).forEach(function (k) {
    body.append(k, record[k] === null || record[k] === undefined ? '' : record[k]);
  });

  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString(),
  })
    .then(function () { return { status: 'terkirim' }; })
    .catch(function (err) {
      console.warn('Gagal mengirim ke Google Sheets (tersimpan di perangkat):', err);
      return { status: 'gagal' };
    });
}

/**
 * Menyimpan satu catatan warga: cadangan lokal + kirim ke Sheets.
 * @returns {Promise<{status:string}>}
 */
function simpanData(record) {
  simpanDataLokal(record);
  return kirimKeSheet(record);
}

/* ---------- Panggilan JSONP umum ke Apps Script ----------
 * Dipakai untuk baca (list) MAUPUN ubah/hapus data. Sengaja lewat GET+JSONP
 * (bukan POST "no-cors") karena "no-cors" membuat balasan server tidak bisa
 * dibaca oleh JS — sehingga kegagalan di server (token salah, baris tak
 * ditemukan, dll.) tidak akan pernah terlihat dan dashboard akan selalu
 * menampilkan "berhasil" walau data sebenarnya tidak berubah. Dengan JSONP,
 * balasan asli { ok, pesan, ... } dari apps-script/Code.gs bisa dibaca. */
function panggilJsonp(params) {
  const url = KONFIGURASI.APPS_SCRIPT_URL;
  if (!url) return Promise.resolve(null); // belum dikonfigurasi

  return new Promise(function (resolve) {
    const cbName = 'jsonp_karbon_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    let selesai = false;

    function bersihkan() {
      selesai = true;
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    function gagal() {
      if (selesai) return;
      bersihkan();
      resolve(null);
    }

    window[cbName] = function (resp) {
      if (selesai) return;
      bersihkan();
      resolve(resp || null);
    };

    const query = new URLSearchParams(params);
    query.set('callback', cbName);
    const pemisah = url.indexOf('?') >= 0 ? '&' : '?';
    script.src = url + pemisah + query.toString();
    script.onerror = gagal;
    document.body.appendChild(script);

    // Bila server tidak menjawab dalam 12 detik → anggap gagal
    setTimeout(gagal, 12000);
  });
}

/* ---------- Ubah / hapus data di Google Sheets ---------- */
/**
 * @returns {Promise<{ok:boolean, pesan:string}>}
 */
function kirimAksiKeSheet(aksi, index, record) {
  if (!KONFIGURASI.APPS_SCRIPT_URL) return Promise.resolve({ ok: true, pesan: 'lokal' });

  const params = { action: aksi, token: KONFIGURASI.ADMIN.token, baris: index };
  if (record) {
    Object.keys(record).forEach(function (k) {
      params[k] = record[k] === null || record[k] === undefined ? '' : record[k];
    });
  }

  return panggilJsonp(params).then(function (resp) {
    if (resp && resp.ok) return { ok: true, pesan: resp.pesan || 'Berhasil.' };
    return { ok: false, pesan: (resp && resp.pesan) || 'Tidak ada balasan dari server.' };
  });
}

/**
 * Memperbarui satu baris data (indeks 0-based) di Sheets.
 * @returns {Promise<{ok:boolean, pesan:string}>}
 */
function perbaruiDataSheet(index, record) {
  return kirimAksiKeSheet('edit', index, record);
}

/**
 * Menghapus satu baris data (indeks 0-based) di Sheets.
 * @returns {Promise<{ok:boolean, pesan:string}>}
 */
function hapusDataSheet(index) {
  return kirimAksiKeSheet('hapus', index, null);
}

/* ---------- Baca semua data untuk dashboard admin (JSONP) ---------- */
/**
 * @returns {Promise<{sumber:string, data:Array}>}
 */
function ambilSemuaData() {
  if (!KONFIGURASI.APPS_SCRIPT_URL) return Promise.resolve({ sumber: 'lokal', data: ambilDataLokal() });

  return panggilJsonp({ action: 'list', token: KONFIGURASI.ADMIN.token }).then(function (resp) {
    if (resp && resp.ok && Array.isArray(resp.data)) {
      return { sumber: 'sheet', data: resp.data };
    }
    return { sumber: 'lokal', data: ambilDataLokal() };
  });
}
