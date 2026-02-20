#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
DIST_DIR="${NEXT_DIST_DIR:-.next-dev}"
SMOKE_SCRIPT="$ROOT_DIR/scripts/web-smoke.sh"

OCCUPIED="$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t | sort -u || true)"
if [[ -n "$OCCUPIED" ]]; then
  SAFE_TO_KILL=true
  for pid in $OCCUPIED; do
    cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
    if [[ "$cmd" == *"next-server"* ]] || [[ "$cmd" == *"next dev"* ]]; then
      :
    else
      SAFE_TO_KILL=false
      break
    fi
  done

  if [[ "$SAFE_TO_KILL" == true ]]; then
    echo "Port 3000 is occupied by stale Next.js process(es): $OCCUPIED"
    echo "Stopping stale process(es) and continuing..."
    for pid in $OCCUPIED; do
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
  else
    echo "Port 3000 is already in use by pid(s): $OCCUPIED"
    echo "A non-Next process is using this port. Stop it first, then run again."
    exit 1
  fi
fi

cd "$WEB_DIR"

if [[ -d "$DIST_DIR" ]]; then
  TS="$(date +%s)"
  mv "$DIST_DIR" "${DIST_DIR}_cache_${TS}" || true
fi

# Keep only the latest 4 cache snapshots to avoid disk growth.
if ls -d "${DIST_DIR}"_cache_* >/dev/null 2>&1; then
  ls -dt "${DIST_DIR}"_cache_* | awk 'NR>4 {print $0}' | while read -r stale; do
    rm -rf "$stale" || true
  done
fi

env NEXT_DIST_DIR="$DIST_DIR" ../../node_modules/.bin/next dev -p 3000 &
NEXT_PID=$!

stop_server() {
  if kill -0 "$NEXT_PID" >/dev/null 2>&1; then
    kill "$NEXT_PID" >/dev/null 2>&1 || true
    wait "$NEXT_PID" >/dev/null 2>&1 || true
  fi
}

handle_signal() {
  stop_server
  exit 0
}

trap handle_signal INT TERM

READY=0
for _ in $(seq 1 120); do
  if ! kill -0 "$NEXT_PID" >/dev/null 2>&1; then
    wait "$NEXT_PID"
    exit $?
  fi

  if curl -fsS -m 3 "http://localhost:3000/" >/dev/null 2>&1; then
    READY=1
    break
  fi

  sleep 0.5
done

if [[ "$READY" -ne 1 ]]; then
  echo "SMOKE FAIL: web app did not become ready on :3000 in time."
  stop_server
  exit 1
fi

if ! "$SMOKE_SCRIPT" "http://localhost:3000"; then
  echo "SMOKE FAIL: startup smoke checks failed. Stopping dev server."
  stop_server
  exit 1
fi

wait "$NEXT_PID"
