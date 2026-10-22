# D1 migrations

Forward-only. `scripts/deploy.sh` applies them with
`wrangler d1 migrations apply ngs-leaderboard --remote`; wrangler records each
applied file by name in the `d1_migrations` table and skips any name it has
already recorded.

## Numbering gaps — every one is explained here

`scripts/migrations.test.mjs` fails the build if a number is missing from this
folder and not listed below. A gap nobody can explain is how a migration gets
silently skipped.

- 0002 — `0002_accounts.sql`. **Never re-add a file with this name.**

  It was committed in `ea5e36c` (Google sign-in plus cross-device progress:
  `users`, `auth_sessions`, `oauth_states`, `user_snapshots`,
  `user_play_events`) and reverted in `3fab8eb` as "a half-baked account
  system that got swept in by mistake".

  Production nevertheless recorded it. Read-only check on 2026-10-22:
  `d1_migrations` lists `0002_accounts.sql` as applied on 2026-08-13 12:42:49,
  the same second as `0001`, yet none of those tables exist remotely — the
  remote tables are `api_rate_limits`, `scores`, `sessions` and nothing else.
  The `scores` and `sessions` columns match `0001` + `0003` exactly, so the
  schema is correct and the ledger carries one phantom row.

  Why it matters: if accounts ever return under the same filename, wrangler
  sees `0002_accounts.sql` already applied and skips it. The tables would
  silently never be created and sign-in would fail with no migration error to
  point at. Use a fresh number (0004 or later) and a different name.

  Not repaired in production, deliberately. Deleting the ledger row is a write
  to the live database, nothing is broken by leaving it, and the guard above
  plus this note remove the only way it can hurt.
