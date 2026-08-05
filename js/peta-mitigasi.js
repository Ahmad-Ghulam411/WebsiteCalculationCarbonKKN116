/* ============================================================================
 *  PETA MITIGASI BENCANA — KELURAHAN KAMPUNG BARU, BACUKIKI BARAT, PAREPARE
 *
 *  Peta interaktif berbasis Leaflet. Semua data (batas kelurahan, zona rawan,
 *  jaringan jalan, jalur evakuasi, fasilitas) dimuat dari
 *  data/peta-mitigasi-data.js sebagai window.DATA_PETA_MITIGASI.
 * ========================================================================== */
(function () {
  'use strict';

  var D = window.DATA_PETA_MITIGASI;
  var wadah = document.getElementById('petaMitigasi');
  var bingkai = document.querySelector('.pm-peta-bingkai');
  if (!wadah) return;

  if (!D || typeof L === 'undefined') {
    wadah.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;' +
      'padding:28px;text-align:center;color:#4f6259;font-size:.95rem;line-height:1.6">' +
      '<div><strong style="display:block;font-size:1.05rem;color:#0e5e33;margin-bottom:6px">' +
      'Peta belum bisa ditampilkan</strong>' +
      'Sepertinya perangkat sedang tidak terhubung ke internet.<br>' +
      'Silakan periksa koneksi lalu muat ulang halaman ini.</div></div>';
    return;
  }

  var TK = D.titikKumpul;
  var TK_LATLNG = L.latLng(TK.lat, TK.lon);

  var WARNA = {
    merah:  { isi: '#d32f2f', garis: '#8e1616', alpha: 0.52, kepala: 'pm-kepala-merah',  aksi: 'is-bahaya' },
    kuning: { isi: '#f2b705', garis: '#a37700', alpha: 0.50, kepala: 'pm-kepala-kuning', aksi: 'is-siaga' },
    hijau:  { isi: '#43a047', garis: '#1b5e20', alpha: 0.38, kepala: 'pm-kepala-hijau',  aksi: '' }
  };

  /* ----------------------------------------------------------------- utilitas */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtKoordinat(lat, lon) {
    return lat.toFixed(6) + ', ' + lon.toFixed(6);
  }

  /* Layar ponsel sempit (tegak) atau pendek (mendatar). Ambangnya sama dengan
     css/peta-mitigasi.css dan dibaca ulang tiap kali dibutuhkan, jadi tetap
     benar setelah layar diputar.

     Dulu ini juga dipakai memilih dua versi teks popup: panjang untuk layar
     lebar, pendek untuk ponsel. Sekarang seluruh kotak info memakai versi
     pendeknya di semua ukuran layar — kotak yang tinggi memaksa Leaflet
     menggeser peta saat dibuka, dan titik yang baru diketuk warga ikut hilang
     dari pandangan. Rinciannya tidak hilang, hanya pindah ke panel penunjuk
     arah yang menyajikannya langkah demi langkah. */
  var MQ_KECIL = window.matchMedia('(max-width: 700px), (max-height: 500px)');
  function layarKecil() { return MQ_KECIL.matches; }

  /** Bagian kotak info yang hanya muat di layar lapang. Di ponsel petanya
      pendek, jadi tiap baris tambahan langsung terasa: kotak yang tinggi
      memaksa Leaflet menggeser peta lebih jauh saat popup dibuka. Yang
      dilewati di sini selalu ada penggantinya — perkiraan waktu jalan kaki
      dan petunjuk beloknya tersaji lengkap di panel penunjuk arah, dan nama
      zonanya sudah tertulis besar di kepala popup. */
  function bilaLapang(html) { return layarKecil() ? '' : html; }

  /** Jarak bulat-bumi (haversine) dalam meter. */
  function jarakMeter(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lng - a.lng) * rad;
    var la1 = a.lat * rad, la2 = b.lat * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function fmtJarak(m) {
    return m < 950 ? Math.round(m / 5) * 5 + ' m' : (m / 1000).toFixed(2) + ' km';
  }

  /** Perkiraan waktu jalan kaki cepat (~4,5 km/jam). */
  function fmtWaktuSingkat(m) {
    return '± ' + Math.max(1, Math.round(m / 75)) + ' menit';
  }

  /** Satu baris padat "jarak · arah · waktu" menuju titik kumpul.
      Dipakai di semua kotak info supaya tingginya seragam dan sependek
      mungkin: kotak yang tinggi memaksa Leaflet menggeser peta saat dibuka. */
  function barisKeTK(dari) {
    var jarak = jarakMeter(dari, TK_LATLNG);
    return '<div class="pm-popup-baris"><b>Titik kumpul</b><span>' + fmtJarak(jarak) +
           ' ke <strong>' + arahKe(dari, TK_LATLNG).nama + '</strong>' +
           // Di ponsel perkiraan waktu membuat baris ini patah jadi dua —
           // angkanya tetap tersaji besar-besar di panel penunjuk arah.
           bilaLapang(' · ' + fmtWaktuSingkat(jarak)) + '</span></div>';
  }

  var MATA_ANGIN = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];

  function arahKe(dari, ke) {
    var rad = Math.PI / 180;
    var dLon = (ke.lng - dari.lng) * rad;
    var la1 = dari.lat * rad, la2 = ke.lat * rad;
    var y = Math.sin(dLon) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    var brg = (Math.atan2(y, x) / rad + 360) % 360;
    return { derajat: brg, nama: MATA_ANGIN[Math.round(brg / 45) % 8] };
  }

  /* ------------------------------------------------- pencarian zona (titik-poligon) */

  /** Ray casting pada satu cincin GeoJSON ([lon,lat], ...). */
  function diDalamCincin(cincin, lon, lat) {
    var di = false;
    for (var i = 0, j = cincin.length - 1; i < cincin.length; j = i++) {
      var xi = cincin[i][0], yi = cincin[i][1];
      var xj = cincin[j][0], yj = cincin[j][1];
      if ((yi > lat) !== (yj > lat) &&
          lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
        di = !di;
      }
    }
    return di;
  }

  /** Poligon GeoJSON: cincin[0] tepi luar, sisanya lubang. */
  function diDalamPoligon(poligon, lon, lat) {
    if (!diDalamCincin(poligon[0], lon, lat)) return false;
    for (var i = 1; i < poligon.length; i++) {
      if (diDalamCincin(poligon[i], lon, lat)) return false;
    }
    return true;
  }

  function diDalamGeometri(geom, lon, lat) {
    if (geom.type === 'Polygon') return diDalamPoligon(geom.coordinates, lon, lat);
    for (var i = 0; i < geom.coordinates.length; i++) {
      if (diDalamPoligon(geom.coordinates[i], lon, lat)) return true;
    }
    return false;
  }

  /** Zona rawan pada satu koordinat, atau null bila di luar kelurahan. */
  function zonaDi(lat, lon) {
    for (var i = 0; i < D.zona.features.length; i++) {
      var f = D.zona.features[i];
      if (diDalamGeometri(f.geometry, lon, lat)) return f.properties;
    }
    return null;
  }

  function diKelurahan(lat, lon) {
    for (var i = 0; i < D.batas.features.length; i++) {
      var f = D.batas.features[i];
      if (f.properties.utama && diDalamGeometri(f.geometry, lon, lat)) return true;
    }
    return false;
  }

  /** Kelurahan mana pun (untuk titik di luar Kampung Baru). */
  function kelurahanDi(lat, lon) {
    for (var i = 0; i < D.batas.features.length; i++) {
      var f = D.batas.features[i];
      if (diDalamGeometri(f.geometry, lon, lat)) return f.properties.nama;
    }
    return null;
  }

  /* --------------------------------------------------------------- geometri garis */

  /** Titik terdekat pada sebuah ruas garis, beserta jaraknya. */
  function jarakKeRuas(p, a, b) {
    var dx = b.lng - a.lng, dy = b.lat - a.lat;
    var t = (dx || dy) ? ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy) : 0;
    t = Math.max(0, Math.min(1, t));
    var proy = L.latLng(a.lat + t * dy, a.lng + t * dx);
    return { titik: proy, jarak: jarakMeter(p, proy) };
  }

  /* --------------------------------------------------------------- peta & lapisan */

  var LAYAR_KECIL = layarKecil();

  var peta = L.map('petaMitigasi', {
    center: [-4.0199, 119.6277],
    zoom: 16,
    minZoom: 13,
    maxZoom: 19,
    // zoom pecahan: fitBounds jadi pas mengisi bingkai, tidak melompat mundur
    // satu tingkat penuh dan membuat kelurahan tampak kecil.
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    zoomControl: false,
    scrollWheelZoom: false,   // dinyalakan setelah peta diklik, agar halaman tetap enak digulir
    attributionControl: true
  });

  var citra = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, maxNativeZoom: 18, attribution: 'Citra satelit &copy; Esri, Maxar, Earthstar Geographics' }
  );
  var jalanDasar = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; Kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  citra.addTo(peta);

  // Label jalan/tempat di atas citra satelit
  var labelCitra = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, maxNativeZoom: 18, opacity: 0.85 }
  ).addTo(peta);

  L.control.zoom({ position: 'topright' }).addTo(peta);
  L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 190 }).addTo(peta);

  /* ---------------------------------- ukuran bilah keterangan di atas peta ---
     Judul peta, tombol "✕ Keluar", dan kotak peringatan duduk di satu bilah
     melayang (.pm-peta-atas). Tinggi bilah itu berubah-ubah: teks peringatan
     berpindah baris di layar sempit, tombol keluar muncul hanya saat layar
     penuh, dan judulnya memendek saat layar diputar.

     Dua hal harus mengikuti tinggi itu, dan dulu keduanya memakai angka tetap
     yang gampang meleset (sehingga tombol zoom sempat tertimpa kotak
     peringatan):
       - kontrol Leaflet di kanan atas → lewat --pm-atas-kanan (dipakai CSS);
       - ruang aman geseran otomatis popup → lewat aturRuangPopup(). */
  var bilahAtas = bingkai && bingkai.querySelector('.pm-peta-atas');
  var bilahKanan = bingkai && bingkai.querySelector('.pm-peta-atas-kanan');

  function tinggiBilah(el) {
    return el ? Math.round(el.getBoundingClientRect().height) : 0;
  }

  /** Tulis ukuran hanya bila berubah — menulis nilai yang sama akan memicu
      ResizeObserver di atas berulang tanpa guna. */
  function setUkuran(nama, nilai) {
    if (bingkai.style.getPropertyValue(nama) === nilai) return;
    bingkai.style.setProperty(nama, nilai);
  }

  function ukurBilahAtas() {
    if (!bingkai || !bilahKanan) return;
    setUkuran('--pm-atas-kanan', tinggiBilah(bilahKanan) + 'px');
  }

  /* Kotak legenda tumbuh dari sudut kanan bawah ke atas, sedangkan tombol zoom
     dan penunjuk arah utara turun dari sudut kanan atas. Di peta yang pendek
     (layar laptop tanpa mode layar penuh) keduanya bertemu di tengah dan
     legenda menutupi tombol zoom. Tinggi maksimal isi legenda karena itu
     dibatasi sisa ruang yang benar-benar ada di bawah kontrol tersebut, bukan
     sekadar sekian persen tinggi jendela. Nilai dari CSS (58vh / 40vh) tetap
     berlaku sebagai batas atas — lihat aturan `min()` di css/peta-mitigasi.css. */
  function ukurRuangLegenda() {
    if (!bingkai) return;
    var kontrol = bingkai.querySelector('.pm-kontrol');
    var isi = kontrol && kontrol.querySelector('.pm-kontrol-isi');
    var kananAtas = bingkai.querySelector('.leaflet-top.leaflet-right');
    if (!kontrol || !isi || !kananAtas) return;
    /* Legenda disembunyikan selama mode penunjuk arah. Mengukurnya saat itu
       hanya menghasilkan angka nol yang menyesatkan, jadi nilai terakhir
       dibiarkan apa adanya sampai legenda muncul kembali. */
    if (!kontrol.offsetHeight) return;
    // bagian legenda selain daftar isinya (judul + jarak tepi)
    var rangka = kontrol.offsetHeight - isi.offsetHeight;
    var sisa = kananAtas.getBoundingClientRect().bottom;
    sisa = bingkai.getBoundingClientRect().bottom - sisa - rangka - 34;
    setUkuran('--pm-legenda-isi', Math.max(120, Math.round(sisa)) + 'px');
  }

  /* Saat popup dibuka Leaflet menggeser peta agar popup masuk layar. Ruang
     amannya diperbesar supaya popup tidak berhenti di balik pita judul,
     kotak peringatan, atau legenda — dan sekarang dihitung dari tinggi bilah
     yang sebenarnya, bukan angka tetap. Di ponsel ruangnya sengaja dibiarkan
     tipis: petanya pendek dan geseran otomatis sering tertahan setMaxBounds,
     jadi kotak yang tertimpa disamarkan saja (lihat aturTumpangTindih). */
  function aturRuangPopup() {
    var kecil = layarKecil();
    /* Ruang aman ini dibuat setipis mungkin: makin besar angkanya, makin jauh
       Leaflet menggeser peta saat popup dibuka — dan warga kehilangan titik
       yang baru saja diketuknya dari pandangan. Dulu sisi atas dijaga selebar
       bilah judul (± 96 px) agar popup tidak berhenti di baliknya; sekarang
       tugas itu diambil alih aturTumpangTindih(), yang menyamarkan kotak judul
       hanya pada saat benar-benar tertimpa. Sisanya cukup sekadar jarak nafas
       dari tepi peta. */
    var atas = kecil ? 14 : 40;
    var kiri = 10, bawah = kecil ? 34 : 20;

    /* Panel penunjuk arah ikut diperhitungkan: di layar lebar ia menempel di
       kiri atas, di layar kecil menjadi lembar di sisi bawah. Tanpa ruang
       tambahan ini popup bisa berhenti tepat di baliknya. Panel sendiri selalu
       tergambar di atas popup (z-index), jadi yang perlu mengalah adalah
       popupnya. */
    var kotak = kotakPanelArah();
    if (kotak) {
      if (panelDiBawah()) bawah = Math.round(kotak.height) + 14;
      else kiri = Math.round(kotak.right - bingkai.getBoundingClientRect().left) + 14;
    }

    L.Popup.mergeOptions({
      autoPanPaddingTopLeft: L.point(kiri, atas),
      autoPanPaddingBottomRight: L.point(10, bawah)
    });
  }

  /* ------------------------------------- judul vs popup yang sedang terbuka --
     Leaflet menggeser peta agar popup tidak berhenti di balik bilah keterangan,
     tetapi geseran itu bisa mentok di batas wilayah peta (setMaxBounds) atau di
     tepi layar ponsel. Kalau sampai mentok, popup berhenti tepat di atas judul
     peta dan kedua teks itu saling menumpuk sehingga sama-sama tidak terbaca.
     Karena itu tumpang tindihnya diukur langsung: kotak yang benar-benar
     tertimpa saja yang disamarkan sementara (lihat css/peta-mitigasi.css),
     sisanya tetap terlihat. */
  var kotakJudul = bingkai && bingkai.querySelector('.pm-peta-kepala');
  var kotakPeringatan = bingkai && bingkai.querySelector('.pm-peringatan');
  /* Kotak legenda ikut diperiksa. Leaflet menaruh SELURUH kontrolnya
     (z-index 1000) di atas lapisan popup (z-index 700), jadi legenda yang
     sedang terbuka bukan cuma menutupi popup — ia juga menelan sentuhan yang
     ditujukan ke tombol di dalam popup itu. Di ponsel, popup yang berisi
     tombol "Tunjukkan Arah Jalan" sering berhenti tepat di atasnya. Elemennya
     baru dibuat saat kontrol legenda dipasang, jadi dicari belakangan. */
  var kotakLegendaTumpang = null;

  /* Popup yang sedang terbuka dicatat lewat peristiwa Leaflet, bukan dicari
     dengan querySelector('.leaflet-popup'): popup yang baru ditutup masih
     tertinggal sesaat di halaman selama animasi pudarnya, sehingga pencarian
     bisa mengukur popup yang salah. */
  var popupAktif = null;

  function bertabrakan(kotak, el) {
    if (!kotak || !el) return false;
    var b = el.getBoundingClientRect();
    var sela = 6;   // sedikit jarak nafas supaya teks tidak berdempetan
    return kotak.left < b.right + sela && kotak.right > b.left - sela &&
           kotak.top < b.bottom + sela && kotak.bottom > b.top - sela;
  }

  var tundaTumpang = false;
  function aturTumpangTindih() {
    if (!bingkai || tundaTumpang) return;
    tundaTumpang = true;
    var jalankan = function () {
      tundaTumpang = false;
      var el = popupAktif && popupAktif.getElement();
      var kotak = el ? el.getBoundingClientRect() : null;
      bingkai.classList.toggle('tumpang-judul', bertabrakan(kotak, kotakJudul));
      bingkai.classList.toggle('tumpang-peringatan', bertabrakan(kotak, kotakPeringatan));
      if (!kotakLegendaTumpang) kotakLegendaTumpang = bingkai.querySelector('.pm-kontrol');
      bingkai.classList.toggle('tumpang-legenda', bertabrakan(kotak, kotakLegendaTumpang));
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(jalankan);
    else jalankan();
  }

  /** Ukur ulang bilah lalu sesuaikan jarak kontrol peta dan ruang popup. */
  function segarkanBilahAtas() {
    ukurBilahAtas();
    ukurPanelArah();
    ukurRuangLegenda();
    aturRuangPopup();
    aturTumpangTindih();
  }

  segarkanBilahAtas();
  if (MQ_KECIL.addEventListener) MQ_KECIL.addEventListener('change', segarkanBilahAtas);
  else if (MQ_KECIL.addListener) MQ_KECIL.addListener(segarkanBilahAtas);
  window.addEventListener('resize', segarkanBilahAtas);
  window.addEventListener('orientationchange', segarkanBilahAtas);
  /* Teks bisa berpindah baris tanpa jendela berubah ukuran — misalnya saat
     huruf web selesai dimuat atau tombol keluar muncul. ResizeObserver
     menangkap perubahan itu; peramban lama cukup mengandalkan pemicu di atas. */
  if (window.ResizeObserver && bilahAtas) {
    var pengamatBilah = new ResizeObserver(segarkanBilahAtas);
    pengamatBilah.observe(bilahAtas);
    if (bilahKanan) pengamatBilah.observe(bilahKanan);
  }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(segarkanBilahAtas);
  }

  /* Tiap lapisan gambar diberi pane sendiri dengan z-index tetap. Tanpa ini,
     mematikan lalu menyalakan kembali sebuah lapisan akan menaruhnya paling
     atas — zona warna sempat menutupi jalan dan jalur evakuasi. */
  function pane(nama, z) {
    peta.createPane(nama).style.zIndex = z;
    return L.svg({ pane: nama });
  }
  var rZona  = pane('pmZona', 410);
  var rBatas = pane('pmBatas', 420);
  var rJalan = pane('pmJalan', 430);
  var rJalur = pane('pmJalur', 440);   // jalur evakuasi selalu paling atas

  var lapisZona     = L.layerGroup().addTo(peta);
  var lapisBatas    = L.layerGroup().addTo(peta);
  var lapisJalan    = L.layerGroup().addTo(peta);
  var lapisNamaJln  = L.layerGroup().addTo(peta);   // semua nama jalan
  var lapisNamaUtama = L.layerGroup().addTo(peta);  // hanya jalan utama, untuk zoom rendah
  var lapisJalur    = L.layerGroup().addTo(peta);
  var lapisPanah    = L.layerGroup().addTo(peta);
  var lapisFasilitas = L.layerGroup().addTo(peta);
  var lapisTK       = L.layerGroup().addTo(peta);
  var namaDiminta   = true;   // saklar "Nama jalan" pada legenda

  /* Penunjuk arah "1 alur" sedang aktif? Dideklarasikan di sini — bukan di
     bagian 10 tempat isinya ditulis — karena beberapa fungsi di atas
     (gambarPanah, aturRuangPopup, ukurRuangLegenda) sudah harus tahu keadaan
     ini sejak peta pertama kali digambar. */
  var modeArah = false;

  /* ------------------------------------------------------------------ 1. zona */

  /** Tombol "tunjukkan arah jalan" untuk dipasang di dalam popup mana pun.
      `label` menjadi nama titik awal pada panel penunjuk arah. `titik` boleh
      diisi bila koordinat awalnya sudah pasti (penanda fasilitas, posisi GPS);
      bila kosong, titik klik popup itu sendiri yang dipakai. */
  function tombolArah(label, titik) {
    return '<a class="pm-popup-tombol" href="#" data-pm-arah="' + esc(label) + '"' +
           (titik ? ' data-pm-titik="' + titik.lat + ',' + titik.lng + '"' : '') +
           '>🧭 <span class="pm-tombol-panjang">Tunjukkan </span>Arah Jalan</a>';
  }

  /** Tautan "tunjukkan titik kumpul" — aksi kedua, jadi tampil lebih kalem. */
  function tombolTK() {
    return '<a class="pm-popup-tombol is-kedua" href="#" data-pm-ke-tk>' +
           '📍 <span class="pm-tombol-panjang">Tunjukkan </span>Titik Kumpul</a>';
  }

  /** Kaki kotak info: dua tombol aksi. Di layar lebar ditumpuk ke bawah, di
      ponsel berdampingan (dan kata "Tunjukkan" disembunyikan lewat CSS) supaya
      kotaknya tidak bertambah dua baris — tinggi kotak inilah yang menentukan
      seberapa jauh peta tersentak saat popup dibuka. */
  function tombolPopup(label, titik) {
    return '<div class="pm-popup-kaki">' + tombolArah(label, titik) + tombolTK() + '</div>';
  }

  function popupZona(p) {
    var w = WARNA[p.zona];
    return '' +
      '<div class="pm-popup-kepala ' + w.kepala + '">' + esc(p.nama) +
        '<small>Kelurahan Kampung Baru · ' + esc(p.elev) + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Ancaman</b><span>' + esc(p.bahaya) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Luas zona</b><span>' + p.luas_ha + ' Ha</span></div>' +
        // ketinggian tidak diulang di sini — sudah tertulis di kepala popup
        '<div class="pm-popup-aksi ' + w.aksi + '"><b>Yang harus dilakukan</b>' + esc(p.aksi) + '</div>' +
        tombolPopup(p.nama) +
      '</div>';
  }

  L.geoJSON(D.zona, {
    renderer: rZona,
    style: function (f) {
      var w = WARNA[f.properties.zona];
      return {
        color: w.garis, weight: 1.6, opacity: 0.9,
        fillColor: w.isi, fillOpacity: w.alpha
      };
    },
    onEachFeature: function (f, lay) {
      // isi dibuat ulang tiap dibuka agar versi ringkas ponsel ikut lebar layar
      lay.bindPopup(function () { return popupZona(f.properties); }, { maxWidth: 300 });
      lay.on('mouseover', function () { lay.setStyle({ fillOpacity: WARNA[f.properties.zona].alpha + 0.16 }); });
      lay.on('mouseout',  function () { lay.setStyle({ fillOpacity: WARNA[f.properties.zona].alpha }); });
    }
  }).addTo(lapisZona);

  /* ------------------------------------------------------- 2. batas kelurahan */

  L.geoJSON(D.batas, {
    renderer: rBatas,
    style: function (f) {
      return f.properties.utama
        ? { color: '#d32f2f', weight: 3.4, opacity: 1, dashArray: '11,7', fill: false }
        : { color: '#ffffff', weight: 1.6, opacity: 0.65, dashArray: '3,6', fill: false };
    },
    onEachFeature: function (f, lay) {
      var p = f.properties;
      lay.bindPopup(
        '<div class="pm-popup-kepala ' + (p.utama ? 'pm-kepala-hijau' : 'pm-kepala-biru') + '">' +
          'Kelurahan ' + esc(p.nama) +
          '<small>' + (p.utama ? 'Wilayah utama peta ini' : 'Kelurahan tetangga') + '</small></div>' +
        '<div class="pm-popup-isi">' +
          '<div class="pm-popup-baris"><b>Luas</b><span>' + p.luas_ha + ' Ha</span></div>' +
          '<div class="pm-popup-baris"><b>Kecamatan</b><span>' +
            (p.utama ? 'Bacukiki Barat' : 'Sekitar Kampung Baru') + '</span></div>' +
        '</div>'
      );
      if (!p.utama) {
        var c = lay.getBounds().getCenter();
        L.marker(c, {
          interactive: false,
          icon: L.divIcon({ className: 'pm-label-kel', html: esc(p.nama), iconSize: [90, 14], iconAnchor: [45, 7] })
        }).addTo(lapisBatas);
      }
    }
  }).addTo(lapisBatas);

  /* -------------------------------------------------------------- 3. jaringan jalan */

  /* Kotak info sengaja dibuat sependek mungkin — bukan sekadar soal selera.
     Saat popup dibuka, Leaflet menggeser peta agar kotaknya muat seluruhnya;
     makin tinggi kotaknya, makin jauh peta tersentak dan makin hilang titik
     yang baru saja diketuk warga dari pandangan. Karena itu:
       - ketinggian digabung ke baris zona (tidak lagi baris sendiri);
       - jarak, arah, dan perkiraan waktu dipadatkan ke satu baris;
       - daftar "Lewat: ..." dihapus — rinciannya kini ada di panel penunjuk
         arah, langkah demi langkah;
       - kalimat petunjuknya memakai versi pendek di semua ukuran layar.
     Rinciannya tidak hilang, hanya pindah ke tempat yang lebih pas. */
  function popupJalan(p, latlng) {
    var zona = zonaDi(latlng.lat, latlng.lng);
    var arah = arahKe(latlng, TK_LATLNG);
    var w = zona ? WARNA[zona.zona] : WARNA.hijau;

    var html =
      '<div class="pm-popup-kepala ' + w.kepala + '">' + esc(p.nama || 'Jalan lokal') +
        '<small>' + (zona ? esc(zona.nama) : 'Di luar Kampung Baru') + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(latlng.lat, latlng.lng) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>' +
          (zona ? esc(zona.kelas) + (p.mdpl ? ' · ± ' + esc(p.mdpl) : '') +
                  // jenis ancaman dilewati di ponsel: kepala popup sudah
                  // menyebut nama zonanya, dan barisnya memakan 2-3 baris
                  bilaLapang('<br><small>' + esc(zona.bahaya) + '</small>')
                : 'Di luar batas kelurahan') + '</span></div>' +
        barisKeTK(latlng);

    // Di ponsel kotak petunjuk hanya ditampilkan untuk zona merah — di sana
    // pesannya mendesak dan tidak boleh terlewat. Untuk zona lain isinya
    // sudah diwakili tombol "Tunjukkan Arah Jalan" tepat di bawahnya.
    var merah = zona && zona.zona === 'merah';
    if (merah) {
      html += '<div class="pm-popup-aksi ' + w.aksi + '">' +
              '<b>Zona merah — jangan menunggu</b>Segera bergerak ke <strong>' + arah.nama +
              '</strong> menjauhi pantai.</div>';
    } else {
      html += bilaLapang('<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '">' +
              '<b>Petunjuk</b>Ikuti panah hijau ke <strong>' + arah.nama +
              '</strong> menuju Jl. Kesuma Timur.</div>');
    }

    html +=
        tombolPopup(p.nama || 'Jalan lokal') +
      '</div>';
    return html;
  }

  L.geoJSON(D.jalan, {
    renderer: rJalan,
    style: function (f) {
      var p = f.properties;
      return {
        color: '#ffffff',
        weight: p.utama ? 5 : 3,
        opacity: p.di_kelurahan === false ? 0.4 : 0.72,
        lineCap: 'round'
      };
    },
    onEachFeature: function (f, lay) {
      var p = f.properties;
      lay.on('click', function (e) {
        L.popup({ maxWidth: 300 }).setLatLng(e.latlng).setContent(popupJalan(p, e.latlng)).openOn(peta);
        L.DomEvent.stop(e);
      });
      lay.on('mouseover', function () { lay.setStyle({ weight: (p.utama ? 5 : 3) + 3, opacity: 0.95 }); });
      lay.on('mouseout',  function () { lay.setStyle({ weight: p.utama ? 5 : 3, opacity: 0.72 }); });
      if (p.nama) lay.bindTooltip(p.nama, { sticky: true, direction: 'top', opacity: 0.95 });

      if (p.nama && p.tengah) {
        var lebar = Math.max(50, p.nama.length * 6);
        var buatLabel = function (kelas) {
          return L.marker([p.tengah[1], p.tengah[0]], {
            interactive: false,
            icon: L.divIcon({
              className: kelas, html: esc(p.nama),
              iconSize: [lebar, 13], iconAnchor: [lebar / 2, 6]
            })
          });
        };
        buatLabel('pm-label-jalan').addTo(lapisNamaJln);
        // Jalan utama juga disalin ke lapisan tersendiri supaya di layar kecil
        // (zoom rendah) warga tetap melihat nama jalan besarnya.
        if (p.utama) buatLabel('pm-label-jalan pm-label-utama').addTo(lapisNamaUtama);
      }
    }
  }).addTo(lapisJalan);

  /* ------------------------------------------------------ 4. jalur evakuasi + panah */

  /** Panah arah evakuasi. `aktif` = panah pada rute yang sedang ditunjukkan
      mode penunjuk arah: lebih besar dan berwarna terang agar satu alur itu
      langsung terbaca di atas citra satelit. */
  function panahIkon(sudut, aktif) {
    var u = aktif ? 28 : 24;
    return L.divIcon({
      className: aktif ? 'pm-panah pm-panah-rute' : 'pm-panah',
      html: '<svg width="' + u + '" height="' + u + '" viewBox="0 0 24 24" ' +
            'style="transform:rotate(' + sudut + 'deg)">' +
            '<path d="M12 2.5 L19 19 L12 15 L5 19 Z" fill="' + (aktif ? '#ffffff' : '#1b5e20') +
            '" stroke="' + (aktif ? '#04340f' : '#eaffef') + '" stroke-width="1.5" ' +
            'stroke-linejoin="round"/></svg>',
      iconSize: [u, u], iconAnchor: [u / 2, u / 2]
    });
  }

  /** Berapa meter panjang sekian piksel di layar pada zoom saat ini. */
  function piksterMeter(px) {
    var pusat = peta.getCenter();
    var p = peta.latLngToContainerPoint(pusat);
    return jarakMeter(pusat, peta.containerPointToLatLng(L.point(p.x + px, p.y)));
  }

  /** Sebar panah tiap ±jarakM meter sepanjang satu jalur.
      Jalur yang lebih pendek dari jarak itu tetap diberi satu panah di
      tengahnya — kecuali bila di layar memang terlalu pendek untuk terlihat
      (minTampilM), supaya saat peta di-zoom jauh panah tidak menumpuk. */
  function pasangPanah(coords, jarakM, minTampilM, lapisan, aktif) {
    var tujuan = lapisan || lapisPanah;
    var ruas = [], total = 0;
    for (var i = 0; i < coords.length - 1; i++) {
      var a = L.latLng(coords[i][1], coords[i][0]);
      var b = L.latLng(coords[i + 1][1], coords[i + 1][0]);
      var d = jarakMeter(a, b);
      if (d < 0.5) continue;
      ruas.push({ a: a, b: b, d: d, sudut: arahKe(a, b).derajat, mulai: total });
      total += d;
    }
    if (!ruas.length || total < minTampilM) return;

    var titik = [];
    if (total < jarakM) {
      titik.push(total / 2);
    } else {
      var n = Math.max(1, Math.round(total / jarakM));
      for (var k = 0; k < n; k++) titik.push(total * (k + 0.5) / n);
    }

    var j = 0;
    titik.forEach(function (t) {
      while (j < ruas.length - 1 && t > ruas[j].mulai + ruas[j].d) j++;
      var s = ruas[j];
      var f = Math.max(0, Math.min(1, (t - s.mulai) / s.d));
      L.marker([s.a.lat + (s.b.lat - s.a.lat) * f, s.a.lng + (s.b.lng - s.a.lng) * f], {
        icon: panahIkon(s.sudut, aktif), interactive: false, keyboard: false,
        zIndexOffset: aktif ? 800 : 0
      }).addTo(tujuan);
    });
  }

  function popupJalur(p) {
    return '' +
      '<div class="pm-popup-kepala pm-kepala-hijau">' + esc(p.nama) +
        '<small>Menuju Titik Kumpul — Jl. Kesuma Timur</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Panjang ruas</b><span>' + fmtJarak(p.panjang_m) +
          ' · mulai ± ' + p.mulai_mdpl + ' mdpl</span></div>' +
        '<div class="pm-popup-baris"><b>Titik kumpul</b><span>' + fmtJarak(p.jarak_tk_m) +
          ' dari ujung jalur · ± ' + p.estimasi_menit + ' menit</span></div>' +
        '<div class="pm-popup-baris"><b>Melewati</b><span>' + esc(p.via) + '</span></div>' +
        '<div class="pm-popup-aksi"><b>Ikuti arah panah</b>' +
          'Panah menunjuk ke titik kumpul, menanjak menjauhi pantai. ' +
          'Jalan kaki lebih aman daripada berkendara.</div>' +
        tombolPopup(p.nama) +
      '</div>';
  }

  D.jalur.features.forEach(function (f) {
    var latlngs = f.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
    L.polyline(latlngs, {
      renderer: rJalur, color: '#0b3d16', weight: 7.5, opacity: 0.5,
      lineCap: 'round', lineJoin: 'round', interactive: false
    }).addTo(lapisJalur);
    var garis = L.polyline(latlngs, {
      renderer: rJalur, color: '#2e7d32', weight: 4.5, opacity: 0.96,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(lapisJalur);
    // isi dibuat ulang tiap kali dibuka agar versi ringkas untuk ponsel
    // tetap mengikuti lebar layar saat itu
    garis.bindPopup(function () { return popupJalur(f.properties); }, { maxWidth: 300 });
    garis.bindTooltip(f.properties.nama, { sticky: true, direction: 'top' });
  });

  function gambarPanah() {
    // Saat penunjuk arah aktif, panah seluruh jaringan sedang disembunyikan —
    // menghitungnya ulang hanya membuang waktu. Dipanggil lagi begitu warga
    // keluar dari mode itu.
    if (modeArah) return;
    var jarak = Math.max(45, piksterMeter(130));   // ± 130 px antar panah
    var minTampil = piksterMeter(46);              // ruas < 46 px di layar dilewati
    lapisPanah.clearLayers();
    D.jalur.features.forEach(function (f) {
      pasangPanah(f.geometry.coordinates, jarak, minTampil);
    });
  }
  peta.on('zoomend', function () { gambarPanah(); gambarPanahRute(); });

  /* ------------------------------------------------------------- 5. titik kumpul */

  var penandaTK = L.marker(TK_LATLNG, {
    zIndexOffset: 1000,
    icon: L.divIcon({
      className: 'pm-penanda-tk',
      html: '<div class="pm-tk-titik">🏃</div><div class="pm-tk-label">TITIK KUMPUL</div>',
      iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22]
    })
  }).addTo(lapisTK);

  function popupTK() {
    return '' +
      '<div class="pm-popup-kepala pm-kepala-biru">' + esc(TK.nama) +
        '<small>Assembly Point — Kelurahan Kampung Baru</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Lokasi</b><span>' + esc(TK.ket) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(TK.lat, TK.lon) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>Zona Hijau — Risiko Rendah · ± ' +
          TK.mdpl + ' mdpl</span></div>' +
        '<div class="pm-popup-aksi"><b>Kenapa di sini?</b>' +
          'Area terbuka di zona hijau ± ' + TK.mdpl + ' mdpl, jauh dari pantai — ' +
          'aman dari tsunami dan rob.</div>' +
        '<a class="pm-popup-tombol" href="' + TK.gmaps + '" target="_blank" rel="noopener">' +
          '🗺️ Buka di Google Maps</a>' +
      '</div>';
  }

  penandaTK.bindPopup(popupTK, { maxWidth: 300 });

  /* --------------------------------------------------------------- 6. fasilitas */

  D.fasilitas.forEach(function (f) {
    var w = WARNA[f.zona] || WARNA.hijau;
    var titik = L.latLng(f.lat, f.lon);
    L.marker(titik, {
      icon: L.divIcon({
        className: 'pm-fasilitas-ikon', html: f.ikon,
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12]
      })
    }).bindPopup(
      '<div class="pm-popup-kepala ' + w.kepala + '">' + esc(f.nama) +
        '<small>' + esc(f.jenis) + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(f.lat, f.lon) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>' +
          esc(WARNA[f.zona] ? namaZona(f.zona) : '-') + ' · ± ' + f.mdpl + ' mdpl</span></div>' +
        barisKeTK(titik) +
        tombolPopup(f.nama, titik) +
      '</div>', { maxWidth: 300 }
    ).bindTooltip(f.nama, { direction: 'top' }).addTo(lapisFasilitas);
  });

  function namaZona(z) {
    var f = D.zona.features.filter(function (x) { return x.properties.zona === z; })[0];
    return f ? f.properties.nama : z;
  }

  /* ------------------------------------------- 7. klik di mana saja pada peta */

  peta.on('click', function (e) {
    var lat = e.latlng.lat, lon = e.latlng.lng;
    var zona = zonaDi(lat, lon);
    var kel = kelurahanDi(lat, lon);
    var jarak = jarakMeter(e.latlng, TK_LATLNG);
    var arah = arahKe(e.latlng, TK_LATLNG);
    var w = zona ? WARNA[zona.zona] : WARNA.hijau;
    var diKB = diKelurahan(lat, lon);

    var html =
      '<div class="pm-popup-kepala ' + (zona ? w.kepala : 'pm-kepala-biru') + '">' +
        (zona ? esc(zona.nama) : 'Lokasi di luar Kampung Baru') +
        '<small>' + (kel ? 'Kelurahan ' + esc(kel) : 'Di luar batas peta') + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(lat, lon) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>' +
          (zona ? esc(zona.kelas) + ' · ' + esc(zona.elev) +
                  bilaLapang('<br><small>' + esc(zona.bahaya) + '</small>')
                : 'Di luar wilayah Kampung Baru') +
        '</span></div>' +
        barisKeTK(e.latlng) +
        // sama seperti popup jalan: di ponsel hanya peringatan zona merah yang
        // tetap tampil, sisanya sudah diwakili tombol di bawahnya
        (zona && zona.zona === 'merah'
          ? '<div class="pm-popup-aksi ' + w.aksi + '">' +
            '<b>Zona merah — jangan menunggu</b>Segera bergerak ke <strong>' + arah.nama +
            '</strong> menjauhi pantai.</div>'
          : bilaLapang('<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '"><b>Petunjuk</b>' +
              (diKB ? 'Ikuti panah hijau ke <strong>' + arah.nama + '</strong>.'
                    : 'Menuju tempat lebih tinggi — titik kumpul ' + fmtJarak(jarak) +
                      ' ke <strong>' + arah.nama + '</strong>.') + '</div>')) +
        tombolPopup(zona ? zona.nama : 'Titik pilihan Anda') +
      '</div>';

    L.popup({ maxWidth: 300 }).setLatLng(e.latlng).setContent(html).openOn(peta);
  });

  peta.on('popupopen', function (ev) {
    popupAktif = ev.popup;
    var berubah = false;

    /* Di ponsel, panel penunjuk arah menjadi lembar yang menempel di sisi bawah
       peta. Kalau daftar langkahnya sedang terbuka, lembar itu memakan lebih
       dari separuh peta dan popup yang baru dibuka tidak kebagian ruang: ia
       berhenti di baliknya, dan tombol di dalamnya tidak bisa disentuh sama
       sekali. Karena itu daftar langkah dilipat sementara — satu ketukan pada
       judulnya membuka lagi. Di layar lebar panel duduk di samping, jadi tidak
       ada yang perlu dilipat. */
    if (panelDiBawah() && !panelArah.classList.contains('is-lipat')) {
      lipatPanelArah(true);
      berubah = true;
    }
    // ukur ulang panel supaya sisipan geseran otomatis popup ikut benar
    segarkanBilahAtas();

    /* Jaring pengaman: popup tidak pernah boleh lebih tinggi daripada ruang
       peta yang benar-benar kosong — peta bisa jadi pendek (ponsel mendatar)
       dan sebagian tingginya bisa terpakai lembar penunjuk arah. Sisa isinya
       digulir di dalam popup. Dihitung saat popup dibuka karena kedua ukuran
       itu berubah-ubah (putar layar, layar penuh, panel dilipat). */
    var kotakPanel = panelDiBawah() ? kotakPanelArah() : null;
    var terpakai = kotakPanel ? Math.round(kotakPanel.height) : 0;
    var batas = Math.max(150, wadah.clientHeight - 110 - terpakai);
    if (ev.popup.options.maxHeight !== batas) {
      ev.popup.options.maxHeight = batas;
      berubah = true;
    }
    // update() menggambar & menggeser ulang popup dengan ukuran/sisipan baru
    if (berubah) ev.popup.update();
    aturTumpangTindih();
  });
  peta.on('popupclose', function (ev) {
    if (popupAktif === ev.popup) popupAktif = null;
    aturTumpangTindih();
  });
  /* Popup ikut bergerak saat peta digeser, jadi tumpang tindihnya diperiksa
     ulang selama pergerakan — dipadatkan ke satu pemeriksaan per gambar layar
     supaya tidak memberatkan. */
  peta.on('move zoom moveend zoomend resize', aturTumpangTindih);

  /* Tombol di dalam popup ("Tunjukkan titik kumpul" & "Tunjukkan arah jalan")
     ditangani lewat SATU pendengar di wadah popup, bukan dipasang ulang tiap
     popup dibuka. Leaflet memakai kembali elemen popup yang sama saat sebuah
     penanda dibuka-tutup-dibuka lagi, sehingga cara lama menumpuk pendengar
     dan satu klik bisa berjalan berkali-kali. */
  function nenekMoyang(el, atribut) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute(atribut) !== null) return el;
      el = el.parentNode;
    }
    return null;
  }

  L.DomEvent.on(peta.getPane('popupPane'), 'click', function (e) {
    var ke = nenekMoyang(e.target, 'data-pm-ke-tk');
    if (ke) {
      L.DomEvent.preventDefault(e);
      tutupArah();                  // penunjuk arah lama tidak boleh tertinggal
      peta.closePopup();
      peta.flyTo(TK_LATLNG, 18, { duration: 0.9 });
      setTimeout(function () { penandaTK.openPopup(); }, 950);
      return;
    }

    var arah = nenekMoyang(e.target, 'data-pm-arah');
    if (!arah) return;
    L.DomEvent.preventDefault(e);

    /* Titik awalnya: koordinat pasti bila tombolnya membawa data-pm-titik
       (penanda fasilitas / posisi GPS), selain itu titik tempat popup berdiri
       — yaitu tempat warga tadi mengetuk peta. */
    var titik = null;
    var tulis = arah.getAttribute('data-pm-titik');
    if (tulis) {
      var pecah = tulis.split(',');
      var la = parseFloat(pecah[0]), lo = parseFloat(pecah[1]);
      if (isFinite(la) && isFinite(lo)) titik = L.latLng(la, lo);
    }
    if (!titik && popupAktif) titik = popupAktif.getLatLng();
    if (!titik) return;

    mulaiArah(titik, arah.getAttribute('data-pm-arah'));
  });

  /* ------------------------------------------------------- 8. kontrol legenda */

  var Legenda = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function () {
      var div = L.DomUtil.create('div', 'pm-kontrol');
      // Di layar kecil legenda menutupi peta, jadi dibuat bisa dilipat dan
      // dimulai dalam keadaan tertutup.
      if (LAYAR_KECIL) div.classList.add('is-lipat');
      div.innerHTML =
        '<button type="button" class="pm-kontrol-saklar" aria-expanded="' + (LAYAR_KECIL ? 'false' : 'true') + '">' +
          '<span>Legenda &amp; Lapisan</span><span class="pm-kontrol-tanda">▾</span></button>' +
        '<div class="pm-kontrol-isi">' +
        '<h4>Legenda</h4>' +
        baris('pm-swatch-merah',  'Zona Merah — Risiko Tinggi', 'Tsunami, banjir rob, gelombang pasang') +
        baris('pm-swatch-kuning', 'Zona Kuning — Risiko Sedang', 'Banjir & genangan') +
        baris('pm-swatch-hijau',  'Zona Hijau — Risiko Rendah', 'Aman dari bahaya utama') +
        '<div class="pm-legenda-baris"><span class="pm-panah-contoh">➤</span>' +
          '<span class="pm-legenda-teks"><b>Jalur Evakuasi</b>' +
          '<span>Semua jalan berpanah menuju Jl. Kesuma Timur</span></span></div>' +
        '<div class="pm-legenda-baris"><span class="pm-panah-contoh">🏃</span>' +
          '<span class="pm-legenda-teks"><b>Titik Kumpul</b>' +
          '<span>Area aman untuk berkumpul</span></span></div>' +
        baris('pm-swatch-batas', 'Batas Kelurahan', 'Kampung Baru') +
        baris('pm-swatch-jalan', 'Jalan Lokal', 'Klik untuk info & petunjuk') +
        '<h4>Tampilkan Lapisan</h4>' +
        lapis('zona', 'Zona rawan bencana', true) +
        lapis('jalur', 'Jalur evakuasi & panah', true) +
        lapis('nama', 'Nama jalan', true) +
        lapis('fasilitas', 'Fasilitas umum', true) +
        lapis('batas', 'Batas kelurahan', true) +
        '</div>';

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      var saklar = div.querySelector('.pm-kontrol-saklar');
      saklar.addEventListener('click', function () {
        var tertutup = div.classList.toggle('is-lipat');
        saklar.setAttribute('aria-expanded', tertutup ? 'false' : 'true');
      });

      div.addEventListener('change', function (e) {
        var t = e.target;
        if (!t.dataset || !t.dataset.lapis) return;
        if (t.dataset.lapis === 'nama') {   // nama jalan juga bergantung pada tingkat zoom
          namaDiminta = t.checked;
          aturLabel();
          return;
        }
        var petaLapis = {
          zona: [lapisZona], jalur: [lapisJalur, lapisPanah],
          fasilitas: [lapisFasilitas], batas: [lapisBatas]
        }[t.dataset.lapis] || [];
        petaLapis.forEach(function (l) {
          if (t.checked) peta.addLayer(l); else peta.removeLayer(l);
        });
      });
      return div;
    }
  });

  function baris(swatch, judul, ket) {
    return '<div class="pm-legenda-baris"><span class="pm-swatch ' + swatch + '"></span>' +
           '<span class="pm-legenda-teks"><b>' + judul + '</b><span>' + ket + '</span></span></div>';
  }

  function lapis(id, label, aktif) {
    return '<label class="pm-lapis-baris"><input type="checkbox" data-lapis="' + id + '"' +
           (aktif ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  peta.addControl(new Legenda());

  var Utara = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      var div = L.DomUtil.create('div', 'pm-utara');
      div.innerHTML = '<span>⬆</span><small>U</small>';
      div.setAttribute('title', 'Arah utara');
      return div;
    }
  });
  peta.addControl(new Utara());

  /* Kotak legenda dan penunjuk utara baru ada di halaman sekarang, jadi ruang
     yang tersisa untuk legenda diukur ulang di sini. Legenda juga ikut diamati:
     tingginya berubah saat dilipat/dibuka warga. */
  segarkanBilahAtas();
  if (window.ResizeObserver) {
    var kotakLegenda = bingkai && bingkai.querySelector('.pm-kontrol');
    if (kotakLegenda) new ResizeObserver(ukurRuangLegenda).observe(kotakLegenda);
  }

  /* --------------------------------------------------------------- 9. tombol alat */

  // Batas tampilan: kelurahan + sedikit wilayah tetangga di kiri dan kanan.
  // Marginnya dibuat tipis; sisa ruang kiri-kanan otomatis muncul karena
  // bingkai peta lebih lebar daripada bentuk kelurahannya.
  var bb = D.meta.bbox; // [minLon, minLat, maxLon, maxLat]
  var BATAS_TAMPIL = L.latLngBounds(
    L.latLng(bb[1] - 0.0005, bb[0] - 0.0008),
    L.latLng(bb[3] + 0.0005, bb[2] + 0.0008)
  );
  peta.fitBounds(BATAS_TAMPIL, { padding: [26, 26] });
  peta.setMaxBounds(BATAS_TAMPIL.pad(1.1));
  gambarPanah();   // butuh tingkat zoom akhir, jadi dipanggil setelah fitBounds

  function tombol(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
    return el;
  }

  tombol('pmSeluruh', function () {
    peta.closePopup();
    peta.flyToBounds(BATAS_TAMPIL, { padding: [12, 12], duration: 0.8 });
  });

  tombol('pmKeTitikKumpul', function () {
    peta.closePopup();
    peta.flyTo(TK_LATLNG, 18, { duration: 0.9 });
    setTimeout(function () { penandaTK.openPopup(); }, 950);
  });

  var pakaiCitra = true;
  var tblDasar = tombol('pmGantiDasar', function () {
    pakaiCitra = !pakaiCitra;
    if (pakaiCitra) {
      peta.removeLayer(jalanDasar); citra.addTo(peta); labelCitra.addTo(peta);
      tblDasar.textContent = '🗺️ Tampilan Peta Jalan';
    } else {
      peta.removeLayer(citra); peta.removeLayer(labelCitra); jalanDasar.addTo(peta);
      tblDasar.textContent = '🛰️ Tampilan Citra Satelit';
    }
  });

  /* --- mode layar penuh -----------------------------------------------------
     Ada tiga jalan keluar: tombol "✕ Keluar" di dalam peta, tombol layar penuh
     di bilah alat, dan tombol Esc. Tombol "✕" yang paling penting: bilah alat
     berada di bawah peta sehingga tertutup begitu peta memenuhi layar, dan di
     ponsel tidak ada tombol Esc — tanpa "✕" warga terjebak di dalam peta. */
  var tblPenuh = document.getElementById('pmLayarPenuh');
  var tblKeluar = document.getElementById('pmKeluarPenuh');
  // Halaman selalu dibuka di luar mode layar penuh — samakan keadaan tombolnya.
  if (tblKeluar) tblKeluar.hidden = !bingkai.classList.contains('is-penuh');

  function aturLayarPenuh(penuh) {
    if (bingkai.classList.contains('is-penuh') === penuh) return;
    bingkai.classList.toggle('is-penuh', penuh);
    /* Tombol "✕ Keluar" hanya ada artinya di mode layar penuh. Di luar itu ia
       disembunyikan lewat atribut `hidden`, bukan sekadar aturan CSS: atribut
       ini tetap dipatuhi peramban walau css/peta-mitigasi.css belum termuat
       atau versinya masih yang lama dari cache. Tanpa itu tombol tampil polos
       di sudut peta dan — karena ikut mengambil ruang di dalam bingkai —
       mendorong isi peta sampai judul di atasnya terpotong. */
    if (tblKeluar) tblKeluar.hidden = !penuh;
    if (tblPenuh) {
      tblPenuh.textContent = penuh ? '✕ Keluar Layar Penuh' : '⛶ Layar Penuh';
      tblPenuh.classList.toggle('is-aktif', penuh);
      tblPenuh.setAttribute('aria-pressed', penuh ? 'true' : 'false');
    }
    // halaman di belakang peta dikunci supaya tidak ikut tergulir
    document.body.style.overflow = penuh ? 'hidden' : '';
    // tombol keluar yang muncul/hilang mengubah tinggi bilah keterangan
    segarkanBilahAtas();
    setTimeout(function () { peta.invalidateSize(); segarkanBilahAtas(); }, 220);
  }

  /** Keluar layar penuh lalu kembalikan fokus ke tombolnya, sekaligus menarik
      tampilan halaman balik ke area peta supaya jelas peta belum hilang. */
  function keluarLayarPenuh() {
    aturLayarPenuh(false);
    if (tblPenuh) tblPenuh.focus();
  }

  tombol('pmLayarPenuh', function () {
    aturLayarPenuh(!bingkai.classList.contains('is-penuh'));
  });
  tombol('pmKeluarPenuh', keluarLayarPenuh);

  /* Esc dikupas selapis demi selapis: penunjuk arah dulu (kembali ke peta
     semula), baru mode layar penuh. Kalau keduanya ditutup sekaligus, warga
     yang menekan Esc satu kali kehilangan dua hal sekaligus. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modeArah) { tutupArah(); return; }
    if (bingkai.classList.contains('is-penuh')) keluarLayarPenuh();
  });

  var penandaSaya = null;
  tombol('pmPosisiSaya', function () {
    if (!navigator.geolocation) {
      alert('Perangkat ini tidak mendukung deteksi lokasi.');
      return;
    }
    var tbl = document.getElementById('pmPosisiSaya');
    var teksAsli = tbl.textContent;
    tbl.textContent = '⏳ Mencari lokasi…';
    tbl.disabled = true;

    navigator.geolocation.getCurrentPosition(function (pos) {
      tbl.textContent = teksAsli; tbl.disabled = false;
      var latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      var zona = zonaDi(latlng.lat, latlng.lng);
      var arah = arahKe(latlng, TK_LATLNG);
      var w = zona ? WARNA[zona.zona] : WARNA.hijau;

      if (penandaSaya) peta.removeLayer(penandaSaya);
      penandaSaya = L.marker(latlng, {
        zIndexOffset: 900,
        icon: L.divIcon({ className: '', html: '<div class="pm-posisi-saya"></div>',
                          iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] })
      }).addTo(peta);

      penandaSaya.bindPopup(
        '<div class="pm-popup-kepala ' + (zona ? w.kepala : 'pm-kepala-biru') + '">Posisi Anda Sekarang' +
          '<small>' + (zona ? esc(zona.nama) : 'Di luar Kampung Baru') + '</small></div>' +
        '<div class="pm-popup-isi">' +
          '<div class="pm-popup-baris"><b>Koordinat</b>' +
            '<span class="pm-koordinat">' + fmtKoordinat(latlng.lat, latlng.lng) + '</span></div>' +
          '<div class="pm-popup-baris"><b>Zona</b><span>' +
            (zona ? esc(zona.kelas) : 'Di luar zonasi peta ini') + '</span></div>' +
          barisKeTK(latlng) +
          (zona && zona.zona === 'merah'
            ? '<div class="pm-popup-aksi ' + w.aksi + '">' +
              '<b>Zona merah — jangan menunggu</b>Segera bergerak ke <strong>' + arah.nama +
              '</strong> menjauhi pantai.</div>'
            : bilaLapang('<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '"><b>Petunjuk</b>' +
                'Ikuti panah hijau ke <strong>' + arah.nama + '</strong> menuju Jl. Kesuma Timur.</div>')) +
          tombolPopup('Posisi Anda sekarang', latlng) +
        '</div>', { maxWidth: 300 }
      ).openPopup();
      peta.flyTo(latlng, 17, { duration: 0.9 });
    }, function () {
      tbl.textContent = teksAsli; tbl.disabled = false;
      alert('Lokasi tidak bisa diambil. Pastikan izin lokasi sudah diaktifkan di peramban Anda.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

  /* ========================================================================== *
   *  10. PENUNJUK ARAH "1 ALUR"
   *
   *  Dari titik mana pun yang diketuk warga (atau dari posisi GPS-nya), peta
   *  menghitung SATU alur terpendek menuju titik kumpul lewat jaringan jalur
   *  evakuasi, lalu masuk ke mode terfokus: 52 jalur lain, panah umum, dan
   *  fasilitas disembunyikan sehingga hanya alur itu yang tergambar. Menekan
   *  "✕" mengembalikan peta persis ke keadaan sebelumnya.
   * ========================================================================== */

  /* --- 10a. graf jaringan jalur evakuasi ----------------------------------- *
     Dibangun sekali saat pertama kali dibutuhkan (bukan saat halaman dimuat)
     supaya peta tetap cepat terbuka bagi warga yang hanya ingin melihat zona. */
  var graf = null;

  function bangunGraf() {
    if (graf) return graf;
    var simpul = [], indeks = {}, tetangga = [], sisi = [];

    function idSimpul(c) {
      // koordinat dibulatkan 6 desimal (± 0,1 m) supaya ujung dua jalur yang
      // bertemu di persimpangan yang sama benar-benar menjadi satu simpul
      var kunci = c[0].toFixed(6) + ',' + c[1].toFixed(6);
      if (indeks[kunci] === undefined) {
        indeks[kunci] = simpul.length;
        simpul.push(L.latLng(c[1], c[0]));
        tetangga.push([]);
      }
      return indeks[kunci];
    }

    D.jalur.features.forEach(function (f) {
      var c = f.geometry.coordinates;
      for (var i = 0; i < c.length - 1; i++) {
        var a = idSimpul(c[i]), b = idSimpul(c[i + 1]);
        if (a === b) continue;
        var w = jarakMeter(simpul[a], simpul[b]);
        tetangga[a].push({ n: b, w: w });
        tetangga[b].push({ n: a, w: w });
        sisi.push({ a: a, b: b });
      }
    });

    // simpul jaringan yang paling dekat ke titik kumpul menjadi tujuan perutean
    var tujuan = 0, terdekat = Infinity;
    simpul.forEach(function (p, i) {
      var d = jarakMeter(p, TK_LATLNG);
      if (d < terdekat) { terdekat = d; tujuan = i; }
    });

    graf = { simpul: simpul, tetangga: tetangga, sisi: sisi, tujuan: tujuan };
    return graf;
  }

  /** Titik terdekat pada jaringan jalur, beserta ruas tempat ia menempel. */
  function tempelKeJaringan(p) {
    var g = bangunGraf(), terbaik = null;
    for (var i = 0; i < g.sisi.length; i++) {
      var s = g.sisi[i];
      var r = jarakKeRuas(p, g.simpul[s.a], g.simpul[s.b]);
      if (!terbaik || r.jarak < terbaik.jarak) {
        terbaik = { jarak: r.jarak, titik: r.titik, sisi: s };
      }
    }
    return terbaik;
  }

  /** Alur terpendek (Dijkstra) dari sebuah titik ke titik kumpul.
      Jaringannya kecil (± 405 simpul) sehingga pencarian sederhana O(n²) sudah
      selesai jauh di bawah satu kedipan mata — tak perlu antrean berprioritas. */
  function cariAlur(p) {
    var g = bangunGraf();
    var tempel = tempelKeJaringan(p);
    if (!tempel) return null;

    var N = g.simpul.length, AWAL = N;      // simpul semu di titik tempelan
    var jarak = [], dari = [], selesai = [];
    for (var i = 0; i <= N; i++) { jarak[i] = Infinity; dari[i] = -1; selesai[i] = false; }
    jarak[AWAL] = 0;

    var sisiAwal = [
      { n: tempel.sisi.a, w: jarakMeter(tempel.titik, g.simpul[tempel.sisi.a]) },
      { n: tempel.sisi.b, w: jarakMeter(tempel.titik, g.simpul[tempel.sisi.b]) }
    ];

    for (var putaran = 0; putaran <= N; putaran++) {
      var u = -1, ud = Infinity;
      for (var k = 0; k <= N; k++) if (!selesai[k] && jarak[k] < ud) { ud = jarak[k]; u = k; }
      if (u === -1 || u === g.tujuan) break;
      selesai[u] = true;
      var sekitar = (u === AWAL) ? sisiAwal : g.tetangga[u];
      for (var t = 0; t < sekitar.length; t++) {
        var e = sekitar[t];
        if (jarak[u] + e.w < jarak[e.n]) { jarak[e.n] = jarak[u] + e.w; dari[e.n] = u; }
      }
    }
    if (!isFinite(jarak[g.tujuan])) return null;

    var urut = [], cur = g.tujuan;
    while (cur !== -1 && cur !== AWAL) { urut.unshift(cur); cur = dari[cur]; }

    var titik = [tempel.titik];
    urut.forEach(function (n) { titik.push(g.simpul[n]); });
    titik.push(TK_LATLNG);   // sambungan pendek terakhir ke penanda titik kumpul

    // titik kembar berurutan dibuang agar panah & langkah tidak menumpuk
    var bersih = [];
    titik.forEach(function (t) {
      var akhir = bersih[bersih.length - 1];
      if (!akhir || jarakMeter(akhir, t) > 0.5) bersih.push(t);
    });
    if (bersih.length < 2) return null;

    var total = 0;
    for (var q = 0; q < bersih.length - 1; q++) total += jarakMeter(bersih[q], bersih[q + 1]);

    return { titik: bersih, panjang: total, tempelJarak: tempel.jarak };
  }

  /* --- 10b. langkah demi langkah ------------------------------------------- */

  /* Jalur evakuasi menyimpan nama JALUR ("Jalur Evakuasi — Jl. Bau Massepe"),
     bukan nama jalan di tiap ruasnya. Untuk petunjuk belok yang benar, nama
     jalan diambil dari ruas jaringan jalan terdekat dengan tengah ruas itu. */
  var ruasJalan = null;

  function daftarRuasJalan() {
    if (ruasJalan) return ruasJalan;
    ruasJalan = [];
    D.jalan.features.forEach(function (f) {
      if (!f.properties.nama) return;
      f.geometry.coordinates.forEach(function (garis) {
        for (var i = 0; i < garis.length - 1; i++) {
          ruasJalan.push({
            a: L.latLng(garis[i][1], garis[i][0]),
            b: L.latLng(garis[i + 1][1], garis[i + 1][0]),
            nama: f.properties.nama
          });
        }
      });
    });
    return ruasJalan;
  }

  function namaJalanDekat(p) {
    var daftar = daftarRuasJalan(), terbaik = null;
    for (var i = 0; i < daftar.length; i++) {
      var r = jarakKeRuas(p, daftar[i].a, daftar[i].b);
      if (!terbaik || r.jarak < terbaik.jarak) terbaik = { jarak: r.jarak, nama: daftar[i].nama };
    }
    // lebih dari 32 m berarti ruas itu memang bukan jalan bernama
    return (terbaik && terbaik.jarak < 32) ? terbaik.nama : null;
  }

  /** Perubahan arah antara dua ruas → kata dan ikon petunjuknya. */
  function belokan(sudutLama, sudutBaru) {
    var d = ((sudutBaru - sudutLama + 540) % 360) - 180;   // -180°..180°
    var besar = Math.abs(d), kanan = d > 0;
    if (besar < 22) return { ikon: '↑', teks: 'Lurus mengikuti' };
    if (besar > 150) return { ikon: kanan ? '↻' : '↺', teks: 'Putar balik, masuk' };
    if (besar > 60) return { ikon: kanan ? '→' : '←', teks: 'Belok ' + (kanan ? 'kanan' : 'kiri') + ' ke' };
    return { ikon: kanan ? '↗' : '↖', teks: 'Serong ' + (kanan ? 'kanan' : 'kiri') + ' ke' };
  }

  function susunLangkah(titik) {
    var kasar = [];
    for (var i = 0; i < titik.length - 1; i++) {
      var a = titik[i], b = titik[i + 1];
      var d = jarakMeter(a, b);
      if (d < 0.5) continue;
      var tengah = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
      // huruf kecil supaya kalimatnya tetap wajar: "Belok kiri ke jalan lingkungan"
      var nama = namaJalanDekat(tengah) || 'jalan lingkungan';
      var sudut = arahKe(a, b).derajat;
      var akhir = kasar[kasar.length - 1];
      if (akhir && akhir.nama === nama) {
        akhir.jarak += d; akhir.sudutAkhir = sudut; akhir.titik = b;
      } else {
        kasar.push({ nama: nama, jarak: d, sudutAwal: sudut, sudutAkhir: sudut, titik: b });
      }
    }

    /* Potongan di bawah 14 m biasanya hanya belokan tikungan, bukan ruas jalan
       tersendiri — digabung ke langkah tetangganya supaya daftarnya tidak
       penuh baris sepele yang justru membingungkan saat panik. */
    var padat = [];
    kasar.forEach(function (l) {
      var akhir = padat[padat.length - 1];
      if (akhir && l.jarak < 14) {
        akhir.jarak += l.jarak; akhir.sudutAkhir = l.sudutAkhir; akhir.titik = l.titik;
      } else {
        padat.push(l);
      }
    });
    while (padat.length > 1 && padat[0].jarak < 14) {
      padat[1].jarak += padat[0].jarak;
      padat[1].sudutAwal = padat[0].sudutAwal;
      padat.shift();
    }

    for (var k = 1; k < padat.length; k++) {
      padat[k].belok = belokan(padat[k - 1].sudutAkhir, padat[k].sudutAwal);
    }
    return padat;
  }

  /* --- 10c. panel & keadaan mode ------------------------------------------- */

  var panelArah   = document.getElementById('pmArah');
  var lapisArah   = L.layerGroup();      // garis + penanda alur aktif
  var lapisPanahArah = L.layerGroup();   // panah di sepanjang alur aktif
  var rRute       = pane('pmRute', 455); // di atas jalur biasa (440)
  var alurAktif   = null;
  var simpanLapisan  = null;             // lapisan yang tadi menyala
  var simpanPosisiSaya = false;
  var lipatAwalDiatur = false;           // keadaan lipat awal sudah ditentukan?

  /** Kotak panel penunjuk arah bila sedang terlihat, selain itu null. */
  function kotakPanelArah() {
    if (!modeArah || !panelArah || panelArah.hidden || !bingkai) return null;
    var b = panelArah.getBoundingClientRect();
    return b.height ? b : null;
  }

  /* Panel bisa berupa kotak melayang di kiri atas (layar lebar) atau lembar
     yang menempel di sisi bawah (ponsel tegak) — lihat css/peta-mitigasi.css.
     Bentuk mana yang sedang berlaku ditanyakan langsung ke tata letaknya,
     bukan ditebak dari ambang lebar layar: keduanya harus selalu cocok, dan
     ambangnya hanya ditulis satu kali, di berkas gaya. Lembar bawah selalu
     selebar peta; kotak melayang tidak pernah lebih dari separuhnya. */
  function panelDiBawah() {
    var b = kotakPanelArah();
    return !!b && b.width > bingkai.getBoundingClientRect().width * 0.7;
  }

  function ukurPanelArah() {
    if (!bingkai) return;
    var b = kotakPanelArah();
    setUkuran('--pm-arah-tinggi', (b ? Math.round(b.height) : 0) + 'px');
  }

  /** Buka/tutup daftar langkah, sekaligus memberi tahu pembaca layar. */
  function lipatPanelArah(lipat) {
    if (!panelArah) return;
    panelArah.classList.toggle('is-lipat', lipat);
    var s = document.getElementById('pmArahSaklar');
    if (s) s.setAttribute('aria-expanded', lipat ? 'false' : 'true');
  }

  /** Ruang yang harus disisakan flyToBounds agar alur tidak tertutup panel.
      Dibatasi 42% ukuran peta: sisipan yang lebih besar daripada petanya
      sendiri membuat Leaflet menghitung zoom yang aneh. */
  function sisipanPanel() {
    var dasar = 20;
    /* Penanda "MULAI" dan "TITIK KUMPUL" menggantungkan labelnya di bawah titik
       jangkarnya dan menonjolkan lingkaran di atasnya. Batas rute dihitung dari
       titik jangkar, jadi sisi atas & bawah diberi ruang ekstra — tanpa itu
       label kedua penanda terpotong tepi peta. */
    var kiri = dasar, atas = dasar + 30, bawah = dasar + 34;
    var b = kotakPanelArah();
    if (b) {
      if (panelDiBawah()) bawah = Math.round(b.height) + dasar;
      else kiri = Math.round(b.right - bingkai.getBoundingClientRect().left) + dasar;
    }
    var batasX = wadah.clientWidth * 0.42, batasY = wadah.clientHeight * 0.42;
    return {
      kiriAtas: L.point(Math.min(kiri, batasX), Math.min(atas, batasY)),
      kananBawah: L.point(dasar, Math.min(bawah, batasY))
    };
  }

  /* --- 10d. menggambar alur ------------------------------------------------ */

  function gambarAlur() {
    lapisArah.clearLayers();
    if (!alurAktif) return;
    var titik = alurAktif.titik;

    /* Titik warga sering tidak persis di atas jalur (mengetuk halaman rumah,
       atau GPS meleset beberapa meter). Ruas putus-putus ini menunjukkan jalan
       kaki singkat menuju awal alur, supaya alurnya tidak terlihat "mulai
       entah dari mana". */
    if (alurAktif.tempelJarak > 12) {
      L.polyline([alurAktif.asal, titik[0]], {
        renderer: rRute, color: '#ffffff', weight: 3, opacity: 0.9,
        dashArray: '2 8', lineCap: 'round', interactive: false
      }).addTo(lapisArah);
    }

    // bayangan gelap → garis terang → aliran putih berjalan
    L.polyline(titik, {
      renderer: rRute, color: '#04340f', weight: 13, opacity: 0.55,
      lineCap: 'round', lineJoin: 'round', interactive: false
    }).addTo(lapisArah);
    L.polyline(titik, {
      renderer: rRute, color: '#00e676', weight: 6.5, opacity: 1,
      lineCap: 'round', lineJoin: 'round', interactive: false
    }).addTo(lapisArah);
    L.polyline(titik, {
      renderer: rRute, color: '#ffffff', weight: 3, opacity: 0.95,
      dashArray: '2 16', lineCap: 'round', className: 'pm-rute-aliran', interactive: false
    }).addTo(lapisArah);

    L.marker(alurAktif.asal, {
      interactive: false, keyboard: false, zIndexOffset: 1100,
      icon: L.divIcon({
        className: '', html: '<div class="pm-rute-mulai"><i></i><b>MULAI</b></div>',
        iconSize: [20, 20], iconAnchor: [10, 10]
      })
    }).addTo(lapisArah);

    gambarPanahRute();
  }

  function gambarPanahRute() {
    lapisPanahArah.clearLayers();
    if (!modeArah || !alurAktif) return;
    var koor = alurAktif.titik.map(function (t) { return [t.lng, t.lat]; });
    pasangPanah(koor, Math.max(35, piksterMeter(115)), 0, lapisPanahArah, true);
  }

  /* --- 10e. isi panel ------------------------------------------------------ */

  function isiPanel() {
    if (!panelArah || !alurAktif) return;
    var r = alurAktif;
    var jauh = r.tempelJarak > 25;
    var totalM = r.panjang + (jauh ? r.tempelJarak : 0);
    var zona = zonaDi(r.asal.lat, r.asal.lng);

    teksPanel('pmArahAsal', 'Dari ' + r.label);
    teksPanel('pmArahJarak', fmtJarak(totalM));
    teksPanel('pmArahWaktu', '± ' + Math.max(1, Math.round(totalM / 75)) + ' menit');

    var elZona = document.getElementById('pmArahZona');
    if (elZona) {
      elZona.textContent = zona ? String(zona.nama).split('—')[0].trim() : 'Luar zona';
      elZona.className = 'pm-arah-nilai' + (zona ? ' is-' + zona.zona : '');
    }

    var catatan = document.getElementById('pmArahCatatan');
    if (catatan) {
      if (zona && zona.zona === 'merah') {
        catatan.innerHTML = '<b>⚠️ Anda di zona merah.</b> Jangan menunggu — ' +
          'segera berjalan mengikuti alur di bawah ini.';
        catatan.className = 'pm-arah-catatan is-bahaya';
        catatan.hidden = false;
      } else if (!zona) {
        catatan.innerHTML = '<b>Di luar wilayah Kampung Baru.</b> Alur ini dihitung ' +
          'dari jalur evakuasi terdekat menuju titik kumpul Kampung Baru.';
        catatan.className = 'pm-arah-catatan';
        catatan.hidden = false;
      } else {
        catatan.hidden = true;
      }
    }

    var daftar = document.getElementById('pmArahLangkah');
    if (!daftar) return;
    var html = '';

    if (jauh) {
      html += barisLangkah(-1, '🚶', 'Berjalan ke jalur evakuasi terdekat',
        fmtJarak(r.tempelJarak) + ' ke arah ' + arahKe(r.asal, r.titik[0]).nama);
    }

    r.langkah.forEach(function (l, i) {
      var judul = l.belok
        ? l.belok.teks + ' ' + esc(l.nama)
        : 'Mulai berjalan ke arah ' + MATA_ANGIN[Math.round(l.sudutAwal / 45) % 8] +
          ' lewat ' + esc(l.nama);
      html += barisLangkah(i, l.belok ? l.belok.ikon : '▶', judul, fmtJarak(l.jarak));
    });

    html += barisLangkah(-2, '🏃', 'Tiba di Titik Kumpul',
      'Jl. Kesuma Timur · zona hijau ± ' + TK.mdpl + ' mdpl');

    daftar.innerHTML = html;

    var jml = document.getElementById('pmArahJumlah');
    if (jml) jml.textContent = r.langkah.length + ' langkah';
  }

  function teksPanel(id, isi) {
    var el = document.getElementById(id);
    if (el) el.textContent = isi;
  }

  /** Satu baris langkah. Indeks -1 = jalan kaki awal, -2 = tiba di tujuan;
      keduanya tetap bisa diketuk untuk memusatkan peta ke titiknya. */
  function barisLangkah(i, ikon, judul, ket) {
    var kelas = 'pm-arah-item' + (i === -1 ? ' is-mulai' : i === -2 ? ' is-tujuan' : '');
    return '<li><button type="button" class="' + kelas + '" data-langkah="' + i + '">' +
             '<span class="pm-arah-ikon" aria-hidden="true">' + ikon + '</span>' +
             '<span class="pm-arah-teks"><b>' + judul + '</b><span>' + esc(ket) + '</span></span>' +
           '</button></li>';
  }

  /* --- 10f. masuk & keluar mode ------------------------------------------- */

  function mulaiArah(asal, label) {
    if (!panelArah) return;

    var hasil = cariAlur(asal);
    if (!hasil) {
      alert('Maaf, alur evakuasi dari titik ini belum bisa dihitung. ' +
            'Coba pilih titik lain yang lebih dekat ke jalan.');
      return;
    }

    hasil.asal = asal;
    hasil.label = label || 'Titik pilihan Anda';
    hasil.langkah = susunLangkah(hasil.titik);
    alurAktif = hasil;

    if (!modeArah) {
      simpanLapisan = [lapisJalur, lapisPanah, lapisFasilitas].filter(function (l) {
        return peta.hasLayer(l);
      });
      simpanLapisan.forEach(function (l) { peta.removeLayer(l); });
      simpanPosisiSaya = !!(penandaSaya && peta.hasLayer(penandaSaya));
      if (simpanPosisiSaya) peta.removeLayer(penandaSaya);

      lapisArah.addTo(peta);
      lapisPanahArah.addTo(peta);
      modeArah = true;
      bingkai.classList.add('is-navigasi');
      panelArah.hidden = false;

      /* Sekali saja, saat panel pertama kali tampil: bila ia berbentuk lembar
         bawah (ponsel tegak), daftar langkah dimulai terlipat agar lembarnya
         pendek dan peta tetap kelihatan. Keadaan lipat itu tidak disetel ulang
         pada alur-alur berikutnya — kalau warga sudah membukanya, biarkan
         terbuka. Bentuk panel ditanya ke tata letak, jadi ambang lebar layar
         cukup ditulis di css/peta-mitigasi.css saja. */
      if (!lipatAwalDiatur) {
        lipatAwalDiatur = true;
        if (panelDiBawah()) lipatPanelArah(true);
      }
    }

    peta.closePopup();
    gambarAlur();
    isiPanel();
    segarkanBilahAtas();
    lihatSeluruhAlur();

    /* Di ponsel yang dipegang mendatar, bingkai peta lebih tinggi daripada
       layarnya — lembar arah yang menempel di sisi bawah peta bisa berhenti di
       bawah garis lipat, dan tombol "✕ Keluar" jadi tak terjangkau. Halaman
       digulir seperlunya supaya panelnya utuh terlihat. Di mode layar penuh
       bingkainya sudah setara layar, jadi tidak perlu digulir. */
    if (!bingkai.classList.contains('is-penuh') && panelArah.scrollIntoView) {
      panelArah.scrollIntoView({ block: 'nearest' });
    }

    // fokus pindah ke panel supaya pengguna papan ketik & pembaca layar
    // langsung berada di petunjuk yang baru muncul
    var tutup = document.getElementById('pmArahTutup');
    if (tutup) tutup.focus();
  }

  function lihatSeluruhAlur() {
    if (!alurAktif) return;
    var titik = alurAktif.titik.slice();
    // titik warga hanya ikut dibingkai bila masih di dalam wilayah peta —
    // GPS dari luar kota tidak boleh menarik peta sampai keluar batas
    if (BATAS_TAMPIL.pad(1.1).contains(alurAktif.asal)) titik.push(alurAktif.asal);
    var sisip = sisipanPanel();
    peta.flyToBounds(L.latLngBounds(titik), {
      paddingTopLeft: sisip.kiriAtas,
      paddingBottomRight: sisip.kananBawah,
      duration: 0.8, maxZoom: 18
    });
  }

  function tutupArah() {
    if (!modeArah) return;
    modeArah = false;
    bingkai.classList.remove('is-navigasi');
    if (panelArah) panelArah.hidden = true;

    lapisArah.clearLayers();
    lapisPanahArah.clearLayers();
    peta.removeLayer(lapisArah);
    peta.removeLayer(lapisPanahArah);
    alurAktif = null;

    // hanya lapisan yang tadi memang menyala yang dinyalakan kembali, jadi
    // saklar legenda yang sengaja dimatikan warga tidak ikut hidup lagi
    if (simpanLapisan) {
      simpanLapisan.forEach(function (l) { peta.addLayer(l); });
      simpanLapisan = null;
    }
    if (simpanPosisiSaya && penandaSaya) peta.addLayer(penandaSaya);
    simpanPosisiSaya = false;

    peta.closePopup();
    gambarPanah();            // panah umum dihitung ulang untuk zoom saat ini
    segarkanBilahAtas();

    /* Letak & tingkat zoom peta SENGAJA dibiarkan apa adanya. Yang dipulihkan
       hanya lapisannya — jalur evakuasi, panah, dan fasilitas muncul kembali
       di tempat yang sedang dilihat warga. Dulu peta terbang balik ke posisi
       sebelum penunjuk arah dibuka, dan itu justru membingungkan: warga baru
       selesai menelusuri alurnya, lalu tiba-tiba dilempar ke tampilan lain
       dan harus mencari lokasinya lagi dari awal. */

    /* Fokus tidak boleh tertinggal di tombol yang baru saja disembunyikan —
       pembaca layar akan kehilangan tempatnya. Tombol pemicunya ada di dalam
       popup yang sudah ikut tertutup, jadi fokus dikembalikan ke peta itu
       sendiri: tempat warga memang sedang berada. */
    if (wadah.focus) {
      try { wadah.focus({ preventScroll: true }); } catch (x) { wadah.focus(); }
    }
  }

  /* --- 10g. tombol-tombol panel ------------------------------------------- */

  if (panelArah) {
    panelArah.hidden = true;   // halaman selalu dibuka tanpa penunjuk arah

    tombol('pmArahTutup', tutupArah);
    tombol('pmArahKeluar', tutupArah);
    tombol('pmArahSeluruh', lihatSeluruhAlur);

    var saklarArah = document.getElementById('pmArahSaklar');
    if (saklarArah) {
      saklarArah.addEventListener('click', function () {
        lipatPanelArah(!panelArah.classList.contains('is-lipat'));
        segarkanBilahAtas();
      });
    }

    // mengetuk satu langkah memusatkan peta ke ujung langkah itu
    panelArah.addEventListener('click', function (e) {
      var el = nenekMoyang(e.target, 'data-langkah');
      if (!el || !alurAktif) return;
      var i = parseInt(el.getAttribute('data-langkah'), 10);
      var titik = i === -1 ? alurAktif.titik[0]
                : i === -2 ? TK_LATLNG
                : (alurAktif.langkah[i] && alurAktif.langkah[i].titik);
      if (!titik) return;
      peta.flyTo(titik, Math.max(peta.getZoom(), 18), { duration: 0.6 });
      var lain = panelArah.querySelectorAll('.pm-arah-item.is-terpilih');
      Array.prototype.forEach.call(lain, function (x) { x.classList.remove('is-terpilih'); });
      el.classList.add('is-terpilih');
    });

    /* Panel bisa berubah tinggi tanpa jendela berubah ukuran (daftar langkah
       baru, lipat/buka). Tinggi itu dipakai untuk sisipan popup dan untuk
       menaikkan skala & atribusi peta di ponsel, jadi harus selalu segar. */
    if (window.ResizeObserver) new ResizeObserver(segarkanBilahAtas).observe(panelArah);
  }

  /* ------------------------------- gulir roda: aktif setelah peta diklik ----- */
  peta.on('focus click', function () { peta.scrollWheelZoom.enable(); });
  peta.on('blur', function () { peta.scrollWheelZoom.disable(); });
  wadah.addEventListener('mouseleave', function () { peta.scrollWheelZoom.disable(); });

  /* ------------------------------------ atur kepadatan nama jalan per zoom */
  // Semua nama jalan baru terbaca mulai zoom 16. Di bawah itu label saling
  // menumpuk, jadi hanya nama jalan utama yang ditampilkan.
  function aturLabel() {
    var z = peta.getZoom();
    var semua = namaDiminta && z >= 16;
    var utama = namaDiminta && !semua && z >= 14.5;
    if (semua !== peta.hasLayer(lapisNamaJln)) {
      peta[semua ? 'addLayer' : 'removeLayer'](lapisNamaJln);
    }
    if (utama !== peta.hasLayer(lapisNamaUtama)) {
      peta[utama ? 'addLayer' : 'removeLayer'](lapisNamaUtama);
    }
  }
  peta.on('zoomend', aturLabel);
  aturLabel();

  /* Dibuka agar skrip lain di halaman ini bisa mengakses peta bila diperlukan. */
  window.petaMitigasi = peta;

  /* ------------------------------------------------- isi tautan Google Maps */
  var tautanTK = document.querySelectorAll('[data-tk-gmaps]');
  Array.prototype.forEach.call(tautanTK, function (a) { a.href = TK.gmaps; });
  var koordTK = document.querySelectorAll('[data-tk-koordinat]');
  Array.prototype.forEach.call(koordTK, function (s) { s.textContent = fmtKoordinat(TK.lat, TK.lon); });
})();
