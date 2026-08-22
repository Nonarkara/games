#!/usr/bin/env bash
# scripts/verify-live.sh — confirm local HEAD == remote HEAD == live build.
#
# The single most important check after a build session. If these three
# disagree, production is serving something different from what the local
# working tree claims. (This is the bug Fable 5 caught: my "all the way"
# close said everything was synced when it was not.)
#
# Usage:
#   bash scripts/verify-live.sh                # report, exit 1 if out of sync
#   bash scripts/verify-live.sh --quiet        # no output unless out of sync

set -euo pipefail
cd "$(dirname "$0")/.."

QUIET=false
for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

say() { $QUIET || echo "$@"; }
fail() { echo "✗ $@"; exit 1; }

LOCAL=$(git rev-parse --short HEAD)
REMOTE=$(git rev-parse --short origin/codex/arcade-revival 2>/dev/null || echo "no-remote")

# Fetch the latest production deployment
say "▶ NGS live verification"
say "  local HEAD:  $LOCAL"
say "  remote HEAD: $REMOTE"

if [ "$LOCAL" != "$REMOTE" ]; then
  say ""
  say "✗ local and remote are out of sync"
  say "  local:  $LOCAL"
  say "  remote: $REMOTE"
  say "  → run: bash scripts/push.sh"
  exit 1
fi

# Live production deployment
if ! command -v npx >/dev/null 2>&1; then
  say ""
  say "  ⚠ npx not found — cannot check live build"
  exit 0
fi

# Parse the latest Production deployment's source commit.
# wrangler's `deployment list` output is a Unicode-bordered table. The
# column order is: Id | Environment | Branch | Source | Deployment | ...
# The Id is a UUID (cff09b72-8399-4f1d-...). The Source is a 7-char
# short SHA. We split on │ and pick field 5 (1-indexed: blank, Id, Env,
# Branch, Source, Deployment, Status, Build).
DEPLOY_LIST=$(npx wrangler pages deployment list --project-name=games 2>/dev/null || true)
DEPLOY_SOURCE=$(echo "$DEPLOY_LIST" \
  | awk -F'│' '/Production/ {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $5); print $5; exit}' \
  | head -1)

say "  live build:  ${DEPLOY_SOURCE:-unknown}"
say ""

if [ -z "$DEPLOY_SOURCE" ]; then
  say "  ⚠ could not read live build SHA from wrangler (output format may have changed)"
  exit 0
fi

if [ "$LOCAL" = "$DEPLOY_SOURCE" ]; then
  say "✓ all three in sync — local == remote == live"
  exit 0
fi

say "✗ local is ahead of live"
say "  local: $LOCAL"
say "  live:  $DEPLOY_SOURCE"
say "  → run: bash scripts/deploy.sh"
exit 1
