// Build LCSC-compatible BOM CSV using same MPNs as DigiKey BOM Manager CSV.
// LCSC BOM Tool (https://www.lcsc.com/bom) accepts MPN-based upload — same idea as
// DigiKey BOM Manager. Column mapping in their UI lets the user point at MPN/Qty.
//
// LCSC's tool accepts .csv/.xls/.xlsx, up to 4 MB / 800 lines.
const fs = require('fs');
const path = require('path');

// Match build_bom_manager_csv.js — order enough for this many boards
const BOARDS_TO_BUILD = 2;

const sourcing = JSON.parse(fs.readFileSync(path.join(__dirname, 'sourcing.json'), 'utf8')).parts;
const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

function refSortKey(r) {
  const m = String(r).match(/^([A-Za-z_]+)(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [String(r), 0];
}
function cell(s) {
  s = String(s ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const cart = new Map();
const skip = [];

for (const board of boards) {
  const data = require(`./pcbdata_${board}.json`);
  const fields = data.bom.fields;
  for (const group of data.bom.both) {
    const refs = group.map(([r]) => r);
    refs.sort((a, b) => {
      const [pa, na] = refSortKey(a);
      const [pb, nb] = refSortKey(b);
      if (pa !== pb) return pa < pb ? -1 : 1;
      return na - nb;
    });
    const fpIdx = group[0][1];
    const [value, footprint] = fields[String(fpIdx)] || ['', ''];
    const src = sourcing[`${value}||${footprint}`];
    if (!src || !src.mpn || src.confidence === 'skip' || src.confidence === 'supplier-elsewhere') {
      skip.push({ board, refs, value, footprint, reason: src?.notes || 'no source' });
      continue;
    }
    const e = cart.get(src.mpn) || {
      mpn: src.mpn, mfr: src.mfr, pkg: src.package,
      qty: 0, refs: [], notes: src.notes,
    };
    e.qty += refs.length;
    e.refs.push(`${board}:${refs.join(' ')}`);
    cart.set(src.mpn, e);
  }
}

// LCSC accepts a simple CSV with MPN + qty (and optional designator/comment/footprint).
// Their wizard auto-maps. Use columns LCSC's docs reference:
//   Comment, Designator, Footprint, Manufacturer Part Number, Quantity, Manufacturer
const header = ['Comment', 'Designator', 'Footprint', 'Manufacturer Part Number', 'Quantity', 'Manufacturer'];
const rows = [header];
for (const e of cart.values()) {
  const comment = (e.pkg || '').split(' ')[0] + ' ' + (e.notes ? e.notes.slice(0, 40) : '');
  rows.push([
    e.pkg.slice(0, 40),                    // Comment / value descriptor
    e.refs.join('; ').slice(0, 100),       // Designator (refs)
    e.pkg.split(' ')[0],                   // Footprint hint
    e.mpn,
    e.qty * BOARDS_TO_BUILD,
    e.mfr,
  ]);
}

fs.writeFileSync(path.join(__dirname, 'lcsc_bom.csv'),
  rows.map(r => r.map(cell).join(',')).join('\n') + '\n');
console.log(`lcsc_bom.csv: ${cart.size} line items, ${[...cart.values()].reduce((s, e) => s + e.qty, 0)} units`);

console.log('\n=== Skipped (no DK/LCSC source) ===');
for (const s of skip) console.log(`  ${s.board} ${s.refs.join(' ')}: ${s.reason}`);
