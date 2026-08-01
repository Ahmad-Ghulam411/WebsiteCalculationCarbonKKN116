/* ============================================================================
 *  HALAMAN "CEK BANK SAMPAH" (untuk warga)
 *  ----------------------------------------------------------------------------
 *  Warga cukup memasukkan ID Nasabah (atau NIK), lalu halaman menampilkan:
 *    - Nama warga & NIK
 *    - Berat / jumlah kantong keseluruhan (dipisah sampah kering & basah)
 *    - Setoran yang baru saja dimasukkan petugas
 *    - Pendapatan keseluruhan, yang belum dicairkan, & yang sudah dicairkan
 *    - Tombol untuk mengajukan pencairan pendapatan — pengajuannya langsung
 *      dikirim ke WhatsApp pengelola bank sampah dalam bentuk pesan yang
 *      sudah lengkap (nama, NIK, ID nasabah, rincian sampah, & jumlah).
 * ========================================================================== */

(function () {
  'use strict';

  const KUNCI_ID_TERAKHIR = 'bankSampahIdTerakhir';

  /* Banyaknya setoran yang dirinci satu per satu di pesan WhatsApp.
   * Dibatasi supaya pesannya tidak kepanjangan di layar HP. */
  const BATAS_RINCIAN_WA = 15;

  let wargaAktif = null;    // data nasabah yang sedang ditampilkan
  let ringkasanAktif = null;
  let pesanWaAktif = '';    // isi chat pengajuan yang sedang disiapkan

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    isiInfoKontak();
    isiDaftarHarga();
    wiringNavigasi();
    wiringForm();
    wiringModalCair();
    wiringSetorWarga();
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

  /** Tanggal & jam sekarang, mis. "31 Juli 2026, pukul 14.05". */
  function waktuRamahSekarang() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    const tanggal = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    return tanggalRamah(tanggal) + ', pukul ' + p(d.getHours()) + '.' + p(d.getMinutes());
  }

  /** Tautan chat WhatsApp ke pengelola bank sampah (berisi pesan pengajuan). */
  function tautanWa(pesan) {
    if (window.BankSampahKontak) return BankSampahKontak.tautanWa(pesan);
    // Cadangan bila js/bank-sampah-lokasi.js belum termuat
    const pengelola = KONFIGURASI.BANK_SAMPAH.PENGELOLA || {};
    let nomor = String(pengelola.wa || '').replace(/[^0-9]/g, '');
    if (nomor.indexOf('0') === 0) nomor = '62' + nomor.slice(1);
    return 'https://wa.me/' + nomor + (pesan ? '?text=' + encodeURIComponent(pesan) : '');
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
    wadah.innerHTML = BankSampah.daftarJenis().map(function (j) {
      return '<div class="bs-harga-item">' +
        '<div class="bs-harga-ikon">' + escHtml(j.ikon || '♻️') + '</div>' +
        '<div class="bs-harga-nama">' + escHtml(j.nama) + '</div>' +
        '<div class="bs-harga-nilai">' + BankSampah.rupiah(j.harga) + ' <small>/ kg</small></div>' +
        '<div class="bs-harga-isi">' + escHtml(j.ket || '') + '</div>' +
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

  /**
   * Mencari data seorang warga lalu menampilkannya.
   * @param {string} idMentah
   * @param {{senyap:boolean}} [opsi] - senyap = memuat ulang diam-diam
   *        (tanpa tulisan "sedang mencari" & tanpa menggulir halaman),
   *        dipakai setelah warga mengirim setoran / pengajuan.
   */
  function cari(idMentah, opsi) {
    const senyap = !!(opsi && opsi.senyap);
    const id = BankSampah.normalId(idMentah);
    if (!id) {
      if (!senyap) {
        pesanCek('Mohon isi dulu ID Nasabah Anda.', 'salah');
        $('inputId').focus();
      }
      return;
    }

    const tombol = $('tombolCek');
    if (!senyap) {
      tombol.disabled = true;
      tombol.textContent = 'Mencari…';
      pesanCek('⏳ Sedang mencari data Anda…', 'proses');
    }

    BankSampah.cekWarga(id)
      .then(function (hasil) {
        if (!hasil.ok || !hasil.nasabah) {
          // Muat ulang diam-diam yang gagal cukup dibiarkan — data yang
          // sudah tampil di layar warga tidak perlu ikut hilang.
          if (senyap) return;
          $('hasilBs').classList.add('tersembunyi');
          pesanCek(hasil.tanpaBalasan
            ? '❌ Server bank sampah belum menjawab. Periksa koneksi internet Anda, ' +
              'lalu tekan "Cek Sekarang" sekali lagi.'
            : '❌ ' + (hasil.pesan || 'Data tidak ditemukan.') +
              ' Periksa kembali ID Nasabah Anda, atau tanyakan ke petugas bank sampah.', 'salah');
          return;
        }

        wargaAktif = hasil.nasabah;
        ringkasanAktif = BankSampah.ringkas(hasil.setoran, hasil.pengajuan, hasil.setoranWarga);
        try { localStorage.setItem(KUNCI_ID_TERAKHIR, BankSampah.normalId(hasil.nasabah.id)); } catch (e) {}

        if (!senyap) pesanCek('');
        tampilkan(wargaAktif, ringkasanAktif, senyap);
      })
      .then(function () {
        if (senyap) return;
        tombol.disabled = false;
        tombol.textContent = 'Cek Sekarang';
      });
  }

  /* ---------------------------------------------------------------------
   *  Menampilkan hasil
   * ------------------------------------------------------------------- */
  function tampilkan(warga, r, senyap) {
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
    const menunggu = r.setoranMenunggu || [];
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
    } else if (menunggu.length) {
      // Belum ada setoran resmi, tetapi catatan yang diisi sendiri oleh warga
      // sudah masuk — tampilkan itu supaya warganya tidak mengira hilang.
      const m = menunggu[0];
      wadahTerakhir.innerHTML =
        '<div class="bs-terakhir-tanggal">📅 ' + escHtml(tanggalRamah(m.tanggal)) +
          ' <span class="bs-badge bs-badge-kuning">⏳ Menunggu Persetujuan</span></div>' +
        '<div class="bs-terakhir-grid">' +
          kotakKecil('Jenis Sampah', escHtml(m.jenis || '—')) +
          kotakKecil('Perkiraan Berat', m.berat > 0 ? angkaRamah(m.berat) + ' kg' : '—') +
          kotakKecil('Jumlah Kantong', m.kantong > 0 ? angkaRamah(m.kantong) + ' kantong' : '—') +
          kotakKecil('Perkiraan Pendapatan', '± ' + BankSampah.rupiah(m.pendapatan)) +
        '</div>' +
        '<p class="bs-terakhir-catatan">📥 Catatan setoran Anda sudah masuk ke dashboard ' +
          'petugas. Nilainya baru dihitung ke tabungan setelah ditimbang & disetujui.</p>';
    } else {
      wadahTerakhir.innerHTML = '<p class="bs-kosong">Belum ada setoran yang tercatat. ' +
        'Yuk, mulai pilah sampah di rumah dan setorkan ke bank sampah! ♻️</p>';
    }

    /* --- Total berat & kantong --- */
    $('bsTotalBerat').textContent = angkaRamah(r.totalBerat) + ' kg';
    $('bsTotalKantong').textContent = angkaRamah(r.totalKantong) + ' kantong';
    $('bsJumlahSetoran').textContent = r.jumlahSetoran + ' kali';

    aturRincianJenis(r.perJenis);

    /* --- Pendapatan --- */
    $('bsUangTotal').textContent = BankSampah.rupiah(r.pendapatanTotal);
    $('bsUangBelum').textContent = BankSampah.rupiah(r.belumCair);
    $('bsUangSudah').textContent = BankSampah.rupiah(r.sudahCair);

    aturTombolCair(r);
    aturRiwayat(r);

    if (senyap) return;
    setTimeout(function () {
      bagian.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function kotakKecil(label, nilai) {
    return '<div class="bs-kotak-kecil"><span class="bs-label-kecil">' + label + '</span>' +
      '<strong>' + nilai + '</strong></div>';
  }

  /** Kartu rincian tiap jenis sampah (Botol Plastik, Kardus, …). */
  function aturRincianJenis(perJenis) {
    const wadah = $('bsRincianJenis');
    if (!wadah) return;

    // Jenis yang belum pernah disetor warga ini tidak perlu memenuhi layar —
    // kecuali memang belum ada setoran sama sekali, supaya tetap terlihat
    // sampah apa saja yang diterima bank sampah.
    const semua = perJenis || [];
    const adaIsi = semua.some(function (j) { return j.jumlahSetoran > 0; });
    const tampil = adaIsi ? semua.filter(function (j) { return j.jumlahSetoran > 0; }) : semua;

    if (!tampil.length) {
      wadah.innerHTML = '<p class="bs-kosong">Belum ada rincian jenis sampah.</p>';
      return;
    }

    wadah.innerHTML = tampil.map(function (j) {
      return '<div class="bs-jenis' + (j.jumlahSetoran ? '' : ' bs-jenis-sepi') + '">' +
        '<div class="bs-jenis-ikon">' + escHtml(j.ikon || '♻️') + '</div>' +
        '<div class="bs-jenis-nama">' + escHtml(j.nama) + '</div>' +
        '<div class="bs-jenis-ket">' + escHtml(j.ket || 'Jenis dari catatan lama') + '</div>' +
        '<div class="bs-jenis-baris"><span>Berat</span><strong>' + angkaRamah(j.berat) + ' kg</strong></div>' +
        '<div class="bs-jenis-baris"><span>Kantong</span><strong>' + angkaRamah(j.kantong) + '</strong></div>' +
        '<div class="bs-jenis-baris"><span>Pendapatan</span><strong>' + BankSampah.rupiah(j.pendapatan) + '</strong></div>' +
        '</div>';
    }).join('');
  }

  function aturTombolCair(r) {
    const tombol = $('tombolCair');
    const info = $('bsCairInfo');
    const minimal = KONFIGURASI.BANK_SAMPAH.MIN_PENCAIRAN || 0;

    tombol.classList.remove('tombol-nonaktif');
    tombol.disabled = false;
    tombol.textContent = '💬 Ajukan Pencairan lewat WhatsApp';

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
      ' sudah bisa dicairkan. Tekan tombol di bawah — pengajuannya langsung dikirim ke ' +
      'WhatsApp pengelola bank sampah.';
  }

  /**
   * Riwayat setoran — SATU daftar berisi semuanya:
   *   - setoran yang dicatat petugas,
   *   - setoran yang dicatat sendiri oleh warga & sudah disetujui
   *     (yang tampil adalah baris resminya, ditandai "dicatat sendiri"),
   *   - setoran yang dicatat sendiri & masih menunggu persetujuan,
   *   - setoran yang dicatat sendiri & ditolak petugas.
   * Penggabungan + pencegahan data dobelnya dikerjakan BankSampah.ringkas().
   */
  function aturRiwayat(r) {
    const wadah = $('bsRiwayat');
    if (!wadah) return;

    const daftar = r.riwayat || [];
    if (!daftar.length) {
      wadah.innerHTML = '<p class="bs-kosong">Belum ada riwayat setoran.</p>';
      return;
    }

    const menunggu = r.setoranMenunggu || [];
    let html = '';
    if (menunggu.length) {
      html += '<p class="bs-riwayat-info">⏳ <strong>' + menunggu.length + ' setoran</strong> ' +
        'yang Anda catat sendiri sedang menunggu persetujuan petugas ' +
        '(perkiraan ' + BankSampah.rupiah(r.perkiraanMenunggu) + '). Nilainya baru masuk ke ' +
        'tabungan setelah sampahnya ditimbang & disetujui petugas.</p>';
    }

    html += '<p class="bs-tabel-geser">👉 Geser tabel ke samping untuk melihat ' +
      'pendapatan, status, dan catatannya.</p>';

    html += '<div class="bs-tabel-wadah"><table class="bs-tabel"><thead><tr>' +
      '<th>Tanggal</th><th>Jenis</th><th>Berat</th><th>Kantong</th>' +
      '<th>Pendapatan</th><th>Status</th><th>Catatan</th></tr></thead><tbody>';

    daftar.forEach(function (s) {
      const kelas = kelasBarisRiwayat(s);
      html += '<tr' + (kelas ? ' class="' + kelas + '"' : '') + '>' +
        '<td>' + escHtml(tanggalRamah(s.tanggal)) + '</td>' +
        '<td>' + escHtml(s.jenis || '—') +
          (s.dariWarga ? '<small class="bs-riwayat-asal">📱 dicatat sendiri</small>' : '') + '</td>' +
        '<td>' + (s.berat > 0 ? angkaRamah(s.berat) + ' kg' : '—') + '</td>' +
        '<td>' + (s.kantong > 0 ? angkaRamah(s.kantong) : '—') + '</td>' +
        '<td>' + nilaiRiwayat(s) + '</td>' +
        '<td>' + lencanaRiwayat(s) + '</td>' +
        '<td class="bs-tabel-catatan">' + escHtml(s.catatan || '—') + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>' +
      '<p class="bs-riwayat-ket">Keterangan status — ' +
      '<span class="bs-badge bs-badge-kuning">⏳ Menunggu Persetujuan</span> catatan Anda ' +
      'belum ditimbang petugas, nilainya masih perkiraan · ' +
      '<span class="bs-badge bs-badge-merah">❌ Ditolak</span> catatan tidak disetujui ' +
      '(alasannya ada di kolom Catatan) · ' +
      '<span class="bs-badge bs-badge-hijau">✅ Disetujui</span> sudah masuk ke tabungan Anda · ' +
      '<span class="bs-badge bs-badge-biru">Belum Dicairkan</span> / ' +
      '<span class="bs-badge bs-badge-abu">Sudah Dicairkan</span> keadaan uangnya.</p>';

    wadah.innerHTML = html;
  }

  function kelasBarisRiwayat(s) {
    if (s.resmi) return '';
    return s.status === BS_STATUS_SETOR.DITOLAK ? 'bs-baris-ditolak' : 'bs-baris-menunggu';
  }

  /** Kolom pendapatan — setoran yang belum ditimbang petugas masih perkiraan. */
  function nilaiRiwayat(s) {
    if (s.perkiraan) {
      return '<span class="bs-riwayat-perkiraan" title="Perkiraan — angka pastinya ' +
        'mengikuti timbangan petugas">± ' + BankSampah.rupiah(s.pendapatan) + '</span>';
    }
    if (!s.resmi) return '<span class="bs-riwayat-perkiraan">—</span>';
    return BankSampah.rupiah(s.pendapatan);
  }

  /** Lencana status: persetujuan (bila dicatat warga) + keadaan pencairan. */
  function lencanaRiwayat(s) {
    const lencana = [];
    const badge = function (warna, teks) {
      return '<span class="bs-badge ' + warna + '">' + escHtml(teks) + '</span>';
    };

    if (s.status === BS_STATUS_SETOR.MENUNGGU) lencana.push(badge('bs-badge-kuning', '⏳ Menunggu Persetujuan'));
    else if (s.status === BS_STATUS_SETOR.DITOLAK) lencana.push(badge('bs-badge-merah', '❌ Ditolak'));
    else if (s.status === BS_STATUS_SETOR.DISETUJUI) lencana.push(badge('bs-badge-hijau', '✅ Disetujui'));
    else if (s.status) lencana.push(badge('bs-badge-abu', s.status));

    if (s.resmi) {
      const sudah = String(s.statusCair || '').indexOf('Sudah') === 0;
      lencana.push(badge(sudah ? 'bs-badge-abu' : 'bs-badge-biru', s.statusCair || '—'));
    }
    return lencana.join(' ');
  }

  /* ---------------------------------------------------------------------
   *  Mengajukan pencairan — lewat WhatsApp pengelola bank sampah
   *
   *  Alurnya:
   *    1. Warga menekan "Ajukan Pencairan lewat WhatsApp".
   *    2. Muncul kotak berisi nomor WA pengelola, jumlah yang diajukan,
   *       dan pratinjau isi pesannya.
   *    3. Warga menekan tombol hijau → WhatsApp terbuka dengan pesan yang
   *       sudah lengkap, tinggal ditekan "kirim".
   *    4. Di belakang layar, pengajuan tetap dicatat ke buku pengajuan
   *       petugas (Google Sheets) supaya terlihat juga di dashboard admin.
   * ------------------------------------------------------------------- */
  function ajukanPencairan() {
    if (!wargaAktif || !ringkasanAktif) return;

    pesanWaAktif = susunPesanWa(wargaAktif, ringkasanAktif);

    const modal = $('modalCair');
    if (!modal) {
      // Cadangan bila kotak pengajuan tidak ada di halaman
      window.open(tautanWa(pesanWaAktif), '_blank', 'noopener');
      catatPengajuan();
      return;
    }

    const nominal = $('cairNominal');
    const pratinjau = $('cairPratinjau');
    const kirim = $('cairKirim');
    if (nominal) nominal.textContent = BankSampah.rupiah(ringkasanAktif.belumCair);
    if (pratinjau) pratinjau.textContent = pesanWaAktif;
    if (kirim) kirim.href = tautanWa(pesanWaAktif);

    modal.classList.add('tampil');
    modal.setAttribute('aria-hidden', 'false');
  }

  /** Menyusun isi chat WhatsApp: data diri, rincian sampah, & jumlah. */
  function susunPesanWa(warga, r) {
    const lokasi = KONFIGURASI.BANK_SAMPAH.LOKASI || {};
    const namaTempat = lokasi.nama || 'Bank Sampah Kampung Baru';
    const patokan = lokasi.patokan || 'Tepat di belakang Posyandu';

    const alamat = [warga.alamat, warga.rt ? 'RT ' + warga.rt : '', warga.rw ? 'RW ' + warga.rw : '']
      .filter(function (x) { return String(x || '').trim(); }).join(' · ');

    const baris = [];
    baris.push('*PENGAJUAN PENCAIRAN TABUNGAN BANK SAMPAH*');
    baris.push(namaTempat + ' — Kota Parepare');
    baris.push('');
    baris.push('Assalamu alaikum, Pak/Bu. Saya ingin mengajukan pencairan tabungan bank sampah saya. Berikut datanya:');
    baris.push('');

    baris.push('*A. DATA NASABAH*');
    baris.push('• Nama: ' + (warga.nama || '-'));
    baris.push('• NIK: ' + (warga.nik || '-'));
    baris.push('• ID Nasabah: ' + (warga.id || '-'));
    baris.push('• Alamat: ' + (alamat || '-'));
    if (String(warga.noHp || '').trim()) baris.push('• No. HP: ' + warga.noHp);
    baris.push('• Terdaftar sejak: ' + tanggalRamah(warga.tanggalDaftar));
    baris.push('');

    baris.push('*B. RINCIAN SAMPAH YANG SUDAH DISETOR*');
    baris.push('• Jumlah setoran: ' + r.jumlahSetoran + ' kali');
    baris.push('• Total berat: ' + angkaRamah(r.totalBerat) + ' kg (' + angkaRamah(r.totalKantong) + ' kantong)');
    baris.push('• Sampah kering: ' + angkaRamah(r.kering.berat) + ' kg · ' +
      angkaRamah(r.kering.kantong) + ' kantong · ' + BankSampah.rupiah(r.kering.pendapatan));
    baris.push('• Sampah basah: ' + angkaRamah(r.basah.berat) + ' kg · ' +
      angkaRamah(r.basah.kantong) + ' kantong · ' + BankSampah.rupiah(r.basah.pendapatan));
    if (r.setoranTerakhir) {
      const s = r.setoranTerakhir;
      baris.push('• Setoran terakhir: ' + tanggalRamah(s.tanggal) + ' — ' + (s.jenis || '-') +
        ', ' + angkaRamah(s.berat) + ' kg (' + BankSampah.rupiah(s.pendapatan) + ')');
    }
    if ((r.setoranMenunggu || []).length) {
      baris.push('• Masih menunggu persetujuan: ' + r.setoranMenunggu.length + ' setoran ' +
        '(perkiraan ' + BankSampah.rupiah(r.perkiraanMenunggu) + ') — BELUM termasuk jumlah di bawah');
    }
    baris.push('');

    const belum = (r.setoran || []).filter(function (s) {
      return String(s.status || '') !== BS_STATUS_CAIR.SUDAH;
    });
    if (belum.length) {
      baris.push('*C. SETORAN YANG BELUM DICAIRKAN*');
      belum.slice(0, BATAS_RINCIAN_WA).forEach(function (s, i) {
        baris.push((i + 1) + '. ' + tanggalRamah(s.tanggal) + ' — ' + (s.jenis || '-') + ', ' +
          angkaRamah(s.berat) + ' kg, ' + angkaRamah(s.kantong) + ' kantong, ' +
          BankSampah.rupiah(s.pendapatan));
      });
      if (belum.length > BATAS_RINCIAN_WA) {
        baris.push('…dan ' + (belum.length - BATAS_RINCIAN_WA) + ' setoran lainnya.');
      }
      baris.push('');
    }

    baris.push('*D. RINGKASAN PENDAPATAN*');
    baris.push('• Pendapatan keseluruhan: ' + BankSampah.rupiah(r.pendapatanTotal));
    baris.push('• Sudah dicairkan: ' + BankSampah.rupiah(r.sudahCair));
    baris.push('• Belum dicairkan: ' + BankSampah.rupiah(r.belumCair));
    baris.push('');
    baris.push('*JUMLAH YANG INGIN DICAIRKAN: ' + BankSampah.rupiah(r.belumCair) + '*');
    baris.push('');
    baris.push('Tanggal pengajuan: ' + waktuRamahSekarang());
    baris.push('Mohon informasinya kapan saya bisa mengambil uangnya di sekretariat bank sampah (' +
      patokan + '). Terima kasih banyak 🙏');
    baris.push('');
    baris.push('_Pesan ini dibuat otomatis dari halaman Cek Bank Sampah Kampung Baru._');

    return baris.join('\n');
  }

  /* ---------------------------------------------------------------------
   *  Kotak pengajuan (modal WhatsApp)
   * ------------------------------------------------------------------- */
  function tutupModalCair() {
    const modal = $('modalCair');
    if (!modal) return;
    modal.classList.remove('tampil');
    modal.setAttribute('aria-hidden', 'true');
  }

  function wiringModalCair() {
    const modal = $('modalCair');
    if (!modal) return;

    const tutup = $('cairTutup');
    const latar = $('cairLatar');
    if (tutup) tutup.addEventListener('click', tutupModalCair);
    if (latar) latar.addEventListener('click', tutupModalCair);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modal.classList.contains('tampil')) tutupModalCair();
    });

    const kirim = $('cairKirim');
    if (kirim) {
      kirim.addEventListener('click', function () {
        // WhatsApp dibuka oleh tautan ini sendiri — BUKAN lewat JavaScript —
        // supaya tidak diblokir peramban HP. Pencatatan pengajuan ke buku
        // petugas dikerjakan di belakang layar.
        catatPengajuan();
        setTimeout(tutupModalCair, 800);
      });
    }

    const salin = $('cairSalin');
    if (salin) salin.addEventListener('click', salinPesanWa);
  }

  /** Mencatat pengajuan ke buku petugas agar muncul di dashboard admin. */
  function catatPengajuan() {
    if (!wargaAktif || !ringkasanAktif) return;
    const id = wargaAktif.id;

    BankSampah.ajukanPencairan(id, wargaAktif.nama, ringkasanAktif.belumCair)
      .then(function (hasil) {
        if (hasil.ok || hasil.tanpaBalasan) {
          toast('✅ Pengajuan dicatat. Jangan lupa tekan "kirim" di WhatsApp, ya.');
        } else {
          toast('ℹ️ ' + hasil.pesan + ' Pengajuan lewat WhatsApp tetap bisa diteruskan.');
        }
        cari(id, { senyap: true }); // muat ulang agar status terbaru terlihat
      });
  }

  /** Menyalin isi pesan — untuk warga yang tidak memakai WhatsApp. */
  function salinPesanWa() {
    salinTeks(pesanWaAktif);
  }

  function salinTeks(teks) {
    if (!teks) return;

    const beritahu = function (berhasil) {
      toast(berhasil
        ? '📋 Isi pesan sudah disalin.'
        : '❌ Tidak bisa menyalin otomatis. Silakan salin dari kotak pratinjau.');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(
        function () { beritahu(true); },
        function () { beritahu(salinCaraLama(teks)); }
      );
      return;
    }
    beritahu(salinCaraLama(teks));
  }

  function salinCaraLama(teks) {
    try {
      const kotak = document.createElement('textarea');
      kotak.value = teks;
      kotak.setAttribute('readonly', '');
      kotak.style.position = 'fixed';
      kotak.style.top = '-1000px';
      kotak.style.opacity = '0';
      document.body.appendChild(kotak);
      kotak.select();
      const berhasil = document.execCommand('copy');
      document.body.removeChild(kotak);
      return berhasil;
    } catch (e) {
      return false;
    }
  }

  /* =====================================================================
   *  MENCATAT SETORAN SAMPAH — DIISI SENDIRI OLEH WARGA
   *  ---------------------------------------------------------------------
   *  Alurnya:
   *    1. Warga memilih "sudah terdaftar" (isi ID Nasabah/NIK) atau
   *       "belum terdaftar" (ID Nasabahnya dibuatkan otomatis).
   *    2. Mengisi data diri, jenis sampah, perkiraan berat/kantong,
   *       dan MEMOTRET sampahnya sebagai bukti.
   *    3. Catatan + fotonya dikirim ke buku petugas dengan status
   *       "Menunggu" — petugas yang menyetujui atau menolaknya.
   *    4. Sekaligus muncul kotak berisi chat WhatsApp siap kirim untuk
   *       pengelola bank sampah.
   * =================================================================== */

  let fotoSetoran = null;      // { dataUrl, ukuranKb } foto yang sudah dikecilkan
  let wargaTerdaftar = null;   // hasil "Cek" ID Nasabah/NIK
  let pesanSetorWa = '';       // isi chat setoran yang sedang disiapkan

  function wiringSetorWarga() {
    const form = $('formSetorWarga');
    if (!form) return;

    isiPilihanJenis();

    document.querySelectorAll('input[name="swTerdaftar"]').forEach(function (r) {
      r.addEventListener('change', aturTampilanTerdaftar);
    });
    aturTampilanTerdaftar();

    const tombolCek = $('swCekId');
    if (tombolCek) tombolCek.addEventListener('click', cekIdNasabah);

    const isianId = $('swId');
    if (isianId) {
      isianId.addEventListener('input', function () {
        wargaTerdaftar = null;         // ID berubah → hasil cek sebelumnya tidak berlaku lagi
        pesanKe('swPesanId', '');
      });
      isianId.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); cekIdNasabah(); }
      });
    }

    const berkas = $('swFoto');
    if (berkas) berkas.addEventListener('change', pilihFoto);
    const hapusFotoBtn = $('swFotoHapus');
    if (hapusFotoBtn) hapusFotoBtn.addEventListener('click', hapusFoto);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      kirimSetoran();
    });

    wiringModalSetor();
  }

  /** Kartu pilihan jenis sampah — isinya mengikuti js/config.js. */
  function isiPilihanJenis() {
    const wadah = $('swJenisPilih');
    if (!wadah) return;

    wadah.innerHTML = BankSampah.daftarJenis().map(function (j, i) {
      const id = 'swJenis' + i;
      return '<label class="bs-jenis-kartu" for="' + id + '">' +
        '<input type="radio" name="swJenis" id="' + id + '" value="' + escHtml(j.nama) + '"' +
          (j.isian ? ' data-isian="1"' : '') + '>' +
        '<span class="bs-jenis-kartu-isi">' +
          '<span class="bs-jenis-kartu-ikon" aria-hidden="true">' + escHtml(j.ikon || '♻️') + '</span>' +
          '<strong>' + escHtml(j.nama) + '</strong>' +
          '<small>' + escHtml(j.ket || '') + '</small>' +
          '<span class="bs-jenis-kartu-harga">' + BankSampah.rupiah(j.harga) + ' / kg</span>' +
        '</span></label>';
    }).join('');

    wadah.querySelectorAll('input[name="swJenis"]').forEach(function (r) {
      r.addEventListener('change', function () {
        const perluIsian = r.checked && r.getAttribute('data-isian') === '1';
        $('swKotakLain').classList.toggle('tersembunyi', !perluIsian);
        if (perluIsian) $('swJenisLain').focus();
      });
    });
  }

  function statusTerdaftar() {
    const dipilih = document.querySelector('input[name="swTerdaftar"]:checked');
    return dipilih ? dipilih.value : 'ya';
  }

  function jenisTerpilih() {
    const dipilih = document.querySelector('input[name="swJenis"]:checked');
    return dipilih ? dipilih.value : '';
  }

  function aturTampilanTerdaftar() {
    const sudah = statusTerdaftar() === 'ya';
    $('swKotakId').classList.toggle('tersembunyi', !sudah);
    $('swInfoBaru').classList.toggle('tersembunyi', sudah);
    if (!sudah) { wargaTerdaftar = null; pesanKe('swPesanId', ''); }
  }

  function pesanKe(id, teks, jenis) {
    const p = $(id);
    if (!p) return;
    p.textContent = teks || '';
    p.className = 'bs-pesan' + (teks ? ' tampil' : '') + (jenis ? ' bs-pesan-' + jenis : '');
  }

  /* ---------------------------------------------------------------------
   *  Mencari data warga yang sudah terdaftar (ID Nasabah atau NIK)
   * ------------------------------------------------------------------- */
  function cekIdNasabah() {
    const id = BankSampah.normalId($('swId').value);
    if (!id) {
      pesanKe('swPesanId', 'Mohon isi dulu ID Nasabah atau NIK Anda.', 'salah');
      $('swId').focus();
      return Promise.resolve(null);
    }

    const tombol = $('swCekId');
    tombol.disabled = true;
    pesanKe('swPesanId', '⏳ Sedang mencari data Anda…', 'proses');

    return BankSampah.cekWarga(id).then(function (hasil) {
      tombol.disabled = false;

      if (!hasil.ok || !hasil.nasabah) {
        wargaTerdaftar = null;
        pesanKe('swPesanId', hasil.tanpaBalasan
          ? '❌ Server bank sampah belum menjawab. Periksa koneksi internet lalu coba lagi.'
          : '❌ Data tidak ditemukan. Periksa lagi ID/NIK Anda — atau pilih ' +
            '"🆕 Belum terdaftar" di atas kalau memang baru pertama kali menyetor.', 'salah');
        return null;
      }

      wargaTerdaftar = hasil.nasabah;
      isiDariNasabah(hasil.nasabah);
      pesanKe('swPesanId', '✅ Selamat datang kembali, ' + (hasil.nasabah.nama || 'warga') +
        '! ID Nasabah Anda ' + hasil.nasabah.id + '. Data di bawah sudah terisi — ' +
        'silakan perbaiki bila ada yang berubah.', 'proses');
      return hasil.nasabah;
    });
  }

  /** Mengisi formulir dengan data warga yang sudah tersimpan. */
  function isiDariNasabah(n) {
    const isi = function (id, nilai) {
      const e = $(id);
      if (e && !String(e.value).trim()) e.value = nilai || '';
    };
    // Nama & alamat sengaja ditimpa, sisanya hanya bila masih kosong.
    $('swNama').value = n.nama || $('swNama').value;
    $('swAlamat').value = n.alamat || $('swAlamat').value;
    isi('swRt', n.rt);
    isi('swRw', n.rw);
    isi('swHp', n.noHp);
  }

  /* ---------------------------------------------------------------------
   *  Foto bukti — dikecilkan dulu di HP warga supaya hemat kuota
   * ------------------------------------------------------------------- */
  function pilihFoto(ev) {
    const berkas = ev.target.files && ev.target.files[0];
    if (!berkas) return;

    pesanKe('swPesan', '⏳ Menyiapkan foto…', 'proses');
    kecilkanFoto(berkas).then(
      function (hasil) {
        fotoSetoran = hasil;
        $('swFotoGambar').src = hasil.dataUrl;
        $('swFotoInfo').textContent = '✅ Foto siap dikirim (± ' + hasil.ukuranKb + ' KB)';
        $('swFotoPratinjau').classList.remove('tersembunyi');
        $('swFotoLabel').classList.add('tersembunyi');
        pesanKe('swPesan', '');
      },
      function (galat) {
        fotoSetoran = null;
        ev.target.value = '';
        pesanKe('swPesan', '❌ ' + galat.message, 'salah');
      }
    );
  }

  function hapusFoto() {
    fotoSetoran = null;
    $('swFoto').value = '';
    $('swFotoGambar').removeAttribute('src');
    $('swFotoPratinjau').classList.add('tersembunyi');
    $('swFotoLabel').classList.remove('tersembunyi');
    pesanKe('swPesan', '');
  }

  /** Perkiraan ukuran (KB) sebuah gambar dalam bentuk data URL. */
  function ukuranKb(dataUrl) {
    const potong = dataUrl.indexOf('base64,');
    const panjang = potong >= 0 ? dataUrl.length - potong - 7 : dataUrl.length;
    return (panjang * 3 / 4) / 1024;
  }

  /**
   * Mengecilkan foto memakai <canvas>: sisi terpanjang dipangkas ke ukuran
   * pada KONFIGURASI…SETORAN_WARGA, lalu mutunya diturunkan bertahap sampai
   * ukurannya cukup ringan untuk dikirim lewat jaringan HP.
   */
  function kecilkanFoto(berkas) {
    return new Promise(function (resolve, tolak) {
      if (!/^image\//.test(berkas.type || '')) {
        tolak(new Error('Berkas yang dipilih bukan foto. Pilih gambar JPG atau PNG, ya.'));
        return;
      }
      if (berkas.size > 25 * 1024 * 1024) {
        tolak(new Error('Fotonya terlalu besar (lebih dari 25 MB). Coba potret ulang dengan mutu lebih rendah.'));
        return;
      }

      const pengaturan = KONFIGURASI.BANK_SAMPAH.SETORAN_WARGA || {};
      const maksSisi = pengaturan.FOTO_MAKS_PIKSEL || 1000;
      const maksKb = pengaturan.FOTO_MAKS_KB || 600;
      let mutu = pengaturan.FOTO_MUTU || 0.72;

      const pembaca = new FileReader();
      pembaca.onerror = function () { tolak(new Error('Fotonya tidak bisa dibaca. Coba pilih foto lain.')); };
      pembaca.onload = function () {
        const gambar = new Image();
        gambar.onerror = function () { tolak(new Error('Fotonya tidak bisa dibuka. Coba pilih foto lain.')); };
        gambar.onload = function () {
          try {
            const skala = Math.min(1, maksSisi / Math.max(gambar.width, gambar.height));
            const lebar = Math.max(1, Math.round(gambar.width * skala));
            const tinggi = Math.max(1, Math.round(gambar.height * skala));

            const kanvas = document.createElement('canvas');
            kanvas.width = lebar;
            kanvas.height = tinggi;
            const kuas = kanvas.getContext('2d');
            kuas.fillStyle = '#ffffff';        // foto PNG tembus pandang → jangan jadi hitam
            kuas.fillRect(0, 0, lebar, tinggi);
            kuas.drawImage(gambar, 0, 0, lebar, tinggi);

            let hasil = kanvas.toDataURL('image/jpeg', mutu);
            while (ukuranKb(hasil) > maksKb && mutu > 0.32) {
              mutu -= 0.12;
              hasil = kanvas.toDataURL('image/jpeg', mutu);
            }
            resolve({ dataUrl: hasil, ukuranKb: Math.round(ukuranKb(hasil)) });
          } catch (e) {
            tolak(new Error('Fotonya gagal disiapkan. Coba potret ulang, ya.'));
          }
        };
        gambar.src = pembaca.result;
      };
      pembaca.readAsDataURL(berkas);
    });
  }

  /** base64 "web-safe" (+ → -, / → _) supaya isinya tidak rusak saat dikirim. */
  function base64Websafe(dataUrl) {
    const potong = String(dataUrl || '').indexOf('base64,');
    const isi = potong >= 0 ? dataUrl.slice(potong + 7) : String(dataUrl || '');
    return isi.replace(/\+/g, '-').replace(/\//g, '_');
  }

  /* ---------------------------------------------------------------------
   *  Mengirim setoran
   * ------------------------------------------------------------------- */
  function kirimSetoran() {
    const data = {
      nama: $('swNama').value.trim(),
      alamat: $('swAlamat').value.trim(),
      rt: $('swRt').value.trim(),
      rw: $('swRw').value.trim(),
      noHp: $('swHp').value.trim(),
      jenis: jenisTerpilih(),
      jenisLain: $('swJenisLain').value.trim(),
      berat: BankSampah.keAngka($('swBerat').value),
      kantong: BankSampah.keAngka($('swKantong').value),
      catatan: $('swCatatan').value.trim(),
    };

    const salah = periksaIsian(data);
    if (salah) {
      pesanKe('swPesan', '⚠️ ' + salah.pesan, 'salah');
      const kolom = $(salah.kolom);
      if (kolom) { kolom.focus(); kolom.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }

    const tombol = $('swKirim');
    const labelAsli = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = '⏳ Mengirim…';
    pesanKe('swPesan', '⏳ Setoran Anda sedang dikirim ke petugas. Mohon jangan tutup halaman ini…', 'proses');

    const selesai = function () {
      tombol.disabled = false;
      tombol.textContent = labelAsli;
    };

    // Langkah 1 — pastikan warganya punya ID Nasabah.
    siapkanIdNasabah(data).then(function (hasilId) {
      if (!hasilId.ok) {
        selesai();
        pesanKe('swPesan', '❌ ' + hasilId.pesan, 'salah');
        return;
      }

      // Langkah 2 — kirim catatan setoran beserta fotonya.
      const kiriman = Object.assign({}, data, {
        idWarga: hasilId.id,
        nik: hasilId.nik || '',
        terdaftar: hasilId.baru ? 'Tidak' : 'Ya',
        foto: base64Websafe(fotoSetoran.dataUrl),
        fotoTipe: 'image/jpeg',
      });

      return BankSampah.kirimSetoranWarga(kiriman).then(function (hasil) {
        selesai();

        if (!hasil.ok && !hasil.tanpaBalasan) {
          pesanKe('swPesan', '❌ ' + hasil.pesan, 'salah');
          return;
        }

        pesanKe('swPesan', '');
        pesanSetorWa = susunPesanSetorWa(kiriman, hasil.id, hasilId.baru);
        bukaModalSetor(hasilId, hasil);
      });
    }).catch(function () {
      selesai();
      pesanKe('swPesan', '❌ Setoran gagal dikirim. Periksa koneksi internet Anda, lalu coba lagi.', 'salah');
    });
  }

  /** Memeriksa isian formulir. Mengembalikan null bila semuanya sudah benar. */
  function periksaIsian(data) {
    if (statusTerdaftar() === 'ya' && !BankSampah.normalId($('swId').value)) {
      return { kolom: 'swId', pesan: 'Isi ID Nasabah atau NIK Anda dulu. Belum punya? Pilih "🆕 Belum terdaftar".' };
    }
    if (!data.nama) return { kolom: 'swNama', pesan: 'Nama lengkap wajib diisi.' };
    if (!data.alamat) return { kolom: 'swAlamat', pesan: 'Alamat wajib diisi.' };
    if (!data.noHp) return { kolom: 'swHp', pesan: 'No. HP / WA wajib diisi agar petugas bisa menghubungi Anda.' };
    if (!/^[0-9+\-\s()]{8,}$/.test(data.noHp)) {
      return { kolom: 'swHp', pesan: 'No. HP / WA sepertinya belum benar. Contoh: 0812xxxxxxx.' };
    }
    if (!data.jenis) {
      return { kolom: 'swJenisPilih', pesan: 'Pilih dulu jenis sampah yang Anda setorkan.' };
    }
    const keterangan = BankSampah.cariJenis(data.jenis);
    if (keterangan && keterangan.isian && !data.jenisLain) {
      return { kolom: 'swJenisLain', pesan: 'Karena memilih "Lain-lain", tuliskan dulu sampah apa yang Anda setorkan.' };
    }
    if (data.berat <= 0 && data.kantong <= 0) {
      return { kolom: 'swBerat', pesan: 'Isi perkiraan berat (kg) atau jumlah kantongnya — salah satu saja cukup.' };
    }
    if (!fotoSetoran) {
      return { kolom: 'swFoto', pesan: 'Foto bukti sampah wajib disertakan. Tekan "Ambil / Pilih Foto Sampah".' };
    }
    return null;
  }

  /**
   * Memastikan warga punya ID Nasabah sebelum setorannya dicatat:
   *   - sudah terdaftar → dicari lewat ID Nasabah / NIK yang diisi
   *   - belum terdaftar → didaftarkan sekarang, ID barunya dibuat server
   * @returns {Promise<{ok:boolean, id:string, nik:string, baru:boolean, pesan:string}>}
   */
  function siapkanIdNasabah(data) {
    if (statusTerdaftar() === 'ya') {
      const diisi = BankSampah.normalId($('swId').value);
      const sudahDicek = wargaTerdaftar &&
        (BankSampah.normalId(wargaTerdaftar.id) === diisi || BankSampah.normalId(wargaTerdaftar.nik) === diisi);

      const janji = sudahDicek ? Promise.resolve(wargaTerdaftar)
        : BankSampah.cekWarga(diisi).then(function (h) { return (h.ok && h.nasabah) ? h.nasabah : null; });

      return janji.then(function (n) {
        if (!n) {
          return {
            ok: false,
            pesan: 'ID Nasabah / NIK "' + diisi + '" tidak ditemukan. Periksa lagi, atau pilih ' +
              '"🆕 Belum terdaftar" kalau Anda memang baru pertama kali menyetor.',
          };
        }
        wargaTerdaftar = n;
        return { ok: true, id: n.id, nik: n.nik || '', baru: false };
      });
    }

    // Belum terdaftar → daftarkan sekarang juga.
    return BankSampah.daftarMandiri({
      nama: data.nama,
      nik: '',
      alamat: data.alamat,
      rt: data.rt,
      rw: data.rw,
      noHp: data.noHp,
    }).then(function (hasil) {
      if (hasil.ok && hasil.id) return { ok: true, id: hasil.id, nik: '', baru: !hasil.lama };

      return {
        ok: false,
        pesan: hasil.tanpaBalasan
          ? 'Server bank sampah belum sempat menjawab, jadi ID Nasabah Anda belum bisa ' +
            'dipastikan. Tunggu sebentar lalu tekan "Kirim Setoran" sekali lagi — data Anda ' +
            'TIDAK akan terdaftar dua kali. Kalau masih gagal juga, hubungi petugas lewat WhatsApp.'
          : (hasil.pesan || 'Pendaftaran gagal.') +
            ' Setoran belum bisa dicatat. Coba lagi sebentar, atau hubungi petugas lewat WhatsApp.',
      };
    });
  }

  /* ---------------------------------------------------------------------
   *  Isi chat WhatsApp untuk pengelola
   * ------------------------------------------------------------------- */
  function susunPesanSetorWa(data, idCatatan, wargaBaru) {
    const lokasi = KONFIGURASI.BANK_SAMPAH.LOKASI || {};
    const namaTempat = lokasi.nama || 'Bank Sampah Kampung Baru';
    const harga = BankSampah.hargaJenis(data.jenis);
    const beratPakai = data.berat > 0
      ? data.berat
      : data.kantong * (KONFIGURASI.BANK_SAMPAH.KG_PER_KANTONG || 3);

    const baris = [];
    baris.push('*CATATAN SETORAN SAMPAH*');
    baris.push(namaTempat + ' — Kota Parepare');
    baris.push('');
    baris.push('Assalamu alaikum, Pak/Bu. Saya baru saja mencatat setoran sampah lewat halaman ' +
      'Bank Sampah Kampung Baru. Berikut datanya:');
    baris.push('');

    baris.push('*A. DATA WARGA*');
    baris.push('• Nama: ' + (data.nama || '-'));
    baris.push('• ID Nasabah: ' + (data.idWarga || '-') + (wargaBaru ? ' (nasabah baru)' : ''));
    if (String(data.nik || '').trim()) baris.push('• NIK: ' + data.nik);
    baris.push('• Alamat: ' + (data.alamat || '-'));
    baris.push('• RT/RW: ' + ((data.rt || '-') + ' / ' + (data.rw || '-')));
    baris.push('• No. HP/WA: ' + (data.noHp || '-'));
    baris.push('');

    baris.push('*B. SAMPAH YANG DISETOR*');
    baris.push('• Jenis: ' + BankSampah.labelJenis(data.jenis, data.jenisLain));
    if (data.berat > 0) baris.push('• Perkiraan berat: ' + angkaRamah(data.berat) + ' kg');
    if (data.kantong > 0) baris.push('• Jumlah kantong: ' + angkaRamah(data.kantong));
    if (String(data.catatan || '').trim()) baris.push('• Catatan: ' + data.catatan);
    baris.push('• Foto bukti: sudah ikut terkirim ke dashboard petugas ✅');
    baris.push('');

    baris.push('*C. PERKIRAAN PENDAPATAN*');
    baris.push('• Harga acuan: ' + BankSampah.rupiah(harga) + ' / kg');
    baris.push('• Perkiraan: ' + BankSampah.rupiah(beratPakai * harga));
    baris.push('_(angka pastinya mengikuti timbangan petugas)_');
    baris.push('');

    baris.push('Tanggal & jam: ' + waktuRamahSekarang());
    if (idCatatan) baris.push('Nomor catatan: ' + idCatatan);
    baris.push('');
    baris.push('Mohon setoran saya diperiksa dan disetujui, ya Pak/Bu. Terima kasih banyak 🙏');
    baris.push('');
    baris.push('_Pesan ini dibuat otomatis dari halaman Bank Sampah Kampung Baru._');

    return baris.join('\n');
  }

  /* ---------------------------------------------------------------------
   *  Kotak "setoran terkirim"
   * ------------------------------------------------------------------- */
  function bukaModalSetor(hasilId, hasilKirim) {
    const modal = $('modalSetor');

    const pratinjau = $('setorPratinjau');
    if (pratinjau) pratinjau.textContent = pesanSetorWa;
    const kirim = $('setorKirim');
    if (kirim) kirim.href = tautanWa(pesanSetorWa);

    // Warga baru perlu tahu ID Nasabahnya untuk mengecek tabungan nanti.
    const kotakId = $('setorIdBaru');
    if (kotakId) {
      kotakId.classList.toggle('tersembunyi', !hasilId.id);
      $('setorIdNilai').textContent = hasilId.id || '—';
    }

    const ket = $('setorKet');
    if (ket) {
      ket.innerHTML = hasilKirim.tanpaBalasan
        ? 'Server bank sampah <strong>belum sempat menjawab</strong>, jadi catatan Anda belum ' +
          'bisa dipastikan masuk. <strong>Tetap kirim chat WhatsApp di bawah</strong> supaya ' +
          'petugas tahu setoran Anda.'
        : 'Catatan setoran Anda sudah masuk ke dashboard petugas dan sedang ' +
          '<strong>menunggu persetujuan</strong>. Langkah terakhir: kirim chat ke pengelola ' +
          'supaya beliau langsung tahu.';
    }

    // Bila hasil cek warga yang sama sedang terbuka di atas halaman, segarkan
    // diam-diam supaya setoran yang baru dikirim langsung terlihat di
    // "Riwayat Setoran Anda" dengan status "Menunggu Persetujuan".
    if (wargaAktif && hasilId.id &&
        BankSampah.normalId(wargaAktif.id) === BankSampah.normalId(hasilId.id)) {
      cari(hasilId.id, { senyap: true });
    }

    if (!modal) {
      window.open(tautanWa(pesanSetorWa), '_blank', 'noopener');
      return;
    }
    modal.classList.add('tampil');
    modal.setAttribute('aria-hidden', 'false');

    try { localStorage.setItem(KUNCI_ID_TERAKHIR, BankSampah.normalId(hasilId.id)); } catch (e) {}
  }

  function tutupModalSetor() {
    const modal = $('modalSetor');
    if (!modal) return;
    modal.classList.remove('tampil');
    modal.setAttribute('aria-hidden', 'true');
  }

  function wiringModalSetor() {
    const modal = $('modalSetor');
    if (!modal) return;

    const tutup = $('setorTutup');
    const latar = $('setorLatar');
    if (tutup) tutup.addEventListener('click', tutupModalSetor);
    if (latar) latar.addEventListener('click', tutupModalSetor);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modal.classList.contains('tampil')) tutupModalSetor();
    });

    const salin = $('setorSalin');
    if (salin) salin.addEventListener('click', function () { salinTeks(pesanSetorWa); });

    const lagi = $('setorLagi');
    if (lagi) {
      lagi.addEventListener('click', function () {
        tutupModalSetor();
        bersihkanFormSetor();
        document.getElementById('setor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /** Mengosongkan bagian setorannya saja — data diri sengaja dibiarkan,
   *  supaya warga yang menyetor beberapa jenis tidak mengetik ulang. */
  function bersihkanFormSetor() {
    const terpilih = document.querySelector('input[name="swJenis"]:checked');
    if (terpilih) terpilih.checked = false;
    $('swKotakLain').classList.add('tersembunyi');
    ['swJenisLain', 'swBerat', 'swKantong', 'swCatatan'].forEach(function (id) { $(id).value = ''; });
    hapusFoto();
    pesanKe('swPesan', '');
  }

})();
