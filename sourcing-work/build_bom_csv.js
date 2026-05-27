// Build per-board BOM CSVs from extracted pcbdata JSON.
// Row schema for ibom: bom.both = [ [ [ref, fp_idx], ... ], ... ]
// bom.fields[fp_idx] = [Value, Footprint]
const fs = require('fs');
const path = require('path');

const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

function refSortKey(r) {
  const m = r.match(/^([A-Za-z]+)(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [r, 0];
}

function csvCell(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const summary = [];

for (const board of boards) {
  const data = require(`./pcbdata_${board}.json`);
  const fields = data.bom.fields;
  const rows = [];
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
    rows.push({
      qty: refs.length,
      refs: refs.join(' '),
      value,
      footprint,
    });
  }
  rows.sort((a, b) => {
    // sort by ref-prefix of first ref
    const [pa] = refSortKey(a.refs.split(' ')[0]);
    const [pb] = refSortKey(b.refs.split(' ')[0]);
    if (pa !== pb) return pa < pb ? -1 : 1;
    return refSortKey(a.refs.split(' ')[0])[1] - refSortKey(b.refs.split(' ')[0])[1];
  });

  const header = ['Board', 'Refs', 'Qty', 'Value', 'Footprint'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([board, r.refs, r.qty, r.value, r.footprint].map(csvCell).join(','));
    summary.push({ board, ...r });
  }
  const out = path.join(__dirname, `bom_${board}.csv`);
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log(`${board}: ${rows.length} groups, total parts = ${rows.reduce((a, r) => a + r.qty, 0)} -> ${out}`);
}

// Combined CSV
const allHeader = ['Board', 'Refs', 'Qty', 'Value', 'Footprint'];
const allLines = [allHeader.join(',')];
for (const r of summary) {
  allLines.push([r.board, r.refs, r.qty, r.value, r.footprint].map(csvCell).join(','));
}
fs.writeFileSync(path.join(__dirname, 'bom_combined.csv'), allLines.join('\n') + '\n');
console.log(`combined: ${summary.length} rows -> bom_combined.csv`);
