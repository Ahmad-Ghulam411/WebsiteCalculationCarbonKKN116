/* ============================================================================
 *  EKSPOR EXCEL (.xlsx) & CSV  —  MANDIRI, TANPA PUSTAKA EKSTERNAL
 *  ----------------------------------------------------------------------------
 *  Membuat berkas Excel asli (.xlsx) langsung di browser dengan menyusun
 *  arsip ZIP (metode "store"/tanpa kompresi) + CRC32 secara manual.
 *  Juga menyediakan ekspor CSV ber-BOM UTF-8 yang langsung terbuka di Excel.
 *
 *  Cara pakai:
 *    EksporExcel.unduhXlsx('data.xlsx', barisData);
 *    EksporExcel.unduhCsv('data.csv',  barisData);
 *  di mana barisData = array berisi array (baris → sel). Sel boleh teks/angka.
 * ========================================================================== */

(function (global) {
  'use strict';

  /* ---------- CRC32 ---------- */
  const tabelCrc = (function () {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ tabelCrc[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- Bantu byte ---------- */
  const encoder = new TextEncoder();
  function teksKeBytes(str) { return encoder.encode(str); }
  function u16(arr, v) { arr.push(v & 0xFF, (v >>> 8) & 0xFF); }
  function u32(arr, v) { arr.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); }
  function tambahBytes(arr, u8) { for (let i = 0; i < u8.length; i++) arr.push(u8[i]); }

  function tanggalDos(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time & 0xFFFF, date: date & 0xFFFF };
  }

  /* ---------- Penyusun arsip ZIP (store) ---------- */
  function buatZip(files) {
    const { time, date } = tanggalDos(new Date());
    const out = [];
    const central = [];
    let offset = 0;

    files.forEach(function (f) {
      const nameBytes = teksKeBytes(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;
      const localOffset = offset;

      // Header berkas lokal
      const lh = [];
      u32(lh, 0x04034b50); u16(lh, 20); u16(lh, 0x0800); u16(lh, 0);
      u16(lh, time); u16(lh, date);
      u32(lh, crc); u32(lh, size); u32(lh, size);
      u16(lh, nameBytes.length); u16(lh, 0);
      tambahBytes(lh, nameBytes);
      tambahBytes(out, lh);
      tambahBytes(out, f.data);
      offset += lh.length + size;

      // Entri direktori pusat
      u32(central, 0x02014b50); u16(central, 20); u16(central, 20); u16(central, 0x0800);
      u16(central, 0); u16(central, time); u16(central, date);
      u32(central, crc); u32(central, size); u32(central, size);
      u16(central, nameBytes.length); u16(central, 0); u16(central, 0);
      u16(central, 0); u16(central, 0); u32(central, 0); u32(central, localOffset);
      tambahBytes(central, nameBytes);
    });

    const cdOffset = offset;
    tambahBytes(out, central);

    // Akhir direktori pusat (EOCD)
    const eocd = [];
    u32(eocd, 0x06054b50); u16(eocd, 0); u16(eocd, 0);
    u16(eocd, files.length); u16(eocd, files.length);
    u32(eocd, central.length); u32(eocd, cdOffset); u16(eocd, 0);
    tambahBytes(out, eocd);

    return new Uint8Array(out);
  }

  /* ---------- Bantu XML ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function kolomHuruf(n) { // n = indeks 0
    let s = '';
    n += 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function buatSheetXml(rows) {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    rows.forEach(function (row, ri) {
      xml += '<row r="' + (ri + 1) + '">';
      row.forEach(function (cell, ci) {
        const ref = kolomHuruf(ci) + (ri + 1);
        if (typeof cell === 'number' && isFinite(cell)) {
          xml += '<c r="' + ref + '"><v>' + cell + '</v></c>';
        } else {
          const val = (cell === null || cell === undefined) ? '' : cell;
          xml += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(val) + '</t></is></c>';
        }
      });
      xml += '</row>';
    });
    xml += '</sheetData></worksheet>';
    return xml;
  }

  /* ---------- Bagian tetap arsip xlsx ---------- */
  const XML_CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>';

  const XML_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const XML_WORKBOOK =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Data Warga" sheetId="1" r:id="rId1"/></sheets></workbook>';

  const XML_WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '</Relationships>';

  /* ---------- Pemicu unduhan ---------- */
  function picuUnduhan(blob, namaFile) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------- API publik ---------- */
  function unduhXlsx(namaFile, rows) {
    const files = [
      { name: '[Content_Types].xml', data: teksKeBytes(XML_CONTENT_TYPES) },
      { name: '_rels/.rels', data: teksKeBytes(XML_RELS) },
      { name: 'xl/workbook.xml', data: teksKeBytes(XML_WORKBOOK) },
      { name: 'xl/_rels/workbook.xml.rels', data: teksKeBytes(XML_WORKBOOK_RELS) },
      { name: 'xl/worksheets/sheet1.xml', data: teksKeBytes(buatSheetXml(rows)) },
    ];
    const blob = new Blob([buatZip(files)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    picuUnduhan(blob, namaFile);
  }

  function unduhCsv(namaFile, rows) {
    const csv = rows.map(function (row) {
      return row.map(function (sel) {
        let s = (sel === null || sel === undefined) ? '' : String(sel);
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(',');
    }).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    picuUnduhan(blob, namaFile);
  }

  global.EksporExcel = { unduhXlsx: unduhXlsx, unduhCsv: unduhCsv };
})(window);
