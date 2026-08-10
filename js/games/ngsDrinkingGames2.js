/**
 * Dr Non — Non-Gaming System · Drinking Game Suite II (the all-night collection)
 * Phase 5+ (2026-08-10). Six more party prompts for the LABS wing.
 *
 *   Ride the Bus        — the canonical 4-phase card game
 *   Power Hour          — 60 prompts on a 60-min timer
 *   Buzz (21)           — count to 21 with random increments
 *   Truth or Dare       — 18+ prompt-based
 *   Higher or Lower     — single-deck streak game
 *   2 Truths & a Lie    — deception + voting
 *
 * 18+ on every entry. Same 16-bit register as the rest of the floor.
 * The party vibe lives in the COPY. We do not gamify the drinking itself;
 * we gamify the prompts and the table. The drink is the user's choice.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. RIDE THE BUS — the canonical 4-phase card game
 * Phase 1: Red or Black (streak). Phase 2: Higher or Lower. Phase 3: Inside
 * or Outside (between two previous cards). Phase 4: Guess the suit.
 * Wrong guess = drink. Survive all 4 = winner.
 * ======================================================================== */

const RTB_DECK = (() => {
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suits = ['♠','♥','♦','♣'];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push({ rank: r, suit: s, value: r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : parseInt(r), color: (s === '♥' || s === '♦') ? 'red' : 'black' });
  return deck;
})();
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const RTB_PHASES = [
  { name: 'RED OR BLACK', guide: 'Guess the color of the next card. Streak until you miss.' },
  { name: 'HIGHER OR LOWER', guide: 'Guess if the next card is higher or lower than the last.' },
  { name: 'INSIDE OR OUTSIDE', guide: 'Guess if the next card falls between (or equal to) the last two.' },
  { name: 'GUESS THE SUIT', guide: 'Name the suit of the next card. One shot.' }
];

export function renderRideTheBus(container, onClose) {
  start();
  function start() {
    const deck = shuffle(RTB_DECK);
    let idx = 0, phase = 0, streak = 0, drinks = 0;
    let last = null, secondLast = null;
    let timer = null;
    const next = () => {
      if (idx >= deck.length) { endGame(); return; }
      const card = deck[idx++];
      if (phase >= RTB_PHASES.length) { endGame(); return; }
      render(card);
    };
    function render(card) {
      const ph = RTB_PHASES[phase];
      const red = card.color === 'red';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🚌</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">RIDE THE BUS</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">PHASE ${phase + 1} / 4 · ${ph.name}</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>STREAK: <span class="text-amber-400 text-base">${streak}</span></div>
            <div>DRINKS: <span class="text-red-500 text-base">${drinks}</span></div>
            <div>PHASE: <span class="text-white text-base">${phase + 1}/4</span></div>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/60 p-3 mb-4 text-center text-zinc-200 text-sm">${ph.guide}</div>
          <div class="bg-zinc-900 border-2 ${red ? 'border-red-500' : 'border-white'} p-6 mb-4 text-center" style="min-height:160px">
            <div class="text-7xl font-black ${red ? 'text-red-500' : 'text-white'}">${card.rank}</div>
            <div class="text-2xl ${red ? 'text-red-500' : 'text-white'}">${card.suit}</div>
          </div>
          <div class="grid grid-cols-2 gap-3" id="rtb-buttons"></div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      const buttons = container.querySelector('#rtb-buttons');
      const opts = phaseButtons(phase, card, last, secondLast);
      opts.forEach(o => {
        const b = document.createElement('button');
        b.className = `py-4 border-2 ${o.color} font-black tracking-widest text-sm hover:opacity-80`;
        b.textContent = o.label;
        b.onclick = () => answer(o.value, card);
        buttons.appendChild(b);
      });
    }
    function phaseButtons(p, card, last, secondLast) {
      if (p === 0) return [
        { label: 'RED ♥♦', value: 'red', color: 'border-red-500 text-red-400' },
        { label: 'BLACK ♠♣', value: 'black', color: 'border-white text-white' }
      ];
      if (p === 1) return [
        { label: 'HIGHER', value: 'higher', color: 'border-amber-500 text-amber-400' },
        { label: 'LOWER', value: 'lower', color: 'border-amber-500 text-amber-400' }
      ];
      if (p === 2) return [
        { label: 'INSIDE', value: 'inside', color: 'border-amber-500 text-amber-400' },
        { label: 'OUTSIDE', value: 'outside', color: 'border-amber-500 text-amber-400' }
      ];
      return [
        { label: '♠', value: '♠', color: 'border-white text-white text-2xl' },
        { label: '♥', value: '♥', color: 'border-red-500 text-red-500 text-2xl' },
        { label: '♦', value: '♦', color: 'border-red-500 text-red-500 text-2xl' },
        { label: '♣', value: '♣', color: 'border-white text-white text-2xl' }
      ];
    }
    function answer(guess, card) {
      let correct = false;
      if (phase === 0) correct = guess === card.color;
      else if (phase === 1 && last) correct = (guess === 'higher' && card.value >= last.value) || (guess === 'lower' && card.value <= last.value);
      else if (phase === 2 && last && secondLast) {
        const lo = Math.min(last.value, secondLast.value);
        const hi = Math.max(last.value, secondLast.value);
        correct = (guess === 'inside') ? (card.value >= lo && card.value <= hi) : (card.value < lo || card.value > hi);
      } else if (phase === 3) correct = guess === card.suit;
      if (correct) { streak++; soundFx.playCoin(); }
      else { drinks++; soundFx.playHit(); streak = 0; phase = Math.min(phase + 1, RTB_PHASES.length - 1); }
      secondLast = last; last = card;
      if (!correct || phase > phase) { /* advance */ }
      if (phase === 3 && correct) { endGame(); return; }
      if (drinks >= 4) { endGame(); return; }
      next();
    }
    function endGame() {
      clearTimeout(timer);
      const score = Math.max(0, streak * 10 - drinks * 5);
      showResult({ container, title: 'BUS RIDE OVER', message: `Streak ${streak} · ${drinks} drinks.`, score, gameId: 'ride-the-bus', tone: drinks < 4 ? 'win' : 'over', onRestart: start, onClose });
    }
    next();
  }
}

/* ===========================================================================
 * 2. POWER HOUR — 60 prompts on a 60-min timer (compressed to 60s for the
 * session, with each tick advancing the prompt by one minute)
 * ======================================================================== */

const POWER_HOUR_PROMPTS = [
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — and pass it to the left',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — name a beer brand or drink',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — finish your drink',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — toast to the player on your right',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — pick someone to take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip',
  'Take a sip — you survived Power Hour'
];

export function renderPowerHour(container, onClose) {
  start();
  function start() {
    let minute = 0;
    let timer = null;
    const totalMinutes = POWER_HOUR_PROMPTS.length;
    function next() {
      if (minute >= totalMinutes) { endGame(); return; }
      render();
    }
    function render() {
      const prompt = POWER_HOUR_PROMPTS[minute];
      const min = minute + 1;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">⏱</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">POWER HOUR</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">60 PROMPTS · 60 MINUTES · 60 SIPS</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>MINUTE: <span class="text-amber-400 text-base">${min}/${totalMinutes}</span></div>
            <div>DRINKS: <span class="text-red-500 text-base">${min}</span></div>
          </div>
          <div class="bg-amber-500/10 border-2 border-amber-500 p-10 mb-4 text-center" style="min-height:200px">
            <div class="text-zinc-400 text-xs mb-3">MINUTE ${min} OF ${totalMinutes}</div>
            <div class="text-amber-400 text-3xl font-black leading-tight">${prompt}</div>
          </div>
          <button id="ph-next" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">
            ${min >= totalMinutes ? 'FINISH' : 'NEXT MINUTE →'}
          </button>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#ph-next').onclick = () => { minute++; soundFx.playCoin(); if (minute >= totalMinutes) endGame(); else render(); };
    }
    function endGame() {
      clearTimeout(timer);
      const score = totalMinutes * 10;
      showResult({ container, title: 'POWER HOUR COMPLETE', message: `60 minutes. 60 sips. You did it.`, score, gameId: 'power-hour', tone: 'win', onRestart: start, onClose });
    }
    render();
  }
}

/* ===========================================================================
 * 3. BUZZ (21) — count to 21, each tap advances by 1, 2, or 3
 * Whoever says 21 drinks. Tap to play against the computer.
 * ======================================================================== */

export function renderBuzz(container, onClose) {
  start();
  function start() {
    const TARGET = 21;
    let current = 0, rounds = 0, playerWins = 0;
    let timer = null;
    function playerMove(advance) {
      current += advance;
      if (current >= TARGET) { endGame(false); return; }
      computerMove();
    }
    function computerMove() {
      // Optimal strategy: leave the player a multiple of 4 (so any 1/2/3 lands on 20, 21, or 22 — we want them to take 22 which is a loss)
      // Actually: leave them at 21 mod 4 = 1. The player can't avoid eventually hitting 21.
      const choices = [1, 2, 3];
      const move = choices[(TARGET - current - 1) % 4] || 1;
      // Simpler: just play badly (random) for fun
      const m = choices[Math.floor(Math.random() * 3)];
      current += m;
      rounds++;
      render(`Computer says +${m}`);
    }
    function render(note) {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🔢</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">BUZZ (21)</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">COUNT TO 21 · +1 +2 OR +3 · WHOEVER SAYS 21 DRINKS</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>CURRENT: <span class="text-amber-400 text-4xl font-black">${current}</span></div>
            <div>TARGET: <span class="text-red-500 text-base">21</span></div>
            <div>ROUNDS: <span class="text-white text-base">${rounds}</span></div>
          </div>
          ${note ? `<div class="bg-zinc-900 border border-amber-500/60 p-3 mb-4 text-center text-amber-400">${note}</div>` : ''}
          <div class="text-zinc-200 text-sm mb-3 text-center">YOUR TURN — PICK +1, +2, OR +3</div>
          <div class="grid grid-cols-3 gap-3">
            <button class="buzz-opt py-6 border-2 border-amber-500 text-amber-400 font-black text-3xl hover:bg-amber-500 hover:text-black" data-advance="1">+1</button>
            <button class="buzz-opt py-6 border-2 border-amber-500 text-amber-400 font-black text-3xl hover:bg-amber-500 hover:text-black" data-advance="2">+2</button>
            <button class="buzz-opt py-6 border-2 border-amber-500 text-amber-400 font-black text-3xl hover:bg-amber-500 hover:text-black" data-advance="3">+3</button>
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.buzz-opt').forEach(b => b.onclick = () => {
        soundFx.playCoin();
        playerMove(parseInt(b.dataset.advance, 10));
      });
    }
    function endGame(playerLost) {
      clearTimeout(timer);
      const score = (rounds * 5) + (playerLost ? 0 : 50);
      const msg = playerLost ? `You said 21. Drink.` : `You survived! The computer said 21.`;
      showResult({ container, title: playerLost ? 'YOU DRINK' : 'YOU SURVIVED', message: msg, score, gameId: 'buzz-21', tone: playerLost ? 'over' : 'win', onRestart: start, onClose });
    }
    render(null);
  }
}

/* ===========================================================================
 * 4. TRUTH OR DARE (18+)
 * 30 truths, 30 dares. Pick one, answer, drink if you refuse.
 * ======================================================================== */

const TOD_TRUTHS = [
  'What is the most embarrassing thing in your search history?',
  'Who in this room would you never want to see your text messages?',
  'What is a secret you have never told anyone?',
  'What is the pettiest reason you have ever ghosted someone?',
  'What is something you love that most people find weird?',
  'What is the worst date you have ever been on?',
  'What is the most money you have ever lost in one bet?',
  'What is the longest you have gone without sleep?',
  'What is a compliment you have faked?',
  'What is the worst thing you have ever said to a stranger?',
  'What is a song you secretly love that you would never admit?',
  'What is the most embarrassing thing in your room right now?',
  'What is the biggest lie you have ever told?',
  'What is a habit you have that you have never told anyone?',
  'What is the most illegal thing you have ever done?',
  'What is the worst gift you have ever given?',
  'What is something you have done that you regret?',
  'What is the pettiest grudge you still hold?',
  'What is the most embarrassing text you have ever sent?',
  'What is a job you would never do even for a million dollars?',
  'What is the most you have ever eaten in one sitting?',
  'What is a fear you have never admitted?',
  'What is the most childish thing you still do?',
  'What is something you have never told your parents?',
  'What is a food you have pretended to like?',
  'What is the worst haircut you have ever had?',
  'What is something you have done for money that you regret?',
  'What is the longest you have held a grudge?',
  'What is the most embarrassing thing in your phone camera roll?',
  'What is a rumor you have started?'
];
const TOD_DARES = [
  'Speak in a fake accent for the next 5 minutes',
  'Let the player on your left pick a contact from your phone to text "I miss you"',
  'Do 10 push-ups right now',
  'Sing the chorus of the last song you listened to, out loud',
  'Let the table go through your phone for 30 seconds',
  'Speak only in questions for the next 3 minutes',
  'Drink a mystery shot chosen by the player across from you',
  'Make eye contact with the player on your right for 30 seconds without laughing',
  'Post the most recent photo in your camera roll to a social story of the group\'s choice',
  'Call a friend and say "I have something important to tell you" then hang up',
  'Do your best impression of someone at the table',
  'Eat a spoonful of whatever condiment the group picks',
  'Let the player on your right write something on your forehead with a marker',
  'Speak in third person for the next 5 minutes',
  'Do a handstand (or attempt one)',
  'Give the player on your left a genuine compliment',
  'Text your ex "Hey" — do not send a follow-up',
  'Dance for 15 seconds with no music',
  'Do an interpretive dance to whatever song the group picks',
  'Let the group pick a new profile picture for you, taken right now',
  'Speak only in rhymes for the next 2 minutes',
  'Hold a plank for 30 seconds',
  'Recite the alphabet backward',
  'Wear a piece of clothing inside-out for the rest of the night',
  'Do 20 jumping jacks',
  'Make a TikTok with the person on your left',
  'Say "I love you" to the next person who walks by',
  'Send a "thinking of you" text to the last person in your contacts',
  'Eat a raw spice (chili, wasabi, etc.) chosen by the group',
  'Try to lick your elbow'
];

export function renderTruthOrDare(container, onClose) {
  start();
  function start() {
    const truths = shuffle(TOD_TRUTHS);
    const dares = shuffle(TOD_DARES);
    let truthIdx = 0, dareIdx = 0, round = 0;
    let timer = null;
    function choose() {
      const pickTruth = Math.random() < 0.5;
      const list = pickTruth ? truths : dares;
      const idx = pickTruth ? truthIdx++ : dareIdx++;
      const prompt = list[idx % list.length];
      round++;
      render(pickTruth ? 'TRUTH' : 'DARE', prompt, round);
    }
    function render(kind, prompt, round) {
      const isTruth = kind === 'TRUTH';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">${isTruth ? '💬' : '🔥'}</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">TRUTH OR DARE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">18+ · ANSWER OR DRINK</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND: <span class="text-amber-400 text-base">${round}</span></div>
            <div>KIND: <span class="text-${isTruth ? 'green' : 'red'}-400 text-base">${kind}</span></div>
          </div>
          <div class="bg-zinc-900 border-2 ${isTruth ? 'border-green-500' : 'border-red-500'} p-8 mb-4 text-center" style="min-height:200px">
            <div class="text-zinc-400 text-xs mb-3">${kind}</div>
            <div class="text-amber-400 text-2xl font-black leading-tight">${prompt}</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button id="tod-did" class="py-5 border-2 border-green-500 text-green-400 font-black tracking-widest text-base hover:bg-green-500 hover:text-black">DID IT</button>
            <button id="tod-drink" class="py-5 border-2 border-red-500 text-red-400 font-black tracking-widest text-base hover:bg-red-500 hover:text-black">DRINK</button>
          </div>
          <button id="tod-next" class="w-full mt-3 py-3 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">NEXT ROUND →</button>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#tod-did').onclick = () => { soundFx.playCoin(); };
      container.querySelector('#tod-drink').onclick = () => { soundFx.playHit(); };
      container.querySelector('#tod-next').onclick = () => choose();
    }
    function endGame() {
      clearTimeout(timer);
      const score = round * 10;
      showResult({ container, title: 'GAME OVER', message: `${round} rounds.`, score, gameId: 'truth-or-dare', tone: 'over', onRestart: start, onClose });
    }
    choose();
  }
}

/* ===========================================================================
 * 5. HIGHER OR LOWER — single-deck streak
 * Show a card, guess the next. Streak ends on a wrong guess.
 * ======================================================================== */

export function renderHigherLower(container, onClose) {
  start();
  function start() {
    const deck = shuffle(RTB_DECK);
    let idx = 0, streak = 0, drinks = 0;
    let timer = null;
    function next() {
      if (idx + 1 >= deck.length) { endGame(); return; }
      const card = deck[idx];
      const nextCard = deck[idx + 1];
      render(card, nextCard);
    }
    function render(card, nextCard) {
      const red = card.color === 'red';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">↕</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">HIGHER OR LOWER</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">STREAK UNTIL YOU MISS · DRINK ON A WRONG GUESS</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>STREAK: <span class="text-amber-400 text-base">${streak}</span></div>
            <div>DRINKS: <span class="text-red-500 text-base">${drinks}</span></div>
          </div>
          <div class="bg-zinc-900 border-2 ${red ? 'border-red-500' : 'border-white'} p-8 mb-4 text-center" style="min-height:180px">
            <div class="text-zinc-400 text-xs mb-3">CURRENT CARD</div>
            <div class="text-7xl font-black ${red ? 'text-red-500' : 'text-white'}">${card.rank}</div>
            <div class="text-2xl ${red ? 'text-red-500' : 'text-white'}">${card.suit}</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button id="hl-higher" class="py-5 border-2 border-amber-500 text-amber-400 font-black tracking-widest text-base hover:bg-amber-500 hover:text-black">HIGHER ↑</button>
            <button id="hl-lower" class="py-5 border-2 border-amber-500 text-amber-400 font-black tracking-widest text-base hover:bg-amber-500 hover:text-black">LOWER ↓</button>
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelector('#hl-higher').onclick = () => answer('higher', card, nextCard);
      container.querySelector('#hl-lower').onclick = () => answer('lower', card, nextCard);
    }
    function answer(guess, card, nextCard) {
      const correct = (guess === 'higher' && nextCard.value > card.value) || (guess === 'lower' && nextCard.value < card.value);
      const isEqual = nextCard.value === card.value;
      if (isEqual) { soundFx.playHit(); drinks++; streak = 0; }
      else if (correct) { streak++; soundFx.playCoin(); }
      else { drinks++; soundFx.playHit(); streak = 0; }
      idx++;
      if (drinks >= 5) { endGame(); return; }
      next();
    }
    function endGame() {
      clearTimeout(timer);
      const score = Math.max(0, streak * 10 - drinks * 5);
      showResult({ container, title: 'STREAK OVER', message: `Streak ${streak} · ${drinks} drinks.`, score, gameId: 'higher-lower', tone: drinks < 5 ? 'win' : 'over', onRestart: start, onClose });
    }
    next();
  }
}

/* ===========================================================================
 * 6. TWO TRUTHS & A LIE
 * Three statements: two true, one lie. The group votes. Score = correct votes.
 * ======================================================================== */

const TTL_PACKS = [
  [
    'I once ate a whole pineapple in one sitting',
    'I have met a head of state',
    'I have been to every continent'
  ],
  [
    'I can play the ukulele',
    'I have a twin sibling',
    'I once lived in a foreign country for a year'
  ],
  [
    'I was born in a different country from where I grew up',
    'I have read more than 500 books',
    'I once won a pie-eating contest'
  ],
  [
    'I can solve a Rubik\'s cube in under a minute',
    'I once ran a marathon',
    'I have a pet that is not a cat or a dog'
  ],
  [
    'I have a scar from a childhood accident',
    'I have never broken a bone',
    'I have been on television'
  ],
  [
    'I can speak three languages',
    'I once met a celebrity in an elevator',
    'I have been skydiving'
  ],
  [
    'I can whistle with two fingers',
    'I have worked in a kitchen',
    'I have never been on a plane'
  ],
  [
    'I was once in a school play',
    'I have a nickname no one else knows',
    'I have ridden a horse'
  ],
  [
    'I once won a spelling bee',
    'I can juggle three objects',
    'I have been arrested (not charged)'
  ],
  [
    'I have a degree in something unexpected',
    'I have lived in a foreign country',
    'I have never seen snow'
  ]
];

export function renderTwoTruths(container, onClose) {
  start();
  function start() {
    let round = 0, correct = 0, vote = null, revealed = false;
    let timer = null;
    const pack = TTL_PACKS[Math.floor(Math.random() * TTL_PACKS.length)];
    const lieIdx = Math.floor(Math.random() * 3);
    const statements = pack.map((s, i) => ({ text: s, isLie: i === lieIdx }));
    function render() {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🎭</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">2 TRUTHS & A LIE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">GROUP VOTES · THE LIE WINS THE ROUND</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND: <span class="text-amber-400 text-base">${round + 1}</span></div>
            <div>CORRECT VOTES: <span class="text-green-400 text-base">${correct}</span></div>
          </div>
          <div class="space-y-3 mb-4">
            ${statements.map((s, i) => `
              <button class="ttl-opt w-full text-left p-4 border-2 ${revealed && s.isLie ? 'border-red-500 bg-red-500/20' : revealed ? 'border-green-500 bg-green-500/20' : vote === i ? 'border-amber-500 bg-amber-500/20' : 'border-zinc-700 hover:border-amber-500'} transition" data-idx="${i}">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-amber-400 text-xs font-black mr-2">${['A', 'B', 'C'][i]}</span>
                    <span class="text-zinc-100 text-base">${s.text}</span>
                  </div>
                  ${revealed ? `<span class="text-${s.isLie ? 'red' : 'green'}-400 text-xs font-black">${s.isLie ? 'LIE' : 'TRUE'}</span>` : ''}
                </div>
              </button>
            `).join('')}
          </div>
          ${!revealed ? `<button id="ttl-reveal" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">REVEAL THE LIE</button>` : `<button id="ttl-next" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">${round + 1 >= 5 ? 'END GAME' : 'NEXT ROUND →'}</button>`}
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.ttl-opt').forEach(b => b.onclick = () => { vote = parseInt(b.dataset.idx, 10); render(); });
      if (!revealed) {
        const reveal = container.querySelector('#ttl-reveal');
        if (reveal) reveal.onclick = () => { revealed = true; if (vote === lieIdx) { correct++; soundFx.playCoin(); } else { soundFx.playHit(); } render(); };
      } else {
        const next = container.querySelector('#ttl-next');
        if (next) next.onclick = () => { if (round + 1 >= 5) endGame(); else { round++; revealed = false; vote = null; render(); } };
      }
    }
    function endGame() {
      clearTimeout(timer);
      const score = correct * 20;
      showResult({ container, title: 'GAME OVER', message: `${correct} / 5 lies caught.`, score, gameId: 'two-truths', tone: correct >= 3 ? 'win' : 'over', onRestart: start, onClose });
    }
    render();
  }
}
