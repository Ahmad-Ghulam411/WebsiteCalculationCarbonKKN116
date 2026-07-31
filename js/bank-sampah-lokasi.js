/* ============================================================================
 *  LOKASI & KONTAK WHATSAPP PENGELOLA BANK SAMPAH
 *  ----------------------------------------------------------------------------
 *  Dipakai di SEMUA halaman yang menampilkan peta / nomor WA pengelola
 *  (index.html & bank-sampah.html). Isinya diambil dari
 *  KONFIGURASI.BANK_SAMPAH.PENGELOLA dan .LOKASI di js/config.js — jadi bila
 *  nomor WA atau titik lokasinya berubah, cukup ubah di satu tempat saja.
 *
 *  Cara pakai di HTML (nilai di dalam HTML tetap ditulis sebagai cadangan,
 *  supaya halaman tetap benar walau JavaScript tidak jalan):
 *
 *    <span data-bs-wa-teks>+62 813-5521-0234</span>   → nomor WA
 *    <a data-bs-wa-link href="…">…</a>                → tautan chat WhatsApp
 *    <span data-bs-lokasi-nama>…</span>               → nama tempat
 *    <span data-bs-lokasi-alamat>…</span>             → alamat
 *    <span data-bs-lokasi-patokan>…</span>            → patokan (belakang Posyandu)
 *    <span data-bs-lokasi-koordinat>…</span>          → titik koordinat
 *    <a data-bs-peta-link href="…">…</a>              → buka di Google Maps
 *    <a data-bs-arah-link href="…">…</a>              → petunjuk arah
 * ========================================================================== */

const BankSampahKontak = (function () {
  'use strict';

  function pengelola() {
    return (window.KONFIGURASI && KONFIGURASI.BANK_SAMPAH && KONFIGURASI.BANK_SAMPAH.PENGELOLA) || {};
  }

  function lokasi() {
    return (window.KONFIGURASI && KONFIGURASI.BANK_SAMPAH && KONFIGURASI.BANK_SAMPAH.LOKASI) || {};
  }

  /** Nomor WhatsApp dalam bentuk yang diterima wa.me (hanya angka, awalan 62). */
  function nomorWa() {
    let nomor = String(pengelola().wa || '').replace(/[^0-9]/g, '');
    if (nomor.indexOf('0') === 0) nomor = '62' + nomor.slice(1); // 0813… → 62813…
    return nomor;
  }

  /** Nomor WhatsApp yang enak dibaca warga di layar. */
  function nomorWaTampil() {
    return pengelola().waTampil || pengelola().wa || '';
  }

  /**
   * Tautan chat WhatsApp ke pengelola bank sampah.
   * @param {string} [pesan] - isi chat yang sudah disiapkan (boleh kosong).
   */
  function tautanWa(pesan) {
    const nomor = nomorWa();
    if (!nomor) return '';
    const teks = String(pesan || '').trim();
    return 'https://wa.me/' + nomor + (teks ? '?text=' + encodeURIComponent(teks) : '');
  }

  function koordinat() {
    const l = lokasi();
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return '';
    return l.lat + ',' + l.lng;
  }

  /** Membuka titik lokasi di aplikasi/situs Google Maps. */
  function tautanPeta() {
    const titik = koordinat();
    return titik ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(titik) : '';
  }

  /** Petunjuk arah dari posisi warga menuju bank sampah. */
  function tautanArah() {
    const titik = koordinat();
    return titik ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(titik) : '';
  }

  /* ---------------------------------------------------------------------
   *  Mengisi bagian-bagian halaman
   * ------------------------------------------------------------------- */
  function isiTeks(penanda, nilai) {
    if (!nilai) return;
    document.querySelectorAll('[' + penanda + ']').forEach(function (el) {
      el.textContent = nilai;
    });
  }

  function isiTautan(penanda, alamat) {
    if (!alamat) return;
    document.querySelectorAll('[' + penanda + ']').forEach(function (el) {
      el.href = alamat;
    });
  }

  function isiHalaman() {
    const l = lokasi();

    isiTeks('data-bs-wa-teks', nomorWaTampil());
    isiTeks('data-bs-pengelola-nama', pengelola().nama);
    isiTeks('data-bs-lokasi-nama', l.nama);
    isiTeks('data-bs-lokasi-alamat', l.alamat);
    isiTeks('data-bs-lokasi-patokan', l.patokan);

    const titik = koordinat();
    if (titik) isiTeks('data-bs-lokasi-koordinat', titik.replace(',', ', '));

    isiTautan('data-bs-wa-link', tautanWa(
      'Assalamu alaikum, saya warga Kampung Baru. Saya ingin bertanya tentang ' +
      (l.nama || 'bank sampah') + '. Terima kasih 🙏'
    ));
    isiTautan('data-bs-peta-link', tautanPeta());
    isiTautan('data-bs-arah-link', tautanArah());
  }

  document.addEventListener('DOMContentLoaded', isiHalaman);

  return {
    nomorWa: nomorWa,
    nomorWaTampil: nomorWaTampil,
    tautanWa: tautanWa,
    tautanPeta: tautanPeta,
    tautanArah: tautanArah,
    isiHalaman: isiHalaman,
  };
})();
