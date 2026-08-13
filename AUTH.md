# Optional accounts

NGS never requires an account. Guest progress lives in `localStorage`; clearing
this site's data or using private browsing removes it. Google sign-in adds
cross-device persistence without changing guest play.

## Security model

1. `/api/auth/google/start` creates one-time OAuth state, nonce, and a PKCE
   verifier in D1, then redirects to Google.
2. The callback checks the state cookie, consumes the database state once,
   exchanges the code server-side, and verifies the RS256 ID token with
   Google's current JWKS. Audience, issuer, expiry, nonce, and subject are
   checked.
3. The user key is Google's stable `sub`, not the changeable email address.
4. NGS discards Google's access token and issues a random 30-day session. Only
   its SHA-256 hash is stored; the browser receives an HttpOnly, Secure,
   SameSite=Lax `__Host-ngs_session` cookie.
5. Sync writes are same-origin, size-bounded, allowlisted, sanitized, and use
   optimistic revisions. Play events have client IDs for deduplication.

Synced: high scores, favourite state, play count, board initials, and practice
events. Local only: custom game code, display theme, and cached public boards.
The player can delete the server-side account link, snapshot, sessions, and
events from the account panel; browser data remains until they clear it.

## Google / Cloudflare setup

Create a Google OAuth client of type **Web application** with this authorized
redirect URI:

```
https://games.nonarkara.org/api/auth/google/callback
```

Add the credentials as encrypted Cloudflare Pages secrets (never `vars` and
never committed):

```bash
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=games
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=games
```

The public origin is fixed in `wrangler.jsonc`. `bash scripts/deploy.sh`
applies recorded D1 migrations before deploying. Without both secrets, the
account panel deliberately shows `GOOGLE SIGN-IN · SETUP PENDING`.
