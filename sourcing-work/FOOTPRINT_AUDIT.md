# Footprint Audit — substitute parts vs schematic footprints

> For each substituted MPN, verify the physical package matches the original schematic/PCB footprint so we can drop the new part onto the existing board without layout changes.

---

## Method

For each substitution, compare:
- **Schematic footprint** (from KiCad `Footprint:` field in the .kicad_sch)
- **Substitute MPN's package** (per manufacturer datasheet)
- **Pin map** if it's a multi-pin part (SOT-23, MSOP, TQFP, etc.)

A ✅ means the new part drops into the existing PCB pad with no layout change. ⚠ means same footprint but a subtle caveat. ❌ would mean a real footprint mismatch (none in this BOM).

---

## 1. Passives (resistors, capacitors, inductors)

Standard chip packages (0402, 0603, 0805, 1206) are universal industry footprints. Any vendor's part in the same case size drops into the same PCB pad.

| Ref(s) | Schematic footprint | Substitute MPN | Substitute package | Status |
|---|---|---|---|---|
| C1, C4 + 5 more (22 µF 0603) | `C_0603_1608Metric` | Samsung CL10A226MQ8NRNC | 0603 (1608 metric) | ✅ |
| C2/C7/C9/C10/C14/C17/C18 (2.2 µF 0603) | `C_0603_1608Metric` | Samsung CL10A225KO8NNNC | 0603 (1608 metric) | ✅ |
| C3, psu C2/C8 (1 µF 0603) | `C_0603_1608Metric` | Samsung CL10A105KA8NNNC | 0603 (1608 metric) | ✅ |
| C5/C6/C8/C11/C13 (2.2 µF 1206 / HV bulk) | `C_1206_3216Metric` | Samsung CL31B225KCHSNNE | 1206 (3216 metric) | ✅ |
| C12 (25 pF 0603) | `C_0603_1608Metric` | Yageo CC0603JRNPO9BN250 — *or* AVX 06031A250GAT2A | 0603 (1608 metric) for both | ✅ |
| C15 (2.2 nF 0603) | `C_0603_1608Metric` | Samsung CL10B222KB8NNNC | 0603 (1608 metric) | ✅ |
| C16 (10 nF 0603), psu C17 | `C_0603_1608Metric` | Samsung CL10B103KB8NNNC | 0603 (1608 metric) | ✅ |
| TIA C1/C4 (2.2 µF 1206) | `C_1206_3216Metric` | Samsung CL31B225KBHNNNE | 1206 (3216 metric) | ✅ |
| TIA C2/C3 (62 pF 0402) | `C_0402_1005Metric` | Murata GCM1555C1H620GA16J | 0402 (1005 metric) | ✅ |
| TIA C5/C6/C7/C9 (1 µF 0402) | `C_0402_1005Metric` | Samsung CL05A105KP5NNNC | 0402 (1005 metric) | ✅ |
| All bias 0603 resistors (R1, R2, R3, R4, R5, R6, R7-R13, R15, R16) | `R_0603_1608Metric` | Stackpole RMCF0603FT… | 0603 (1608 metric) | ✅ |
| All psu 0603 resistors (R8, R9) | `R_0603_1608Metric` | Stackpole RMCF0603FT… | 0603 (1608 metric) | ✅ |
| TIA 0402 resistors (R1, R2, R3, R5, R7, R23) | `R_0402_1005Metric` | Stackpole RMCF0402FT… | 0402 (1005 metric) | ✅ |
| TIA R11 (10 Ω, hand-solder) | `R_0402_1005Metric_Pad0.72x0.64mm_HandSolder` | Stackpole RMCF0402FT10R0 | 0402 (1005 metric); the hand-solder footprint just has longer pads | ✅ same part fits both variants |
| TIA L1 (33 nH, hand-solder pads) | `L_0603_1608Metric_Pad1.05x0.95mm_HandSolder` | Murata LQW18AN33NJ00D | 0603 (1608 metric); same as above | ✅ |
| TIA L2 (330 nH) | `L_0603_1608Metric` | Murata LQW18CAR33J00D | 0603 (1608 metric) | ✅ |
| Bias L1 (3.3 µH boost inductor) | `SRP05204R7K` (Bourns SRP5020 land pattern) | Bourns SRP5020TA-3R3M | SRP5020 (5.0 × 5.0 × 2.0 mm) | ✅ |

---

## 2. Diodes

| Ref | Schematic footprint | Substitute MPN | Substitute package | Status |
|---|---|---|---|---|
| D2 (1N4148WS) | `D_SOD-323F` | Diodes 1N4148WS-7-F | SOD-323 (per Diodes datasheet) | ✅ |
| D3 (PMEG6030EP) | `D_SOD-128` | Nexperia PMEG6030EP,115 | SOD-128 (per Nexperia datasheet) | ✅ |

---

## 3. ICs

| Ref | Schematic footprint | Original MPN | Substitute MPN | Substitute package | Pinout match? | Status |
|---|---|---|---|---|---|---|
| IC1 (LT8362) | `LT8364IMSE-PBF` (MSOP-16 EP land pattern) | LT8362EMSE#PBF | (unchanged) | MSOP-16-EP | n/a | ✅ |
| IC2 (SAMD21 MCU) | `ATSAMD21E18A-AF` | ATSAMD21E18A-AF | **ATSAMD21E18A-AFT** | TQFP-32 (7×7 mm) | Same die, same package, same pinout — only packaging tape changed | ✅ |
| IC4 (MCP47FEB22 DAC) | `SOP65P640X120-8N` (TSSOP-8) | MCP47FEB22A2-E/ST | (unchanged) | TSSOP-8 | n/a | ✅ |
| U1 (MIC5317 LDO) | `MIC5317-3.3YM5-TR` | MIC5317-3.3YM5-TR | (unchanged) | SOT-23-5 | n/a | ✅ |
| U2 (HV LDO) | `SOT-23-5` | RT9072B | **LT3014ES5#TRPBF** | TSOT-23-5 (Linear's "S5" package) | ⚠ Same outline as SOT-23-5, slightly thinner profile. Pin map: 1=IN, 2=GND, 3=SHDN, 4=ADJ, 5=OUT — identical to RT9072B. **SHDN polarity inverted** (covered in DESIGN_NOTES §9.1) | ✅ footprint, ⚠ SHDN polarity (firmware fix) |
| U3 (HV current sense) | `SOT-23-6` | MCP6C02T-020E/CHY | **MCP6C02T-020E/CHYVAO** | SOT-23-6 | Identical pinout, identical die, automotive qual added | ✅ |
| psu U1 (LM2776) | `LM2776DBVR` (SOT-23-6) | LM2776DBVR | (unchanged) | SOT-23-6 | n/a | ✅ |
| psu U3 (TPS72301) | `TPS72301DBVR` (SOT-23-5) | TPS72301DBVR | (unchanged) | SOT-23-5 | n/a | ✅ |
| psu U5 (TPS79333) | `TPS79333DBVR` (SOT-23-5) | TPS79333DBVR | (unchanged) | SOT-23-5 | n/a | ✅ |
| TIA U1 (OPA847 op-amp) | `OPA847IDBVT` (SOT-23-6) | OPA847IDBVT | (unchanged) | SOT-23-6 | n/a | ✅ |

### U2 footprint note — SOT-23-5 vs TSOT-23-5

The original RT9072B is in SOT-23-5 (body height ~1.1 mm). The Linear LT3014's "S5" package is technically a **TSOT-23-5** (Thin SOT-23-5, body height ~0.9 mm). Both have:

- Same lead pitch (0.95 mm pin-to-pin)
- Same lead width and length
- Same overall outline footprint on the PCB
- Same pin-1 indicator

The PCB pad pattern (`SOT-23-5` in your KiCad footprint library) accommodates both. The only difference is the package is ~0.2 mm shorter in height. Mechanically: **drops in without changes**.

---

## 4. Connectors

| Ref | Schematic footprint | Original MPN | Substitute MPN | Substitute footprint | Status |
|---|---|---|---|---|---|
| J2 (bias 1×4 SMD header) | `PinHeader_1x04_P2.54mm_Vertical_SMD_Pin1Right` | TSM-104-01-T-SV-TR | **TSM-104-01-L-SV-P-TR** | Same Samtec 1×4 SMD vertical 2.54 mm — only difference is `L` (gold plating) vs `T` (tin) and `-P-TR` packaging | ✅ Same mechanical footprint, gold plating is a strict upgrade |
| J3 (bias debug 2×3) | `PinHeader_2x03_P2.54mm_Vertical` | TSW-103-07-F-D | (unchanged) | 2×3 vertical 2.54 mm THT | ✅ |
| J4 (bias USB-C) | `CUI_UJ20-C-V-C-2-SMT-TR_fixedV2` | UJ20-C-V-C-2-SMT-TR | (unchanged) | Custom SMT vertical mid-mount USB-C | ✅ Exact MPN match to footprint |
| psu J3 (2×3 socket) | `PinHeader_2x03_P2.54mm_Vertical` | SSQ-103-03-G-D | (unchanged) | 2×3 vertical 2.54 mm socket | ✅ |
| TIA J1 (2×3 socket) | `PinHeader_2x03_P2.54mm_Vertical` | SSQ-103-01-G-D | (unchanged) | 2×3 vertical 2.54 mm socket | ✅ |
| TIA J2 (SMB) | `SMB_Jack_Vertical` | 131-3701-261 | (unchanged) | SMB jack vertical THT | ✅ |

---

## 5. Summary

| Substitution | Footprint match | Pinout match | Caveats |
|---|---|---|---|
| All MLCCs (Murata→Samsung, Samsung→Yageo, etc.) | ✅ Industry-standard 0402/0603/1206 | n/a | None |
| All resistors (Stackpole RMCF) | ✅ Industry-standard 0402/0603 | n/a | None |
| All inductors (Murata, Bourns) | ✅ Same footprint family | n/a | None |
| ATSAMD21E18A-AF → -AFT | ✅ Same TQFP-32 | ✅ identical die | Only packaging-tape change |
| MCP6C02T-020E/CHY → /CHYVAO | ✅ Same SOT-23-6 | ✅ identical pinout/die | Automotive qual added — strict upgrade |
| RT9072B → LT3014ES5 | ✅ Same SOT-23-5 land pattern (TSOT-23-5 body fits) | ✅ Same pin map (1=IN, 2=GND, 3=SHDN, 4=ADJ, 5=OUT) | **SHDN polarity inverted** — requires one-line firmware DTS change |
| MIC5235YM5-TR/LT3008IS5/LT1761 (previous picks, now reverted) | n/a | n/a | All replaced by LT3014 |
| TSM-104-01-T-SV-TR → -L-SV-P-TR | ✅ Same 1×4 SMD vertical 2.54 mm | n/a | L=gold (upgrade over T=tin); P-TR=loose-tape packaging |

**Conclusion: every substituted part drops into the existing PCB layout with no copper or footprint changes.** The single non-mechanical caveat is the LT3014's reversed SHDN polarity, which is fixed by one line in the Zephyr DTS file. This is documented in `DESIGN_NOTES.md §9.1` and `§10`.
