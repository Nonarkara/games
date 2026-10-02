import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('local server starts on loopback, serves the arcade and rejects private paths', async () => {
  const env = { ...process.env, PORT: '0' };
  delete env.HOST;
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let timer;
  try {
    const base = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('local server did not start')), 5000);
      child.once('error', reject);
      child.once('exit', code => reject(new Error(`local server exited early: ${code}`)));
      child.stdout.on('data', chunk => {
        output += String(chunk);
        const match = output.match(/http:\/\/(127\.0\.0\.1):(\d+)/);
        if (match) { clearTimeout(timer); resolve(`http://${match[1]}:${match[2]}`); }
      });
    });
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(index.headers.get('content-type'), /text\/html/);
    const script = await fetch(`${base}/js/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type'), /javascript/);
    const guest = await (await fetch(`${base}/api/auth/status`)).json();
    assert.deepEqual(guest, { authenticated: false, google_available: false, user: null });
    for (const route of ['/.env', '/.git', '/%2eenv', '/docs/.hidden', '/node_modules/package.json']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 403, route);
      assert.equal(await response.text(), 'Forbidden');
    }
    assert.equal((await fetch(`${base}/missing-file.js`)).status, 404);
    assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  }
});
