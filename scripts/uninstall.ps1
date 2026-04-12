# VDL Uninstaller for Windows (PowerShell)
$INSTALL_DIR = "$env:LOCALAPPDATA\vdl"
$BIN_DIR = "$INSTALL_DIR\bin"

Write-Host ""
Write-Host "  VDL Uninstaller" -ForegroundColor Cyan
Write-Host "  $('─' * 40)" -ForegroundColor DarkGray
Write-Host ""

$removed = $false

if (Test-Path "$BIN_DIR\vdl.cmd") {
    Remove-Item -Force "$BIN_DIR\vdl.cmd"
    Write-Host "  ✓ Removed $BIN_DIR\vdl.cmd" -ForegroundColor Green
    $removed = $true
}

if (Test-Path $INSTALL_DIR) {
    Remove-Item -Recurse -Force $INSTALL_DIR
    Write-Host "  ✓ Removed $INSTALL_DIR" -ForegroundColor Green
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

if (-not $removed) {
    Write-Host "  Nothing to remove — vdl is not installed." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "  ✓ vdl uninstalled successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Note: Config at $env:LOCALAPPDATA\vdl was removed." -ForegroundColor DarkGray
    Write-Host "  User config at ~/.config/vdl/ was preserved." -ForegroundColor DarkGray
}

Write-Host ""
