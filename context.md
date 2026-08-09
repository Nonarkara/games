# OmniArcade — games portal

**Live:** https://games.nonarkara.org (custom domain, added 2026-08-08) · alias https://games-bm7.pages.dev

## Deploy (CDPT)

```bash
npx wrangler pages deploy . --project-name=games --commit-dirty=true
```

- Cloudflare Pages project `games`, account `74ad6bf8dfaaccf82de6f0847f7d2d54`, no CI — deploy is manual via wrangler OAuth.
- DNS: CNAME `games` → `games-bm7.pages.dev` (proxied) in zone `nonarkara.org` (`8809ee955a8edb681c34f45ed8f5b765`).
- ⚠️ The zone rewrites JS/CSS to `max-age=14400` on the custom domain (same open issue as nonarkara-org). After a deploy, verify against the versioned `*.games-bm7.pages.dev` URL first; the custom domain can serve 4h-stale assets to returning browsers. Fixing it needs a token with Zone Settings:Edit — wrangler OAuth doesn't have it.
- wrangler OAuth also lacks Zone:DNS:Edit — DNS changes go through Dr Non's logged-in Chrome (see vault lesson: React SPA dashboards need JS event-dispatch, not UI clicks).

## Architecture

Plain ESM, no build. `index.html` shell → `js/app.js` (`gamesCatalog[]`, one entry per game, `renderer: renderXxx(container, onClose)`) → `js/games/*.js` suites. Shared: `ui.js` (GameSession timer/listener trap, ScopedKeyboard, showResult), `storage.js` (high scores + top-5 leaderboards with 5-letter initials), `analytics.js`, `audio.js`. `server.js` is the local dev server only (port 3000).

## Design — AXIOM Play register (2026-08-09 · arcade revival)

The shell now uses **Axiom Play mode**, not Instrument mode: canonical warm paper, blue identity, one red decision spike, hairline cell grids, a 61.8/38.2 hero, Inter + Spectral, and the trunk subsystem for room identity. The single Divine Move is the oversized red featured-game control. Nostalgia comes from cartridges, room discs, score labels, and one-round copy—not a generic CRT overlay.

**IA:** hero → room directory → cartridge grid → per-game Brain Briefing → play surface. Every catalog game has a guide in `js/brainGuides.js`. Copy describes the task practised and always rejects broad far-transfer promises. Papers and the caveat stay visible on the home page.

**Open-source additions:** Breakout (Ania Kubow, MIT) and Pong (Jake Gordon, MIT) were adapted to the shared lifecycle with responsive canvas, keyboard + pointer controls, scoring, tests, and in-game credits. See `CREDITS.md`.

## Tests

```bash
npm test   # trivia conservation + open-source physics + guide coverage
npm run check
```

## Do not

- Use free accent colors outside the sanctioned Play-mode trunk subsystem
- Add shadows, gradients, glows, or fonts outside Inter + Spectral
- Touch `js/games/labsGames.js` content (Dr Non's personal packs — earned content)
- Claim brain-training transfer beyond what THE SCIENCE section's citations support
