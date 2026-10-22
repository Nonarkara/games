import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Node 22 has a global WebSocket. Node 20 only has it behind this flag.
if (typeof WebSocket !== 'function') {
  if (process.execArgv.some(arg => arg.includes('experimental-websocket'))) {
    console.error('WebSocket is missing even with --experimental-websocket');
    process.exit(1);
  }
  const child = spawnSync(
    process.execPath,
    ['--experimental-websocket', ...process.execArgv, ...process.argv.slice(1)],
    { stdio: 'inherit' }
  );
  process.exit(child.status ?? 1);
}

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

// Page load is not app readiness. `Page.loadEventFired` fires when the
// document and its imports are in, but the floor renders its rails from the
// catalog in a later task, so an evaluate right after the event can still see
// an empty floor. A fixed sleep papers over that — it is right on localhost
// and wrong on a warm or cold network cache, in both directions. Poll for the
// thing the next step dereferences, and name it when it never arrives.
//
// The poll window must stay under CDP_CALL_TIMEOUT_MS, or the transport gives
// up before the poll can report why the selector is missing. Live cold cache
// measured ~6s from click to briefing; localhost is under 100ms. One budget
// has to cover both, and the honest one is the slower.
const CDP_CALL_TIMEOUT_MS = 20000;

// Clicking a cart can replace the whole document — the app follows the click
// to ?game=<id>, which on a cold cache is a fresh module graph and a NEW
// execution context. Evaluating straight into the old one fails with
// "Cannot find default execution context", and a naive retry then re-checks a
// document that no longer exists. So: click, absorb any navigation, then poll
// for readiness on whichever document survived.
async function clickAndSettle(page, clickExpression, selector, label, settleMs = 6000) {
  const navigated = page.waitFor('Page.loadEventFired', settleMs);
  await page.evaluate(clickExpression);
  await Promise.race([navigated, delay(settleMs)]);
  return waitForSelector(page, selector, label);
}

async function waitForSelector(page, selector, label, timeoutMs = 15000) {
  const outcome = await page.evaluate(`new Promise(resolve => {
    const sel = ${JSON.stringify(selector)};
    const t0 = Date.now();
    const tick = () => {
      const hit = document.querySelector(sel);
      if (hit) return resolve({ ok: true, href: location.href, ms: Date.now() - t0 });
      if (Date.now() - t0 > ${timeoutMs}) return resolve({
        ok: false,
        href: location.href,
        ready: document.readyState,
        ms: Date.now() - t0,
        hasBriefing: Boolean(document.querySelector('.brain-briefing')),
        hasStage: Boolean(document.querySelector('.game-session-stage')),
        bodyChildren: document.body ? document.body.children.length : -1,
        // What the document actually offers, so the failure names a cause
        // instead of just a missing selector.
        classes: [...document.querySelectorAll('[class]')].slice(0, 12).map(e => (e.className||'').toString().split(' ')[0])
      });
      setTimeout(tick, 50);
    };
    tick();
  })`);
  if (!outcome.ok) {
    throw new Error(`${label}: ${selector} never rendered within ${timeoutMs}ms — ${JSON.stringify(outcome)}`);
  }
  return outcome;
}

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
  const eventWaiters = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    for (let i = eventWaiters.length - 1; i >= 0; i--) {
      if (eventWaiters[i].method === message.method) eventWaiters.splice(i, 1)[0].resolve(message.params);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(`${target.id.slice(0, 8)} ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description || ''}`.trim());
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      browserErrors.push(`${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ''}`);
    }
  };
  // Resolve on the next matching CDP event. A fixed sleep is a guess about how
  // long a page takes; on localhost it holds, and over the network on a cold
  // cache the document is still loading when the guess runs out. The event is
  // the fact. `settled` absorbs an event that already fired before we asked.
  const waitFor = (method, timeoutMs = 20000) => new Promise((resolve, reject) => {
    const entry = { method, resolve };
    eventWaiters.push(entry);
    setTimeout(() => {
      const at = eventWaiters.indexOf(entry);
      if (at >= 0) eventWaiters.splice(at, 1)[0].resolve({ settled: false });
    }, timeoutMs);
  });
  const send = (method, params = {}) => {
    const id = ++callId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${CDP_CALL_TIMEOUT_MS}ms`));
      }, CDP_CALL_TIMEOUT_MS);
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
  if (startUrl !== 'about:blank') {
    // Wait for the document, not for a guess about it. A cold live cache pulls
    // ~20 ES modules over the network; 1000ms of sleep let the first
    // Runtime.evaluate land while the execution context was still being
    // replaced, which fails the whole sweep with "Cannot find default
    // execution context" before a single cart is touched.
    const loaded = waitFor('Page.loadEventFired');
    await delay(0);
    // The target was opened WITH the URL, so the load may already have fired.
    // Give the event a moment to arrive; if it does not, fall back to the
    // old pause rather than hanging.
    await Promise.race([loaded, delay(1500)]);
    await delay(250);
  }
  return { send, evaluate, screenshot, close, waitFor };
}

try {
  const main = await openPage(baseUrl);
  // Press Start 2P is substantially wider than the system fallback. Waiting
  // for font swap keeps overflow measurements deterministic in production.
  await main.evaluate(`document.fonts.ready.then(() => true)`);

  // The featured hero is rendered from the catalog after fonts settle, so on a
  // cold cache it can arrive a beat after openPage's wait. Wait for it rather
  // than dereferencing null — a TypeError from getComputedStyle says nothing
  // about which selector was missing or why.
  const heroReady = await main.evaluate(`new Promise(resolve => {
    const t0 = Date.now();
    const tick = () => {
      if (document.querySelector('.attract-feature')) return resolve(true);
      if (Date.now() - t0 > 8000) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  })`);

  const home = await main.evaluate(`(() => {
    const feat = document.querySelector('.attract-feature');
    return {
      title: document.title,
      games: document.querySelectorAll('[data-game]').length,
      viewport: innerWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
      hasFeature: Boolean(feat),
      featureStyle: feat ? (() => {
        const style = getComputedStyle(feat);
        return { borderLeft: style.borderLeft, boxShadow: style.boxShadow, background: style.backgroundColor };
      })() : null
    };
  })()`);
  if (!heroReady || !home.hasFeature) throw new Error('the featured hero never rendered — .attract-feature missing after 8s');
  if (Math.abs(home.viewport - viewportWidth) > 2) throw new Error(`home audited at ${home.viewport}px, wanted ${viewportWidth}px`);
  if (home.overflow > 1) throw new Error(`mobile home overflows by ${home.overflow}px`);
  await main.screenshot(screenshots.home);

  // The account system was reverted (3fab8eb) — no sign-in surface may ship.
  const account = await main.evaluate(`(() => ({
    link: Boolean(document.querySelector('#account-link')),
    panel: Boolean(document.querySelector('.account-panel'))
  }))()`);
  if (account.link || account.panel) throw new Error(`reverted account UI is back on the floor: ${JSON.stringify(account)}`);

  await main.evaluate(`document.querySelector('[data-wing="arcade"]').click(); true`);
  await waitForSelector(main, '.select-row[data-game="arcade-breakout"]', 'arcade wing rail');
  await clickAndSettle(
    main,
    `document.querySelector('.select-row[data-game="arcade-breakout"]').click(); true`,
    '.brain-briefing, .game-session-stage',
    'Breakout opened'
  );
  const briefing = await main.evaluate(`(() => {
    const exits = [...document.querySelectorAll('button')].filter(b => {
      if (b.textContent.replace(/\\s+/g, ' ').trim() !== 'EXIT') return false;
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width >= 1 && r.height >= 1;
    }).length;
    return {
      title: document.querySelector('#briefing-title')?.textContent,
      play: document.querySelector('.briefing-play')?.textContent,
      hidden: document.querySelector('#game-modal-overlay')?.classList.contains('hidden'),
      inBriefing: Boolean(document.querySelector('.brain-briefing')),
      hasStage: Boolean(document.querySelector('.game-session-stage')),
      closes: document.querySelectorAll('.briefing-close').length,
      exits
    };
  })()`);
  // A cart click may land on the briefing OR go straight into a live session —
  // the sweep already models both via `inPlay`. Asserting "a briefing always
  // opens" tested the click path, not the promise. The promise is that a cold
  // deep link shows the briefing (verified separately against live), and that
  // either surface is usable. So assert the usable invariant on both branches.
  if (briefing.hidden) throw new Error('cart click left the modal closed');
  if (briefing.inBriefing) {
    if (briefing.title !== 'Breakout 1976') throw new Error(`Breakout briefing title: ${JSON.stringify(briefing)}`);
    if (briefing.play !== 'PLAY') throw new Error(`Breakout briefing has no PLAY: ${JSON.stringify(briefing)}`);
    if (briefing.closes !== 0 || briefing.exits !== 1) throw new Error(`briefing should keep only the shell EXIT: ${JSON.stringify(briefing)}`);
    await main.screenshot(screenshots.briefing);
    await clickAndSettle(main, `document.querySelector('.briefing-play').click(); true`, '.game-session-stage', 'Breakout stage');
  } else if (!briefing.hasStage) {
    throw new Error(`cart click landed nowhere usable: ${JSON.stringify(briefing)}`);
  }
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
    await page.evaluate(`document.querySelector('[data-wing="all"]').click(); true`);
    await waitForSelector(page, '.select-row[data-game="color-march-pro"]', 'color-march-pro rail row');
    await clickAndSettle(
      page,
      `document.querySelector('.select-row[data-game="color-march-pro"]').click(); true`,
      '.brain-briefing, .game-session-stage',
      'Color March Pro opened'
    );
    const opened = await page.evaluate(`(() => {
      const inBriefing = Boolean(document.querySelector('.brain-briefing'));
      return inBriefing
        ? document.querySelector('#briefing-title')?.textContent === 'Color March Pro'
        : Boolean(document.querySelector('.game-session-stage'));
    })()`);
    if (!opened) throw new Error('Color March Pro opened on neither the briefing nor the stage');
    // Only a briefing has a PLAY control to press; a resumed session is
    // already past it.
    if (await page.evaluate(`Boolean(document.querySelector('.briefing-play'))`)) {
      await clickAndSettle(page, `document.querySelector('.briefing-play').click(); true`, '.game-session-stage', 'Color March Pro stage');
    }
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
      await page.evaluate(`document.querySelector('[data-wing="all"]').click(); true`);
      await waitForSelector(page, `.select-row[data-game="${id}"]`, `${id} rail row`);
      await clickAndSettle(
        page,
        `document.querySelector('.select-row[data-game="${id}"]').click(); true`,
        '.brain-briefing, .game-session-stage',
        `${id} opened`
      );
      const opened = await page.evaluate(`(() => {
        const exits = [...document.querySelectorAll('button')].filter(b => {
          if (b.textContent.replace(/\\s+/g, ' ').trim() !== 'EXIT') return false;
          const s = getComputedStyle(b);
          const r = b.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width >= 1 && r.height >= 1;
        }).length;
        return {
          found: true,
          title: document.querySelector('#briefing-title')?.textContent || '',
          hasPractice: Boolean(document.querySelector('.briefing-step:nth-of-type(2) p')?.textContent),
          hasCaveat: /not promised/i.test(document.querySelector('.briefing-caveat')?.textContent || ''),
          hasStart: Boolean(document.querySelector('.briefing-play')),
          // The briefing uses the same shell as play, so a stage that still
          // holds the briefing is not "already in play".
          inPlay: Boolean(document.querySelector('.game-session-stage')) && !document.querySelector('.brain-briefing'),
          closes: document.querySelectorAll('.briefing-close').length,
          exits
        };
      })()`);
      // No "row missing" check here: waitForSelector above already fails with
      // the cart id and the selector when the row never arrives, and a second
      // guard that can no longer fire is decoration.
      // A game already played in this profile opens straight in. First opens
      // still have to clear the briefing gate, and that gate has no CLOSE of its own.
      if (!opened.inPlay) {
        if (!opened.title || !opened.hasPractice || !opened.hasCaveat || !opened.hasStart) {
          throw new Error(`${id} has an incomplete briefing: ${JSON.stringify(opened)}`);
        }
        if (opened.closes !== 0 || opened.exits !== 1) {
          throw new Error(`${id} briefing should keep only the shell EXIT: ${JSON.stringify(opened)}`);
        }
        // Poll for the control rather than dereferencing it. The briefing is
        // confirmed one evaluate earlier and can be gone by the next one —
        // some carts render through a dynamic import and remount. A
        // null.click() says nothing about which of those happened, so if the
        // button never arrives, report what IS on screen instead.
        const started = await page.evaluate(`new Promise(resolve => {
          const t0 = Date.now();
          const tick = () => {
            const btn = document.querySelector('.briefing-play');
            if (btn) { btn.click(); return resolve(true); }
            if (Date.now() - t0 > 4000) return resolve({
              missing: true,
              hasBriefing: Boolean(document.querySelector('.brain-briefing')),
              hasStage: Boolean(document.querySelector('.game-session-stage')),
              title: document.querySelector('#briefing-title')?.textContent || null,
              buttons: [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,20)).slice(0,8)
            });
            setTimeout(tick, 50);
          };
          tick();
        })`);
        if (started !== true) {
          throw new Error(`${id} lost its PLAY control before it could be clicked: ${JSON.stringify(started)}`);
        }
      }
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
        const exits = [...document.querySelectorAll('button')].filter(b => {
          if (b.textContent.replace(/\\s+/g, ' ').trim() !== 'EXIT') return false;
          const s = getComputedStyle(b);
          const r = b.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width >= 1 && r.height >= 1;
        }).length;
        const mineCells = [...document.querySelectorAll('.mine-cell')].map(el => {
          const r = el.getBoundingClientRect();
          return Math.min(r.width, r.height);
        });
        return {
          mounted: Boolean(stage?.firstElementChild),
          height: stage?.firstElementChild?.getBoundingClientRect().height || 0,
          overflow: stage ? stage.scrollWidth - stage.clientWidth : 999,
          viewport: innerWidth,
          exits,
          mineCount: mineCells.length,
          mineMin: mineCells.length ? Math.min(...mineCells) : null
        , offenders };
      })()`);
    });
    if (Math.abs(result.viewport - viewportWidth) > 2) {
      throw new Error(`viewport was ${result.viewport}px while auditing ${id} — measurement rejected`);
    }
    if (!result.mounted || result.height < 1) throw new Error(`${id} mounted an empty play surface`);
    if (result.overflow > 2) throw new Error(`${id} overflows its ${viewportWidth}px stage by ${result.overflow}px: ${JSON.stringify(result.offenders)}`);
    if (id === 'cyber-tetris' && result.exits !== 1) {
      throw new Error(`cyber-tetris shows ${result.exits} EXIT buttons`);
    }
    if (id === 'minesweeper' && (result.mineCount < 64 || result.mineMin < 40)) {
      throw new Error(`minesweeper cells are ${result.mineMin}px across ${result.mineCount} cells`);
    }
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
