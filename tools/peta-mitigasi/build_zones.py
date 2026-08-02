"""Turn the sampled DEM into zona merah / kuning / hijau polygons for Kampung Baru.

Zoning follows the logic of the Kajian Risiko Bencana Kota Parepare 2022-2026:
low-lying coastal ground carries the tsunami / rob / gelombang-pasang hazard,
the mid slope carries the banjir-genangan hazard, higher ground is the safe area.
Thresholds are calibrated so the resulting hectares line up with the KRB tables
for Kelurahan Kampung Baru.
"""
import json
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from shapely.geometry import shape, Polygon, MultiPolygon, mapping
from shapely.ops import unary_union

# ---------------------------------------------------------------- input data
kel = json.load(open('kelurahan.geojson'))
KB = shape(next(f for f in kel['features'] if f['properties']['nama'] == 'Kampung Baru')['geometry'])
KB = KB.buffer(0)

d = np.load('dem.npz')
Z, gx, gy = d['Z'], d['gx'], d['gy']

lat0 = KB.centroid.y
MX = 111320 * math.cos(math.radians(lat0))
MY = 110540


def ha(geom):
    return geom.area * MX * MY / 1e4


# -------------------------------------------------- smooth + upsample the DEM
def smooth(a, passes=3):
    out = a.astype(float).copy()
    for _ in range(passes):
        p = np.pad(out, 1, mode='edge')
        out = (
            p[1:-1, 1:-1] * 4
            + p[:-2, 1:-1] * 2 + p[2:, 1:-1] * 2
            + p[1:-1, :-2] * 2 + p[1:-1, 2:] * 2
            + p[:-2, :-2] + p[:-2, 2:] + p[2:, :-2] + p[2:, 2:]
        ) / 16.0
    return out


def upsample(a, xs, ys, factor=4):
    ny, nx = a.shape
    nxs = np.linspace(xs[0], xs[-1], nx * factor)
    nys = np.linspace(ys[0], ys[-1], ny * factor)
    # bilinear: interpolate along x then along y
    tmp = np.empty((ny, nx * factor))
    for j in range(ny):
        tmp[j] = np.interp(nxs, xs, a[j])
    out = np.empty((ny * factor, nx * factor))
    for i in range(nx * factor):
        out[:, i] = np.interp(nys, ys, tmp[:, i])
    return out, nxs, nys


Zs = smooth(Z, passes=2)
Zu, ux, uy = upsample(Zs, gx, gy, factor=4)
Zu = smooth(Zu, passes=4)
print(f'upsampled DEM {Zu.shape}  min={Zu.min():.1f} max={Zu.max():.1f}')


# -------------------------------------------------- contour -> shapely polygons
def polys_below(level):
    """Polygons where the smoothed elevation is <= level."""
    fig = plt.figure()
    cs = plt.contourf(ux, uy, Zu, levels=[-1e4, level])
    out = []
    for path in cs.get_paths():
        for poly in path.to_polygons():
            if len(poly) >= 4:
                p = Polygon(poly)
                if p.is_valid or not p.is_valid:
                    p = p.buffer(0)
                if not p.is_empty:
                    out.append(p)
    plt.close(fig)
    if not out:
        return Polygon()
    # rings returned by to_polygons() include holes; xor-style union handles both
    merged = unary_union([p for p in out if p.area > 0])
    return merged


def area_below(level):
    g = polys_below(level).intersection(KB)
    return ha(g)


# calibrate the two thresholds against KRB hectares
print('\ncalibration inside Kampung Baru (total %.1f Ha):' % ha(KB))
for lv in [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18]:
    print(f'  <= {lv:2d} m -> {area_below(lv):6.2f} Ha')

RED_LEVEL = 9.0     # tsunami / rob / gelombang pasang inundation band
YELLOW_LEVEL = 15.0  # banjir & genangan band

red_raw = polys_below(RED_LEVEL)
yel_raw = polys_below(YELLOW_LEVEL)

zona_merah = red_raw.intersection(KB).buffer(0)
zona_kuning = yel_raw.difference(red_raw).intersection(KB).buffer(0)
zona_hijau = KB.difference(yel_raw).buffer(0)


def clean(g, min_ha=0.12, simplify=8e-6):
    """Drop slivers and lightly simplify so the GeoJSON stays small."""
    if g.is_empty:
        return g
    parts = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    keep = [p.buffer(1e-5).buffer(-1e-5) for p in parts if ha(p) >= min_ha]
    keep = [p for p in keep if not p.is_empty]
    if not keep:
        return Polygon()
    m = unary_union(keep).simplify(simplify, preserve_topology=True)
    return m.intersection(KB).buffer(0)


zona_merah = clean(zona_merah)
zona_kuning = clean(zona_kuning)
zona_hijau = clean(zona_hijau)

print('\nFINAL ZONES')
for nm, g in [('merah', zona_merah), ('kuning', zona_kuning), ('hijau', zona_hijau)]:
    n = len(g.geoms) if isinstance(g, MultiPolygon) else 1
    print(f'  zona {nm:7s} {ha(g):6.2f} Ha  ({ha(g)/ha(KB)*100:4.1f}%)  parts={n}')
print(f'  sum          {ha(zona_merah)+ha(zona_kuning)+ha(zona_hijau):6.2f} Ha  vs kelurahan {ha(KB):.2f} Ha')

feats = [
    {'type': 'Feature',
     'properties': {'zona': 'merah', 'kelas': 'Risiko Tinggi', 'luas_ha': round(ha(zona_merah), 2),
                    'elev': f'0 - {RED_LEVEL:.0f} mdpl'},
     'geometry': mapping(zona_merah)},
    {'type': 'Feature',
     'properties': {'zona': 'kuning', 'kelas': 'Risiko Sedang', 'luas_ha': round(ha(zona_kuning), 2),
                    'elev': f'{RED_LEVEL:.0f} - {YELLOW_LEVEL:.0f} mdpl'},
     'geometry': mapping(zona_kuning)},
    {'type': 'Feature',
     'properties': {'zona': 'hijau', 'kelas': 'Risiko Rendah', 'luas_ha': round(ha(zona_hijau), 2),
                    'elev': f'> {YELLOW_LEVEL:.0f} mdpl'},
     'geometry': mapping(zona_hijau)},
]
json.dump({'type': 'FeatureCollection', 'features': feats}, open('zona.geojson', 'w'))
print('\nwrote zona.geojson')
