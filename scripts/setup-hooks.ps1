# Install git hooks. Usage: .\scripts\setup-hooks.ps1

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$git = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
  $git = "git"
} elseif (Test-Path "$env:ProgramFiles\Git\bin\git.exe") {
  $git = "$env:ProgramFiles\Git\bin\git.exe"
}

if (-not $git) {
  Write-Error "Git not found."
  exit 1
}

& $git config core.hooksPath .githooks
Write-Host "Git hooks installed (.githooks/pre-commit will run tests before each commit)."
