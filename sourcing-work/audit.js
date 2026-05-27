// Audit: cross-check schematic value/footprint against the sourcing MPN choice.
// Outputs a Markdown table the user can review at a glance.
const fs = require('fs');
const path = require('path');

const sourcing = JSON.parse(fs.readFileSync(path.join(__dirname, 'sourcing.json'), 'utf8')).parts;
const boards = ['bias-control-lt8362', 'power-supply', 'tiav3_s14160'];

// Verification status for each MPN:
//   bom_manager_verified: showed up in user's BOM Manager output as Active with stock
//   google_verified:      Google snippet confirmed it on DigiKey but BOM Manager not yet checked
//   bom_manager_failed:   BOM Manager rejected this MPN
//   inferred:             guessed from naming pattern, not verified anywhere
//   schematic_intent:     direct match to the schematic's stated MPN
const verification = {
  // From user's first BOM Manager upload — definitively verified active
  'GRM188R60J226MEA0D': { status: 'verified-was-in-cart', stock: '2M+', note: '$0.18 ea (Cut Tape 490-7611-1-ND). User wanted Samsung — swapped out.' },
  'CL10A105KA8NNNC':    { status: 'bom_manager_verified', stock: '611k', note: '$0.10 ea (1276-1102-1-ND)' },
  'CL10B222KB8NNNC':    { status: 'bom_manager_verified', stock: '220k', note: '$0.10 ea (1276-1110-1-ND)' },
  'CL10B103KB8NNNC':    { status: 'bom_manager_verified', stock: '4.78M', note: '$0.10 ea (1276-1009-1-ND)' },
  'RMCF0603FT5K10':     { status: 'bom_manager_verified', stock: '329k', note: '$0.10 ea' },
  'RMCF0603FT39K0':     { status: 'bom_manager_verified', stock: '57k', note: '$0.10 ea' },
  'RMCF0603FT1M00':     { status: 'bom_manager_verified', stock: '421k', note: '$0.10 ea' },
  'RMCF0603FT69K8':     { status: 'bom_manager_verified', stock: '114k', note: '$0.10 ea' },
  'RMCF0603FT52K3':     { status: 'bom_manager_verified', stock: '27k', note: '$0.10 ea' },
  'RMCF0603FT36K5':     { status: 'bom_manager_verified', stock: '93k', note: '$0.10 ea' },
  'RMCF0603FT4R99':     { status: 'bom_manager_verified', stock: '30k', note: '$0.10 ea' },
  'RMCF0603FT64K9':     { status: 'bom_manager_verified', stock: '133k', note: '$0.10 ea' },
  'RMCF0603FT24K9':     { status: 'bom_manager_verified', stock: '61k', note: '$0.10 ea' },
  'RMCF0402FT49R9':     { status: 'bom_manager_verified', stock: '975k', note: '$0.10 ea' },
  'RMCF0402FT1K50':     { status: 'bom_manager_verified', stock: '131k', note: '$0.10 ea' },
  'RMCF0402FT68R0':     { status: 'bom_manager_verified', stock: '175k', note: '$0.10 ea (738-RMCF0402FT68R0CT-ND)' },
  'RMCF0402FT3R01':     { status: 'bom_manager_verified', stock: '39k', note: '$0.10 ea' },
  'RMCF0402FT4K99':     { status: 'bom_manager_verified', stock: '321k', note: '$0.10 ea' },
  'RMCF0402FT10R0':     { status: 'bom_manager_verified', stock: '547k', note: '$0.10 ea' },
  'RMCF0402FT30R1':     { status: 'bom_manager_verified', stock: '92k', note: '$0.10 ea' },
  'SRP5020TA-3R3M':     { status: 'bom_manager_verified', stock: '2k', note: '$1.02 ea' },
  '1N4148WS-7-F':       { status: 'bom_manager_verified', stock: '149k', note: '$0.16 ea' },
  'PMEG6030EP,115':     { status: 'bom_manager_verified', stock: '11k', note: '$0.73 ea' },
  'MIC5317-3.3YM5-TR':  { status: 'bom_manager_verified', stock: '2.6k', note: '$0.12 ea' },
  'MCP6C02T-020E/CHY':  { status: 'bom_manager_verified', stock: '0', note: '$1.50 ea, 1 expected 22-Jun-2026' },
  'LT8362EMSE#PBF':     { status: 'bom_manager_verified', stock: '1.1k', note: '$6.36 ea (tube)' },
  'ATSAMD21E18A-AUT':   { status: 'bom_manager_verified', stock: '3.4k', note: '$4.03 ea — but user wants -AFT (automotive variant)' },
  'ATSAMD21E18A-AFT':   { status: 'google_verified',      stock: '?', note: 'Per user request: AEC-Q100 automotive grade, T&R cut-tape. Same die as -AUT.' },
  'MCP47FEB22A2-E/ST':  { status: 'bom_manager_verified', stock: '54', note: '$3.24 ea (tube)' },
  'TSW-103-07-F-D':     { status: 'bom_manager_verified', stock: '7.5k', note: '$0.32 ea (bag SAM10846-ND)' },
  'UJ20-C-V-C-2-SMT-TR':{ status: 'bom_manager_verified', stock: '0', note: '$0.95 ea, 1 expected 26-May-2026' },
  'LM2776DBVR':         { status: 'bom_manager_verified', stock: '36k', note: '$1.14 ea' },
  'TPS72301DBVR':       { status: 'bom_manager_verified', stock: '8k', note: '$3.55 ea (296-27049-1-ND)' },
  'TPS79333DBVR':       { status: 'bom_manager_verified', stock: '48', note: '$0.34 ea' },
  'SSQ-103-03-G-D':     { status: 'bom_manager_verified', stock: '163', note: '$1.77 ea (Bulk SAM1196-03-ND)' },
  'CL31B225KBHNNNE':    { status: 'bom_manager_verified', stock: '109k', note: '$0.22 ea (1276-1291-1-ND)' },
  'CL05A105KP5NNNC':    { status: 'bom_manager_verified', stock: '3.93M', note: '$0.10 ea (1276-1076-1-ND) — earlier "OOS" claim was wrong' },
  'GCM1555C1H620GA16J': { status: 'bom_manager_verified', stock: '73k', note: '$0.10 ea (490-GCM1555C1H620GA16JCT-ND)' },
  'LQW18AN33NJ00D':     { status: 'bom_manager_verified', stock: '436', note: '$0.11 ea (490-1175-1-ND)' },
  'LQW18CAR33J00D':     { status: 'bom_manager_verified', stock: '695', note: '$0.43 ea (490-18181-1-ND)' },
  'OPA847IDBVT':        { status: 'bom_manager_verified', stock: '16', note: '$10.04 ea — TI price jump from old BOM' },
  'SSQ-103-01-G-D':     { status: 'bom_manager_verified', stock: '1.1k', note: '$1.64 ea (SAM1179-03-ND)' },
  '131-3701-261':       { status: 'bom_manager_verified', stock: '6k', note: '$3.57 ea (J613-ND)' },

  // Substitutes for obsoletes — Google-snippet verified but NOT yet through BOM Manager
  'CL10A226MQ8NRNC':    { status: 'google_verified', stock: '?', note: 'Samsung 22µF 6.3V X5R 0603 ±20%. Google confirmed active.' },
  'CL31B225KCHSNNE':    { status: 'google_verified', stock: '?', note: 'Samsung 2.2µF 100V X7R 1206 ±10%. Google confirmed active.' },
  'CC0603JRNPO9BN250':  { status: 'google_verified', stock: 'in stock at DigiKey (user-verified)', note: 'Yageo 25pF 50V C0G/NP0 0603 ±5%. Value-preserving substitute for the discontinued Samsung CL10C250JB8NNNC at C12.' },
  'CL10A225KO8NNNC':    { status: 'google_verified', stock: '261k', note: 'Samsung 2.2µF 16V X5R 0603 ±10%. $0.08 ea per Google snippet. Replaces failed CL10A225KO5LNNC.' },
  'LT3014ES5#TRPBF':     { status: 'google_verified', stock: 'in stock at DigiKey', note: 'ADI adjustable LDO, 80V Vin, 20mA, SOT-23-5. TRUE drop-in for RT9072B: same pinout (1=IN, 2=GND, 3=SHDN, 4=ADJ, 5=OUT), same 1.22V FB reference. Required because U2 sits in the HV bias path (Vin sees ~70V from boost). No PCB/schematic changes needed.' },
  'MCP6C02T-020E/CHYVAO': { status: 'google_verified', stock: 'in stock at DigiKey', note: 'AEC-Q100 automotive variant of MCP6C02T-020E/CHY (same die, same gain 20 V/V, same SOT-23-6 pinout). TRUE drop-in — no firmware or R13 change. Replaces the OOS bare /CHY variant.' },
  'TSM-104-01-L-SV-P-TR': { status: 'google_verified', stock: '?', note: 'Samtec 1×4 SMD vertical, P-TR loose tape (qty 1 orderable). "L" = gold plating.' },
};

function refSortKey(r) {
  const m = String(r).match(/^([A-Za-z_]+)(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [String(r), 0];
}

const rows = [];
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
    if (!src) { rows.push({ board, refs, value, footprint, mpn: '!! no sourcing entry', status: 'MISSING' }); continue; }
    if (!src.mpn) { rows.push({ board, refs, value, footprint, mpn: '(no DK source)', status: src.confidence || 'skip' }); continue; }
    const v = verification[src.mpn] || { status: 'UNKNOWN', stock: '?', note: '(not in verification table)' };
    rows.push({
      board, refs: refs.join(' '), qty: refs.length, value, footprint,
      mpn: src.mpn, mfr: src.mfr,
      status: v.status, stock: v.stock, note: v.note,
    });
  }
}

// Output the audit table
let out = '# Sourcing audit — schematic value → MPN → verification\n\n';
out += '**Legend:**\n';
out += '- ✅ `bom_manager_verified` — Real DK part with stock confirmed in user\'s BOM Manager upload\n';
out += '- 🟡 `google_verified` — Google snippet says active; not yet through BOM Manager\n';
out += '- ⚠️ `inferred` — Guessed from naming convention; needs DigiKey UI verification\n';
out += '- ❌ `bom_manager_failed` — Will be re-substituted\n\n';
out += '| Board | Refs | Qty | Schematic Value | Schematic Footprint | Picked MPN | Mfr | Status | Note |\n';
out += '|---|---|---|---|---|---|---|---|---|\n';
const statusEmoji = {
  bom_manager_verified: '✅',
  'verified-was-in-cart': '✅',
  google_verified: '🟡',
  lcsc_verified: '🟢',
  inferred: '⚠️',
  bom_manager_failed: '❌',
  oos_at_digikey: '⛔',
  UNKNOWN: '❓',
  skip: '—',
  'supplier-elsewhere': '🏪',
};
for (const r of rows) {
  const emoji = statusEmoji[r.status] || '❓';
  out += `| ${r.board} | ${r.refs} | ${r.qty || ''} | \`${r.value}\` | \`${r.footprint}\` | \`${r.mpn}\` | ${r.mfr || ''} | ${emoji} ${r.status} | ${r.note || ''} |\n`;
}

fs.writeFileSync(path.join(__dirname, 'AUDIT.md'), out);
console.log('AUDIT.md written.\n');

// Summary stats
const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log('Status counts:');
for (const [s, n] of Object.entries(byStatus)) console.log(`  ${statusEmoji[s] || '❓'} ${s}: ${n}`);
