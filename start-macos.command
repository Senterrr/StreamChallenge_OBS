#!/bin/bash
# StreamChallenge OBS — macOS launcher
# Double-click this file to start the local server and open the controller/overlay.

set -e

# Config
HOST="127.0.0.1"
PORT="17311"

# Resolve project root (folder containing this .command file)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WS_DIR="$ROOT_DIR/ws-server"

# Use correct case for paths served by the HTTP server
CONTROLLER_URL="http://$HOST:$PORT/Controller/controller.html"
OVERLAY_URL="http://$HOST:$PORT/overlay.html?ws=ws://$HOST:$PORT&channel=obs_challenge_overlay&frame=1&mute=1"

echo "[Info] Project root: $ROOT_DIR"
echo "[Info] WS server dir: $WS_DIR"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found in PATH. Please install from https://nodejs.org and retry."
  exit 1
fi

# Determine server filename (handle Server.js vs server.js)
SERVER_FILE="server.js"
if [ ! -f "$WS_DIR/$SERVER_FILE" ]; then
  if [ -f "$WS_DIR/Server.js" ]; then
    SERVER_FILE="Server.js"
  else
    echo "[ERROR] Cannot find server.js in '$WS_DIR'."
    exit 1
  fi
fi

# Install dependencies if needed
if [ ! -d "$WS_DIR/node_modules" ]; then
  echo "[Setup] Installing dependencies in ws-server (npm install)…"
  (cd "$WS_DIR" && npm install)
fi

# Launch server in a new Terminal window using AppleScript
SERVER_CMD="cd \"$WS_DIR\"; node \"$SERVER_FILE\""
# Escape for AppleScript string
ESCAPED_CMD=$(printf '%s' "$SERVER_CMD" | sed 's/\\/\\\\/g; s/"/\\"/g')

echo "[Info] Launching server window…"
osascript -e 'tell application "Terminal" to activate' \
          -e "tell application \"Terminal\" to do script \"$ESCAPED_CMD\"" >/dev/null

# Wait for HTTP to be reachable
echo "[Info] Waiting for http://$HOST:$PORT …"
ATTEMPTS=0
until curl -sf "http://$HOST:$PORT/slots-manifest" >/dev/null 2>&1; do
  sleep 0.2
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -gt 200 ]; then
    echo "[Warn] Still waiting… make sure the server window didn't report an error."
    break
  fi
done

echo "[Info] Opening controller: $CONTROLLER_URL"
open "$CONTROLLER_URL"

echo "[Info] Opening overlay (for testing): $OVERLAY_URL"
open "$OVERLAY_URL"

# Copy overlay URL to clipboard (convenience for OBS Browser Source)
if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$OVERLAY_URL" | pbcopy
  echo "[Info] Overlay URL copied to clipboard."
fi

echo
echo "[Info] Use this URL for the OBS Browser Source:"
echo "  $OVERLAY_URL"
echo
exit 0
