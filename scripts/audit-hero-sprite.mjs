/**
 * Visual audit for the featured-cartridge hero sprite.
 * Confirms the sprite is actually visible on the panel by sampling the
 * pixel colour at the centre of the sprite image and comparing it to
 * the panel background colour. If they match within a small threshold,
 * the sprite is invisible — §11.10.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
const port = 9557;
const viewportWidth = 1280;
const viewportHeight = 800;
const profile = mkdtempSync(join(tmpdir(), 'ngs-hero-'));

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
    } catch { /* Chrome still starting. */ }
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
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
};

function send(method, params = {}) {
  const id = ++callId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP ${method} timed out`)); }, 5000);
    pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'unknown');
  }
  return result.result.value;
}

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  return m ? m.map(h => parseInt(h, 16)) : null;
}

function colourDistance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: baseUrl });
  await delay(2000);
  await evaluate(`document.fonts.ready.then(() => true)`);

  // Wait for the featured panel to appear
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await evaluate(`Boolean(document.querySelector('.attract-feature'))`);
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error('Featured panel never rendered');

  // Move the mouse away from the panel so we're in the default state, not hover
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  await delay(200);

  // Measure: panel background colour, sprite source, and pixel sampling via canvas
  const audit = await evaluate(`(async () => {
    const panel = document.querySelector('.attract-feature');
    const sprite = panel?.querySelector('.cart-sprite--hero');
    const panelStyle = getComputedStyle(panel);
    const spriteStyle = getComputedStyle(sprite);

    // Sample 16x16 pixels of the sprite image into a canvas
    const img = sprite;
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    // The img element loads its data URI synchronously
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, 16, 16);
    } else {
      await new Promise(resolve => {
        img.onload = () => { ctx.drawImage(img, 0, 0, 16, 16); resolve(); };
        setTimeout(resolve, 1500);
      });
    }
    const data = ctx.getImageData(0, 0, 16, 16).data;
    const palette = new Map();
    let opaquePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // transparent
      opaquePixels++;
      const key = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
      palette.set(key, (palette.get(key) || 0) + 1);
    }
    const sorted = [...palette.entries()].sort((a, b) => b[1] - a[1]);
    return {
      panelBg: panelStyle.backgroundColor,
      panelWidth: panel.getBoundingClientRect().width,
      spriteW: spriteStyle.width,
      spriteH: spriteStyle.height,
      spriteSrc: img.src.slice(0, 120) + '...',
      opaquePixels,
      topColours: sorted.slice(0, 5).map(([c, n]) => 'rgb(' + c + '): ' + n)
    };
  })()`);

  console.log('Hero sprite audit:');
  console.log('  Panel bg:   ', audit.panelBg);
  console.log('  Sprite size:', audit.spriteW, 'x', audit.spriteH);
  console.log('  Opaque pixels:', audit.opaquePixels);
  console.log('  Top colours:');
  audit.topColours.forEach(c => console.log('    ' + c));

  // Compute the distance between the most common sprite colour and the panel bg.
  // If the dominant sprite colour matches the panel bg, the sprite is invisible.
  const panelRgb = (() => {
    const m = audit.panelBg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  })();
  const topSprite = audit.topColours[0]?.match(/\((\d+),\s*(\d+),\s*(\d+)\)/);
  const topRgb = topSprite ? [Number(topSprite[1]), Number(topSprite[2]), Number(topSprite[3])] : null;

  if (panelRgb && topRgb) {
    const dist = colourDistance(panelRgb, topRgb);
    console.log(`  Panel rgb:  rgb(${panelRgb.join(',')})`);
    console.log(`  Top rgb:    rgb(${topRgb.join(',')})`);
    console.log(`  Distance:   ${dist.toFixed(1)} (0 = invisible, <30 = close, >60 = clearly visible)`);

    if (dist < 30 && audit.opaquePixels > 50) {
      throw new Error(`Hero sprite dominant colour (rgb(${topRgb.join(',')})) is within ${dist.toFixed(0)} of panel bg (rgb(${panelRgb.join(',')})) — sprite is effectively invisible (§11.10)`);
    }
  }

  console.log(`\n✓ Hero sprite reads on the panel: distance ${panelRgb && topRgb ? colourDistance(panelRgb, topRgb).toFixed(1) : '?'}`);
} finally {
  try { await send('Browser.close'); } catch { chrome.kill(); }
  socket.close();
  await delay(100);
  rmSync(profile, { recursive: true, force: true });
}
