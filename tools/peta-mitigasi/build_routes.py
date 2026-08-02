"""Bangun lapisan jalan dan jaringan arah evakuasi menuju titik kumpul.

Setiap ruas jalan di dalam Kelurahan Kampung Baru diberi arah evakuasi, bukan
hanya beberapa jalur terpilih. Caranya:

1. Bangun graf jalan dari data OpenStreetMap.
2. Hitung Dijkstra dari titik kumpul ke seluruh simpul. Biaya tiap ruas
   diperberat bila menurun ke arah laut, supaya rute cenderung menanjak
   menjauhi pantai — perilaku yang benar untuk evakuasi tsunami.
3. Untuk setiap ruas jalan, arah evakuasi = dari simpul berbiaya lebih besar
   menuju simpul berbiaya lebih kecil (yang lebih dekat ke titik kumpul).
4. Ruas-ruas berarah itu disambung jadi rantai panjang agar enak digambar,
   diutamakan menyambung pada jalan dengan nama yang sama.

Hasilnya: dari titik mana pun di jalan wilayah Kampung Baru selalu ada panah
yang menunjukkan arah menuju titik kumpul.
"""
import heapq
import json
import math
from collections import defaultdict

import numpy as np
from shapely.geometry import shape, Point, LineString, mapping
from shapely.ops import unary_union

TITIK_KUMPUL = (119.626271, -4.019402)  # lon, lat

kel = json.load(open('kelurahan.geojson'))
KB = shape(next(f for f in kel['features'] if f['properties']['nama'] == 'Kampung Baru')['geometry']).buffer(0)

dem = np.load('dem.npz')
DZ, DX, DY = dem['Z'], dem['gx'], dem['gy']


def elev_at(lon, lat):
    i = int(np.clip(np.searchsorted(DX, lon) - 1, 0, len(DX) - 2))
    j = int(np.clip(np.searchsorted(DY, lat) - 1, 0, len(DY) - 2))
    return float(DZ[j, i])


lat0 = KB.centroid.y
MX = 111320 * math.cos(math.radians(lat0))
MY = 110540


def dist_m(a, b):
    return math.hypot((a[0] - b[0]) * MX, (a[1] - b[1]) * MY)


# ------------------------------------------------------------------ lapisan jalan
STUDY = KB.buffer(0.0016)    # kelurahan + sedikit wilayah tetangga, untuk lapisan jalan
EVAK = KB.buffer(0.00012)    # ± 13 m: batas wilayah yang diberi arah evakuasi
roads_raw = json.load(open('osm_roads.json'))['elements']

SKIP = {'footway', 'path', 'steps', 'cycleway', 'track', 'construction', 'proposed'}
road_feats = []
for w in roads_raw:
    tags = w.get('tags', {})
    hw = tags.get('highway')
    if hw in SKIP:
        continue
    geom = w.get('geometry') or []
    if len(geom) < 2:
        continue
    line = LineString([(p['lon'], p['lat']) for p in geom])
    if not line.intersects(STUDY):
        continue
    clipped = line.intersection(STUDY)
    if clipped.is_empty:
        continue
    parts = list(clipped.geoms) if clipped.geom_type == 'MultiLineString' else [clipped]
    for part in parts:
        if part.geom_type != 'LineString' or part.length == 0:
            continue
        road_feats.append({
            'type': 'Feature',
            'properties': {
                'nama': tags.get('name', ''),
                'kelas': hw,
                'utama': hw in ('trunk', 'primary', 'secondary', 'tertiary'),
                'di_kelurahan': part.intersects(KB),
            },
            'geometry': mapping(part.simplify(3e-6, preserve_topology=True)),
        })

json.dump({'type': 'FeatureCollection', 'features': road_feats}, open('jalan.geojson', 'w'))
named = sorted({f['properties']['nama'] for f in road_feats if f['properties']['nama']})
print(f'jalan: {len(road_feats)} ruas, {len(named)} bernama')

# ------------------------------------------------------------------ graf jalan
GRID = 1e-5  # toleransi penyambungan ± 1 m


def key(pt):
    return (round(pt[0] / GRID), round(pt[1] / GRID))


nodes = {}
edges = {}   # (ka, kb) terurut -> {'len': meter, 'nama': str}
adj = defaultdict(list)


def add_edge(a, b, name):
    ka, kb_ = key(a), key(b)
    if ka == kb_:
        return
    nodes.setdefault(ka, a)
    nodes.setdefault(kb_, b)
    d = dist_m(a, b)
    ea, eb = elev_at(*a), elev_at(*b)

    def biaya(from_e, to_e):
        # ruas menurun (ke arah laut) diperberat agar rute memilih menanjak
        return d * (1.0 + 0.55 * max(0.0, from_e - to_e))

    ruas = tuple(sorted((ka, kb_)))
    if ruas not in edges:
        edges[ruas] = {'len': d, 'nama': name}
    adj[ka].append((kb_, biaya(ea, eb)))
    adj[kb_].append((ka, biaya(eb, ea)))


for w in roads_raw:
    tags = w.get('tags', {})
    if tags.get('highway') in SKIP:
        continue
    geom = w.get('geometry') or []
    nm = tags.get('name', '')
    for p, q in zip(geom, geom[1:]):
        a, b = (p['lon'], p['lat']), (q['lon'], q['lat'])
        if Point(a).intersects(STUDY) or Point(b).intersects(STUDY):
            add_edge(a, b, nm)

print(f'graf: {len(nodes)} simpul, {len(edges)} ruas')


def nearest_node(pt):
    return min(nodes, key=lambda k: dist_m(nodes[k], pt))


TK = nearest_node(TITIK_KUMPUL)
print(f'titik kumpul menempel di {nodes[TK]} ({dist_m(nodes[TK], TITIK_KUMPUL):.0f} m)')


def dijkstra(src):
    biaya = {src: 0.0}
    dari = {}
    pq = [(0.0, src)]
    urut = []
    while pq:
        c, u = heapq.heappop(pq)
        if c > biaya.get(u, float('inf')):
            continue
        urut.append(u)
        for v, w in adj[u]:
            nc = c + w
            if nc < biaya.get(v, float('inf')):
                biaya[v] = nc
                dari[v] = u
                heapq.heappush(pq, (nc, v))
    return biaya, dari, urut


BIAYA, DARI, URUT = dijkstra(TK)
print(f'simpul terjangkau: {len(BIAYA)} / {len(nodes)}')

# jarak tempuh sebenarnya (meter) ke titik kumpul, menyusuri pohon lintasan
JARAK = {TK: 0.0}
for u in URUT:
    if u in JARAK:
        continue
    p = DARI.get(u)
    if p is not None and p in JARAK:
        JARAK[u] = JARAK[p] + dist_m(nodes[u], nodes[p])

# --------------------------------------------------- arah evakuasi tiap ruas
terarah = {}       # (hulu, hilir) -> {'len', 'nama'}
di_kel, luput = 0, 0
for (ka, kb_), info in edges.items():
    a, b = nodes[ka], nodes[kb_]
    tengah = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    if not EVAK.contains(Point(tengah)):
        continue          # di luar Kampung Baru — tidak diberi arah evakuasi
    di_kel += 1
    if ka not in JARAK or kb_ not in JARAK or abs(BIAYA[ka] - BIAYA[kb_]) < 1e-9:
        luput += 1
        continue
    hulu, hilir = (ka, kb_) if BIAYA[ka] > BIAYA[kb_] else (kb_, ka)
    terarah[(hulu, hilir)] = info

print(f'ruas di dalam kelurahan: {di_kel} | diberi arah: {len(terarah)} | terlewat: {luput}')

# Sebagian lintasan terpendek harus keluar sebentar dari batas kelurahan sebelum
# sampai ke titik kumpul. Tanpa ruas penyambung itu, panah akan berhenti di tepi
# wilayah dan warga kehilangan arah. Jadi lintasan dari setiap simpul di dalam
# kelurahan ditelusuri sampai titik kumpul, lalu ruasnya ikut diberi arah.
penyambung = 0
awal_simpul = {u for e in list(terarah) for u in e}
for n in list(awal_simpul):
    cur = n
    while cur != TK and cur in DARI:
        nxt = DARI[cur]
        if (cur, nxt) not in terarah:
            info = edges.get(tuple(sorted((cur, nxt))))
            if info is None:
                break
            terarah[(cur, nxt)] = info
            penyambung += 1
        cur = nxt

print(f'ruas penyambung ke titik kumpul (boleh melintasi batas): +{penyambung}')

# ------------------------------------------------------ sambung jadi rantai
keluar = defaultdict(list)
masuk = defaultdict(list)
for (u, v) in terarah:
    keluar[u].append(v)
    masuk[v].append(u)

belum = set(terarah)


def sambungan(kandidat, nama, buat_ruas):
    """Pilih sambungan berikutnya; utamakan jalan dengan nama sama."""
    pilihan = [x for x in kandidat if buat_ruas(x) in belum]
    if not pilihan:
        return None
    senama = [x for x in pilihan if terarah[buat_ruas(x)]['nama'] == nama]
    return (senama or pilihan)[0]


rantai = []
while belum:
    awal = next(iter(belum))
    nama0 = terarah[awal]['nama']
    jalur = [awal]
    belum.discard(awal)

    v = awal[1]                                   # perpanjang ke hilir
    while True:
        nxt = sambungan(keluar[v], nama0, lambda x, s=None: (v, x))
        if nxt is None:
            break
        belum.discard((v, nxt))
        jalur.append((v, nxt))
        v = nxt

    u = awal[0]                                   # perpanjang ke hulu
    while True:
        prv = sambungan(masuk[u], nama0, lambda x, s=None: (x, u))
        if prv is None:
            break
        belum.discard((prv, u))
        jalur.insert(0, (prv, u))
        u = prv

    rantai.append(jalur)

print(f'rantai jalur evakuasi: {len(rantai)}')

# ------------------------------------------------------------------- keluaran
feats = []
for i, jalur in enumerate(sorted(rantai, key=lambda r: -sum(terarah[e]['len'] for e in r)), 1):
    titik = [nodes[jalur[0][0]]] + [nodes[e[1]] for e in jalur]
    panjang = sum(terarah[e]['len'] for e in jalur)
    # Rantai sependek apa pun tetap dipakai: membuangnya akan memutus jaringan
    # panah, sehingga warga bisa kehilangan arah di tengah persimpangan.

    urutan, prev = [], None                       # nama jalan yang dilewati
    for e in jalur:
        nm = terarah[e]['nama']
        if nm and nm != prev:
            urutan.append(nm.replace('Jalan ', 'Jl. '))
            prev = nm
    via = ' → '.join(urutan[:6]) or 'Jalan lokal'

    hulu = jalur[0][0]
    sisa = JARAK.get(hulu, 0.0)
    feats.append({
        'type': 'Feature',
        'properties': {
            'id': f'E{i}',
            'nama': 'Jalur Evakuasi — ' + (urutan[0] if urutan else 'Jalan Lokal'),
            'panjang_m': int(round(panjang)),
            'via': via,
            'mulai_mdpl': int(elev_at(*nodes[hulu])),
            'jarak_tk_m': int(round(sisa)),
            'estimasi_menit': max(1, int(round(sisa / 75))),  # ± 4,5 km/jam
        },
        # Sengaja TIDAK disederhanakan: penyederhanaan sempat membuang simpul
        # persimpangan, sehingga rantai panah terputus di titik pertemuan jalan.
        'geometry': mapping(LineString(titik)),
    })

json.dump({'type': 'FeatureCollection', 'features': feats}, open('jalur_evakuasi.geojson', 'w'))

# ---------------------------------------------------------------- laporan cakupan
jalan_kb = unary_union([
    shape(f['geometry']).intersection(KB) for f in road_feats if f['properties']['di_kelurahan']])
jalur_geom = unary_union([shape(f['geometry']) for f in feats])
total = jalan_kb.length
tercakup = jalan_kb.intersection(jalur_geom.buffer(1.5e-5)).length
print(f'\njalur evakuasi tersimpan: {len(feats)}')
print(f'panjang total jalur     : {sum(f["properties"]["panjang_m"] for f in feats)} m')
print(f'CAKUPAN jalan kelurahan : {tercakup / total * 100:.1f}% '
      f'({tercakup * 111000:.0f} m dari {total * 111000:.0f} m)')
print('\n6 jalur terpanjang:')
for f in feats[:6]:
    p = f['properties']
    print(f'  {p["panjang_m"]:4d} m | sisa ke TK {p["jarak_tk_m"]:4d} m | {p["via"][:66]}')
print('\nwrote jalan.geojson + jalur_evakuasi.geojson')
