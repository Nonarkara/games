#!/usr/bin/env bash
# scripts/push.sh — push the local branch to origin safely (ssdiy operator).
#
# Usage:
#   bash scripts/push.sh                    # push current branch
#   bash scripts/push.sh --dry              # show what would be pushed
#   bash scripts/push.sh --force            # force-push (dangerous, explicit)
#
# What it does:
#   1. Refuses to push if the working tree is dirty (unless --force)
#   2. Refuses to push to main/master without --force
#   3. Shows the diff stat + commit list that will go up
#   4. Confirms with the operator before pushing
#   5. Pushes, fetches back, and reports the new remote HEAD

set -euo pipefail
cd "$(dirname "$0")/.."

DRY=false
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --dry) DRY=true ;;
    --force) FORCE=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE=${REMOTE:-origin}
REMOTE_BRANCH="${REMOTE}/${BRANCH}"

# Refuse to push to main/master unless --force
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]] && ! $FORCE; then
  echo "  ✗ refusing to push to '$BRANCH' without --force"
  exit 1
fi

# Status
echo "▶ NGS push"
echo "  branch: $BRANCH → $REMOTE_BRANCH"
echo ""

# Dirty check
if ! git diff --quiet HEAD 2>/dev/null; then
  if $FORCE; then
    echo "  ⚠ working tree dirty (proceeding because --force)"
  else
    echo "  ✗ working tree dirty. Commit first, or use --force"
    git status --short
    exit 1
  fi
fi

# What's about to go up
AHEAD=$(git rev-list --count "${REMOTE_BRANCH}..HEAD" 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count "HEAD..${REMOTE_BRANCH}" 2>/dev/null || echo "?")
echo "  ahead: $AHEAD commit(s), behind: $BEHIND commit(s)"
echo ""
echo "▶ commits that will be pushed:"
git log --oneline "${REMOTE_BRANCH}..HEAD" 2>/dev/null || git log --oneline -5
echo ""

if $DRY; then
  echo "▶ Dry run — no push"
  exit 0
fi

# Confirm
read -p "  push $AHEAD commit(s) to $REMOTE_BRANCH? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "  cancelled"
  exit 0
fi

# Push
echo ""
echo "▶ pushing"
git push "$REMOTE" "$BRANCH"

# Fetch back to confirm
git fetch "$REMOTE" "$BRANCH" 2>/dev/null || true
NEW_HEAD=$(git rev-parse --short "${REMOTE_BRANCH}")
echo ""
echo "▶ Done."
echo "  remote HEAD: $REMOTE_BRANCH @ $NEW_HEAD"
