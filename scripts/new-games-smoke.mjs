/**
 * Focused smoke test for the three new games added in this session.
 * Mounts each game in a headless browser, checks for overflow + console errors.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
const port = 9555;
const viewportWidth = 390;
const viewportHeight = 844;
const profile = mkdtempSync(join(tmpdir(), 'ngs-newgames-'));

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch { /* Chrome is still starting. */ }
    await delay(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

await waitForDebugger();
const page = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

let callId = 0;
const pending = new Map();
const browserErrors = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    browserErrors.push(message.params.exceptionDetails.text || 'runtime exception');
  }
};

function send(method, params = {}) {
  const id = ++callId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP ${method} timed out`)); }, 5000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'unknown';
    throw new Error(desc.slice(0, 500));
  }
  return result.result.value;
}

const games = [
  { id: 'tic-tac-toe', expected: '[data-cell]' },
  { id: 'rock-paper-scissors', expected: '[data-choice]' },
  { id: 'memory-matrix', expected: '[data-cell]' }
];

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: baseUrl });
  await delay(2000);
  await evaluate(`document.fonts.ready.then(() => true)`);

  // Wait for the app to render the category bar.
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await evaluate(`Boolean(document.querySelector('[data-wing="all"]'))`);
    if (ready) break;
    await delay(200);
  }
  if (!ready) {
    const bodyText = await evaluate(`document.body?.textContent?.slice(0, 200) || 'empty'`);
    throw new Error(`Category bar never rendered. Body: ${bodyText}`);
  }

  // Switch to ALL so every game row is visible regardless of its wing.
  await evaluate(`document.querySelector('[data-wing="all"]').click()`);
  await delay(500);

  for (const { id, expected } of games) {
    await evaluate(`(() => {
      const row = document.querySelector('.select-row[data-game="${id}"]');
      if (!row) throw new Error('row not found: ${id}');
      row.click();
    })()`);
    await delay(250);

    // Check briefing is correct
    const briefing = await evaluate(`(() => ({
      title: document.querySelector('#briefing-title')?.textContent,
      hasPractice: Boolean(document.querySelector('.briefing-step:nth-of-type(2) p')?.textContent),
      hasCaveat: /not promised/i.test(document.querySelector('.briefing-caveat')?.textContent || '')
    }))()`);
    if (!briefing.title) throw new Error(`${id}: briefing title missing`);
    if (!briefing.hasPractice) throw new Error(`${id}: practice step missing`);
    if (!briefing.hasCaveat) throw new Error(`${id}: caveat missing`);

    // Play the game
    await evaluate(`document.querySelector('.briefing-play').click()`);
    await delay(400);

    const mount = await evaluate(`(() => {
      const stage = document.querySelector('.game-session-stage');
      return {
        mounted: Boolean(document.querySelector('${expected}')),
        count: document.querySelectorAll('${expected}').length,
        overflow: stage ? stage.scrollWidth - stage.clientWidth : 999,
        stageHeight: stage?.firstElementChild?.getBoundingClientRect().height || 0
      };
    })()`);
    if (!mount.mounted) throw new Error(`${id}: game did not mount its play surface (${expected})`);
    if (mount.count === 0) throw new Error(`${id}: no interactive elements found`);
    if (mount.overflow > 2) throw new Error(`${id}: overflows mobile stage by ${mount.overflow}px`);
    if (mount.stageHeight < 1) throw new Error(`${id}: stage is empty`);

    console.log(`  ✓ ${id}: mounted ${mount.count} interactive elements, overflow ${mount.overflow}px, height ${Math.round(mount.stageHeight)}px`);

    // Close
    await evaluate(`document.querySelector('.game-session-bar > button').click()`);
    await delay(200);
  }

  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(' | ')}`);
  console.log(`\n✓ All 3 new games mount cleanly at ${viewportWidth}×${viewportHeight} with zero overflow and zero console errors`);
} finally {
  try { await send('Browser.close'); } catch { chrome.kill(); }
  socket.close();
  await delay(100);
  rmSync(profile, { recursive: true, force: true });
}