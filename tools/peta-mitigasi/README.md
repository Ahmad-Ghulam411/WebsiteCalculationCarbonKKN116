# Pembangkit data Peta Mitigasi Bencana Kampung Baru

Skrip di folder ini menghasilkan `data/peta-mitigasi-data.js` — satu berkas berisi
seluruh lapisan peta yang dipakai `peta-mitigasi-bencana.html`:

| Lapisan | Isi |
|---|---|
| `batas` | Batas Kelurahan Kampung Baru + 5 kelurahan tetangga |
| `zona` | Poligon zona merah / kuning / hijau |
| `jalan` | Jaringan jalan bernama beserta zona & ketinggiannya |
| `jalur` | Jaringan arah evakuasi — **seluruh jalan** di kelurahan, berpanah menuju titik kumpul |
| `fasilitas` | Fasilitas umum (sekolah, masjid, puskesmas, kantor) |

**Berkas `data/peta-mitigasi-data.js` sudah ada di repo dan tidak perlu dibuat ulang
untuk menjalankan situs.** Skrip ini hanya diperlukan bila data perlu diperbarui,
misalnya saat batas wilayah berubah, ada jalan baru, atau titik kumpul dipindahkan.

## Sumber data

- **Batas kelurahan & jaringan jalan** — OpenStreetMap melalui Overpass API.
  Kelurahan Kampung Baru = relasi OSM `21073124`.
- **Model elevasi permukaan (DEM)** — SRTM 30 m, disampel lewat Open-Elevation API.
- **Kelas bahaya & luas area terpapar** — Dokumen Kajian Risiko Bencana
  Kota Parepare Tahun 2022–2026 (BPBD Kota Parepare).
- **Titik kumpul** — `-4.019402, 119.626271`, penetapan lapangan tim KKN Gel. 116.

## Dasar pembagian zona

Ambang ketinggian dipilih supaya luas tiap zona mendekati angka resmi pada
dokumen KRB untuk Kelurahan Kampung Baru:

| Zona | Ambang | Luas hasil | Pembanding dokumen KRB |
|---|---|---|---|
| Merah | 0 – 9 mdpl | 5,32 Ha | bahaya tsunami **5,49 Ha** (kelas TINGGI) |
| Kuning | 9 – 15 mdpl | 12,62 Ha | gelombang ekstrim & abrasi 10,98 Ha; banjir 2,40 Ha |
| Hijau | > 15 mdpl | 27,95 Ha | sisa wilayah |

Total 45,89 Ha, sejalan dengan luas kelurahan hasil pengukuran batas 45,92 Ha
dan angka 48,06 Ha pada dokumen KRB.

## Cara menjalankan ulang

Butuh Python 3 dan koneksi internet.

```bash
pip install numpy matplotlib shapely
cd tools/peta-mitigasi

python3 build_boundary.py   # osm_kel.json      -> kelurahan.geojson
python3 sample_dem.py       # Open-Elevation    -> dem.npz
python3 build_zones.py      # dem.npz           -> zona.geojson
python3 build_routes.py     # osm_roads.json    -> jalan.geojson, jalur_evakuasi.geojson
python3 bundle.py           # semuanya          -> ../../data/peta-mitigasi-data.js
```

`build_boundary.py` dan `build_routes.py` membaca `osm_kel.json`, `osm_roads.json`,
dan `osm_poi.json`. Ambil ulang berkas tersebut dari Overpass API bila diperlukan:

```bash
# batas kelurahan (Kampung Baru + tetangga)
curl -o osm_kel.json 'https://overpass-api.de/api/interpreter' \
  --data-urlencode 'data=[out:json][timeout:120];rel(id:21073124,21073126,21073123,21073137,21073127,21073122);out geom;'

# jaringan jalan
curl -o osm_roads.json 'https://overpass-api.de/api/interpreter' \
  --data-urlencode 'data=[out:json][timeout:90];(way["highway"](-4.0290,119.6170,-4.0100,119.6340););out geom;'

# fasilitas umum
curl -o osm_poi.json 'https://overpass-api.de/api/interpreter' \
  --data-urlencode 'data=[out:json][timeout:90];(nwr["amenity"~"school|place_of_worship|hospital|clinic|townhall|police|fire_station"](-4.0250,119.6200,-4.0140,119.6340);nwr["office"="government"](-4.0250,119.6200,-4.0140,119.6340););out tags center;'
```

## Bagaimana arah evakuasi ditentukan

`build_routes.py` tidak memilih beberapa jalur favorit, melainkan memberi arah
pada **setiap ruas jalan** di dalam kelurahan:

1. Dijkstra dijalankan dari titik kumpul ke seluruh simpul jalan. Biaya sebuah
   ruas diperberat bila menurun ke arah laut, sehingga rute cenderung menanjak
   menjauhi pantai — perilaku yang benar untuk evakuasi tsunami.
2. Arah panah tiap ruas = dari simpul berbiaya besar ke simpul berbiaya kecil,
   yaitu arah yang mendekatkan warga ke titik kumpul.
3. Ruas-ruas itu disambung jadi rantai panjang, diutamakan menyambung pada
   jalan bernama sama, supaya popup-nya menampilkan urutan jalan yang masuk akal.
4. Lintasan yang harus keluar sebentar dari batas kelurahan tetap disertakan,
   agar rantai panah tidak terputus di tepi wilayah.

Karena setiap langkah selalu menurunkan biaya menuju titik kumpul, mengikuti
panah dari titik mana pun dijamin sampai ke titik kumpul dan tidak akan berputar.
Sifat ini diverifikasi ulang tiap kali data dibuat: **cakupan 100% jalan
kelurahan, 405 simpul diuji, semuanya sampai, tanpa jalan buntu maupun siklus.**

> ⚠️ Geometri jalur evakuasi sengaja **tidak disederhanakan**. Penyederhanaan
> sempat membuang simpul persimpangan sehingga rantai panah terputus.

## Cara memindahkan titik kumpul

Ubah nilai `TITIK_KUMPUL` di `build_routes.py` dan `TK` di `bundle.py`, lalu
jalankan ulang `build_routes.py` dan `bundle.py`. Seluruh arah panah akan
dihitung ulang otomatis menuju titik yang baru.
