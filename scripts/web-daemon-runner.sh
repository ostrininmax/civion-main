#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$ROOT_DIR/.runtime/web-dev.log"

mkdir -p "$ROOT_DIR/.runtime"

child_pid=""

shutdown() {
  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
    kill "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  exit 0
}

trap shutdown INT TERM HUP

while true; do
  cd "$ROOT_DIR/apps/web"
  env NEXT_DIST_DIR=.next-prod ../../node_modules/.bin/next start -p 3000 &
  child_pid=$!
  wait "$child_pid"
  exit_code=$?

  if [[ "$exit_code" -eq 0 ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] web server exited cleanly, restarting in 1s" >>"$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] web server crashed (exit $exit_code), restarting in 1s" >>"$LOG_FILE"
  fi

  sleep 1
done
