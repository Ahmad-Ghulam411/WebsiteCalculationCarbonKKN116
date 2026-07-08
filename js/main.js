/* ============================================================================
 *  INTERAKSI HALAMAN (main.js)
 *  ----------------------------------------------------------------------------
 *  Menghubungkan formulir, perhitungan, hasil, animasi, penyimpanan data,
 *  dashboard admin, navigasi, dan pop-up saran.
 * ========================================================================== */

(function () {
  'use strict';

  const kurangiGerak = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    isiInfoKontak();
    wiringNavigasi();
    wiringModeListrik();
    wiringFormulir();
    wiringModal();
    wiringAdmin();
    wiringReveal();
    setTahunFooter();
  }

  /* ---------- Bantu ---------- */
  function $(id) { return document.getElementById(id); }
  function teks(id) { const e = $(id); return e ? e.value.trim() : ''; }
  function angka(id) {
    const e = $(id);
    if (!e) return 0;
    const n = parseFloat(String(e.value).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : Math.max(0, n);
  }
  function nilaiRadio(nama) {
    const r = document.querySelector('input[name="' + nama + '"]:checked');
    return r ? r.value : '';
  }
  function formatAngka(n) {
    return Number(n).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---------- Info kontak (footer) ---------- */
  function isiInfoKontak() {
    const k = KONFIGURASI.KONTAK;
    const setTeks = function (id, v) { const e = $(id); if (e) e.textContent = v; };
    setTeks('kontakInstansi', k.instansi);
    setTeks('kontakAlamat', k.alamat);
    const tel = $('kontakTelepon');
    if (tel) { tel.textContent = k.telepon; tel.href = 'tel:' + k.telepon.replace(/\s/g, ''); }
  }

  function setTahunFooter() {
    const e = $('tahunFooter');
    if (e) e.textContent = new Date().getFullYear();
  }

  /* ---------- Navigasi (menu HP + scroll halus) ---------- */
  function wiringNavigasi() {
    const tombol = $('navToggle');
    const menu = $('navMenu');
    if (tombol && menu) {
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
  }

  /* ---------- Toggle mode listrik (kWh / Tagihan) ---------- */
  function wiringModeListrik() {
    const radios = document.querySelectorAll('input[name="modeListrik"]');
    const grupKwh = $('grupKwh');
    const grupTagihan = $('grupTagihan');
    function perbarui() {
      const mode = nilaiRadio('modeListrik') || 'kwh';
      if (grupKwh) grupKwh.classList.toggle('tersembunyi', mode !== 'kwh');
      if (grupTagihan) grupTagihan.classList.toggle('tersembunyi', mode !== 'tagihan');
    }
    radios.forEach(function (r) { r.addEventListener('change', perbarui); });
    perbarui();
  }

  /* ---------- Ambil data dari formulir ---------- */
  function ambilData() {
    return {
      nama: teks('nama'),
      alamat: teks('alamat'),
      anggotaKeluarga: angka('anggotaKeluarga'),
      noHp: teks('noHp'),
      modeListrik: nilaiRadio('modeListrik') || 'kwh',
      kwhListrik: angka('kwhListrik'),
      tagihanListrik: angka('tagihanListrik'),
      jenisTabung: angka('jenisTabung'),
      jumlahTabung: angka('jumlahTabung'),
      bensinMinggu: angka('bensinMinggu'),
      memilah: nilaiRadio('memilah') === 'Ya',
      mengompos: nilaiRadio('mengompos') === 'Ya',
      membakar: nilaiRadio('membakar') === 'Ya',
      kantongMinggu: angka('kantongMinggu'),
      acJam: angka('acJam'),
      transUmumMinggu: angka('transUmumMinggu'),
      barangBaruBulan: angka('barangBaruBulan'),
      dagingMinggu: angka('dagingMinggu'),
    };
  }

  /* ---------- Formulir dikirim ---------- */
  function wiringFormulir() {
    const form = $('formKarbon');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const data = ambilData();

      // Validasi ringan: minimal nama diisi
      if (!data.nama) {
        const e = $('nama');
        e.focus();
        e.classList.add('input-salah');
        setTimeout(function () { e.classList.remove('input-salah'); }, 1500);
        return;
      }

      const hasil = hitungEmisi(data);
      const kategori = tentukanKategori(hasil.total);
      const daftarSaran = buatSaran(data, hasil);

      tampilkanHasil(data, hasil, kategori, daftarSaran);
      simpanRecord(data, hasil, kategori);
    });
  }

  /* ---------- Tampilkan hasil ---------- */
  function tampilkanHasil(data, hasil, kategori, daftarSaran) {
    const bagian = $('hasil');
    bagian.classList.remove('tersembunyi');
    // Paksa reflow agar animasi muncul
    void bagian.offsetWidth;
    bagian.classList.add('tampil');

    // Total (angka menghitung naik)
    const elTotal = $('hasilTotal');
    if (kurangiGerak) {
      elTotal.textContent = formatAngka(hasil.total);
    } else {
      animasiAngka(elTotal, hasil.total, 1100);
    }

    // Kategori
    const badge = $('hasilKategori');
    badge.className = 'kategori-badge ' + kategori.kelas;
    $('hasilKategoriIkon').textContent = kategori.ikon;
    $('hasilKategoriNama').textContent = 'Jejak Karbon ' + kategori.nama;
    $('hasilKategoriKet').textContent = kategori.keterangan;

    // Meteran / gauge
    aturGauge(hasil.total, kategori);

    // Rincian per sumber
    aturRincian(hasil.rincian);

    // Saran
    aturSaran(daftarSaran);

    // Gulir ke hasil
    setTimeout(function () {
      bagian.scrollIntoView({ behavior: kurangiGerak ? 'auto' : 'smooth', block: 'start' });
    }, 120);

    // Pop-up saran otomatis
    setTimeout(function () { bukaModal(kategori, daftarSaran); }, kurangiGerak ? 200 : 900);
  }

  function animasiAngka(elemen, target, durasi) {
    const mulai = performance.now();
    function langkah(now) {
      const t = Math.min(1, (now - mulai) / durasi);
      const eased = 1 - Math.pow(1 - t, 3);
      elemen.textContent = formatAngka(target * eased);
      if (t < 1) requestAnimationFrame(langkah);
      else elemen.textContent = formatAngka(target);
    }
    requestAnimationFrame(langkah);
  }

  function aturGauge(total, kategori) {
    const isi = $('gaugeIsi');
    const skalaMaks = KONFIGURASI.AMBANG_KATEGORI.sedang_maks * 2; // mis. 30 kg
    const persen = Math.max(4, Math.min(100, (total / skalaMaks) * 100));
    isi.className = 'gauge-isi ' + kategori.kelas;
    // animasikan lebar
    isi.style.width = '0%';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { isi.style.width = persen + '%'; });
    });
  }

  function aturRincian(rincian) {
    const daftar = [
      { kunci: 'listrik', label: 'Listrik', ikon: '💡' },
      { kunci: 'gas', label: 'Gas Elpiji', ikon: '🔥' },
      { kunci: 'kendaraan', label: 'Kendaraan', ikon: '🛵' },
      { kunci: 'sampah', label: 'Sampah', ikon: '🗑️' },
      { kunci: 'lain', label: 'Lain-lain', ikon: '🏠' },
    ];
    const total = daftar.reduce(function (s, d) { return s + (rincian[d.kunci] || 0); }, 0) || 1;
    const wadah = $('hasilRincian');
    wadah.innerHTML = '';
    daftar.forEach(function (d) {
      const nilai = rincian[d.kunci] || 0;
      const persen = Math.round((nilai / total) * 100);
      const baris = document.createElement('div');
      baris.className = 'rincian-baris';
      baris.innerHTML =
        '<div class="rincian-label"><span class="rincian-ikon">' + d.ikon + '</span>' + d.label +
        '<span class="rincian-nilai">' + formatAngka(nilai) + ' kg</span></div>' +
        '<div class="rincian-bar"><div class="rincian-bar-isi ' + d.kunci + '" style="width:0%"></div></div>';
      wadah.appendChild(baris);
      const isi = baris.querySelector('.rincian-bar-isi');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { isi.style.width = persen + '%'; });
      });
    });
  }

  function aturSaran(daftarSaran) {
    const ul = $('hasilSaran');
    ul.innerHTML = '';
    daftarSaran.forEach(function (s, i) {
      const li = document.createElement('li');
      li.textContent = s;
      li.style.animationDelay = (i * 60) + 'ms';
      ul.appendChild(li);
    });
  }

  /* ---------- Simpan ke database ---------- */
  function simpanRecord(data, hasil, kategori) {
    const record = {
      waktu: new Date().toLocaleString('id-ID'),
      nama: data.nama,
      alamat: data.alamat,
      anggotaKeluarga: data.anggotaKeluarga,
      noHp: data.noHp,
      modeListrik: data.modeListrik === 'tagihan' ? 'Tagihan (Rp)' : 'kWh',
      nilaiListrik: data.modeListrik === 'tagihan' ? data.tagihanListrik : data.kwhListrik,
      kwhBulan: hasil.kwhBulan,
      jenisTabung: data.jenisTabung,
      jumlahTabung: data.jumlahTabung,
      bensinMinggu: data.bensinMinggu,
      memilah: data.memilah ? 'Ya' : 'Tidak',
      mengompos: data.mengompos ? 'Ya' : 'Tidak',
      membakar: data.membakar ? 'Ya' : 'Tidak',
      kantongMinggu: data.kantongMinggu,
      acJam: data.acJam,
      transUmumMinggu: data.transUmumMinggu,
      barangBaruBulan: data.barangBaruBulan,
      dagingMinggu: data.dagingMinggu,
      emisiListrik: hasil.rincian.listrik,
      emisiGas: hasil.rincian.gas,
      emisiKendaraan: hasil.rincian.kendaraan,
      emisiSampah: hasil.rincian.sampah,
      emisiLain: hasil.rincian.lain,
      total: hasil.total,
      kategori: kategori.nama,
    };
    simpanData(record).then(function (res) {
      if (res.status === 'terkirim') tampilkanToast('✅ Data Anda tersimpan. Terima kasih sudah ikut menjaga lingkungan!');
      else if (res.status === 'lokal') tampilkanToast('✅ Data tersimpan di perangkat ini.');
      else tampilkanToast('⚠️ Data tersimpan sementara di perangkat (koneksi ke server gagal).');
    });
  }

  let toastTimer = null;
  function tampilkanToast(pesan) {
    const t = $('toast');
    if (!t) return;
    t.textContent = pesan;
    t.classList.add('tampil');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('tampil'); }, 4200);
  }

  /* ---------- Modal saran ---------- */
  function bukaModal(kategori, daftarSaran) {
    const modal = $('modalSaran');
    if (!modal) return;
    $('modalIkon').textContent = kategori.ikon;
    $('modalJudul').textContent = 'Jejak Karbon Anda: ' + kategori.nama;
    $('modalKet').textContent = kategori.keterangan;
    const ul = $('modalSaranDaftar');
    ul.innerHTML = '';
    daftarSaran.slice(0, 6).forEach(function (s) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
    modal.classList.add('tampil');
    modal.setAttribute('aria-hidden', 'false');
  }

  function tutupModal() {
    const modal = $('modalSaran');
    if (modal) { modal.classList.remove('tampil'); modal.setAttribute('aria-hidden', 'true'); }
  }

  function wiringModal() {
    const modal = $('modalSaran');
    if (!modal) return;
    $('modalTutup').addEventListener('click', tutupModal);
    modal.querySelector('.modal-latar').addEventListener('click', tutupModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { tutupModal(); tutupAdmin(); } });
  }

  /* ---------- Dashboard admin ---------- */
  function bukaAdmin() {
    const panel = $('panelAdmin');
    panel.classList.add('tampil');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(function () { const p = $('adminPassword'); if (p) p.focus(); }, 200);
  }
  function tutupAdmin() {
    const panel = $('panelAdmin');
    if (panel) { panel.classList.remove('tampil'); panel.setAttribute('aria-hidden', 'true'); }
  }

  function wiringAdmin() {
    const buka = $('bukaAdmin');
    if (buka) buka.addEventListener('click', function (e) { e.preventDefault(); bukaAdmin(); });
    const tutup = $('adminTutup');
    if (tutup) tutup.addEventListener('click', tutupAdmin);
    const latar = document.querySelector('#panelAdmin .modal-latar');
    if (latar) latar.addEventListener('click', tutupAdmin);

    const masukBtn = $('adminMasukBtn');
    if (masukBtn) masukBtn.addEventListener('click', Admin.masuk);
    const pass = $('adminPassword');
    if (pass) pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') Admin.masuk(); });

    const muatBtn = $('adminMuatBtn');
    if (muatBtn) muatBtn.addEventListener('click', Admin.muat);
    const xlsxBtn = $('adminUnduhXlsx');
    if (xlsxBtn) xlsxBtn.addEventListener('click', Admin.unduhExcel);
    const csvBtn = $('adminUnduhCsv');
    if (csvBtn) csvBtn.addEventListener('click', Admin.unduhCsv);
  }

  /* ---------- Animasi muncul saat digulir ---------- */
  function wiringReveal() {
    const target = document.querySelectorAll('.reveal');
    if (kurangiGerak || !('IntersectionObserver' in window)) {
      target.forEach(function (t) { t.classList.add('terlihat'); });
      return;
    }
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('terlihat');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    target.forEach(function (t) { obs.observe(t); });
  }

})();
