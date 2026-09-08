// Play a real Paper Soccer match in a real browser, as a player would: point,
// hold for weight, release; tap where a man should be; repeat.
//
// The hero cart's rules can be checked in Node, but "is it playable" cannot —
// the whole match state machine lives inside requestAnimationFrame, which only
// runs in a real rendering browser. This harness is how we found that shots
// from the halfway line were going straight in, and that two thirds of a
// player's taps were bookkeeping rather than football.
//
//   node server.js &            # or PORT=3100 node server.js
//   PSF_URL=http://127.0.0.1:3100 node scripts/play-paper-soccer.mjs
//
// It plays red to the same standard the machine plays blue (via the ?psdebug=1
// hook), so a lopsided scoreline means the game is unfair, not that the
// harness is bad at it.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PSF_URL || 'http://127.0.0.1:3100';
const port = Number(process.env.CDP_PORT || 9444);
const W = Number(process.env.PSF_W || 900), H = Number(process.env.PSF_H || 700);
const profile = mkdtempSync(join(tmpdir(), 'psf-'));

const chrome = spawn(chromePath, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',
  `--window-size=${W+40},${H+60}`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' });
const delay = ms => new Promise(r => setTimeout(r, ms));
for (let i=0;i<80;i++){ try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await delay(250); }

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl+'/?psdebug=1')}`, {method:'PUT'}).then(r=>r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ socket.onopen=res; socket.onerror=rej; });
let callId=0; const pending=new Map(); const errors=[];
socket.onmessage = e => { const m=JSON.parse(e.data);
  if (m.id && pending.has(m.id)){ const {resolve,reject}=pending.get(m.id); pending.delete(m.id);
    m.error?reject(new Error(m.error.message)):resolve(m.result); }
  if (m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
};
const send=(method,params={})=>{ const id=++callId; socket.send(JSON.stringify({id,method,params}));
  return new Promise((resolve,reject)=>{ const t=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timeout'))},15000);
    pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}}); }); };
const ev = async expr => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value; };
const shot = async path => { const r = await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  writeFileSync(path, Buffer.from(r.data,'base64')); };

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
await delay(1500);

// Enter the match
await ev(`(()=>{const h=document.querySelector('#ngs-hud');
  [...h.querySelectorAll('button')].find(b=>b.textContent.includes("TODAY'S CARTRIDGE")).click();})()`);
await delay(900);
await ev(`(()=>{const m=document.querySelector('#game-modal-container');
  [...m.querySelectorAll('button')].find(b=>b.textContent.trim()==='PLAY')?.click();})()`);
await delay(800);
await ev(`(()=>{const m=document.querySelector('#game-modal-container');
  [...m.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('KICK OFF'))?.click();})()`);
await delay(900);
await ev(`document.querySelector('#game-modal-container .ngs-ready-gate')?.click()`);
await delay(700);

// Real input helpers, in canvas CSS pixels
await ev(`window.__io=(()=>{const cv=document.querySelector('#game-modal-container canvas');
  const R=()=>cv.getBoundingClientRect();
  const fire=(t,x,y,id)=>{const r=R();cv.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,bubbles:true,pointerId:id,isPrimary:true,button:0,buttons:t==='pointerup'?0:1}));};
  return {
    hold:async(x,y,ms)=>{const id=Math.floor(Math.random()*1e4);fire('pointerdown',x,y,id);fire('pointermove',x,y,id);
      await new Promise(r=>setTimeout(r,ms));fire('pointerup',x,y,id);},
    drag:async(x1,y1,x2,y2)=>{const id=Math.floor(Math.random()*1e4);fire('pointerdown',x1,y1,id);
      await new Promise(r=>setTimeout(r,40));fire('pointermove',x2,y2,id);await new Promise(r=>setTimeout(r,40));fire('pointerup',x2,y2,id);}
  };})()`);

const st = () => ev(`window.__psf ? window.__psf() : null`);
const toScreen = (m,p) => ({ x: m.left + p.x*m.scale, y: m.top + p.y*m.scale });

let s = await st();
if (!s) { console.log('NO DEBUG HOOK — is ?psdebug=1 live?'); process.exit(1); }

const log=[]; let kicks=0, runs=0, humanActs=0, waits=0;
const t0=Date.now();
for (let step=0; step<260 && !s.winner; step++) {
  s = await st();
  if (!s) break;
  if (s.winner) break;
  if (s.flying || s.cpuBusy || s.celebration) { waits++; await delay(90); continue; }

  if (s.phase==='kick' && s.possession==='red') {
    // Play red the way the machine plays blue: aim where a good player aims,
    // and hold exactly long enough to strike with that weight.
    const f=(await ev(`window.__psfHint()`)).flick;
    const aimAt={ x:s.ball.x+Math.cos(f.angle)*40, y:s.ball.y+Math.sin(f.angle)*40 };
    const p=toScreen(s.map,aimAt);
    const holdMs=Math.max(30, Math.round(f.power/1.12*1050));
    await ev(`window.__io.hold(${p.x.toFixed(1)},${p.y.toFixed(1)},${holdMs})`);
    kicks++; humanActs++; log.push(`${step} RED flick p${f.power.toFixed(2)}`);
    await delay(750);
  } else if (s.mover==='red') {
    const r=(await ev(`window.__psfHint()`)).run;
    const man=r && s.red.find(m=>m.id===r.playerId);
    const still = !r || !man || Math.hypot(man.x-r.dest.x, man.y-r.dest.y) < 0.8;
    if (still) { await ev(`document.querySelector('#game-modal-container .ps-skip-red')?.click()`); }
    else {
      // One tap on the destination — the same gesture a player now uses.
      const to=toScreen(s.map,r.dest);
      await ev(`window.__io.hold(${to.x.toFixed(1)},${to.y.toFixed(1)},20)`);
    }
    humanActs++; runs++; log.push(`${step} RED run`);
    await delay(220);
  } else { waits++; await delay(90); }
}
s = await st();
await shot('/tmp/psf-play.png');
console.log(JSON.stringify({ winner:s?.winner||null, score:s?.score, phase:s?.phase,
  humanActs, kicks, runs, waitPolls:waits, seconds:Math.round((Date.now()-t0)/1000), errors:errors.slice(0,5) }, null, 2));
console.log(log.slice(-12).join(' | '));
chrome.kill();
process.exit(0);
