# VDL Installer for Windows (PowerShell)
$ErrorActionPreference = "Stop"

$VERSION = "1.0.0"
$REPO = "siamahnaf/vdl"
$INSTALL_DIR = "$env:LOCALAPPDATA\vdl"
$BIN_DIR = "$INSTALL_DIR\bin"

# ─── Header ─────────────────────────────────────────────
Write-Host ""
Write-Host "  VDL - Video Downloader — Install v$VERSION" -ForegroundColor Cyan
Write-Host "  $('─' * 40)" -ForegroundColor DarkGray
Write-Host ""

# ─── Check & install dependencies ───────────────────────
Write-Host "  Checking dependencies..." -ForegroundColor White
Write-Host ""

# --- Node.js (required — must be pre-installed) ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = try { & node --version 2>&1 | Select-Object -First 1 } catch { "found" }
    Write-Host "  ✓ node ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host "  ✗ node not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Node.js is required:" -ForegroundColor Red
    Write-Host "    https://nodejs.org  (download & install)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  After installing Node.js, re-run this installer." -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

# --- pip (needed for yt-dlp) ---
$pipCmd = Get-Command pip -ErrorAction SilentlyContinue
if (-not $pipCmd) {
    $pipCmd = Get-Command pip3 -ErrorAction SilentlyContinue
}
$pipName = if ($pipCmd) { $pipCmd.Name } else { $null }

if ($pipCmd) {
    Write-Host "  ✓ $pipName (available)" -ForegroundColor Green
} else {
    Write-Host "  ✗ pip not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Python pip is required to install yt-dlp:" -ForegroundColor Red
    Write-Host "    https://python.org  (download & install, check 'Add to PATH')" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# --- yt-dlp (auto-install via pip) ---
$ytdlpCmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($ytdlpCmd) {
    $ytdlpVer = try { & yt-dlp --version 2>&1 | Select-Object -First 1 } catch { "found" }
    Write-Host "  ✓ yt-dlp ($ytdlpVer)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ yt-dlp not found — installing via $pipName..." -ForegroundColor Yellow
    Write-Host "    ↓ $pipName install yt-dlp" -ForegroundColor DarkGray

    try {
        & $pipName install yt-dlp 2>$null
        Write-Host "  ✓ yt-dlp installed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to install yt-dlp" -ForegroundColor Red
        Write-Host "    Try manually: $pipName install yt-dlp" -ForegroundColor Yellow
        exit 1
    }
}

# --- ffmpeg (bundled via npm) ---
Write-Host "  ✓ ffmpeg (bundled via npm)" -ForegroundColor Green

Write-Host ""
Write-Host "  ✓ All dependencies ready" -ForegroundColor Green
Write-Host ""

# ─── Download ───────────────────────────────────────────
Write-Host "  ↓ Downloading vdl..." -ForegroundColor Cyan

$tmpDir = Join-Path $env:TEMP "vdl-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$zipUrl = "https://github.com/$REPO/archive/refs/heads/main.zip"
$zipPath = Join-Path $tmpDir "vdl.zip"

Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

$srcDir = Join-Path $tmpDir "vdl-main"

# ─── Install npm packages (includes ffmpeg-static) ─────
Write-Host "  ↓ Installing packages..." -ForegroundColor Cyan

Push-Location $srcDir
npm install --silent 2>$null

# ─── Build ──────────────────────────────────────────────
Write-Host "  ⟳ Building..." -ForegroundColor Cyan
npm run build --silent 2>$null

# Remove devDependencies after build
npm prune --production --silent 2>$null
Pop-Location

# ─── Copy to install location ──────────────────────────
Write-Host "  → Installing to $INSTALL_DIR" -ForegroundColor Cyan

if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
}

New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null

Copy-Item -Recurse "$srcDir\dist" "$INSTALL_DIR\dist"
Copy-Item -Recurse "$srcDir\node_modules" "$INSTALL_DIR\node_modules"
Copy-Item "$srcDir\package.json" "$INSTALL_DIR\package.json"

# Create .cmd shim
$cmdContent = @"
@echo off
node "%~dp0\..\dist\index.js" %*
"@
Set-Content -Path "$BIN_DIR\vdl.cmd" -Value $cmdContent

# ─── PATH check ────────────────────────────────────────
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($userPath -notlike "*$BIN_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$BIN_DIR;$userPath", "User")
    Write-Host ""
    Write-Host "  ✓ Added $BIN_DIR to your PATH" -ForegroundColor Green
    Write-Host "    Restart your terminal for the change to take effect." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  ✓ PATH already configured" -ForegroundColor Green
}

# ─── Cleanup ────────────────────────────────────────────
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  ✓ vdl installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Run " -NoNewline -ForegroundColor DarkGray
Write-Host "vdl" -NoNewline -ForegroundColor Cyan
Write-Host " to get started." -ForegroundColor DarkGray
Write-Host ""
