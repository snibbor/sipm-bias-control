/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board early init hook for sipm_bias_controller.
 *
 * MCUboot's scheduler may leave stale PendSV/SysTick pending bits that
 * cause a fault when the app enables interrupts. cleanup_arm_nvic() only
 * clears NVIC ICPR, not SCB system exception bits, so we clear them here.
 */

#include <soc.h>
#include <zephyr/init.h>

#ifdef CONFIG_BOARD_EARLY_INIT_HOOK
#include <zephyr/platform/hooks.h>
#include <cmsis_core.h>

void board_early_init_hook(void)
{
	SCB->ICSR = SCB_ICSR_PENDSVCLR_Msk | SCB_ICSR_PENDSTCLR_Msk;
}
#endif
