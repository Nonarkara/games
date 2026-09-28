/**
 * NGS Mind Gym · six cartridges filling the floor's real gaps.
 *
 * Two of these are standard clinical instruments the floor had no version of
 * at all — category fluency and symbol coding sit in nearly every cognitive
 * battery ever assembled, and neither was represented across 99 games. The
 * other four are classics whose absence was conspicuous: Reversi, Dots and
 * Boxes, Flood It, Peg Solitaire.
 *
 * Every rule lives in an exported pure function so it can be tested without a
 * browser. The renderers are thin shells over those functions — if a rule is
 * only expressible inside a click handler, it is not written down anywhere a
 * test can reach, and that is how a game quietly stops being the game.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult, attachReady } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

const head = (icon, title, sub) => `
  <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
    <div class="flex items-center gap-3">
      <span class="text-3xl text-amber-400">${icon}</span>
      <div>
        <h2 class="text-xl font-black text-amber-400 tracking-wider">${title}</h2>
        <p class="text-[10px] text-amber-500/80 uppercase">${sub}</p>
      </div>
    </div>
    ${closeButton()}
  </div>`;

function shuffled(values, rng = Math.random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* =========================================================================
 * 1. CATEGORY FLUENCY — the FAS/animal-naming task, scored honestly.
 *
 * The clinical version is scored by a human who knows whether "quoll" is an
 * animal. A browser does not, so this ships a curated list per category and
 * counts only what is on it. That is a real limit and the UI says so: the
 * score is "words the machine recognised", never "words that exist". Padding
 * with invented animals is the one way to make the number look good without
 * making the retrieval any better, so the number does not reward it.
 * ====================================================================== */
export const FLUENCY_SETS = [
  {
    name: 'ANIMALS',
    words: ['cat', 'dog', 'horse', 'cow', 'pig', 'sheep', 'goat', 'lion', 'tiger', 'leopard',
      'cheetah', 'bear', 'wolf', 'fox', 'deer', 'moose', 'elk', 'bison', 'buffalo', 'zebra',
      'giraffe', 'elephant', 'rhino', 'hippo', 'monkey', 'ape', 'gorilla', 'chimp', 'baboon',
      'lemur', 'sloth', 'anteater', 'armadillo', 'badger', 'otter', 'beaver', 'squirrel',
      'chipmunk', 'rabbit', 'hare', 'mouse', 'rat', 'hamster', 'gerbil', 'mole', 'hedgehog',
      'bat', 'whale', 'dolphin', 'porpoise', 'seal', 'walrus', 'shark', 'ray', 'eel', 'salmon',
      'trout', 'tuna', 'cod', 'carp', 'perch', 'pike', 'octopus', 'squid', 'crab', 'lobster',
      'shrimp', 'clam', 'oyster', 'snail', 'slug', 'worm', 'spider', 'scorpion', 'ant', 'bee',
      'wasp', 'beetle', 'moth', 'butterfly', 'dragonfly', 'cricket', 'grasshopper', 'locust',
      'mantis', 'termite', 'flea', 'tick', 'mosquito', 'fly', 'snake', 'cobra', 'python',
      'viper', 'lizard', 'gecko', 'iguana', 'chameleon', 'crocodile', 'alligator', 'turtle',
      'tortoise', 'frog', 'toad', 'newt', 'salamander', 'eagle', 'hawk', 'falcon', 'owl',
      'vulture', 'crow', 'raven', 'magpie', 'sparrow', 'finch', 'robin', 'swallow', 'swift',
      'pigeon', 'dove', 'parrot', 'macaw', 'cockatoo', 'budgie', 'peacock', 'pheasant',
      'quail', 'partridge', 'chicken', 'rooster', 'duck', 'goose', 'swan', 'heron', 'stork',
      'crane', 'flamingo', 'pelican', 'gull', 'penguin', 'ostrich', 'emu', 'kiwi', 'kangaroo',
      'koala', 'wombat', 'possum', 'platypus', 'camel', 'llama', 'alpaca', 'donkey', 'mule',
      'yak', 'antelope', 'gazelle', 'impala', 'wildebeest', 'warthog', 'boar', 'lynx', 'puma',
      'cougar', 'jaguar', 'panther', 'jackal', 'hyena', 'meerkat', 'mongoose', 'ferret',
      'weasel', 'stoat', 'mink', 'raccoon', 'skunk', 'porcupine', 'panda', 'gibbon', 'orangutan']
  },
  {
    name: 'FOODS',
    words: ['rice', 'bread', 'pasta', 'noodle', 'potato', 'yam', 'cassava', 'corn', 'wheat',
      'oat', 'barley', 'rye', 'quinoa', 'lentil', 'bean', 'pea', 'chickpea', 'soy', 'tofu',
      'egg', 'milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'cream', 'beef', 'pork', 'lamb',
      'mutton', 'chicken', 'duck', 'turkey', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp',
      'crab', 'squid', 'oyster', 'mussel', 'apple', 'pear', 'peach', 'plum', 'cherry', 'grape',
      'banana', 'mango', 'papaya', 'pineapple', 'melon', 'watermelon', 'orange', 'lemon',
      'lime', 'grapefruit', 'tangerine', 'durian', 'lychee', 'longan', 'rambutan', 'guava',
      'coconut', 'date', 'fig', 'apricot', 'strawberry', 'raspberry', 'blueberry', 'cranberry',
      'tomato', 'onion', 'garlic', 'ginger', 'carrot', 'cabbage', 'lettuce', 'spinach', 'kale',
      'broccoli', 'cauliflower', 'celery', 'cucumber', 'pumpkin', 'squash', 'aubergine',
      'eggplant', 'pepper', 'chilli', 'chili', 'mushroom', 'leek', 'radish', 'beetroot',
      'turnip', 'asparagus', 'artichoke', 'okra', 'salt', 'sugar', 'honey', 'vinegar', 'oil',
      'soup', 'stew', 'curry', 'salad', 'sandwich', 'burger', 'pizza', 'taco', 'sushi',
      'dumpling', 'pancake', 'waffle', 'cake', 'pie', 'tart', 'biscuit', 'cookie', 'chocolate',
      'candy', 'icecream', 'coffee', 'tea', 'juice', 'water', 'wine', 'beer', 'nut', 'almond',
      'walnut', 'cashew', 'peanut', 'pistachio', 'hazelnut', 'sesame', 'basil', 'mint',
      'coriander', 'parsley', 'thyme', 'oregano', 'rosemary', 'cinnamon', 'pepper', 'cumin']
  },
  {
    name: 'COUNTRIES',
    words: ['thailand', 'laos', 'cambodia', 'vietnam', 'myanmar', 'burma', 'malaysia',
      'singapore', 'indonesia', 'philippines', 'brunei', 'china', 'japan', 'korea', 'mongolia',
      'india', 'pakistan', 'bangladesh', 'nepal', 'bhutan', 'srilanka', 'maldives',
      'afghanistan', 'iran', 'iraq', 'syria', 'lebanon', 'jordan', 'israel', 'palestine',
      'turkey', 'saudiarabia', 'yemen', 'oman', 'qatar', 'bahrain', 'kuwait', 'egypt', 'libya',
      'tunisia', 'algeria', 'morocco', 'sudan', 'ethiopia', 'eritrea', 'somalia', 'kenya',
      'uganda', 'tanzania', 'rwanda', 'burundi', 'congo', 'angola', 'zambia', 'zimbabwe',
      'malawi', 'mozambique', 'botswana', 'namibia', 'southafrica', 'lesotho', 'ghana',
      'nigeria', 'niger', 'mali', 'senegal', 'gambia', 'guinea', 'liberia', 'sierraleone',
      'ivorycoast', 'togo', 'benin', 'cameroon', 'chad', 'gabon', 'russia', 'ukraine',
      'belarus', 'poland', 'germany', 'france', 'spain', 'portugal', 'italy', 'greece',
      'austria', 'switzerland', 'belgium', 'netherlands', 'denmark', 'norway', 'sweden',
      'finland', 'iceland', 'ireland', 'britain', 'england', 'scotland', 'wales', 'hungary',
      'romania', 'bulgaria', 'serbia', 'croatia', 'slovenia', 'slovakia', 'czechia', 'albania',
      'estonia', 'latvia', 'lithuania', 'georgia', 'armenia', 'azerbaijan', 'kazakhstan',
      'uzbekistan', 'turkmenistan', 'kyrgyzstan', 'tajikistan', 'canada', 'mexico', 'cuba',
      'jamaica', 'haiti', 'guatemala', 'belize', 'honduras', 'nicaragua', 'costarica',
      'panama', 'colombia', 'venezuela', 'guyana', 'suriname', 'ecuador', 'peru', 'bolivia',
      'brazil', 'paraguay', 'uruguay', 'argentina', 'chile', 'australia', 'newzealand',
      'fiji', 'samoa', 'tonga', 'vanuatu', 'papuanewguinea', 'solomonislands', 'usa', 'america']
  },
  {
    name: 'THINGS IN A KITCHEN',
    words: ['pot', 'pan', 'wok', 'kettle', 'knife', 'fork', 'spoon', 'chopstick', 'ladle',
      'spatula', 'whisk', 'peeler', 'grater', 'sieve', 'colander', 'board', 'plate', 'bowl',
      'cup', 'mug', 'glass', 'jug', 'bottle', 'tray', 'tin', 'lid', 'oven', 'stove', 'hob',
      'grill', 'toaster', 'microwave', 'fridge', 'freezer', 'blender', 'mixer', 'processor',
      'sink', 'tap', 'drain', 'sponge', 'cloth', 'towel', 'apron', 'glove', 'timer', 'scale',
      'thermometer', 'opener', 'corkscrew', 'strainer', 'mortar', 'pestle', 'rollingpin',
      'cupboard', 'drawer', 'shelf', 'counter', 'table', 'chair', 'stool', 'bin', 'jar',
      'container', 'foil', 'clingfilm', 'paper', 'match', 'lighter', 'salt', 'pepper', 'oil',
      'flour', 'sugar', 'rice', 'kitchenroll', 'dishwasher', 'extractor', 'rack', 'hook',
      'magnet', 'clock', 'radio', 'steamer', 'ricecooker', 'skillet', 'saucepan', 'casserole']
  }
];

/** Loose match: case, spaces, hyphens and plural 's' all collapse. */
export function normalizeWord(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Judge one answer. 'short' under three letters, 'dup' already given,
 * 'unknown' not on this category's list, 'ok' counts.
 */
export function checkFluency(set, raw, used = new Set()) {
  const word = normalizeWord(raw);
  if (word.length < 3) return { verdict: 'short', word };
  const singular = word.endsWith('s') ? word.slice(0, -1) : word;
  const known = set.words.some(w => {
    const n = normalizeWord(w);
    return n === word || n === singular;
  });
  if (!known) return { verdict: 'unknown', word };
  const key = set.words.find(w => {
    const n = normalizeWord(w);
    return n === word || n === singular;
  });
  if (used.has(key)) return { verdict: 'dup', word, key };
  return { verdict: 'ok', word, key };
}

export function renderVerbalFluency(container, onClose) {
  start();
  function start() {
    const SECONDS = 60;
    const set = FLUENCY_SETS[Math.floor(Math.random() * FLUENCY_SETS.length)];
    const used = new Set();
    let left = SECONDS, timer = null, said = [];

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🗣', 'CATEGORY FLUENCY', 'Neuropsych staple · retrieval under a clock')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Name as many as you can in ${SECONDS} seconds. Type one, press ENTER, keep going.
          Only words on this cartridge's list count — a real clinic has a human to judge
          the rest, and this does not pretend to.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>COUNT <span id="vf-count" class="text-amber-400 text-base">0</span></div>
          <div>TIME <span id="vf-time" class="text-white text-base">${SECONDS}</span>s</div>
        </div>
        <p class="text-center text-[10px] text-amber-500/80 uppercase mb-1">NAME AS MANY AS YOU CAN</p>
        <h3 id="vf-cat" class="text-center text-2xl font-black text-amber-400 tracking-wider mb-3">${set.name}</h3>
        <input id="vf-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
          class="w-full bg-zinc-950 border border-amber-500/40 p-3 text-center text-lg text-white"
          placeholder="type a word, press ENTER" />
        <p id="vf-msg" class="text-center text-[11px] mt-2 h-4 text-amber-500/80"></p>
        <div id="vf-list" class="mt-3 text-[11px] leading-relaxed text-white/80 min-h-[3rem]"></div>
      </div>`;

    const input = container.querySelector('#vf-in');
    const countEl = container.querySelector('#vf-count');
    const timeEl = container.querySelector('#vf-time');
    const msgEl = container.querySelector('#vf-msg');
    const listEl = container.querySelector('#vf-list');

    const submit = () => {
      const raw = input.value;
      if (!raw.trim()) return;
      input.value = '';
      const { verdict, key } = checkFluency(set, raw, used);
      if (verdict === 'ok') {
        used.add(key);
        said.push(key);
        countEl.innerText = used.size;
        listEl.innerText = said.join(' · ');
        msgEl.innerText = '';
        msgEl.className = 'text-center text-[11px] mt-2 h-4 text-amber-400';
        soundFx.playCoin?.();
      } else {
        msgEl.innerText = verdict === 'dup' ? 'already said that one'
          : verdict === 'short' ? 'too short'
          : 'not on this list';
        msgEl.className = 'text-center text-[11px] mt-2 h-4 text-white/50';
        soundFx.playHit?.();
      }
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    function end() {
      clearInterval(timer);
      showResult({
        container,
        title: used.size >= 18 ? 'STRONG RETRIEVAL' : 'ROUND COMPLETE',
        message: `${used.size} recognised in ${SECONDS}s. ${said.slice(0, 12).join(', ')}${said.length > 12 ? '…' : ''}`,
        score: used.size,
        gameId: 'verbal-fluency',
        tone: used.size >= 18 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelector('#close-game-btn').onclick = () => { clearInterval(timer); onClose(); };

    attachReady(container.firstElementChild, () => {
      input.focus();
      timer = setInterval(() => {
        left -= 1;
        timeEl.innerText = left;
        if (left <= 0) end();
      }, 1000);
    });
  }
}

/* =========================================================================
 * 2. SYMBOL CODING — the digit-symbol substitution test.
 *
 * A key pairs nine shapes with nine digits and stays on screen the whole
 * time. There is nothing to remember and nothing to work out: the only thing
 * being measured is how fast you can look something up and act on it. That is
 * why it appears in nearly every battery ever built, and why it was the most
 * conspicuous thing missing from a floor with 39 trainers on it.
 * ====================================================================== */
export const CODE_SHAPES = ['▲', '●', '■', '◆', '★', '✚', '▼', '◐', '⬟'];

/** A fresh shape→digit key. Shuffled, so the mapping is never memorised. */
export function makeSymbolKey(rng = Math.random) {
  const order = shuffled(CODE_SHAPES, rng);
  const key = new Map();
  order.forEach((shape, i) => key.set(shape, i + 1));
  return key;
}

export function digitFor(key, shape) {
  return key.get(shape) ?? null;
}

export function renderSymbolCoding(container, onClose) {
  start();
  function start() {
    const SECONDS = 90;
    const key = makeSymbolKey();
    const pairs = [...key.entries()];
    let left = SECONDS, timer = null, correct = 0, wrong = 0;
    let current = CODE_SHAPES[Math.floor(Math.random() * CODE_SHAPES.length)];

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🔢', 'SYMBOL CODING', 'Processing speed · the key never leaves the screen')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Read the key, type the digit for the shape shown. Nothing to memorise —
          this only measures how fast you can look it up and move.
        </div>
        <div class="grid grid-cols-9 gap-1 mb-3 border border-amber-500/40 p-2 bg-zinc-950">
          ${pairs.map(([s, d]) => `
            <div class="text-center">
              <div class="text-lg text-amber-400 leading-none">${s}</div>
              <div class="text-[11px] text-white font-bold">${d}</div>
            </div>`).join('')}
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>CORRECT <span id="sc-ok" class="text-amber-400 text-base">0</span></div>
          <div>MISSED <span id="sc-no" class="text-white text-base">0</span></div>
          <div>TIME <span id="sc-time" class="text-white text-base">${SECONDS}</span>s</div>
        </div>
        <div id="sc-shape" class="text-center text-7xl text-amber-400 my-4 leading-none">${current}</div>
        <div class="grid grid-cols-9 gap-1">
          ${[1,2,3,4,5,6,7,8,9].map(d => `<button class="sc-key axiom-dpad-btn py-3" data-d="${d}">${d}</button>`).join('')}
        </div>
        <p class="text-center text-[10px] text-amber-500/80 uppercase mt-3">Tap a number or use the keyboard</p>
      </div>`;

    const shapeEl = container.querySelector('#sc-shape');
    const okEl = container.querySelector('#sc-ok');
    const noEl = container.querySelector('#sc-no');
    const timeEl = container.querySelector('#sc-time');

    const next = () => {
      let pick;
      do { pick = CODE_SHAPES[Math.floor(Math.random() * CODE_SHAPES.length)]; }
      while (pick === current && CODE_SHAPES.length > 1);
      current = pick;
      shapeEl.innerText = current;
    };

    const answer = d => {
      if (left <= 0) return;
      if (digitFor(key, current) === d) { correct++; okEl.innerText = correct; soundFx.playCoin?.(); }
      else { wrong++; noEl.innerText = wrong; soundFx.playHit?.(); }
      next();
    };

    container.querySelectorAll('.sc-key').forEach(b => {
      b.onclick = () => answer(Number(b.dataset.d));
    });
    const kb = new ScopedKeyboard();
    kb.on(Object.fromEntries([1,2,3,4,5,6,7,8,9].map(d => [String(d), () => answer(d)])));

    function end() {
      clearInterval(timer);
      kb.destroy();
      showResult({
        container,
        title: correct >= 55 ? 'FAST LOOKUP' : 'ROUND COMPLETE',
        message: `${correct} correct, ${wrong} missed in ${SECONDS}s. Speed here is lookup speed — it is the one score that moves with sleep and caffeine more than with practice.`,
        score: correct,
        gameId: 'digit-symbol',
        tone: correct >= 55 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelector('#close-game-btn').onclick = () => { clearInterval(timer); kb.destroy(); onClose(); };

    attachReady(container.firstElementChild, () => {
      timer = setInterval(() => {
        left -= 1;
        timeEl.innerText = left;
        if (left <= 0) end();
      }, 1000);
    });
  }
}

/* =========================================================================
 * 3. REVERSI — Othello. Every move flips, so the board can invert under you.
 * ====================================================================== */
const DIRS = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

export function newReversiBoard() {
  const b = new Array(64).fill(0);
  b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2;   // white/black opening square
  return b;
}

/** Discs this move would flip, or [] when the move is illegal. */
export function reversiFlips(board, index, player) {
  if (board[index] !== 0) return [];
  const x = index % 8, y = Math.floor(index / 8);
  const foe = player === 1 ? 2 : 1;
  const out = [];
  for (const [dx, dy] of DIRS) {
    const run = [];
    let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8) {
      const at = board[cy * 8 + cx];
      if (at === foe) { run.push(cy * 8 + cx); cx += dx; cy += dy; continue; }
      if (at === player && run.length) out.push(...run);
      break;
    }
  }
  return out;
}

export function reversiLegalMoves(board, player) {
  const moves = [];
  for (let i = 0; i < 64; i++) if (reversiFlips(board, i, player).length) moves.push(i);
  return moves;
}

export function applyReversi(board, index, player) {
  const flips = reversiFlips(board, index, player);
  if (!flips.length) return null;
  const next = [...board];
  next[index] = player;
  flips.forEach(i => { next[i] = player; });
  return next;
}

export function reversiCount(board) {
  return board.reduce((acc, v) => {
    if (v === 1) acc.black++; else if (v === 2) acc.white++;
    return acc;
  }, { black: 0, white: 0 });
}

// Corners are permanent, the squares beside them hand corners over. This is
// the whole of Reversi strategy that fits in a table.
const REVERSI_WEIGHT = [
  120, -20, 20,  5,  5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
   20,  -5, 15,  3,  3, 15,  -5,  20,
    5,  -5,  3,  3,  3,  3,  -5,   5,
    5,  -5,  3,  3,  3,  3,  -5,   5,
   20,  -5, 15,  3,  3, 15,  -5,  20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20,  5,  5, 20, -20, 120
];

/** Positional pick. Greedy disc-count play loses Reversi, so it weighs squares. */
export function pickReversiMove(board, player) {
  const moves = reversiLegalMoves(board, player);
  if (!moves.length) return null;
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const after = applyReversi(board, m, player);
    let score = REVERSI_WEIGHT[m];
    // Deny the reply its corners.
    const foe = player === 1 ? 2 : 1;
    const replies = reversiLegalMoves(after, foe);
    score -= replies.filter(r => REVERSI_WEIGHT[r] >= 120).length * 90;
    score -= replies.length * 1.5;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

export function renderReversi(container, onClose) {
  start();
  function start() {
    let board = newReversiBoard();
    const YOU = 1, CPU = 2;
    let turn = YOU, busy = false, passes = 0;

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('⚫', 'REVERSI', 'Othello 1883 · corners are forever')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Trap a line of the machine's discs between two of yours and the whole line turns.
          Most discs at the end wins. Take corners — nothing can ever flip them back.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>YOU <span id="rv-you" class="text-amber-400 text-base">2</span></div>
          <div id="rv-turn" class="text-white">YOUR MOVE</div>
          <div>CPU <span id="rv-cpu" class="text-white text-base">2</span></div>
        </div>
        <div id="rv-grid" class="grid grid-cols-8 gap-[2px] bg-amber-500/30 p-[2px] max-w-[360px] mx-auto"></div>
        <p class="text-center text-[10px] text-amber-500/80 uppercase mt-3">Dotted square = a legal move</p>
      </div>`;

    const gridEl = container.querySelector('#rv-grid');
    const youEl = container.querySelector('#rv-you');
    const cpuEl = container.querySelector('#rv-cpu');
    const turnEl = container.querySelector('#rv-turn');

    function draw() {
      const legal = new Set(turn === YOU && !busy ? reversiLegalMoves(board, YOU) : []);
      gridEl.innerHTML = board.map((v, i) => {
        const disc = v === YOU ? '<span class="block w-full h-full" style="background:#f59e0b;border-radius:50%"></span>'
          : v === CPU ? '<span class="block w-full h-full" style="background:#e6edf3;border-radius:50%"></span>'
          : legal.has(i) ? '<span class="block w-2 h-2 m-auto" style="background:#f59e0b;border-radius:50%;opacity:.45"></span>'
          : '';
        return `<button class="rv-cell aspect-square bg-zinc-950 flex items-center justify-center p-[3px]"
          data-i="${i}" ${legal.has(i) ? '' : 'disabled'} aria-label="square ${i + 1}">${disc}</button>`;
      }).join('');
      gridEl.querySelectorAll('.rv-cell').forEach(c => {
        c.onclick = () => play(Number(c.dataset.i));
      });
      const { black, white } = reversiCount(board);
      youEl.innerText = black;
      cpuEl.innerText = white;
    }

    function finish() {
      const { black, white } = reversiCount(board);
      const won = black > white;
      showResult({
        container,
        title: won ? 'BOARD IS YOURS' : black === white ? 'DEAD EVEN' : 'MACHINE TOOK IT',
        message: `${black}–${white}. Reversi punishes grabbing discs early: the pieces you own in the middle are the ones your opponent flips last.`,
        score: black,
        gameId: 'reversi',
        tone: won ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    function advance() {
      const mine = reversiLegalMoves(board, turn);
      if (mine.length) { passes = 0; return; }
      passes += 1;
      turn = turn === YOU ? CPU : YOU;
      if (passes >= 2) finish();
    }

    function play(i) {
      if (busy || turn !== YOU) return;
      const next = applyReversi(board, i, YOU);
      if (!next) return;
      board = next;
      soundFx.playClick?.();
      turn = CPU;
      draw();
      advance();
      if (passes >= 2) return;
      if (turn !== CPU) { turnEl.innerText = 'YOUR MOVE'; draw(); return; }
      busy = true;
      turnEl.innerText = 'MACHINE THINKING';
      setTimeout(() => {
        const m = pickReversiMove(board, CPU);
        if (m != null) { board = applyReversi(board, m, CPU); soundFx.playHit?.(); }
        turn = YOU;
        busy = false;
        advance();
        turnEl.innerText = 'YOUR MOVE';
        draw();
        if (passes >= 2) finish();
      }, 420);
    }

    container.querySelector('#close-game-btn').onclick = onClose;
    draw();
  }
}

/* =========================================================================
 * 4. DOTS AND BOXES — the parity game that looks like a doodle.
 *
 * Anyone can play it in a minute. Almost nobody plays it well, because the
 * winning idea is counter-intuitive: late on you WANT to hand over a short
 * chain to be given a long one. That is the whole cartridge.
 * ====================================================================== */
export const DB_SIZE = 4;   // 4x4 boxes, 5x5 dots

/** Stable edge key. 'h' runs along a row, 'v' down a column. */
export function dbEdge(kind, row, col) { return `${kind}${row},${col}`; }

export function dbBoxEdges(row, col) {
  return [dbEdge('h', row, col), dbEdge('h', row + 1, col), dbEdge('v', row, col), dbEdge('v', row, col + 1)];
}

export function dbAllEdges(size = DB_SIZE) {
  const out = [];
  for (let r = 0; r <= size; r++) for (let c = 0; c < size; c++) out.push(dbEdge('h', r, c));
  for (let r = 0; r < size; r++) for (let c = 0; c <= size; c++) out.push(dbEdge('v', r, c));
  return out;
}

/** How many of a box's four sides are already drawn. */
export function dbBoxSides(drawn, row, col) {
  return dbBoxEdges(row, col).filter(e => drawn.has(e)).length;
}

/**
 * Draw one edge. Returns the boxes it completed — an empty list means the
 * turn passes, which is the only rule that matters in the endgame.
 */
export function applyDbEdge(drawn, edge, size = DB_SIZE) {
  if (drawn.has(edge)) return null;
  const next = new Set(drawn);
  next.add(edge);
  const completed = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (dbBoxEdges(r, c).includes(edge) && dbBoxSides(next, r, c) === 4) completed.push([r, c]);
  }
  return { drawn: next, completed };
}

/**
 * Take anything free; otherwise give away the least. The rng is a parameter so
 * the choice can be pinned in a test — a CPU whose move depends on
 * Math.random can only be tested flakily, and a flaky test is worse than none.
 */
export function pickDbEdge(drawn, size = DB_SIZE, rng = Math.random) {
  const open = dbAllEdges(size).filter(e => !drawn.has(e));
  if (!open.length) return null;
  const free = open.find(e => applyDbEdge(drawn, e, size).completed.length);
  if (free) return free;
  const safe = open.filter(e => {
    const after = applyDbEdge(drawn, e, size).drawn;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (dbBoxSides(after, r, c) === 3) return false;
    }
    return true;
  });
  const pool = safe.length ? safe : open;
  return pool[Math.floor(rng() * pool.length)];
}

export function renderDotsBoxes(container, onClose) {
  start();
  function start() {
    const size = DB_SIZE;
    let drawn = new Set();
    const owner = new Map();
    let mine = 0, theirs = 0, turn = 'you', busy = false;

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('⬚', 'DOTS AND BOXES', 'Close the fourth side, keep the turn')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Draw one line per turn. Close a box and it is yours — and you go again.
          Late on, the trick is to hand over a small chain so you are given a big one.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>YOU <span id="db-you" class="text-amber-400 text-base">0</span></div>
          <div id="db-turn" class="text-white">YOUR LINE</div>
          <div>CPU <span id="db-cpu" class="text-white text-base">0</span></div>
        </div>
        <div id="db-board" class="mx-auto" style="position:relative;width:296px;height:296px"></div>
      </div>`;

    const boardEl = container.querySelector('#db-board');
    const youEl = container.querySelector('#db-you');
    const cpuEl = container.querySelector('#db-cpu');
    const turnEl = container.querySelector('#db-turn');
    const STEP = 68, PAD = 14;

    function draw() {
      const bits = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        const who = owner.get(`${r},${c}`);
        if (!who) continue;
        bits.push(`<div style="position:absolute;left:${PAD + c * STEP}px;top:${PAD + r * STEP}px;
          width:${STEP}px;height:${STEP}px;background:${who === 'you' ? 'rgba(245,158,11,.22)' : 'rgba(230,237,243,.12)'};
          display:flex;align-items:center;justify-content:center;font-size:10px;
          color:${who === 'you' ? '#f59e0b' : '#e6edf3'}">${who === 'you' ? 'YOU' : 'CPU'}</div>`);
      }
      for (let r = 0; r <= size; r++) for (let c = 0; c < size; c++) {
        const e = dbEdge('h', r, c), on = drawn.has(e);
        bits.push(`<button class="db-e" data-e="${e}" aria-label="line" ${on ? 'disabled' : ''}
          style="position:absolute;left:${PAD + c * STEP}px;top:${PAD + r * STEP - 7}px;width:${STEP}px;height:14px;
          background:${on ? '#f59e0b' : 'transparent'};border:0;padding:0;cursor:${on ? 'default' : 'pointer'}">
          ${on ? '' : '<span style="display:block;margin:6px 8px;height:2px;background:rgba(245,158,11,.18)"></span>'}</button>`);
      }
      for (let r = 0; r < size; r++) for (let c = 0; c <= size; c++) {
        const e = dbEdge('v', r, c), on = drawn.has(e);
        bits.push(`<button class="db-e" data-e="${e}" aria-label="line" ${on ? 'disabled' : ''}
          style="position:absolute;left:${PAD + c * STEP - 7}px;top:${PAD + r * STEP}px;width:14px;height:${STEP}px;
          background:${on ? '#f59e0b' : 'transparent'};border:0;padding:0;cursor:${on ? 'default' : 'pointer'}">
          ${on ? '' : '<span style="display:block;margin:8px 6px;width:2px;height:' + (STEP - 16) + 'px;background:rgba(245,158,11,.18)"></span>'}</button>`);
      }
      for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) {
        bits.push(`<span style="position:absolute;left:${PAD + c * STEP - 3}px;top:${PAD + r * STEP - 3}px;
          width:6px;height:6px;background:#e6edf3;border-radius:50%"></span>`);
      }
      boardEl.innerHTML = bits.join('');
      boardEl.querySelectorAll('.db-e').forEach(b => {
        b.onclick = () => move(b.dataset.e);
      });
      youEl.innerText = mine;
      cpuEl.innerText = theirs;
    }

    function done() { return dbAllEdges(size).every(e => drawn.has(e)); }

    function finish() {
      showResult({
        container,
        title: mine > theirs ? 'BOXES ARE YOURS' : mine === theirs ? 'DEAD EVEN' : 'MACHINE TOOK IT',
        message: `${mine}–${theirs}. The counter-intuitive bit: giving away a two-box chain to be handed a six-box one is the winning move, and it never feels like one.`,
        score: mine,
        gameId: 'dots-boxes',
        tone: mine > theirs ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    function claim(list, who) {
      list.forEach(([r, c]) => {
        owner.set(`${r},${c}`, who);
        if (who === 'you') mine++; else theirs++;
      });
    }

    function cpuTurn() {
      busy = true;
      turnEl.innerText = 'MACHINE THINKING';
      setTimeout(() => {
        let again = true;
        while (again && !done()) {
          const e = pickDbEdge(drawn, size);
          if (!e) break;
          const res = applyDbEdge(drawn, e, size);
          drawn = res.drawn;
          claim(res.completed, 'cpu');
          again = res.completed.length > 0;
        }
        busy = false;
        turn = 'you';
        turnEl.innerText = 'YOUR LINE';
        draw();
        if (done()) finish();
      }, 380);
    }

    function move(edge) {
      if (busy || turn !== 'you') return;
      const res = applyDbEdge(drawn, edge, size);
      if (!res) return;
      drawn = res.drawn;
      claim(res.completed, 'you');
      soundFx.playClick?.();
      draw();
      if (done()) return finish();
      if (!res.completed.length) { turn = 'cpu'; cpuTurn(); }
    }

    container.querySelector('#close-game-btn').onclick = onClose;
    draw();
  }
}

/* =========================================================================
 * 5. FLOOD IT — fill the board from the top-left corner in a move budget.
 *
 * The usual version needs six colours, which the house palette does not have
 * (§14 r1 — one amber, always). So the inks are told apart by SHAPE first and
 * a mono ramp second. It reads at a glance, it survives colour blindness, and
 * it stays on register — which is a better board than the colour one, not a
 * compromised version of it.
 * ====================================================================== */
export const FLOOD_INKS = ['·', '×', '=', '#', '▲'];
export const FLOOD_SIZE = 12;
export const FLOOD_MOVES = 22;

export function makeFloodGrid(size = FLOOD_SIZE, rng = Math.random) {
  return Array.from({ length: size * size }, () => Math.floor(rng() * FLOOD_INKS.length));
}

/** Indices connected to the top-left corner sharing its ink. */
export function floodRegion(grid, size = FLOOD_SIZE) {
  const ink = grid[0];
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop();
    const x = i % size, y = Math.floor(i / size);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const j = ny * size + nx;
      if (seen.has(j) || grid[j] !== ink) continue;
      seen.add(j);
      stack.push(j);
    }
  }
  return seen;
}

export function applyFlood(grid, ink, size = FLOOD_SIZE) {
  if (grid[0] === ink) return null;          // a no-op would burn a move
  const region = floodRegion(grid, size);
  const next = [...grid];
  region.forEach(i => { next[i] = ink; });
  return next;
}

export function floodSolved(grid) {
  return grid.every(v => v === grid[0]);
}

export function renderFloodIt(container, onClose) {
  start();
  function start() {
    const size = FLOOD_SIZE;
    let grid = makeFloodGrid(size);
    let movesLeft = FLOOD_MOVES;

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🌊', 'FLOOD IT', 'Fill the board from the corner in 22 moves')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          The top-left blob takes the ink you pick, and everything touching it joins in.
          Turn the whole board one ink before the moves run out. Marks, not colours —
          this floor only has one amber.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>MOVES <span id="fl-moves" class="text-amber-400 text-base">${movesLeft}</span></div>
          <div>FILLED <span id="fl-pct" class="text-white text-base">0</span>%</div>
        </div>
        <div id="fl-grid" class="grid gap-[1px] bg-amber-500/20 p-[1px] max-w-[336px] mx-auto"
          style="grid-template-columns:repeat(${size},minmax(0,1fr))"></div>
        <div class="grid grid-cols-5 gap-2 mt-3">
          ${FLOOD_INKS.map((m, i) => `<button class="fl-ink axiom-dpad-btn py-3 text-lg" data-i="${i}">${m}</button>`).join('')}
        </div>
      </div>`;

    const gridEl = container.querySelector('#fl-grid');
    const movesEl = container.querySelector('#fl-moves');
    const pctEl = container.querySelector('#fl-pct');
    // A mono ramp: the mark says which ink, the weight backs it up.
    const SHADE = ['#1a2430', '#33404f', '#55636f', '#8d98a3', '#e6edf3'];

    function draw() {
      const region = floodRegion(grid, size);
      gridEl.innerHTML = grid.map((v, i) => `
        <span class="aspect-square flex items-center justify-center"
          style="background:${SHADE[v]};color:${v >= 3 ? '#0a0e14' : '#e6edf3'};font-size:9px;line-height:1;
          ${region.has(i) ? 'outline:1px solid #f59e0b;outline-offset:-1px' : ''}">${FLOOD_INKS[v]}</span>`).join('');
      movesEl.innerText = movesLeft;
      pctEl.innerText = Math.round((region.size / (size * size)) * 100);
    }

    function finish(won) {
      const region = floodRegion(grid, size);
      const pct = Math.round((region.size / (size * size)) * 100);
      showResult({
        container,
        title: won ? 'BOARD FLOODED' : 'OUT OF MOVES',
        message: won
          ? `Cleared with ${movesLeft} move${movesLeft === 1 ? '' : 's'} to spare. Taking the biggest blob every time is the greedy move, and it is not the best one — the board you want is the one that opens two directions at once.`
          : `${pct}% filled. Greedy play stalls here: look for the ink that connects two separate blobs, not the one that eats the most squares this turn.`,
        score: won ? 100 + movesLeft * 10 : pct,
        gameId: 'flood-it',
        tone: won ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelectorAll('.fl-ink').forEach(b => {
      b.onclick = () => {
        const next = applyFlood(grid, Number(b.dataset.i), size);
        if (!next) return;                    // same ink — no move spent
        grid = next;
        movesLeft -= 1;
        soundFx.playClick?.();
        draw();
        if (floodSolved(grid)) return finish(true);
        if (movesLeft <= 0) return finish(false);
      };
    });

    container.querySelector('#close-game-btn').onclick = onClose;
    draw();
  }
}

/* =========================================================================
 * 6. PEG SOLITAIRE — 32 pegs, jump to remove, get down to one.
 * ====================================================================== */
export const PEG_INVALID = -1;

/** The English board: a 7x7 grid with the corners cut out, centre empty. */
export function newPegBoard() {
  const b = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const corner = (r < 2 || r > 4) && (c < 2 || c > 4);
    b.push(corner ? PEG_INVALID : (r === 3 && c === 3 ? 0 : 1));
  }
  return b;
}

/** Every legal jump: over a peg, into a hole, two squares away. */
export function pegMoves(board) {
  const out = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const from = r * 7 + c;
    if (board[from] !== 1) continue;
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const mr = r + dr, mc = c + dc, tr = r + dr * 2, tc = c + dc * 2;
      if (tr < 0 || tr > 6 || tc < 0 || tc > 6) continue;
      const over = mr * 7 + mc, to = tr * 7 + tc;
      if (board[over] === 1 && board[to] === 0) out.push({ from, over, to });
    }
  }
  return out;
}

export function applyPegMove(board, move) {
  const legal = pegMoves(board).some(m => m.from === move.from && m.to === move.to);
  if (!legal) return null;
  const next = [...board];
  next[move.from] = 0;
  next[move.over] = 0;
  next[move.to] = 1;
  return next;
}

export function pegsLeft(board) {
  return board.filter(v => v === 1).length;
}

export function renderPegSolitaire(container, onClose) {
  start();
  function start() {
    let board = newPegBoard();
    let picked = null;

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('⊙', 'PEG SOLITAIRE', 'Jump to remove · 32 down to 1')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Tap a peg, then tap an empty hole two squares away in a straight line —
          the peg you jump over comes off. One peg left is a solved board. Two is close.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>PEGS <span id="pg-left" class="text-amber-400 text-base">32</span></div>
          <div>MOVES LEFT <span id="pg-moves" class="text-white text-base">0</span></div>
          <button id="pg-undo" class="axiom-dpad-btn px-3 py-1 text-[10px]">RESTART</button>
        </div>
        <div id="pg-grid" class="grid grid-cols-7 gap-1 max-w-[300px] mx-auto"></div>
        <p class="text-center text-[10px] text-amber-500/80 uppercase mt-3">Amber ring = selected peg</p>
      </div>`;

    const gridEl = container.querySelector('#pg-grid');
    const leftEl = container.querySelector('#pg-left');
    const movesEl = container.querySelector('#pg-moves');

    function draw() {
      const moves = pegMoves(board);
      const targets = new Set(picked == null ? [] : moves.filter(m => m.from === picked).map(m => m.to));
      gridEl.innerHTML = board.map((v, i) => {
        if (v === PEG_INVALID) return '<span class="aspect-square"></span>';
        const peg = v === 1
          ? `<span class="block" style="width:70%;height:70%;background:#f59e0b;border-radius:50%"></span>`
          : targets.has(i)
            ? `<span class="block" style="width:34%;height:34%;background:#f59e0b;opacity:.45;border-radius:50%"></span>`
            : `<span class="block" style="width:26%;height:26%;background:#334155;border-radius:50%"></span>`;
        return `<button class="pg-c aspect-square bg-zinc-950 border border-amber-500/20 flex items-center justify-center"
          data-i="${i}" aria-label="hole ${i}"
          style="${picked === i ? 'outline:2px solid #f59e0b;outline-offset:-2px' : ''}">${peg}</button>`;
      }).join('');
      gridEl.querySelectorAll('.pg-c').forEach(c => { c.onclick = () => tap(Number(c.dataset.i)); });
      leftEl.innerText = pegsLeft(board);
      movesEl.innerText = moves.length;
    }

    function finish() {
      const n = pegsLeft(board);
      showResult({
        container,
        title: n === 1 ? 'SOLVED — ONE PEG' : n <= 3 ? 'CLOSE' : 'STUCK',
        message: `${n} peg${n === 1 ? '' : 's'} left. The board has exactly one solution class from the centre, and the way into it is to keep the pegs together — a peg stranded on its own can never be taken.`,
        score: Math.max(0, 33 - n),
        gameId: 'peg-solitaire',
        tone: n <= 2 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    function tap(i) {
      const moves = pegMoves(board);
      if (board[i] === 1) { picked = picked === i ? null : i; draw(); return; }
      if (picked == null) return;
      const move = moves.find(m => m.from === picked && m.to === i);
      if (!move) return;
      board = applyPegMove(board, move);
      picked = null;
      soundFx.playClick?.();
      draw();
      if (!pegMoves(board).length) finish();
    }

    container.querySelector('#pg-undo').onclick = () => start();
    container.querySelector('#close-game-btn').onclick = onClose;
    draw();
  }
}
