@echo off
REM Navigate to the ws-server folder
cd /d "%~dp0ws-server"

REM Start the server in a new window
start "StreamChallenge Server" cmd /k "node server.js"

REM Give the server a second to boot
timeout /t 2 >nul

REM Open controller in your default browser
start "" "%~dp0controller.html"
