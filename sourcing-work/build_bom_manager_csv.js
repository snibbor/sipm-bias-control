// Build a DigiKey BOM Manager-compatible CSV.
// BOM Manager (https://www.digikey.com/bom) resolves Manufacturer PN → current DK PN
// automatically, flagging obsolete parts and offering substitutes via DK's own UI.
// This sidesteps the PN-format problems FastAdd had.
const fs = require('fs');
const path = require('path');

// Multiplier for how many boards' worth of parts to order.
// 2 = enough for two boards (plus the implicit zero buffer).
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

// Build BOM rows
const cart = new Map(); // mpn -> { qty, refs[], mfr, value, footprint, notes, confidence, dkPn }
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
    const key = `${value}||${footprint}`;
    const src = sourcing[key];
    if (!src || !src.mpn || src.confidence === 'skip' || src.confidence === 'supplier-elsewhere') {
      skip.push({ board, refs, value, footprint, reason: src?.notes || 'no sourcing info' });
      continue;
    }
    const e = cart.get(src.mpn) || {
      mpn: src.mpn, mfr: src.mfr, qty: 0, refs: [],
      pkg: src.package, dkPn: src.digikey_pn, confidence: src.confidence, notes: src.notes,
      url: src.url,
    };
    e.qty += refs.length;
    e.refs.push(`${board}:${refs.join(' ')}`);
    cart.set(src.mpn, e);
  }
}

// DigiKey BOM Manager CSV — use columns DigiKey's mapping wizard recognizes:
//   Manufacturer Part Number, Quantity, Customer Reference, Description, Manufacturer
const header = ['Manufacturer Part Number', 'Quantity', 'Customer Reference', 'Description', 'Manufacturer'];
const rows = [header];
for (const e of cart.values()) {
  const desc = [e.pkg, e.notes ? `[NOTE: ${e.notes.slice(0, 80)}]` : ''].filter(Boolean).join(' ');
  rows.push([e.mpn, e.qty * BOARDS_TO_BUILD, e.refs.join('; ').slice(0, 100), desc, e.mfr]);
}
const outPath = path.join(__dirname, 'digikey_bom_manager.csv');
const data = rows.map(r => r.map(cell).join(',')).join('\n') + '\n';
try {
  fs.writeFileSync(outPath, data);
  console.log(`digikey_bom_manager.csv: ${cart.size} line items, ${[...cart.values()].reduce((s, e) => s + e.qty, 0)} units`);
} catch (err) {
  if (err.code === 'EBUSY') {
    const altPath = path.join(__dirname, 'digikey_bom_manager.NEW.csv');
    fs.writeFileSync(altPath, data);
    console.log(`!! digikey_bom_manager.csv is locked (close it in Excel/preview)`);
    console.log(`   wrote to digikey_bom_manager.NEW.csv instead — rename it after closing the original`);
  } else throw err;
}

// Also build a "review queue" file listing parts the BOM Manager will likely want user attention on
const review = [];
for (const e of cart.values()) {
  if (e.confidence === 'review' || e.confidence === 'medium' || e.notes?.includes('substitut') || e.notes?.includes('inferred')) {
    review.push({ mpn: e.mpn, mfr: e.mfr, qty: e.qty, conf: e.confidence, notes: e.notes, url: e.url });
  }
}
const reviewLines = ['Manufacturer Part Number,Mfr,Qty,Confidence,Notes,Verify URL'];
for (const r of review) {
  reviewLines.push([r.mpn, r.mfr, r.qty, r.conf, r.notes, r.url].map(cell).join(','));
}
fs.writeFileSync(path.join(__dirname, 'review_queue.csv'), reviewLines.join('\n') + '\n');
console.log(`review_queue.csv: ${review.length} items flagged for user review`);

// Print summary
console.log('\n=== Skipped (no DK source) ===');
for (const s of skip) console.log(`  ${s.board} ${s.refs.join(' ')}: ${s.reason}`);
console.log('\n=== Review queue ===');
for (const r of review) console.log(`  ${r.mpn} (${r.mfr}) qty=${r.qty} — ${r.notes?.slice(0, 80) || ''}`);
