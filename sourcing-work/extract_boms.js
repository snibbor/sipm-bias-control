// Extract pcbdata JSON from KiCad InteractiveHtmlBom ibom.html files.
// The pcbdata is stored as: var pcbdata = JSON.parse(LZString.decompressFromBase64("..."));
const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');

const boards = {
  'bias-control-lt8362': '../bias-control-lt8362/bom/ibom.html',
  'power-supply':        '../power-supply/kicad/bom/ibom.html',
  'tiav3_s14160':        '../tiav3_s14160/kicad/bom/ibom.html',
};

const outDir = __dirname;

function extractPcbdata(html) {
  // find: var pcbdata = JSON.parse(LZString.decompressFromBase64("...."));
  const re = /var\s+pcbdata\s*=\s*JSON\.parse\(LZString\.decompressFromBase64\("([^"]+)"\)\)/;
  const m = html.match(re);
  if (!m) throw new Error('pcbdata pattern not found');
  const decompressed = LZString.decompressFromBase64(m[1]);
  return JSON.parse(decompressed);
}

for (const [name, rel] of Object.entries(boards)) {
  const full = path.join(__dirname, rel);
  const html = fs.readFileSync(full, 'utf8');
  const data = extractPcbdata(html);
  const outFile = path.join(outDir, `pcbdata_${name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  const refCount = (data.bom && data.bom.both) ? data.bom.both.length : 'n/a';
  console.log(`${name}: wrote ${outFile} ; bom groups (both)=${refCount}`);
}
