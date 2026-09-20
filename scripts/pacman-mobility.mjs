import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9358;
const profile = mkdtempSync(join(tmpdir(), 'pacman-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--window-size=1440,900', '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitChrome() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) return; } catch {}
    await delay(250);
  }
  throw 'no chrome';
}
await waitChrome();
console.log('chrome ready');

const t = await fetch('http://127.0.0.1:' + port + '/json/new?' + encodeURIComponent('http://127.0.0.1:3050'), { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
console.log('ws open');

let id = 0; const pending = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    if (m.error) reject(m.error.message); else resolve(m.result);
  }
};
const send = (method, params = {}) => {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((resolve, reject) => {
    const tm = setTimeout(() => { pending.delete(i); reject(new Error('timeout ' + method)); }, 8000);
    pending.set(i, { resolve: v => { clearTimeout(tm); resolve(v); }, reject: e => { clearTimeout(tm); reject(new Error(method + ': ' + e)); } });
  });
};
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw r.exceptionDetails;
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await delay(1200);
await ev('document.fonts.ready.then(()=>true)');
await delay(500);

// Search for pacman and launch it
const setSearch = await ev(`(() => { const inp=document.querySelector('#search-input'); if(inp){inp.value='pacman'; inp.dispatchEvent(new Event('input',{bubbles:true})); return 'search set';} return 'no input'; })()`);
console.log('search:', setSearch);
await delay(500);
const clicked = await ev(`(() => {
  const row=[...document.querySelectorAll('.select-row')].find(r=>r.textContent.includes('Cyber Pac-Man'));
  if(row){ row.click(); return 'row clicked: ' + row.dataset.game; }
  return 'row not found';
})()`);
console.log('launch:', clicked);
await delay(1500);
// The briefing gate sits between the row and the game — click PLAY, then
// immediately press LEFT. From the fixed spawn (9,11) LEFT is open, so
// Pac-Man must move and eat a second dot: score 10 (auto-eat) → 20.
const played = await ev(`(() => {
  const play = document.querySelector('.briefing-play');
  if (play) { play.click(); return 'briefing PLAY clicked'; }
  return 'no briefing gate (game may be open already)';
})()`);
console.log('briefing:', played);
await ev(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return 'left dispatched'; })()`);
await delay(450);
const hud = await ev(`(() => {
  const score = document.getElementById('pac-score');
  const status = document.querySelector('#pac-status');
  return {
    score: score ? score.textContent : null,
    status: status ? status.textContent.slice(0, 60) : null,
    gameOver: !score && !!document.querySelector('.result, .oss-result')
  };
})()`);
console.log('hud after LEFT:', JSON.stringify(hud));
if (hud.score !== null && Number(hud.score) >= 20) {
  console.log('✓ PAC-MAN MOVED — score went from 10 to ' + hud.score + ' (ate a second dot)');
} else if (hud.gameOver) {
  console.log('✗ game over before move could be read — retry with faster read');
} else {
  console.log('✗ Pac-Man did not move — score stayed at ' + hud.score);
}

await fetch('http://127.0.0.1:' + port + '/json/close/' + t.id).catch(() => {});
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
await delay(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('done');
