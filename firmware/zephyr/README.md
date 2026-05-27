# SiPM Bias Controller (Zephyr)

Zephyr RTOS port of the SiPM bias controller firmware originally written as the
[`bias_with_offset_LT836X.ino`](../LT836X/bias_with_offset_LT836X/bias_with_offset_LT836X.ino)
Arduino sketch. Targets the `bias_generator_LT8362` PCB (ATSAMD21E18A-AF).

This port mirrors the pattern of [`amp-motion-controller/fw/zephyr`](../../../amp-motion-controller/fw/zephyr):
USB CDC-ACM shell for commands, MCUboot DFU for field updates.

## Directory structure

| Path | Description |
|------|-------------|
| `src/` | Application: `main.c`, `bias.c`, `mcp47feb22.c` |
| `include/` | Headers: `bias.h`, `mcp47feb22.h` |
| `boards/arm/sipm_bias_controller/` | Board definition, DTS, pinout |
| `sysbuild/mcuboot/` | MCUboot bootloader configuration |
| `prj.conf` | App Kconfig (shell, USB, I2C, DAC, NVS, MCUboot app support) |

## Commands

| Command | Description |
|---------|-------------|
| **on** / **off** | Enable/disable boost converter and HV LDO |
| **gain** &lt;dn&gt; | Set DAC gain DN \[0-4095\] |
| **offset** &lt;dn&gt; | Set DAC offset DN \[0-2047\] |
| **voltage** &lt;V&gt; | Set bias voltage in volts (requires calibration) |
| **millivolts** &lt;mV&gt; | Set bias voltage in millivolts |
| **offset_voltage** &lt;mV&gt; | Set offset voltage in mV |
| **boost** &lt;dn&gt; | Set LT836X feedback DAC DN \[0-1023\] |
| **boost_voltage** &lt;V&gt; | Set LT836X boost output voltage \[6-65\] V |
| **calibration first \| second** &lt;V&gt; | Two-step calibration |
| **read_rom** / **write_rom** | Recall/store calibration to NVS |
| **status** | Print device status |
| **dfu** | Reboot into MCUboot DFU recovery |

## Flash layout (MCUboot overwrite-only, 256 KiB)

| Partition | Offset | Size |
|-----------|--------|------|
| mcuboot | 0x00000 | 48 KiB |
| slot0 (app) | 0x0C000 | 100 KiB |
| slot1 (DFU staging) | 0x25000 | 100 KiB |
| storage (NVS) | 0x3E000 | 8 KiB |

## Build and flash

```bash
source ~/zephyrproject/zephyr/zephyr-env.sh
west build -b sipm_bias_controller --sysbuild -p always . -- -DBOARD_ROOT=$(pwd)
west flash -d build
```

**Important:** the original board ships with the Adafruit Trinket M0 UF2
bootloader. Switching to Zephyr/MCUboot requires a one-time SWD reflash —
the UF2 bootloader and MCUboot cannot coexist. Use the existing
[`firmware/bootloader/openocd.cfg`](../bootloader/Readme.md) flow with an
ST-Link, but replace `bootloader.bin` with the MCUboot+app image produced
by sysbuild.

## DFU

```
dfu          # in app shell, reboots to recovery
```

```bash
smpmgr --port COM3 image upload build/sipm_bias_controller/zephyr/zephyr.signed.bin
smpmgr --port COM3 os reset
```

## Pin map (ATSAMD21E18A-AF, verified against bias_generator_LT8362.kicad_sch)

| MCU pin | Net | Function |
|---|---|---|
| PA00 | LDO_SHDN | HV LDO shutdown (active-high disables) |
| PA02 | Boost_Gain | DAC0 → LT836X feedback |
| PA08 | SDA | I2C SDA → MCP47FEB22 |
| PA09 | SCL | I2C SCL → MCP47FEB22 |
| PA10 | ~SHDN | LT836X boost shutdown (active-low disables) |
| PA24 | USB_DM | USB |
| PA25 | USB_DP | USB |
| PA28 | ~RESET | Reset |
| PA30 | SWCLK | Debug |
| PA31 | SWDIO | Debug |

## Configuration

Boost converter variant is selected via Kconfig (`prj.conf`):
- `CONFIG_BIAS_LT8361=y` — 100 V rated, R6=39 kΩ (default)
- `CONFIG_BIAS_LT8362=y` — 60 V rated, R6=52.3 kΩ
