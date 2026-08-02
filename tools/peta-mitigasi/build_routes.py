"""Build the road layer and the evacuation routes toward the assembly point.

Routes are real shortest paths on the OSM road graph, from origin points spread
across the red zone to the titik kumpul at -4.019402, 119.626271. Segments that
run downhill toward the sea are penalised so the routes climb inland, which is
what a tsunami evacuation route has to do.
"""
import heapq
import json
import math
from collections import defaultdict

import numpy as np
from shapely.geometry import shape, Point, LineString, mapping, MultiPolygon
from shapely.ops import unary_union

TITIK_KUMPUL = (119.626271, -4.019402)  # lon, lat

kel = json.load(open('kelurahan.geojson'))
KB = shape(next(f for f in kel['features'] if f['properties']['nama'] == 'Kampung Baru')['geometry']).buffer(0)
zona = json.load(open('zona.geojson'))
Zmerah = shape(next(f for f in zona['features'] if f['properties']['zona'] == 'merah')['geometry']).buffer(0)
Zkuning = shape(next(f for f in zona['features'] if f['properties']['zona'] == 'kuning')['geometry']).buffer(0)

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


# ------------------------------------------------------------------ road layer
STUDY = KB.buffer(0.0016)  # kelurahan + a strip of the neighbours, left and right
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
        nama = tags.get('name', '')
        road_feats.append({
            'type': 'Feature',
            'properties': {
                'nama': nama,
                'kelas': hw,
                'utama': hw in ('trunk', 'primary', 'secondary', 'tertiary'),
                'di_kelurahan': part.intersects(KB),
            },
            'geometry': mapping(part.simplify(3e-6, preserve_topology=True)),
        })

json.dump({'type': 'FeatureCollection', 'features': road_feats}, open('jalan.geojson', 'w'))
named = sorted({f['properties']['nama'] for f in road_feats if f['properties']['nama']})
print(f'roads: {len(road_feats)} segments, {len(named)} named')

# ------------------------------------------------------------------ road graph
GRID = 1e-5  # ~1 m snapping tolerance


def key(pt):
    return (round(pt[0] / GRID), round(pt[1] / GRID))


nodes = {}
adj = defaultdict(list)


def add_edge(a, b, name):
    ka, kb_ = key(a), key(b)
    if ka == kb_:
        return
    nodes.setdefault(ka, a)
    nodes.setdefault(kb_, b)
    d = dist_m(a, b)
    ea, eb = elev_at(*a), elev_at(*b)
    # cost: distance, penalised when the step loses height (i.e. heads seaward)
    def cost(from_e, to_e):
        drop = max(0.0, from_e - to_e)
        return d * (1.0 + 0.55 * drop)
    adj[ka].append((kb_, cost(ea, eb), name))
    adj[kb_].append((ka, cost(eb, ea), name))


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

print(f'graph: {len(nodes)} nodes, {sum(len(v) for v in adj.values())//2} edges')


def nearest_node(pt):
    return min(nodes, key=lambda k: dist_m(nodes[k], pt))


TK = nearest_node(TITIK_KUMPUL)
print(f'titik kumpul snapped to {nodes[TK]}  ({dist_m(nodes[TK], TITIK_KUMPUL):.0f} m away)')


def dijkstra(src):
    dist = {src: 0.0}
    prev = {}
    pq = [(0.0, src)]
    while pq:
        dcur, u = heapq.heappop(pq)
        if dcur > dist.get(u, float('inf')):
            continue
        for v, w, nm in adj[u]:
            nd = dcur + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                prev[v] = (u, nm)
                heapq.heappush(pq, (nd, v))
    return dist, prev


DIST, PREV = dijkstra(TK)
print(f'reachable nodes: {len(DIST)}')

# --------------------------------------------------- pick origins in the red zone
def poly_parts(g):
    return list(g.geoms) if isinstance(g, MultiPolygon) else [g]


origins = []
seen = set()
for poly in poly_parts(Zmerah) + poly_parts(Zkuning):
    minx, miny, maxx, maxy = poly.bounds
    step = 0.00055
    y = miny
    while y <= maxy:
        x = minx
        while x <= maxx:
            p = Point(x, y)
            if poly.contains(p):
                nk = nearest_node((x, y))
                if nk in DIST and nk not in seen and dist_m(nodes[nk], (x, y)) < 90:
                    seen.add(nk)
                    origins.append(nk)
            x += step
        y += step
print(f'candidate origins on the road graph: {len(origins)}')


def path_to_tk(src):
    pts, names, cur = [nodes[src]], [], src
    while cur != TK:
        if cur not in PREV:
            return None, None
        nxt, nm = PREV[cur]
        if nm:
            names.append(nm)
        pts.append(nodes[nxt])
        cur = nxt
    return pts, names


# keep the longest distinct paths, then drop ones fully covered by another
raw = []
for o in sorted(origins, key=lambda k: -DIST[k]):
    pts, names = path_to_tk(o)
    if not pts or len(pts) < 3:
        continue
    line = LineString(pts)
    length = sum(dist_m(a, b) for a, b in zip(pts, pts[1:]))
    if length < 130:
        continue
    raw.append({'line': line, 'names': names, 'len': length, 'pts': pts})

routes = []
for r in raw:
    buf = r['line'].buffer(1.2e-5)
    if any(r['line'].difference(x['line'].buffer(1.8e-5)).length < r['line'].length * 0.22 for x in routes):
        continue
    routes.append(r)
    if len(routes) >= 9:
        break

print(f'\nevacuation routes kept: {len(routes)}')
feats = []
for i, r in enumerate(routes, 1):
    seq, prev_nm = [], None
    for nm in r['names']:
        if nm and nm != prev_nm:
            seq.append(nm.replace('Jalan ', 'Jl. '))
            prev_nm = nm
    via = ' → '.join(seq[:6])
    start_e = elev_at(*r['pts'][0])
    print(f'  R{i}: {r["len"]:5.0f} m | mulai {start_e:.0f} mdpl | {via[:95]}')
    feats.append({
        'type': 'Feature',
        'properties': {
            'id': f'R{i}',
            'nama': f'Jalur Evakuasi {i}',
            'panjang_m': int(round(r['len'])),
            'via': via,
            'mulai_mdpl': int(start_e),
            'estimasi_menit': max(1, int(round(r['len'] / 75))),  # ~4.5 km/h jalan cepat
        },
        'geometry': mapping(r['line'].simplify(4e-6, preserve_topology=True)),
    })

json.dump({'type': 'FeatureCollection', 'features': feats}, open('jalur_evakuasi.geojson', 'w'))
print('\nwrote jalan.geojson + jalur_evakuasi.geojson')
