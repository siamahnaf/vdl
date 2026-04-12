#!/usr/bin/env bash

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

fail() {
  echo ""
  echo -e "  ${RED}${BOLD}✗ $1${RESET}"
  echo ""
  exit 1
}

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
  fail "Do not run this installer as root"
fi

# ─── Check & install dependencies ───────────────────────
echo -e "  ${BOLD}Checking dependencies...${RESET}"
echo ""

# --- Node.js ---
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node --version 2>/dev/null || echo "found")
  echo -e "  ${GREEN}✓${RESET} ${BOLD}Node.js${RESET} ${DIM}(${NODE_VER})${RESET}"
else
  echo -e "  ${RED}✗${RESET} ${BOLD}Node.js${RESET} not found"
  echo ""
  echo -e "  ${BOLD}Please install Node.js first:${RESET}"
  echo -e "    ${CYAN}https://nodejs.org${RESET}"
  echo ""
  echo -e "  ${DIM}Then re-run this installer.${RESET}"
  fail "Installation cancelled"
fi

# --- pip3 ---
if command -v pip3 >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${RESET} ${BOLD}Python${RESET} ${DIM}(available)${RESET}"
else
  echo -e "  ${RED}✗${RESET} ${BOLD}Python${RESET} not found"
  echo ""
  echo -e "  ${BOLD}Please install Python first:${RESET}"
  echo -e "    ${CYAN}https://python.org${RESET}"
  echo ""
  echo -e "  ${DIM}Then re-run this installer.${RESET}"
  fail "Installation cancelled"
fi

# --- Fix Python SSL certificates (common macOS issue) ---
if [ "$(uname)" = "Darwin" ]; then
  # macOS Python often lacks SSL certs — fix silently
  PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
  CERT_SCRIPT="/Applications/Python ${PYTHON_VER}/Install Certificates.command"

  if [ -f "$CERT_SCRIPT" ]; then
    bash "$CERT_SCRIPT" >/dev/null 2>&1 || true
  else
    pip3 install --upgrade certifi >/dev/null 2>&1 || true
  fi
fi

# --- yt-dlp (auto-install) ---
if command -v yt-dlp >/dev/null 2>&1; then
  YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "found")
  echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} ${DIM}(${YTDLP_VER})${RESET}"
else
  echo -e "  ${CYAN}↓${RESET} Installing yt-dlp..."

  if pip3 install yt-dlp >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} ${DIM}(installed)${RESET}"
  else
    fail "Could not install yt-dlp. Please try again."
  fi
fi

# --- ffmpeg ---
echo -e "  ${GREEN}✓${RESET} ${BOLD}ffmpeg${RESET} ${DIM}(included)${RESET}"

echo ""
echo -e "  ${GREEN}${BOLD}✓ All dependencies ready${RESET}"
echo ""

# ─── Download vdl ──────────────────────────────────────
echo -e "  ${CYAN}↓${RESET} Downloading vdl..."

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TARBALL_URL="https://codeload.github.com/${REPO}/tar.gz/refs/heads/main"

if ! curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP_DIR" 2>/dev/null; then
  fail "Download failed. Please check your internet connection."
fi

SRC_DIR="$TMP_DIR/vdl-main"

if [ ! -d "$SRC_DIR" ] || [ ! -f "$SRC_DIR/dist/index.js" ]; then
  fail "Download failed. Please try again."
fi

# ─── Install packages ─────────────────────────────────
echo -e "  ${CYAN}↓${RESET} Setting up..."

cd "$SRC_DIR"

if ! npm install --omit=dev --cache "$TMP_DIR/.npm-cache" >/dev/null 2>&1; then
  fail "Setup failed. Please try again."
fi

# ─── Copy to install location ──────────────────────────
echo -e "  ${CYAN}→${RESET} Installing..."

mkdir -p "$LIB_DIR" "$BIN_DIR"

rm -rf "$LIB_DIR"
mkdir -p "$LIB_DIR"

cp -r dist "$LIB_DIR/" 2>/dev/null || fail "Installation failed."
cp -r node_modules "$LIB_DIR/" 2>/dev/null || fail "Installation failed."
cp package.json "$LIB_DIR/" 2>/dev/null || fail "Installation failed."

cp bin/vdl "$BIN_DIR/vdl" 2>/dev/null || fail "Installation failed."
chmod 755 "$BIN_DIR/vdl"

# ─── PATH setup ─────────────────────────────────────────
echo ""

SHELL_NAME=$(basename "$SHELL")
RC_FILE=""

case "$SHELL_NAME" in
  zsh)  RC_FILE="$HOME/.zshrc" ;;
  bash) RC_FILE="$HOME/.bashrc" ;;
esac

if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  if [ -n "$RC_FILE" ]; then
    if ! grep -qF '.local/bin' "$RC_FILE" 2>/dev/null; then
      echo "" >> "$RC_FILE"
      echo "# Added by vdl installer" >> "$RC_FILE"
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC_FILE"
    fi
  fi
fi

echo -e "  ${GREEN}${BOLD}✓ vdl installed successfully!${RESET}"
echo ""

if command -v vdl >/dev/null 2>&1; then
  echo -e "  ${DIM}Run ${RESET}${CYAN}${BOLD}vdl${RESET}${DIM} to get started.${RESET}"
else
  echo -e "  ${DIM}Restart your terminal, then run ${RESET}${CYAN}${BOLD}vdl${RESET}${DIM} to get started.${RESET}"
fi

echo ""
