#!/bin/sh
# Read before running: https://github.com/easyicetrusty/cryptotools/blob/main/install.sh
set -eu
case "${1:-install}" in
  install|update) action=${1:-install} ;;
  *) printf 'Usage: sh install.sh [install|update]\n' >&2; exit 2 ;;
esac
command -v docker >/dev/null 2>&1 || { printf 'Install and start Docker with Compose v2 first.\n' >&2; exit 1; }
docker compose version >/dev/null
: "${CRYPTOTOOLS_IMAGE:=ghcr.io/easyicetrusty/cryptotools:latest}"
: "${CRYPTOTOOLS_DIR:=$HOME/.cryptotools}"
export CRYPTOTOOLS_IMAGE
mkdir -p "$CRYPTOTOOLS_DIR"
config="$CRYPTOTOOLS_DIR/compose.yaml"
tmp=$(mktemp "$CRYPTOTOOLS_DIR/compose.yaml.XXXXXX")
trap 'rm -f "$tmp"' EXIT HUP INT TERM
curl -fsSL https://raw.githubusercontent.com/easyicetrusty/cryptotools/v0.7.1-beta.2/compose.yaml -o "$tmp"
mv "$tmp" "$config"
if [ "${LOCAL_IMAGE:-0}" = 1 ]; then
  docker image inspect "$CRYPTOTOOLS_IMAGE" >/dev/null
else
  docker compose -f "$config" pull
fi
# Recreate services, never remove the named data volumes.
docker compose -f "$config" up -d --pull never --force-recreate --wait --wait-timeout 180
url="http://127.0.0.1:${APP_PORT:-8080}"
printf 'cryptotools %s complete: %s\nData volumes retained. Compose file: %s\n' "$action" "$url" "$config"
if [ "${OPEN_BROWSER:-1}" = 1 ]; then
  if command -v open >/dev/null 2>&1; then open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
  else printf 'Open %s in your browser.\n' "$url"; fi
fi
