# SPDX-License-Identifier: Apache-2.0
include(${ZEPHYR_BASE}/boards/common/bossac.board.cmake)
include(${ZEPHYR_BASE}/boards/common/openocd.board.cmake)
include(${ZEPHYR_BASE}/boards/common/jlink.board.cmake)
board_runner_args(jlink "--device=ATSAMD21E18" "--iface=SWD")
include(${ZEPHYR_BASE}/boards/common/probe-rs.board.cmake)
board_runner_args(probe-rs "--chip=ATSAMD21E18A")
set(SUPPORTED_RUNNERS bossac openocd jlink probe_rs)
