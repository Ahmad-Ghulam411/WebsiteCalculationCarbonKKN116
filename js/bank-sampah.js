/* ============================================================================
 *  HALAMAN "CEK BANK SAMPAH" (untuk warga)
 *  ----------------------------------------------------------------------------
 *  Warga cukup memasukkan ID Nasabah (atau NIK), lalu halaman menampilkan:
 *    - Nama warga & NIK
 *    - Berat / jumlah kantong keseluruhan (dipisah sampah kering & basah)
 *    - Setoran yang baru saja dimasukkan petugas
 *    - Pendapatan keseluruhan, yang belum dicairkan, & yang sudah dicairkan
 *    - Tombol untuk mengajukan pencairan pendapatan
 * ========================================================================== */

(function () {
  'use strict';

  const KUNCI_ID_TERAKHIR = 'bankSampahIdTerakhir';

  let wargaAktif = null;    // data nasabah yang sedang ditampilkan
  let ringkasanAktif = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    isiInfoKontak();
    isiDaftarHarga();
    wiringNavigasi();
    wiringForm();
    setTahunFooter();
    isiIdAwal();
  }

  /* ---------------------------------------------------------------------
   *  Bantu
   * ------------------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }

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

  function pesanCek(teks, jenis) {
    const p = $('pesanCek');
    if (!p) return;
    p.textContent = teks || '';
    p.className = 'bs-pesan' + (teks ? ' tampil' : '') + (jenis ? ' bs-pesan-' + jenis : '');
  }

  /** Menampilkan tanggal "2026-07-27" menjadi "27 Juli 2026". */
  function tanggalRamah(nilai) {
    const teks = String(nilai === null || nilai === undefined ? '' : nilai).trim();
    if (!teks) return '—';
    const cocok = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!cocok) return teks;
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return parseInt(cocok[3], 10) + ' ' + bulan[parseInt(cocok[2], 10) - 1] + ' ' + cocok[1];
  }

  function angkaRamah(n) {
    return BankSampah.keAngka(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }

  /* ---------------------------------------------------------------------
   *  Bagian statis halaman
   * ------------------------------------------------------------------- */
  function isiInfoKontak() {
    const k = KONFIGURASI.KONTAK;
    const set = function (id, v) { const e = $(id); if (e) e.textContent = v; };
    set('kontakInstansi', k.instansi);
    set('kontakAlamat', k.alamat);
    const tel = $('kontakTelepon');
    if (tel) { tel.textContent = k.telepon; tel.href = 'tel:' + k.telepon.replace(/\s/g, ''); }
  }

  function setTahunFooter() {
    const e = $('tahunFooter');
    if (e) e.textContent = new Date().getFullYear();
  }

  function isiDaftarHarga() {
    const wadah = $('bsDaftarHarga');
    if (!wadah) return;
    const harga = KONFIGURASI.BANK_SAMPAH.HARGA_PER_KG;
    const daftar = [
      {
        ikon: '🧴', nama: 'Sampah Kering', nilai: harga.kering,
        ket: 'Botol plastik, gelas plastik, kardus, kertas, kaleng, besi',
      },
      {
        ikon: '🍂', nama: 'Sampah Basah', nilai: harga.basah,
        ket: 'Sisa sayur, kulit buah, nasi, daun — diolah jadi kompos',
      },
    ];
    wadah.innerHTML = daftar.map(function (h) {
      return '<div class="bs-harga-item">' +
        '<div class="bs-harga-ikon">' + h.ikon + '</div>' +
        '<div class="bs-harga-nama">' + h.nama + '</div>' +
        '<div class="bs-harga-nilai">' + BankSampah.rupiah(h.nilai) + ' <small>/ kg</small></div>' +
        '<div class="bs-harga-isi">' + h.ket + '</div>' +
        '</div>';
    }).join('');
  }

  function wiringNavigasi() {
    const tombol = $('navToggle');
    const menu = $('navMenu');
    if (!tombol || !menu) return;
    tombol.addEventListener('click', function () {
      menu.classList.toggle('buka');
      tombol.classList.toggle('aktif');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('buka');
        tombol.classList.remove('aktif');
      });
    });
  }

  /* ---------------------------------------------------------------------
   *  Pencarian data warga
   * ------------------------------------------------------------------- */
  function isiIdAwal() {
    // Bisa dibuka lewat tautan langsung: bank-sampah.html?id=BS-0001
    let id = '';
    try {
      id = new URLSearchParams(window.location.search).get('id') || '';
      if (!id) id = localStorage.getItem(KUNCI_ID_TERAKHIR) || '';
    } catch (e) { /* abaikan */ }

    if (!id) return;
    $('inputId').value = id;
    // ID dari tautan langsung dicek otomatis; ID dari ingatan cukup diisikan saja.
    if (window.location.search.indexOf('id=') >= 0) cari(id);
  }

  function wiringForm() {
    const form = $('formCek');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        cari($('inputId').value);
      });
    }

    const lagi = $('tombolCekLagi');
    if (lagi) {
      lagi.addEventListener('click', function () {
        $('hasilBs').classList.add('tersembunyi');
        $('inputId').value = '';
        $('inputId').focus();
        pesanCek('');
        document.getElementById('cek').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const cair = $('tombolCair');
    if (cair) cair.addEventListener('click', ajukanPencairan);
  }

  function cari(idMentah) {
    const id = BankSampah.normalId(idMentah);
    if (!id) {
      pesanCek('Mohon isi dulu ID Nasabah Anda.', 'salah');
      $('inputId').focus();
      return;
    }

    const tombol = $('tombolCek');
    tombol.disabled = true;
    tombol.textContent = 'Mencari…';
    pesanCek('⏳ Sedang mencari data Anda…', 'proses');

    BankSampah.cekWarga(id)
      .then(function (hasil) {
        if (!hasil.ok || !hasil.nasabah) {
          $('hasilBs').classList.add('tersembunyi');
          pesanCek(hasil.tanpaBalasan
            ? '❌ Server bank sampah belum menjawab. Periksa koneksi internet Anda, ' +
              'lalu tekan "Cek Sekarang" sekali lagi.'
            : '❌ ' + (hasil.pesan || 'Data tidak ditemukan.') +
              ' Periksa kembali ID Nasabah Anda, atau tanyakan ke petugas bank sampah.', 'salah');
          return;
        }

        wargaAktif = hasil.nasabah;
        ringkasanAktif = BankSampah.ringkas(hasil.setoran, hasil.pengajuan);
        try { localStorage.setItem(KUNCI_ID_TERAKHIR, BankSampah.normalId(hasil.nasabah.id)); } catch (e) {}

        pesanCek('');
        tampilkan(wargaAktif, ringkasanAktif);
      })
      .then(function () {
        tombol.disabled = false;
        tombol.textContent = 'Cek Sekarang';
      });
  }

  /* ---------------------------------------------------------------------
   *  Menampilkan hasil
   * ------------------------------------------------------------------- */
  function tampilkan(warga, r) {
    const bagian = $('hasilBs');
    bagian.classList.remove('tersembunyi');

    /* --- Identitas --- */
    $('bsNama').textContent = warga.nama || '(nama belum diisi)';
    $('bsId').textContent = warga.id || '—';
    $('bsNik').textContent = warga.nik || '—';
    $('bsTanggalDaftar').textContent = tanggalRamah(warga.tanggalDaftar);

    const alamat = [warga.alamat, warga.rt ? 'RT ' + warga.rt : '', warga.rw ? 'RW ' + warga.rw : '']
      .filter(function (x) { return String(x || '').trim(); }).join(' · ');
    $('bsAlamat').textContent = alamat || '—';

    const status = String(warga.status || 'Aktif');
    const badge = $('bsStatusNasabah');
    badge.textContent = status;
    badge.className = 'bs-badge ' + (status.toLowerCase().indexOf('aktif') === 0 ? 'bs-badge-hijau' : 'bs-badge-abu');

    $('bsAvatar').textContent = (warga.nama || '?').trim().charAt(0).toUpperCase() || '👤';

    /* --- Setoran terakhir --- */
    const wadahTerakhir = $('bsSetoranTerakhir');
    if (r.setoranTerakhir) {
      const s = r.setoranTerakhir;
      wadahTerakhir.innerHTML =
        '<div class="bs-terakhir-tanggal">📅 ' + escHtml(tanggalRamah(s.tanggal)) + '</div>' +
        '<div class="bs-terakhir-grid">' +
          kotakKecil('Jenis Sampah', escHtml(s.jenis || '—')) +
          kotakKecil('Berat', angkaRamah(s.berat) + ' kg') +
          kotakKecil('Jumlah Kantong', angkaRamah(s.kantong) + ' kantong') +
          kotakKecil('Pendapatan', BankSampah.rupiah(s.pendapatan)) +
        '</div>' +
        (s.catatan ? '<p class="bs-terakhir-catatan">📝 ' + escHtml(s.catatan) + '</p>' : '');
    } else {
      wadahTerakhir.innerHTML = '<p class="bs-kosong">Belum ada setoran yang tercatat. ' +
        'Yuk, mulai pilah sampah di rumah dan setorkan ke bank sampah! ♻️</p>';
    }

    /* --- Total berat & kantong --- */
    $('bsTotalBerat').textContent = angkaRamah(r.totalBerat) + ' kg';
    $('bsTotalKantong').textContent = angkaRamah(r.totalKantong) + ' kantong';
    $('bsJumlahSetoran').textContent = r.jumlahSetoran + ' kali';

    $('bsKeringBerat').textContent = angkaRamah(r.kering.berat) + ' kg';
    $('bsKeringKantong').textContent = angkaRamah(r.kering.kantong) + ' kantong';
    $('bsKeringRp').textContent = BankSampah.rupiah(r.kering.pendapatan);

    $('bsBasahBerat').textContent = angkaRamah(r.basah.berat) + ' kg';
    $('bsBasahKantong').textContent = angkaRamah(r.basah.kantong) + ' kantong';
    $('bsBasahRp').textContent = BankSampah.rupiah(r.basah.pendapatan);

    /* --- Pendapatan --- */
    $('bsUangTotal').textContent = BankSampah.rupiah(r.pendapatanTotal);
    $('bsUangBelum').textContent = BankSampah.rupiah(r.belumCair);
    $('bsUangSudah').textContent = BankSampah.rupiah(r.sudahCair);

    aturTombolCair(r);
    aturRiwayat(r.setoran);

    setTimeout(function () {
      bagian.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function kotakKecil(label, nilai) {
    return '<div class="bs-kotak-kecil"><span class="bs-label-kecil">' + label + '</span>' +
      '<strong>' + nilai + '</strong></div>';
  }

  function aturTombolCair(r) {
    const tombol = $('tombolCair');
    const info = $('bsCairInfo');
    const minimal = KONFIGURASI.BANK_SAMPAH.MIN_PENCAIRAN || 0;

    tombol.classList.remove('tombol-nonaktif');
    tombol.disabled = false;
    tombol.textContent = '💵 Ajukan Pencairan Pendapatan';

    if (r.pengajuanMenunggu) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      tombol.textContent = '⏳ Pengajuan Sedang Diproses';
      info.className = 'bs-cair-info bs-cair-tunggu';
      info.textContent = 'Anda sudah mengajukan pencairan sebesar ' +
        BankSampah.rupiah(r.pengajuanMenunggu.jumlah) + ' pada ' +
        tanggalRamah(r.pengajuanMenunggu.tanggal) +
        '. Mohon tunggu petugas memprosesnya, ya. 🙏';
      return;
    }

    if (r.belumCair <= 0) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      info.className = 'bs-cair-info';
      info.textContent = 'Belum ada pendapatan baru yang bisa dicairkan. ' +
        'Setor sampah lagi untuk menambah tabungan Anda. 🌱';
      return;
    }

    if (r.belumCair < minimal) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      info.className = 'bs-cair-info';
      info.textContent = 'Pencairan bisa diajukan bila tabungan sudah mencapai ' +
        BankSampah.rupiah(minimal) + '. Tabungan Anda sekarang ' +
        BankSampah.rupiah(r.belumCair) + ' — tinggal ' +
        BankSampah.rupiah(minimal - r.belumCair) + ' lagi. 💪';
      return;
    }

    info.className = 'bs-cair-info bs-cair-siap';
    info.textContent = '✅ Tabungan Anda sebesar ' + BankSampah.rupiah(r.belumCair) +
      ' sudah bisa dicairkan. Tekan tombol di bawah untuk mengajukannya.';
  }

  function aturRiwayat(daftar) {
    const wadah = $('bsRiwayat');
    if (!daftar || !daftar.length) {
      wadah.innerHTML = '<p class="bs-kosong">Belum ada riwayat setoran.</p>';
      return;
    }

    let html = '<table class="bs-tabel"><thead><tr>' +
      '<th>Tanggal</th><th>Jenis</th><th>Berat</th><th>Kantong</th>' +
      '<th>Pendapatan</th><th>Status</th></tr></thead><tbody>';

    daftar.forEach(function (s) {
      const sudah = String(s.status || '').indexOf('Sudah') === 0;
      html += '<tr>' +
        '<td>' + escHtml(tanggalRamah(s.tanggal)) + '</td>' +
        '<td>' + escHtml(s.jenis || '—') + '</td>' +
        '<td>' + angkaRamah(s.berat) + ' kg</td>' +
        '<td>' + angkaRamah(s.kantong) + '</td>' +
        '<td>' + BankSampah.rupiah(s.pendapatan) + '</td>' +
        '<td><span class="bs-badge ' + (sudah ? 'bs-badge-abu' : 'bs-badge-kuning') + '">' +
          escHtml(s.status || '—') + '</span></td>' +
        '</tr>';
    });

    wadah.innerHTML = html + '</tbody></table>';
  }

  /* ---------------------------------------------------------------------
   *  Mengajukan pencairan
   * ------------------------------------------------------------------- */
  function ajukanPencairan() {
    if (!wargaAktif || !ringkasanAktif) return;

    const jumlah = ringkasanAktif.belumCair;
    const setuju = window.confirm(
      'Ajukan pencairan pendapatan sebesar ' + BankSampah.rupiah(jumlah) + '?\n\n' +
      'Pengajuan ini akan dikirim ke petugas bank sampah untuk diperiksa. ' +
      'Uang diserahkan langsung di sekretariat bank sampah.'
    );
    if (!setuju) return;

    const tombol = $('tombolCair');
    tombol.disabled = true;
    tombol.textContent = '⏳ Mengirim pengajuan…';

    BankSampah.ajukanPencairan(wargaAktif.id, wargaAktif.nama, jumlah).then(function (hasil) {
      if (hasil.ok) {
        toast('✅ Pengajuan terkirim. Petugas akan segera memprosesnya.');
        cari(wargaAktif.id); // muat ulang agar status terbaru terlihat
        return;
      }

      if (hasil.tanpaBalasan) {
        // Balasan server hilang di jalan — pengajuannya sering TETAP terkirim.
        // Data dimuat ulang supaya warga melihat keadaan yang sebenarnya.
        toast('⏳ Balasan server lambat. Data Anda dimuat ulang untuk memastikan.');
        cari(wargaAktif.id);
        return;
      }

      toast('❌ ' + hasil.pesan);
      aturTombolCair(ringkasanAktif);
    });
  }

})();
