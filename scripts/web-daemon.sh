#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/web-dev.pid"
LOG_FILE="$RUNTIME_DIR/web-dev.log"
SMOKE_SCRIPT="$ROOT_DIR/scripts/web-smoke.sh"

mkdir -p "$RUNTIME_DIR"

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

start() {
  if is_running; then
    echo "web dev is already running (pid $(cat "$PID_FILE"))"
    exit 0
  fi

  local occupied
  occupied="$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | sort -u || true)"
  if [[ -n "$occupied" ]]; then
    echo "port 3000 is already in use by pid(s): $occupied. stop that process first."
    exit 1
  fi

  echo "building web app for stable daemon start..."
  cd "$ROOT_DIR"
  if ! npm run build -w @civic/web >>"$LOG_FILE" 2>&1; then
    echo "build failed. check logs: $LOG_FILE"
    exit 1
  fi

  if command -v setsid >/dev/null 2>&1; then
    setsid "$ROOT_DIR/scripts/web-daemon-runner.sh" >>"$LOG_FILE" 2>&1 < /dev/null &
  else
    nohup "$ROOT_DIR/scripts/web-daemon-runner.sh" >>"$LOG_FILE" 2>&1 < /dev/null &
  fi
  local pid=$!
  echo "$pid" > "$PID_FILE"

  local tries=0
  while [[ $tries -lt 20 ]]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
      break
    fi
    sleep 1
    tries=$((tries + 1))
  done

  if kill -0 "$pid" 2>/dev/null && lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    if ! "$SMOKE_SCRIPT" "http://localhost:3000" >>"$LOG_FILE" 2>&1; then
      echo "startup smoke check failed. check logs: $LOG_FILE"
      stop
      exit 1
    fi
    echo "started web dev daemon (pid $pid)"
    echo "logs: $LOG_FILE"
  else
    echo "failed to start web dev daemon. check logs: $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    echo "stopped web dev daemon"
  else
    echo "web dev daemon is not running"
  fi

  # cleanup stray listeners on 3000 if any
  local stray
  stray="$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | sort -u || true)"
  if [[ -n "$stray" ]]; then
    echo "$stray" | xargs kill -9 2>/dev/null || true
    echo "killed stray process(es) on port 3000"
  fi
}

status() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "web dev is running (pid $pid, listening on :3000)"
    else
      echo "web dev process exists (pid $pid) but is not listening on :3000"
    fi
    exit 0
  fi

  if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "port 3000 is used by another process (no daemon pid file)"
    exit 1
  fi

  echo "web dev is not running"
  exit 1
}

logs() {
  touch "$LOG_FILE"
  tail -n 200 "$LOG_FILE"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  logs) logs ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
