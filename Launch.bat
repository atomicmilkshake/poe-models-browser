@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Is Node.js installed and on PATH?
    echo Download: https://nodejs.org/
    pause
    exit /b 1
  )
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron binary not found after install.
  echo Try: npm install
  pause
  exit /b 1
)

echo Starting Poe Models Browser v1.2.0...
REM Detach Electron so this console can close instead of looking "stuck".
start "" "node_modules\electron\dist\electron.exe" .
exit /b 0
