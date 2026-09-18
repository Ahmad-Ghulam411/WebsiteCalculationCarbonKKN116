"""Batas Kota Parepare -> kota.geojson (dipakai untuk memeriksa posisi GPS warga).

Batas kota belum ada di berkas data mana pun; dari batas inilah
js/peta-mitigasi.js tahu bahwa tombol "Di Zona Mana Saya?" sedang dipakai di
luar wilayah Kota Parepare, sehingga zonanya memang tidak bisa ditentukan.

Sumber: OpenStreetMap (ODbL) — relasi 13246109 ("Parepare"), diambil lewat
Nominatim. Cincinnya disederhanakan dengan Douglas-Peucker supaya berkas data
tetap ringan; galat 15 m tidak berarti apa-apa dibandingkan galat GPS ponsel.

Jalankan: python3 build_kota.py
"""
import json
import math
import urllib.request

NOMINATIM = ('https://nominatim.openstreetmap.org/lookup'
             '?osm_ids=R13246109&format=jsonv2&polygon_geojson=1')
UA = 'KKN116-PetaMitigasi/1.0 (proyek KKN, kontak: tim KKN Gel. 116)'
OUT = 'kota.geojson'
TOL_DERAJAT = 0.00015   # ± 16 m


def ambil_geometri():
    req = urllib.request.Request(NOMINATIM, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if not data:
        raise SystemExit('Relasi Kota Parepare tidak ditemukan di Nominatim.')
    return data[0]['geojson']


def jarak_ke_garis(p, a, b):
    """Jarak titik p ke ruas a-b pada bidang lon/lat (derajat)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def sederhanakan(cincin, tol):
    """Douglas-Peucker pada satu cincin; cincin tetap tertutup."""
    if len(cincin) <= 3:
        return cincin
    titik = cincin[:-1] if cincin[0] == cincin[-1] else cincin
    simpan = [False] * len(titik)
    simpan[0] = simpan[-1] = True
    tumpukan = [(0, len(titik) - 1)]
    while tumpukan:
        awal, akhir = tumpukan.pop()
        jarak, jauh = 0.0, -1
        for i in range(awal + 1, akhir):
            d = jarak_ke_garis(titik[i], titik[awal], titik[akhir])
            if d > jarak:
                jarak, jauh = d, i
        if jauh != -1 and jarak > tol:
            simpan[jauh] = True
            tumpukan.append((awal, jauh))
            tumpukan.append((jauh, akhir))
    hasil = [titik[i] for i in range(len(titik)) if simpan[i]]
    if len(hasil) < 3:
        hasil = titik[:3]
    hasil.append(hasil[0])
    return hasil


def sederhanakan_geometri(geom, tol):
    if geom['type'] == 'Polygon':
        return {'type': 'Polygon',
                'coordinates': [sederhanakan(r, tol) for r in geom['coordinates']]}
    return {'type': 'MultiPolygon',
            'coordinates': [[sederhanakan(r, tol) for r in poligon]
                            for poligon in geom['coordinates']]}


def bulatkan(geom, desimal=6):
    """Bulatkan koordinat supaya berkas tidak membengkak oleh angka panjang."""
    def ronde(cincin):
        return [[round(x, desimal), round(y, desimal)] for x, y in cincin]
    if geom['type'] == 'Polygon':
        return {'type': 'Polygon', 'coordinates': [ronde(r) for r in geom['coordinates']]}
    return {'type': 'MultiPolygon',
            'coordinates': [[ronde(r) for r in poligon] for poligon in geom['coordinates']]}


def jumlah_titik(geom):
    cincin = geom['coordinates'] if geom['type'] == 'Polygon' else \
        [r for poligon in geom['coordinates'] for r in poligon]
    return sum(len(r) for r in cincin)


def main():
    kasar = ambil_geometri()
    halus = bulatkan(sederhanakan_geometri(kasar, TOL_DERAJAT))

    out = {'type': 'FeatureCollection', 'features': [{
        'type': 'Feature',
        'properties': {
            'nama': 'Kota Parepare',
            'sumber': 'OpenStreetMap (ODbL) — relasi 13246109',
            'keterangan': 'Batas kota; dasar pemeriksaan posisi GPS warga',
        },
        'geometry': halus,
    }]}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('%s: %d titik -> %d titik' % (OUT, jumlah_titik(kasar), jumlah_titik(halus)))


if __name__ == '__main__':
    main()
