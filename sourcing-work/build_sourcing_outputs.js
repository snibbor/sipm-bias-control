// Build the consolidated sourcing CSV + DigiKey FastAdd URL + HTML POST form
// from the extracted ibom JSON and the manual sourcing.json mapping.
const fs = require('fs');
const path = require('path');

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

const masterRows = [];
const missing = [];

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
    if (!src) {
      missing.push({ board, refs, value, footprint, key });
      continue;
    }
    masterRows.push({
      board,
      refs: refs.join(' '),
      qty: refs.length,
      value,
      footprint,
      digikey_pn: src.digikey_pn,
      mfr: src.mfr,
      mpn: src.mpn,
      package: src.package,
      url: src.url,
      confidence: src.confidence,
      notes: src.notes,
    });
  }
}

if (missing.length) {
  console.error('MISSING sourcing entries:');
  for (const m of missing) console.error('  ', m);
  process.exit(1);
}

// Per-board CSVs
const header = ['Board', 'Refs', 'Qty', 'Value', 'Footprint', 'DigiKey_PN', 'Mfr', 'Mfr_PN', 'Package', 'URL', 'Confidence', 'Notes'];
function rowToCsv(r) {
  return [r.board, r.refs, r.qty, r.value, r.footprint, r.digikey_pn, r.mfr, r.mpn, r.package, r.url, r.confidence, r.notes].map(cell).join(',');
}

const masterCsv = [header.join(',')];
for (const r of masterRows) masterCsv.push(rowToCsv(r));
fs.writeFileSync(path.join(__dirname, 'sourcing_master.csv'), masterCsv.join('\n') + '\n');
console.log(`sourcing_master.csv: ${masterRows.length} rows`);

for (const board of boards) {
  const lines = [header.join(',')];
  for (const r of masterRows) if (r.board === board) lines.push(rowToCsv(r));
  fs.writeFileSync(path.join(__dirname, `sourcing_${board}.csv`), lines.join('\n') + '\n');
}

// ------ Summary stats (FastAdd generation removed — superseded by BOM Manager workflow) ------
console.log('\n=== Summary ===');
console.log(`Master rows (one per BOM line per board): ${masterRows.length}`);
process.exit(0);

// ------ Build DigiKey FastAdd parts list (deduped by DK PN across all boards) ------
const cartParts = new Map(); // dk_pn -> { qty, crefs[], mpn, confidence, notes }
const skip = [];

for (const r of masterRows) {
  if (!r.digikey_pn || r.confidence === 'skip' || r.confidence === 'supplier-elsewhere') {
    skip.push(r);
    continue;
  }
  const e = cartParts.get(r.digikey_pn) || {
    qty: 0, crefs: [], mpn: r.mpn, confidence: r.confidence, notes: r.notes,
  };
  e.qty += r.qty;
  e.crefs.push(`${r.board}:${r.refs}`);
  cartParts.set(r.digikey_pn, e);
}

const cartList = [...cartParts.entries()];

// ------ GET URL (FastAdd) ------
const base = 'https://www.digikey.com/classic/ordering/fastadd.aspx';
const params = [];
cartList.forEach(([dk, e], i) => {
  const n = i + 1;
  params.push(`part${n}=${encodeURIComponent(dk)}`);
  params.push(`qty${n}=${e.qty}`);
  const cref = e.crefs.join('; ').slice(0, 80);
  params.push(`cref${n}=${encodeURIComponent(cref)}`);
});
params.push('utm_source=claude-code');
params.push('newcart=true');
const getUrl = `${base}?${params.join('&')}`;
fs.writeFileSync(path.join(__dirname, 'digikey_fastadd_url.txt'), getUrl);
console.log(`digikey_fastadd_url.txt: ${getUrl.length} chars (${cartList.length} parts, GET limit ~1700)`);

// ------ POST HTML form (for >1700 char URL or >~50 parts) ------
const formInputs = [];
cartList.forEach(([dk, e], i) => {
  const n = i + 1;
  const cref = e.crefs.join('; ').slice(0, 80);
  formInputs.push(`    <input type="hidden" name="part${n}" value="${dk}">`);
  formInputs.push(`    <input type="hidden" name="qty${n}" value="${e.qty}">`);
  formInputs.push(`    <input type="hidden" name="cref${n}" value="${cref.replace(/"/g, '&quot;')}">`);
});

const partsRows = cartList.map(([dk, e], i) => {
  return `      <tr><td>${i + 1}</td><td><code>${dk}</code></td><td>${e.mpn}</td><td>${e.qty}</td><td>${e.crefs.join('<br>')}</td><td>${e.confidence}</td></tr>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DigiKey FastAdd — SiPM Bias Control Project</title>
  <style>
    body { font-family: sans-serif; max-width: 1100px; margin: 2em auto; padding: 0 1em; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9em; }
    th, td { border: 1px solid #ccc; padding: 0.3em 0.5em; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    code { background: #f4f4f4; padding: 1px 3px; }
    .submit { padding: 1em 2em; font-size: 1.1em; background: #cc0000; color: white; border: 0; cursor: pointer; }
    .notes { background: #fffbe5; padding: 1em; border-left: 4px solid #f5c518; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>DigiKey FastAdd — SiPM Bias Control Project</h1>
  <p>
    Click <b>Add ${cartList.length} parts to DigiKey cart</b> to open DigiKey and load every part below into a new cart in one shot.
    You must be logged in to DigiKey for the cart to persist.
  </p>
  <form action="${base}" method="post" target="_blank">
${formInputs.join('\n')}
    <input type="hidden" name="utm_source" value="claude-code">
    <input type="hidden" name="newcart" value="true">
    <button type="submit" class="submit">Add ${cartList.length} parts to DigiKey cart →</button>
  </form>

  <div class="notes">
    <b>Review before submitting:</b>
    <ul>
      <li><b>R6 (52.3k)</b> — assumes LT8362 build; for LT8361 use 39k instead.</li>
      <li><b>ATSAMD21E18A-AUT</b> substituted for schematic's -AF (commercial vs automotive grade).</li>
      <li><b>2.2µF 1206 on bias board (C5/C6/C8/C11/C13)</b> — 100V X7R 1206 derates heavily under DC bias; review for the boost output rail.</li>
      <li><b>USB-C (UJ20-C-V-C-2-SMT-TR)</b> — DigiKey PN inferred; verify on product page.</li>
      <li><b>Samtec TSM-104-01-T-SV-TR</b> (bias J2, 1x4 SMD header) — non-stock at DigiKey, 1–2 wk lead. Consider Wurth 61300411121 (THT) alternative.</li>
      <li><b>PMEG6030EP</b> — often backordered at DigiKey; Future Electronics typically has stock.</li>
      <li><b>Hamamatsu S14160-3050PS SiPM</b> — not stocked at DigiKey. Order direct from <a href="https://shop.hamamatsu.com">shop.hamamatsu.com</a>.</li>
    </ul>
  </div>

  <h2>Parts in this cart (${cartList.length} line items, ${cartList.reduce((s, [, e]) => s + e.qty, 0)} units total)</h2>
  <table>
    <thead><tr><th>#</th><th>DigiKey PN</th><th>MPN</th><th>Qty</th><th>Refs (cref)</th><th>Confidence</th></tr></thead>
    <tbody>
${partsRows}
    </tbody>
  </table>

  <h2>Skipped (no DigiKey listing)</h2>
  <ul>
${skip.map(r => `    <li>${r.board} – ${r.refs} – ${r.value} (${r.footprint}) – ${r.notes}</li>`).join('\n')}
  </ul>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'digikey_fastadd_form.html'), html);
console.log(`digikey_fastadd_form.html: written (${cartList.length} parts)`);

// ------ Summary stats ------
console.log('\n=== Summary ===');
console.log(`Master rows (one per BOM line per board): ${masterRows.length}`);
console.log(`Unique DigiKey line items in cart: ${cartList.length}`);
console.log(`Total units to order: ${cartList.reduce((s, [, e]) => s + e.qty, 0)}`);
console.log(`Skipped (sourced elsewhere or no part): ${skip.length}`);
for (const r of skip) console.log(`  - ${r.board} ${r.refs} ${r.value}: ${r.notes || r.confidence}`);
