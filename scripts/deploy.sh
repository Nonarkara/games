#!/usr/bin/env bash
# scripts/deploy.sh — NGS commit, push, deploy, test (cpdt, one command).
#
# What "ssdiy" means here: one operator-runnable script for the full
# deploy cycle. The local working tree is the source of truth; this script
# lints, tests, deploys, smokes, and prints the live URL.
#
# Usage:
#   bash scripts/deploy.sh            # deploy working tree to production
#   bash scripts/deploy.sh --dry      # lint + test, no deploy
#
# Why the versioned URL smoke (not the custom domain): the zone rewrites
# JS/CSS to max-age=14400 on games.nonarkara.org. The custom domain can
# serve 4h-stale assets after a deploy. games-bm7.pages.dev is the
# versioned alias and serves the new build immediately. Audit the
# versioned URL, not the custom domain.

set -euo pipefail
cd "$(dirname "$0")/.."

DRY_RUN=false
if [[ "${1:-}" == "--dry" ]]; then
  DRY_RUN=true
fi

ALIAS="games-bm7.pages.dev"
CANONICAL="https://${ALIAS}/"
PROJECT="games"
COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)

echo "▶ NGS deploy"
echo "  commit:  $COMMIT"
echo "  message: $COMMIT_MSG"
echo "  target:  $CANONICAL"
echo ""

# 1. Lint
echo "▶ Lint (node --check)"
for f in js/*.js js/games/*.js; do
  node --check "$f" || { echo "  ✗ lint fail: $f"; exit 1; }
done
echo "  ✓ js + js/games parse"
echo ""

# 2. Test
echo "▶ Test (npm test)"
npm test
echo ""

if $DRY_RUN; then
  echo "▶ Dry run — would deploy:"
  echo "  npx wrangler pages deploy . --project-name=$PROJECT --branch=main \\"
  echo "    --commit-dirty=true --commit-hash=$COMMIT --commit-message=\"$COMMIT_MSG\""
  echo "  (nothing pushed)"
  exit 0
fi

# 3. Deploy
echo "▶ Deploy (wrangler pages, production branch)"
npx wrangler pages deploy . --project-name="$PROJECT" --branch=main \
  --commit-dirty=true --commit-hash="$COMMIT" --commit-message="$COMMIT_MSG"

# 4. Smoke — versioned alias (immune to 4h-stale zone cache)
echo ""
echo "▶ Smoke test ($CANONICAL)"
sleep 2  # edge propagation beat
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$CANONICAL")
if [[ "$STATUS" != "200" ]]; then
  echo "  ✗ HTTP $STATUS from $CANONICAL"
  exit 1
fi
TITLE=$(curl -s "$CANONICAL" | grep -oE '<title>[^<]+' | head -1 | sed 's/<title>//')
if [[ "$TITLE" != *"Dr Non"* ]]; then
  echo "  ✗ title doesn't contain 'Dr Non': $TITLE"
  exit 1
fi
OG=$(curl -s "$CANONICAL" | grep -oE 'og:title" content="[^"]+' | head -1)
if [[ "$OG" != *"Dr Non"* ]]; then
  echo "  ✗ og:title doesn't contain 'Dr Non': $OG"
  exit 1
fi
APP_JS=$(curl -s -o /dev/null -w '%{http_code}' "${CANONICAL}js/app.js")
if [[ "$APP_JS" != "200" ]]; then
  echo "  ✗ js/app.js returned $APP_JS"
  exit 1
fi
echo "  ✓ HTTP 200"
echo "  ✓ title: $TITLE"
echo "  ✓ og:title: $OG"
echo "  ✓ js/app.js: $APP_JS"
echo ""

# 5. Print
echo "▶ Done."
echo "  Live (versioned, immune to zone cache): $CANONICAL"
echo "  Custom domain (4h-stale risk):          https://games.nonarkara.org/"
echo "  Commit: $COMMIT"

# 6. Post-deploy verify — local HEAD must match the new live build.
# This is the lesson from the Fable 5 audit: "always end a build session
# with bash scripts/deploy.sh" only works if the deploy actually shipped.
# This block fails loudly if the live build is behind HEAD.
if [[ -x scripts/verify-live.sh ]]; then
  echo ""
  echo "▶ Post-deploy verify"
  sleep 2  # let the edge propagate
  if bash scripts/verify-live.sh 2>&1 | tail -5; then
    echo "  ✓ local == live"
  else
    echo "  ⚠ local != live — re-run scripts/deploy.sh or check wrangler output"
    exit 1
  fi
fi
