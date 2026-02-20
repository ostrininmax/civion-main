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

echo "Starting public tunnel via localhost.run for http://localhost:$PORT ..."
echo "No tunnel password required."
echo "Press Ctrl+C to stop sharing."
echo "Waiting for public URL..."
echo

ssh \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o ExitOnForwardFailure=yes \
  -R 80:localhost:"$PORT" \
  nokey@localhost.run 2>&1 | while IFS= read -r line; do
    if [[ "${printed:-0}" -eq 0 && "$line" =~ https://[[:alnum:].-]+\.life ]]; then
      url="${BASH_REMATCH[0]}"
      echo "Public URL: $url"
      if command -v pbcopy >/dev/null 2>&1; then
        printf "%s" "$url" | pbcopy
        echo "Copied to clipboard."
      fi
      printed=1
    fi
  done
