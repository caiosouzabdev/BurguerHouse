@echo off
REM Run unit tests without npm. Usage: scripts\test.bat

cd /d "%~dp0\.."

where node >nul 2>&1
if %ERRORLEVEL%==0 (
  node scripts\run-tests.mjs
  exit /b %ERRORLEVEL%
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" scripts\run-tests.mjs
  exit /b %ERRORLEVEL%
)

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  "%LOCALAPPDATA%\Programs\nodejs\node.exe" scripts\run-tests.mjs
  exit /b %ERRORLEVEL%
)

echo Node.js not found. Install from https://nodejs.org
exit /b 1
