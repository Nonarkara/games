import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'ngs-txt-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=9560', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });
const delay = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { const r = await fetch('http://127.0.0.1:9560/json/version'); if (r.ok) break; } catch {} await delay(100); }
const page = await fetch('http://127.0.0.1:9560/json/new?' + encodeURIComponent('http://127.0.0.1:3000'), { method: 'PUT' }).then(r => r.json());
const sock = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
let id = 0; const pend = new Map();
sock.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } };
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; sock.send(JSON.stringify({ id: i, method, params })); pend.set(i, { resolve, reject }); });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:3000' });
await delay(2000);
const r = await send('Runtime.evaluate', { expression: `(() => {
  const panel = document.querySelector('.attract-feature');
  if (!panel) return { error: 'no panel' };
  const result = {};
  const panelBg = getComputedStyle(panel).backgroundColor;
  result.panelBg = panelBg;
  const items = [];
  panel.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    items.push({
      cls: el.className,
      tag: el.tagName,
      color: cs.color,
      bg: cs.backgroundColor,
      text: (el.textContent || '').trim().slice(0, 40)
    });
  });
  result.children = items;
  return result;
})()`, returnByValue: true });
console.log('Panel bg:', r.result.value.panelBg);
for (const c of r.result.value.children) {
  console.log(`  ${c.tag}.${(c.cls || '').slice(0, 30).padEnd(30)}  color=${c.color.padEnd(20)}  bg=${c.bg.padEnd(20)}  text='${c.text}'`);
}
sock.close();
chrome.kill();
rmSync(profile, { recursive: true, force: true });
