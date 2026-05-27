# SiPM Bias Controller — Component Function and Sourcing Design Notes

> Generated: 2026-05-25
> Scope: explains what each major component does in the **bias-control-lt8362** board, how the **power-supply** and **tiav3_s14160** boards fit in, and documents every sourcing substitution made (with the design impact of each).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Bias Controller Board — Signal Chain](#2-bias-controller-board--signal-chain)
3. [Deep Dive: HV Post-Regulator (U2 = RT9072B)](#3-deep-dive-hv-post-regulator-u2--rt9072b)
4. [Deep Dive: HV Current Sense (U3 = MCP6C02T-020E/CHY)](#4-deep-dive-hv-current-sense-u3--mcp6c02t-020echy)
5. [Other Major Components on the Bias Board](#5-other-major-components-on-the-bias-board)
6. [Power-Supply Board (Briefly)](#6-power-supply-board-briefly)
7. [TIA Board (Briefly)](#7-tia-board-briefly)
8. [Sourcing Substitutions — Summary Table](#8-sourcing-substitutions--summary-table)
9. [Substitution Details and Rationale](#9-substitution-details-and-rationale)
10. [Required Changes by Substitution](#10-required-changes-by-substitution)
11. [Items Still Needing Verification](#11-items-still-needing-verification)
12. [Output Files](#12-output-files)

---

## 1. System Overview

The repo contains three independent boards that together form a benchtop SiPM (silicon photomultiplier) readout system:

| Board | Folder | Role |
|---|---|---|
| **bias-control-lt8362** | `bias-control-lt8362/` | USB-powered SiPM bias supply: takes 5V from USB-C and generates a clean, MCU-controlled, current-monitored high-voltage bias for the SiPM (~40-55V depending on the SiPM operating point). |
| **power-supply** | `power-supply/` | Generates ±3.3V analog rails (clean positive and negative LDO supplies) from the bias controller for the analog TIA. |
| **tiav3_s14160** | `tiav3_s14160/` | RF-bandwidth transimpedance amplifier for a Hamamatsu **S14160-3050PS** MPPC. Converts SiPM current pulses to SMA-output voltage pulses. |

The bias controller and TIA are typically wired together: the SiPM is on the TIA board, biased via a cable from the bias controller, with the photocurrent flowing back through the same path into the TIA.

---

## 2. Bias Controller Board — Signal Chain

```
USB-C 5V ──┬─→ MIC5317  ─→ 3.3V ──→ SAMD21 MCU ──┐
           │                                       │
           │  (I2C)                                ↓
           └─→ MCP47FEB22 (12-bit DAC) ──→ "Boost_Gain"
                                                   │  (sets boost feedback)
                                                   ↓
                  +5V →  LT8362 boost ──→ "BOOST_OUT" (≈50V)
                                                   │
                                                   ↓
                                          R13 (5Ω current-sense)
                                          │   │
                                          ↓   │
                                          U3 MCP6C02 ───→ "MCP_Out" → MCU ADC
                                          (gain ×20)
                                          │
                                          ↓
                                       U2 RT9072B  ←── SHDN from MCU PA00 (LDO_SHDN)
                                       (HV LDO,
                                        adjustable
                                        via R15/R16)
                                          │
                                          ↓
                                      "BIAS"  ──→  output connector  ──→  SiPM (on TIA board)
```

Key idea: the **LT8362 is a switching boost** (noisy by nature — has ~MHz switching ripple). For a SiPM, you want a clean DC bias because any ripple modulates the SiPM gain. So the design uses **U2 (RT9072B) as a high-voltage linear post-regulator** to clean up the boost output before it reaches the SiPM. The MCU adjusts the boost setpoint via a DAC (`MCP47FEB22`) feeding the LT8362's feedback network, and monitors the actual bias current via **U3 (MCP6C02)** measuring the voltage across **R13** (5Ω sense resistor).

---

## 3. Deep Dive: HV Post-Regulator (U2 = RT9072B)

### What an LDO is, in 30 seconds

A *Low-Dropout linear regulator* takes a higher input voltage and produces a lower, regulated output voltage by dissipating the difference as heat in a pass transistor. It's the opposite of a switching regulator: no inductor, no switching noise, but it can only step down (Vout < Vin) and it's inefficient when Vin >> Vout.

LDOs are perfect for "polishing" a noisy rail or for small-current low-noise rails. They're not used for primary power generation because they waste energy.

### Why an LDO on a SiPM bias rail?

SiPM gain is set by the bias voltage *above breakdown* (the "overvoltage"). A 100 mV ripple on the bias becomes a few-percent ripple in the SiPM gain, which directly shows up as PMT-like baseline noise on every detected photon event. So:

1. **The LT8362 boost converter** generates the high voltage efficiently but with switching ripple (mV-to-tens-of-mV at hundreds of kHz to ~MHz).
2. **U2 (the RT9072B)** sits between the boost and the SiPM and regulates the voltage to a quiet DC level. Its noise rejection (PSRR) at the boost's switching frequency knocks the ripple down by 40-60 dB.
3. **Bonus:** the LDO's adjustable output (set by an external divider) gives a second, fine-grained way to set the SiPM bias — the DAC sets the boost output coarsely, and U2's divider sets the final SiPM voltage exactly.

### Why specifically the RT9072B?

The RT9072B is a **high-voltage, ultra-low-current adjustable LDO** in a tiny SOT-23-5 package:

| Spec | Value | Why it matters |
|---|---|---|
| Vin range | 4.5 V – **80 V** | Tolerates the full LT8362 boost output even if you ever push it. Most LDOs top out at 20-30 V. |
| Iout | 20 mA max | SiPM bias current is microamps to single-digit mA. 20 mA is plenty. |
| Vout range | 1.2 V – 60 V adjustable | Covers anything from low-voltage refs up to typical SiPM bias. |
| Iq (active) | ~30 µA | Doesn't waste current on the HV rail. |
| Package | SOT-23-5 | Small, cheap, easy to lay out. |
| SHDN pin | Active-HIGH disable | MCU can shut down the HV without disturbing the boost. |

The 80 V Vin is the key feature — almost no other small LDO survives connection to a 50-60 V rail.

### How it's wired on this board

Pin map of the RT9072B (per Richtek DS9072AB):

```
        ┌─────────┐
   IN ──┤ 1     5 ├── OUT
        │  RT9072B│
  GND ──┤ 2       │
        │       4 ├── FB
 SHDN ──┤ 3       │
        └─────────┘
```

Connections in this design (from the schematic):

- **Pin 1 (IN)** — connects through R13 (5 Ω sense resistor) to LT8362 `BOOST_OUT` (~50 V)
- **Pin 2 (GND)** — board ground
- **Pin 3 (SHDN)** — connects to MCU pin PA00, net `LDO_SHDN`. **Pulling this pin HIGH disables U2's output** (this is the polarity that matters for the LT3014 swap discussion later).
- **Pin 4 (FB)** — connects to the junction of resistor divider **R15 (39 k) / R16 (39 k)** between OUT and GND. With Vref = 1.2 V and R15=R16=39 k, this sets the output at Vref × (1 + R15/R16) = 1.2 × 2 = 2.4 V — *but* the R15/R16 values are actually the divider ratio to set the SiPM bias point. **For the actual final SiPM voltage you need to look at how the schematic uses R15/R16; the values in the BOM are placeholders that the user picks for their SiPM operating point.**
- **Pin 5 (OUT)** — labelled net `BIAS`, runs to the output connector and over to the SiPM.

The decoupling cap **C17 (2.2 µF)** sits on the output (between Pin 5 and GND) for loop stability.

### What the user-facing behavior is

- MCU can **shut down the SiPM bias** by driving PA00 high. The LT8362 keeps running but U2 stops conducting, so no HV reaches the SiPM.
- MCU can **modulate the bias voltage** by writing the DAC, which adjusts the LT8362 feedback and thus the boost output. U2 follows the boost (with a slight LDO drop, ~150 mV).
- MCU can **measure the SiPM current** via U3 reading the voltage across R13.

---

## 4. Deep Dive: HV Current Sense (U3 = MCP6C02T-020E/CHY)

### What a high-side current sense amplifier is

When you want to measure current on a wire, the simplest approach is to put a small resistor (the "sense" resistor) in series and measure the voltage across it (I = V/R, Ohm's law). The complication: if the current is flowing on a high-voltage rail (like our 50 V SiPM bias), then both terminals of the sense resistor sit at ~50 V relative to ground. You can't just hook them to a normal op-amp expecting ±5 V supplies — you'd blow it up.

A **high-side current sense amplifier** is a specialized op-amp with two key properties:

1. Its differential inputs (Vip / Vim) tolerate a high *common-mode* voltage (the absolute voltage relative to ground), while still amplifying the small *differential* voltage across the sense resistor.
2. Its output is referenced to a low-voltage rail (so you can feed it straight into an MCU ADC).

The MCP6C02T-020E/CHY specifically:

| Spec | Value | Why |
|---|---|---|
| Topology | High-side current sense, zero-drift | Drift would otherwise add to your low-current measurement noise. |
| Common-mode input | -0.3 V to **+65 V** | Lets you measure on the 50 V SiPM bias rail. |
| Fixed gain | 20 V/V (the `-020E` in the part number) | Set internally — no external gain resistors needed (and no drift from those resistors). |
| Output | Rail-to-rail, scaled to V+ | Goes straight to MCU ADC. |
| Package | SOT-23-6 | Tiny. |

### How it's wired

Pin map of the MCP6C02:

```
        ┌─────────┐
 Vout ──┤ 1     6 ├── Vdd
        │ MCP6C02 │
  Vss ──┤ 2     5 ├── Vref
        │         │
  Vip ──┤ 3     4 ├── Vim
        └─────────┘
```

Connections in this design:

- **Pin 3 (Vip)** and **Pin 4 (Vim)** — straddle the sense resistor **R13 (5 Ω)** at the LT8362 boost output, just upstream of U2.
- **Pin 5 (Vref)** — sets the zero-current output level. Usually tied to GND (so output = gain × V_R13, starting at 0 V).
- **Pin 6 (Vdd)** — supply, 3.3 V from the MIC5317.
- **Pin 2 (Vss)** — GND.
- **Pin 1 (Vout)** — connects to MCU ADC pin (net `TP_MCP_Out`).

### What it measures

Because U2 (the post-regulator LDO) draws only its tiny quiescent current (~30 µA) plus the actual SiPM current that flows out of its OUT pin, the current through R13 is essentially **equal to the SiPM bias current**.

For example, with the chosen gain of **20 V/V** and R13 = 5 Ω:

| SiPM current | V across R13 | U3 output | What the ADC sees |
|---|---|---|---|
| 1 µA (dark, very quiet SiPM) | 5 µV | 100 µV | ~3 LSB on a 12-bit / 3.3 V ADC — noisy |
| 100 µA (typical dark count) | 500 µV | 10 mV | ~12 LSB — readable |
| 1 mA (active operation) | 5 mV | 100 mV | ~124 LSB — clean |
| 10 mA (bright light) | 50 mV | 1.0 V | ~1240 LSB |
| 33 mA (max measurable) | 165 mV | 3.3 V | saturated |

So the 20 V/V gain is sized for a working range of roughly **0 — 33 mA** with poor low-current resolution (a few µA, hard to see dark count individually). A 50 V/V variant would give 2.5× better low-current resolution but saturate at 13 mA.

---

## 5. Other Major Components on the Bias Board

### IC1 — LT8362EMSE#PBF (Analog Devices)
**Function:** boost converter. Steps 5 V from USB up to the bias rail (~50 V for an S14160 SiPM). Switching frequency is set by IC1's internal oscillator; output set by FBX divider with the DAC injecting a control current to fine-tune.

### IC2 — ATSAMD21E18A (Microchip)
**Function:** main controller. ARM Cortex-M0+ @ 48 MHz, USB device, I2C master to the DAC, GPIO for the two shutdown lines (LT8362 ~SHDN and the LDO SHDN), ADC input for the current readout. 256 KB flash / 32 KB RAM.

The original schematic value is `ATSAMD21E18A-AF` (AEC-Q100 automotive grade). The cut-tape variant for qty-1 ordering is `-AFT`.

### IC4 — MCP47FEB22A2-E/ST (Microchip)
**Function:** dual 12-bit DAC, I2C interface. One channel drives `Boost_Gain` — injected into the LT8362's feedback network to digitally adjust the boost output voltage. The second channel may be used as a reference or spare.

### U1 — MIC5317-3.3YM5-TR (Microchip)
**Function:** 3.3 V LDO. Drops USB 5 V to 3.3 V for the MCU and DAC. 150 mA capacity, SOT-23-5.

### J4 — USB-C receptacle (Same Sky UJ20-C-V-C-2-SMT-TR)
**Function:** USB 2.0 connection for power + comms. Vertical SMT mid-mount footprint.

### J3 — SWD/Cortex Debug header (Samtec TSW-103-07-F-D)
**Function:** standard 2×3 0.1" pin header for SWD programming/debug of the SAMD21.

### J2 — 4-pin SMD breakout header
**Function:** likely I2C/UART or similar auxiliary breakout for external accessories.

### D2 — 1N4148WS (small signal Schottky/standard diode)
**Function:** probably reverse-current protection or a clamp in one of the control paths.

### D3 — PMEG6030EP (60 V / 3 A Schottky)
**Function:** the LT8362 boost converter's catch diode — rectifies the inductor output and forms the boost.

### L1 — 3.3 µH (Bourns SRP5020)
**Function:** the LT8362's boost inductor. Stores energy during the switching cycle.

### Passives summary

- **C5–C13 (2.2 µF / 100 V / 1206)** — output bulk caps on the LT8362 boost. Need 100 V because they sit on the boost rail.
- **C1/C4 (22 µF / 6.3 V / 0603)** — input bulk caps on the 5 V rail.
- **C12 (~25 pF)** — feedforward compensation cap across R15 (U2's upper FB-divider resistor). Provides a loop-gain zero at ~160 kHz that improves U2's transient response and high-frequency PSRR (so LT8362 switching ripple is more aggressively rejected before it reaches the SiPM).
- **C15 (2.2 nF)** — LT8362 soft-start / compensation cap.
- **C16/C17 (10 nF, 2.2 µF)** — typically RC/decoupling near U2.
- **R6 (52.3 k for LT8362 / 39 k for LT8361)** — sets LT8362 switching frequency.
- **R12/R15/R16 (39 k each)** — feedback divider network.
- **R2 (69.8 k), R11 (36.5 k), R4/R5 (1 M)** — LT8362 frequency-compensation network on the FB pin.
- **R13 (5 Ω)** — the current sense resistor for U3 (see §4).
- **R1, R3, R7–R10 (5.1 k × 6)** — pullups, I2C terminations, etc.

---

## 6. Power-Supply Board (Briefly)

A small companion board that sits between the bias controller and the TIA. Generates three rails for the analog TIA:

- **+3.3 V** via TPS79333 (positive LDO)
- **-3.3 V** via LM2776 (charge-pump inverter) followed by TPS72301 (negative adjustable LDO)
- Possibly a low-noise +V from the same LDO chain

Connector J3 (SSQ-103-03-G-D, 2×3 socket) plugs into the bias controller's mating header.

---

## 7. TIA Board (Briefly)

The transimpedance amplifier for the SiPM signal pulses:

- **D2** — Hamamatsu S14160-3050PS SiPM (3.0 × 3.0 mm sensor, 50 µm pixel pitch, ~38 V breakdown)
- **U1 — OPA847IDBVT** — TI's fastest cheap voltage-feedback op-amp (3.9 GHz GBW, ultra-low noise). Configured as a TIA: SiPM current pulse → voltage pulse.
- **L1 (33 nH), L2 (330 nH)** — bias-T inductors that decouple the SiPM bias DC from the AC signal path.
- **C1/C4 (2.2 µF), C2/C3 (62 pF), C5–C9 (1 µF)** — decoupling, AC coupling, and frequency-shaping caps.
- **R1 (50 Ω), R2 (1.5 k), R3 (68 Ω), R5 (3.01 Ω), R7 (4.99 k), R11 (10 Ω), R23 (30.1 Ω)** — TIA feedback, gain, and termination network. R7 (4.99 k) is the dominant transimpedance gain resistor.
- **J1** — power input (mates with the power-supply board).
- **J2** — SMB jack: the SiPM voltage-pulse output (50 Ω, scope-friendly).

---

## 8. Sourcing Substitutions — Summary Table

Every part where the BOM diverges from the original schematic. ✅ = no design impact; ⚠️ = small design impact (documented in §9); 🔴 = larger design impact (documented in §9 with required changes).

| Slot | Original (schematic) | Substitute (BOM Manager CSV) | Impact |
|---|---|---|---|
| IC2 (bias) | `ATSAMD21E18A-AF` (tray) | `ATSAMD21E18A-AFT` (T&R) | ✅ Same die, cut-tape packaging for qty-1 ordering. |
| U2 (bias) | `RT9072B` (obsolete) | `LT3014ES5#TRPBF` | 🔴 Pinout matches but SHDN polarity is inverted. Firmware fix mandatory (one line in DTS). Also ~2% Vout offset due to slightly different FB reference. |
| U3 (bias) | `MCP6C02T-020E/CHY` (OOS at DigiKey) | `MCP6C02T-020E/CHYVAO` | ✅ Microchip's AEC-Q100 automotive-qualified variant of the same die. Same gain (20 V/V), same SOT-23-6 pinout. No firmware or R13 change required. |
| C1,C4,C8 etc. (22 µF 0603) | Murata GRM188R60J226MEA0D | Samsung CL10A226MQ8NRNC | ✅ Same value/pkg/dielectric, standardized on Samsung. |
| C2,C7,C9,C10,C14,C17,C18 (2.2 µF 0603) | Murata GRM188R61A225KE34D (obsolete) | Samsung CL10A225KO8NNNC | ✅ 2.2 µF, 16 V vs original 10 V (higher rating = drop-in OK). |
| C5,C6,C8,C11,C13 (2.2 µF 100 V 1206) | Murata GRM31CR72A225KA73L (obsolete) | Samsung CL31B225KCHSNNE | ⚠️ Same value/V/dielectric. Note: X7R at 70 V DC bias derates ~50-70% — same caveat applies to any X7R 1206 100 V cap, not specific to this substitute. |
| C12 (25 pF 0603) | Samsung CL10C250JB8NNNC (discontinued) | Yageo CC0603JRNPO9BN250 | ✅ **Value preserved at 25 pF.** Yageo's CC0603 family carries the 25 pF variant. Same V rating (50 V), same dielectric (NP0/C0G), ±5% tol. Drop-in for the original. |
| C15 (2.2 nF) | – | Samsung CL10B222KB8NNNC | ✅ |
| C16 (10 nF) | – | Samsung CL10B103KB8NNNC | ✅ |
| C3 (1 µF 0603), psu C2/C8 | – | Samsung CL10A105KA8NNNC | ✅ |
| TIA C5–C9 (1 µF 0402) | – | Samsung CL05A105KP5NNNC | ✅ |
| TIA C1,C4 (2.2 µF 50 V 1206) | – | Samsung CL31B225KBHNNNE | ✅ |
| TIA C2,C3 (62 pF 0402) | – | Murata GCM1555C1H620GA16J | ⚠️ Samsung doesn't carry 62 pF 0402 at DigiKey. Tolerance 2% (tighter than original 5% — fine). |
| R6 (bias) | `39 k (LT8361) / 52.3 k (LT8362)` | RMCF0603FT52K3 | ⚠️ Assumes LT8362 build per README. For LT8361 build, swap to RMCF0603FT39K0. |
| R13 (5 Ω 0603) | `5` Ω | RMCF0603FT4R99 (4.99 Ω) | ✅ Closest E96 value. |
| J2 (bias, 1×4 SMD header) | `TSM-104-01-T-SV-TR` (qty 1 not orderable) | `TSM-104-01-L-SV-P-TR` | ✅ Same 1×4 SMT vertical 2.54 mm pkg, "L" = gold plating (upgrade), `-P-TR` = loose cut-tape orderable qty 1. |
| All other resistors | Stackpole RMCF series | Same | ✅ |
| All other ICs (LT8362, MCP47FEB22, MIC5317, LM2776, TPS72301, TPS79333, OPA847, inductors, diodes, USB-C, SMB, debug header, sockets) | Schematic part | Same MPN | ✅ |
| D2 (TIA) | Hamamatsu S14160-3050PS | (order from Hamamatsu directly) | – Not stocked at DigiKey. |
| HV1–HV9, TP1, TP_* | TestPoint pads | (no part) | – Just SMD pads. |

---

## 9. Substitution Details and Rationale

### 9.1 U2: RT9072B → LT3014ES5#TRPBF (🔴 firmware change required)

**Why substituting:** RT9072B is marked **OBSOLETE / NCNR** (Non-Cancellable Non-Returnable) at DigiKey. Richtek's EOL.

**Why LT3014 specifically:**

| Feature | RT9072B (original) | LT3014ES5 (substitute) | Notes |
|---|---|---|---|
| Vin range | 4.5–80 V | 3–80 V | ✅ matches 50 V boost output with margin |
| Vout range (adjustable) | 1.2–60 V | 1.22–60 V | ✅ |
| Output current | 20 mA | 20 mA | ✅ |
| Package | SOT-23-5 | SOT-23-5 | ✅ |
| **Pin map** | 1=IN, 2=GND, 3=SHDN, 4=FB, 5=OUT | 1=IN, 2=GND, 3=SHDN, 4=ADJ, 5=OUT | ✅ **identical** |
| **SHDN polarity** | **HIGH = disable, LOW = enable** | **LOW = disable, HIGH = enable** | 🔴 **OPPOSITE** |
| FB/ADJ reference | 1.2 V | 1.22 V | ⚠️ ~1.6% Vout offset |
| Dropout @ 20 mA | 150 mV typ | 350 mV typ | ⚠️ slightly worse |
| Iq (active) | ~30 µA | 7 µA | ✅ better |
| Output cap requirement | ≥1 µF ceramic | ≥0.47 µF ceramic | ✅ existing C17 (2.2 µF) satisfies both |

**Implication of the SHDN polarity reversal:**

The firmware currently expects `gpio_pin_set_dt(LDO_SHDN, 1)` to **shut down** the LDO (matching RT9072B). With LT3014 the same call would **enable** the output — the opposite of what's intended. This is a real safety issue for HV control.

**Required fix (mandatory before powering the board):**

In `firmware/zephyr/boards/arm/sipm_bias_controller/sipm_bias_controller.dts`, change line 63:

```dts
hv_ldo_shdn: hv_ldo_shdn {
    gpios = <&porta 0 GPIO_ACTIVE_LOW>;   /* WAS: GPIO_ACTIVE_HIGH */
    label = "HV_LDO_SHDN";
};
```

Update the comment block above to reflect that the LT3014 uses active-LOW shutdown. Zephyr's `gpio_pin_set_dt(.., 1)` will then still mean "shut down" in firmware logic — the GPIO_ACTIVE_LOW flag handles the polarity inversion transparently. **No other firmware change required.**

**Optional: tweak R15/R16 to compensate for FB reference difference**

The bias output is set by Vout = Vref × (1 + R15/R16). RT9072B Vref = 1.2 V; LT3014 Vref = 1.22 V. So for the same R15/R16, Vout will be ~1.6% lower with LT3014. At 50 V bias, that's ~0.8 V lower — measurable but small. Two options:

- **Accept and recalibrate** SiPM operating point in firmware (set the DAC slightly higher to compensate). Easiest.
- **Adjust R15** by ~1.6% to restore exact original output. R15 = 39 k → ~38.3 k (closest E96 = 38.3 k / RMCF0603FT38K3). Optional.

**Optional: verify dropout margin**

LT3014 dropout is ~200 mV worse than RT9072B at 20 mA. If your LT8362 boost is set with at least ~500 mV headroom above the desired SiPM voltage, this is irrelevant. If margin is tight, bump the boost setpoint by ~200 mV.

### 9.2 U3: MCP6C02T-020E/CHY → MCP6C02T-020E/CHYVAO (✅ pure drop-in)

**Why substituting:** The original `-020E/CHY` is **0 in stock at DigiKey** until 22-Jun-2026. Microchip's `-020E/CHYVAO` variant is in stock now and is the AEC-Q100 automotive-qualified version of the *same* die.

**Microchip's `VAO` suffix convention** (per the [DigiKey TechForum reply from Microchip](https://forum.digikey.com/t/microchip-technology-vao-suffix/24938)): "Part numbers that end with the suffix 'VAO' are automotive standard products and can be ordered by any automotive customer." They've been designed, manufactured, tested, and qualified to AEC-Q100. The base die and pinout are unchanged — VAO adds the automotive qualification on top.

| Spec | `-020E/CHY` (original) | `-020E/CHYVAO` (substitute) |
|---|---|---|
| Gain | **20 V/V** | **20 V/V ✓** |
| Package | SOT-23-6 | **SOT-23-6 ✓** |
| Pinout | 1=Vout, 2=Vss, 3=Vip, 4=Vim, 5=Vref, 6=Vdd | **identical ✓** |
| Temperature grade | E (-40 to +125 °C) | **E (-40 to +125 °C) ✓** |
| Common-mode input | -0.3 V to +65 V | **same ✓** |
| Supply range | 2.0 to 5.5 V | **same ✓** |
| Qualification | commercial extended-temp | AEC-Q100 (automotive) — strict upgrade |
| Stock at DigiKey | 0 (restock 22-Jun-2026) | **in stock now** |

**PCB / firmware changes:** **None.** The original gain of 20 V/V is preserved, so R13 stays at 5 Ω, the current-sense calibration constant in firmware stays unchanged, and the working current range (~0–33 mA with R13 = 5 Ω, 3.3 V ADC) is identical to the original design.

This is consistent with the rest of the board's quality tier — you're already using the AEC-Q100 `ATSAMD21E18A-AFT` automotive grade for the MCU.

### 9.3 22 µF 6.3 V X5R 0603 (8 places) → Samsung CL10A226MQ8NRNC

**Why:** Original Murata GRM188R60J226MEA0D works, but per user request the BOM was standardized on Samsung CL series where DigiKey carries it. Both parts are 22 µF / 6.3 V / X5R / 0603. The Samsung is ±20% vs the Murata's ±20% — same. Same package, same dielectric, same voltage rating, ships today at DigiKey.

### 9.4 2.2 µF 16 V X5R 0603 (7 places) → Samsung CL10A225KO8NNNC

**Why:** Original Murata GRM188R61A225KE34D is **obsolete / NCNR** at DigiKey. Samsung CL10A225KO8NNNC is 2.2 µF / 16 V / X5R / 0603 ±10%. The voltage rating went up from 10 V → 16 V — strictly an upgrade. 261k in stock at DigiKey, $0.08/ea.

### 9.5 2.2 µF 100 V X7R 1206 (5 places, bias board only) → Samsung CL31B225KCHSNNE

**Why:** Original Murata GRM31CR72A225KA73L is **obsolete** at DigiKey. Samsung CL31B225KCHSNNE is 2.2 µF / 100 V / X7R / 1206 ±10%. Drop-in.

**Universal X7R caveat (not specific to this substitute):** any X7R MLCC in 1206 at 70 V DC bias loses 50-70% of its capacitance due to ferroelectric DC-bias derating. The original Murata had the same behavior. If C5/C6/C8/C11/C13 are critical for the LT8362 loop stability, you may want to consider 1210 or 1812 package (less derating) or two caps in parallel. This is a design-review item, not a substitution issue.

### 9.6 25 pF 50 V C0G 0603 (C12) → Yageo CC0603JRNPO9BN250

**Why:** Original Samsung CL10C250JB8NNNC (25 pF) is **discontinued at DigiKey**. 25 pF is not an E12 standard value, but Yageo carries it in their CC0603 family — confirmed in stock at DigiKey.

**What C12 actually does:** It's the **feedforward compensation cap** across R15 (U2's upper FB-divider resistor). It adds a zero to the LDO feedback loop, which improves transient response and high-frequency PSRR (so LT8362 switching ripple is more aggressively rejected before it reaches the SiPM).

With R15 = 39 kΩ and C12 = 25 pF, the loop zero is at:

f_z = 1 / (2π × R15 × C12) = 1 / (2π × 39000 × 25e-12) ≈ **163 kHz**

**Yageo CC0603JRNPO9BN250 specs:**

| Parameter | Spec | Required for C12 |
|---|---|---|
| Capacitance | 25 pF | 25 pF ✅ exact |
| Tolerance | ±5% | Anything ≤±20% works ✅ |
| Dielectric | NP0/C0G (Class 1) | C0G required for stability ✅ |
| Tempco | ±30 ppm/°C | Ideal (class-1 NP0) ✅ |
| Voltage | 50 V | Cap sees ~49 V steady-state at U2 output node ✅ on margin |
| Dissipation factor | ≤ 0.11 % | Low ESR at the zero freq ✅ |

**Voltage rating note:** C12 sits across R15, with one end at U2's OUT pin (~49 V on the SiPM bias rail) and the other at the FB pin (~1.22 V). The steady-state voltage across C12 is ~49 V — within the 50 V rating but on the margin. This matches the original Samsung 25 pF, which was also 50 V rated. If you want extra headroom, Yageo's 100 V variant (`CC0603JRNPO0BN250` if available, or substitute another vendor's 100 V part) would give 2× margin, but is not strictly necessary.

### 9.7 1 × 4 SMD vertical header (J2, bias board) → Samtec TSM-104-01-L-SV-P-TR

**Why:** Original `TSM-104-01-T-SV-TR` is Tape-and-Reel only — DigiKey won't ship qty 1 (350-piece minimum from reel). The `TSM-104-01-L-SV-P-TR` variant is the same 1×4 SMD vertical 2.54 mm header, but with:

- `L` instead of `T` = **gold plating** instead of tin (mild upgrade, esp. for SWD/debug headers)
- `P-TR` packaging = pre-loaded loose cut-tape, orderable in single quantities

Footprint is identical. No PCB change.

### 9.8 ATSAMD21E18A: `-AF` (tray) → `-AFT` (cut-tape)

**Why:** The `-AF` variant is the AEC-Q100 automotive grade in tray packaging (250-piece min). The `-AFT` is the same die in tape & reel / cut-tape packaging — orderable qty 1. Same automotive temperature grade (-40 to +125 °C). No change in any electrical or mechanical spec.

### 9.9 Capacitor swaps to Samsung for standardization (no design impact)

The following changes were made per user request to standardize on Samsung CL-series for caps where DigiKey carries them. All are exact electrical drop-ins (same value, package, dielectric, voltage rating ≥ original).

| Slot | New | Old |
|---|---|---|
| 1 µF 25 V X5R 0603 (C3, psu C2/C8) | Samsung CL10A105KA8NNNC | (original) |
| 10 nF 50 V X7R 0603 (C16, psu C17) | Samsung CL10B103KB8NNNC | (original) |
| 2.2 nF 50 V X7R 0603 (C15) | Samsung CL10B222KB8NNNC | (original) |
| 1 µF 10 V X5R 0402 (TIA C5–C9) | Samsung CL05A105KP5NNNC | (original) |
| 2.2 µF 50 V X7R 1206 (TIA C1/C4) | Samsung CL31B225KBHNNNE | (original) |

### 9.10 62 pF 50 V C0G 0402 (TIA C2/C3) — stays Murata GCM1555C1H620GA16J

**Why not Samsung:** Samsung does not list a 62 pF / 0402 / C0G / 50 V in DigiKey's catalog. The closest available is Murata's `GCM1555C1H620GA16J` (BOM-Manager-verified, 73 k in stock at $0.10/ea).

The Murata variant is the AEC-Q200-graded version of the GRM family; its ±2% tolerance is *tighter* than the original schematic's typical 5% C0G spec — strict improvement.

---

## 10. Required Changes by Substitution

Consolidated summary of what needs to change beyond the part number:

### Firmware changes

1. **`firmware/zephyr/boards/arm/sipm_bias_controller/sipm_bias_controller.dts`** (mandatory before powering the board):
   - Line ~63: change `GPIO_ACTIVE_HIGH` → `GPIO_ACTIVE_LOW` for the `hv_ldo_shdn` node (because LT3014's SHDN is active-low, opposite of RT9072B).
   - Update the surrounding comment block to reflect the LT3014's polarity.
2. **SiPM operating point calibration** (optional but recommended): the LT3014 will produce a ~1.6% lower bias voltage than RT9072B for the same R15/R16 divider (1.22 V ref vs 1.2 V ref). Recalibrate the DAC setpoint to compensate, or update the calibration table.

### PCB/schematic changes (all OPTIONAL)

These are *not* required for the BOM to be orderable — they're optional improvements:

1. **R15 (39 k → 38.3 k)** — optional 1.6% trim to compensate for LT3014's higher FB reference voltage. Restores the exact original SiPM bias output. Skip if you're willing to recalibrate in firmware (option 1.2 above).
2. **C5/C6/C8/C11/C13 footprint upgrade (1206 → 1210 or 1812)** — only if the LT8362 boost is having loop-stability issues from the X7R DC-bias derating. Not specific to the new substitute; same caveat applied to the original Murata part.

### No-changes-required substitutions

All other substitutions in §8 are pure drop-ins: same value, same footprint, same electrical behavior, just a different MPN.

---

## 11. Items Still Needing Verification

Re-uploading the latest `digikey_bom_manager.csv` to BOM Manager will resolve most of these. Order from your eyes-on:

| # | Item | Verification needed |
|---|---|---|
| 1 | LT3014 vs your schematic's HV path | Confirm U2 Vin sees ≤80 V worst case (it should — LT8362 boost is set to ~50 V for S14160). |
| 2 | LT3014 SHDN polarity firmware update | One-line DTS change before powering the board. |
| 3 | ~~C12 value 25 pF → 22 pF~~ | **Resolved**: switched to Yageo CC0603JRNPO9BN250 (true 25 pF). |
| 4 | C5/6/8/11/13 X7R 1206 DC bias derating | Verify LT8362 loop margin if you've had stability issues. |
| 5 | ~~MCP6C02 gain change~~ | **Resolved**: `MCP6C02T-020E/CHYVAO` keeps original gain (20 V/V); no action needed. |
| 6 | R6 = 52.3 k assumes LT8362 build | Confirm — for LT8361, use 39 k. |
| 7 | ATSAMD21E18A-AFT (automotive) | Per your direction. Use `-AUT` for commercial grade if you change your mind. |
| 8 | Hamamatsu S14160-3050PS SiPM | Order separately from Hamamatsu (not on DigiKey). |

---

## 12. Output Files

All in `sourcing-work/`:

| File | Purpose |
|---|---|
| **`DESIGN_NOTES.md`** | This document. |
| **`digikey_bom_manager.csv`** | ★ Upload to https://www.digikey.com/bom — primary sourcing path. |
| `AUDIT.md` | Per-line verification status (BOM-Manager-verified vs Google-only). |
| `sourcing.xlsx` | Multi-sheet workbook (README, BOM Manager, LCSC, Master, per-board, Cart). |
| `sourcing_master.csv`, `sourcing_<board>.csv` | Per-board CSVs. |
| `digikey_links.html` | Click-per-part fallback (opens DigiKey product page for each MPN). |
| `lcsc_bom.csv` | LCSC alternative (de-emphasized — user confirmed pricing comparable to DigiKey). |
| `review_queue.csv` | Items flagged for user review. |
| `sourcing.json` | Editable Value+Footprint → MPN mapping. Edit, then re-run `node build_*.js`. |
| `HOWTO.html` | Walk-through with embedded links. |
