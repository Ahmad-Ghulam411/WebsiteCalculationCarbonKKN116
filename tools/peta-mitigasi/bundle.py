"""Bundle every layer into one JS file the page can load without fetch()."""
import json
import math
import re

import numpy as np
from shapely.geometry import shape, Point, LineString, mapping, MultiPolygon

OUT = '/home/user/WebsiteCalculationCarbonKKN116/data/peta-mitigasi-data.js'

kel = json.load(open('kelurahan.geojson'))
KB = shape(next(f for f in kel['features'] if f['properties']['nama'] == 'Kampung Baru')['geometry']).buffer(0)
zona = json.load(open('zona.geojson'))
jalan = json.load(open('jalan.geojson'))
jalur = json.load(open('jalur_evakuasi.geojson'))

dem = np.load('dem.npz')
DZ, DX, DY = dem['Z'], dem['gx'], dem['gy']
zshapes = {f['properties']['zona']: shape(f['geometry']).buffer(0) for f in zona['features']}

lat0 = KB.centroid.y
MX = 111320 * math.cos(math.radians(lat0))
MY = 110540
TK = (119.626271, -4.019402)


def elev_at(lon, lat):
    i = int(np.clip(np.searchsorted(DX, lon) - 1, 0, len(DX) - 2))
    j = int(np.clip(np.searchsorted(DY, lat) - 1, 0, len(DY) - 2))
    return float(DZ[j, i])


def zone_of(lon, lat):
    p = Point(lon, lat)
    for z in ('merah', 'kuning', 'hijau'):
        if zshapes[z].contains(p):
            return z
    return min(('merah', 'kuning', 'hijau'), key=lambda z: zshapes[z].distance(p))


def dist_m(a, b):
    return math.hypot((a[0] - b[0]) * MX, (a[1] - b[1]) * MY)


def rnd(obj, nd=6):
    """Round every coordinate so the bundle stays small."""
    if isinstance(obj, (list, tuple)):
        if len(obj) == 2 and all(isinstance(v, (int, float)) for v in obj):
            return [round(obj[0], nd), round(obj[1], nd)]
        return [rnd(o, nd) for o in obj]
    return obj


# ------------------------------------------------------------------ 1. batas
batas = {'type': 'FeatureCollection', 'features': []}
for f in kel['features']:
    g = shape(f['geometry']).simplify(6e-6, preserve_topology=True)
    nm = f['properties']['nama']
    batas['features'].append({
        'type': 'Feature',
        'properties': {'nama': nm, 'utama': nm == 'Kampung Baru',
                       'luas_ha': round(shape(f['geometry']).area * MX * MY / 1e4, 1)},
        'geometry': {'type': 'Polygon', 'coordinates': rnd(mapping(g)['coordinates'])},
    })

# ------------------------------------------------------------------ 2. zona
ZINFO = {
    'merah': {
        'nama': 'Zona Merah — Risiko Tinggi',
        'bahaya': 'Tsunami, Banjir Rob, Gelombang Pasang & Abrasi',
        'aksi': 'Wajib segera evakuasi ke titik kumpul begitu ada gempa kuat atau peringatan dini tsunami. Jangan menunggu air terlihat naik.',
    },
    'kuning': {
        'nama': 'Zona Kuning — Risiko Sedang',
        'bahaya': 'Banjir & Genangan, limpasan air dari zona pesisir',
        'aksi': 'Siaga. Amankan barang berharga ke tempat tinggi dan bersiap evakuasi bila air terus naik atau ada perintah dari petugas.',
    },
    'hijau': {
        'nama': 'Zona Hijau — Risiko Rendah',
        'bahaya': 'Relatif aman dari bahaya utama (tsunami, rob, gelombang pasang)',
        'aksi': 'Area tujuan evakuasi. Titik kumpul berada di zona ini. Bantu warga dari zona merah dan kuning saat evakuasi.',
    },
}
zona_out = {'type': 'FeatureCollection', 'features': []}
for f in zona['features']:
    z = f['properties']['zona']
    g = shape(f['geometry'])
    zona_out['features'].append({
        'type': 'Feature',
        'properties': {**f['properties'], **ZINFO[z]},
        'geometry': {'type': mapping(g)['type'], 'coordinates': rnd(mapping(g)['coordinates'])},
    })

# ------------------------------------------------------------------ 3. jalan
# merge segments that share a name so each street pops up as one feature
by_name = {}
for f in jalan['features']:
    nm = f['properties']['nama'] or ''
    by_name.setdefault((nm, f['properties']['utama']), []).append(f)

jalan_out = {'type': 'FeatureCollection', 'features': []}
for (nm, utama), fs in by_name.items():
    coords = [rnd(f['geometry']['coordinates']) for f in fs]
    mid = None
    zon = None
    ket = ''
    if nm:
        longest = max(fs, key=lambda f: shape(f['geometry']).length)
        line = shape(longest['geometry'])
        mp = line.interpolate(0.5, normalized=True)
        mid = [round(mp.x, 6), round(mp.y, 6)]
        zon = zone_of(mp.x, mp.y)
        ket = f'{elev_at(mp.x, mp.y):.0f} mdpl'
    jalan_out['features'].append({
        'type': 'Feature',
        'properties': {
            'nama': nm.replace('Jalan ', 'Jl. '),
            'utama': utama,
            'di_kelurahan': any(f['properties']['di_kelurahan'] for f in fs),
            'zona': zon,
            'tengah': mid,
            'mdpl': ket,
            'jarak_tk_m': int(round(dist_m((mid[0], mid[1]), TK))) if mid else None,
        },
        'geometry': {'type': 'MultiLineString', 'coordinates': coords},
    })

# ------------------------------------------------------------------ 4. jalur evakuasi
jalur_out = {'type': 'FeatureCollection', 'features': []}
for f in jalur['features']:
    g = shape(f['geometry'])
    jalur_out['features'].append({
        'type': 'Feature',
        'properties': f['properties'],
        'geometry': {'type': 'LineString', 'coordinates': rnd(mapping(g)['coordinates'])},
    })

# ------------------------------------------------------------------ 5. fasilitas
poi_raw = json.load(open('osm_poi.json'))['elements']
IKON = {
    'school': ('🏫', 'Sekolah'), 'place_of_worship': ('🕌', 'Rumah Ibadah'),
    'clinic': ('🏥', 'Fasilitas Kesehatan'), 'hospital': ('🏥', 'Rumah Sakit'),
    'townhall': ('🏛️', 'Kantor Pemerintah'), 'government': ('🏛️', 'Kantor Pemerintah'),
    'police': ('👮', 'Kepolisian'), 'fire_station': ('🚒', 'Pemadam Kebakaran'),
}
fasil = []
seen = set()
for e in poi_raw:
    t = e.get('tags', {})
    c = e.get('center') or {'lat': e.get('lat'), 'lon': e.get('lon')}
    if not c.get('lat'):
        continue
    kind = t.get('amenity') or t.get('office')
    nm = t.get('name')
    if kind not in IKON or not nm:
        continue
    p = Point(c['lon'], c['lat'])
    if not KB.buffer(0.0004).contains(p):
        continue
    k = re.sub(r'\s+', ' ', nm).strip().lower()
    if k in seen:
        continue
    seen.add(k)
    ikon, jenis = IKON[kind]
    fasil.append({
        'nama': nm, 'jenis': jenis, 'ikon': ikon,
        'lat': round(c['lat'], 6), 'lon': round(c['lon'], 6),
        'zona': zone_of(c['lon'], c['lat']),
        'mdpl': int(elev_at(c['lon'], c['lat'])),
        'jarak_tk_m': int(round(dist_m((c['lon'], c['lat']), TK))),
    })
fasil.sort(key=lambda x: x['jarak_tk_m'])
print(f'fasilitas: {len(fasil)}')

bundle = {
    'titikKumpul': {
        'lat': -4.019402, 'lon': 119.626271,
        'nama': 'Titik Kumpul / Assembly Point',
        'ket': 'Lapangan / area terbuka sekitar Jl. Kesuma Timur',
        'zona': zone_of(*TK), 'mdpl': int(elev_at(*TK)),
        'gmaps': 'https://maps.app.goo.gl/mxeoUcmU68TUK8HQ7',
    },
    'batas': batas, 'zona': zona_out, 'jalan': jalan_out,
    'jalur': jalur_out, 'fasilitas': fasil,
    'meta': {
        'kelurahan': 'Kampung Baru', 'kecamatan': 'Bacukiki Barat', 'kota': 'Parepare',
        'luasHa': round(KB.area * MX * MY / 1e4, 2),
        'bbox': [round(v, 6) for v in KB.bounds],
    },
}

js = (
    '/* eslint-disable */\n'
    '/* ============================================================================\n'
    ' *  DATA PETA MITIGASI BENCANA — KELURAHAN KAMPUNG BARU, BACUKIKI BARAT, PAREPARE\n'
    ' *\n'
    ' *  Berkas ini dibuat otomatis (lihat README) dari:\n'
    ' *   - Batas kelurahan & jaringan jalan : OpenStreetMap (Overpass API)\n'
    ' *   - Model elevasi (DEM)              : SRTM 30 m, disampel via Open-Elevation\n'
    ' *   - Kelas bahaya & luasan            : Dokumen Kajian Risiko Bencana\n'
    ' *                                        Kota Parepare 2022-2026 (BPBD)\n'
    ' *  Jangan diedit manual.\n'
    ' * ========================================================================== */\n'
    'window.DATA_PETA_MITIGASI = ' + json.dumps(bundle, ensure_ascii=False, separators=(',', ':')) + ';\n'
)
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(js)
print(f'wrote {OUT}  ({len(js)/1024:.1f} KB)')
print('titik kumpul zona:', bundle['titikKumpul']['zona'], bundle['titikKumpul']['mdpl'], 'mdpl')
print('jalan bernama:', sum(1 for f in jalan_out['features'] if f['properties']['nama']))
