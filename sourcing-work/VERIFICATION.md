# BOM Verification Report

Generated: 2026-05-27 15:07:14

## Summary

- **Total BOM lines** across 3 boards: 53
- **Lines included in DigiKey order**: 51
- **Lines excluded** (testpoints / off-DigiKey): 2
- **Quantity multiplier (BOARDS_TO_BUILD)**: 2
- **Total units in DigiKey order (per board × 2)**: 160
- **CSV total units**: 160 ✅
- **Unique line items in CSV**: 47
- **Issues flagged**: 1
- **MPN aggregation mismatches**: 0

## Per-board breakdown

### bias-control-lt8362
- 27 BOM lines, 58 units total
- 26 lines in DigiKey order (45 units)
- 1 lines excluded: HV1 HV2 HV3 HV4 HV5 HV6 HV9 TP1 TP_1.22V1 TP_BoostEnable1 TP_GND1 TP_GND2 TP_MCP_Out1 (TestPoint)

### power-supply
- 9 BOM lines, 14 units total
- 9 lines in DigiKey order (14 units)
- 0 lines excluded: none

### tiav3_s14160
- 17 BOM lines, 22 units total
- 16 lines in DigiKey order (21 units)
- 1 lines excluded: D2 (S14160-30)

## Issues

- **WARN**: bias-control-lt8362 | R6 | value=`39k (LT8361) / 52.3k (LT8362)` | footprint=`R_0603_1608Metric` | MPN=`RMCF0603FT52K3`
  - VALUE MISMATCH: schematic="39k (LT8361) / 52.3k (LT8362)" (=39000Ω) but MPN RMCF0603FT52K3 encodes 52300Ω

## MPN aggregation cross-check (BOM lines → CSV)

✅ **Every BOM line is accounted for in the CSV with the correct aggregate quantity.**

## Full BOM line-by-line

| Board | Refs | Qty | Schematic value | Footprint | Mfr | MPN | Confidence | In order? |
|---|---|---|---|---|---|---|---|---|
| bias-control-lt8362 | C2 C7 C9 C10 C14 C17 C18 | 7 | `2.2u` | `C_0603_1608Metric` | Samsung | `CL10A225KO8NNNC` | high | ✅ |
| bias-control-lt8362 | C5 C6 C8 C11 C13 | 5 | `2.2uF` | `C_1206_3216Metric` | Samsung | `CL31B225KCHSNNE` | review | ✅ |
| bias-control-lt8362 | C1 C4 | 2 | `22u` | `C_0603_1608Metric` | Samsung | `CL10A226MQ8NRNC` | high | ✅ |
| bias-control-lt8362 | C3 | 1 | `1u` | `C_0603_1608Metric` | Samsung | `CL10A105KA8NNNC` | high | ✅ |
| bias-control-lt8362 | C12 | 1 | `25pF` | `C_0603_1608Metric` | Yageo | `CC0603JRNPO9BN250` | review | ✅ |
| bias-control-lt8362 | C15 | 1 | `2.2n` | `C_0603_1608Metric` | Samsung | `CL10B222KB8NNNC` | high | ✅ |
| bias-control-lt8362 | C16 | 1 | `10n` | `C_0603_1608Metric` | Samsung | `CL10B103KB8NNNC` | high | ✅ |
| bias-control-lt8362 | R1 R3 R7 R8 R9 R10 | 6 | `5.1k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT5K10` | high | ✅ |
| bias-control-lt8362 | R12 R15 R16 | 3 | `39k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT39K0` | high | ✅ |
| bias-control-lt8362 | R4 R5 | 2 | `1M` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT1M00` | high | ✅ |
| bias-control-lt8362 | R2 | 1 | `69.8k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT69K8` | high | ✅ |
| bias-control-lt8362 | R6 | 1 | `39k (LT8361) / 52.3k (LT8362)` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT52K3` | high | ✅ |
| bias-control-lt8362 | R11 | 1 | `36.5k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT36K5` | high | ✅ |
| bias-control-lt8362 | R13 | 1 | `5` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT4R99` | medium | ✅ |
| bias-control-lt8362 | L1 | 1 | `3.3uH` | `SRP05204R7K` | Bourns | `SRP5020TA-3R3M` | high | ✅ |
| bias-control-lt8362 | D2 | 1 | `1N4148WS` | `D_SOD-323F` | Diodes Inc. | `1N4148WS-7-F` | high | ✅ |
| bias-control-lt8362 | D3 | 1 | `PMEG6030EP` | `D_SOD-128` | Nexperia | `PMEG6030EP,115` | medium | ✅ |
| bias-control-lt8362 | U1 | 1 | `MIC5317-3.3YM5-TR` | `MIC5317-3.3YM5-TR` | Microchip | `MIC5317-3.3YM5-TR` | high | ✅ |
| bias-control-lt8362 | U2 | 1 | `RT9072B` | `SOT-23-5` | Analog Devices | `LT3014ES5#TRPBF` | high | ✅ |
| bias-control-lt8362 | U3 | 1 | `MCP6C02T-020E/CHY` | `SOT-23-6` | Microchip | `MCP6C02T-020E/CHYVAO` | high | ✅ |
| bias-control-lt8362 | HV1 HV2 HV3 HV4 HV5 HV6 HV9 TP1 TP_1.22V1 TP_BoostEnable1 TP_GND1 TP_GND2 TP_MCP_Out1 | 13 | `TestPoint` | `TestPoint_Pad_D1.0mm` |  | `(none)` | skip | — skip |
| bias-control-lt8362 | IC1 | 1 | `LT8361EMSE/LT8362EMSE` | `LT8364IMSE-PBF` | Analog Devices | `LT8362EMSE#PBF` | high | ✅ |
| bias-control-lt8362 | IC2 | 1 | `ATSAMD21E18A-AF` | `ATSAMD21E18A-AF` | Microchip | `ATSAMD21E18A-AFT` | high | ✅ |
| bias-control-lt8362 | IC4 | 1 | `MCP47FEB22A2-E_ST` | `SOP65P640X120-8N` | Microchip | `MCP47FEB22A2-E/ST` | high | ✅ |
| bias-control-lt8362 | J2 | 1 | `Conn_01x04` | `PinHeader_1x04_P2.54mm_Vertical_SMD_Pin1Right` | Samtec | `TSM-104-01-L-SV-P-TR` | high | ✅ |
| bias-control-lt8362 | J3 | 1 | `Conn_01x06` | `PinHeader_2x03_P2.54mm_Vertical` | Samtec | `TSW-103-07-F-D` | high | ✅ |
| bias-control-lt8362 | J4 | 1 | `USB_C_Receptacle_USB2.0_16P` | `CUI_UJ20-C-V-C-2-SMT-TR_fixedV2` | Same Sky (CUI Devices) | `UJ20-C-V-C-3-SMT-TR` | high | ✅ |
| power-supply | C1 C3 C5 C6 C15 | 5 | `22u` | `C_0603_1608Metric` | Samsung | `CL10A226MQ8NRNC` | high | ✅ |
| power-supply | C2 C8 | 2 | `1u` | `C_0603_1608Metric` | Samsung | `CL10A105KA8NNNC` | high | ✅ |
| power-supply | C17 | 1 | `10n` | `C_0603_1608Metric` | Samsung | `CL10B103KB8NNNC` | high | ✅ |
| power-supply | R8 | 1 | `64.9k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT64K9` | high | ✅ |
| power-supply | R9 | 1 | `24.9k` | `R_0603_1608Metric` | Stackpole | `RMCF0603FT24K9` | high | ✅ |
| power-supply | U1 | 1 | `LM2776` | `LM2776DBVR` | Texas Instruments | `LM2776DBVR` | high | ✅ |
| power-supply | U3 | 1 | `TPS72301DBVR` | `TPS72301DBVR` | Texas Instruments | `TPS72301DBVR` | high | ✅ |
| power-supply | U5 | 1 | `TPS79333DBVR` | `TPS79333DBVR` | Texas Instruments | `TPS79333DBVR` | high | ✅ |
| power-supply | J3 | 1 | `SSQ-103-03-G-D` | `PinHeader_2x03_P2.54mm_Vertical` | Samtec | `SSQ-103-03-G-D` | high | ✅ |
| tiav3_s14160 | C5 C6 C7 C9 | 4 | `1u` | `C_0402_1005Metric` | Samsung | `CL05A105KP5NNNC` | review | ✅ |
| tiav3_s14160 | C1 C4 | 2 | `2.2u` | `C_1206_3216Metric` | Samsung | `CL31B225KBHNNNE` | high | ✅ |
| tiav3_s14160 | C2 C3 | 2 | `62pF` | `C_0402_1005Metric` | Murata | `GCM1555C1H620GA16J` | medium | ✅ |
| tiav3_s14160 | C8 | 1 | `22u` | `C_0603_1608Metric` | Samsung | `CL10A226MQ8NRNC` | high | ✅ |
| tiav3_s14160 | R1 | 1 | `50` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT49R9` | high | ✅ |
| tiav3_s14160 | R2 | 1 | `1.5k` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT1K50` | high | ✅ |
| tiav3_s14160 | R3 | 1 | `68` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT68R0` | high | ✅ |
| tiav3_s14160 | R5 | 1 | `3.0` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT3R01` | high | ✅ |
| tiav3_s14160 | R7 | 1 | `5k` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT4K99` | high | ✅ |
| tiav3_s14160 | R11 | 1 | `10` | `R_0402_1005Metric_Pad0.72x0.64mm_HandSolder` | Stackpole | `RMCF0402FT10R0` | high | ✅ |
| tiav3_s14160 | R23 | 1 | `30` | `R_0402_1005Metric` | Stackpole | `RMCF0402FT30R1` | high | ✅ |
| tiav3_s14160 | L1 | 1 | `33nH` | `L_0603_1608Metric_Pad1.05x0.95mm_HandSolder` | Murata | `LQW18AN33NJ00D` | high | ✅ |
| tiav3_s14160 | L2 | 1 | `330nH` | `L_0603_1608Metric` | Murata | `LQW18CAR33J00D` | high | ✅ |
| tiav3_s14160 | D2 | 1 | `S14160-30` | `S14160-30` | Hamamatsu | `S14160-3050PS` | supplier-elsewhere | 🏪 off-DK |
| tiav3_s14160 | U1 | 1 | `OPA847IDBVT` | `OPA847IDBVT` | Texas Instruments | `OPA847IDBVT` | high | ✅ |
| tiav3_s14160 | J1 | 1 | `SSQ-103-01-G-D` | `PinHeader_2x03_P2.54mm_Vertical` | Samtec | `SSQ-103-01-G-D` | high | ✅ |
| tiav3_s14160 | J2 | 1 | `Conn_Coaxial` | `SMB_Jack_Vertical` | Cinch / Johnson | `131-3701-261` | high | ✅ |
