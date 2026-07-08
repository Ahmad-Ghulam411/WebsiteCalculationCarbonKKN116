/* ============================================================================
 *  DASHBOARD ADMIN
 *  ----------------------------------------------------------------------------
 *  - Gerbang kata sandi sederhana (di sisi klien — lihat catatan di README).
 *  - Menampilkan seluruh data warga dalam tabel.
 *  - EDIT & HAPUS tiap data warga (tersimpan ke Google Sheets + cadangan lokal).
 *  - Mengunduh data ke Excel (.xlsx) atau CSV.
 *
 *  Catatan keamanan: kata sandi & token di config.js bersifat client-side,
 *  jadi ini hanya PENGHALANG DASAR, bukan pengamanan penuh. Untuk keamanan
 *  sungguhan diperlukan proteksi di sisi server.
 * ========================================================================== */

const Admin = (function () {
  let dataTerakhir = [];
  let sumberTerakhir = 'lokal';   // 'sheet' | 'lokal'
  let indeksDiedit = -1;          // baris yang sedang diedit (-1 = tidak ada)

  function el(id) { return document.getElementById(id); }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toast(pesan) {
    const t = el('toast');
    if (!t) { return; }
    t.textContent = pesan;
    t.classList.add('tampil');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { t.classList.remove('tampil'); }, 4200);
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
        sumberTerakhir = hasil.sumber;
        render(dataTerakhir, hasil.sumber);
      })
      .catch(function () {
        dataTerakhir = ambilDataLokal();
        sumberTerakhir = 'lokal';
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
    html += '<th class="admin-aksi-kol">Aksi</th></tr></thead><tbody>';
    data.forEach(function (row, i) {
      html += '<tr><td class="admin-no">' + (i + 1) + '</td>';
      SKEMA_KOLOM.forEach(function (k) {
        const v = row[k.kunci];
        html += '<td>' + (v === null || v === undefined ? '' : escHtml(v)) + '</td>';
      });
      html += '<td class="admin-aksi">'
        + '<button type="button" class="admin-aksi-btn admin-edit" data-index="' + i + '" title="Edit data">✏️ Edit</button>'
        + '<button type="button" class="admin-aksi-btn admin-hapus" data-index="' + i + '" title="Hapus data">🗑️ Hapus</button>'
        + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    wadah.innerHTML = html;

    // Pasang aksi pada tiap tombol
    wadah.querySelectorAll('.admin-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { bukaEdit(parseInt(btn.getAttribute('data-index'), 10)); });
    });
    wadah.querySelectorAll('.admin-hapus').forEach(function (btn) {
      btn.addEventListener('click', function () { hapus(parseInt(btn.getAttribute('data-index'), 10)); });
    });
  }

  /* ---- Buka form edit ---- */
  function bukaEdit(index) {
    if (index < 0 || index >= dataTerakhir.length) { return; }
    indeksDiedit = index;
    const row = dataTerakhir[index];

    let html = '';
    SKEMA_KOLOM.forEach(function (k) {
      const v = row[k.kunci];
      const nilai = (v === null || v === undefined) ? '' : String(v);
      html += '<label class="admin-edit-field">'
        + '<span>' + escHtml(k.judul) + '</span>'
        + '<input type="text" data-kunci="' + escHtml(k.kunci) + '" value="' + escHtml(nilai).replace(/"/g, '&quot;') + '">'
        + '</label>';
    });
    el('adminEditForm').innerHTML = html;

    const panel = el('adminEditModal');
    panel.classList.add('tampil');
    panel.setAttribute('aria-hidden', 'false');
  }

  function tutupEdit() {
    indeksDiedit = -1;
    const panel = el('adminEditModal');
    if (panel) { panel.classList.remove('tampil'); panel.setAttribute('aria-hidden', 'true'); }
  }

  /* ---- Simpan hasil edit ---- */
  function simpanEdit() {
    if (indeksDiedit < 0 || indeksDiedit >= dataTerakhir.length) { tutupEdit(); return; }
    const index = indeksDiedit;
    const dataLama = dataTerakhir[index];

    // Mulai dari data lama agar kunci yang tak ada di form tetap terjaga
    const record = Object.assign({}, dataLama);
    el('adminEditForm').querySelectorAll('input[data-kunci]').forEach(function (inp) {
      record[inp.getAttribute('data-kunci')] = inp.value;
    });
    tutupEdit();

    if (sumberTerakhir !== 'sheet') {
      dataTerakhir[index] = record;
      render(dataTerakhir, sumberTerakhir);
      perbaruiDataLokal(index, record);
      toast('✅ Perubahan tersimpan di perangkat ini.');
      return;
    }

    // Perbarui tampilan secara optimis, lalu benar-benar kirim ke Sheets.
    // Bila server menolak (token salah, deployment lama, baris tak ditemukan,
    // dll.), tampilan dikembalikan ke data lama agar admin tahu perubahan
    // TIDAK tersimpan (bukan malah tampak berhasil lalu kembali sendiri
    // setelah dimuat ulang nanti).
    dataTerakhir[index] = record;
    render(dataTerakhir, sumberTerakhir);
    toast('⏳ Menyimpan perubahan ke Google Sheets…');

    perbaruiDataSheet(index, record).then(function (hasil) {
      if (hasil.ok) {
        toast('✅ Perubahan tersimpan di Google Sheets.');
      } else {
        dataTerakhir[index] = dataLama;
        render(dataTerakhir, sumberTerakhir);
        toast('❌ Gagal menyimpan ke Google Sheets: ' + hasil.pesan);
      }
    });
  }

  /* ---- Hapus data ---- */
  function hapus(index) {
    if (index < 0 || index >= dataTerakhir.length) { return; }
    const dataLama = dataTerakhir[index];
    const nama = dataLama.nama || 'data ini';
    if (!window.confirm('Hapus ' + nama + '? Tindakan ini tidak bisa dibatalkan.')) { return; }

    if (sumberTerakhir !== 'sheet') {
      dataTerakhir.splice(index, 1);
      render(dataTerakhir, sumberTerakhir);
      hapusDataLokal(index);
      toast('🗑️ Data dihapus dari perangkat ini.');
      return;
    }

    // Perbarui tampilan secara optimis, lalu benar-benar hapus di Sheets.
    // Bila gagal, baris dikembalikan agar admin tahu data BELUM terhapus.
    dataTerakhir.splice(index, 1);
    render(dataTerakhir, sumberTerakhir);
    toast('⏳ Menghapus data dari Google Sheets…');

    hapusDataSheet(index).then(function (hasil) {
      if (hasil.ok) {
        toast('🗑️ Data dihapus dari Google Sheets.');
      } else {
        dataTerakhir.splice(index, 0, dataLama);
        render(dataTerakhir, sumberTerakhir);
        toast('❌ Gagal menghapus di Google Sheets: ' + hasil.pesan);
      }
    });
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
    simpanEdit: simpanEdit,
    tutupEdit: tutupEdit,
    unduhExcel: unduhExcel,
    unduhCsv: unduhCsv,
  };
})();
