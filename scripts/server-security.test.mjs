import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe']
});
try {
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server start timed out')), 20000);
    child.once('error', reject);
    child.stdout.on('data', data => {
      const match = String(data).match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
    });
  });
  for (const path of ['/.git/config', '/.env', '/functions/api/session.js', '/server.js', '/context.md', '/js/scoreGate.test.mjs', '/js/%2e%2e/.git/config']) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
  for (const path of ['/', '/js/app.js', '/css/styles.css']) assert.equal((await fetch(origin + path)).status, 200, path);
  assert.equal((await fetch(origin + '/js/app.js', { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(origin + '/js/app.js', { method: 'HEAD' })).text(), '');
  console.log('Local server: private files denied, public assets work, methods restricted');
} finally { child.kill(); }
