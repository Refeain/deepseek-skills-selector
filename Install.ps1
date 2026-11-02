param(
    [string]$HarnessDirectory = 'D:\Ysoft\DeepseekHarness',
    [string]$Profile = 'desktop'
)

$ErrorActionPreference = 'Stop'
$cli = Join-Path $HarnessDirectory 'resources\runtime\cli\bin\dsh.cmd'
if (-not (Test-Path -LiteralPath $cli)) {
    throw "Harness CLI was not found: $cli"
}
if ($Profile -eq 'desktop' -and (Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue)) {
    throw 'Fully quit DeepSeek Harness before installing, then run this installer again.'
}

& $cli plugin --profile $Profile add $PSScriptRoot --offline --ignore-scripts
if ($LASTEXITCODE -ne 0) {
    throw "Harness plugin installation failed with exit code $LASTEXITCODE."
}
Write-Host 'Session Skills is installed. Open Harness and find Skills beside the composer mode controls.'
