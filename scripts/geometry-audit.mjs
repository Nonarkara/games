#!/usr/bin/env node
/**
 * Rendered geometry + contrast audit — the MSH gate (CLAUDE.md §11.12).
 *
 * WHY THIS EXISTS
 * Source scans and box-model reasoning kept passing surfaces that were wrong
 * to look at. The last audit measured widths, reported "every header control
 * measures 0% slack", and shipped a header whose buttons were 75px boxes
 * around 12px words, whose Research entry point was 1.02:1 near-white on a
 * paper bar (invisible), and whose own proof screenshot showed the blank cell.
 * The instrument that produced that claim lived in /tmp and died with it.
 * This is the same instrument, committed, with the rules written down.
 *
 * It renders the real page in real Chrome and measures pixels. It never reads
 * CSS and never trusts a declared size — the only evidence is where things
 * landed.
 *
 *   node scripts/geometry-audit.mjs            audit the working tree
 *   GEOMETRY_ROOT=/some/copy node ...          audit a different tree (mutation proofs)
 *   GEOMETRY_URL=https://host/ node ...        audit a LIVE site instead of the tree
 *                                              (CDPT step 4: test the web, not the checkout)
 *   CHROME_PATH=/path/to/chrome node ...
 *
 * THE RULES (each is a sentence from §11.12, not a taste)
 *  R1  Fixed chrome is a small share of the viewport.            <= 6.5 %
 *  R2  A bar is as tall as what it holds: header height.         <= 48 px
 *  R3  A box is its label plus padding. In a group of >= 3 sibling controls
 *      a ONE-LINE label may not be more than 24 px taller than its words
 *      (floor 40 px); primary entry actions (below) get 28 px (floor 48 px).
 *      A multi-line CARD (label + hint) is allowed 40 px of its own padding —
 *      it is holding something. That split is the point: the last audit's
 *      detector flagged both alike and drowned in false positives.
 *  R4  No control is under the 24 px WCAG 2.2 floor (links inside running
 *      text are exempt — they get an invisible hit area, not a taller line).
 *  R5  Header text meets AA (4.5:1; 3:1 large) against the bar AS RENDERED.
 *  R6  No horizontal overflow.
 *  R7  The first answer is near the top: first cartridge within N screens.
 *  R8  On a phone the briefing's PLAY stays reachable without scrolling even
 *      when the briefing is absurdly long (a 2400px spacer is injected).
 *  R9  The home title stays inside its hero instead of being clipped above it.
 *
 * LIMITS (stated, not hidden)
 *  - R5 judges the header only. Elsewhere a photo, gradient or pseudo-element
 *    can sit behind text and a computed-style audit would be guessing; a wrong
 *    guess here is how the last audit's detector generated 55 findings of
 *    which none were real. A page-wide contrast sweep found the amber-chip
 *    pattern (white 9px on amber, 2.15:1) and the dim-ink token failing on
 *    both grounds — recorded in docs/AUDIT-2026-10-22.md, not gated, because
 *    fixing it is a palette decision.
 *  - Thresholds are a ratchet at the current good state, not a target. Lower
 *    them when the page improves; never raise one to make a build pass.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (typeof WebSocket !== 'function') {
  console.error('geometry-audit needs a global WebSocket (Node 22+).');
  process.exit(2);
}

const ROOT = resolve(process.env.GEOMETRY_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const LIMITS = {
  chromeShare: 0.065,
  headerHeight: 48,
  firstCartridgeScreens: { phone: 1.0, tablet: 1.7, desktop: 1.7 }
};

const VIEWPORTS = [
  { name: 'phone', w: 390, h: 844, mobile: true },
  { name: 'tablet', w: 1024, h: 900, mobile: false },
  { name: 'desktop', w: 1440, h: 900, mobile: false }
];

// The page's primary entry actions. They get the tap-floor ceiling instead of
// the dense-group one. Each is a reviewed decision, not a silencer.
const PRIMARY = [
  '.attract-picks',   // QUICK HIT / PICK FOR ME / SURPRISE — the three ways to start
  '.cabinet-wings',   // the room chooser — primary navigation of the whole catalogue
  '.daily-list',      // Today's Five — five launch actions
  '.briefing-side'    // PLAY / SKIP / source — the briefing's whole action stack
];

/* ───────────────────────── in-page audit (runs in Chrome) ───────────────── */
function auditInPage(args) {
  const { scene, viewport, limits, primary, rootSelector } = args;
  const violations = [];
  const metrics = {};
  const vw = innerWidth, vh = innerHeight;
  const flag = (rule, detail) => violations.push({ rule, scene, viewport, detail });

  const visible = el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const textHeight = el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, top = Infinity, bottom = -Infinity;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue;
      const g = document.createRange(); g.selectNodeContents(n);
      for (const x of g.getClientRects()) { if (x.height <= 0) continue; top = Math.min(top, x.top); bottom = Math.max(bottom, x.bottom); }
    }
    return bottom < 0 ? 0 : bottom - top;
  };
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');
  const words = el => (el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 18);

  const CONTROLS = 'button, a[href], summary, [role=tab], select';
  // An open panel sits over the home page, which stays in the DOM and still
  // reports a size. Judging it would blame a panel for the page behind it.
  const OVERLAY = '.game-modal-overlay, [role=dialog], [class*="overlay"]';
  const root = rootSelector
    ? (document.querySelector(rootSelector)?.closest(OVERLAY) || document.querySelector(rootSelector)?.parentElement || document.body)
    : document.body;

  // R3 + R4 run on every scene.
  const groups = new Map();
  for (const c of root.querySelectorAll(CONTROLS)) {
    if (!visible(c)) continue;
    let p = c.parentElement;
    while (p && p.children.length === 1 && p !== document.body) p = p.parentElement; // li>a, div>button
    if (!p) continue;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(c);
  }
  for (const [parent, ctrls] of groups) {
    if (ctrls.length < 3) continue;
    const isPrimary = primary.some(sel => parent.matches(sel));
    for (const c of ctrls) {
      const h = c.getBoundingClientRect().height;
      const th = textHeight(c);
      const card = th > 20;   // two lines of text or more: a card, not a label
      const ceiling = card ? th + 40 : (isPrimary ? Math.max(48, th + 28) : Math.max(40, th + 24));
      if (h > ceiling + 0.5) {
        flag('R3', `${name(c)} "${words(c)}" is ${Math.round(h)}px tall around ${Math.round(th)}px of text ` +
          `(ceiling ${Math.round(ceiling)}px for a ${card ? 'card' : isPrimary ? 'primary' : 'dense'} group of ${ctrls.length} in ${name(parent)})`);
      }
    }
  }
  const inRunningText = a => {
    const p = a.closest('p, li, dd, blockquote');
    return !!p && [...p.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 12);
  };
  for (const c of root.querySelectorAll(CONTROLS + ', input')) {
    if (!visible(c)) continue;
    const r = c.getBoundingClientRect();
    if (r.height >= 24 && r.width >= 24) continue;
    if (c.tagName === 'A' && inRunningText(c)) continue;
    flag('R4', `${name(c)} "${words(c)}" is ${Math.round(r.width)}x${Math.round(r.height)}px — under the 24px WCAG 2.2 floor`);
  }
  if (document.documentElement.scrollWidth > vw + 1) {
    flag('R6', `page scrolls sideways: scrollWidth ${document.documentElement.scrollWidth} > viewport ${vw}`);
  }

  if (scene === 'home') {
    // A title can have a real box yet be clipped by its hero's overflow.
    // This was missed at 1024px when the absolute copy exceeded its image.
    const hero = document.querySelector('.attract-hero');
    const title = hero?.querySelector('h1');
    if (!title || !visible(title)) flag('R9', 'home title is missing');
    else {
      const box = hero.getBoundingClientRect(), label = title.getBoundingClientRect();
      metrics.titleClipped = label.top < box.top - 1 || label.bottom > box.bottom + 1;
      if (metrics.titleClipped) flag('R9', 'home title extends outside its hero and is clipped');
    }
    // R1 / R2
    const chrome = [...document.querySelectorAll('body *')].filter(el => {
      const cs = getComputedStyle(el);
      return (cs.position === 'fixed' || cs.position === 'sticky') && visible(el);
    });
    const chromePx = chrome.reduce((a, el) => a + el.getBoundingClientRect().height, 0);
    metrics.chromeSharePct = +(chromePx / vh * 100).toFixed(1);
    if (chromePx / vh > limits.chromeShare) {
      flag('R1', `fixed chrome is ${metrics.chromeSharePct}% of the viewport (limit ${limits.chromeShare * 100}%): ` +
        chrome.map(el => `${name(el)} ${Math.round(el.getBoundingClientRect().height)}px`).join(', '));
    }
    const header = document.querySelector('#app-header');
    const hh = header.getBoundingClientRect().height;
    metrics.headerPx = Math.round(hh);
    if (hh > limits.headerHeight) flag('R2', `header is ${Math.round(hh)}px tall (limit ${limits.headerHeight}px)`);

    // R5 — header contrast as rendered
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const page = parse(getComputedStyle(document.body).backgroundColor);
    const base = page && page.a > 0 ? over(page, { r: 10, g: 14, b: 20, a: 1 }) : { r: 10, g: 14, b: 20, a: 1 };
    const bgOf = el => {
      const stack = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
      }
      let acc = base; for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc); return acc;
    };
    let worst = Infinity;
    for (const el of header.querySelectorAll('*')) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const field = el.tagName === 'INPUT';
      if ((!own && !field) || el.getBoundingClientRect().width === 0) continue;
      const cs = getComputedStyle(el); const bg = bgOf(el);
      let fg = parse(field ? getComputedStyle(el, '::placeholder').color : cs.color);
      if (!fg) continue; if (fg.a < 1) fg = over(fg, bg);
      const px = parseFloat(cs.fontSize);
      const need = (px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700)) ? 3 : 4.5;
      const cr = ratio(fg, bg); worst = Math.min(worst, cr);
      if (cr < need) flag('R5', `header text "${field ? 'placeholder' : words(el)}" is ${cr.toFixed(2)}:1 (needs ${need}:1) — ${name(el)} ${cs.color}`);
    }
    metrics.worstHeaderContrast = +worst.toFixed(2);

    // R7
    const first = document.querySelector('.select-row');
    if (!first) flag('R7', 'no cartridge rendered on the home screen');
    else {
      const screens = (first.getBoundingClientRect().top + scrollY) / vh;
      metrics.firstCartridgeScreens = +screens.toFixed(2);
      const limit = limits.firstCartridgeScreens[viewport];
      if (screens > limit) flag('R7', `first cartridge is ${screens.toFixed(2)} screens down (limit ${limit})`);
    }
  }

  if (scene === 'research') {
    const rail = document.querySelector('.research-tabs');
    if (rail) metrics.railPx = Math.round(rail.getBoundingClientRect().height);
  }

  if (scene === 'briefing' && viewport === 'phone') {
    // Stress the MECHANISM, not whichever cart happens to be first. Dual
    // N-Back's briefing is short enough that PLAY sits above the fold even
    // when nothing pins it, so measuring it as-is cannot tell a pinned button
    // from an unpinned one — a probe that unpinned PLAY went green. A 2400px
    // spacer stands in for the longest briefing anyone will ever write: only a
    // button that is actually pinned survives it.
    const primary = document.querySelector('.brain-briefing .briefing-primary') || document.querySelector('.brain-briefing');
    const spacer = document.createElement('div');
    spacer.style.cssText = 'height:2400px';
    primary.appendChild(spacer);
    void document.body.offsetHeight; // flush layout before measuring
    const play = document.querySelector('.briefing-play');
    if (!play) flag('R8', 'briefing has no PLAY button');
    else {
      const b = play.getBoundingClientRect();
      metrics.playBottom = Math.round(b.bottom);
      if (b.bottom > vh + 1) flag('R8', `PLAY ends at ${Math.round(b.bottom)}px, below the ${vh}px fold — the one action this screen exists for needs a scroll`);
    }
  }
  return { violations, metrics };
}

/* ───────────────────────── plumbing ──────────────────────────────────────── */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
// Auditing a live URL is the point of CDPT step 4: a contrast bug does not show
// up in a source check, only in a render of what was actually deployed.
const origin = (process.env.GEOMETRY_URL || `http://127.0.0.1:${server.address().port}`).replace(/\/$/, '');

if (!existsSync(CHROME)) {
  console.error(`geometry-audit: no Chrome at ${CHROME}. Set CHROME_PATH.`);
  server.close(); process.exit(2);
}
// Ask the OS for a free port instead of guessing one: a guessed port can still
// be held by the Chrome the previous run just killed, and the audit then
// "could not complete" for reasons that have nothing to do with the page.
const debugPort = await new Promise(resolve => {
  const probe = http.createServer();
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const profile = mkdtempSync(join(tmpdir(), 'geometry-audit-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  // Window larger than the emulated viewport: wide content can otherwise
  // physically resize a headless window and the override never shrinks back.
  '--window-size=1500,1000',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cleanup(code) {
  try { chrome.kill('SIGKILL'); } catch {}
  server.close();
  await sleep(150);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

// The budget is generous on purpose: this machine routinely carries several
// agents and dev servers at once (load average 380 was measured the day this
// was written), and Chrome took over 30s to start under it. A short timeout
// would turn "the box is busy" into a false failure and teach people to skip
// the gate.
async function waitForChrome() {
  for (let i = 0; i < 480; i++) {
    if (chrome.exitCode !== null) throw new Error(`Chrome exited early with code ${chrome.exitCode}`);
    try { if ((await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up within 120s');
}

async function openPage(url) {
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const pending = new Map(); const waiters = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { ok, bad } = pending.get(m.id); pending.delete(m.id); m.error ? bad(new Error(m.error.message)) : ok(m.result); }
    else if (m.method) for (const w of waiters) if (w.method === m.method) w.ok(m.params);
  };
  const send = (method, params = {}) => new Promise((ok, bad) => {
    const n = ++id; pending.set(n, { ok, bad });
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => { if (pending.has(n)) { pending.delete(n); bad(new Error(`${method} timed out`)); } }, 60000);
  });
  const waitFor = (method, ms = 60000) => new Promise((ok, bad) => {
    const w = { method, ok };
    waiters.push(w);
    setTimeout(() => bad(new Error(`${method} never fired`)), ms);
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, waitFor, evaluate, close: () => { try { ws.close(); } catch {} } };
}

const poll = (page, selector, ms = 40000) => page.evaluate(`new Promise(res => {
  const t0 = Date.now();
  const tick = () => document.querySelector(${JSON.stringify(selector)}) ? res(true)
    : Date.now() - t0 > ${ms} ? res(false) : setTimeout(tick, 60);
  tick();
})`);

async function runScene(vp, scene) {
  const page = await openPage('about:blank');
  try {
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile });
    const loaded = page.waitFor('Page.loadEventFired');
    await page.send('Page.navigate', { url: `${origin}/` });
    await loaded;
    if (!(await poll(page, '.select-row'))) throw new Error(`${vp.name}/${scene}: the floor never rendered`);
    if (scene === 'research') {
      await page.evaluate(`document.querySelector('#research-link').click()`);
      if (!(await poll(page, '.research-tabs'))) throw new Error(`${vp.name}/research: the Research panel never opened`);
    }
    if (scene === 'briefing') {
      await page.evaluate(`document.querySelector('.select-row').click()`);
      if (!(await poll(page, '.briefing-play'))) throw new Error(`${vp.name}/briefing: the briefing never opened`);
    }
    await sleep(250); // let layout settle after the last paint
    const rootSelector = scene === 'research' ? '.research-tabs' : scene === 'briefing' ? '.brain-briefing' : null;
    const args = { scene, viewport: vp.name, limits: LIMITS, primary: PRIMARY, rootSelector };
    return await page.evaluate(`(${auditInPage.toString()})(${JSON.stringify(args)})`);
  } finally { page.close(); }
}

try {
  await waitForChrome();
  const all = [], rows = [];
  for (const vp of VIEWPORTS) {
    const scenes = vp.name === 'phone' ? ['home', 'research', 'briefing'] : ['home', 'research'];
    for (const scene of scenes) {
      const { violations, metrics } = await runScene(vp, scene);
      all.push(...violations);
      rows.push(`  ${vp.name.padEnd(8)}${scene.padEnd(10)}${violations.length ? 'FAIL ' + violations.length : 'ok'}`.padEnd(40) + JSON.stringify(metrics));
    }
  }
  console.log(`geometry-audit: ${VIEWPORTS.length} viewports, rendered in Chrome (${origin})`);
  rows.forEach(r => console.log(r));
  if (all.length) {
    console.error(`\n${all.length} violation(s) — spatial hallucination or unreadable text, measured on rendered pixels:\n`);
    for (const v of all) console.error(`  ${v.rule}  ${v.viewport}/${v.scene}  ${v.detail}`);
    console.error('\nThe repair is deletion or regrouping, never padding (CLAUDE.md §11.12).');
    await cleanup(1);
  }
  console.log('geometry: no violations');
  await cleanup(0);
} catch (err) {
  // Infrastructure failure (Chrome would not start, the page never rendered) —
  // not a finding. Retry once in a fresh process with a fresh Chrome and port.
  // Real violations exit 1 above and never reach here, so a retry cannot turn
  // a failing page into a passing run.
  if (process.env.GEOMETRY_RETRIED !== '1') {
    console.error(`geometry-audit: ${err.message} — retrying once in a fresh process`);
    try { chrome.kill('SIGKILL'); } catch {}
    server.close();
    await sleep(1500);
    const { spawnSync } = await import('node:child_process');
    const again = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      stdio: 'inherit', env: { ...process.env, GEOMETRY_RETRIED: '1' }
    });
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
    process.exit(again.status ?? 2);
  }
  console.error('geometry-audit could not complete:', err.message);
  await cleanup(2);
}
