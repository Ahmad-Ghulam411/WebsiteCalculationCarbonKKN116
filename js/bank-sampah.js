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
  let sedangMencatat = false; // penjaga agar satu pengajuan tidak tercatat dobel

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    isiInfoKontak();
    isiDaftarHarga();
    wiringNavigasi();
    wiringForm();
    wiringModalCair();
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

  /**
   * Menyalakan / mematikan tombol "Ajukan Pencairan lewat WhatsApp".
   *
   * Aturannya sederhana, mengikuti kesepakatan bank sampah:
   *   1. Ada pengajuan yang belum diproses petugas  → tombol MATI.
   *      Satu warga hanya boleh mengajukan SEKALI, sampai uangnya benar-benar
   *      dicairkan (atau pengajuannya ditolak) oleh petugas.
   *   2. Tidak ada tabungan yang belum dicairkan     → tombol MATI.
   *      Warga tinggal menyetor sampah lagi supaya tombolnya hidup kembali.
   *   3. Selain itu (ada tabungan, tidak ada pengajuan tertunda) → tombol HIDUP,
   *      berapa pun jumlah tabungannya. Tidak ada batas minimal, kecuali
   *      pengelola sengaja mengisi MIN_PENCAIRAN di js/config.js.
   */
  function aturTombolCair(r) {
    const tombol = $('tombolCair');
    const info = $('bsCairInfo');
    const minimal = KONFIGURASI.BANK_SAMPAH.MIN_PENCAIRAN || 0;

    tombol.classList.remove('tombol-nonaktif');
    tombol.disabled = false;
    tombol.textContent = '💬 Ajukan Pencairan lewat WhatsApp';

    /* 1. Sudah pernah mengajukan & belum diproses petugas. */
    if (r.pengajuanMenunggu) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      tombol.textContent = '⏳ Pengajuan Sedang Diproses';
      info.className = 'bs-cair-info bs-cair-tunggu';
      info.textContent = 'Anda sudah mengajukan pencairan sebesar ' +
        BankSampah.rupiah(r.pengajuanMenunggu.jumlah) + ' pada ' +
        tanggalRamah(r.pengajuanMenunggu.tanggal) +
        '. Cukup sekali mengajukan — mohon tunggu petugas memprosesnya, ya. 🙏 ' +
        'Setelah uangnya Anda terima, tombol ini hidup lagi begitu Anda menyetor sampah berikutnya.';
      return;
    }

    /* 2. Belum ada tabungan baru — semuanya sudah dicairkan. */
    if (r.belumCair <= 0) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      info.className = 'bs-cair-info';
      info.textContent = 'Belum ada pendapatan baru yang bisa dicairkan. ' +
        'Setor sampah lagi — begitu setoran Anda dicatat petugas, tombol pengajuan ' +
        'langsung hidup kembali. 🌱';
      return;
    }

    /* 3. Batas minimal — hanya berlaku bila pengelola sengaja mengisinya. */
    if (minimal > 0 && r.belumCair < minimal) {
      tombol.disabled = true;
      tombol.classList.add('tombol-nonaktif');
      info.className = 'bs-cair-info';
      info.textContent = 'Pencairan bisa diajukan bila tabungan sudah mencapai ' +
        BankSampah.rupiah(minimal) + '. Tabungan Anda sekarang ' +
        BankSampah.rupiah(r.belumCair) + ' — tinggal ' +
        BankSampah.rupiah(minimal - r.belumCair) + ' lagi. 💪';
      return;
    }

    /* 4. Siap diajukan. */
    info.className = 'bs-cair-info bs-cair-siap';
    info.textContent = '✅ Tabungan Anda sebesar ' + BankSampah.rupiah(r.belumCair) +
      ' sudah bisa dicairkan sekarang. Tekan tombol di bawah — pengajuannya langsung ' +
      'dikirim ke WhatsApp pengelola bank sampah. Cukup ajukan sekali, ya.';
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

    /* Pengaman tambahan — satu pengajuan saja sampai petugas memprosesnya. */
    if (ringkasanAktif.pengajuanMenunggu) {
      toast('⏳ Pengajuan Anda sebelumnya masih diproses petugas. Mohon ditunggu, ya.');
      return;
    }
    if (ringkasanAktif.belumCair <= 0) {
      toast('ℹ️ Belum ada tabungan baru yang bisa dicairkan. Setor sampah lagi, ya. 🌱');
      return;
    }

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

  /**
   * Mencatat pengajuan ke buku petugas agar muncul di dashboard admin.
   * Dijaga supaya SATU pengajuan hanya tercatat sekali, walau tombol
   * "Kirim lewat WhatsApp" tidak sengaja ditekan berkali-kali.
   */
  function catatPengajuan() {
    if (!wargaAktif || !ringkasanAktif) return;
    if (sedangMencatat) return;
    const id = wargaAktif.id;

    sedangMencatat = true;
    BankSampah.ajukanPencairan(id, wargaAktif.nama, ringkasanAktif.belumCair)
      .then(function (hasil) {
        if (hasil.ok || hasil.tanpaBalasan) {
          toast('✅ Pengajuan dicatat. Jangan lupa tekan "kirim" di WhatsApp, ya.');
        } else {
          toast('ℹ️ ' + hasil.pesan + ' Pengajuan lewat WhatsApp tetap bisa diteruskan.');
        }
        cari(id); // muat ulang agar status terbaru terlihat
      })
      .then(function () { sedangMencatat = false; },
            function () { sedangMencatat = false; });
  }

  /** Menyalin isi pesan — untuk warga yang tidak memakai WhatsApp. */
  function salinPesanWa() {
    if (!pesanWaAktif) return;

    const beritahu = function (berhasil) {
      toast(berhasil
        ? '📋 Isi pesan sudah disalin.'
        : '❌ Tidak bisa menyalin otomatis. Silakan salin dari kotak pratinjau.');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pesanWaAktif).then(
        function () { beritahu(true); },
        function () { beritahu(salinCaraLama(pesanWaAktif)); }
      );
      return;
    }
    beritahu(salinCaraLama(pesanWaAktif));
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

})();
