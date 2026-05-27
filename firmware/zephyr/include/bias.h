/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * SiPM bias control core. Owns the gain/offset DAC state, the LT836X
 * boost-converter DAC setpoint, calibration coefficients, and the
 * boost/LDO enable lines. The shell commands in main.c are thin
 * wrappers over this API.
 */

#ifndef BIAS_H_
#define BIAS_H_

#include <stdbool.h>
#include <stdint.h>

/* Initialize DAC, MCP47FEB22, GPIOs, load calibration from NVS. */
int bias_init(void);

/* Boost converter + HV LDO enable. */
int bias_set_on(bool on);
bool bias_is_on(void);

/* Bias DAC channels (raw DN). gain ranges 0..4095; offset 0..2047. */
int bias_set_gain(uint16_t gain);
int bias_set_offset(uint16_t offset);
uint16_t bias_get_gain(void);
uint16_t bias_get_offset(void);

/* LT836X feedback DAC. dn=0..1023, lower dn -> higher boost voltage. */
int bias_set_boost_dn(uint16_t dn);
uint16_t bias_get_boost_dn(void);

/* Voltage helpers (linear interpolation between g42 and g50). */
uint32_t bias_gain_to_mv(uint16_t gain);
uint16_t bias_mv_to_gain(uint32_t mv);
float bias_boost_dn_to_v(uint16_t dn);
uint16_t bias_v_to_boost_dn(float v);

/* Calibration: stores the gain DN measured at 42 V and 50 V. */
int bias_set_calibration(uint16_t g42, uint16_t g50);
void bias_get_calibration(uint16_t *g42, uint16_t *g50);

/* Persist / recall to NVS. */
int bias_save(void);
int bias_load(void);

#endif /* BIAS_H_ */
