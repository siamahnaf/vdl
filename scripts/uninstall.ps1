# VDL Uninstaller for Windows (PowerShell)
$INSTALL_DIR = "$env:LOCALAPPDATA\vdl"
$BIN_DIR = "$INSTALL_DIR\bin"
$CONFIG_DIR = "$env:USERPROFILE\.config\vdl"

Write-Host ""
Write-Host "  VDL Uninstaller" -ForegroundColor Cyan
Write-Host "  $('─' * 40)" -ForegroundColor DarkGray
Write-Host ""

$removed = $false

# Remove vdl app
if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
    Write-Host "  ✓ Removed $INSTALL_DIR" -ForegroundColor Green
    $removed = $true
}

# Remove config
if (Test-Path $CONFIG_DIR) {
    Remove-Item -Recurse -Force $CONFIG_DIR
    Write-Host "  ✓ Removed $CONFIG_DIR" -ForegroundColor Green
    $removed = $true
}

# Remove from PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -like "*$BIN_DIR*") {
    $newPath = ($userPath -split ";" | Where-Object { $_ -ne $BIN_DIR }) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  ✓ Removed $BIN_DIR from PATH" -ForegroundColor Green
    $removed = $true
}

# Remove yt-dlp (installed via pip)
$ytdlpCmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($ytdlpCmd) {
    Write-Host "  ⚠ Removing yt-dlp..." -ForegroundColor Yellow
    $pipCmd = Get-Command pip3 -ErrorAction SilentlyContinue
    if (-not $pipCmd) { $pipCmd = Get-Command pip -ErrorAction SilentlyContinue }

    if ($pipCmd) {
        try {
            & $pipCmd.Name uninstall yt-dlp -y 2>$null
            Write-Host "  ✓ Removed yt-dlp" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Could not remove yt-dlp automatically" -ForegroundColor Yellow
            Write-Host "    Remove manually: pip uninstall yt-dlp" -ForegroundColor DarkGray
        }
    }
    $removed = $true
}

if (-not $removed) {
    Write-Host "  Nothing to remove — vdl is not installed." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "  ✓ vdl uninstalled completely" -ForegroundColor Green
}

Write-Host ""
