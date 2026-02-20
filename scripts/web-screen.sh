#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
SESSION="civion-web"
LOG_FILE="$RUNTIME_DIR/screenlog.0"
SMOKE_SCRIPT="$ROOT_DIR/scripts/web-smoke.sh"

mkdir -p "$RUNTIME_DIR"

session_exists() {
  screen -ls | rg -q "[0-9]+\\.$SESSION"
}

port_listening() {
  lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1
}

start() {
  if session_exists; then
    echo "screen session '$SESSION' is already running"
    exit 0
  fi

  if port_listening; then
    echo "web server is already running on port 3000"
    exit 0
  fi

  (
    cd "$RUNTIME_DIR"
    screen -L -dmS "$SESSION" \
      bash -lc "cd '$ROOT_DIR' && npm run build -w @civic/web && cd apps/web && exec env NEXT_DIST_DIR=.next-prod ../../node_modules/.bin/next start -p 3000"
  )

  local tries=0
  while [[ $tries -lt 40 ]]; do
    if port_listening; then
      break
    fi
    sleep 1
    tries=$((tries + 1))
  done

  if port_listening; then
    if ! "$SMOKE_SCRIPT" "http://localhost:3000" >>"$LOG_FILE" 2>&1; then
      echo "startup smoke check failed. logs: $LOG_FILE"
      stop
      exit 1
    fi
    echo "started screen session '$SESSION' (port 3000 is listening)"
    echo "logs: $LOG_FILE"
  else
    echo "failed to start web in screen session. logs: $LOG_FILE"
    exit 1
  fi
}

stop() {
  if session_exists; then
    screen -S "$SESSION" -X quit || true
    echo "stopped screen session '$SESSION'"
  else
    echo "screen session '$SESSION' is not running"
  fi

  local stray
  stray="$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | sort -u || true)"
  if [[ -n "$stray" ]]; then
    echo "$stray" | xargs kill -9 2>/dev/null || true
    echo "killed stray process(es) on port 3000"
  fi
}

status() {
  if session_exists; then
    echo "screen session '$SESSION' is running"
    if port_listening; then
      echo "port 3000 is listening"
      exit 0
    fi
    echo "port 3000 is not listening"
    exit 1
  fi

  if port_listening; then
    echo "web server is running on port 3000 (detached process)"
    exit 0
  else
    echo "screen session '$SESSION' is not running and port 3000 is closed"
    exit 1
  fi
}

logs() {
  LOG_FILE="$RUNTIME_DIR/screenlog.0"
  touch "$LOG_FILE"
  tail -n 200 "$LOG_FILE"
}

restart() {
  stop
  start
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  logs) logs ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
