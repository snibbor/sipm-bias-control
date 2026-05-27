// Build a deduplicated unique-parts list across all three boards.
// Two parts are considered the same if (Value, Footprint) match.
const fs = require('fs');
const path = require('path');

const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

const map = new Map();

for (const board of boards) {
  const data = require(`./pcbdata_${board}.json`);
  const fields = data.bom.fields;
  for (const group of data.bom.both) {
    const refs = group.map(([r]) => r);
    const fpIdx = group[0][1];
    const [value, footprint] = fields[String(fpIdx)] || ['', ''];
    const key = `${value}||${footprint}`;
    if (!map.has(key)) {
      map.set(key, { value, footprint, perBoard: {}, totalQty: 0, boards: new Set() });
    }
    const e = map.get(key);
    if (!e.perBoard[board]) e.perBoard[board] = { refs: [], qty: 0 };
    e.perBoard[board].refs.push(...refs);
    e.perBoard[board].qty += refs.length;
    e.totalQty += refs.length;
    e.boards.add(board);
  }
}

const out = [];
for (const [key, e] of map) {
  out.push({
    value: e.value,
    footprint: e.footprint,
    totalQty: e.totalQty,
    boards: [...e.boards].join(','),
    perBoardRefs: Object.entries(e.perBoard)
      .map(([b, x]) => `${b}: ${x.refs.join(' ')} (${x.qty})`)
      .join(' | '),
  });
}

out.sort((a, b) => {
  // group by footprint family then value
  if (a.footprint !== b.footprint) return a.footprint < b.footprint ? -1 : 1;
  return a.value < b.value ? -1 : 1;
});

const header = ['Value', 'Footprint', 'TotalQty', 'Boards', 'PerBoardRefs'];
const csv = [header.join(',')];
function cell(s) {
  s = String(s ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
for (const r of out) {
  csv.push([r.value, r.footprint, r.totalQty, r.boards, r.perBoardRefs].map(cell).join(','));
}
fs.writeFileSync(path.join(__dirname, 'unique_parts.csv'), csv.join('\n') + '\n');
console.log(`Unique parts: ${out.length}`);
for (const r of out) {
  console.log(`  ${r.value} | ${r.footprint} | qty=${r.totalQty} | ${r.boards}`);
}
