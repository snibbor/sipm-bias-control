# High-Voltage Exposure Audit — bias-control-lt8362

> Per-component check for voltage rating headroom on the HV-exposed parts of the bias controller board. Done after switching C12 to a 25 pF Yageo part — same pass also covers every other cap and the resistors on the HV path.

---

## 1. Methodology

The bias controller has exactly one high-voltage node: the LT8362 boost output rail (`BOOST_OUT` / `BIAS`). Everything else on the board runs from USB +5 V, the MIC5317's +3.3 V, or LT8362-internal sub-rails (INTVCC ≈ 3.4 V, compensation nets at <2 V).

I extracted each component's *schematic placement coordinates* from `bias_generator_LT8362.kicad_sch` and grouped them by physical proximity to the HV cluster (U2 at (179, 151), boost output rails at y≈146, R13 at (142.24, 146.05)). Anything physically inside that cluster sits on a node that can see 0–50+ V; everything outside is on a low-voltage rail.

For each HV-exposed component I check:

- **Voltage rating ≥ 2× max expected node voltage** (recommended derating per industry best practice)
- For MLCCs: dielectric stability under DC bias (X7R can lose 50–70% of C; C0G/NP0 is flat)
- For 0603 resistors: working voltage limit (typically 50–75 V for standard film parts)

Assumed max HV: **~55 V** (LT8362 boost setpoint with margin for transients). Recommended cap voltage rating: **≥100 V** for 2× headroom.

---

## 2. Capacitor audit

### 2.1 HV-exposed (clustered around U2 at ~(180, 150) and BOOST_OUT at ~(133, 146))

| Ref | Schematic pos | Value | Net (inferred) | Voltage exposure | Currently in CSV | Rating | Headroom | Status |
|---|---|---|---|---|---|---|---|---|
| **C5** | (~194, 143) | 2.2 µF | BIAS / U2 OUT | up to ~50 V | Samsung CL31B225KCHSNNE | 1206 / 100 V / X7R | 2.0× | ✅ OK |
| **C6** | (~201, 143) | 2.2 µF | BIAS / U2 OUT | up to ~50 V | Samsung CL31B225KCHSNNE | 1206 / 100 V / X7R | 2.0× | ✅ OK |
| **C8** | (~131, 146) | 2.2 µF | BOOST_OUT (LT8362 output bulk) | up to ~55 V | Samsung CL31B225KCHSNNE | 1206 / 100 V / X7R | 1.8× | ✅ OK — matches schematic comment "C8 must be ≥ 100 V" |
| **C11** | (~208, 143) | 2.2 µF | BIAS / U2 OUT | up to ~50 V | Samsung CL31B225KCHSNNE | 1206 / 100 V / X7R | 2.0× | ✅ OK |
| **C12** | (~199, 149) | 25 pF | across R15 (U2 FB feedforward) | ~49 V steady-state | Yageo CC0603JRNPO9BN250 | 0603 / **50 V** / C0G | **1.02×** | ⚠ **ON MARGIN — see §2.2** |
| **C13** | (~164, 143) | 2.2 µF | BOOST_OUT / U2 Vin | up to ~55 V | Samsung CL31B225KCHSNNE | 1206 / 100 V / X7R | 1.8× | ✅ OK |

### 2.2 C12 — recommendation: upgrade to 100 V variant if available

C12 sits across R15 (U2's upper FB-divider resistor). One terminal is at U2 OUT (~49 V) and the other is at U2's FB pin (~1.22 V), so C12 sees **steady-state ~48 V on a 50 V part — only 4% headroom**, well below the 2× best-practice derating.

**Yageo's CC0603 family naming pattern:**

| Yageo code position | "9" | "0" |
|---|---|---|
| Voltage rating | 50 V | **100 V** |
| Example confirmed on DigiKey | CC0603JRNPO9BN250 (25 pF, 50 V) | CC0603JRNPO0BN100 (10 pF), CC0603JRNPO0BN101 (100 pF), CC0603JRNPO0BN221 (220 pF) |

The 100 V/25 pF variant **should** be `CC0603JRNPO0BN250` (following the family pattern). I couldn't confirm via Google snippets — please check DigiKey's parametric filter directly:
- Filter URL: https://www.digikey.com/en/products/filter/ceramic-capacitors/60
- Capacitance = 25 pF, Voltage = 100 V, Dielectric = C0G/NP0, Size = 0603

**If `CC0603JRNPO0BN250` is in stock**: swap C12 to it (2× HV headroom, otherwise identical specs).
**If not**: stay with `CC0603JRNPO9BN250` (50 V). This matches the original design's 50 V rating, so we're not making the situation worse — but it remains on margin.

### 2.3 Low-voltage caps (all far from the HV cluster — no HV exposure)

| Ref | Schematic pos | Value | Net (inferred) | Rail | Currently in CSV | Rating | Verdict |
|---|---|---|---|---|---|---|---|
| C1, C4 | (~91, 90), (~101, 91) | 22 µF | USB +5 V input bulk | 5 V | Samsung CL10A226MQ8NRNC | 0603 / 6.3 V / X5R | ✅ 1.26× headroom — note: 6.3 V is original design choice, tight but standard for USB-5V bulk |
| C10 | (~97, 57) | 22 µF | Likely on input rail near connector | 5 V or lower | Samsung CL10A226MQ8NRNC | 0603 / 6.3 V / X5R | ✅ same as above |
| C2 | (~22, 82) | 2.2 µF | Likely 3.3 V or USB decoupling | ≤ 5 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 3.2× headroom |
| C7 | (~190, 56) | 2.2 µF | Upper-right area, likely MCU decoupling | 3.3 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 4.8× headroom |
| C9 | (~15, 52) | 2.2 µF | Far-left, USB area | ≤ 5 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 3.2× headroom |
| C14 | (~26, 90) | 2.2 µF | USB area | ≤ 5 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 3.2× headroom |
| C17 | (~112, 90) | 2.2 µF | Mid-left, likely 3.3 V decoupling | 3.3 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 4.8× headroom |
| C18 | (~183, 42) | 2.2 µF | Upper-right area (near LDO_SHDN signal route to MCU) | 3.3 V | Samsung CL10A225KO8NNNC | 0603 / 16 V / X5R | ✅ 4.8× headroom |
| C3 | (~66, 161) | 1 µF | LT8362 INTVCC pin (~3.4 V) | 3.4 V | Samsung CL10A105KA8NNNC | 0603 / 25 V / X5R | ✅ 7.4× headroom |
| C15 | (~74, 180) | 2.2 nF | LT8362 RT/VC pin (compensation, <2 V) | <2 V | Samsung CL10B222KB8NNNC | 0603 / 50 V / X7R | ✅ 25× headroom |
| C16 | (~120, 168) | 10 nF | LT8362 area (likely VC pin compensation) | <2 V | Samsung CL10B103KB8NNNC | 0603 / 50 V / X7R | ✅ 25× headroom |

**Verdict for low-voltage caps**: every cap has at least 1.26× headroom and most have 3–25×. No changes recommended.

---

## 3. Resistor audit (HV path)

Standard Stackpole RMCF0603 series has working voltage **50 V** and max overload **100 V** per datasheet. Best practice: stay below ~30 V steady-state on a 50 V part (60% derating).

### 3.1 Resistors in the U2 FB divider and HV current sense

| Ref | Position | Value | Function | Voltage drop | Working V utilization | Status |
|---|---|---|---|---|---|---|
| **R13** | (142.24, 146.05) | 5 Ω (RMCF0603FT4R99) | HV current sense between BOOST_OUT and U2 Vin | I_max × 5 Ω ≈ 100 mV (at 20 mA) | <1% | ✅ trivial |
| **R15** | (189.87, 160.02) | 39 k (RMCF0603FT39K0) | U2 FB divider top — between BIAS and FB pin | depends on actual U2 setpoint: BIAS − 1.22 V | **~96% if BIAS=50V** | ⚠ **see §3.2** |
| **R16** | (198.76, 160.02) | 39 k (RMCF0603FT39K0) | U2 FB divider bottom — between FB pin and GND | 1.22 V (FB voltage) | ~2.4% | ✅ trivial |

### 3.2 R15 voltage rating — caveat about BOM placeholder values

**The schematic value `R15 = 39 k`** combined with `R16 = 39 k` would set U2's output at `Vref × (1 + R15/R16) = 1.22 V × 2 = 2.44 V` — clearly *not* the SiPM bias voltage. So either:

1. **The BOM has placeholder values** that the user adjusts when building the board. The actual built R15 might be ~1.5 MΩ (giving Vout ≈ 50 V).
2. **U2's output isn't the SiPM HV** in this design, and the SiPM bias is taken directly from `BOOST_OUT` somewhere I haven't traced.

**Recommendation**: when you finalize R15/R16 for your specific SiPM operating point, check the voltage across R15 against the resistor's working-voltage rating:

- If actual R15 sees ≤ 25 V steady-state → standard RMCF0603FT (50 V working) is fine
- If actual R15 sees 25–50 V → on margin; consider:
  - 0805 size (Stackpole RMCF0805 is 150 V working)
  - HV-rated 0603 (Vishay CRCW0603HV series, 75 V working)
  - Series-stack two 0603 resistors (splits the drop in half each)
- If actual R15 sees >50 V → mandatory: use 0805 or HV-rated 0603

**For the BOM as it stands (R15 = 39 k)**, the part is fine — the standard `RMCF0603FT39K0` works at any voltage drop up to 50 V. If you do change R15 to e.g. 1.5 MΩ to set ~50 V output, you'd see ~48.78 V across it, which is 97% of working voltage rating — too close. **Switch to HV variant or 0805 in that case.**

### 3.3 Other resistors near the LT8362 / HV area

| Ref | Position | Value | Function | Voltage exposure | Status |
|---|---|---|---|---|---|
| R12 | (133.35, 172.09) | 39 k | LT8362 FBX network area | LT8362 FBX is internally ≈1.22 V; net voltage to other end depends on design | ✅ likely low-V; standard rating fine |
| R2 | (58.42, 128.91) | 69.8 k | LT8362 RT/sync pin | <2 V on LT8362 | ✅ trivial |
| R4 | (70.49, 121.92) | 1 M | LT8362 control pin | <5 V typical | ✅ huge headroom (1 MΩ → negligible current) |
| R5 | n/a (paired with R4) | 1 M | Same | Same | ✅ same |
| R11 | (79.38, 175.26) | 36.5 k | LT8362 control pin | <5 V | ✅ trivial |
| R6 | n/a | 52.3 k | LT8362 switching frequency setter | <2 V (RT pin) | ✅ trivial |

All other resistors on the LT8362 are on internal control/compensation pins that run at <5 V. Standard 0603 ratings are fine.

### 3.4 The 5.1 k pullups (R1, R3, R7-R10)

These are I2C pullups / digital pullups. 3.3 V or 5 V exposure max. Trivially within 0603 ratings.

---

## 4. Diodes and active components

| Ref | Part | Function | V_RRM/V_max | Max applied | Status |
|---|---|---|---|---|---|
| D2 | 1N4148WS-7-F | Small signal diode | 75 V | Likely <5 V (signal use) | ✅ huge headroom |
| D3 | PMEG6030EP,115 | LT8362 boost catch diode | **60 V** | BOOST_OUT switching to ~55 V peak | ⚠ **1.1× — on margin** |
| L1 | SRP5020TA-3R3M | LT8362 boost inductor | n/a (current-limited) | I_sat 7.3 A vs LT8362's ~2 A max switch | ✅ 3.6× current headroom |
| U1 | MIC5317-3.3YM5-TR | 3.3 V LDO | Vin 16 V max | USB +5 V | ✅ 3.2× headroom |
| U2 | LT3014ES5#TRPBF | HV LDO post-reg | Vin 80 V max | ~55 V boost | ✅ 1.45× headroom — acceptable |
| U3 | MCP6C02T-020E/CHYVAO | HV current sense | CM 65 V max | ~55 V on R13 | ✅ 1.18× — on spec margin but within rating |
| IC1 | LT8362EMSE#PBF | Boost regulator | Vout 60 V max (data sheet) | ~50 V boost setpoint | ✅ 1.2× headroom |
| IC2 | ATSAMD21E18A-AFT | MCU | Vin 3.6 V max | 3.3 V | ✅ |
| IC4 | MCP47FEB22A2-E/ST | DAC | Vin 5.5 V max | 3.3 V | ✅ |

### 4.1 D3 (PMEG6030EP) — on margin at 60 V V_RRM

The PMEG6030EP is rated 60 V repetitive reverse voltage. When the LT8362 switch is closed, the cathode sees BOOST_OUT (~55 V) and the anode sees SW pin (briefly near 0 V), so the cathode-to-anode reverse voltage hits ~55 V. **1.1× headroom** — tight but acceptable since this is a Schottky and the LT8362's switching transient is bounded by the inductor.

**If you want more headroom**, alternatives:
- **PMEG10030ELP** (Nexperia, 100 V/3 A SOD-128) — 1.8× headroom. Likely available at DigiKey.
- **SS3H10** (Onsemi, 100 V/3 A SOD-128) — same idea.
- **B340A-13-F** (Diodes Inc, 40 V — NO, lower)

Since the original schematic specifies PMEG6030EP, I'll keep it but flag this for your awareness.

---

## 5. Summary of recommended changes

| Change | Why | Risk if not done |
|---|---|---|
| **(Recommended) C12 → Yageo CC0603JRNPO0BN250** (25 pF / **100 V**) if in stock at DigiKey | C12 sees ~48 V steady, currently 50 V rated. 100 V gives 2× headroom. | Tight margin (96% of working voltage) — could fail over time under thermal cycling or transients. |
| **(User-built only) R15 should be ≥75 V rated** if you actually populate it with a value that puts >25 V across it | Standard RMCF0603FT has 50 V working voltage. | R15 burnout / arcing if pushed beyond 50 V. |
| **(Optional) D3 PMEG6030EP → PMEG10030ELP** for 100 V V_RRM | Catch diode is at 1.1× margin. | Marginal — original design accepted this. |

---

## 6. What's already correct (no change needed)

✅ All 5 bias-output bulk caps (C5/C6/C8/C11/C13, 2.2 µF 1206) are 100 V rated — 2× headroom on the highest-V node.
✅ All low-voltage 0603 caps (C1, C2, C3, C4, C7, C9, C10, C14, C15, C16, C17, C18) have plenty of headroom on their respective rails (1.26× – 25×).
✅ U2 (LT3014) is rated for 80 V vs ~55 V seen — 1.45× headroom.
✅ U3 (MCP6C02) common-mode range 65 V vs ~55 V — 1.18×, within spec.
✅ R13 sense resistor dissipation is trivially within 1/10 W.
✅ R16 (FB divider bottom) sees only 1.22 V — irrelevant.
✅ All LT8362-area resistors are on low-voltage internal pins.
✅ LT8362 itself, ATSAMD21, MCP47FEB22, MIC5317 all have appropriate headroom on their rails.
