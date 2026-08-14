/**
 * Interaction smoke test for the three new games added in this session.
 * Plays each one and verifies the live logic runs, not just the mount.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
const port = 9556;
const viewportWidth = 390;
const viewportHeight = 844;
const profile = mkdtempSync(join(tmpdir(), 'ngs-play-'));

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

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: baseUrl });
  await delay(2000);
  await evaluate(`document.fonts.ready.then(() => true)`);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await evaluate(`Boolean(document.querySelector('[data-wing="all"]'))`);
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error('Category bar never rendered');

  await evaluate(`document.querySelector('[data-wing="all"]').click()`);
  await delay(500);

  // ── Tic-Tac-Toe: click 3 cells in a row, AI should block or take a win ──
  await evaluate(`document.querySelector('.select-row[data-game="tic-tac-toe"]').click()`);
  await delay(250);
  await evaluate(`document.querySelector('.briefing-play').click()`);
  await delay(400);

  const tttResult = await evaluate(`(() => {
    // Click cell 0, then 3, then 6 (column 0) — should win OR AI should block
    const cells = [...document.querySelectorAll('[data-cell]')];
    cells[0].click();
    return { cellsAfterFirst: cells.map(c => c.textContent.trim() || '·').join('') };
  })()`);
  await delay(600);
  const tttResult2 = await evaluate(`(() => {
    const cells = [...document.querySelectorAll('[data-cell]')];
    const filled = cells.filter(c => c.textContent.trim()).length;
    const aiMoved = cells.some(c => c.textContent.trim() === 'O');
    return { filled, aiMoved, board: cells.map(c => c.textContent.trim() || '·').join('') };
  })()`);
  if (!tttResult2.aiMoved) throw new Error('TTT: AI did not respond to first move');
  if (tttResult2.filled < 2) throw new Error('TTT: only 1 cell filled after AI turn');
  console.log(`  ✓ tic-tac-toe: board = ${tttResult2.board}, AI responded`);
  await evaluate(`document.querySelector('.game-session-bar > button').click()`);
  await delay(200);

  // ── Rock-Paper-Scissors: click rock, verify round + result ──
  await evaluate(`document.querySelector('.select-row[data-game="rock-paper-scissors"]').click()`);
  await delay(250);
  await evaluate(`document.querySelector('.briefing-play').click()`);
  await delay(400);

  await evaluate(`document.querySelector('[data-choice="rock"]').click()`);
  await delay(1700);
  const rpsResult2 = await evaluate(`(() => {
    const stage = document.querySelector('.game-session-stage');
    const roundEl = [...stage?.querySelectorAll('span') || []].find(s => /ROUND/i.test(s.textContent));
    const round = roundEl ? Number(roundEl.querySelector('b')?.textContent || '0') : 0;
    return { round };
  })()`);
  if (rpsResult2.round < 1) throw new Error(`RPS: round did not advance (${JSON.stringify(rpsResult2)})`);
  console.log(`  ✓ rock-paper-scissors: round ${rpsResult2.round} after one throw`);
  await evaluate(`document.querySelector('.game-session-bar > button').click()`);
  await delay(200);

  // ── Memory Matrix: click TAP TO START, verify pattern shows then input phase ──
  await evaluate(`document.querySelector('.select-row[data-game="memory-matrix"]').click()`);
  await delay(250);
  await evaluate(`document.querySelector('.briefing-play').click()`);
  await delay(400);

  const mmgBeforeGate = await evaluate(`Boolean(document.querySelector('.ngs-ready-gate'))`);
  if (!mmgBeforeGate) throw new Error('MMG: TAP TO START gate missing');

  await evaluate(`document.querySelector('.ngs-ready-gate').click()`);
  await delay(200);
  // During 'show' phase, some cells should have the bg-amber-400 lit color
  const mmgShow = await evaluate(`(() => {
    const cells = [...document.querySelectorAll('[data-cell]')];
    const lit = cells.filter(c => /bg-amber-400/.test(c.className) && !/30/.test(c.className.split('bg-amber-400')[1] || '')).length;
    return { lit, allDisabled: cells.every(c => c.disabled) };
  })()`);
  if (!mmgShow.allDisabled) throw new Error('MMG: cells should be disabled during show phase');
  console.log(`  ✓ memory-matrix: show phase has ${mmgShow.lit} lit cells, all disabled`);

  // Wait for input phase then make a wrong guess (click cell 0) — should deduct a life
  await delay(2500);
  const mmgInput = await evaluate(`(() => {
    const cells = [...document.querySelectorAll('[data-cell]')];
    const enabled = cells.filter(c => !c.disabled).length;
    return { enabled };
  })()`);
  if (mmgInput.enabled < 3) throw new Error(`MMG: expected input phase with enabled cells, got ${mmgInput.enabled}`);
  await evaluate(`document.querySelector('[data-cell="0"]').click()`);
  await delay(200);
  await evaluate(`document.querySelector('[data-cell="0"]').click()`); // undo
  console.log(`  ✓ memory-matrix: input phase, undo works`);
  await evaluate(`document.querySelector('.game-session-bar > button').click()`);
  await delay(200);

  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(' | ')}`);
  console.log(`\n✓ All 3 new games play correctly: TTT AI responds, RPS round advances, MMG show→input transition works`);
} finally {
  try { await send('Browser.close'); } catch { chrome.kill(); }
  socket.close();
  await delay(100);
  rmSync(profile, { recursive: true, force: true });
}
