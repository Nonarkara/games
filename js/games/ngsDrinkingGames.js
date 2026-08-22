/**
 * Dr Non — Non-Gaming System · Drinking Game Suite
 * Phase 5+ (2026-08-10). Three party prompts for the LABS wing.
 *
 * These are NOT brain-training drills. They are screen-side prompt
 * generators for live social play — the screen shows the prompt, the
 * table does the rest. The point of web is to skip the printed card
 * deck and the lookup.
 *
 * 18+ on every entry. Each game's briefing is honest: the on-paper
 * "drink if you do X" rules are encoded as the prompt, the rest is
 * social. We do not gamify the drinking itself; we gamify the prompts.
 *
 * 16-bit register stays. Press Start 2P, JetBrains Mono, amber Move,
 * dark CRT well. The party vibe lives in the COPY, not in the chrome.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. KING'S CUP — Ring of Fire
 * Each card drawn = a rule. Standard 13-card mapping. Click DRAW for the next.
 * ======================================================================== */

const KING_RULES = {
  'A':  { name: 'WATERFALL', rule: 'Everyone drinks at the same time. You can only stop when the person to your right stops.' },
  '2':  { name: 'YOU',       rule: 'Pick one player. They drink.' },
  '3':  { name: 'ME',        rule: 'You drink.' },
  '4':  { name: 'FLOOR',     rule: 'Last person to touch the floor drinks.' },
  '5':  { name: 'GUYS',      rule: 'All guys drink.' },
  '6':  { name: 'GIRLS',     rule: 'All girls drink.' },
  '7':  { name: 'HEAVEN',    rule: 'Point at the ceiling. Last person to follow drinks.' },
  '8':  { name: 'MATE',      rule: 'Pick a drinking mate. They drink whenever you drink for the rest of the round.' },
  '9':  { name: 'RHYME',     rule: 'Say a word. Go around the circle rhyming. Whoever breaks first drinks.' },
  '10': { name: 'CATEGORIES', rule: 'Pick a category (movies, beers, countries). Go around naming one. Miss and you drink.' },
  'J':  { name: 'RULE',      rule: 'Make a rule. Anyone who breaks it drinks. Rule stays for the rest of the round.' },
  'Q':  { name: 'QUESTION',  rule: 'You are the Question Master. Anyone who answers a question you ask drinks.' },
  'K':  { name: "KING'S CUP", rule: 'Pour some of your drink into the center cup. The fourth King drinks the cup.' }
};

const KING_DECK = (() => {
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suits = ['♠','♥','♦','♣'];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push({ rank: r, suit: s });
  return deck;
})();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderKingsCup(container, onClose) {
  start();
  function start() {
    const deck = shuffle(KING_DECK);
    let idx = 0, round = 0, kingsDrawn = 0;
    let timer = null;
    const draw = () => {
      if (idx >= deck.length) { endGame(round); return; }
      const card = deck[idx++];
      round++;
      if (card.rank === 'K') kingsDrawn++;
      const entry = KING_RULES[card.rank];
      soundFx.playCoin();
      render(card, entry, round);
    };
    function render(card, entry, round) {
      const red = card.suit === '♥' || card.suit === '♦';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">♠</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">KING'S CUP</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">DRAW A CARD · APPLY THE RULE · DRINK OR DEAL</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND: <span class="text-amber-400 text-base">${round}</span></div>
            <div>CARDS LEFT: <span class="text-white text-base">${deck.length - idx}</span></div>
            <div>KINGS: <span class="text-red-500 text-base">${kingsDrawn}${kingsDrawn === 4 ? ' — CUP!' : ' / 4'}</span></div>
          </div>
          <div class="bg-zinc-900 border-2 ${red ? 'border-red-500' : 'border-white'} p-8 mb-4 text-center" style="min-height:180px">
            <div class="text-zinc-400 text-xs mb-3">${red ? 'RED SUIT' : 'BLACK SUIT'}</div>
            <div class="text-7xl font-black ${red ? 'text-red-500' : 'text-white'}">${card.rank}</div>
            <div class="text-2xl ${red ? 'text-red-500' : 'text-white'}">${card.suit}</div>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/60 p-4 mb-4 text-center">
            <div class="text-amber-400 text-xs font-black tracking-widest mb-2">${entry.name}</div>
            <div class="text-zinc-100 text-sm">${entry.rule}</div>
          </div>
          <button id="draw-btn" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">
            ${idx >= deck.length ? 'END ROUND' : 'DRAW NEXT'}
          </button>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#draw-btn').onclick = () => { if (idx >= deck.length) endGame(round); else draw(); };
    }
    function endGame(rounds) {
      clearTimeout(timer);
      // Score = cards drawn, matching the server ceiling of 52.
      const score = Math.max(0, rounds);
      showResult({ container, title: 'RING CLOSED', message: `${rounds} cards drawn.`, score, gameId: 'kings-cup', tone: 'over', onRestart: start, onClose });
    }
    draw();
  }
}

/* ===========================================================================
 * 2. NEVER HAVE I EVER
 * 50 statements. Click NEXT for a new one. Fingers down if you've done it.
 * ======================================================================== */

const NHIE_STATEMENTS = [
  'lied to my parents about where I was',
  'pretended to like a gift I actually hated',
  'eaten food that fell on the floor (5-second rule)',
  'stalked an ex on social media',
  'sung in the shower loud enough to disturb the neighbors',
  'faked being sick to skip work or school',
  'googled myself',
  'regifted a present without removing the original tag',
  'laughed so hard I cried',
  'cried at a movie',
  'tried to cook something and set off the smoke alarm',
  'arrived late to something important',
  'forgotten someone\'s name the SECOND they told me',
  'told a white lie to avoid a conversation',
  'taken a selfie in a public bathroom',
  'pretended to understand a topic I was clueless about',
  'spent an entire day in pajamas',
  'drunk-dialed someone',
  'walked into a glass door',
  'spied on neighbors',
  'used a fake name at a coffee shop',
  'googled a medical symptom and convinced myself I was dying',
  'laughed at a joke I didn\'t understand',
  'bribed someone',
  'ghosted someone',
  'pretended my phone was dead to avoid a call',
  'danced when no one was watching',
  'had a crush on a friend\'s partner',
  'told the same story twice to the same person',
  'peeked at the answers in a crossword',
  'tried to pay with an expired coupon on purpose',
  'used the wrong bathroom',
  'read the last page of a book first',
  'accidentally liked an old photo while stalking',
  'lied about my age',
  'forgotten a close friend\'s birthday',
  'eaten dessert for breakfast',
  'cried at a commercial',
  'sang karaoke completely sober',
  'pretended to be a tourist to avoid someone',
  'taken the last slice when it wasn\'t offered',
  'lied in a job interview',
  'kept a library book way past the due date',
  'eaten a leftover that was questionable',
  'pretended to be on the phone to avoid someone',
  'snooped through someone\'s phone',
  'had a wardrobe malfunction in public',
  'taken a "sick day" that was really a mental health day',
  'laughed nervously when I should have been serious',
  'made up a word and used it confidently'
];

export function renderNeverHaveIEver(container, onClose) {
  start();
  function start() {
    const statements = shuffle(NHIE_STATEMENTS);
    let idx = 0, round = 0;
    let timer = null;
    const next = () => {
      if (idx >= statements.length) { endGame(round); return; }
      round++;
      const stmt = statements[idx++];
      soundFx.playCoin();
      render(stmt, round);
    };
    function render(stmt, round) {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">✋</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">NEVER HAVE I EVER</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">FINGERS DOWN IF YOU'VE DONE IT · LAST FINGER UP WINS</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND: <span class="text-amber-400 text-base">${round}</span></div>
            <div>STATEMENTS LEFT: <span class="text-white text-base">${statements.length - idx}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 mb-6 text-center" style="min-height:160px">
            <div class="text-zinc-500 text-xs mb-3">NEVER HAVE I EVER…</div>
            <div class="text-amber-400 text-2xl font-black leading-tight">${stmt}</div>
          </div>
          <button id="next-btn" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">
            ${idx >= statements.length ? 'END GAME' : 'NEXT STATEMENT'}
          </button>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#next-btn').onclick = () => { if (idx >= statements.length) endGame(round); else next(); };
    }
    function endGame(rounds) {
      clearTimeout(timer);
      // Score = statements seen, matching the server ceiling of 50.
      const score = Math.max(0, rounds);
      showResult({ container, title: 'GAME OVER', message: `${rounds} statements.`, score, gameId: 'never-have-i', tone: 'over', onRestart: start, onClose });
    }
    next();
  }
}

/* ===========================================================================
 * 3. MOST LIKELY TO
 * 40 prompts. Everyone points at who fits best. Most fingers pointed drinks.
 * ======================================================================== */

const MLT_PROMPTS = [
  'become president',
  'survive a zombie apocalypse',
  'get famous on TikTok',
  'win a Nobel Prize',
  'start their own country',
  'write a bestselling novel',
  'go viral for the wrong reason',
  'get stuck in a foreign country with no phone',
  'live off the grid successfully',
  'be the first to colonize Mars',
  'be late to their own wedding',
  'get a standing ovation for karaoke',
  'get arrested for something ridiculous',
  'win an Olympic medal (any sport)',
  'open a successful restaurant',
  'live to 110',
  'forget their own birthday',
  'laugh at their own joke that nobody else got',
  'talk their way out of anything',
  'be mistaken for a celebrity',
  'become a millionaire by 30',
  'cry at a dog video',
  'be the best cook among friends',
  'know every word to every song',
  'fall asleep in a meeting',
  'take the most selfies in one day',
  'text the wrong person something embarrassing',
  'accidentally start a fire while cooking',
  'get stuck in an elevator',
  'live in a tiny house on purpose',
  'learn five languages',
  'be a morning person (and love it)',
  'fall in love at first sight',
  'move abroad on a whim',
  'win a game show',
  'be mistaken for someone 10 years younger',
  'give a TED talk',
  'discover a new planet',
  'start a cult by accident',
  'be the funniest person in any room'
];

export function renderMostLikelyTo(container, onClose) {
  start();
  function start() {
    const prompts = shuffle(MLT_PROMPTS);
    let idx = 0, round = 0;
    let timer = null;
    const next = () => {
      if (idx >= prompts.length) { endGame(round); return; }
      round++;
      const prompt = prompts[idx++];
      soundFx.playCoin();
      render(prompt, round);
    };
    function render(prompt, round) {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">☝</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">MOST LIKELY TO</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">EVERYONE POINTS · MOST FINGERS DRINKS</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND: <span class="text-amber-400 text-base">${round}</span></div>
            <div>PROMPTS LEFT: <span class="text-white text-base">${prompts.length - idx}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 mb-6 text-center" style="min-height:160px">
            <div class="text-zinc-500 text-xs mb-3">MOST LIKELY TO…</div>
            <div class="text-amber-400 text-3xl font-black leading-tight">${prompt}</div>
          </div>
          <button id="next-btn" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">
            ${idx >= prompts.length ? 'END GAME' : 'NEXT PROMPT'}
          </button>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#next-btn').onclick = () => { if (idx >= prompts.length) endGame(round); else next(); };
    }
    function endGame(rounds) {
      clearTimeout(timer);
      // Score = prompts seen, matching the server ceiling of 40.
      const score = Math.max(0, rounds);
      showResult({ container, title: 'GAME OVER', message: `${rounds} prompts.`, score, gameId: 'most-likely', tone: 'over', onRestart: start, onClose });
    }
    next();
  }
}
