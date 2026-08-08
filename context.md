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

## Design — AXIOM Console register (2026-08-08 · bay overhaul)

`css/styles.css` keeps the legacy token *names* (`--paper`, `--ink`, `--c-*`) with console *values*: bg `#0a0e14`, ONE amber `#f59e0b`, zero radius, hairlines, no shadows/glows. `--c-math` (red) and `--c-skills` (green) are semantic wrong/correct feedback ONLY — never decoration. Fonts: Josefin Sans / Source Sans 3 / JetBrains Mono (`.font-mono-hud`).

**Cabinet IA (2026-08-08 anti-template):** left wing rail (TRAIN/ARCADE/LEARN/LABS) + attract marquee (brand hero + hover-linked feature) + select list. Papers live in the rail. Not a centered dashboard stack. Positioning: brain training for adults — "kill time without killing your mind." Keep claims within Simons 2016 + the paper list.

## Tests

```bash
node js/games/nineties-questions.test.mjs   # trivia deck integrity (conservation law)
```

## Do not

- Re-introduce a second accent color, radius, shadows, or the banned template fonts
- Touch `js/games/labsGames.js` content (Dr Non's personal packs — earned content)
- Claim brain-training transfer beyond what THE SCIENCE section's citations support
