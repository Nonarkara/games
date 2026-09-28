/**
 * Every module must actually parse.
 *
 * This exists because of a real miss: a stray apostrophe inside a
 * single-quoted catalog description ("a box's fourth side") made js/app.js
 * syntactically invalid, and the entire eleven-file test suite stayed green —
 * because every one of those tests reads app.js as TEXT with a regex and never
 * imports it. The site was broken on load and nothing said so.
 *
 * Text-scraping the catalog is the right call for those tests (importing the
 * browser entry point in Node would mean stubbing the DOM), but it leaves the
 * obvious hole open. This closes it the cheap way: hand every file to the
 * parser and see if it comes back.
 */
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name.startsWith('_baseline')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(mjs|js)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(root);
assert.ok(files.length > 30, `expected the whole source tree, found ${files.length}`);

const broken = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], {
      input: readFileSync(file),
      stdio: ['pipe', 'ignore', 'pipe']
    });
  } catch (err) {
    const why = String(err.stderr || err.message)
      .split('\n').find(l => /Error/.test(l)) || 'parse failed';
    broken.push(`${relative(root, file)} — ${why.trim()}`);
  }
}

assert.deepEqual(broken, [], `modules that do not parse:\n  ${broken.join('\n  ')}`);

console.log(`syntax: ${files.length} modules parse`);
