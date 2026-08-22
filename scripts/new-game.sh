#!/usr/bin/env bash
# scripts/new-game.sh — scaffold a new NGS game end-to-end (ssdiy operator).
#
# Usage:
#   bash scripts/new-game.sh <id> <code> <title> <wing> <category> <domain> <age> <desc> [paper]
#
# Example (the Trail Making Test I added in Phase 5):
#   bash scripts/new-game.sh trail-making TMT "Trail Making" train memory-focus "Task switching" "Teen+" \
#     "Part A: 1→2→3… Part B: 1→A→2→B alternating. Errors reset the trail." "Reitan 1958"
#
# What it does:
#   1. Writes a minimal js/games/<id>.js with the renderer contract
#   2. Patches js/app.js — adds the import and a catalog entry in the right wing
#   3. Patches js/brainGuides.js — adds a default guide with a Kahneman-heavy stack
#   4. Patches js/storage.js — adds the high-score key
#   5. Runs node --check + the brainGuides test
#
# After running: open the new js/games/<id>.js and replace the placeholder
# renderer with your game logic. The contract is `renderXxx(container, onClose)`.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ $# -lt 8 ]]; then
  echo "usage: $0 <id> <code> <title> <wing> <category> <domain> <age> <desc> [paper]" >&2
  echo "  id      — kebab-case slug, e.g. trail-making" >&2
  echo "  code    — 3-letter cabinet code, e.g. TMT" >&2
  echo "  title   — display title, e.g. \"Trail Making\"" >&2
  echo "  wing    — train | arcade | learn | labs | meta" >&2
  echo "  category — e.g. memory-focus, skills, math-logic, classics" >&2
  echo "  domain  — short label for the skill, e.g. \"Task switching\"" >&2
  echo "  age     — All | 5+ | 7+ | 8+ | 10+ | 12+ | Teen+ | 18+ | Party | Friends" >&2
  echo "  desc    — short description for the cartridge" >&2
  echo "  paper   — optional paper label, e.g. \"Reitan 1958\"" >&2
  exit 1
fi

ID="$1"; CODE="$2"; TITLE="$3"; WING="$4"; CATEGORY="$5"; DOMAIN="$6"; AGE="$7"; DESC="$8"
PAPER="${9:-}"

RENDER_CAMEL="render$(echo "$ID" | awk -F- '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2)}1' OFS='')"
GAME_FILE="js/games/${ID}.js"

# 1. Game file stub
cat > "$GAME_FILE" <<EOF
/**
 * Dr Non — Non-Gaming System · ${TITLE}
 * Auto-scaffolded by scripts/new-game.sh.
 * Paper: ${PAPER:-n/a}. Stack tags: see js/brainGuides.js.
 *
 * Replace the placeholder renderer below with your game logic.
 * Contract: ${RENDER_CAMEL}(container, onClose).
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

export function ${RENDER_CAMEL}(container, onClose) {
  // Placeholder round. Replace with your game.
  let score = 0, round = 0;
  const tick = () => {
    round++;
    score += 10;
    container.innerHTML = \`
      <div class="\${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">${TITLE}</h2>
          <p class="text-[10px] text-amber-500/80 uppercase">${DOMAIN}</p></div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <p class="text-zinc-200 text-sm mb-4">Round \${round}. Score \${score}.</p>
        <button id="hit" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">HIT</button>
      </div>\`;
    container.querySelector('#close-game-btn').onclick = () => onClose();
    container.querySelector('#hit').onclick = () => { soundFx.playCoin(); tick(); };
    if (round >= 10) {
      showResult({ container, title: '${TITLE} DONE', message: \`\${round} rounds.\`, score, gameId: '${ID}', tone: 'win', onRestart: () => ${RENDER_CAMEL}(container, onClose), onClose });
    }
  };
  tick();
}
EOF
echo "  ✓ wrote $GAME_FILE"

# 2-4. Patch app.js, brainGuides.js, storage.js via a single Python call.
# Python receives all the values via argv (no shell interpolation in source).
python3 scripts/_new_game_patch.py \
  --id "$ID" --code "$CODE" --title "$TITLE" --wing "$WING" \
  --category "$CATEGORY" --domain "$DOMAIN" --age "$AGE" \
  --desc "$DESC" --paper "$PAPER" --renderer "$RENDER_CAMEL"

# 5. Verify
echo ""
echo "▶ Verify"
for f in js/app.js js/brainGuides.js js/storage.js "$GAME_FILE"; do
  node --check "$f" || { echo "  ✗ lint fail: $f"; exit 1; }
done
echo "  ✓ all files parse"

node js/brainGuides.test.mjs
echo ""
echo "▶ Done. Open $GAME_FILE and replace the placeholder renderer."
echo "  Then run: bash scripts/deploy.sh --dry"
