#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_SCRIPT="$ROOT_DIR/scripts/web-smoke.sh"

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Web server is not running on port $PORT."
  echo "Start it first:"
  echo "  npm run dev -w @civic/web"
  exit 1
fi

"$SMOKE_SCRIPT" "http://localhost:$PORT"

echo "Starting public tunnel for http://localhost:$PORT ..."
echo "Press Ctrl+C to stop sharing."
echo

exec npx --yes localtunnel --port "$PORT"
