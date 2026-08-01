/* ============================================================================
 *  KONTAK BANTUAN — anggota KKN yang mengurus sistem webnya
 *  ----------------------------------------------------------------------------
 *  Petugas & pengelola bank sampah cukup mengurus DATA WARGA. Semua urusan
 *  teknis — dashboard error, lupa kata sandi, data tidak muncul, ingin
 *  menambah jenis sampah — bukan tugas mereka. Karena itu setiap layar yang
 *  bermasalah selalu menunjuk ke SATU orang yang bisa dihubungi lewat
 *  WhatsApp, bukan menyuruh mereka mengutak-atik sendiri.
 *
 *  Nama & nomornya diambil dari KONFIGURASI.BANTUAN (js/config.js), jadi bila
 *  penanggung jawabnya berganti orang cukup diubah di SATU tempat.
 *
 *  Cara memakainya di halaman HTML — tulis saja salah satu kelas berikut,
 *  isinya diisikan sendiri saat halaman dibuka:
 *
 *    <span class="bantuan-sebut"></span>   → "Ahmad Ghulam Ghazi (WA 0897-…)"
 *    <span class="bantuan-nama"></span>    → "Ahmad Ghulam Ghazi"
 *    <span class="bantuan-peran"></span>   → "Anggota KKN 116 · WA 0897-…"
 *    <a class="bantuan-wa">Chat</a>        → alamat wa.me-nya dipasangkan
 * ========================================================================== */

const Bantuan = (function () {
  'use strict';

  /* Pembuka chat WhatsApp — supaya petugas tidak bingung harus menulis apa. */
  const PEMBUKA_WA = 'Halo {nama}, saya pengelola Bank Sampah Kampung Baru. ' +
    'Ada kendala pada website/dashboard: ';

  function data() {
    const b = (typeof KONFIGURASI !== 'undefined' && KONFIGURASI.BANTUAN) || {};
    return {
      nama: String(b.nama || 'anggota KKN 116').trim(),
      peran: String(b.peran || 'Anggota KKN').trim(),
      wa: String(b.wa || '').replace(/\D/g, ''),
      waTampil: String(b.waTampil || b.wa || '').trim(),
    };
  }

  /** "Ahmad Ghulam Ghazi (WA 0897-9802-427)" — siap ditempel di kalimat. */
  function sebut() {
    const b = data();
    return b.nama + (b.waTampil ? ' (WA ' + b.waTampil + ')' : '');
  }

  /** Kalimat penutup untuk pesan gangguan di layar. */
  function saranHubungi() {
    return 'Tidak perlu diperbaiki sendiri — hubungi ' + sebut() + '.';
  }

  /** Alamat chat WhatsApp yang pesannya sudah terisi separuh. */
  function tautanWa() {
    const b = data();
    if (!b.wa) return '';
    return 'https://wa.me/' + b.wa + '?text=' +
      encodeURIComponent(PEMBUKA_WA.replace('{nama}', b.nama));
  }

  /** Mengisi semua penanda kontak bantuan yang ada di halaman ini. */
  function isiHalaman() {
    const b = data();
    const tautan = tautanWa();

    const isi = function (kelas, teks) {
      document.querySelectorAll(kelas).forEach(function (e) { e.textContent = teks; });
    };
    isi('.bantuan-sebut', sebut());
    isi('.bantuan-nama', b.nama);
    isi('.bantuan-peran', b.peran + (b.waTampil ? ' · WA ' + b.waTampil : ''));

    document.querySelectorAll('a.bantuan-wa').forEach(function (a) {
      // Tautannya hanya dipasang bila nomornya memang terisi, supaya tidak ada
      // tombol yang bisa diklik tetapi tidak membuka apa-apa.
      if (!tautan) { a.removeAttribute('href'); return; }
      a.href = tautan;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  document.addEventListener('DOMContentLoaded', isiHalaman);

  return {
    data: data,
    sebut: sebut,
    saranHubungi: saranHubungi,
    tautanWa: tautanWa,
    isiHalaman: isiHalaman,
  };
})();
