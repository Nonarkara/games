import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('css/styles.css') + read('css/typography.css');
assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html + css), 'type must not depend on a third-party font request');
assert.ok(!/font-family:\s*['"]?(Inter|Spectral|Press Start 2P)/.test(css), 'retired font roles must not return');
const declared = [...read('css/typography.css').matchAll(/font-family:\s*'([^']+)'/g)].map(match => match[1]);
assert.deepEqual([...new Set(declared)].sort(), ['JetBrains Mono', 'Jost']);
for (const name of ['jost', 'jetbrains-mono']) {
  const bytes = readFileSync(new URL(`../public/fonts/${name}-latin-variable.woff2`, import.meta.url));
  assert.equal(bytes.subarray(0, 4).toString(), 'wOF2', `${name}: valid WOFF2 signature`);
}
for (const license of ['Jost-OFL.txt', 'JetBrains-Mono-OFL.txt']) assert.ok(read(`public/fonts/${license}`).includes('SIL OPEN FONT LICENSE'));
assert.ok(read('_headers').includes("font-src 'self';"));
console.log('Typography: two local families, valid WOFF2 files, licences and same-origin font policy');
