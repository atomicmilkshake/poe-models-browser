@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Is Node.js installed?
    pause
    exit /b 1
  )
)

echo Starting Poe Models Browser...
call npm start
if errorlevel 1 (
  echo Failed to start Electron. Try: npm install
  pause
  exit /b 1
)
