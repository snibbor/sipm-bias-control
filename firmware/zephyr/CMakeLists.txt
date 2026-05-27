# SPDX-License-Identifier: Apache-2.0
# SiPM Bias Controller firmware (Zephyr)
# Board: sipm_bias_controller (ATSAMD21E18A-AF)

cmake_minimum_required(VERSION 3.20.0)

list(APPEND BOARD_ROOT ${CMAKE_CURRENT_SOURCE_DIR})

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(sipm_bias_controller)

target_sources(app PRIVATE
  src/main.c
  src/bias.c
  src/mcp47feb22.c
)

target_include_directories(app PRIVATE include)
