#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This command is supported only on macOS."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LABEL="com.civion.web"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
OUT_LOG="$RUNTIME_DIR/web-service.out.log"
ERR_LOG="$RUNTIME_DIR/web-service.err.log"
DOMAIN="gui/$(id -u)"
SERVICE="$DOMAIN/$LABEL"

mkdir -p "$RUNTIME_DIR" "$HOME/Library/LaunchAgents"

write_plist() {
  cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "$WEB_DIR" && exec env NEXT_DIST_DIR=.next-prod ../../node_modules/.bin/next start -p 3000</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$WEB_DIR</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$OUT_LOG</string>

  <key>StandardErrorPath</key>
  <string>$ERR_LOG</string>
</dict>
</plist>
PLIST
}

build_web() {
  echo "building @civic/web..."
  cd "$ROOT_DIR"
  npm run build -w @civic/web
}

install_service() {
  build_web
  write_plist
  launchctl bootout "$SERVICE" >/dev/null 2>&1 || true
  launchctl bootstrap "$DOMAIN" "$PLIST_PATH"
  launchctl enable "$SERVICE" >/dev/null 2>&1 || true
  launchctl kickstart -k "$SERVICE"
  echo "installed and started: $LABEL"
}

start_service() {
  if [[ ! -f "$PLIST_PATH" ]]; then
    install_service
    return
  fi
  build_web
  launchctl bootstrap "$DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true
  launchctl enable "$SERVICE" >/dev/null 2>&1 || true
  launchctl kickstart -k "$SERVICE"
  echo "started: $LABEL"
}

stop_service() {
  launchctl bootout "$SERVICE" >/dev/null 2>&1 || true
  echo "stopped: $LABEL"
}

restart_service() {
  if [[ ! -f "$PLIST_PATH" ]]; then
    install_service
    return
  fi
  launchctl kickstart -k "$SERVICE"
  echo "restarted: $LABEL"
}

status_service() {
  if launchctl print "$SERVICE" >/dev/null 2>&1; then
    echo "service loaded: $SERVICE"
  else
    echo "service not loaded: $SERVICE"
    exit 1
  fi

  if lsof -ti:3000 >/dev/null 2>&1; then
    echo "port 3000 is listening"
  else
    echo "port 3000 is not listening yet"
    exit 1
  fi
}

logs_service() {
  touch "$OUT_LOG" "$ERR_LOG"
  echo "--- stdout ($OUT_LOG) ---"
  tail -n 120 "$OUT_LOG"
  echo "--- stderr ($ERR_LOG) ---"
  tail -n 120 "$ERR_LOG"
}

uninstall_service() {
  stop_service
  rm -f "$PLIST_PATH"
  echo "uninstalled: $LABEL"
}

case "${1:-}" in
  install) install_service ;;
  start) start_service ;;
  stop) stop_service ;;
  restart) restart_service ;;
  status) status_service ;;
  logs) logs_service ;;
  uninstall) uninstall_service ;;
  *)
    echo "usage: $0 {install|start|stop|restart|status|logs|uninstall}"
    exit 1
    ;;
esac
