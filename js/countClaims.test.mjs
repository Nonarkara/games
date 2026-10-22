// Registry-drift guard: the floor's own size, stated in prose.
//
// The catalog is the single source of truth for how many cartridges exist, and
// `playableCount()` computes the number for the live UI — so the UI cannot lie.
// Prose cannot. "One floor, five frameworks, eighty cartridges" shipped live
// against a floor of 104, and nothing failed: every other test was checking a
// registry for internal consistency, none of them checked the sentence a human
// reads. This test closes that gap.
//
// v2 — the detector itself was audited, and it was weak. The first version
// matched a handful of number words and, on anything it recognised but could
// not resolve, SKIPPED ("do not guess"). Probed with stale claims planted in
// a scratch copy of the tree, it caught 3 of 8: "80", "eighty" and
// "ninety-nine" — exactly the phrasings that had already bitten — and missed
// "eighty-one cartridges", "sixty games", "seventy carts", "100+ games" and
// "one hundred and four cartridges". A guard that catches only the last
// mistake is a memorial, not a guard. Now:
//   · a real 0–999 number-word parser, so no spelling is "unknown"
//   · "N+" and "N-cartridge" forms are claims too
//   · a phrase it recognises but cannot resolve FAILS the build — silence is
//     the failure mode that let the original through
//   · README.md and docs/ are in scope (shipped prose, not just js/ and html)
//   · comment-stripping no longer eats URLs, so a claim after "https://" on
//     the same line is still seen
//   · the parser and extractor carry their own proof table below, so the
//     detector cannot quietly regress even when no stale claim exists
//
// A claim that is genuinely about something other than the floor's inventory
// must be listed in ALLOWLIST with the reason it is correct — so the exception
// is visible in review instead of hidden in a regex.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

// ── Number words ─────────────────────────────────────────────────────────────
const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "eighty-one" → 81, "one hundred and four" → 104, "a hundred" → 100. null if it is not a number. */
export function parseNumberWords(phrase) {
  const tokens = phrase.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!tokens.length) return null;
  let total = 0, current = 0, sawNumber = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in ONES) { current += ONES[t]; sawNumber = true; }
    else if (t in TENS) { current += TENS[t]; sawNumber = true; }
    else if (t === 'hundred') {
      // "a hundred" / "one hundred" / bare "hundred"
      current = (current || 1) * 100; sawNumber = true;
    }
    else if (t === 'and') { if (!sawNumber || i === tokens.length - 1) return null; }
    else if (t === 'a') { if (tokens[i + 1] !== 'hundred') return null; }
    else return null;
  }
  total += current;
  return sawNumber ? total : null;
}

// A number phrase, directly before the noun. It must START on a real number
// word — "and" and "a" are connectives inside a number, not the beginning of
// one, or "104 cartridges and ninety-nine games" reads "and ninety-nine" as a
// single unparseable claim. ("a" only opens a number as "a hundred".)
const TOKEN = '(?:' + [...Object.keys(ONES), ...Object.keys(TENS), 'hundred'].join('|') + ')';
const NUMWORDS = `(?:a(?=\\s+hundred\\b)|${TOKEN})(?:[\\s-]+(?:and[\\s-]+)?${TOKEN})*`;
const NOUN = '(cartridges?|carts?|games)';
// digits (with optional "+") | "104-cartridge" compounds | number words
const CLAIM = new RegExp(
  `(?:\\b(\\d{1,3})(\\+)?[\\s]+${NOUN}\\b)` +            // 104 cartridges, 100+ games
  `|(?:\\b(\\d{1,3})-(cartridge|cart|game)\\b)` +          // 104-cartridge floor
  `|(?:\\b(${NUMWORDS})\\s+${NOUN}\\b)`,                  // eighty-one cartridges
  'gi'
);

/**
 * Every count claim on one line of prose.
 * `value: null` means "looked like a number, could not be resolved" — callers
 * must treat that as a failure, never as a skip.
 */
export function extractClaims(line) {
  const out = [];
  CLAIM.lastIndex = 0;
  let m;
  while ((m = CLAIM.exec(line)) !== null) {
    if (m[1] !== undefined) {
      // singular nouns after a digit ("1 cartridge") are not floor-size claims; plural only
      if (/^(cartridge|cart|game)$/i.test(m[3])) continue;
      out.push({ phrase: `${m[1]}${m[2] || ''} ${m[3]}`.toLowerCase(), value: Number(m[1]), floor: Boolean(m[2]) });
    } else if (m[4] !== undefined) {
      out.push({ phrase: `${m[4]}-${m[5]}`.toLowerCase(), value: Number(m[4]), floor: false });
    } else if (m[6] !== undefined) {
      // "one cartridge" is a quantity of one, not the floor — the digit branch
      // already skips singulars; the word branch has to agree or the two
      // spellings of the same phrase get judged differently.
      if (/^(cartridge|cart|game)$/i.test(m[7])) continue;
      const words = m[6].trim();
      const value = parseNumberWords(words);
      out.push({ phrase: `${words} ${m[7]}`.toLowerCase().replace(/\s+/g, ' '), value, floor: false });
    }
  }
  return out;
}

// ── The detector proves itself before it judges anything ─────────────────────
const PARSE_CASES = [
  ['eighty', 80], ['eighty-one', 81], ['eighty one', 81], ['ninety-nine', 99], ['sixty', 60],
  ['seventy', 70], ['fifty-five', 55], ['one hundred', 100], ['a hundred', 100],
  ['one hundred and four', 104], ['one hundred four', 104], ['hundred', 100], ['one', 1],
  ['twenty', 20], ['thirteen', 13], ['two hundred and fifty', 250]
];
for (const [phrase, want] of PARSE_CASES) {
  assert.equal(parseNumberWords(phrase), want, `parseNumberWords("${phrase}") should be ${want}`);
}
for (const junk of ['the', 'and', 'all', 'a', 'a game', 'none']) {
  assert.equal(parseNumberWords(junk), null, `"${junk}" is not a number`);
}
const EXTRACT_CASES = [
  ['One floor, eighty-one cartridges.', [81]],
  ['Sixty games to play.', [60]],
  ['Seventy carts on the floor.', [70]],
  ['Over 100+ games on the floor.', [100]],
  ['One hundred and four cartridges.', [104]],
  ['A 104-cartridge floor.', [104]],
  ['104 cartridges and ninety-nine games', [104, 99]],
  ['See https://example.org — 80 cartridges', [80]],
  ['Every cartridge names the skill.', []],
  ['The 24 game is on the floor', []],
  ['all games are 18+ only', []],
  ['one of the games', []],
  ['1 cartridge', []]
];
for (const [line, want] of EXTRACT_CASES) {
  const got = extractClaims(line).map(c => c.value);
  assert.deepEqual(got, want, `extractClaims(${JSON.stringify(line)}) → ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
}

// ── The truth ────────────────────────────────────────────────────────────────
const appSource = readFileSync(join(root, 'js/app.js'), 'utf8');
const catalog = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];
const rows = [...catalog.matchAll(/\{ id: '([^']+)'[^\n]*?wing: '([^']+)'/g)]
  .map(match => ({ id: match[1], wing: match[2] }));
const playable = rows.filter(row => row.wing !== 'meta').length;
const total = rows.length;

// ── Claims that are true but are not about the floor's inventory ─────────────
// Each needs a reason. Adding an entry is a decision to review, not a silencer.
const ALLOWLIST = [
  {
    file: 'js/app.js',
    phrase: 'five carts',
    reason: "Today's Five heading — it counts the day's pick (js/daily.js DAILY_COUNT), not the floor.",
  },
];

// ── Scan ─────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|mjs|html|md)$/.test(entry) && !/\.test\.mjs$/.test(entry)) out.push(full);
  }
  return out;
}

// context.md is deliberately absent: it is a dated journal ("passed all 69
// carts"), where an old number is history rather than a claim about today.
const files = [
  join(root, 'index.html'), join(root, 'README.md'),
  ...walk(join(root, 'js')), ...walk(join(root, 'functions')), ...walk(join(root, 'docs'))
].filter(existsSync);

const offenders = [];
const seen = [];

for (const file of files) {
  const isCode = /\.(js|mjs)$/.test(file);
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    // Comments narrate history; only shipped copy is a promise. Strip them for
    // code only — and never a "//" that is part of a URL, or a claim sitting
    // after "https://" on the same line would be erased and never seen.
    const text = isCode
      ? line.replace(/(^|\s)\/\/.*$/, '$1').replace(/^\s*\*.*$/, '').replace(/^\s*\/\*.*$/, '')
      : line.replace(/<!--.*?-->/g, '');
    for (const claim of extractClaims(text)) {
      const rel = file.replace(root, '');
      seen.push({ rel, line: index + 1, ...claim });
      if (ALLOWLIST.find(a => a.file === rel && text.toLowerCase().includes(a.phrase))) continue;
      if (claim.value === null) {
        offenders.push({ rel, line: index + 1, phrase: claim.phrase, why: 'looks like a count but cannot be resolved — fix the wording or teach the parser' });
      } else if (claim.floor) {
        // "100+ games": true while the floor is at least that big, but a floor
        // claim that has fallen far behind ("50+") is the same drift in a
        // politer form. It must stay within 10% of the real number.
        if (claim.value > playable || claim.value < Math.floor(playable * 0.9)) {
          offenders.push({ rel, line: index + 1, phrase: claim.phrase, why: `a "${claim.value}+" floor must be within 10% below the real ${playable}` });
        }
      } else if (claim.value !== playable && claim.value !== total) {
        offenders.push({ rel, line: index + 1, phrase: claim.phrase, why: `floor is ${playable} playable, ${total} including meta` });
      }
    }
  });
}

// ── Assert ───────────────────────────────────────────────────────────────────
assert.ok(playable > 0 && total >= playable, `catalog parse failed: ${playable} playable of ${total}`);

if (offenders.length) {
  const detail = offenders.map(o => `  ${o.rel}:${o.line} — "${o.phrase}" (${o.why})`).join('\n');
  assert.fail(
    `the floor states a cartridge count that the catalog does not support:\n${detail}\n\n` +
    `Either fix the number, or — if the claim is true and about something other ` +
    `than the floor's inventory — add it to ALLOWLIST in js/countClaims.test.mjs with the reason.`
  );
}

console.log(`count claims: ${seen.length} checked across ${files.length} files, all match the catalog (${playable} playable / ${total} total)`);
for (const s of seen) console.log(`  ${s.rel}:${s.line}  ${s.phrase}${ALLOWLIST.some(a => a.file === s.rel && a.phrase === s.phrase) ? '  [allowlisted]' : ''}`);
