/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal Microchip MCP47FEB22 12-bit dual nonvolatile DAC driver.
 * Used for the SiPM bias gain (channel 0) and TIA offset (channel 1).
 *
 * Datasheet: Microchip MCP47FEBxxA (DS20005374).
 */

#ifndef MCP47FEB22_H_
#define MCP47FEB22_H_

#include <stdint.h>

/* Initialize: probes the device, sets both channels to use the internal
 * 1.214 V band-gap reference (Vref = "internal"), gain = 1x.
 * Matches the Arduino sketch's setVref(1,1) + setGain(0,0).
 * Returns 0 on success, negative errno on failure.
 */
int mcp47feb22_init(void);

/* Write both DAC channels in one transaction equivalent (back-to-back
 * writes; the MCP47FEB22 has no atomic dual-update).
 *   dac0: 0..4095 (bias gain DN)
 *   dac1: 0..4095 (offset DN; firmware uses only 0..2047)
 */
int mcp47feb22_write(uint16_t dac0, uint16_t dac1);

#endif /* MCP47FEB22_H_ */
