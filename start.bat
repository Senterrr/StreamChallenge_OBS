@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Config
set "HOST=127.0.0.1"
set "PORT=17311"

REM Paths (repo root is the folder of this .bat)
set "ROOT=%~dp0"
set "WS_DIR=%ROOT%ws-server"
set "CONTROLLER_URL=http://%HOST%:%PORT%/controller/controller.html"
set "OVERLAY_URL=http://%HOST%:%PORT%/overlay.html?ws=ws://%HOST%:%PORT%&channel=obs_challenge_overlay&frame=1&mute=1"

REM Check Node
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH. Install Node.js: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%WS_DIR%\server.js" (
  echo [ERROR] Cannot find server.js in "%WS_DIR%".
  pause
  exit /b 1
)

pushd "%WS_DIR%"
if not exist "node_modules" (
  echo [Setup] Installing dependencies...
  call npm i
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
)

echo [Info] Launching server window...
start "StreamChallenge Server" cmd /k "node server.js"
popd

echo [Info] Waiting for http://%HOST%:%PORT% ...
powershell -NoProfile -Command ^
  "while (-not (Test-NetConnection -ComputerName '%HOST%' -Port %PORT% -InformationLevel Quiet)) { Start-Sleep -Milliseconds 200 }; Write-Host 'Server reachable.'"

echo [Info] Opening controller: %CONTROLLER_URL%
start "" "%CONTROLLER_URL%"

echo [Info] Opening overlay (for testing): %OVERLAY_URL%
start "" "%OVERLAY_URL%"

powershell -NoProfile -Command "Set-Clipboard -Value '%OVERLAY_URL%'"
echo [Info] Overlay URL copied to clipboard.
echo.
echo [Info] Use this URL for the OBS Browser Source:
echo   %OVERLAY_URL%
echo.
endlocal