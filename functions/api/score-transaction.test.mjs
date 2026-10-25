import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost } from './leaderboard.js';

// Execute the handler's real SQL against SQLite. The adapter mirrors D1's
// documented transactional batch contract, including rollback on an error.
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const adapter = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql, args,
            async run() {
              const result = sqlite.prepare(sql).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
            async all() { return { results: sqlite.prepare(sql).all(...args) }; }
          };
        }
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  const token = 'b'.repeat(64);
  const seed = (game = 'stroop-match', expires = Date.now() + 60000) => sqlite.prepare(
    'INSERT INTO sessions VALUES (?, ?, ?, ?, 0)'
  ).run(token, game, Date.now(), expires);
  const submit = (ip = '192.0.2.1') => onRequestPost({
    env: { DB: adapter },
    request: new Request('https://games.test/api/leaderboard', {
      method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify({ game_id: 'stroop-match', score: 10, initials: 'TEST', session_id: token })
    })
  });
  const count = () => sqlite.prepare('SELECT count(*) AS n FROM scores').get().n;
  const used = () => sqlite.prepare('SELECT used FROM sessions WHERE session_id = ?').get(token)?.used;
  const rejectWrites = () => sqlite.exec("CREATE TRIGGER reject_test_score BEFORE INSERT ON scores BEGIN SELECT RAISE(ABORT, 'simulated insert failure'); END");
  const allowWrites = () => sqlite.exec('DROP TRIGGER reject_test_score');
  return { sqlite, adapter, seed, submit, count, used, rejectWrites, allowWrites };
}

{
  const f = fixture();
  try {
    f.seed();
    assert.equal((await f.submit()).status, 200);
    assert.equal(f.count(), 1);
    assert.equal(f.used(), 1);
    assert.equal((await f.submit('192.0.2.2')).status, 400, 'token cannot be replayed from another IP');
    assert.equal(f.count(), 1);
  } finally { f.sqlite.close(); }
}
for (const kind of ['missing', 'expired', 'wrong-game']) {
  const f = fixture();
  try {
    if (kind === 'expired') f.seed('stroop-match', Date.now() - 1);
    if (kind === 'wrong-game') f.seed('sudoku');
    assert.equal((await f.submit()).status, 400, kind);
    assert.equal(f.count(), 0, kind);
    if (kind !== 'missing') assert.equal(f.used(), 0, kind);
  } finally { f.sqlite.close(); }
}
{
  const f = fixture();
  try {
    f.seed(); f.rejectWrites();
    const failed = await f.submit();
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'service_unavailable' });
    assert.equal(f.used(), 0, 'failed insert must restore the usable session');
    assert.equal(f.count(), 0);
    f.allowWrites();
    assert.equal((await f.submit('192.0.2.2')).status, 200, 'same session can retry after failure');
    assert.equal(f.count(), 1);
  } finally { f.sqlite.close(); }
}
console.log('Score transaction: real SQLite accepts once, rejects invalid sessions, rolls back failed inserts and allows retry');
