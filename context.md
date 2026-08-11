# NGS — Non-Gaming System

**Rebrand LIVE (2026-08-10).** https://games.nonarkara.org now serves NGS.
The npm package is still named `omni-arcade` internally (deliberate — Dr Non
said not to rename it without his say-so); every user-visible surface is NGS.

⚠️ **Deploying to the custom domain requires `--branch=main`.** `wrangler pages
deploy` infers the branch from git, so running it from `codex/arcade-revival`
publishes a **Preview** deploy that never reaches games.nonarkara.org. That is
exactly how the site sat on a stale build for a day. Always use
`bash scripts/deploy.sh`, which pins `--branch=main`.

## Phase 6: Server-backed leaderboard (2026-08-10)

Server scaffold is in. Run `bash scripts/server-init.sh` to provision
the D1 database + apply the schema + patch `wrangler.jsonc`. Run
`bash scripts/deploy.sh` to ship.

Files:

- `wrangler.jsonc` — D1 binding `DB` → `ngs-leaderboard` (database_id
  is the placeholder until `server-init.sh` runs)
- `migrations/0001_init.sql` — two tables: `sessions` (5-min one-time
  tokens, marked used on consume) and `scores` (UNIQUE session_id
  prevents double-submit)
- `functions/api/session.js` — `POST { game_id }` → `{ session_id,
  expires_at, game_id }`. Rate-limited 1 per IP per 2s.
- `functions/api/leaderboard.js` — `GET ?game_id=X` for public read;
  `POST { game_id, initials, score, session_id }` to submit. Validates
  session + initials (`/^[A-Z0-9]{4}$/`) + score (`0 <= score <=
  GAME_MAX[game_id]`). `GAME_MAX` is the authoritative per-game ceiling;
  a cheater who invents a session still can't post above it.
- `scripts/server-init.sh` — operator: create D1, patch wrangler.jsonc,
  apply schema, print the binding.
- `js/storage.js` — adds `submitScoreToServer` + `fetchLeaderboardFromServer`
  (async, 5s timeout, never throws). `submitScore` is fire-and-forget
  server-side; the result-screen also refreshes from the server after a
  successful local submit so the canonical top-5 replaces the local one
  if it differs.
- `js/ui.js` — `form.onsubmit` paints the local board first, then
  asynchronously swaps in the server board if the GET succeeds.

End-to-end: a cheater who calls `/api/leaderboard` directly with a
fake session still hits the per-game max. They can poison one entry
per game to the legit ceiling; they cannot flood. The `UNIQUE
(session_id)` constraint is the backstop.

## Phase 5: 3 new brain games (2026-08-10)

`js/games/ngsNewTrainers.js` adds three research-grade cognitive tasks
to the TRAIN wing:

- **Trail Making Test** (Reitan 1958) — Part A `1→2→3…`, Part B
  `1→A→2→B alternating`. Errors reset the trail to that point so they
  cost real time. Score = time-based (server stores inverted).
- **Mental Rotation** (Shepard & Metzler 1971, 2D simplification) —
  two shapes side by side; click SAME (rotated) or MIRROR (reflected).
  20 trials × 8s.
- **Iowa Gambling Task** (Bechara 1994) — 40 draws from 4 decks.
  Decks A/B punish hard, C/D pay small reliably. Score = net profit
  + 1000 (range 0..2000).

Operator: `bash scripts/new-game.sh <id> <code> <title> <wing>
<category> <domain> <age> <desc> [paper]` scaffolds a new game file +
patches `js/app.js`, `js/brainGuides.js`, `js/storage.js`. Idempotent,
runs `node --check` + the brainGuides test at the end. Proven
end-to-end on a throwaway id.

## SSDIY operator surface (Phase 4b, 2026-08-10)

`scripts/deploy.sh` is the one-command cpdt cycle:

```bash
bash scripts/deploy.sh         # lint + test + wrangler deploy + smoke
bash scripts/deploy.sh --dry   # lint + test, no deploy
```

It lints every `js/*.js` and `js/games/*.js` with `node --check`, runs
`npm test`, deploys via `wrangler pages deploy . --branch=main
--commit-dirty=true --commit-hash=$(git rev-parse --short HEAD)`, then
smokes the versioned `*.pages.dev` alias (NOT the custom domain — the
zone cache rewrites JS/CSS to max-age=14400 on `games.nonarkara.org`,
4h-stale risk). Smoke checks HTTP 200, `<title>` contains "Dr Non",
`og:title` contains "Dr Non`, and `js/app.js` returns 200.

Two more operators landed with Phases 5 + 6:

- `bash scripts/new-game.sh <args>` — scaffold a new game end-to-end
  (writes the renderer, patches the catalog, brain guide, storage
  high-score key, runs the test). Idempotent.
- `bash scripts/server-init.sh` — provision the D1 leaderboard
  backend (create DB, patch wrangler.jsonc, apply schema). Idempotent.

## Phase 4: 4-letter initials (2026-08-10)

- `js/storage.js`:
  - `STORAGE_KEY` renamed to `ngs_data_v1`
  - `LEGACY_KEY = 'omni_arcade_data_v1'` for one-time read-then-delete
  - `MIGRATION_KEY = 'ngs_migrated_v2'` flag so the migration runs exactly once
  - `INITIALS_LEN = 4` constant
  - `migrateLegacyOnce()` runs at the top of `getData()` — slices any
    5-letter initials on legacy leaderboard entries to 4, copies to the
    new key, removes the old key, sets the flag. Idempotent, non-throwing,
    corrupt-legacy safe (just starts clean).
  - `submitScore` slices to 4, default fallback `AAAA`
- `js/ui.js`:
  - `maxlength="5"` → `4`, `placeholder="AAAAA"` → `AAAA`
  - `input.oninput` now slices to 4 in the live filter (so the user can't
    type a 5th letter and have it silently dropped at submit time)
- About copy already pre-staged in Phase 3 ("sign the board with four letters")

## About deepened (Phase 3, 2026-08-10)

`js/games/about.js` rewritten as a MITF-voice essay, ~700 words. The thread
is "love for games" — Dr Non's personal arc from Bangkok lanes in the 80s
through Dragon Quest on the Famicom (dad brought from Singapore, he saved
for the cartridges) through the IBM laptop mom brought home from the bank
(middle school, taught himself HTML/BASIC) through CM/SimCity/ISS in high
school through AFS Dallas 1998 (Zidane headbutt, Beckham red) through MIT
Wii 2007 to the 2026 World Cup closing the loop (country he first lived in
at 17) and the Switch 2 last July.

Structure: punchline → lanes → first machine → computer age → 2007/now →
counter ("Games are killing time") → "So what. Three moves." → "Play." →
"— Dr Non, Bangkok, 2026". The three moves carry the NGS thesis:

1. NGS exists because games taught me to think — brain expansion, not game system
2. Every cartridge is built on the five frameworks (Kahneman, Werbach,
   Thaler, neuroplasticity, Atomic Habits) — love alone isn't enough, you
   need a science
3. Sign with four letters. Come back. Beat yourself. The loop. The system.

CSS additions in `css/styles.css` for the new about elements:
- `.about-punch` — opening line, red emphasis
- `.about-h` — section h3, hairline divider above
- `.about-sig` — italic signature

The MIT Wii photo is preserved; the figcaption reads "Playing Wii @ MIT,
2007. The research question was already forming."

## Rebrand landed (Phase 2, 2026-08-10)

The product is now `Dr Non — Non-Gaming System (NGS)`. "OmniArcade" was the
codename — the work-in-progress local branch and the future live deploy are
both under the new name. The brand:

- Title tag: `Dr Non — Non-Gaming System · Brain expansion, not killing time`
- Hero h1: `NOT A / GAME SYSTEM` (two-line dramatic)
- Hero line: `Brain expansion, not killing time.`
- Header brand disc: `NG`, title `DR NON`, subtitle `NON-GAMING SYSTEM`
- Status bar: `NON-GAMING SYSTEM · BRAIN EXPANSION · 16-BIT · NO LOGIN · NO ADS`
- Edge-strip: now 4 panels (BRIEFING · HONESTY · STACK · LABS), kicker
  `THE STACK`, h2 `Not a game system. A brain expansion system.`
- Footer: `DR NON — Non-Gaming System · Brain expansion, not killing time.`
- Schema.org: `name = "Dr Non — Non-Gaming System"`, `alternateName = ["NGS", "Dr Non NGS"]`, `creator.alternateName = "Dr Non"`

Internal identifiers kept for now (no destructive changes — data migration
plan deferred to Phase 6):

- `package.json` name: `omni-arcade` (Dr Non said not to rename without say-so)
- `STORAGE_KEY = 'omni_arcade_data_v1'` in storage.js (data is on user's device)
- `LOG_KEY = 'omni_arcade_analytics_v1'` in analytics.js
- `class NgsApp` is the new app class; old `OmniArcadeApp` is gone

## The stack (Phase 1, shipped 2026-08-10)

`js/theory.js` defines THE STACK — the five theoretical frameworks that
hold the product up:

1. **Kahneman & Tversky** — System 1 / System 2 (Tversky & Kahneman 1974;
   Kahneman 2011). Every Stroop / Go-No-Go / Flanker drill is System 2
   override of System 1. Tetris / Pac-Man / Aim Trainer train System 1.
2. **Werbach & Hunter** — Gamification (Werbach & Hunter 2012 *For the Win*;
   Werbach's Coursera "Gamification" course). PBL triad (Points / Badges /
   Leaderboards) and MDA framework (Mechanics → Dynamics → Aesthetics).
3. **Thaler & Sunstein** — Nudge + EAST (Thaler & Sunstein 2008; Service
   et al. 2014). Every screen in NGS is a choice architecture — easy,
   attractive, social, timely.
4. **Neuroplasticity** — Maguire 2000 (London taxi drivers); Draganski 2004;
   Doidge 2007. The hope that practice changes the brain; the honest
   counter-claim that far transfer is contested (Simons 2016 stays on every
   briefing).
5. **James Clear** — *Atomic Habits* (2018). Cue → Craving → Response →
   Reward. The 4-letter initial is the identity. The daily cartridge is the
   cue. The 2-minute rule is why every round fits between meetings.

Each `BRAIN_GUIDES[game]` entry in `js/brainGuides.js` now carries a
`stack: [...]` array of framework IDs it exercises. Helpers:
- `frameworksForGame(id)` — resolved full entries
- `buildBriefing(game)` — full briefing object the next surface will use
  (label + minutes + practice + why + tip + frameworks + paper + caveat)

The rebrand copy and the "Why NGS" surface are wired in Phase 2.

**Live:** https://games.nonarkara.org (custom domain, added 2026-08-08) · alias https://games-bm7.pages.dev

## Competitive advantage (the real product)

The edge is **not** game count. Other portals already ship infinite free HTML5 titles.

NGS wins on three things only Dr Non can host together:

1. **Brain Briefing on every cartridge** — skill practised, round length, coach tip, and the Simons caveat before play.
2. **Honesty as product** — near transfer is defended; far transfer is not sold. Papers stay visible.
3. **Labs** — Non-Trivial and Blow Into The Cartridge are personal packs no generic feed can copy.

Design follows **Axiom Design Core structure** (briefing → play, trunk rooms, one Divine Move) with a named **16-bit Play register**: dark CRT well `#0a0e14`, Press Start 2P + JetBrains Mono, one amber Move `#f59e0b`, scanline overlay, chunky cartridge cells. Editorial warm-paper Play was tried and rejected as too slick — 16-bit is the intentional surface.

## Deploy (CDPT)

```bash
npx wrangler pages deploy . --project-name=games --commit-dirty=true
```

- Cloudflare Pages project `games`, account `74ad6bf8dfaaccf82de6f0847f7d2d54`, no CI — deploy is manual via wrangler OAuth.
- DNS: CNAME `games` → `games-bm7.pages.dev` (proxied) in zone `nonarkara.org` (`8809ee955a8edb681c34f45ed8f5b765`).
- ⚠️ The zone rewrites JS/CSS to `max-age=14400` on the custom domain. After a deploy, verify against the versioned `*.games-bm7.pages.dev` URL first; the custom domain can serve 4h-stale assets. Fixing it needs a token with Zone Settings:Edit — wrangler OAuth doesn't have it.

## Architecture

Plain ESM, no build. `index.html` shell → `js/app.js` (`gamesCatalog[]`, one entry per game, `renderer: renderXxx(container, onClose)`) → `js/games/*.js` suites. Shared: `ui.js` (GameSession timer/listener trap, ScopedKeyboard, showResult), `storage.js` (high scores + top-5 leaderboards with 4-letter initials, D1-backed via functions/api), `analytics.js`, `audio.js`. `server.js` is the local dev server only (port 3000).

**Tetris conservation law:** canvas pixel size = `COLS × ROWS × BLOCK_SIZE` (10×20×24 = 240×480). A shorter canvas draws rows off-screen.

## Open-source adaptations (MIT)

| Game | Source | Notes |
|------|--------|-------|
| Breakout 1976 | kubowania/breakout | Adapted lifecycle + touch |
| Pong 1972 | jakesgordon/javascript-pong | Adapted lifecycle + touch |
| Sudoku Sprint | robatron/sudoku.js | Study only; boards original |
| Fifteen Puzzle | imshubhamsingh/15-puzzle | Study only; board original |
| Warehouse Push | straker/basic-sokoban | CC0 format/movement study; levels + engine original |

See `CREDITS.md`.

## Tests

```bash
npm test   # trivia + open-source physics + mechanics + guides + scores + leaderboard
npm run check
npm run smoke  # all 69 playable carts at the requested viewport
```

## Do not

- Use free accent colors outside the sanctioned Play-mode trunk subsystem
- Add shadows, glows, or fonts outside Press Start 2P + JetBrains Mono (16-bit register)
- Touch `js/games/labsGames.js` content (Dr Non's personal packs — earned content)
- Claim brain-training transfer beyond what THE HONEST VERSION section's citations support
- Iframe third-party games — adapt into the shared briefing → play lifecycle


## Phase 7: 16-bit visual audit (2026-08-10)

`scripts/visual-audit.sh` is the operator for the design register. Scans
`css/` + `js/` for: non-zero `border-radius`, drop `box-shadow`,
`backdrop-filter`, `filter: blur`, decorative `linear-gradient`, and
unapproved fonts. Supports `--strict` (exit 1 on any violation) and
`--fix` (auto-fix where possible).

Final audit: **0 violations**. The 16-bit register is consistent
across the floor.

Pass details:
- Removed `backdrop-filter: blur(6px)` on the modal — replaced with a
  solid background.
- Fixed `border-radius: 12px !important` on a code chip → 0.
- `Josefin Sans` (headings) → `Press Start 2P`.
- `Source Sans 3` (body) → `Inter`.
- Token vars (`--radius`, `--shadow-*`) were already 0 / none — no
  decay to fix there.

## Push operator (Phase 8 part 2, 2026-08-10)

`scripts/push.sh` is the safe-push operator. Refuses to push to
main/master without `--force`, refuses dirty working trees, shows the
commit list that will go up, asks for confirmation, then pushes and
fetches back to report the new remote HEAD. Used to land the
4-commit backlog on `origin/codex/arcade-revival` (the local was 4
commits ahead of remote).

## Pre-commit hook (Phase 8 part 3, 2026-08-10)

`.git/hooks/pre-commit` runs `scripts/visual-audit.sh --strict` on
every commit. If the 16-bit register is violated, the commit is
blocked. The 16-bit register is now enforced going forward, not just
measured.
## Human audit pass (2026-08-10, Fable 5)

Walked the live floor as a visitor, desktop, with a contrast meter. Fixed and
shipped: amber attract panel now wears dark lettering (was white at 1.8–2.2:1),
PLAYS counter was invisible (1.08:1) on the light header band, WHY/SOUND
legibility. All 67 cartridges launch clean including the 13 newest (CRT, Raven,
Sternberg, ANS, WCST, Tower of London, Mind in the Eyes, 6 drinking); WCST
play-tested. Deploy discipline note: HEAD had sat undeployed — always finish a
build session with `bash scripts/deploy.sh`.

**Queued (blocked by Cloudflare dashboard outage):** zone Browser Cache TTL →
"Respect Existing Headers" via the dashboard (wrangler OAuth lacks Zone
Settings:Edit). Kills the 4h stale-asset window for every nonarkara.org
subdomain. Retry at dash.cloudflare.com → nonarkara.org → Caching →
Configuration when their console recovers.


## Lesson: always end a build session with deploy + verify (Fable 5 audit)

The Fable 5 human-audit pass caught a real bug: my "all the way" close
claimed `local == remote == live` and it was not — HEAD was sitting
undeployed while production served a day-old build. A real visitor
that night would have seen "DR NON" rendered invisible (1.08:1
contrast on the header band).

The lesson, encoded:
- Every build session ends with `bash scripts/deploy.sh` (not a
  smoke test, the actual wrangler pages deploy).
- `scripts/deploy.sh` now calls `scripts/verify-live.sh` at the end
  and fails loudly if local HEAD does not match the live build.
- `scripts/verify-live.sh` is the single source of truth for
  "is production on the build I think it is?" — runs in two modes:
    - report (default): prints local/remote/live and exits 1 if any disagree
    - CI gate: a future CI step can run it on every PR
- Rule: never claim a session is "all the way" without running
  verify-live and seeing the three lines aligned.

A real headless deploy to production should be a single command that
returns 0 only if production is serving the local HEAD. Anything less
is theater.

## Mechanics + discovery audit (2026-08-11)

Floor: **70 catalog entries / 69 playable carts**.

Added three mechanics that were not already represented:
- Stop Signal: 24-trial adaptive cancellation task; staircase delay stays
  inside 100–500 ms and uses a documented Logan 1984 source.
- Warehouse Push: three solvable touch/keyboard rooms, undo/reset, CC0 source
  credit, and a reachability test for every shipped level.
- Lights Out: generated-by-press solvable boards, parity-aware hints that stay
  valid after player moves, reset, and reversible-state tests.

Corrected rule-fidelity defects found by source audit:
- WCST no longer prints the hidden sorting dimension on its buckets; fixed the
  count comparison that could never score; stable reference cards now carry
  the hidden rule.
- Tower of London now uses the real 3/2/1 peg-capacity constraint, not Tower of
  Hanoi's size ordering. Every target gets a BFS-derived minimum-move par.
- Mind in the Eyes Lite no longer puts the answer first on every trial and is
  explicitly framed as a schematic vocabulary drill, not the validated RMIE.
- Type Rush signs the board with the WPM shown to the player, not a hidden
  WPM×10 + accuracy composite that the leaderboard ceiling rejected.

Discovery is deliberately non-coercive: QUICK HIT removes time uncertainty,
PICK FOR ME uses the least-practised category, SURPRISE prefers unplayed carts,
and cards show NEW / PLAYED state. Closing a briefing without starting no
longer marks the cart as played.

Audit coverage:
- `js/games/mechanics.test.mjs` checks WCST mappings, Tower rules + par,
  randomized social-inference options, stop staircase bounds, warehouse
  reachability, Lights Out reversibility/solvability, and WPM scoring.
- `scripts/browser-smoke.mjs` now opens every briefing, starts every renderer,
  checks non-empty layout + horizontal overflow, exits each session, and fails
  on browser errors. Passed all 69 carts at 390×844 and 1440×900.
- The full sweep exposed and fixed phone overflow in Stroop, Type Rush, Snake,
  Space Defender, AI Game Builder, Anagram, and Word Builder.
- Production replay also caught Stroop's longest random word escaping its
  display box; the smoke test now waits for web fonts and reports overflow
  offenders so random/font-dependent failures are reproducible.
