import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const fixture = mkdtempSync(join(tmpdir(), 'ngs-verify-test-'));
const script = new URL('./verify-live.sh', import.meta.url).pathname;
try {
  writeFileSync(join(fixture, 'git'), '#!/bin/sh\ncase "$*" in *--short*) echo abc1234;; *) echo origin/main;; esac\n', { mode: 0o755 });
  const run = output => {
    writeFileSync(join(fixture, 'npx'), `#!/bin/sh\nprintf '%s\\n' '${output}'\n`, { mode: 0o755 });
    return spawnSync('bash', [script], { env: { ...process.env, PATH: `${fixture}:${process.env.PATH}` }, encoding: 'utf8' });
  };
  assert.equal(run('').status, 1, 'unknown live build must fail verification');
  assert.equal(run('│ id │ Production │ main │ deadbee │ url │').status, 1, 'stale live build must fail');
  assert.equal(run('│ id │ Production │ main │ abc1234 │ url │').status, 0, 'matching live build must pass');
  console.log('Live verification: unknown and stale builds fail; matching build passes');
} finally { rmSync(fixture, { recursive: true, force: true }); }
