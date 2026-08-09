# OmniArcade — games portal

**Live:** https://games.nonarkara.org (custom domain, added 2026-08-08) · alias https://games-bm7.pages.dev

## Competitive advantage (the real product)

The edge is **not** game count. Other portals already ship infinite free HTML5 titles.

OmniArcade wins on three things only Dr Non can host together:

1. **Brain Briefing on every cartridge** — skill practised, round length, coach tip, and the Simons caveat before play.
2. **Honesty as product** — near transfer is defended; far transfer is not sold. Papers stay visible.
3. **Labs** — Non-Trivial and Blow Into The Cartridge are personal packs no generic feed can copy.

Design follows **Axiom Design Core structure** (briefing → play, trunk rooms, one Divine Move) with a named **16-bit Play register**: dark CRT well `#0a0e14`, Press Start 2P + JetBrains Mono, one amber Move `#f59e0b`, scanline overlay, chunky cartridge cells. Editorial warm-paper Play was tried and rejected as too slick — 16-bit is the intentional surface.

## Sibling floors (network strip)

| Surface | URL | Status |
|---------|-----|--------|
| OmniArcade | https://games.nonarkara.org/ | Live · this repo |
| NST | https://nst.nonarkara.org/ | Live |
| 20 Minutes with Dr Non | https://open.spotify.com/show/0342w6de0LJk5wXCSNCqa3 | Emerging · banner in `public/20-minutes-with-dr-non.png` |

## Deploy (CDPT)

```bash
npx wrangler pages deploy . --project-name=games --commit-dirty=true
```

- Cloudflare Pages project `games`, account `74ad6bf8dfaaccf82de6f0847f7d2d54`, no CI — deploy is manual via wrangler OAuth.
- DNS: CNAME `games` → `games-bm7.pages.dev` (proxied) in zone `nonarkara.org` (`8809ee955a8edb681c34f45ed8f5b765`).
- ⚠️ The zone rewrites JS/CSS to `max-age=14400` on the custom domain. After a deploy, verify against the versioned `*.games-bm7.pages.dev` URL first; the custom domain can serve 4h-stale assets. Fixing it needs a token with Zone Settings:Edit — wrangler OAuth doesn't have it.

## Architecture

Plain ESM, no build. `index.html` shell → `js/app.js` (`gamesCatalog[]`, one entry per game, `renderer: renderXxx(container, onClose)`) → `js/games/*.js` suites. Shared: `ui.js` (GameSession timer/listener trap, ScopedKeyboard, showResult), `storage.js` (high scores + top-5 leaderboards with 5-letter initials), `analytics.js`, `audio.js`. `server.js` is the local dev server only (port 3000).

**Tetris conservation law:** canvas pixel size = `COLS × ROWS × BLOCK_SIZE` (10×20×24 = 240×480). A shorter canvas draws rows off-screen.

## Open-source adaptations (MIT)

| Game | Source | Notes |
|------|--------|-------|
| Breakout 1976 | kubowania/breakout | Adapted lifecycle + touch |
| Pong 1972 | jakesgordon/javascript-pong | Adapted lifecycle + touch |
| Sudoku Sprint | robatron/sudoku.js | Study only; boards original |
| Fifteen Puzzle | imshubhamsingh/15-puzzle | Study only; board original |

See `CREDITS.md`.

## Tests

```bash
npm test   # trivia conservation + open-source physics + guide coverage
npm run check
```

## Do not

- Use free accent colors outside the sanctioned Play-mode trunk subsystem
- Add shadows, glows, or fonts outside Press Start 2P + JetBrains Mono (16-bit register)
- Touch `js/games/labsGames.js` content (Dr Non's personal packs — earned content)
- Claim brain-training transfer beyond what THE HONEST VERSION section's citations support
- Iframe third-party games — adapt into the shared briefing → play lifecycle
