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

  /* Layar ponsel sempit (tegak) atau pendek (mendatar): isi popup diringkas —
     kalimat panjang diganti versi pendek dan keterangan tambahan dilewati —
     supaya kotak info tidak menutupi hampir seluruh peta. Ambangnya sama
     dengan css/peta-mitigasi.css dan dibaca ulang tiap popup dibuka, jadi
     tetap benar setelah layar diputar. */
  var MQ_KECIL = window.matchMedia('(max-width: 700px), (max-height: 500px)');
  function layarKecil() { return MQ_KECIL.matches; }
  function ringkas(panjang, pendek) { return layarKecil() ? pendek : panjang; }

  /** Nama jalur tanpa awalan "Jalur Evakuasi — "; label barisnya sudah jelas. */
  function namaJalur(nama) {
    return esc(layarKecil() ? String(nama).replace(/^Jalur Evakuasi\s*—\s*/, '') : nama);
  }

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
  function fmtWaktu(m) {
    var menit = Math.max(1, Math.round(m / 75));
    return '± ' + menit + ' menit jalan kaki';
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

  /* ------------------------------------------------------ jalur evakuasi terdekat */

  /** Titik terdekat pada sebuah ruas garis, beserta jaraknya. */
  function jarakKeRuas(p, a, b) {
    var dx = b.lng - a.lng, dy = b.lat - a.lat;
    var t = (dx || dy) ? ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy) : 0;
    t = Math.max(0, Math.min(1, t));
    var proy = L.latLng(a.lat + t * dy, a.lng + t * dx);
    return { titik: proy, jarak: jarakMeter(p, proy) };
  }

  function jalurTerdekat(latlng) {
    var terbaik = null;
    D.jalur.features.forEach(function (f) {
      var c = f.geometry.coordinates;
      for (var i = 0; i < c.length - 1; i++) {
        var r = jarakKeRuas(latlng, L.latLng(c[i][1], c[i][0]), L.latLng(c[i + 1][1], c[i + 1][0]));
        if (!terbaik || r.jarak < terbaik.jarak) {
          terbaik = { jarak: r.jarak, titik: r.titik, props: f.properties };
        }
      }
    });
    return terbaik;
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

  /* Saat popup dibuka Leaflet menggeser peta agar popup masuk layar. Ruang
     amannya diperbesar supaya popup tidak berhenti di balik pita judul,
     kotak peringatan, atau legenda. Di ponsel ruangnya jauh lebih tipis:
     petanya pendek dan geseran otomatis sering tertahan setMaxBounds, jadi
     kedua kotak di atas peta disembunyikan sementara (lihat popupopen). */
  function aturRuangPopup() {
    var kecil = layarKecil();
    L.Popup.mergeOptions({
      autoPanPaddingTopLeft: L.point(10, kecil ? 16 : 96),
      autoPanPaddingBottomRight: L.point(10, kecil ? 44 : 24)
    });
  }
  aturRuangPopup();
  if (MQ_KECIL.addEventListener) MQ_KECIL.addEventListener('change', aturRuangPopup);
  else if (MQ_KECIL.addListener) MQ_KECIL.addListener(aturRuangPopup);

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

  /* ------------------------------------------------------------------ 1. zona */

  function popupZona(p) {
    var w = WARNA[p.zona];
    return '' +
      '<div class="pm-popup-kepala ' + w.kepala + '">' + esc(p.nama) +
        '<small>Kelurahan Kampung Baru · ' + esc(p.elev) + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Ancaman</b><span>' + esc(p.bahaya) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Luas zona</b><span>' + p.luas_ha + ' Ha</span></div>' +
        // ketinggian sudah tertulis di kepala popup, jadi di ponsel tidak diulang
        ringkas('<div class="pm-popup-baris"><b>Ketinggian</b><span>' + esc(p.elev) + '</span></div>', '') +
        '<div class="pm-popup-aksi ' + w.aksi + '"><b>Yang harus dilakukan</b>' + esc(p.aksi) + '</div>' +
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

  function popupJalan(p, latlng) {
    var zona = zonaDi(latlng.lat, latlng.lng);
    var jarak = jarakMeter(latlng, TK_LATLNG);
    var arah = arahKe(latlng, TK_LATLNG);
    var w = zona ? WARNA[zona.zona] : WARNA.hijau;
    var jl = jalurTerdekat(latlng);

    var html =
      '<div class="pm-popup-kepala ' + w.kepala + '">' + esc(p.nama || 'Jalan lokal') +
        '<small>' + (zona ? esc(zona.nama)
                          : ringkas('Di luar Kelurahan Kampung Baru', 'Di luar Kampung Baru')) + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(latlng.lat, latlng.lng) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>' +
          (zona ? ringkas(esc(zona.kelas) + ' — ' + esc(zona.bahaya),
                          // di ponsel ketinggian ikut di baris ini dan jenis
                          // ancamannya turun ke baris kecil di bawahnya
                          esc(zona.kelas) + (p.mdpl ? ' · ± ' + esc(p.mdpl) : '') +
                          '<br><small>' + esc(zona.bahaya) + '</small>')
                : 'Di luar batas kelurahan') + '</span></div>';

    // baris ketinggian dilewati bila tadi sudah digabung ke baris zona
    if (p.mdpl && !(layarKecil() && zona)) {
      html += '<div class="pm-popup-baris"><b>Ketinggian</b><span>± ' + esc(p.mdpl) + '</span></div>';
    }

    html +=
        '<div class="pm-popup-baris"><b>Ke titik kumpul</b><span>' + fmtJarak(jarak) +
          ' ke arah <strong>' + arah.nama + '</strong><br>' + fmtWaktu(jarak) + '</span></div>';

    if (jl) {
      html += '<div class="pm-popup-baris"><b>Jalur terdekat</b><span>' + namaJalur(jl.props.nama) +
              ' — ' + fmtJarak(jl.jarak) + ' dari sini' +
              ringkas('<br><small>Lewat: ' + esc(jl.props.via) + '</small>', '') + '</span></div>';
    }

    html +=
        '<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '"><b>Petunjuk ke titik kumpul</b>' +
          (zona && zona.zona === 'merah'
            ? ringkas('Anda berada di zona merah. Segera bergerak ke arah <strong>' + arah.nama +
                '</strong> menjauhi pantai, ikuti panah hijau menuju titik kumpul di Jl. Kesuma Timur.',
                'Zona merah — segera bergerak ke arah <strong>' + arah.nama +
                '</strong> menjauhi pantai, ikuti panah hijau.')
            : ringkas('Ikuti jalur evakuasi (panah hijau) ke arah <strong>' + arah.nama +
                '</strong> menuju titik kumpul di Jl. Kesuma Timur.',
                'Ikuti panah hijau ke arah <strong>' + arah.nama + '</strong> menuju Jl. Kesuma Timur.')) +
        '</div>' +
        '<a class="pm-popup-tombol" href="#" data-pm-ke-tk>📍 Tunjukkan titik kumpul</a>' +
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

  function panahIkon(sudut) {
    return L.divIcon({
      className: 'pm-panah',
      html: '<svg width="24" height="24" viewBox="0 0 24 24" style="transform:rotate(' + sudut + 'deg)">' +
            '<path d="M12 2.5 L19 19 L12 15 L5 19 Z" fill="#1b5e20" stroke="#eaffef" stroke-width="1.5" ' +
            'stroke-linejoin="round"/></svg>',
      iconSize: [24, 24], iconAnchor: [12, 12]
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
  function pasangPanah(coords, jarakM, minTampilM) {
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
        icon: panahIkon(s.sudut), interactive: false, keyboard: false
      }).addTo(lapisPanah);
    });
  }

  function popupJalur(p) {
    return '' +
      '<div class="pm-popup-kepala pm-kepala-hijau">' + esc(p.nama) +
        '<small>Menuju Titik Kumpul — Jl. Kesuma Timur</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Panjang ruas</b><span>' + fmtJarak(p.panjang_m) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Ke titik kumpul</b><span>' + fmtJarak(p.jarak_tk_m) +
          ' dari ujung jalur<br>± ' + p.estimasi_menit + ' menit jalan kaki</span></div>' +
        '<div class="pm-popup-baris"><b>Titik mulai</b><span>± ' + p.mulai_mdpl + ' mdpl</span></div>' +
        '<div class="pm-popup-baris"><b>Melewati</b><span>' + esc(p.via) + '</span></div>' +
        '<div class="pm-popup-aksi"><b>Ikuti arah panah</b>' +
          ringkas('Panah menunjuk ke arah titik kumpul dan menanjak menjauhi pantai. ' +
                  'Jalan kaki lebih aman daripada berkendara — jalan bisa macet atau ' +
                  'tertutup material saat bencana.',
                  'Panah menunjuk ke titik kumpul, menanjak menjauhi pantai. ' +
                  'Jalan kaki lebih aman daripada berkendara.') + '</div>' +
        '<a class="pm-popup-tombol" href="#" data-pm-ke-tk>📍 Tunjukkan titik kumpul</a>' +
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
    var jarak = Math.max(45, piksterMeter(130));   // ± 130 px antar panah
    var minTampil = piksterMeter(46);              // ruas < 46 px di layar dilewati
    lapisPanah.clearLayers();
    D.jalur.features.forEach(function (f) {
      pasangPanah(f.geometry.coordinates, jarak, minTampil);
    });
  }
  peta.on('zoomend', gambarPanah);

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
        '<div class="pm-popup-baris"><b>Zona</b><span>Zona Hijau — Risiko Rendah' +
          ringkas('', ' · ± ' + TK.mdpl + ' mdpl') + '</span></div>' +
        ringkas('<div class="pm-popup-baris"><b>Ketinggian</b><span>± ' + TK.mdpl + ' mdpl</span></div>', '') +
        '<div class="pm-popup-aksi"><b>Kenapa di sini?</b>' +
          ringkas('Area terbuka, berada di zona hijau ± ' + TK.mdpl + ' mdpl, dan jauh dari garis pantai — ' +
                  'aman dari jangkauan tsunami, banjir rob, maupun gelombang pasang.',
                  'Area terbuka di zona hijau ± ' + TK.mdpl + ' mdpl, jauh dari pantai — ' +
                  'aman dari tsunami dan rob.') + '</div>' +
        '<a class="pm-popup-tombol" href="' + TK.gmaps + '" target="_blank" rel="noopener">' +
          '🗺️ Buka di Google Maps</a>' +
      '</div>';
  }

  penandaTK.bindPopup(popupTK, { maxWidth: 300 });

  /* --------------------------------------------------------------- 6. fasilitas */

  D.fasilitas.forEach(function (f) {
    var w = WARNA[f.zona] || WARNA.hijau;
    var titik = L.latLng(f.lat, f.lon);
    var arah = arahKe(titik, TK_LATLNG);
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
        '<div class="pm-popup-baris"><b>Zona</b><span>' + esc(WARNA[f.zona] ? namaZona(f.zona) : '-') + '</span></div>' +
        '<div class="pm-popup-baris"><b>Ketinggian</b><span>± ' + f.mdpl + ' mdpl</span></div>' +
        '<div class="pm-popup-baris"><b>Ke titik kumpul</b><span>' + fmtJarak(f.jarak_tk_m) +
          ' ke arah <strong>' + arah.nama + '</strong><br>' + fmtWaktu(f.jarak_tk_m) + '</span></div>' +
        '<a class="pm-popup-tombol" href="#" data-pm-ke-tk>📍 Tunjukkan titik kumpul</a>' +
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
    var jl = jalurTerdekat(e.latlng);
    var w = zona ? WARNA[zona.zona] : WARNA.hijau;
    var diKB = diKelurahan(lat, lon);

    var html =
      '<div class="pm-popup-kepala ' + (zona ? w.kepala : 'pm-kepala-biru') + '">' +
        (zona ? esc(zona.nama) : 'Lokasi di luar Kampung Baru') +
        '<small>' + (kel ? 'Kelurahan ' + esc(kel)
                         : ringkas('Di luar batas kelurahan terpetakan', 'Di luar batas peta')) + '</small></div>' +
      '<div class="pm-popup-isi">' +
        '<div class="pm-popup-baris"><b>Koordinat</b>' +
          '<span class="pm-koordinat">' + fmtKoordinat(lat, lon) + '</span></div>' +
        '<div class="pm-popup-baris"><b>Zona</b><span>' +
          (zona ? esc(zona.kelas) + ringkas('', ' · ' + esc(zona.elev)) +
                  '<br><small>' + esc(zona.bahaya) + '</small>'
                : ringkas('Titik ini di luar wilayah Kelurahan Kampung Baru, sehingga tidak termasuk zonasi peta ini.',
                          'Di luar wilayah Kelurahan Kampung Baru.')) +
        '</span></div>' +
        // di ponsel ketinggian sudah ikut di baris zona, jadi barisnya dilewati
        (zona ? ringkas('<div class="pm-popup-baris"><b>Ketinggian</b><span>' + esc(zona.elev) + '</span></div>', '') : '') +
        '<div class="pm-popup-baris"><b>Ke titik kumpul</b><span>' + fmtJarak(jarak) +
          ' ke arah <strong>' + arah.nama + '</strong><br>' + fmtWaktu(jarak) + '</span></div>' +
        (jl ? '<div class="pm-popup-baris"><b>Jalur terdekat</b><span>' + namaJalur(jl.props.nama) + ' — ' +
              fmtJarak(jl.jarak) + ' dari sini</span></div>' : '') +
        '<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '"><b>Petunjuk ke titik kumpul</b>' +
          (zona && zona.zona === 'merah'
            ? ringkas('Zona merah. Jangan menunggu — segera bergerak ke arah <strong>' + arah.nama +
                '</strong> menjauhi pantai menuju titik kumpul.',
                'Zona merah — segera bergerak ke arah <strong>' + arah.nama + '</strong> menjauhi pantai.')
            : diKB
              ? ringkas('Bergerak ke arah <strong>' + arah.nama + '</strong> mengikuti panah hijau menuju titik kumpul.',
                  'Ikuti panah hijau ke arah <strong>' + arah.nama + '</strong>.')
              : ringkas('Bila berada di sekitar sini saat bencana, tetap menuju tempat yang lebih tinggi. ' +
                  'Titik kumpul Kampung Baru berada ' + fmtJarak(jarak) + ' ke arah ' + arah.nama + '.',
                  'Menuju tempat yang lebih tinggi — titik kumpul ' + fmtJarak(jarak) +
                  ' ke arah ' + arah.nama + '.')) +
        '</div>' +
        '<a class="pm-popup-tombol" href="#" data-pm-ke-tk>📍 Tunjukkan titik kumpul</a>' +
      '</div>';

    L.popup({ maxWidth: 300 }).setLatLng(e.latlng).setContent(html).openOn(peta);
  });

  peta.on('popupopen', function (ev) {
    /* Selagi popup terbuka, pita judul dan kotak peringatan disembunyikan
       (hanya di layar kecil, lewat CSS) supaya keduanya tidak menutupi kepala
       popup dan peta terasa lebih lega. */
    if (bingkai) bingkai.classList.add('ada-popup');

    /* Jaring pengaman: popup tidak pernah boleh lebih tinggi daripada petanya
       sendiri — misalnya saat ponsel dipakai mendatar sehingga peta jadi
       pendek. Sisa isinya bisa digulir di dalam popup. Batasnya dihitung saat
       popup dibuka karena tinggi peta ikut berubah (putar layar/layar penuh). */
    var batas = Math.max(170, wadah.clientHeight - 110);
    if (ev.popup.options.maxHeight !== batas) {
      ev.popup.options.maxHeight = batas;
      ev.popup.update();
    }
  });
  peta.on('popupclose', function () { if (bingkai) bingkai.classList.remove('ada-popup'); });

  // tombol "Tunjukkan titik kumpul" di dalam popup mana pun
  peta.on('popupopen', function (ev) {
    var t = ev.popup.getElement().querySelector('[data-pm-ke-tk]');
    if (!t) return;
    L.DomEvent.on(t, 'click', function (e) {
      L.DomEvent.preventDefault(e);
      peta.closePopup();
      peta.flyTo(TK_LATLNG, 18, { duration: 0.9 });
      setTimeout(function () { penandaTK.openPopup(); }, 950);
    });
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

  var tblPenuh = tombol('pmLayarPenuh', function () {
    bingkai.classList.toggle('is-penuh');
    var penuh = bingkai.classList.contains('is-penuh');
    tblPenuh.textContent = penuh ? '✕ Keluar Layar Penuh' : '⛶ Layar Penuh';
    tblPenuh.classList.toggle('is-aktif', penuh);
    document.body.style.overflow = penuh ? 'hidden' : '';
    setTimeout(function () { peta.invalidateSize(); }, 220);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bingkai.classList.contains('is-penuh')) tblPenuh.click();
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
      var jarak = jarakMeter(latlng, TK_LATLNG);
      var arah = arahKe(latlng, TK_LATLNG);
      var jl = jalurTerdekat(latlng);
      var w = zona ? WARNA[zona.zona] : WARNA.hijau;

      if (penandaSaya) peta.removeLayer(penandaSaya);
      penandaSaya = L.marker(latlng, {
        zIndexOffset: 900,
        icon: L.divIcon({ className: '', html: '<div class="pm-posisi-saya"></div>',
                          iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] })
      }).addTo(peta);

      penandaSaya.bindPopup(
        '<div class="pm-popup-kepala ' + (zona ? w.kepala : 'pm-kepala-biru') + '">Posisi Anda Sekarang' +
          '<small>' + (zona ? esc(zona.nama)
                            : ringkas('Di luar wilayah Kelurahan Kampung Baru', 'Di luar Kampung Baru')) +
          '</small></div>' +
        '<div class="pm-popup-isi">' +
          '<div class="pm-popup-baris"><b>Koordinat</b>' +
            '<span class="pm-koordinat">' + fmtKoordinat(latlng.lat, latlng.lng) + '</span></div>' +
          '<div class="pm-popup-baris"><b>Zona</b><span>' +
            (zona ? esc(zona.kelas) : 'Di luar zonasi peta ini') + '</span></div>' +
          '<div class="pm-popup-baris"><b>Ke titik kumpul</b><span>' + fmtJarak(jarak) +
            ' ke arah <strong>' + arah.nama + '</strong><br>' + fmtWaktu(jarak) + '</span></div>' +
          (jl ? '<div class="pm-popup-baris"><b>Jalur terdekat</b><span>' + namaJalur(jl.props.nama) + ' — ' +
                fmtJarak(jl.jarak) + ' dari sini</span></div>' : '') +
          '<div class="pm-popup-aksi ' + (zona ? w.aksi : '') + '"><b>Petunjuk</b>' +
            ringkas('Bergerak ke arah <strong>' + arah.nama + '</strong> menuju titik kumpul di Jl. Kesuma Timur.',
                    'Ikuti panah hijau ke arah <strong>' + arah.nama + '</strong>.') + '</div>' +
          '<a class="pm-popup-tombol" href="#" data-pm-ke-tk>📍 Tunjukkan titik kumpul</a>' +
        '</div>', { maxWidth: 300 }
      ).openPopup();
      peta.flyTo(latlng, 17, { duration: 0.9 });
    }, function () {
      tbl.textContent = teksAsli; tbl.disabled = false;
      alert('Lokasi tidak bisa diambil. Pastikan izin lokasi sudah diaktifkan di peramban Anda.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

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
