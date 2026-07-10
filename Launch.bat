@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\dotenv" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Is Node.js installed?
    pause
    exit /b 1
  )
)

echo Starting Poe Models Browser at http://localhost:8787 ...
start "" "http://localhost:8787"
node proxy.js
pause
