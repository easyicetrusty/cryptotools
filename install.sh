#!/bin/sh
# Release asset: inspect it and SHA256SUMS before running. Source template fails closed.
set -eu
RELEASE_VERSION='@RELEASE_VERSION@'
PINNED_IMAGE='ghcr.io/easyicetrusty/cryptotools@sha256:@IMAGE_DIGEST@'
case "${1:-install}" in install|update) action=${1:-install};; *) echo 'Usage: sh install.sh [install|update]' >&2; exit 2;; esac
command -v docker >/dev/null 2>&1 || { echo 'Install Docker with Compose v2 first.' >&2; exit 1; }
docker compose version >/dev/null
: "${CRYPTOTOOLS_DIR:=$HOME/.cryptotools}"
mkdir -p "$CRYPTOTOOLS_DIR"
work=$(mktemp -d "$CRYPTOTOOLS_DIR/download.XXXXXX")
trap 'rm -rf "$work"' EXIT HUP INT TERM
if [ "$action" = update ]; then
  curl -fsSL 'https://api.github.com/repos/easyicetrusty/cryptotools/releases?per_page=20' -o "$work/releases.json"
  # GitHub lists published releases newest first. Drafts are invisible anonymously.
  RELEASE_VERSION=$(awk -F '"' '/"tag_name"[[:space:]]*:/ {print $4; exit}' "$work/releases.json")
fi
printf '%s\n' "$RELEASE_VERSION" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$' || { echo 'Run a published release installer, not the source template.' >&2; exit 1; }
base="https://github.com/easyicetrusty/cryptotools/releases/download/$RELEASE_VERSION"
for name in SHA256SUMS compose.yaml image-reference.txt; do curl -fsSL "$base/$name" -o "$work/$name"; done
hash_file() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }
for name in compose.yaml image-reference.txt; do
  expected=$(awk -v name="$name" '$2==name {print $1}' "$work/SHA256SUMS")
  [ "${#expected}" = 64 ] && [ "$(hash_file "$work/$name")" = "$expected" ] || { echo "Checksum failed: $name" >&2; exit 1; }
done
IFS= read -r released_image < "$work/image-reference.txt"
printf '%s\n' "$released_image" | grep -Eq '^ghcr.io/easyicetrusty/cryptotools@sha256:[a-f0-9]{64}$' || { echo 'Invalid pinned image reference.' >&2; exit 1; }
if [ "$action" = install ] && [ "$released_image" != "$PINNED_IMAGE" ]; then echo 'Installer and release digest disagree.' >&2; exit 1; fi
: "${CRYPTOTOOLS_IMAGE:=$released_image}"
if [ "${LOCAL_IMAGE:-0}" != 1 ]; then
  printf '%s\n' "$CRYPTOTOOLS_IMAGE" | grep -Eq '^ghcr.io/easyicetrusty/cryptotools@sha256:[a-f0-9]{64}$' || { echo 'Installer requires a digest pin. Use Docker Compose directly for manual tags.' >&2; exit 1; }
fi
export CRYPTOTOOLS_IMAGE
# Persist the pin so a later manual compose up cannot fall back to :latest.
printf 'CRYPTOTOOLS_IMAGE=%s\n' "$CRYPTOTOOLS_IMAGE" > "$work/.env"
mv "$work/compose.yaml" "$CRYPTOTOOLS_DIR/compose.yaml"
mv "$work/.env" "$CRYPTOTOOLS_DIR/.env"
config="$CRYPTOTOOLS_DIR/compose.yaml"
if [ "${LOCAL_IMAGE:-0}" = 1 ]; then docker image inspect "$CRYPTOTOOLS_IMAGE" >/dev/null; else docker compose -f "$config" pull; fi
docker compose -f "$config" up -d --pull never --force-recreate --wait --wait-timeout 180
url="http://127.0.0.1:${APP_PORT:-8080}"
printf 'cryptotools %s complete: %s\nPinned image: %s\nData volumes retained.\n' "$action" "$url" "$CRYPTOTOOLS_IMAGE"
if [ "${OPEN_BROWSER:-1}" = 1 ]; then
 if command -v open >/dev/null 2>&1; then open "$url"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"; else printf 'Open %s\n' "$url"; fi
fi
