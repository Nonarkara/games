/**
 * Migration-ledger guard.
 *
 * Production recorded `0002_accounts.sql` as applied, the file was later
 * reverted out of the repo, and the folder was left with 0001 and 0003 and no
 * explanation. Harmless today — but wrangler skips any migration whose NAME is
 * already in the remote ledger, so re-adding that filename later would silently
 * never run. The gap was "odd and worth a look" to the last audit; it is now a
 * test: a hole in the numbering must be explained in migrations/README.md, so
 * the next person finds the reason instead of the trap.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../migrations/', import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
assert.ok(files.length > 0, 'no migrations found');

// Name shape: NNNN_snake_case.sql — wrangler orders by filename.
for (const f of files) {
  assert.match(f, /^\d{4}_[a-z0-9_]+\.sql$/, `${f} must be NNNN_snake_case.sql`);
}

const numbers = files.map(f => Number(f.slice(0, 4)));
assert.equal(new Set(numbers).size, numbers.length, 'two migrations share a number');

const readme = readFileSync(join(dir, 'README.md'), 'utf8');
const gaps = [];
for (let n = Math.min(...numbers); n <= Math.max(...numbers); n++) {
  if (!numbers.includes(n)) gaps.push(String(n).padStart(4, '0'));
}
const unexplained = gaps.filter(g => !new RegExp(`^- ${g}\\b`, 'm').test(readme));
assert.deepEqual(unexplained, [],
  `migration number(s) missing and not explained in migrations/README.md: ${unexplained.join(', ')}`);

// A documented gap must say what NOT to do — the filename that is poisoned.
for (const g of gaps) {
  const block = readme.split(new RegExp(`^- ${g}\\b`, 'm'))[1]?.split(/^- \d{4}\b/m)[0] || '';
  assert.match(block, /Never re-add|do not re-add|never reuse/i,
    `the ${g} gap is documented but does not warn against re-adding the filename`);
}

console.log(`migrations: ${files.length} files, ${gaps.length} explained gap(s) (${gaps.join(', ') || 'none'})`);
