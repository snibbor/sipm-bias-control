/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * SiPM Bias Controller firmware (Zephyr).
 *
 * Ported from firmware/LT836X/bias_with_offset_LT836X/bias_with_offset_LT836X.ino.
 * Same command set, served over the USB CDC-ACM shell.
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/shell/shell.h>
#include <zephyr/sys/printk.h>
#include <zephyr/sys/reboot.h>
#include <zephyr/retention/bootmode.h>
#include <stdlib.h>
#include <stdio.h>

#include "bias.h"

#define VERSION "0.0.1"
static const char INFO[] = "SiPM Bias Controller v" VERSION " (Zephyr)";

/* --- on / off --- */

static int cmd_on(const struct shell *sh, size_t argc, char **argv)
{
	ARG_UNUSED(argc); ARG_UNUSED(argv);
	bias_set_on(true);
	shell_print(sh, "on");
	return 0;
}

static int cmd_off(const struct shell *sh, size_t argc, char **argv)
{
	ARG_UNUSED(argc); ARG_UNUSED(argv);
	bias_set_on(false);
	shell_print(sh, "off");
	return 0;
}

static int cmd_status(const struct shell *sh, size_t argc, char **argv)
{
	uint16_t g42, g50;
	bias_get_calibration(&g42, &g50);
	ARG_UNUSED(argc); ARG_UNUSED(argv);

	shell_print(sh, "%s", INFO);
#if defined(CONFIG_BIAS_LT8361)
	shell_print(sh, "Configured for: LT8361");
#else
	shell_print(sh, "Configured for: LT8362");
#endif
	shell_print(sh, "On: %s", bias_is_on() ? "true" : "false");
	shell_print(sh, "Gain: %u dn (%u mV)",
		    bias_get_gain(), bias_gain_to_mv(bias_get_gain()));
	shell_print(sh, "Offset: %u dn", bias_get_offset());
	shell_print(sh, "Boost DAC: %u dn (%.2f V)",
		    bias_get_boost_dn(),
		    (double)bias_boost_dn_to_v(bias_get_boost_dn()));
	shell_print(sh, "Calibration: 42V=%u, 50V=%u", g42, g50);
	return 0;
}

/* --- gain DN --- */

static int cmd_gain(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%u dn (%u mV)",
			    bias_get_gain(), bias_gain_to_mv(bias_get_gain()));
		return 0;
	}
	long v = strtol(argv[1], NULL, 10);
	if (v < 0 || v > 4095) {
		shell_error(sh, "gain out of range [0, 4095]");
		return -EINVAL;
	}
	bias_set_gain((uint16_t)v);
	shell_print(sh, "%ld dn (%u mV)", v, bias_gain_to_mv(v));
	return 0;
}

/* --- offset DN --- */

static int cmd_offset(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%u", bias_get_offset());
		return 0;
	}
	long v = strtol(argv[1], NULL, 10);
	if (v < 0 || v > 4095) {
		shell_error(sh, "offset out of range [0, 4095]");
		return -EINVAL;
	}
	bias_set_offset((uint16_t)v);
	shell_print(sh, "%ld", v);
	return 0;
}

/* --- voltage (volts) --- */

static int cmd_voltage(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%u mV", bias_gain_to_mv(bias_get_gain()));
		return 0;
	}
	long mv = strtol(argv[1], NULL, 10) * 1000;
	uint16_t g = bias_mv_to_gain(mv);
	bias_set_gain(g);
	shell_print(sh, "%u mV (gain=%u)", bias_gain_to_mv(g), g);
	return 0;
}

static int cmd_millivolts(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%u mV", bias_gain_to_mv(bias_get_gain()));
		return 0;
	}
	long mv = strtol(argv[1], NULL, 10);
	uint16_t g = bias_mv_to_gain(mv);
	bias_set_gain(g);
	shell_print(sh, "%u mV (gain=%u)", bias_gain_to_mv(g), g);
	return 0;
}

/* --- LT836X boost DAC --- */

static int cmd_boost(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%u dn (%.2f V)", bias_get_boost_dn(),
			    (double)bias_boost_dn_to_v(bias_get_boost_dn()));
		return 0;
	}
	long v = strtol(argv[1], NULL, 10);
	if (v < 0 || v > 1023) {
		shell_error(sh, "boost dn out of range [0, 1023]");
		return -EINVAL;
	}
	bias_set_boost_dn((uint16_t)v);
	shell_print(sh, "set boost DAC to %ld dn (%.2f V)", v,
		    (double)bias_boost_dn_to_v(v));
	return 0;
}

static int cmd_boost_voltage(const struct shell *sh, size_t argc, char **argv)
{
	if (argc < 2) {
		shell_print(sh, "%.2f V",
			    (double)bias_boost_dn_to_v(bias_get_boost_dn()));
		return 0;
	}
	long v = strtol(argv[1], NULL, 10);
	if (v < 6 || v > 65) {
		shell_error(sh, "boost voltage out of range [6, 65] V");
		return -EINVAL;
	}
	uint16_t dn = bias_v_to_boost_dn((float)v);
	bias_set_boost_dn(dn);
	shell_print(sh, "set boost to %u dn (%ld V)", dn, v);
	return 0;
}

/* --- calibration: two-shot to avoid shell-blocking reads --- */

static int cmd_calibration(const struct shell *sh, size_t argc, char **argv)
{
	uint16_t g42, g50;
	bias_get_calibration(&g42, &g50);

	if (argc < 2) {
		shell_print(sh, "Calibrated: 42V=%u dn, 50V=%u dn", g42, g50);
		shell_print(sh, "Usage:");
		shell_print(sh, "  calibration first  <measured_V>"
				" (run after gain DN = current g42)");
		shell_print(sh, "  calibration second <measured_V>"
				" (run after gain DN = current g50)");
		return 0;
	}

	bool first = (strcmp(argv[1], "first") == 0);
	bool second = (strcmp(argv[1], "second") == 0);
	if (!first && !second) {
		shell_error(sh, "Usage: calibration {first|second} <V>");
		return -EINVAL;
	}
	if (argc < 3) {
		shell_error(sh, "Missing measured voltage");
		return -EINVAL;
	}

	float measured = strtof(argv[2], NULL);
	if (first) {
		bias_set_gain(g42);
		bias_set_on(true);
		/* Stash measured voltage as new g42 anchor:
		 * we re-fit (slope, intercept) once both anchors are set.
		 * For the draft, simply nudge g42/g50 by the same ratio.
		 */
		float slope = (50.0f - measured) / (float)(g50 - g42);
		float intercept = measured - g42 * slope;
		uint16_t new_g42 = (uint16_t)((42.0f - intercept) / slope);
		bias_set_calibration(new_g42, g50);
		shell_print(sh, "first anchor: %.2f V at g42=%u -> g42:=%u",
			    (double)measured, g42, new_g42);
	} else {
		bias_set_gain(g50);
		bias_set_on(true);
		float slope = (measured - 42.0f) / (float)(g50 - g42);
		float intercept = measured - g50 * slope;
		uint16_t new_g50 = (uint16_t)((50.0f - intercept) / slope);
		bias_set_calibration(g42, new_g50);
		shell_print(sh, "second anchor: %.2f V at g50=%u -> g50:=%u",
			    (double)measured, g50, new_g50);
	}
	return 0;
}

/* --- ROM --- */

static int cmd_write_rom(const struct shell *sh, size_t argc, char **argv)
{
	ARG_UNUSED(argc); ARG_UNUSED(argv);
	int rc = bias_save();
	if (rc) {
		shell_error(sh, "save failed: %d", rc);
		return rc;
	}
	shell_print(sh, "OK");
	return 0;
}

static int cmd_read_rom(const struct shell *sh, size_t argc, char **argv)
{
	ARG_UNUSED(argc); ARG_UNUSED(argv);
	int rc = bias_load();
	if (rc) {
		shell_error(sh, "load failed: %d", rc);
		return rc;
	}
	shell_print(sh, "OK");
	return 0;
}

/* --- DFU --- */

static int cmd_dfu(const struct shell *sh, size_t argc, char **argv)
{
	ARG_UNUSED(argc); ARG_UNUSED(argv);
	shell_print(sh, "Rebooting into DFU mode...");
	int rc = bootmode_set(BOOT_MODE_TYPE_BOOTLOADER);
	if (rc) {
		shell_error(sh, "boot mode set failed: %d", rc);
		return rc;
	}
	sys_reboot(SYS_REBOOT_WARM);
	return 0;
}

SHELL_CMD_REGISTER(on,             NULL, "Enable boost + HV LDO",         cmd_on);
SHELL_CMD_REGISTER(off,            NULL, "Disable boost + HV LDO",        cmd_off);
SHELL_CMD_REGISTER(status,         NULL, "Print device status",           cmd_status);
SHELL_CMD_REGISTER(gain,           NULL, "Get/set gain DN [0..4095]",     cmd_gain);
SHELL_CMD_REGISTER(offset,         NULL, "Get/set offset DN [0..4095]",   cmd_offset);
SHELL_CMD_REGISTER(voltage,        NULL, "Get/set bias voltage in V",     cmd_voltage);
SHELL_CMD_REGISTER(millivolts,     NULL, "Get/set bias voltage in mV",    cmd_millivolts);
SHELL_CMD_REGISTER(boost,          NULL, "Get/set LT836X DAC DN [0..1023]", cmd_boost);
SHELL_CMD_REGISTER(boost_voltage,  NULL, "Get/set LT836X V [6..65]",      cmd_boost_voltage);
SHELL_CMD_REGISTER(calibration,    NULL, "calibration [first|second] <V>", cmd_calibration);
SHELL_CMD_REGISTER(write_rom,      NULL, "Save calibration to NVS",       cmd_write_rom);
SHELL_CMD_REGISTER(read_rom,       NULL, "Load calibration from NVS",     cmd_read_rom);
SHELL_CMD_REGISTER(dfu,            NULL, "Reboot into MCUboot recovery",  cmd_dfu);

int main(void)
{
	printk("%s\n", INFO);

	int rc = bias_init();
	if (rc) {
		printk("bias_init failed: %d\n", rc);
	} else {
		printk("Bias ready (off by default; use `on` to enable)\n");
	}

	while (1) {
		k_msleep(1000);
	}
}
