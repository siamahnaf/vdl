# VDL Installer for Windows (PowerShell)
$ErrorActionPreference = "SilentlyContinue"

$VERSION = "1.0.0"
$REPO = "siamahnaf/vdl"
$INSTALL_DIR = "$env:LOCALAPPDATA\vdl"
$BIN_DIR = "$INSTALL_DIR\bin"

function Fail($msg) {
    Write-Host ""
    Write-Host "  ✗ $msg" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ─── Header ─────────────────────────────────────────────
Write-Host ""
Write-Host "  VDL - Video Downloader — Install v$VERSION" -ForegroundColor Cyan
Write-Host "  $('─' * 40)" -ForegroundColor DarkGray
Write-Host ""

# ─── Check & install dependencies ───────────────────────
Write-Host "  Checking dependencies..." -ForegroundColor White
Write-Host ""

# --- Node.js ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = try { & node --version 2>&1 | Select-Object -First 1 } catch { "found" }
    Write-Host "  ✓ Node.js ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Node.js first:" -ForegroundColor White
    Write-Host "    https://nodejs.org" -ForegroundColor Cyan
    Fail "Installation cancelled"
}

# --- pip ---
$pipCmd = Get-Command pip3 -ErrorAction SilentlyContinue
if (-not $pipCmd) { $pipCmd = Get-Command pip -ErrorAction SilentlyContinue }
$pipName = if ($pipCmd) { $pipCmd.Name } else { $null }

if ($pipCmd) {
    Write-Host "  ✓ Python (available)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Python not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Python first:" -ForegroundColor White
    Write-Host "    https://python.org" -ForegroundColor Cyan
    Fail "Installation cancelled"
}

# --- yt-dlp (auto-install) ---
$ytdlpCmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($ytdlpCmd) {
    $ytdlpVer = try { & yt-dlp --version 2>&1 | Select-Object -First 1 } catch { "found" }
    Write-Host "  ✓ yt-dlp ($ytdlpVer)" -ForegroundColor Green
} else {
    Write-Host "  ↓ Installing yt-dlp..." -ForegroundColor Cyan

    try {
        & $pipName install yt-dlp 2>&1 | Out-Null
        Write-Host "  ✓ yt-dlp (installed)" -ForegroundColor Green
    } catch {
        Fail "Could not install yt-dlp. Please try again."
    }
}

# --- ffmpeg ---
Write-Host "  ✓ ffmpeg (included)" -ForegroundColor Green

Write-Host ""
Write-Host "  ✓ All dependencies ready" -ForegroundColor Green
Write-Host ""

# ─── Download ───────────────────────────────────────────
Write-Host "  ↓ Downloading vdl..." -ForegroundColor Cyan

$tmpDir = Join-Path $env:TEMP "vdl-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$zipUrl = "https://github.com/$REPO/archive/refs/heads/main.zip"
$zipPath = Join-Path $tmpDir "vdl.zip"

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing -ErrorAction Stop
    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force -ErrorAction Stop
} catch {
    Fail "Download failed. Please check your internet connection."
}

$srcDir = Join-Path $tmpDir "vdl-main"

# ─── Install packages ─────────────────────────────────
Write-Host "  ↓ Setting up..." -ForegroundColor Cyan

Push-Location $srcDir
npm install --omit=dev --cache "$tmpDir\.npm-cache" 2>&1 | Out-Null
Pop-Location

# ─── Copy to install location ──────────────────────────
Write-Host "  → Installing..." -ForegroundColor Cyan

if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
}

New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null

Copy-Item -Recurse "$srcDir\dist" "$INSTALL_DIR\dist"
Copy-Item -Recurse "$srcDir\node_modules" "$INSTALL_DIR\node_modules"
Copy-Item "$srcDir\package.json" "$INSTALL_DIR\package.json"

$cmdContent = @"
@echo off
node "%~dp0\..\dist\index.js" %*
"@
Set-Content -Path "$BIN_DIR\vdl.cmd" -Value $cmdContent

# ─── PATH ──────────────────────────────────────────────
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($userPath -notlike "*$BIN_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$BIN_DIR;$userPath", "User")
}

# ─── Cleanup ────────────────────────────────────────────
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  ✓ vdl installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Restart your terminal, then run " -NoNewline -ForegroundColor DarkGray
Write-Host "vdl" -NoNewline -ForegroundColor Cyan
Write-Host " to get started." -ForegroundColor DarkGray
Write-Host ""
