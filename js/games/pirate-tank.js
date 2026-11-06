/**
 * Dr Non — Non-Gaming System · Pirate in a Tank
 *
 * A barrel you can turn, with holes drilled in it, and a knife that only
 * fits one of them.
 *
 * WHAT IT TRAINS: mental rotation, and reading depth off a perspective.
 *
 * The barrel is drawn as a real cylinder. Each hole is bored through the wall
 * pointing outward, so the mouth you see depends on where that hole is
 * pointing relative to your eye:
 *
 *   straight at you   -> a full circle
 *   off to the side   -> a foreshortened ellipse
 *   edge on           -> a slit
 *   around the far side -> nothing at all
 *
 * The knife goes into the hole that faces you, so the hole you want is the
 * one sitting square-on in the middle of the barrel's face — a circle.
 *
 * On top of that, the knife is long and only ONE hole is bored deep enough
 * for it. Depth shows as a BLACK mouth with a ring of bore wall inside it:
 * you are looking down a deep bore, and it is looking into a shallow dimple.
 * Both holes are the same colour on the rim, so the only way to tell them
 * apart is to look down them — and then to remember which one it was while
 * the barrel turns under you.
 *
 * The barrel is hollow and the pirate is inside. When the knife goes home,
 * the pirate comes up.
 *
 * Every rule below is an exported pure function so it can be tested without a
 * browser. The renderer is a thin shell over them.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

export const HOLE_COUNT = 6;
/** Holes are bored to one of these depths. The knife needs DEEP. */
export const DEPTHS = { shallow: 1, deep: 2 };
export const KNIFE_DEPTH = DEPTHS.deep;
/** How close a hole's heading must be to the knife's to count as "at the blade". */
export const KNIFE_TOLERANCE = 14;

/**
 * Where a hole's axis points, relative to the eye.
 *
 * 0 means the hole points straight at you — a full circle, square in the
 * middle of the barrel's face, which is where the knife goes. 90 means it
 * points to the side and you see it edge on as a slit. Past 90 it is around
 * the far side of the barrel and cannot be seen at all.
 *
 * A hole's own angle is measured in the barrel's frame; `rotation` is how far
 * the barrel has been turned. The 90-degree offset puts angle 0 on the hole
 * that faces the viewer, so `hole.angle + rotation` of 90 is the knife's
 * target — the same number the renderer draws with.
 */
export function holeFacing(hole, rotation = 0) {
  return (((hole.angle + rotation - 90) % 360) + 360) % 360;
}

/**
 * Signed difference between two headings, in degrees, within (-180, 180].
 * Positive means `a` has swung past `b`.
 *
 * Both headings are normalised into [0, 360) first. Doing it that way keeps
 * the subtraction away from -360, which is what makes a plain modulo hand
 * back -0 — a value that is 0 by every ordinary comparison and yet is not
 * the same thing as 0 to Object.is, which is a trap for whoever calls this
 * next.
 */
export function angleDelta(a, b) {
  const norm = x => (((x % 360) + 360) % 360);
  let d = norm(a) - norm(b);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * A hole's mouth as the eye sees it.
 *
 * `facing` is the angle between the hole's axis and the eye, in degrees,
 * as returned by holeFacing(). 0 is square on (a circle), 90 is edge on (a
 * slit), past 90 is around the far side and cannot be seen.
 */
export function holeProjection(facing, radius = 9) {
  const a = ((facing % 360) + 360) % 360;
  const signed = a > 180 ? a - 360 : a;
  const visible = Math.abs(signed) <= 90;
  const foreshorten = Math.abs(Math.cos(signed * Math.PI / 180));
  return { visible, foreshorten, width: Math.max(1, radius * foreshorten), height: radius * 2 };
}

/**
 * Build a barrel. Holes sit at different angles around it and at different
 * heights, and exactly one is deep enough for the knife.
 */
export function createBarrel({ holeCount = HOLE_COUNT, random = Math.random } = {}) {
  if (!Number.isInteger(holeCount) || holeCount < 3) throw new RangeError('a barrel needs at least 3 holes');
  const angles = [];
  for (let i = 0; i < holeCount; i++) angles.push(Math.round((360 / holeCount) * i + random() * 18));
  const targetIndex = Math.floor(random() * holeCount);
  const holes = angles.map((angle, i) => ({
    angle,
    height: 0.25 + (i / holeCount) * 0.55,          // 0 = low on the barrel, 1 = high
    depth: i === targetIndex ? DEPTHS.deep : DEPTHS.shallow,
  }));
  let rotation = 0;
  let inserted = false;
  return {
    holes,
    targetIndex,
    get rotation() { return rotation; },
    get inserted() { return inserted; },
    /** The hole currently facing the knife, if any. */
    holeAtKnife(knifeFacing = 0, tolerance = KNIFE_TOLERANCE) {
      let best = null, bestDelta = Infinity;
      for (const hole of this.holes) {
        const delta = Math.abs(angleDelta(holeFacing(hole, this.rotation), knifeFacing));
        if (delta <= tolerance && delta < bestDelta) {
          bestDelta = delta;
          best = hole;
        }
      }
      return best;
    },
    /** Turn the barrel. Positive turns it one way, negative the other. */
    turn(degrees) { rotation = ((rotation + degrees) % 360 + 360) % 360; return rotation; },
    /**
     * Push the knife in. It only goes home if a hole faces the knife AND that
     * hole is bored deep enough.
     */
    insert(knifeFacing = 0) {
      const hole = this.holeAtKnife(knifeFacing);
      if (!hole) return { ok: false, reason: 'no-hole', hole: null };
      if (hole.depth < KNIFE_DEPTH) return { ok: false, reason: 'too-shallow', hole };
      inserted = true;
      return { ok: true, reason: 'home', hole };
    }
  };
}

/** How close is the barrel to the answer, 0 (nowhere) to 1 (home)? */
export function closeness(barrel, knifeFacing = 0) {
  const hole = barrel.holeAtKnife(knifeFacing);
  if (!hole) return 0;
  if (hole.depth >= KNIFE_DEPTH) return 1;
  return 0.5;
}

export function renderPirateTank(container, onClose) {
  let barrel = createBarrel();
  let state = 'aim';        // aim -> done
  let message = '';
  let messageTone = 'text-zinc-300';
  const canvas = document.createElement('canvas');

  function draw() {
    const w = 320, h = 230;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = '100%'; canvas.style.maxWidth = `${w}px`;
    canvas.style.height = 'auto';
    canvas.className = 'w-full touch-none select-none mx-auto block';
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const cx = w / 2;
    const rx = 104;            // half the barrel's width
    const rimRy = 20;          // the rim ellipse — we look slightly down on it
    const topY = 44;           // the top rim's centre line
    const bottomY = 186;       // the bottom rim's centre line

    // ── The barrel: a vertical tube, seen a little from above ──────────────
    // Body wall, flat fills only — no gradient.
    g.fillStyle = '#1f2937';
    g.strokeStyle = '#334155';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(cx - rx, topY, rx * 2, bottomY - topY);
    g.fill(); g.stroke();

    // The opening at the top: a darker ellipse, so the thing reads as a tube
    // with a mouth rather than a flat panel.
    g.fillStyle = '#0d1420';
    g.beginPath();
    g.ellipse(cx, topY, rx, rimRy, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();

    // The bottom rim: only the front arc is visible on a standing barrel.
    g.strokeStyle = '#334155';
    g.beginPath();
    g.ellipse(cx, bottomY, rx, rimRy, 0, 0, Math.PI);
    g.stroke();

    // Two hoops, the way a barrel is banded.
    g.strokeStyle = '#475569';
    g.lineWidth = 2;
    for (const bandY of [topY + 34, bottomY - 34]) {
      g.beginPath();
      g.ellipse(cx, bandY, rx, rimRy, 0, 0.12 * Math.PI, 0.88 * Math.PI);
      g.stroke();
    }

    // ── Holes, bored through the wall ─────────────────────────────────────
    const HOLE_R = 11;
    // Where a hole sits on the barrel's height. The drawing and the knife
    // both use this, so the blade can never point at a hole that is not
    // where the barrel drew it.
    const holeY = hole => topY + 26 + hole.height * (bottomY - topY - 52);
    const drawn = barrel.holes.map((hole, index) => {
      const facing = holeFacing(hole, barrel.rotation);
      const proj = holeProjection(facing, HOLE_R);
      // A hole on the far side of the barrel hides the ones in front of it.
      const depthOrder = Math.cos(facing * Math.PI / 180);
      const p = { ...hole, index, proj, depthOrder };
      p.y = holeY(hole);
      // Keep the mouth inside the silhouette: a slit at the edge would poke out.
      p.x = cx + Math.sin(facing * Math.PI / 180) * (rx - HOLE_R);
      return p;
    }).sort((a, b) => a.depthOrder - b.depthOrder);

    for (const hole of drawn) {
      if (!hole.proj.visible) continue;
      const wpx = hole.proj.width;
      const deep = hole.depth >= KNIFE_DEPTH;
      // Depth is the only cue: a deep bore is a black mouth, a shallow one a
      // dim grey one. The rim is the same colour for both, so the player has
      // to look down the hole rather than read a badge.
      g.fillStyle = deep ? '#05080d' : '#3d4a5c';
      g.strokeStyle = '#7b8a9c';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(hole.x, hole.y, wpx, hole.proj.height / 2, 0, 0, Math.PI * 2);
      g.fill(); g.stroke();
      if (deep && wpx > 6) {
        // You are looking down the bore: a ring of bore wall inside the black.
        g.strokeStyle = '#3d4a5c';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(hole.x, hole.y, wpx * 0.42, hole.proj.height / 3, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }

    // ── The knife, aiming at whichever hole is square on to it ────────────
    // The knife follows the hole's HEIGHT as well as its angle. Holes sit at
    // different heights on the barrel, so a knife parked on a fixed line
    // would point at empty wood while the game said the bore was at the
    // blade. The knife is the player's cursor: it goes where the barrel says.
    const atKnife = barrel.holeAtKnife(0);
    // The drawn counterpart of the hole at the blade, so the tip meets the
    // mouth that is actually on screen.
    const target = atKnife ? drawn.find(p => p.index === barrel.holes.indexOf(atKnife)) : null;
    const knifeY = target ? target.y : topY + (bottomY - topY) * 0.52;
    const home = atKnife && atKnife.depth >= KNIFE_DEPTH;
    // The tip stops at the near edge of the mouth, and goes into it when the
    // bore is deep enough to take the knife.
    const tipX = target ? target.x + target.proj.width / 2 : cx + rx - 22;
    const bladeBack = w - 34;
    g.fillStyle = home ? '#f59e0b' : '#e6edf3';
    g.beginPath();
    g.moveTo(home ? target.x : tipX, knifeY);
    g.lineTo(bladeBack, knifeY - 4);
    g.lineTo(bladeBack, knifeY + 4);
    g.closePath();
    g.fill();
    // The grip: taller than the blade, in the dim neutral, so the two parts
    // read as two parts.
    g.fillStyle = '#7b8a9c';
    g.fillRect(bladeBack, knifeY - 9, 22, 18);
    g.fillStyle = '#0a0e14';
    g.fillRect(bladeBack + 6, knifeY - 9, 3, 18);

    // The pirate, waiting inside.
    if (state === 'done' && home) {
      g.fillStyle = '#f59e0b';
      g.fillRect(cx - 17, topY - 46, 34, 40);
      g.fillStyle = '#0a0e14';
      g.fillRect(cx - 10, topY - 36, 6, 6);
      g.fillRect(cx + 4, topY - 36, 6, 6);
      g.fillRect(cx - 7, topY - 24, 14, 4);
    }
  }

  function render() {
    container.innerHTML = `<div class="${FRAME}">
      <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl text-amber-400">◍</span>
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">PIRATE IN A TANK</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Mental rotation · depth in perspective</p>
          </div>
        </div>
        <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
      </div>

      <p class="text-amber-500/80 text-[10px] uppercase mb-3">
        One hole is bored deep enough for the knife. Find it, and turn it to the blade.
      </p>

      <div id="tank-stage" class="mb-3"></div>

      <div class="flex gap-3 mb-3">
        <button id="turn-left" class="flex-1 py-4 border border-zinc-600 text-zinc-200 font-black tracking-widest text-sm min-h-[44px]">◀ TURN</button>
        <button id="turn-right" class="flex-1 py-4 border border-zinc-600 text-zinc-200 font-black tracking-widest text-sm min-h-[44px]">TURN ▶</button>
      </div>
      <button id="insert-btn" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm min-h-[44px] mb-3">PUSH THE KNIFE IN</button>

      <p id="tank-feedback" class="text-xs min-h-[2.4em] ${messageTone}">${message || 'Drag the barrel to turn it. A hole square on is a circle; edge on it is a slit; and a deep bore is a black mouth.'}</p>
    </div>`;

    const stage = container.querySelector('#tank-stage');
    stage.appendChild(canvas);
    draw();

    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelector('#turn-left').onclick = () => { barrel.turn(-15); soundFx.playClick(); draw(); };
    container.querySelector('#turn-right').onclick = () => { barrel.turn(15); soundFx.playClick(); draw(); };
    container.querySelector('#insert-btn').onclick = () => {
      const result = barrel.insert(0);
      if (result.ok) {
        state = 'done';
        soundFx.playWin();
        message = 'The knife goes home, and the pirate comes up.';
        messageTone = 'text-amber-400';
        draw();
        showResult({
          container,
          title: 'PIRATE ABOARD',
          message: 'You found the deep bore and turned it to the blade. A hole square on is a circle, edge on it is a slit — and only the deep bore looks black, because you are looking down it.',
          score: 1,
          gameId: 'pirate-tank',
          tone: 'win',
          onRestart: () => renderPirateTank(container, onClose),
          onClose
        });
      } else if (result.reason === 'too-shallow') {
        soundFx.playHit();
        message = 'The blade stops short — that hole is bored shallow. Find the one that goes deeper.';
        messageTone = 'text-zinc-300';
        draw();
      } else {
        soundFx.playHit();
        message = 'No hole at the blade. Turn the barrel until a hole comes round.';
        messageTone = 'text-zinc-300';
        draw();
      }
    };

    // Drag to turn. Pointer events keep it working on touch and mouse alike.
    let dragging = false, lastX = 0;
    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      barrel.turn(dx * 0.9);
      draw();
    });
    canvas.addEventListener('pointerup', e => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ } });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
  }

  render();
}
