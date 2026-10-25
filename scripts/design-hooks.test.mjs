import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const fixture = mkdtempSync(join(tmpdir(), 'ngs-hook-test-'));
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  mkdirSync(join(fixture, 'scripts'));
  const hook = new URL('./hooks/pre-commit', import.meta.url).pathname;
  for (const status of [1, 0]) {
    writeFileSync(join(fixture, 'scripts/visual-audit.sh'), `#!/bin/sh\necho audit-result\nexit ${status}\n`, { mode: 0o755 });
    const result = spawnSync('bash', [hook], { cwd: fixture, encoding: 'utf8' });
    assert.equal(result.status, status, result.stdout + result.stderr);
  }
  console.log('Design hook: failing audit blocks commit even when output is piped through tail');
} finally { rmSync(fixture, { recursive: true, force: true }); }
