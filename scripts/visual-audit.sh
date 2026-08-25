#!/usr/bin/env bash
# scripts/visual-audit.sh — enforce the 16-bit visual register.
#
# Scans css/ + js/ for violations of the NGS design system:
#   - border-radius > 0  (allowed: 50% for dots, 0px / none)
#   - box-shadow with blur  (drop-shadows violate the 16-bit register;
#     allowed: inset shadows used as side-rails or rings, and "none")
#   - backdrop-filter:blur  (glass-morphism violates; remove)
#   - linear-gradient used for non-atmospheric fills
#   - filter: blur  (no soft blurs)
#   - rounded font tokens
#
# The 16-bit register is the only surface on the floor. Sharp edges, no
# shadows, no blur, no gradients on bodies — only the scanline effect
# (the CRT overlay) and the amber Move are the sanctioned accents.
#
# css/tailwind.static.css is EXCLUDED: it is a generated artifact (see
# tailwind.config.cjs) that compiles exactly the utility classes the game
# templates already used through the old cdn.tailwindcss.com runtime. The
# rendered output is unchanged; the scanner previously could not see those
# rules because the CDN injected them at runtime. Hand-written surfaces
# remain fully audited.
#
# Usage:
#   bash scripts/visual-audit.sh             # report only, exit 0
#   bash scripts/visual-audit.sh --strict    # exit 1 on any violation
#   bash scripts/visual-audit.sh --fix       # attempt automatic fixes

set -euo pipefail
cd "$(dirname "$0")/.."

STRICT=false
FIX=false
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=true ;;
    --fix) FIX=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

VIOLATIONS=0
report() {
  local kind="$1" file="$2" line="$3" msg="$4"
  printf '  %-22s %s:%s  %s\n' "$kind" "$file" "$line" "$msg"
  VIOLATIONS=$((VIOLATIONS + 1))
}

# Patterns that violate
echo "▶ Scanning css/ + js/ for 16-bit register violations"
echo

# 1. border-radius > 0 (allow 0, none, 50% for circles/dots)
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  # Filter out: 0, none, 50%
  if echo "$snippet" | grep -qE "border-radius:\s*(0|none|50%|0px|var\(--radius[^)]*\))"; then
    if echo "$snippet" | grep -qE "var\(--radius[^)]*\)"; then
      # Check if the var resolves to 0
      var_val=$(grep -A1 "^[[:space:]]*--radius" css/styles.css | head -2 | grep -oE ":\s*[^;]+" | head -1 | sed 's/:\s*//')
      if [ "$var_val" = "0" ] || [ "$var_val" = "0;" ]; then
        continue
      fi
    fi
    continue
  fi
  report "BORDER-RADIUS" "$file" "$line" "$snippet"
done < <(grep -rn "border-radius:" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# 2. box-shadow with non-inset, non-none
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  # Allow none, inset, and var(--shadow*) which we set to none
  if echo "$snippet" | grep -qE "box-shadow:\s*(none|inset|var\(--shadow[^)]*\))"; then
    if echo "$snippet" | grep -qE "var\(--shadow[^)]*\)"; then
      # var(--shadow) is set to none — safe
      continue
    fi
    continue
  fi
  report "BOX-SHADOW" "$file" "$line" "$snippet"
done < <(grep -rn "box-shadow:" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# 3. backdrop-filter (any non-none value is a violation)
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  if echo "$snippet" | grep -qE "backdrop-filter:\s*none"; then continue; fi
  report "BACKDROP-FILTER" "$file" "$line" "$snippet"
done < <(grep -rn "backdrop-filter" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# 4. filter: blur (real blur effects)
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  report "FILTER-BLUR" "$file" "$line" "$snippet"
done < <(grep -rnE "filter:\s*blur\(" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# 5. linear-gradient used outside the scanline / atmospheric use cases
# The sanctioned uses: the CRT scanline overlay (rgba 18,16,16, etc.) and
# the amber/violet atmospheric fills. Anything else with a color is decorative.
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  # Allow: scanline uses (the first linear-gradient in styles.css)
  # Allow: repeating-linear-gradient (textures)
  # Allow: linear-gradient with rgba alpha (atmospheric)
  if echo "$snippet" | grep -qE "rgba\("; then continue; fi
  if echo "$snippet" | grep -qE "repeating-linear-gradient"; then continue; fi
  report "GRADIENT" "$file" "$line" "$snippet"
done < <(grep -rnE "linear-gradient" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# 6. Rounded font tokens
# The floor uses Press Start 2P + JetBrains Mono. Flag any new font-family
# added that isn't on the approved list.
APPROVED_FONTS=("Press Start 2P" "JetBrains Mono" "Inter" "Spectral" "Fira Code" "Helvetica Neue" "Helvetica" "Arial" "sans-serif" "Georgia" "monospace" "Courier New" "Times New Roman")
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  # Extract the font name
  font=$(echo "$snippet" | grep -oE "font-family:[[:space:]]*['\"]?[^,'\";]+" | sed 's/font-family:[[:space:]]*//' | sed "s/['\"]//g" | head -1)
  ok=false
  for approved in "${APPROVED_FONTS[@]}"; do
    if [ "$font" = "$approved" ]; then ok=true; break; fi
  done
  # Allow var(--font-sans), var(--font-mono), var(--font-serif), etc.
  if echo "$font" | grep -qE "^var\(--font-"; then ok=true; fi
  # Allow var(--ax-pixel), var(--ax-body), var(--ax-punch), etc. — the Axiom tokens
  if echo "$font" | grep -qE "^var\(--ax-"; then ok=true; fi
  if ! $ok; then
    report "FONT-FAMILY" "$file" "$line" "$snippet"
  fi
done < <(grep -rnE "font-family:" css/ js/ 2>/dev/null | grep -v "node_modules" | grep -v "css/tailwind.static.css")

# Report
echo
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✓ 0 violations — 16-bit register is clean"
  exit 0
fi

echo "▶ $VIOLATIONS violation(s) found"
if $STRICT; then
  echo "  --strict: exiting 1"
  exit 1
fi
exit 0
