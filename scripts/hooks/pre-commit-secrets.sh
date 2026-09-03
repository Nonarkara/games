#!/bin/sh
# Blocks a commit if a staged file matches a known live-key pattern.
# Never prints the matched value. Doctrine Law 4.

PATTERNS='AIza[0-9A-Za-z_-]{30,}|nvapi-[0-9A-Za-z_-]{20,}|sk-ant-[0-9A-Za-z_-]{20,}|sk-proj-[0-9A-Za-z_-]{20,}|gsk_[0-9A-Za-z]{20,}|cfoat_[0-9A-Za-z]{20,}|[0-9]{8,10}:AA[0-9A-Za-z_-]{30,}|eyJhbGciOi[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}'

FAIL=0
for f in $(git diff --cached --name-only --diff-filter=ACM); do
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.pdf|*.woff|*.woff2|*.ico|*.mp4|*.mp3) continue ;;
  esac
  if git show ":$f" | grep -qE "$PATTERNS"; then
    echo "BLOCKED: $f matches a live-key pattern. Move it to .env (gitignored). If it ever touched history, ROTATE it."
    FAIL=1
  fi
done

if [ "$FAIL" = "1" ]; then
  echo "Commit refused: secrets never enter history."
  exit 1
fi
exit 0
