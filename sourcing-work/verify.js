// Triple-check verification pass: re-extract every line from the original ibom.html
// pcbdata and cross-verify against the sourcing CSV / BOM Manager CSV.
//
// Reports:
//   1. Every original BOM line (board, refs, qty, value, footprint)
//   2. Whether it has a sourcing entry
//   3. Whether the MPN looks consistent with the schematic value/footprint
//   4. Aggregate totals (orig parts qty vs CSV upload qty)
//   5. Any unmapped or extra entries

const fs = require('fs');
const path = require('path');

// Must match build_bom_manager_csv.js — order enough for this many boards
const BOARDS_TO_BUILD = 2;

const sourcing = JSON.parse(fs.readFileSync(path.join(__dirname, 'sourcing.json'), 'utf8')).parts;
const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

function refSortKey(r) {
  const m = String(r).match(/^([A-Za-z_]+)(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [String(r), 0];
}

// Spec sanity checks: given a value+footprint+MPN, does the MPN's package and value
// match the schematic value? Returns an array of issues (empty = OK).
function checkSpec(value, footprint, mfr, mpn) {
  const issues = [];
  const fpLower = footprint.toLowerCase();
  const mpnLower = String(mpn).toLowerCase();

  // 1. Package size sanity check from footprint name
  const sizeFromFootprint = {
    '0402': '0402',
    '0603': '0603',
    '1005': '0402',  // metric
    '1608': '0603',
    '1206': '1206',
    '3216': '1206',
    'sot-23-5': 'SOT-23-5',
    'sot-23-6': 'SOT-23-6',
    'sot-23': 'SOT-23',
    'sod-128': 'SOD-128',
    'sod-323': 'SOD-323',
    'msop': 'MSOP',
    'tssop': 'TSSOP',
    'tqfp': 'TQFP',
    'tsop': 'TSOP',
    'usb_c': 'USB-C',
    'usb-c': 'USB-C',
  };

  // Detect package from footprint
  let fpPackage = null;
  for (const k of Object.keys(sizeFromFootprint)) {
    if (fpLower.includes(k)) { fpPackage = sizeFromFootprint[k]; break; }
  }

  // Detect package from MPN (common conventions)
  let mpnPackage = null;
  const mpnPackageHints = {
    'cl05': '0402',
    'cl10': '0603',
    'cl31': '1206',
    'grm03': '0201',
    'grm15': '0402',
    'grm18': '0603',
    'grm21': '0805',
    'grm31': '1206',
    'gcm15': '0402',
    'gcm18': '0603',
    'gcm21': '0805',
    'gcm31': '1206',
    'rmcf0402': '0402',
    'rmcf0603': '0603',
    'rmcf0805': '0805',
    'lqw18': '0603',
    'srp5020': 'SRP5020',
  };
  for (const k of Object.keys(mpnPackageHints)) {
    if (mpnLower.startsWith(k)) { mpnPackage = mpnPackageHints[k]; break; }
  }

  // If both detected and they differ, flag
  if (fpPackage && mpnPackage && fpPackage !== mpnPackage) {
    issues.push(`PACKAGE MISMATCH: footprint suggests ${fpPackage} but MPN ${mpn} suggests ${mpnPackage}`);
  }

  // 2. Value sanity check — does the MPN encode the right value?
  // Common conventions:
  //   3-digit + multiplier: 225 = 22 * 10^5 fF for caps; 105 = 10*10^5 fF = 1uF; 226 = 22uF
  //   For resistors: 5K10 = 5.10kΩ, 4R99 = 4.99Ω, etc.

  function parseValue(v) {
    // Parse Value field — capacitor: "2.2u" → 2.2e-6; "10n" → 10e-9; "25pF" → 25e-12
    // resistor: "5.1k" → 5100; "1M" → 1e6; "5" → 5; "3.0" → 3.0
    // inductor: "33nH" → 33e-9; "330nH" → 330e-9; "3.3uH" → 3.3e-6
    const m = String(v).trim().match(/^([\d.]+)\s*([pnuµmkMR]?)([FfHhΩ]?)/);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const mult = {
      'p': 1e-12, 'n': 1e-9, 'u': 1e-6, 'µ': 1e-6, 'm': 1e-3,
      'k': 1e3, 'K': 1e3, 'M': 1e6, 'R': 1,
    };
    return num * (mult[m[2]] || 1);
  }

  // Capacitor MPN value extraction. Both Samsung CL and Murata GRM/GCM put the value
  // AFTER the voltage code letter (e.g. CL10A225KO8NNNC: "A" is voltage, "225" is value;
  // GCM1555C1H620GA16J: "1H" is voltage, "620" is value).
  // Pattern: digit + uppercase + 3 digits + uppercase, capturing the 3 digits.
  function capValueFromMpn(mpn) {
    // Match the value-after-voltage-code pattern. Prefer the LAST such match in the
    // MPN since reel/series prefixes can also contain digit-letter sequences.
    const re = /\d[A-Z](\d{3})[A-Z]/g;
    let m, last = null;
    while ((m = re.exec(mpn)) !== null) last = m[1];
    if (!last) return null;
    const mantissa = parseInt(last.slice(0, 2));
    const exp = parseInt(last[2]);
    return mantissa * Math.pow(10, exp - 12);  // farads
  }

  // Resistor MPN value extraction (Stackpole RMCF: "5K10" → 5.10k, "4R99" → 4.99, "1M00" → 1.00M)
  function resValueFromMpn(mpn) {
    // RMCF0603FT5K10 → 5K10 → 5.10k
    const m = mpn.match(/RMCF\d{4}[FJ]T([\dKMR]+)/);
    if (!m) return null;
    const code = m[1];
    // Convert: digits then letter (K/M/R) then digits = decimal point at letter
    const m2 = code.match(/^(\d+)([KMR])(\d*)$/);
    if (!m2) return null;
    const intPart = parseInt(m2[1]);
    const mult = { 'K': 1e3, 'M': 1e6, 'R': 1 }[m2[2]];
    const frac = m2[3] ? parseFloat('0.' + m2[3]) : 0;
    return (intPart + frac) * mult;
  }

  const isCap = fpLower.startsWith('c_') || /capacitor/i.test(footprint);
  const isRes = fpLower.startsWith('r_') || /resistor/i.test(footprint);

  const schemValue = parseValue(value);
  if (isCap && schemValue && (mpn.startsWith('CL') || mpn.startsWith('GRM') || mpn.startsWith('GCM'))) {
    const mpnValue = capValueFromMpn(mpn);
    if (mpnValue && Math.abs((mpnValue - schemValue) / schemValue) > 0.1) {
      issues.push(`VALUE MISMATCH: schematic="${value}" (=${schemValue}F) but MPN ${mpn} encodes ${mpnValue}F`);
    }
  }
  if (isRes && schemValue !== null && mpn.startsWith('RMCF')) {
    const mpnValue = resValueFromMpn(mpn);
    if (mpnValue !== null && Math.abs(mpnValue - schemValue) > Math.max(0.1, schemValue * 0.05)) {
      // 5% tolerance OR 0.1Ω absolute
      issues.push(`VALUE MISMATCH: schematic="${value}" (=${schemValue}Ω) but MPN ${mpn} encodes ${mpnValue}Ω`);
    }
  }

  return issues;
}

// ---------------- Main verification ----------------

const allLines = [];
const issues = [];
let totalUnits = 0;

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

    const line = {
      board, refs: refs.join(' '), qty: refs.length, value, footprint, key,
      hasSourcing: !!src,
      mpn: src?.mpn || null,
      mfr: src?.mfr || null,
      confidence: src?.confidence || null,
      includedInOrder: !!(src && src.mpn && src.confidence !== 'skip' && src.confidence !== 'supplier-elsewhere'),
      specIssues: [],
    };

    if (!src) {
      issues.push({ severity: 'ERROR', line, msg: 'NO SOURCING ENTRY for this BOM line' });
    } else if (!src.mpn) {
      if (src.confidence === 'skip' || src.confidence === 'supplier-elsewhere') {
        // expected
      } else {
        issues.push({ severity: 'ERROR', line, msg: 'sourcing entry has no MPN but confidence is not skip/supplier-elsewhere' });
      }
    } else {
      // Sanity-check spec match
      line.specIssues = checkSpec(value, footprint, src.mfr, src.mpn);
      for (const si of line.specIssues) {
        issues.push({ severity: 'WARN', line, msg: si });
      }
    }

    if (line.includedInOrder) totalUnits += line.qty;
    allLines.push(line);
  }
}

// Verify BOM Manager CSV matches our line list
const csvText = fs.readFileSync(path.join(__dirname, 'digikey_bom_manager.csv'), 'utf8');
const csvLines = csvText.trim().split('\n').slice(1);
function parseCsvLine(s) {
  const out = []; let cur = ''; let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else inStr = false; }
      else cur += c;
    } else {
      if (c === '"') inStr = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const csvParts = csvLines.map(parseCsvLine);
const csvByMpn = new Map();
let csvTotalUnits = 0;
for (const r of csvParts) {
  const [mpn, qty] = r;
  csvByMpn.set(mpn, { mpn, qty: parseInt(qty), refs: r[2] });
  csvTotalUnits += parseInt(qty);
}

// Build expected aggregation by MPN from allLines (scaled by BOARDS_TO_BUILD)
const expectedByMpn = new Map();
for (const l of allLines) {
  if (!l.includedInOrder) continue;
  const e = expectedByMpn.get(l.mpn) || { mpn: l.mpn, qty: 0, perBoard: [] };
  e.qty += l.qty;
  e.perBoard.push(`${l.board}:${l.refs}`);
  expectedByMpn.set(l.mpn, e);
}
for (const e of expectedByMpn.values()) e.qty *= BOARDS_TO_BUILD;

// Compare CSV vs expected
const mpnMismatch = [];
for (const [mpn, exp] of expectedByMpn) {
  const csv = csvByMpn.get(mpn);
  if (!csv) {
    mpnMismatch.push({ mpn, expected: exp.qty, actual: 'NOT IN CSV' });
  } else if (csv.qty !== exp.qty) {
    mpnMismatch.push({ mpn, expected: exp.qty, actual: csv.qty });
  }
}
for (const [mpn] of csvByMpn) {
  if (!expectedByMpn.has(mpn)) {
    mpnMismatch.push({ mpn, expected: 'NOT IN BOM', actual: csvByMpn.get(mpn).qty });
  }
}

// ---------------- Report ----------------

let md = '# BOM Verification Report\n\n';
md += `Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
md += '## Summary\n\n';
md += `- **Total BOM lines** across 3 boards: ${allLines.length}\n`;
md += `- **Lines included in DigiKey order**: ${allLines.filter(l => l.includedInOrder).length}\n`;
md += `- **Lines excluded** (testpoints / off-DigiKey): ${allLines.filter(l => !l.includedInOrder).length}\n`;
md += `- **Quantity multiplier (BOARDS_TO_BUILD)**: ${BOARDS_TO_BUILD}\n`;
md += `- **Total units in DigiKey order (per board × ${BOARDS_TO_BUILD})**: ${totalUnits * BOARDS_TO_BUILD}\n`;
md += `- **CSV total units**: ${csvTotalUnits} ${csvTotalUnits === totalUnits * BOARDS_TO_BUILD ? '✅' : '❌ MISMATCH'}\n`;
md += `- **Unique line items in CSV**: ${csvByMpn.size}\n`;
md += `- **Issues flagged**: ${issues.length}\n`;
md += `- **MPN aggregation mismatches**: ${mpnMismatch.length}\n\n`;

md += '## Per-board breakdown\n\n';
for (const board of boards) {
  const lines = allLines.filter(l => l.board === board);
  const included = lines.filter(l => l.includedInOrder);
  const excluded = lines.filter(l => !l.includedInOrder);
  md += `### ${board}\n`;
  md += `- ${lines.length} BOM lines, ${lines.reduce((s, l) => s + l.qty, 0)} units total\n`;
  md += `- ${included.length} lines in DigiKey order (${included.reduce((s, l) => s + l.qty, 0)} units)\n`;
  md += `- ${excluded.length} lines excluded: ${excluded.map(l => `${l.refs} (${l.value})`).join('; ') || 'none'}\n\n`;
}

md += '## Issues\n\n';
if (issues.length === 0) {
  md += '✅ **No issues detected.**\n\n';
} else {
  for (const i of issues) {
    md += `- **${i.severity}**: ${i.line.board} | ${i.line.refs} | value=\`${i.line.value}\` | footprint=\`${i.line.footprint}\` | MPN=\`${i.line.mpn}\`\n`;
    md += `  - ${i.msg}\n`;
  }
  md += '\n';
}

md += '## MPN aggregation cross-check (BOM lines → CSV)\n\n';
if (mpnMismatch.length === 0) {
  md += '✅ **Every BOM line is accounted for in the CSV with the correct aggregate quantity.**\n\n';
} else {
  md += '| MPN | Expected qty | CSV qty |\n|---|---|---|\n';
  for (const m of mpnMismatch) md += `| ${m.mpn} | ${m.expected} | ${m.actual} |\n`;
  md += '\n';
}

md += '## Full BOM line-by-line\n\n';
md += '| Board | Refs | Qty | Schematic value | Footprint | Mfr | MPN | Confidence | In order? |\n';
md += '|---|---|---|---|---|---|---|---|---|\n';
for (const l of allLines) {
  const inOrder = l.includedInOrder ? '✅' : (l.confidence === 'skip' ? '— skip' : '🏪 off-DK');
  const conf = l.confidence === 'verified-was-in-cart' ? 'bom_manager_verified' : (l.confidence || '—');
  md += `| ${l.board} | ${l.refs} | ${l.qty} | \`${l.value}\` | \`${l.footprint}\` | ${l.mfr || ''} | \`${l.mpn || '(none)'}\` | ${conf} | ${inOrder} |\n`;
}

fs.writeFileSync(path.join(__dirname, 'VERIFICATION.md'), md);
console.log('VERIFICATION.md written.');
console.log(`\nSummary:`);
console.log(`  BOM lines: ${allLines.length}`);
console.log(`  In DigiKey order: ${allLines.filter(l => l.includedInOrder).length}`);
console.log(`  Excluded: ${allLines.filter(l => !l.includedInOrder).length}`);
console.log(`  Total units (×${BOARDS_TO_BUILD} boards): ${totalUnits * BOARDS_TO_BUILD} (CSV: ${csvTotalUnits})  ${totalUnits * BOARDS_TO_BUILD === csvTotalUnits ? '✅' : '❌'}`);
console.log(`  Unique CSV line items: ${csvByMpn.size}`);
console.log(`  Issues: ${issues.length}`);
console.log(`  Mismatches: ${mpnMismatch.length}`);
if (issues.length) {
  console.log('\nISSUES:');
  for (const i of issues) console.log(`  ${i.severity}: ${i.line.board}/${i.line.refs} (${i.line.value}): ${i.msg}`);
}
if (mpnMismatch.length) {
  console.log('\nMISMATCHES:');
  for (const m of mpnMismatch) console.log(`  ${m.mpn}: expected=${m.expected} actual=${m.actual}`);
}
