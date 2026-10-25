import assert from 'node:assert/strict';
import { existsSync, rmSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublic, moduleRevision } from './build-public.mjs';
const output = buildPublic();
try {
  for (const path of ['index.html', 'js/app.js', 'css/styles.css', 'css/typography.css', 'public/fonts/jost-latin-variable.woff2', 'public/fonts/jetbrains-mono-latin-variable.woff2', '_headers', '404.html', 'CREDITS.md']) assert.ok(existsSync(join(output, path)), path);
  for (const path of ['.git', '.env', 'functions', 'migrations', 'server.js', 'context.md', 'scripts', 'js/scoreGate.test.mjs']) assert.ok(!existsSync(join(output, path)), path);
  const revision = moduleRevision(join(output, 'js'));
  const base = `releases/${revision}/js/`;
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  assert.ok(html.includes(`src="./${base}app.js"`));
  for (const file of ['app.js', 'storage.js', 'ui.js', 'games/sudoku.js']) {
    assert.deepEqual(readFileSync(join(output, base, file)), readFileSync(join(output, 'js', file)));
  }
  const appStorage = new URL('./storage.js', `https://games.test/${base}app.js`).href;
  const gameStorage = new URL('../storage.js', `https://games.test/${base}games/sudoku.js`).href;
  assert.equal(appStorage, gameStorage, 'all modules must share the same storage instance');
  assert.equal(moduleRevision(join(output, 'js')), revision, 'revision is deterministic');
  appendFileSync(join(output, 'js/storage.js'), '\n// changed module fixture\n');
  assert.notEqual(moduleRevision(join(output, 'js')), revision, 'a nested dependency change refreshes the entry URL');
  console.log('Deploy assets: public files present; repository internals excluded');
} finally { rmSync(output, { recursive: true, force: true }); }
