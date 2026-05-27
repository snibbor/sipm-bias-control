/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal MCP47FEB22 driver. Implemented as plain I2C transactions in app
 * space rather than a Zephyr device class because (a) only this app talks
 * to it and (b) there is no in-tree binding.
 *
 * Command byte format (MCP47FEB22 datasheet section 7.2):
 *   bit 7..3 = register address
 *   bit 2..1 = command (00=write, 01=read, 10=enable-config, 11=disable)
 *   bit 0    = reserved (0)
 *
 * Data word is 16 bits big-endian. For 12-bit DAC registers, the value
 * sits in bits 11..0 (the part right-justifies internally).
 *
 * Volatile register addresses used here:
 *   0x00 DAC0 output
 *   0x01 DAC1 output
 *   0x08 Vref select
 *   0x0A Gain/Status
 */

#include <zephyr/device.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/logging/log.h>
#include "mcp47feb22.h"

LOG_MODULE_REGISTER(mcp47feb22, LOG_LEVEL_INF);

/* DT node label set in board DTS. */
#define MCP_NODE DT_NODELABEL(mcp47feb22)

static const struct i2c_dt_spec dac_i2c = I2C_DT_SPEC_GET(MCP_NODE);

#define MCP_REG_DAC0      0x00
#define MCP_REG_DAC1      0x01
#define MCP_REG_VREF      0x08
#define MCP_REG_GAINSTAT  0x0A

#define MCP_CMD_WRITE     0x00 /* bits 2..1 */

/* Vref source per channel (2 bits each):
 *   0b00 = Vdd, 0b01 = floating, 0b10 = band-gap, 0b11 = band-gap buffered
 * Arduino setVref(1,1) -> we want the buffered band-gap on both channels.
 */
#define MCP_VREF_BOTH_INTERNAL  ((0x3 << 0) | (0x3 << 2))

/* Gain: 0 = 1x, 1 = 2x (per channel). Arduino setGain(0,0) -> 0. */
#define MCP_GAIN_BOTH_1X        0x00

static int mcp_write_reg(uint8_t reg, uint16_t value)
{
	uint8_t buf[3];

	buf[0] = (uint8_t)((reg << 3) | (MCP_CMD_WRITE << 1));
	buf[1] = (uint8_t)(value >> 8);
	buf[2] = (uint8_t)(value & 0xFF);

	return i2c_write_dt(&dac_i2c, buf, sizeof(buf));
}

int mcp47feb22_init(void)
{
	int rc;

	if (!device_is_ready(dac_i2c.bus)) {
		LOG_ERR("I2C bus %s not ready", dac_i2c.bus->name);
		return -ENODEV;
	}

	rc = mcp_write_reg(MCP_REG_VREF, MCP_VREF_BOTH_INTERNAL);
	if (rc) {
		LOG_ERR("VREF write failed: %d", rc);
		return rc;
	}

	rc = mcp_write_reg(MCP_REG_GAINSTAT, MCP_GAIN_BOTH_1X);
	if (rc) {
		LOG_ERR("GAIN write failed: %d", rc);
		return rc;
	}

	LOG_INF("MCP47FEB22 at 0x%02x ready", dac_i2c.addr);
	return 0;
}

int mcp47feb22_write(uint16_t dac0, uint16_t dac1)
{
	int rc;

	rc = mcp_write_reg(MCP_REG_DAC0, dac0 & 0x0FFF);
	if (rc) {
		return rc;
	}
	return mcp_write_reg(MCP_REG_DAC1, dac1 & 0x0FFF);
}
