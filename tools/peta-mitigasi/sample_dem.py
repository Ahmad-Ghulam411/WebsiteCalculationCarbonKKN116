"""Sample a DEM grid over Kampung Baru + a margin, via the open-elevation API."""
import json
import time
import urllib.request

import numpy as np

kel = json.load(open('kelurahan.geojson'))
kb = next(f for f in kel['features'] if f['properties']['nama'] == 'Kampung Baru')
ring = kb['geometry']['coordinates'][0]
lons = [c[0] for c in ring]
lats = [c[1] for c in ring]

# margin so neighbouring kelurahan on the left/right are covered too
MRG = 0.0022
W, E = min(lons) - MRG, max(lons) + MRG
S, N = min(lats) - MRG, max(lats) + MRG
print(f'grid bbox W={W:.6f} E={E:.6f} S={S:.6f} N={N:.6f}')

NX, NY = 64, 60
gx = np.linspace(W, E, NX)
gy = np.linspace(S, N, NY)
pts = [(float(la), float(lo)) for la in gy for lo in gx]
print('points:', len(pts))


def batch(locs):
    body = json.dumps({'locations': [{'latitude': a, 'longitude': b} for a, b in locs]}).encode()
    req = urllib.request.Request(
        'https://api.open-elevation.com/api/v1/lookup', data=body,
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)['results']


elev = []
CH = 480
for i in range(0, len(pts), CH):
    chunk = pts[i:i + CH]
    for attempt in range(4):
        try:
            res = batch(chunk)
            elev.extend(float(x['elevation']) for x in res)
            break
        except Exception as e:
            print('  retry', attempt, type(e).__name__, e)
            time.sleep(2 * (attempt + 1))
    else:
        raise SystemExit('elevation fetch failed')
    print(f'  {len(elev)}/{len(pts)}')
    time.sleep(0.6)

Z = np.array(elev, dtype=float).reshape(NY, NX)
np.savez('dem.npz', Z=Z, gx=gx, gy=gy)
print('\nDEM stats: min=%.1f max=%.1f mean=%.1f' % (Z.min(), Z.max(), Z.mean()))
print('sea cells (<=0):', int((Z <= 0).sum()), '/', Z.size)
for thr in (2, 5, 8, 12, 20, 30):
    print(f'  <= {thr:2d} m : {(Z <= thr).sum() / Z.size * 100:5.1f}%')
