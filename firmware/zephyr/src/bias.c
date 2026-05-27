/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * SiPM bias control core. Translates between user-facing units
 * (millivolts) and the underlying DAC DNs, drives the MCP47FEB22 for
 * gain/offset, drives the on-chip DAC on PA02 for the LT836X feedback,
 * and manages the boost/LDO enable lines.
 *
 * Voltage model is identical to the Arduino sketch
 * (firmware/LT836X/bias_with_offset_LT836X/bias_with_offset_LT836X.ino):
 *
 *   LT8361:  Vout(mV) = 1600 + ((1600/39000 + 1600/69800)
 *                              - dn*(3300/1024)/69800) * 1e6
 *   LT8362:  Vout(mV) = 1600 + ((1600/52300 + 1600/69800)
 *                              - dn*(3300/1024)/69800) * 1e6
 */

#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/dac.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/logging/log.h>
#include <zephyr/settings/settings.h>
#include <stdlib.h>
#include "bias.h"
#include "mcp47feb22.h"

LOG_MODULE_REGISTER(bias, LOG_LEVEL_INF);

#define BOOST_DAC_CHANNEL 0
#define BOOST_DAC_RESOLUTION 10  /* 10-bit, matches analogWriteResolution(10) */

static const struct device *boost_dac = DEVICE_DT_GET(DT_NODELABEL(dac0));
static const struct gpio_dt_spec hv_ldo_shdn =
	GPIO_DT_SPEC_GET(DT_NODELABEL(hv_ldo_shdn), gpios);
static const struct gpio_dt_spec boost_shdn =
	GPIO_DT_SPEC_GET(DT_NODELABEL(boost_shdn), gpios);

/* Defaults match the Arduino sketch's per-variant block. */
#if defined(CONFIG_BIAS_LT8361)
static uint16_t s_gain   = 3500;
static uint16_t s_g42    = 2538;
static uint16_t s_g50    = 3063;
static uint16_t s_offset = 220;
static uint16_t s_boost_dn = 130;  /* ~59.8 V on LT8361 */
#define BIAS_FB_R 39000
#define BIAS_OFFSET_INTERCEPT_UV 65548000
#elif defined(CONFIG_BIAS_LT8362)
static uint16_t s_gain   = 3500;
static uint16_t s_g42    = 3215;
static uint16_t s_g50    = 3870;
static uint16_t s_offset = 220;
static uint16_t s_boost_dn = 67;   /* ~52.3 V on LT8362 */
#define BIAS_FB_R 52300
#define BIAS_OFFSET_INTERCEPT_UV 55120000
#else
#error "Select a boost converter variant: CONFIG_BIAS_LT8361 or CONFIG_BIAS_LT8362"
#endif

static bool s_on = false;

/* --- voltage <-> DN helpers (linear interp on the gain DAC) --- */

uint32_t bias_gain_to_mv(uint16_t gain)
{
	return (((int32_t)gain - s_g42) * 8000
		+ 42000 * ((int32_t)s_g50 - s_g42))
		/ (s_g50 - s_g42);
}

uint16_t bias_mv_to_gain(uint32_t mv)
{
	return (((int32_t)s_g50 - s_g42) * ((int32_t)mv - 42000)
		+ s_g42 * 8000) / 8000;
}

float bias_boost_dn_to_v(uint16_t dn)
{
	float t = (1600.0f / (float)BIAS_FB_R + 1600.0f / 69800.0f)
		  - dn * (3300.0f / 1024.0f) / 69800.0f;
	return (1600.0f + t * 1000000.0f) / 1000.0f;
}

uint16_t bias_v_to_boost_dn(float v)
{
	float dn = (v * 1e6f - (float)BIAS_OFFSET_INTERCEPT_UV) / -46170.0f;
	if (dn < 0)    return 0;
	if (dn > 1023) return 1023;
	return (uint16_t)(dn + 0.5f);
}

/* --- DAC + GPIO --- */

static int push_bias_dac(void)
{
	/* MCP47FEB22 channel mapping matches Arduino sketch:
	 *   mcp.analogWrite(4095 - gain, offset);
	 * i.e. channel 0 carries (4095 - gain); channel 1 carries offset.
	 */
	return mcp47feb22_write((4095 - s_gain) & 0x0FFF, s_offset & 0x0FFF);
}

static int push_boost_dac(void)
{
	struct dac_channel_cfg cfg = {
		.channel_id = BOOST_DAC_CHANNEL,
		.resolution = BOOST_DAC_RESOLUTION,
		.buffered = false,
	};
	int rc = dac_channel_setup(boost_dac, &cfg);
	if (rc) {
		LOG_ERR("DAC setup failed: %d", rc);
		return rc;
	}
	return dac_write_value(boost_dac, BOOST_DAC_CHANNEL, s_boost_dn);
}

int bias_set_on(bool on)
{
	s_on = on;
	gpio_pin_set_dt(&boost_shdn, on ? 1 : 0);   /* active-low at silicon */
	gpio_pin_set_dt(&hv_ldo_shdn, on ? 0 : 1);  /* active-high disables */
	return 0;
}

bool bias_is_on(void) { return s_on; }

int bias_set_gain(uint16_t gain)
{
	if (gain > 4095) return -EINVAL;
	s_gain = gain;
	return push_bias_dac();
}

int bias_set_offset(uint16_t offset)
{
	if (offset > 4095) return -EINVAL;
	s_offset = offset;
	return push_bias_dac();
}

uint16_t bias_get_gain(void)   { return s_gain; }
uint16_t bias_get_offset(void) { return s_offset; }

int bias_set_boost_dn(uint16_t dn)
{
	if (dn > 1023) return -EINVAL;
	s_boost_dn = dn;
	return push_boost_dac();
}

uint16_t bias_get_boost_dn(void) { return s_boost_dn; }

int bias_set_calibration(uint16_t g42, uint16_t g50)
{
	if (g42 == g50) return -EINVAL;
	s_g42 = g42;
	s_g50 = g50;
	return 0;
}

void bias_get_calibration(uint16_t *g42, uint16_t *g50)
{
	if (g42) *g42 = s_g42;
	if (g50) *g50 = s_g50;
}

/* --- NVS persistence via settings subsystem --- */

#define CAL_KEY "bias/cal"

struct cal_blob {
	uint16_t offset;
	uint16_t g42;
	uint16_t g50;
};

static int cal_set_handler(const char *key, size_t len,
			   settings_read_cb read_cb, void *cb_arg)
{
	struct cal_blob blob;

	ARG_UNUSED(key);
	if (len != sizeof(blob)) return -EINVAL;

	int rc = read_cb(cb_arg, &blob, sizeof(blob));
	if (rc < 0) return rc;

	if (blob.offset <= 2000) s_offset = blob.offset;
	if (blob.g42 >= 20 && blob.g42 <= 4000) s_g42 = blob.g42;
	if (blob.g50 >= 20 && blob.g50 <= 4000) s_g50 = blob.g50;
	LOG_INF("Loaded cal: offset=%u g42=%u g50=%u", s_offset, s_g42, s_g50);
	return 0;
}

SETTINGS_STATIC_HANDLER_DEFINE(bias_cal, "bias", NULL, cal_set_handler,
			       NULL, NULL);

int bias_save(void)
{
	struct cal_blob blob = { .offset = s_offset, .g42 = s_g42, .g50 = s_g50 };
	return settings_save_one(CAL_KEY, &blob, sizeof(blob));
}

int bias_load(void)
{
	return settings_load_subtree("bias");
}

/* --- init --- */

int bias_init(void)
{
	int rc;

	if (!gpio_is_ready_dt(&hv_ldo_shdn) || !gpio_is_ready_dt(&boost_shdn)) {
		LOG_ERR("GPIOs not ready");
		return -ENODEV;
	}

	/* Default: shut down both rails until app raises bias_set_on. */
	gpio_pin_configure_dt(&hv_ldo_shdn, GPIO_OUTPUT_ACTIVE);   /* shut */
	gpio_pin_configure_dt(&boost_shdn, GPIO_OUTPUT_INACTIVE);  /* shut */

	if (!device_is_ready(boost_dac)) {
		LOG_ERR("DAC not ready");
		return -ENODEV;
	}

	rc = mcp47feb22_init();
	if (rc) {
		LOG_WRN("MCP47FEB22 init failed: %d (continuing)", rc);
	}

	rc = settings_subsys_init();
	if (rc) {
		LOG_WRN("settings init: %d", rc);
	} else {
		bias_load();
	}

	push_bias_dac();
	push_boost_dac();
	return 0;
}
