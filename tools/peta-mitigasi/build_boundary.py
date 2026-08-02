"""Assemble kelurahan boundary polygons from the OSM relation members."""
import json
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import linemerge, unary_union, polygonize

data = json.load(open('osm_kel.json'))

def assemble(rel):
    lines = []
    for m in rel.get('members', []):
        if m.get('role') != 'outer' or m.get('type') != 'way':
            continue
        geom = m.get('geometry') or []
        if len(geom) < 2:
            continue
        lines.append(LineString([(p['lon'], p['lat']) for p in geom]))
    if not lines:
        return None
    merged = linemerge(unary_union(lines))
    polys = list(polygonize(merged))
    if not polys:
        return None
    return max(polys, key=lambda p: p.area)

out = {}
for el in data['elements']:
    name = el.get('tags', {}).get('name')
    poly = assemble(el)
    if poly is None:
        print('FAILED', name)
        continue
    # area in Ha via local equirectangular projection
    lat0 = poly.centroid.y
    import math
    mx = 111320 * math.cos(math.radians(lat0))
    my = 110540
    a = abs(poly.area) * mx * my / 10000.0
    print(f'{name:16s} pts={len(poly.exterior.coords):4d} area={a:8.2f} Ha  bbox={[round(v,6) for v in poly.bounds]}')
    out[name] = poly

json.dump(
    {'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {'nama': n}, 'geometry': mapping(p)}
        for n, p in out.items()]},
    open('kelurahan.geojson', 'w'))
print('\nwrote kelurahan.geojson')
