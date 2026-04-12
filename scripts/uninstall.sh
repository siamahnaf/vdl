#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

PREFIX="${PREFIX:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
LIB_DIR="$PREFIX/share/vdl"
CONFIG_DIR="$HOME/.config/vdl"

echo ""
echo -e "  ${CYAN}${BOLD}VDL Uninstaller${RESET}"
echo -e "  ${DIM}$(printf '─%.0s' {1..40})${RESET}"
echo ""

REMOVED=0

if [ -f "$BIN_DIR/vdl" ]; then
  rm -f "$BIN_DIR/vdl"
  echo -e "  ${GREEN}✓${RESET} Removed ${DIM}$BIN_DIR/vdl${RESET}"
  REMOVED=1
fi

if [ -d "$LIB_DIR" ]; then
  rm -rf "$LIB_DIR"
  echo -e "  ${GREEN}✓${RESET} Removed ${DIM}$LIB_DIR${RESET}"
  REMOVED=1
fi

if [ -d "$CONFIG_DIR" ]; then
  rm -rf "$CONFIG_DIR"
  echo -e "  ${GREEN}✓${RESET} Removed ${DIM}$CONFIG_DIR${RESET}"
  REMOVED=1
fi

if [ "$REMOVED" -eq 0 ]; then
  echo -e "  ${DIM}Nothing to remove — vdl is not installed.${RESET}"
else
  echo ""
  echo -e "  ${GREEN}${BOLD}✓ vdl uninstalled completely${RESET}"
fi

echo ""
