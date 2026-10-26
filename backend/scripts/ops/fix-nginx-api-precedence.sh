#!/usr/bin/env bash
# Make /api/ win over regex static-file locations in the cardhub.co.tz Nginx
# server block, so /api/v1/media/*.png|jpg|webp reach Node instead of
# Nginx's own 404.
#
# Evidence (2026-10-26, public probe): /api/v1/media/posters/...png returns
# Nginx's HTML 404 ("nginx/1.24.0 (Ubuntu)"); the same path without an
# extension and /api/v1/media/...mp4 reach Node. A prefix "location /api/"
# loses to a matching regex "location ~* \.(png|jpg|...)$"; "^~" fixes the
# precedence without changing the upstream, headers, timeouts or URI.
#
# Usage (on the server):   sudo bash backend/scripts/ops/fix-nginx-api-precedence.sh          # dry run: shows the plan
#                          sudo bash backend/scripts/ops/fix-nginx-api-precedence.sh --apply  # backup, edit, nginx -t, reload
# Changes exactly one token on one line. Restores the backup if nginx -t fails.
set -euo pipefail

DOMAIN="cardhub.co.tz"
TEST_URL="https://cardhub.co.tz/api/v1/media/posters/2026/9153384d-9c34-4c57-972a-7c09169f65ef.png"
APPLY="${1:-}"

command -v nginx >/dev/null || { echo "nginx not found"; exit 1; }

# 1. Which loaded config file holds the server block for the domain?
CONF=$(nginx -T 2>/dev/null | awk -v d="$DOMAIN" '
  /^# configuration file / { file=$4; sub(/:$/, "", file) }
  $0 ~ "server_name" && $0 ~ d { print file; exit }')
[ -n "${CONF:-}" ] && [ -f "$CONF" ] || { echo "Could not find the server block for $DOMAIN in nginx -T output"; exit 1; }
echo "Server block for $DOMAIN: $CONF"

echo
echo "Location blocks in that file:"
grep -nE '^\s*location\b' "$CONF" || true

# 2. The /api location(s) that need ^~ (plain prefix only; leave =, ^~ and regex ones alone).
TARGETS=$(grep -nE '^\s*location\s+/api/?\s*\{' "$CONF" || true)
if [ -z "$TARGETS" ]; then
  if grep -qE '^\s*location\s+\^~\s+/api/?\s*\{' "$CONF"; then
    echo; echo "/api/ already uses ^~ in $CONF. Nothing to change here; check other server blocks / Cloudflare."
  else
    echo; echo "No plain 'location /api/ {' found in $CONF. Inspect manually (the API may be proxied differently)."
  fi
  exit 1
fi
echo
echo "Will change (only the location modifier):"
echo "$TARGETS"
grep -nE '^\s*location\s+~\*?\s' "$CONF" | sed 's/^/  regex location that currently wins: /' || true

if [ "$APPLY" != "--apply" ]; then
  echo
  echo "Dry run only. Re-run with --apply to back up, edit, test and reload."
  exit 0
fi

# 3. Backup, edit, validate, reload (or restore).
# Outside /etc/nginx: a copy left in sites-enabled/ would be loaded by "include sites-enabled/*".
mkdir -p /root/nginx-backups
BACKUP="/root/nginx-backups/$(basename "$CONF").$(date +%Y%m%d-%H%M%S)"
cp -pL "$CONF" "$BACKUP"
echo "Backup: $BACKUP"
sed --follow-symlinks -i -E 's#^(\s*)location(\s+)(/api/?)(\s*)\{#\1location\2^~ \3\4{#' "$CONF"
echo "Edited lines:"
grep -nE '^\s*location\s+\^~\s+/api/?\s*\{' "$CONF"

if nginx -t; then
  systemctl reload nginx
  echo "nginx -t passed; nginx reloaded."
else
  echo "nginx -t FAILED; restoring backup."
  cp -p "$BACKUP" "$CONF"
  nginx -t && echo "Original configuration restored (not reloaded)."
  exit 1
fi

# 4. Verify the exact URL that failed (through Cloudflare) and via the local origin.
echo
echo "Public check: $TEST_URL"
curl -sS -D - -o /dev/null "$TEST_URL" | grep -iE '^HTTP|^content-type|cf-cache-status' || true
echo
echo "Origin check (bypasses Cloudflare):"
curl -sS -k -D - -o /dev/null --resolve "$DOMAIN:443:127.0.0.1" "$TEST_URL" | grep -iE '^HTTP|^content-type' || true
echo
echo "Expect HTTP 200 and content-type image/png. If the origin is 200 but the public URL is still 404,"
echo "Cloudflare is serving a cached 404: purge that URL (Caching -> Configuration -> Custom Purge) and re-check."
