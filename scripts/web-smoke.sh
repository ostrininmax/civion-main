#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

ROUTES=(
  "/"
  "/wallet"
  "/services"
  "/civic-card"
  "/timeline"
)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "SMOKE FAIL: $1"
  exit 1
}

check_static_asset() {
  local path="$1"
  [[ -z "$path" ]] && return 0
  curl -fsSI "$BASE_URL$path" >/dev/null || fail "missing asset: $path"
}

for route in "${ROUTES[@]}"; do
  file="$TMP_DIR/$(echo "$route" | tr '/?' '__').html"
  curl -fsS -m 20 "$BASE_URL$route" >"$file" || fail "route unavailable: $route"

  if rg -q "Cannot find module '\\./[0-9]+\\.js'|\"statusCode\":500|Internal Server Error|Application error" "$file"; then
    fail "runtime error detected on $route"
  fi

  css_path="$(rg -o '/_next/static/css/[^"]+' "$file" | head -n 1 || true)"
  check_static_asset "$css_path"

  while IFS= read -r chunk; do
    check_static_asset "$chunk"
  done < <(rg -o '/_next/static/chunks/[^"]+\.js[^"]*' "$file" | head -n 4 || true)
done

echo "SMOKE OK: ${BASE_URL} (${#ROUTES[@]} routes)"
