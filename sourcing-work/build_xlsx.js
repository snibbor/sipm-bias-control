// Build a multi-sheet XLSX workbook from sourcing_master.csv
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inStr = false;
      } else cell += c;
    } else {
      if (c === '"') inStr = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') {} // skip
      else cell += c;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const master = parseCsv(fs.readFileSync(path.join(__dirname, 'sourcing_master.csv'), 'utf8'));
const wb = XLSX.utils.book_new();

// Master sheet
const wsMaster = XLSX.utils.aoa_to_sheet(master);
wsMaster['!cols'] = [
  { wch: 22 },  // Board
  { wch: 32 },  // Refs
  { wch: 5 },   // Qty
  { wch: 32 },  // Value
  { wch: 42 },  // Footprint
  { wch: 25 },  // DigiKey PN
  { wch: 18 },  // Mfr
  { wch: 28 },  // Mfr PN
  { wch: 30 },  // Package
  { wch: 60 },  // URL
  { wch: 12 },  // Confidence
  { wch: 80 },  // Notes
];
XLSX.utils.book_append_sheet(wb, wsMaster, 'Master');

// Per-board sheets
for (const board of ['bias-control-lt8362', 'power-supply', 'tiav3_s14160']) {
  const header = master[0];
  const rows = master.slice(1).filter(r => r[0] === board);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = wsMaster['!cols'];
  // Excel sheet names: 31 char limit
  const sheetName = board.length > 31 ? board.slice(0, 31) : board;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// Cart sheet (deduped by DK PN)
const cart = new Map();
for (const r of master.slice(1)) {
  const [board, refs, qty, value, footprint, dk, mfr, mpn, pkg, url, conf, notes] = r;
  if (!dk || conf === 'skip' || conf === 'supplier-elsewhere') continue;
  const e = cart.get(dk) || { dk, mfr, mpn, pkg, url, conf, notes, qty: 0, refs: [] };
  e.qty += Number(qty);
  e.refs.push(`${board}:${refs}`);
  cart.set(dk, e);
}
const cartHeader = ['Cart Line', 'DigiKey PN', 'Mfr', 'Mfr PN', 'Package', 'Total Qty', 'Refs Across Boards', 'URL', 'Confidence', 'Notes'];
const cartRows = [cartHeader];
[...cart.values()].forEach((e, i) => {
  cartRows.push([i + 1, e.dk, e.mfr, e.mpn, e.pkg, e.qty, e.refs.join(' | '), e.url, e.conf, e.notes]);
});
const wsCart = XLSX.utils.aoa_to_sheet(cartRows);
wsCart['!cols'] = [
  { wch: 6 }, { wch: 25 }, { wch: 18 }, { wch: 28 }, { wch: 30 },
  { wch: 9 }, { wch: 60 }, { wch: 60 }, { wch: 12 }, { wch: 80 },
];
XLSX.utils.book_append_sheet(wb, wsCart, 'DigiKey Cart');

// Notes sheet
const notesRows = [
  ['SiPM Bias Control — DigiKey Sourcing'],
  [`Generated: ${new Date().toISOString().slice(0, 10)}`],
  [''],
  ['★ RECOMMENDED PATH: upload digikey_bom_manager.csv to https://www.digikey.com/bom'],
  ['  DigiKey resolves manufacturer PNs to current Digi-Key PNs and flags obsoletes in their UI.'],
  ['  This avoids the FastAdd PN-format issues seen on first attempt (Invalid PN / Obsolete item errors).'],
  [''],
  ['Output files in sourcing-work/:'],
  ['  ★ HOWTO.html                   Open this first — step-by-step instructions'],
  ['  ★ digikey_bom_manager.csv      Upload to https://www.digikey.com/bom (47 line items, 80 units)'],
  ['  - sourcing.xlsx                This workbook'],
  ['  - sourcing_master.csv          One row per BOM line across all 3 boards'],
  ['  - sourcing_<board>.csv         Per-board CSVs'],
  ['  - review_queue.csv             8 items flagged for user review'],
  ['  - digikey_fastadd_form.html    Fallback: FastAdd POST form (DigiKey rejected several PNs on first try — BOM Manager is more reliable)'],
  ['  - digikey_fastadd_url.txt      Fallback: GET URL (too long for browser)'],
  ['  - sourcing.json                Editable mapping file'],
  [''],
  ['Reference:'],
  ['  DigiKey BOM Manager: https://www.digikey.com/bom'],
  ['  DigiKey FastAdd:     https://forum.digikey.com/t/digikey-fastadd-bulk-add-parts-into-a-digikey-cart-via-third-party-tooling-and-urls/61356'],
  [''],
  ['Review-before-order flags (8 items — see review_queue.csv or DigiKey Cart sheet):'],
  ['  • R6 (RMCF0603FT52K3) assumes LT8362 build; for LT8361 use RMCF0603FT39K0.'],
  ['  • ATSAMD21E18A-AUT substituted for schematic -AF (commercial vs automotive grade).'],
  ['  • GRM31CR72A225KA73L (2.2µF/100V/X7R/1206 on bias C5/C6/C8/C11/C13) — heavy DC-bias derating at 70V; consider 1210/1812 or parallel caps. BOM Manager may flag this MPN as EOL and offer a substitute.'],
  ['  • UJ20-C-V-C-2-SMT-TR (USB-C) — MPN match exact; DK PN was inferred and rejected by FastAdd. BOM Manager resolves automatically.'],
  ['  • TSM-104-01-T-SV-TR (bias J2 1×4 SMD header) — non-stock at DigiKey (1–2 wk Samtec lead). Wurth 61300411121 is an in-stock THT alternative if footprint accepts THT.'],
  ['  • PMEG6030EP,115 often backordered at DigiKey — Future Electronics typically stocks.'],
  ['  • R13 ("5") interpreted as 5.0Ω, picked RMCF0603FT4R99 (4.99Ω 1%). If 5.1Ω is intended, use RMCF0603FT5R10.'],
  ['  • GCM1555C1H620GA16J (62pF 0402) — 2% C0G; DigiKey didn\'t stock a 5% Murata GRM 0402/50V 62pF.'],
  [''],
  ['Order separately (not on DigiKey):'],
  ['  • Hamamatsu S14160-3050PS SiPM — order direct from shop.hamamatsu.com'],
  ['  • 13 testpoint pads on bias board (HV1–HV9, TP1, TP_*) — not parts, just SMD pads'],
];
const wsNotes = XLSX.utils.aoa_to_sheet(notesRows);
wsNotes['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, wsNotes, 'README');

// BOM Manager Upload sheet — same data as digikey_bom_manager.csv but as a sheet
const bomManagerHeader = ['Manufacturer Part Number', 'Quantity', 'Customer Reference', 'Description', 'Manufacturer'];
const bomManagerRows = [bomManagerHeader];
const cartByMpn = new Map();
for (const r of master.slice(1)) {
  const [board, refs, qty, value, footprint, dk, mfr, mpn, pkg, url, conf, notes] = r;
  if (!mpn || conf === 'skip' || conf === 'supplier-elsewhere') continue;
  const e = cartByMpn.get(mpn) || { mpn, mfr, pkg, notes, qty: 0, refs: [] };
  e.qty += Number(qty);
  e.refs.push(`${board}:${refs}`);
  cartByMpn.set(mpn, e);
}
for (const e of cartByMpn.values()) {
  const desc = [e.pkg, e.notes ? `[NOTE: ${e.notes.slice(0, 80)}]` : ''].filter(Boolean).join(' ');
  bomManagerRows.push([e.mpn, e.qty, e.refs.join('; ').slice(0, 100), desc, e.mfr]);
}
const wsBomMgr = XLSX.utils.aoa_to_sheet(bomManagerRows);
wsBomMgr['!cols'] = [{ wch: 30 }, { wch: 9 }, { wch: 60 }, { wch: 60 }, { wch: 22 }];
XLSX.utils.book_append_sheet(wb, wsBomMgr, 'BOM Manager Upload');

// LCSC BOM Upload sheet — same MPNs, different column hint
const lcscHeader = ['Comment', 'Designator', 'Footprint', 'Manufacturer Part Number', 'Quantity', 'Manufacturer'];
const lcscRows = [lcscHeader];
for (const e of cartByMpn.values()) {
  lcscRows.push([e.pkg.slice(0, 40), e.refs.join('; ').slice(0, 100), (e.pkg || '').split(' ')[0], e.mpn, e.qty, e.mfr]);
}
const wsLcsc = XLSX.utils.aoa_to_sheet(lcscRows);
wsLcsc['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 12 }, { wch: 30 }, { wch: 9 }, { wch: 22 }];
XLSX.utils.book_append_sheet(wb, wsLcsc, 'LCSC BOM Upload');

// Reorder sheets to put README first
wb.SheetNames = ['README', 'BOM Manager Upload', 'LCSC BOM Upload', 'Master', 'bias-control-lt8362', 'power-supply', 'tiav3_s14160', 'DigiKey Cart'];

const outPath = path.join(__dirname, 'sourcing.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`sourcing.xlsx: written (${wb.SheetNames.length} sheets)`);
