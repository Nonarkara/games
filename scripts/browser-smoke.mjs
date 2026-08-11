import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
const port = Number(process.env.CDP_PORT || 9333);
const viewportWidth = Number(process.env.SMOKE_WIDTH || 390);
const viewportHeight = Number(process.env.SMOKE_HEIGHT || 844);
const profile = mkdtempSync(join(tmpdir(), 'omni-smoke-'));
const screenshots = {
  home: process.env.HOME_SCREENSHOT || join(tmpdir(), 'omni-home-mobile.png'),
  briefing: process.env.BRIEFING_SCREENSHOT || join(tmpdir(), 'omni-briefing-mobile.png'),
  game: process.env.GAME_SCREENSHOT || join(tmpdir(), 'omni-breakout-mobile.png')
};

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank'
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
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

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
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    browserErrors.push(`${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ''}`);
  }
};

function send(method, params = {}) {
  const id = ++callId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP ${method} timed out after 5s`));
    }, 5000);
    pending.set(id, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); }
    });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(path) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: viewportWidth < 768
  });
  await send('Page.navigate', { url: baseUrl });
  await delay(1200);

  const home = await evaluate(`(() => ({
    title: document.title,
    games: document.querySelectorAll('[data-game]').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
    featureStyle: (() => {
      const style = getComputedStyle(document.querySelector('.attract-feature'));
      return { borderLeft: style.borderLeft, boxShadow: style.boxShadow, background: style.backgroundColor };
    })()
  }))()`);
  if (home.overflow > 1) throw new Error(`mobile home overflows by ${home.overflow}px`);
  await screenshot(screenshots.home);

  const briefing = await evaluate(`(() => {
    document.querySelector('[data-wing="arcade"]').click();
    document.querySelector('[data-game="arcade-breakout"]').click();
    return {
      title: document.querySelector('#briefing-title')?.textContent,
      play: document.querySelector('.briefing-play')?.textContent,
      hidden: document.querySelector('#game-modal-overlay')?.classList.contains('hidden')
    };
  })()`);
  if (briefing.title !== 'Breakout 1976' || briefing.hidden) throw new Error('Breakout briefing did not open');
  await screenshot(screenshots.briefing);

  await evaluate(`document.querySelector('.briefing-play').click()`);
  await delay(300);
  const game = await evaluate(`(() => ({
    canvas: Boolean(document.querySelector('#breakout-canvas')),
    source: document.querySelector('.oss-game__controls a')?.href,
    overflow: document.querySelector('.game-session-stage')?.scrollWidth - document.querySelector('.game-session-stage')?.clientWidth
  }))()`);
  if (!game.canvas) throw new Error('Breakout canvas did not mount');
  if (!game.source?.includes('kubowania/breakout')) throw new Error('Breakout credit is missing');
  if (game.overflow > 1) throw new Error(`mobile game overflows by ${game.overflow}px`);
  await screenshot(screenshots.game);

  const sampledGames = [];
  for (const [wing, id, expected] of [
    ['arcade', 'arcade-pong', '#pong-canvas'],
    ['train', 'dual-n-back', '.game-session-stage > *'],
    ['arcade', 'cyber-tetris', 'canvas'],
    ['learn', 'math-safari', '.game-session-stage > *'],
    ['labs', 'blow-cartridge', '.game-session-stage > *']
  ]) {
    await evaluate(`document.querySelector('.game-session-bar > button').click()`);
    await evaluate(`(() => {
      document.querySelector('[data-wing="${wing}"]').click();
      document.querySelector('[data-game="${id}"]').click();
      document.querySelector('.briefing-play').click();
    })()`);
    await delay(180);
    const sample = await evaluate(`(() => {
      const stage = document.querySelector('.game-session-stage');
      return {
        id: '${id}',
        mounted: Boolean(document.querySelector('${expected}')),
        overflow: stage.scrollWidth - stage.clientWidth
      };
    })()`);
    if (!sample.mounted) throw new Error(`${id} did not mount`);
    if (sample.overflow > 1) throw new Error(`${id} overflows its mobile stage by ${sample.overflow}px`);
    sampledGames.push(sample);
  }

  // Full floor: every scoring cartridge must pass its briefing gate, mount a
  // non-empty play surface, stay within the viewport, and tear down cleanly.
  await evaluate(`document.querySelector('.game-session-bar > button').click()`);
  await evaluate(`document.querySelector('[data-wing="all"]').click()`);
  const catalogIds = await evaluate(`[...document.querySelectorAll('.select-row[data-game]')]
    .map(row => row.dataset.game)
    .filter(id => id !== 'about-dr-non')`);
  const catalogSweep = [];
  for (const id of catalogIds) {
    process.stdout.write(`  sweep ${catalogSweep.length + 1}/${catalogIds.length} ${id}\n`);
    const opened = await evaluate(`(() => {
      const row = document.querySelector('.select-row[data-game="${id}"]');
      if (!row) return { found: false };
      row.click();
      return {
        found: true,
        title: document.querySelector('#briefing-title')?.textContent || '',
        hasPractice: Boolean(document.querySelector('.briefing-step:nth-of-type(2) p')?.textContent),
        hasCaveat: /not promised/i.test(document.querySelector('.briefing-caveat')?.textContent || ''),
        hasStart: Boolean(document.querySelector('.briefing-play'))
      };
    })()`);
    if (!opened.found || !opened.title || !opened.hasPractice || !opened.hasCaveat || !opened.hasStart) {
      throw new Error(`${id} has an incomplete briefing: ${JSON.stringify(opened)}`);
    }
    await evaluate(`document.querySelector('.briefing-play').click()`);
    await delay(70);
    const mounted = await evaluate(`(() => {
      const stage = document.querySelector('.game-session-stage');
      return {
        mounted: Boolean(stage?.firstElementChild),
        height: stage?.firstElementChild?.getBoundingClientRect().height || 0,
        overflow: stage ? stage.scrollWidth - stage.clientWidth : 999
      };
    })()`);
    if (!mounted.mounted || mounted.height < 1) throw new Error(`${id} mounted an empty play surface`);
    if (mounted.overflow > 2) throw new Error(`${id} overflows its ${viewportWidth}px stage by ${mounted.overflow}px`);
    catalogSweep.push(id);
    await evaluate(`document.querySelector('.game-session-bar > button').click()`);
  }

  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(' | ')}`);
  console.log(JSON.stringify({ home, briefing, game, sampledGames, catalogSweep: { count: catalogSweep.length, ids: catalogSweep }, screenshots }, null, 2));
} finally {
  try { await send('Browser.close'); } catch { chrome.kill(); }
  socket.close();
  await delay(100);
  rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}
