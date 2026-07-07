# Run unit tests without npm. Usage: .\scripts\test.ps1

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$node = $null
if (Get-Command node -ErrorAction SilentlyContinue) {
  $node = "node"
} elseif (Test-Path "$env:ProgramFiles\nodejs\node.exe") {
  $node = "$env:ProgramFiles\nodejs\node.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\nodejs\node.exe") {
  $node = "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
}

if (-not $node) {
  Write-Error "Node.js not found. Install from https://nodejs.org"
  exit 1
}

Write-Host "Using: $node"
& $node scripts/run-tests.mjs
exit $LASTEXITCODE
