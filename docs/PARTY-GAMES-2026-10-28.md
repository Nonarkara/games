# Party chance games

Russian Roulette is screen-only: no weapon imagery or real-world instructions.
Pirate Barrel is an original implementation inspired by the Pop-Up Pirate
tabletop mechanism, with original inline SVG artwork and no copied assets.
Reference: https://www.walmart.com/ip/999794948

Both support 2–10 players, three slots per player, one fixed uniformly chosen
losing slot, explicit ready-to-pass handoff, locked terminal state and replay.
No money, drinking rules or leaderboard score. Quiet reveal is the default;
players can opt into a sudden pop or a single white stage reveal. No strobe,
audio blast or vibration. Reduced motion suppresses the pop animation.

Mechanics: `npm run test:party` exhausts every losing position for every player
count, plus arbitrary slot order, duplicates, invalid input and terminal locks.
Catalog, guide, search, preview, sprite and server registries include both games.

Geometry budget: actual modal at 390×844, 768×900, 1024×900, 1280×900,
1440×900. Turn/risk-to-first-action gap ≤180px; first action and replay above
the fold; no horizontal overflow. An isolated 900px stage mutation must fail
the same first-screen action gate. Long probability notes use native details.
An independent reviewer identified missing focus restoration after handoff;
ready now focuses the trigger or first unused slot. No content was removed.

The wider sweep found a pre-existing 4px header overflow at 768px. A narrow
761–820px rule removes redundant brand text while preserving the named home
link, search, play count and every header control; game content is untouched.
