#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

VERSION="1.0.0"
REPO="siamahnaf/vdl"
PREFIX="${PREFIX:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
LIB_DIR="$PREFIX/share/vdl"

# ─── Header ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╦  ╦╔╦╗╦  "
echo "  ╚╗╔╝ ║║║  "
echo "   ╚╝ ═╩╝╩═╝"
echo -e "${RESET}"
echo -e "  ${DIM}Video Downloader — Install v${VERSION}${RESET}"
echo -e "  ${DIM}$(printf '─%.0s' {1..40})${RESET}"
echo ""

# ─── Refuse root ────────────────────────────────────────
if [ "$(id -u)" -eq 0 ] && [ -z "${CONTAINER:-}" ]; then
  echo -e "  ${RED}${BOLD}✗${RESET} ${RED}Do not run this installer as root${RESET}"
  exit 1
fi

# ─── Check & install dependencies ───────────────────────
echo -e "  ${BOLD}Checking dependencies...${RESET}"
echo ""

# --- Node.js (required — cannot auto-install) ---
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node --version 2>/dev/null || echo "found")
  echo -e "  ${GREEN}✓${RESET} ${BOLD}node${RESET} ${DIM}(${NODE_VER})${RESET}"
else
  echo -e "  ${RED}✗ node${RESET} not found"
  echo ""
  echo -e "  ${RED}${BOLD}Node.js is required:${RESET}"
  echo -e "    ${YELLOW}https://nodejs.org${RESET}  ${DIM}(download & install)${RESET}"
  echo ""
  echo -e "  ${DIM}After installing Node.js, re-run this installer.${RESET}"
  echo ""
  exit 1
fi

# --- pip3 (needed for yt-dlp) ---
if command -v pip3 >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${RESET} ${BOLD}pip3${RESET} ${DIM}(available)${RESET}"
else
  echo -e "  ${RED}✗ pip3${RESET} not found"
  echo ""
  echo -e "  ${RED}${BOLD}Python pip3 is required to install yt-dlp:${RESET}"
  echo -e "    ${YELLOW}python3 -m ensurepip${RESET}  ${DIM}(enable pip)${RESET}"
  echo ""
  exit 1
fi

# --- yt-dlp (auto-install via pip3) ---
if command -v yt-dlp >/dev/null 2>&1; then
  YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "found")
  echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} ${DIM}(${YTDLP_VER})${RESET}"
else
  echo -e "  ${YELLOW}⚠${RESET} ${BOLD}yt-dlp${RESET} not found — installing via pip3..."
  echo -e "    ${CYAN}↓${RESET} ${DIM}pip3 install yt-dlp${RESET}"

  if pip3 install yt-dlp 2>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} installed"
  else
    echo -e "  ${RED}✗${RESET} Failed to install yt-dlp"
    echo -e "    ${DIM}Try manually:${RESET} ${YELLOW}pip3 install yt-dlp${RESET}"
    exit 1
  fi
fi

# --- ffmpeg (bundled via npm — no system install needed) ---
echo -e "  ${GREEN}✓${RESET} ${BOLD}ffmpeg${RESET} ${DIM}(bundled via npm)${RESET}"

echo ""
echo -e "  ${GREEN}${BOLD}✓ All dependencies ready${RESET}"
echo ""

# ─── Download vdl ──────────────────────────────────────
echo -e "  ${CYAN}↓${RESET} Downloading vdl..."

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TARBALL_URL="https://codeload.github.com/${REPO}/tar.gz/refs/heads/main"
curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP_DIR" 2>/dev/null

SRC_DIR="$TMP_DIR/vdl-main"

if [ ! -d "$SRC_DIR" ]; then
  echo -e "  ${RED}✗ Failed to download. Check your internet connection.${RESET}"
  exit 1
fi

# ─── Install npm packages (includes ffmpeg-static) ─────
echo -e "  ${CYAN}↓${RESET} Installing packages..."

cd "$SRC_DIR"
npm install --silent 2>/dev/null

# ─── Build ──────────────────────────────────────────────
echo -e "  ${CYAN}⟳${RESET} Building..."

npm run build --silent 2>/dev/null

# Remove devDependencies after build (no longer needed)
npm prune --production --silent 2>/dev/null

# ─── Copy to install location ──────────────────────────
echo -e "  ${CYAN}→${RESET} Installing to ${DIM}${LIB_DIR}${RESET}"

mkdir -p "$LIB_DIR" "$BIN_DIR"

# Clean previous install
rm -rf "$LIB_DIR"
mkdir -p "$LIB_DIR"

# Copy built app + node_modules + package.json
cp -r dist "$LIB_DIR/"
cp -r node_modules "$LIB_DIR/"
cp package.json "$LIB_DIR/"

# Install bin shim
cp bin/vdl "$BIN_DIR/vdl"
chmod 755 "$BIN_DIR/vdl"

# ─── PATH check ────────────────────────────────────────
echo ""

if echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  echo -e "  ${GREEN}${BOLD}✓ vdl installed successfully!${RESET}"
else
  echo -e "  ${GREEN}${BOLD}✓ vdl installed successfully!${RESET}"
  echo ""
  echo -e "  ${YELLOW}⚠${RESET}  Add ${BOLD}${BIN_DIR}${RESET} to your PATH:"
  echo ""

  SHELL_NAME=$(basename "$SHELL")
  case "$SHELL_NAME" in
    zsh)
      echo -e "    ${DIM}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc${RESET}"
      echo -e "    ${DIM}source ~/.zshrc${RESET}"
      ;;
    bash)
      echo -e "    ${DIM}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc${RESET}"
      echo -e "    ${DIM}source ~/.bashrc${RESET}"
      ;;
    *)
      echo -e "    ${DIM}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
      ;;
  esac
fi

echo ""
echo -e "  ${DIM}Run ${RESET}${CYAN}${BOLD}vdl${RESET}${DIM} to get started.${RESET}"
echo ""
