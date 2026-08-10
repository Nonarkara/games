#!/usr/bin/env bash
# scripts/install-hooks.sh — install the git hooks shipped in scripts/hooks/.
#
# Why this exists: .git/hooks/ is not tracked by git. The hooks ship in
# scripts/hooks/ and are installed by this script. Idempotent — running
# it again replaces the hook with the shipped version.
#
# Usage:
#   bash scripts/install-hooks.sh           # install all hooks
#   bash scripts/install-hooks.sh --list    # list available hooks

set -euo pipefail
cd "$(dirname "$0")/.."

LIST=false
for arg in "$@"; do
  case "$arg" in
    --list) LIST=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if $LIST; then
  echo "Available hooks in scripts/hooks/:"
  for f in scripts/hooks/*; do
    [ -f "$f" ] && echo "  $(basename "$f")"
  done
  exit 0
fi

HOOKS_DIR=".git/hooks"
mkdir -p "$HOOKS_DIR"

INSTALLED=0
for src in scripts/hooks/*; do
  [ -f "$src" ] || continue
  name=$(basename "$src")
  dest="$HOOKS_DIR/$name"
  cp "$src" "$dest"
  chmod +x "$dest"
  echo "  ✓ installed $name → $dest"
  INSTALLED=$((INSTALLED + 1))
done

if [ "$INSTALLED" -eq 0 ]; then
  echo "  ⚠ no hooks found in scripts/hooks/"
  exit 1
fi

echo ""
echo "✓ $INSTALLED hook(s) installed. They will run on every commit / push."
