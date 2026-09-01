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
  game: process.env.GAME_SCREENSHOT || join(tmpdir(), 'omni-breakout-mobile.png'),
  colorMarch: process.env.COLOR_MARCH_SCREENSHOT || join(tmpdir(), 'omni-color-march.png')
};

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  // Pin the OS window LARGER than the emulated viewport. Under
  // --headless=new an OS window equal to the override can be shoved wider by
  // wide content, and once physically resized the device-metrics override
  // cannot shrink it back — later carts would be audited at ~500px while
  // still calling itself "mobile". Slack keeps the override authoritative.
  `--window-size=${viewportWidth + 40},${viewportHeight + 60}`,
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: 'ignore' });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch { /* Chrome is still starting. */ }
    await delay(250);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

await waitForDebugger();

const browserErrors = [];

// One CDP connection per browser target. Every cart is audited in a FRESH
// target: a long-lived tab lets wide canvases (Pong is 640px) physically
// resize the headless window mid-sweep, and no amount of re-pinning pulls a
// resized window back — cart #60 would silently be measured at ~500px.
async function openPage(startUrl) {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(startUrl)}`, { method: 'PUT' })
    .then(response => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let callId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(`${target.id.slice(0, 8)} ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description || ''}`.trim());
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      browserErrors.push(`${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ''}`);
    }
  };
  const send = (method, params = {}) => {
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
  };
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      const d = result.exceptionDetails;
      const where = `${d.scriptId || '?'}:${(d.lineNumber ?? '?') + 1}:${d.columnNumber ?? '?'}`;
      throw new Error(`page threw at ${where}: ${d.exception?.description || d.text}`);
    }
    return result.result.value;
  };
  const screenshot = async path => {
    const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(path, Buffer.from(result.data, 'base64'));
  };
  const pinViewport = () => send('Emulation.setDeviceMetricsOverride', {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: viewportWidth < 768
  });
  const close = () => {
    try { socket.close(); } catch { /* already gone */ }
    return fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await pinViewport();
  if (startUrl !== 'about:blank') await delay(1000);
  return { send, evaluate, screenshot, close };
}

try {
  const main = await openPage(baseUrl);
  // Press Start 2P is substantially wider than the system fallback. Waiting
  // for font swap keeps overflow measurements deterministic in production.
  await main.evaluate(`document.fonts.ready.then(() => true)`);

  const home = await main.evaluate(`(() => ({
    title: document.title,
    games: document.querySelectorAll('[data-game]').length,
    viewport: innerWidth,
    overflow: document.documentElement.scrollWidth - innerWidth,
    featureStyle: (() => {
      const style = getComputedStyle(document.querySelector('.attract-feature'));
      return { borderLeft: style.borderLeft, boxShadow: style.boxShadow, background: style.backgroundColor };
    })()
  }))()`);
  if (Math.abs(home.viewport - viewportWidth) > 2) throw new Error(`home audited at ${home.viewport}px, wanted ${viewportWidth}px`);
  if (home.overflow > 1) throw new Error(`mobile home overflows by ${home.overflow}px`);
  await main.screenshot(screenshots.home);

  // The account system was reverted (3fab8eb) — no sign-in surface may ship.
  const account = await main.evaluate(`(() => ({
    link: Boolean(document.querySelector('#account-link')),
    panel: Boolean(document.querySelector('.account-panel'))
  }))()`);
  if (account.link || account.panel) throw new Error(`reverted account UI is back on the floor: ${JSON.stringify(account)}`);

  const briefing = await main.evaluate(`(() => {
    document.querySelector('[data-wing="arcade"]').click();
    document.querySelector('[data-game="arcade-breakout"]').click();
    return {
      title: document.querySelector('#briefing-title')?.textContent,
      play: document.querySelector('.briefing-play')?.textContent,
      hidden: document.querySelector('#game-modal-overlay')?.classList.contains('hidden')
    };
  })()`);
  if (briefing.title !== 'Breakout 1976' || briefing.hidden) throw new Error('Breakout briefing did not open');
  await main.screenshot(screenshots.briefing);

  await main.evaluate(`document.querySelector('.briefing-play').click()`);
  await delay(300);
  const game = await main.evaluate(`(() => ({
    canvas: Boolean(document.querySelector('#breakout-canvas')),
    source: document.querySelector('.oss-game__controls a')?.href,
    overflow: document.querySelector('.game-session-stage')?.scrollWidth - document.querySelector('.game-session-stage')?.clientWidth
  }))()`);
  if (!game.canvas) throw new Error('Breakout canvas did not mount');
  if (!game.source?.includes('kubowania/breakout')) throw new Error('Breakout credit is missing');
  if (game.overflow > 1) throw new Error(`mobile game overflows by ${game.overflow}px`);
  await main.screenshot(screenshots.game);
  await main.close();

  // Color March Pro is a reading game, not a colour-picking game. Guard the
  // exact contract: one spelling match, five unique misleading inks, and
  // equally usable controls at both phone and desktop widths.
  const colorMarch = await withFreshPage(async page => {
    await page.evaluate(`document.fonts.ready.then(() => true)`);
    await page.evaluate(`document.querySelector('[data-wing="all"]').click()`);
    const opened = await page.evaluate(`(() => {
      const row = document.querySelector('.select-row[data-game="color-march-pro"]');
      if (!row) return false;
      row.click();
      return document.querySelector('#briefing-title')?.textContent === 'Color March Pro';
    })()`);
    if (!opened) throw new Error('Color March Pro briefing did not open');
    await page.evaluate(`document.querySelector('.briefing-play').click()`);
    await delay(150);
    const readyGate = await page.evaluate(`(() => {
      const gate = document.querySelector('.ngs-ready-gate');
      if (!gate) return false;
      gate.click();
      return true;
    })()`);
    if (!readyGate) throw new Error('Color March Pro skipped its fair-start gate');
    await delay(60);
    const state = await page.evaluate(`(() => {
      const palette = {
        RED: 'rgb(239, 68, 68)', GREEN: 'rgb(34, 197, 94)',
        BLUE: 'rgb(59, 130, 246)', ORANGE: 'rgb(245, 158, 11)',
        PURPLE: 'rgb(168, 85, 247)'
      };
      const targetNode = document.querySelector('#march-feedback')?.previousElementSibling;
      const target = targetNode?.textContent.trim();
      const choices = [...document.querySelectorAll('.march-choice')].map(button => ({
        word: button.dataset.name,
        ink: getComputedStyle(button).color,
        height: button.getBoundingClientRect().height
      }));
      const stage = document.querySelector('.game-session-stage');
      return {
        target,
        targetInk: targetNode ? getComputedStyle(targetNode).color : '',
        choices,
        spellingMatches: choices.filter(choice => choice.word === target).length,
        uniqueWords: new Set(choices.map(choice => choice.word)).size,
        uniqueInks: new Set(choices.map(choice => choice.ink)).size,
        allInksMislead: choices.every(choice => choice.ink !== palette[choice.word]),
        promptInkMisleads: Boolean(target && getComputedStyle(targetNode).color !== palette[target]),
        matchingInkIsDecoy: choices.some(choice => choice.ink === getComputedStyle(targetNode).color && choice.word !== target),
        correctInkDoesNotMatchPrompt: choices.find(choice => choice.word === target)?.ink !== getComputedStyle(targetNode).color,
        minChoiceHeight: Math.min(...choices.map(choice => choice.height)),
        overflow: stage ? stage.scrollWidth - stage.clientWidth : 999
      };
    })()`);
    if (state.spellingMatches !== 1 || state.uniqueWords !== 5 || state.uniqueInks !== 5) {
      throw new Error(`Color March answer set is ambiguous: ${JSON.stringify(state)}`);
    }
    if (!state.allInksMislead || !state.promptInkMisleads || !state.matchingInkIsDecoy || !state.correctInkDoesNotMatchPrompt) {
      throw new Error(`Color March ink gave away an answer: ${JSON.stringify(state)}`);
    }
    if (state.minChoiceHeight < 44 || state.overflow > 2) {
      throw new Error(`Color March controls fail touch/overflow audit: ${JSON.stringify(state)}`);
    }
    await page.screenshot(screenshots.colorMarch);
    const feedback = await page.evaluate(`(() => {
      const target = document.querySelector('#march-feedback')?.previousElementSibling?.textContent.trim();
      document.querySelector('.march-choice[data-name="' + target + '"]')?.click();
      return document.querySelector('#march-feedback')?.textContent;
    })()`);
    if (!feedback?.startsWith('CORRECT')) throw new Error(`Color March correct spelling failed: ${feedback}`);
    return { ...state, feedback };
  });

  // Full floor: every scoring cartridge must pass its briefing gate, mount a
  // non-empty play surface, stay inside the requested viewport, and mount in
  // a tab whose emulated size actually held.
  const catalogIds = await withFreshPage(async main => {
    await main.evaluate(`document.fonts.ready.then(() => true)`);
    await main.evaluate(`document.querySelector('[data-wing="all"]').click()`);
    return main.evaluate(`[...document.querySelectorAll('.select-row[data-game]')]
      .map(row => row.dataset.game)
      .filter(id => id !== 'about-dr-non')`);
  });

  const sampledGames = [];
  const catalogSweep = [];
  for (const id of catalogIds) {
    process.stdout.write(`  sweep ${catalogSweep.length + 1}/${catalogIds.length} ${id}\n`);
    const extraDelay = id === 'arcade-pong' ? 400 : 70;
    const result = await withFreshPage(async page => {
      await page.evaluate(`document.fonts.ready.then(() => true)`);
      await page.evaluate(`document.querySelector('[data-wing="all"]').click()`);
      const opened = await page.evaluate(`(() => {
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
      await page.evaluate(`document.querySelector('.briefing-play').click()`);
      await delay(extraDelay);
      return page.evaluate(`(() => {
        const stage = document.querySelector('.game-session-stage');
        const stageRect = stage?.getBoundingClientRect();
        const offenders = stage && stageRect ? [...stage.querySelectorAll('*')]
          .map(el => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.right > stageRect.right + 2)
          .slice(0, 5)
          .map(({ el, rect }) => ({
            tag: el.tagName,
            className: String(el.className || '').slice(0, 120),
            text: String(el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          })) : [];
        return {
          mounted: Boolean(stage?.firstElementChild),
          height: stage?.firstElementChild?.getBoundingClientRect().height || 0,
          overflow: stage ? stage.scrollWidth - stage.clientWidth : 999,
          viewport: innerWidth
        , offenders };
      })()`);
    });
    if (Math.abs(result.viewport - viewportWidth) > 2) {
      throw new Error(`viewport was ${result.viewport}px while auditing ${id} — measurement rejected`);
    }
    if (!result.mounted || result.height < 1) throw new Error(`${id} mounted an empty play surface`);
    if (result.overflow > 2) throw new Error(`${id} overflows its ${viewportWidth}px stage by ${result.overflow}px: ${JSON.stringify(result.offenders)}`);
    catalogSweep.push(id);
    if (['arcade-pong', 'dual-n-back', 'cyber-tetris', 'math-safari', 'blow-cartridge'].includes(id)) {
      sampledGames.push({ id, mounted: result.mounted, overflow: result.overflow });
    }
  }

  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(' | ')}`);
  console.log(JSON.stringify({ home, account, briefing, game, colorMarch, sampledGames, catalogSweep: { count: catalogSweep.length, ids: catalogSweep }, screenshots }, null, 2));
} finally {
  try { await fetch(`http://127.0.0.1:${port}/json/close`); } catch { /* fall through */ }
  try { chrome.kill(); } catch { /* already gone */ }
  await delay(100);
  rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}

async function withFreshPage(fn) {
  const page = await openPage(baseUrl);
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}
