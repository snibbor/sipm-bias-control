// Build an HTML page with one "Open on DigiKey" button per part.
// DigiKey product URLs are stable (the numeric product_id at the end never rotates),
// so this approach sidesteps every -ND PN rotation issue.
const fs = require('fs');
const path = require('path');

const sourcing = JSON.parse(fs.readFileSync(path.join(__dirname, 'sourcing.json'), 'utf8')).parts;
const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

function refSortKey(r) {
  const m = String(r).match(/^([A-Za-z_]+)(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [String(r), 0];
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Aggregate by MPN across boards
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
      skip.push({ board, refs, value, footprint, src });
      continue;
    }
    const e = cart.get(src.mpn) || {
      mpn: src.mpn, mfr: src.mfr, pkg: src.package, url: src.url,
      confidence: src.confidence, notes: src.notes,
      qty: 0, refs: [],
    };
    e.qty += refs.length;
    e.refs.push(`${board}: ${refs.join(' ')}`);
    cart.set(src.mpn, e);
  }
}

const list = [...cart.values()];
list.sort((a, b) => a.mfr < b.mfr ? -1 : a.mfr > b.mfr ? 1 : (a.mpn < b.mpn ? -1 : 1));

const totalUnits = list.reduce((s, e) => s + e.qty, 0);

const rows = list.map((e, i) => {
  const confColor = e.confidence === 'review' ? '#f5a623' : e.confidence === 'medium' ? '#ffc107' : '#28a745';
  return `      <tr>
        <td>${i + 1}</td>
        <td><b>${esc(e.mpn)}</b><br><small>${esc(e.mfr)}</small></td>
        <td>${e.qty}</td>
        <td><small>${esc(e.refs.join('<br>'))}</small></td>
        <td><small>${esc(e.pkg)}</small></td>
        <td style="background:${confColor};color:white;text-align:center;font-size:0.85em">${esc(e.confidence)}</td>
        <td><a class="open" href="${esc(e.url)}" target="_blank" rel="noopener">Open on DigiKey →</a></td>
        <td><small>${esc(e.notes || '')}</small></td>
      </tr>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SiPM Bias Control — DigiKey Product Page Links</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 1400px; margin: 1em auto; padding: 0 1em; }
    h1 { margin-bottom: 0.2em; }
    .intro { background: #e8f4ff; border-left: 4px solid #0066cc; padding: 0.8em 1em; margin: 1em 0; }
    table { border-collapse: collapse; width: 100%; font-size: 0.92em; }
    th, td { border: 1px solid #ddd; padding: 0.4em 0.6em; vertical-align: top; }
    th { background: #f0f0f0; text-align: left; position: sticky; top: 0; }
    a.open { display: inline-block; background: #cc0000; color: white; padding: 0.3em 0.7em;
             border-radius: 3px; text-decoration: none; white-space: nowrap; font-size: 0.85em; }
    a.open:hover { background: #990000; }
    .footer { margin: 2em 0; padding: 1em; background: #f8f8f8; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>SiPM Bias Control — DigiKey Product Page Links</h1>
  <p style="color:#666">${list.length} unique parts · ${totalUnits} total units across all 3 boards</p>

  <div class="intro">
    <p><b>This page is the bulletproof fallback.</b> Each "Open on DigiKey →" button opens the
       DigiKey product page in a new tab. Once there, click DigiKey's <b>Add to Cart</b> button
       and DigiKey will use the current packaging SKU automatically — no part-number rotation issues.</p>
    <p>For the bulk path, use <a href="https://www.digikey.com/bom">https://www.digikey.com/bom</a>
       with <code><a href="digikey_bom_manager.csv">digikey_bom_manager.csv</a></code>.</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>MPN / Mfr</th>
        <th>Qty</th>
        <th>Refs</th>
        <th>Package</th>
        <th>Confidence</th>
        <th>DigiKey</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <div class="footer">
    <h3>Order separately (not on DigiKey)</h3>
    <ul>
${skip.map(s => `      <li><b>${esc(s.value)}</b> · ${esc(s.board)}: ${esc(s.refs.join(' '))} — ${esc(s.src?.notes || s.src?.confidence || 'no source info')}</li>`).join('\n')}
    </ul>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'digikey_links.html'), html);
console.log(`digikey_links.html: written (${list.length} parts, ${totalUnits} units)`);
