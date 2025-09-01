@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ──────────────────────────────────────────────────────────────
REM Config
REM ──────────────────────────────────────────────────────────────
set "HOST=127.0.0.1"
set "PORT=17311"

REM Paths (repo root is the folder of this .bat)
set "ROOT=%~dp0"
set "WS_DIR=%ROOT%ws-server"
set "CONTROLLER_URL=http://%HOST%:%PORT%/controller/controller.html"

REM ──────────────────────────────────────────────────────────────
REM Check Node.js
REM ──────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH. Please install Node.js and try again.
  echo https://nodejs.org/
  pause
  exit /b 1
)

REM ──────────────────────────────────────────────────────────────
REM Start server (in new window)
REM ──────────────────────────────────────────────────────────────
if not exist "%WS_DIR%\server.js" (
  echo [ERROR] Cannot find server.js in "%WS_DIR%".
  pause
  exit /b 1
)

pushd "%WS_DIR%"

REM Install deps on first run (if node_modules missing)
if not exist "node_modules" (
  echo [Setup] Installing dependencies in "%CD%" ...
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

REM ──────────────────────────────────────────────────────────────
REM Wait until the server is listening
REM ──────────────────────────────────────────────────────────────
echo [Info] Waiting for http://%HOST%:%PORT% ...
powershell -NoProfile -Command ^
  "while (-not (Test-NetConnection %HOST% -Port %PORT% -InformationLevel Quiet)) { Start-Sleep -Milliseconds 200 }"

REM ──────────────────────────────────────────────────────────────
REM Open controller in default browser
REM ──────────────────────────────────────────────────────────────
echo [Info] Opening controller: %CONTROLLER_URL%
start "" "%CONTROLLER_URL%"

REM Show handy OBS overlay URL for copy/paste
echo.
echo [Info] Use this URL for the OBS Browser Source:
echo   http://%HOST%:%PORT%/overlay.html?ws=ws://%HOST%:%PORT%^&channel=obs_challenge_overlay^&frame=1^&mute=1
echo.

endlocal
