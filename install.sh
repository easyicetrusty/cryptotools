#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${CRYPTOTOOLS_IMAGE:?Set CRYPTOTOOLS_IMAGE to a registry image or a locally built tag}"
export CRYPTOTOOLS_IMAGE
if [ "${LOCAL_IMAGE:-0}" = 1 ]; then
  docker image inspect "$CRYPTOTOOLS_IMAGE" >/dev/null
  docker compose up -d --pull never --wait --wait-timeout 120
else
  docker compose pull
  docker compose up -d --wait --wait-timeout 120
fi
url="http://127.0.0.1:${APP_PORT:-8080}"
printf 'cryptotools is ready: %s\n' "$url"
if [ "${OPEN_BROWSER:-1}" = 1 ]; then
  if command -v open >/dev/null 2>&1; then open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
  else printf 'Open %s in your browser.\n' "$url"; fi
fi
