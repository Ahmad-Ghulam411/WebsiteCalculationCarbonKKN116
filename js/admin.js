/* ============================================================================
 *  DASHBOARD ADMIN
 *  ----------------------------------------------------------------------------
 *  - Gerbang kata sandi sederhana (di sisi klien — lihat catatan di README).
 *  - Menampilkan seluruh data warga dalam tabel.
 *  - Mengunduh data ke Excel (.xlsx) atau CSV.
 *
 *  Catatan keamanan: kata sandi & token di config.js bersifat client-side,
 *  jadi ini hanya PENGHALANG DASAR, bukan pengamanan penuh. Untuk keamanan
 *  sungguhan diperlukan proteksi di sisi server.
 * ========================================================================== */

const Admin = (function () {
  let dataTerakhir = [];

  function el(id) { return document.getElementById(id); }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- Masuk ---- */
  function masuk() {
    const input = el('adminPassword');
    const pesan = el('adminPesanGerbang');
    if (input.value === KONFIGURASI.ADMIN.password) {
      pesan.textContent = '';
      pesan.classList.remove('tampil');
      el('adminGerbang').classList.add('tersembunyi');
      el('adminIsi').classList.remove('tersembunyi');
      input.value = '';
      muat();
    } else {
      pesan.textContent = 'Kata sandi salah. Silakan coba lagi.';
      pesan.classList.add('tampil');
      input.focus();
      input.select();
    }
  }

  /* ---- Muat data ---- */
  function muat() {
    const status = el('adminStatus');
    status.textContent = 'Memuat data…';
    el('adminMuatBtn').disabled = true;
    ambilSemuaData()
      .then(function (hasil) {
        dataTerakhir = Array.isArray(hasil.data) ? hasil.data : [];
        render(dataTerakhir, hasil.sumber);
      })
      .catch(function () {
        dataTerakhir = ambilDataLokal();
        render(dataTerakhir, 'lokal');
      })
      .then(function () { el('adminMuatBtn').disabled = false; });
  }

  /* ---- Tampilkan tabel ---- */
  function render(data, sumber) {
    el('adminJumlah').textContent = data.length;
    el('adminSumber').textContent = (sumber === 'sheet')
      ? 'Google Sheets (online)'
      : 'Cadangan di perangkat ini';
    el('adminStatus').textContent = '';

    const wadah = el('adminTabelWadah');
    if (!data.length) {
      wadah.innerHTML = '<p class="admin-kosong">Belum ada data warga yang masuk. '
        + 'Data akan muncul di sini setelah warga mengisi kalkulator.</p>';
      return;
    }

    let html = '<table class="admin-tabel"><thead><tr><th class="admin-no">No.</th>';
    SKEMA_KOLOM.forEach(function (k) { html += '<th>' + escHtml(k.judul) + '</th>'; });
    html += '</tr></thead><tbody>';
    data.forEach(function (row, i) {
      html += '<tr><td class="admin-no">' + (i + 1) + '</td>';
      SKEMA_KOLOM.forEach(function (k) {
        const v = row[k.kunci];
        html += '<td>' + (v === null || v === undefined ? '' : escHtml(v)) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    wadah.innerHTML = html;
  }

  /* ---- Siapkan baris untuk ekspor ---- */
  function barisUntukEkspor() {
    const rows = [SKEMA_KOLOM.map(function (k) { return k.judul; })];
    dataTerakhir.forEach(function (row) {
      rows.push(SKEMA_KOLOM.map(function (k) {
        const v = row[k.kunci];
        return (v === null || v === undefined) ? '' : v;
      }));
    });
    return rows;
  }

  function unduhExcel() {
    if (!dataTerakhir.length) { alert('Belum ada data untuk diunduh.'); return; }
    const tanggal = new Date().toISOString().slice(0, 10);
    EksporExcel.unduhXlsx('data-warga-karbon-kampung-baru-' + tanggal + '.xlsx', barisUntukEkspor());
  }

  function unduhCsv() {
    if (!dataTerakhir.length) { alert('Belum ada data untuk diunduh.'); return; }
    const tanggal = new Date().toISOString().slice(0, 10);
    EksporExcel.unduhCsv('data-warga-karbon-kampung-baru-' + tanggal + '.csv', barisUntukEkspor());
  }

  return {
    masuk: masuk,
    muat: muat,
    unduhExcel: unduhExcel,
    unduhCsv: unduhCsv,
  };
})();
