import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublic } from './build-public.mjs';
const output = buildPublic();
try {
  for (const path of ['index.html', 'js/app.js', 'css/styles.css', '_headers', '404.html', 'CREDITS.md']) assert.ok(existsSync(join(output, path)), path);
  for (const path of ['.git', '.env', 'functions', 'migrations', 'server.js', 'context.md', 'scripts', 'js/scoreGate.test.mjs']) assert.ok(!existsSync(join(output, path)), path);
  console.log('Deploy assets: public files present; repository internals excluded');
} finally { rmSync(output, { recursive: true, force: true }); }
