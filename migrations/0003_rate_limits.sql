-- Rate-limit table the session endpoint already writes.
-- Production already has this from a 2026-08-13 dirty deploy (0002_accounts.sql,
-- not in git). IF NOT EXISTS keeps that deploy a no-op.
-- Greenfield installs get the same table from 0001_init.sql.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash     TEXT PRIMARY KEY,
  last_seen_at INTEGER NOT NULL
);

-- Account tables from that dirty deploy hold zero rows and have no live
-- functions. Drop them so a forgotten auth bundle cannot write into them.
DROP TABLE IF EXISTS user_play_events;
DROP TABLE IF EXISTS user_snapshots;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS users;
