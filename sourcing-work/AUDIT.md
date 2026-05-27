# Sourcing audit — schematic value → MPN → verification

**Legend:**
- ✅ `bom_manager_verified` — Real DK part with stock confirmed in user's BOM Manager upload
- 🟡 `google_verified` — Google snippet says active; not yet through BOM Manager
- ⚠️ `inferred` — Guessed from naming convention; needs DigiKey UI verification
- ❌ `bom_manager_failed` — Will be re-substituted

| Board | Refs | Qty | Schematic Value | Schematic Footprint | Picked MPN | Mfr | Status | Note |
|---|---|---|---|---|---|---|---|---|
| bias-control-lt8362 | C2 C7 C9 C10 C14 C17 C18 | 7 | `2.2u` | `C_0603_1608Metric` | `CL10A225KO8NNNC` | Samsung | 🟡 google_verified | Samsung 2.2µF 16V X5R 0603 ±10%. $0.08 ea per Google snippet. Replaces failed CL10A225KO5LNNC. |
| bias-control-lt8362 | C5 C6 C8 C11 C13 | 5 | `2.2uF` | `C_1206_3216Metric` | `CL31B225KCHSNNE` | Samsung | 🟡 google_verified | Samsung 2.2µF 100V X7R 1206 ±10%. Google confirmed active. |
| bias-control-lt8362 | C1 C4 | 2 | `22u` | `C_0603_1608Metric` | `CL10A226MQ8NRNC` | Samsung | 🟡 google_verified | Samsung 22µF 6.3V X5R 0603 ±20%. Google confirmed active. |
| bias-control-lt8362 | C3 | 1 | `1u` | `C_0603_1608Metric` | `CL10A105KA8NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1102-1-ND) |
| bias-control-lt8362 | C12 | 1 | `25pF` | `C_0603_1608Metric` | `CC0603JRNPO9BN250` | Yageo | 🟡 google_verified | Yageo 25pF 50V C0G/NP0 0603 ±5%. Value-preserving substitute for the discontinued Samsung CL10C250JB8NNNC at C12. |
| bias-control-lt8362 | C15 | 1 | `2.2n` | `C_0603_1608Metric` | `CL10B222KB8NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1110-1-ND) |
| bias-control-lt8362 | C16 | 1 | `10n` | `C_0603_1608Metric` | `CL10B103KB8NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1009-1-ND) |
| bias-control-lt8362 | R1 R3 R7 R8 R9 R10 | 6 | `5.1k` | `R_0603_1608Metric` | `RMCF0603FT5K10` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R12 R15 R16 | 3 | `39k` | `R_0603_1608Metric` | `RMCF0603FT39K0` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R4 R5 | 2 | `1M` | `R_0603_1608Metric` | `RMCF0603FT1M00` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R2 | 1 | `69.8k` | `R_0603_1608Metric` | `RMCF0603FT69K8` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R6 | 1 | `39k (LT8361) / 52.3k (LT8362)` | `R_0603_1608Metric` | `RMCF0603FT52K3` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R11 | 1 | `36.5k` | `R_0603_1608Metric` | `RMCF0603FT36K5` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | R13 | 1 | `5` | `R_0603_1608Metric` | `RMCF0603FT4R99` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| bias-control-lt8362 | L1 | 1 | `3.3uH` | `SRP05204R7K` | `SRP5020TA-3R3M` | Bourns | ✅ bom_manager_verified | $1.02 ea |
| bias-control-lt8362 | D2 | 1 | `1N4148WS` | `D_SOD-323F` | `1N4148WS-7-F` | Diodes Inc. | ✅ bom_manager_verified | $0.16 ea |
| bias-control-lt8362 | D3 | 1 | `PMEG6030EP` | `D_SOD-128` | `PMEG6030EP,115` | Nexperia | ✅ bom_manager_verified | $0.73 ea |
| bias-control-lt8362 | U1 | 1 | `MIC5317-3.3YM5-TR` | `MIC5317-3.3YM5-TR` | `MIC5317-3.3YM5-TR` | Microchip | ✅ bom_manager_verified | $0.12 ea |
| bias-control-lt8362 | U2 | 1 | `RT9072B` | `SOT-23-5` | `LT3014ES5#TRPBF` | Analog Devices | 🟡 google_verified | ADI adjustable LDO, 80V Vin, 20mA, SOT-23-5. TRUE drop-in for RT9072B: same pinout (1=IN, 2=GND, 3=SHDN, 4=ADJ, 5=OUT), same 1.22V FB reference. Required because U2 sits in the HV bias path (Vin sees ~70V from boost). No PCB/schematic changes needed. |
| bias-control-lt8362 | U3 | 1 | `MCP6C02T-020E/CHY` | `SOT-23-6` | `MCP6C02T-020E/CHYVAO` | Microchip | 🟡 google_verified | AEC-Q100 automotive variant of MCP6C02T-020E/CHY (same die, same gain 20 V/V, same SOT-23-6 pinout). TRUE drop-in — no firmware or R13 change. Replaces the OOS bare /CHY variant. |
| bias-control-lt8362 | HV1,HV2,HV3,HV4,HV5,HV6,HV9,TP1,TP_1.22V1,TP_BoostEnable1,TP_GND1,TP_GND2,TP_MCP_Out1 |  | `TestPoint` | `TestPoint_Pad_D1.0mm` | `(no DK source)` |  | — skip |  |
| bias-control-lt8362 | IC1 | 1 | `LT8361EMSE/LT8362EMSE` | `LT8364IMSE-PBF` | `LT8362EMSE#PBF` | Analog Devices | ✅ bom_manager_verified | $6.36 ea (tube) |
| bias-control-lt8362 | IC2 | 1 | `ATSAMD21E18A-AF` | `ATSAMD21E18A-AF` | `ATSAMD21E18A-AFT` | Microchip | 🟡 google_verified | Per user request: AEC-Q100 automotive grade, T&R cut-tape. Same die as -AUT. |
| bias-control-lt8362 | IC4 | 1 | `MCP47FEB22A2-E_ST` | `SOP65P640X120-8N` | `MCP47FEB22A2-E/ST` | Microchip | ✅ bom_manager_verified | $3.24 ea (tube) |
| bias-control-lt8362 | J2 | 1 | `Conn_01x04` | `PinHeader_1x04_P2.54mm_Vertical_SMD_Pin1Right` | `TSM-104-01-L-SV-P-TR` | Samtec | 🟡 google_verified | Samtec 1×4 SMD vertical, P-TR loose tape (qty 1 orderable). "L" = gold plating. |
| bias-control-lt8362 | J3 | 1 | `Conn_01x06` | `PinHeader_2x03_P2.54mm_Vertical` | `TSW-103-07-F-D` | Samtec | ✅ bom_manager_verified | $0.32 ea (bag SAM10846-ND) |
| bias-control-lt8362 | J4 | 1 | `USB_C_Receptacle_USB2.0_16P` | `CUI_UJ20-C-V-C-2-SMT-TR_fixedV2` | `UJ20-C-V-C-2-SMT-TR` | Same Sky (CUI Devices) | ✅ bom_manager_verified | $0.95 ea, 1 expected 26-May-2026 |
| power-supply | C1 C3 C5 C6 C15 | 5 | `22u` | `C_0603_1608Metric` | `CL10A226MQ8NRNC` | Samsung | 🟡 google_verified | Samsung 22µF 6.3V X5R 0603 ±20%. Google confirmed active. |
| power-supply | C2 C8 | 2 | `1u` | `C_0603_1608Metric` | `CL10A105KA8NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1102-1-ND) |
| power-supply | C17 | 1 | `10n` | `C_0603_1608Metric` | `CL10B103KB8NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1009-1-ND) |
| power-supply | R8 | 1 | `64.9k` | `R_0603_1608Metric` | `RMCF0603FT64K9` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| power-supply | R9 | 1 | `24.9k` | `R_0603_1608Metric` | `RMCF0603FT24K9` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| power-supply | U1 | 1 | `LM2776` | `LM2776DBVR` | `LM2776DBVR` | Texas Instruments | ✅ bom_manager_verified | $1.14 ea |
| power-supply | U3 | 1 | `TPS72301DBVR` | `TPS72301DBVR` | `TPS72301DBVR` | Texas Instruments | ✅ bom_manager_verified | $3.55 ea (296-27049-1-ND) |
| power-supply | U5 | 1 | `TPS79333DBVR` | `TPS79333DBVR` | `TPS79333DBVR` | Texas Instruments | ✅ bom_manager_verified | $0.34 ea |
| power-supply | J3 | 1 | `SSQ-103-03-G-D` | `PinHeader_2x03_P2.54mm_Vertical` | `SSQ-103-03-G-D` | Samtec | ✅ bom_manager_verified | $1.77 ea (Bulk SAM1196-03-ND) |
| tiav3_s14160 | C5 C6 C7 C9 | 4 | `1u` | `C_0402_1005Metric` | `CL05A105KP5NNNC` | Samsung | ✅ bom_manager_verified | $0.10 ea (1276-1076-1-ND) — earlier "OOS" claim was wrong |
| tiav3_s14160 | C1 C4 | 2 | `2.2u` | `C_1206_3216Metric` | `CL31B225KBHNNNE` | Samsung | ✅ bom_manager_verified | $0.22 ea (1276-1291-1-ND) |
| tiav3_s14160 | C2 C3 | 2 | `62pF` | `C_0402_1005Metric` | `GCM1555C1H620GA16J` | Murata | ✅ bom_manager_verified | $0.10 ea (490-GCM1555C1H620GA16JCT-ND) |
| tiav3_s14160 | C8 | 1 | `22u` | `C_0603_1608Metric` | `CL10A226MQ8NRNC` | Samsung | 🟡 google_verified | Samsung 22µF 6.3V X5R 0603 ±20%. Google confirmed active. |
| tiav3_s14160 | R1 | 1 | `50` | `R_0402_1005Metric` | `RMCF0402FT49R9` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | R2 | 1 | `1.5k` | `R_0402_1005Metric` | `RMCF0402FT1K50` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | R3 | 1 | `68` | `R_0402_1005Metric` | `RMCF0402FT68R0` | Stackpole | ✅ bom_manager_verified | $0.10 ea (738-RMCF0402FT68R0CT-ND) |
| tiav3_s14160 | R5 | 1 | `3.0` | `R_0402_1005Metric` | `RMCF0402FT3R01` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | R7 | 1 | `5k` | `R_0402_1005Metric` | `RMCF0402FT4K99` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | R11 | 1 | `10` | `R_0402_1005Metric_Pad0.72x0.64mm_HandSolder` | `RMCF0402FT10R0` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | R23 | 1 | `30` | `R_0402_1005Metric` | `RMCF0402FT30R1` | Stackpole | ✅ bom_manager_verified | $0.10 ea |
| tiav3_s14160 | L1 | 1 | `33nH` | `L_0603_1608Metric_Pad1.05x0.95mm_HandSolder` | `LQW18AN33NJ00D` | Murata | ✅ bom_manager_verified | $0.11 ea (490-1175-1-ND) |
| tiav3_s14160 | L2 | 1 | `330nH` | `L_0603_1608Metric` | `LQW18CAR33J00D` | Murata | ✅ bom_manager_verified | $0.43 ea (490-18181-1-ND) |
| tiav3_s14160 | D2 | 1 | `S14160-30` | `S14160-30` | `S14160-3050PS` | Hamamatsu | ❓ UNKNOWN | (not in verification table) |
| tiav3_s14160 | U1 | 1 | `OPA847IDBVT` | `OPA847IDBVT` | `OPA847IDBVT` | Texas Instruments | ✅ bom_manager_verified | $10.04 ea — TI price jump from old BOM |
| tiav3_s14160 | J1 | 1 | `SSQ-103-01-G-D` | `PinHeader_2x03_P2.54mm_Vertical` | `SSQ-103-01-G-D` | Samtec | ✅ bom_manager_verified | $1.64 ea (SAM1179-03-ND) |
| tiav3_s14160 | J2 | 1 | `Conn_Coaxial` | `SMB_Jack_Vertical` | `131-3701-261` | Cinch / Johnson | ✅ bom_manager_verified | $3.57 ea (J613-ND) |
