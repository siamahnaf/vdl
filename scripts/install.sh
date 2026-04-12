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
  if [ -n "${2:-}" ]; then
    echo -e "    ${DIM}$2${RESET}"
  fi
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
  echo -e "  ${GREEN}✓${RESET} ${BOLD}node${RESET} ${DIM}(${NODE_VER})${RESET}"
else
  fail "Node.js is required" "Install from https://nodejs.org then re-run this installer"
fi

# --- pip3 ---
if command -v pip3 >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${RESET} ${BOLD}pip3${RESET} ${DIM}(available)${RESET}"
else
  fail "Python pip3 is required" "Run: python3 -m ensurepip"
fi

# --- yt-dlp (auto-install via pip3) ---
if command -v yt-dlp >/dev/null 2>&1; then
  YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "found")
  echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} ${DIM}(${YTDLP_VER})${RESET}"
else
  echo -e "  ${YELLOW}⚠${RESET} ${BOLD}yt-dlp${RESET} not found — installing via pip3..."
  echo -e "    ${CYAN}↓${RESET} ${DIM}pip3 install yt-dlp${RESET}"

  if pip3 install yt-dlp; then
    echo -e "  ${GREEN}✓${RESET} ${BOLD}yt-dlp${RESET} installed"
  else
    fail "Failed to install yt-dlp" "Try manually: pip3 install yt-dlp"
  fi
fi

# --- ffmpeg ---
echo -e "  ${GREEN}✓${RESET} ${BOLD}ffmpeg${RESET} ${DIM}(bundled via npm)${RESET}"

echo ""
echo -e "  ${GREEN}${BOLD}✓ All dependencies ready${RESET}"
echo ""

# ─── Download vdl ──────────────────────────────────────
echo -e "  ${CYAN}↓${RESET} Downloading vdl..."

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TARBALL_URL="https://codeload.github.com/${REPO}/tar.gz/refs/heads/main"

if ! curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP_DIR"; then
  fail "Failed to download" "Check your internet connection"
fi

SRC_DIR="$TMP_DIR/vdl-main"

if [ ! -d "$SRC_DIR" ]; then
  fail "Failed to extract download" "The GitHub repo may not exist yet"
fi

# ─── Install npm packages ─────────────────────────────
echo -e "  ${CYAN}↓${RESET} Installing packages..."

cd "$SRC_DIR"

if ! npm install 2>&1 | tail -1; then
  fail "npm install failed" "Check your Node.js installation"
fi

# ─── Build ──────────────────────────────────────────────
echo -e "  ${CYAN}⟳${RESET} Building..."

if ! npm run build 2>&1 | tail -1; then
  fail "Build failed" "TypeScript compilation error"
fi

if [ ! -f "$SRC_DIR/dist/index.js" ]; then
  fail "Build produced no output" "dist/index.js not found after build"
fi

# Remove devDependencies after build
npm prune --production 2>&1 | tail -1 || true

# ─── Copy to install location ──────────────────────────
echo -e "  ${CYAN}→${RESET} Installing to ${DIM}${LIB_DIR}${RESET}"

mkdir -p "$LIB_DIR" "$BIN_DIR"

# Clean previous install
rm -rf "$LIB_DIR"
mkdir -p "$LIB_DIR"

# Copy built app + node_modules + package.json
cp -r dist "$LIB_DIR/" || fail "Failed to copy dist"
cp -r node_modules "$LIB_DIR/" || fail "Failed to copy node_modules"
cp package.json "$LIB_DIR/" || fail "Failed to copy package.json"

# Install bin shim
cp bin/vdl "$BIN_DIR/vdl" || fail "Failed to install bin shim"
chmod 755 "$BIN_DIR/vdl"

# ─── PATH setup ─────────────────────────────────────────
echo ""

SHELL_NAME=$(basename "$SHELL")
RC_FILE=""

case "$SHELL_NAME" in
  zsh)  RC_FILE="$HOME/.zshrc" ;;
  bash) RC_FILE="$HOME/.bashrc" ;;
esac

if echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  # PATH already has our bin dir
  true
elif [ -n "$RC_FILE" ]; then
  # Auto-add to PATH if not already present
  if ! grep -qF '.local/bin' "$RC_FILE" 2>/dev/null; then
    echo "" >> "$RC_FILE"
    echo "# Added by vdl installer" >> "$RC_FILE"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC_FILE"
    echo -e "  ${GREEN}✓${RESET} Added ${BOLD}${BIN_DIR}${RESET} to PATH in ${DIM}${RC_FILE}${RESET}"
  fi
fi

echo -e "  ${GREEN}${BOLD}✓ vdl installed successfully!${RESET}"
echo ""

# Check if vdl is reachable in current shell
if command -v vdl >/dev/null 2>&1; then
  echo -e "  ${DIM}Run ${RESET}${CYAN}${BOLD}vdl${RESET}${DIM} to get started.${RESET}"
else
  echo -e "  ${YELLOW}⚠${RESET}  Restart your terminal to use ${CYAN}${BOLD}vdl${RESET}"
  if [ -n "$RC_FILE" ]; then
    echo -e "  ${DIM}  Or run:${RESET} source ${RC_FILE}"
  fi
fi

echo ""
