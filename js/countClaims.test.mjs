// Registry-drift guard: the floor's own size, stated in prose.
//
// The catalog is the single source of truth for how many cartridges exist, and
// `playableCount()` computes the number for the live UI — so the UI cannot lie.
// Prose cannot. "One floor, five frameworks, eighty cartridges" shipped live
// against a floor of 104, and nothing failed: every other test was checking a
// registry for internal consistency, none of them checked the sentence a human
// reads. This test closes that gap.
//
// It does not guess. A claim that is genuinely about something other than the
// floor's inventory must be listed in ALLOWLIST with the reason it is correct —
// so the exception is visible in review instead of hidden in a regex.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

// ── The truth ────────────────────────────────────────────────────────────────
const appSource = readFileSync(join(root, 'js/app.js'), 'utf8');
const catalog = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];
const rows = [...catalog.matchAll(/\{ id: '([^']+)'[^\n]*?wing: '([^']+)'/g)]
  .map(match => ({ id: match[1], wing: match[2] }));
const playable = rows.filter(row => row.wing !== 'meta').length;
const total = rows.length;

// ── Claims that are true but are not about the floor's inventory ─────────────
// Each needs a reason. Adding an entry is a decision to review, not a silencer.
// Currently empty: every count claim in shipped copy matches the catalog, and
// the one historical number that used to live in a comment is now worded so it
// cannot be misread as a present-tense claim.
const ALLOWLIST = [];

// ── Scan ─────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|mjs|html|md)$/.test(entry) && !/\.test\.mjs$/.test(entry)) out.push(full);
  }
  return out;
}

const files = [join(root, 'index.html'), ...walk(join(root, 'js')), ...walk(join(root, 'functions'))];

const NUMBER_WORDS = {
  eighty: 80, ninety: 90, 'ninety-nine': 99, ninetyfive: 95,
  hundred: 100, 'one hundred': 100, 'a hundred': 100,
  'one hundred and four': 104,
};

// "104 cartridges", "eighty carts", "99 games", "104 cartridges" etc.
const CLAIM = /(\b\d{1,3}\b|\b(?:one|two|three|five|eighty|ninety|ninety-nine|hundred|one hundred|a hundred)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)\s+(cartridges|carts|games)\b/gi;

const offenders = [];
const seen = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  source.split('\n').forEach((line, index) => {
    // Comments legitimately narrate history; only shipped copy is a promise.
    // Strip line comments and block-comment lines before looking for claims.
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '').replace(/^\s*\/\*.*$/, '');
    CLAIM.lastIndex = 0;
    let match;
    while ((match = CLAIM.exec(code)) !== null) {
      const raw = match[1].toLowerCase();
      const value = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
      if (value === undefined) continue; // unknown phrasing — do not guess
      const phrase = `${raw} ${match[2].toLowerCase()}`;
      const rel = file.replace(root, '');
      const allowed = ALLOWLIST.find(a => a.file === rel && code.includes(a.phrase));
      seen.push({ rel, line: index + 1, phrase, value });
      if (allowed) continue;
      if (value !== playable && value !== total) {
        offenders.push({ rel, line: index + 1, phrase, value });
      }
    }
  });
}

// ── Assert ───────────────────────────────────────────────────────────────────
assert.ok(playable > 0 && total >= playable, `catalog parse failed: ${playable} playable of ${total}`);

if (offenders.length) {
  const detail = offenders
    .map(o => `  ${o.rel}:${o.line} — "${o.phrase}" (floor is ${playable} playable, ${total} including meta)`)
    .join('\n');
  assert.fail(
    `the floor states a cartridge count that the catalog does not support:\n${detail}\n\n` +
    `Either fix the number, or — if the claim is true and about something other ` +
    `than the floor's inventory — add it to ALLOWLIST in ${'js/countClaims.test.mjs'} with the reason.`
  );
}

console.log(`count claims: ${seen.length} checked, all match the catalog (${playable} playable / ${total} total)`);
for (const s of seen) console.log(`  ${s.rel}:${s.line}  ${s.phrase}${ALLOWLIST.some(a => a.file === s.rel && a.phrase === s.phrase) ? '  [allowlisted]' : ''}`);