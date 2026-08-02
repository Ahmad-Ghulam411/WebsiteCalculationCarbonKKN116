# Folder Gambar (assets)

## Logo & ikon website

`LogoKKarbon.png` adalah **logo resmi website ini**. Berkas itu dipakai sebagai
logo di pojok kiri atas semua halaman sekaligus ikon situs (gambar kecil di tab
peramban dan pintasan layar utama ponsel).

Karena berkas aslinya besar (941×941 piksel, ± 810 KB) — terlalu berat untuk
dimuat di setiap halaman, apalagi bagi warga dengan jaringan lemah — halaman
web memakai salinan kecilnya:

| Nama berkas               | Ukuran  | Dipakai untuk                                  |
| ------------------------- | ------- | ---------------------------------------------- |
| `LogoKKarbon.png`         | 941 px  | Berkas induk. Tidak dipanggil langsung di web.  |
| `logo-kkarbon-32.png`     | 32 px   | Ikon tab peramban                               |
| `logo-kkarbon-180.png`    | 180 px  | Ikon pintasan layar utama iPhone / iPad         |
| `logo-kkarbon-192.png`    | 192 px  | Logo di menu atas & ikon pintasan Android       |

### Bila logo diganti

Timpa `LogoKKarbon.png` dengan logo baru, lalu buat ulang ketiga salinan
kecilnya (pinggiran transparan ikut dipangkas agar logo terlihat penuh saat
kecil):

```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('assets/LogoKKarbon.png').convert('RGBA')
konten = src.crop(src.getbbox())               # buang pinggiran transparan
w, h = konten.size
sisi = max(w, h) + int(max(w, h) * 0.04)       # bujur sangkar + margin tipis
kanvas = Image.new('RGBA', (sisi, sisi), (0, 0, 0, 0))
kanvas.paste(konten, ((sisi - w) // 2, (sisi - h) // 2))
for n in (32, 180, 192):
    kanvas.resize((n, n), Image.LANCZOS).save(f'assets/logo-kkarbon-{n}.png', optimize=True)
PY
```

## Gambar Kota Parepare

| Nama berkas (harus persis)   | Isi gambar                                   |
| ---------------------------- | -------------------------------------------- |
| `latar-parepare.jpg`         | Foto pemandangan Kota Parepare (latar hero)  |
| `logo-parepare.png`          | Logo / lambang Kota Parepare                 |

## Catatan
- **Nama berkas harus sama persis** (huruf kecil semua) seperti tabel di atas.
- Format latar sebaiknya **JPG** lebar (mis. 1600×1000 piksel) agar tetap ringan.
- Bila berkas gambar **belum ada**, website tetap tampil rapi:
  - Logo akan diganti otomatis oleh **emblem SVG bawaan**.
  - Latar akan memakai **gradien hijau–biru** bawaan.
- `logo-parepare.png` kini **tidak lagi dipakai** di halaman mana pun — logo di
  menu atas sudah memakai logo website. Berkasnya tetap disimpan agar mudah
  dipasang kembali bila sewaktu-waktu diperlukan.
