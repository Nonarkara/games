/**
 * Dr Non — Non-Gaming System Adult & Mind Lounge Suite (Axiom Core Styled)
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { showResult } from '../ui.js';

/* ===========================================================================
 * 1. ULTIMATE TRIVIA MASTER
 * ======================================================================== */
export function renderTriviaMaster(container, onClose) {
  start();

  function start() {
    const questions = [
      { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: 1 },
      { q: "In programming, what does 'API' stand for?", options: ["Application Programming Interface", "Automated Protocol Integrator", "Access Point Infrastructure", "Applied Python Logic"], answer: 0 },
      { q: "What year was the original NES released in North America?", options: ["1981", "1983", "1985", "1989"], answer: 2 },
      { q: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"], answer: 1 },
      { q: "Which chemical element has the symbol 'Au'?", options: ["Silver", "Gold", "Aluminum", "Copper"], answer: 1 }
    ];

    let currentIdx = 0;
    let score = 0;
    let high = StorageService.getHighScore('trivia-master');

    function render() {
      const qObj = questions[currentIdx];
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-6 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🧠</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">ULTIMATE TRIVIA MASTER</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">TAP THE ANSWER · ONE QUESTION AT A TIME</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>QUESTION: <span class="text-amber-400">${currentIdx + 1} / ${questions.length}</span></div>
            <div>SCORE: <span class="text-white">${score}</span></div>
            <div>HIGH SCORE: <span class="text-amber-400">${high}</span></div>
          </div>

          <!-- Progress bar -->
          <div class="w-full bg-zinc-900 h-1 mb-6">
            <div class="bg-amber-500 h-1 transition-all" style="width:${((currentIdx) / questions.length) * 100}%"></div>
          </div>

          <div class="bg-zinc-900 border border-amber-500/40 p-6 text-center mb-6">
            <h3 class="text-lg font-bold text-amber-300">${qObj.q}</h3>
          </div>

          <div class="grid grid-cols-1 gap-3">
            ${qObj.options.map((opt, idx) => `
              <button class="trivia-opt-btn w-full py-4 px-6 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/40 text-left font-bold transition flex justify-between items-center" data-idx="${idx}">
                <span>${opt}</span>
                <span class="text-xs text-amber-500/60">[OPTION ${idx + 1}]</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = onClose;

      container.querySelectorAll('.trivia-opt-btn').forEach(btn => {
        btn.onclick = () => {
          // Lock the board during the reveal — a second click used to
          // re-score and skip a question.
          if (btn.disabled) return;
          container.querySelectorAll('.trivia-opt-btn').forEach(b => { b.disabled = true; });
          const selected = parseInt(btn.dataset.idx, 10);
          const correct = selected === qObj.answer;

          // Visual feedback before advancing.
          btn.classList.remove('bg-zinc-900', 'hover:bg-amber-600', 'hover:text-black', 'border-amber-500/40');
          btn.classList.add(correct ? 'bg-emerald-700' : 'bg-red-800', 'text-white');

          if (correct) {
            soundFx.playCoin();
            score += 100;
          } else {
            soundFx.playHit();
          }

          setTimeout(() => {
            currentIdx++;
            if (currentIdx < questions.length) {
              render();
            } else {
              const max = questions.length * 100;
              showResult({
                container,
                title: score === max ? 'PERFECT SCORE' : 'TRIVIA COMPLETE',
                message: `You answered ${score / 100} of ${questions.length} correctly.`,
                score,
                gameId: 'trivia-master',
                tone: score >= max * 0.6 ? 'win' : 'over',
                onRestart: () => start(),
                onClose
              });
            }
          }, 650);
        };
      });
    }

    render();
  }
}

/* ===========================================================================
 * 2. CYBER BLACKJACK 21
 * ======================================================================== */
export function renderBlackjack(container, onClose) {
  start();

  function start() {
    let bankroll = StorageService.getHighScore('cyber-blackjack') || 1000;
    if (bankroll <= 0) bankroll = 1000; // reset safety
    let bet = 50;
    let playerHand = [];
    let dealerHand = [];
    let gameState = 'betting'; // 'betting' | 'playing' | 'dealer' | 'ended'
    let message = 'PLACE YOUR BET TO DEAL CARDS';
    let bustNotice = null;
    let handsPlayed = 0;
    let peak = bankroll;

    // Six-deck shoe, shuffled once per session. An infinite random deck made
    // card counting impossible while the table implied real decks.
    const shoe = [];
    function buildShoe() {
      const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
      const suits = ['♠', '♥', '♦', '♣'];
      for (let d = 0; d < 6; d++) {
        for (const suit of suits) {
          for (let rank of ranks) {
            let val = parseInt(rank, 10);
            if (['J','Q','K'].includes(rank)) val = 10;
            if (rank === 'A') val = 11;
            shoe.push({ rank, suit, val });
          }
        }
      }
      for (let i = shoe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
      }
    }
    buildShoe();

    function drawCard() {
      if (shoe.length < 20) buildShoe();
      return shoe.pop();
    }

    function notePeak() {
      handsPlayed++;
      if (bankroll > peak) peak = bankroll;
      StorageService.updateHighScore('cyber-blackjack', Math.min(10000, bankroll));
    }

    function getHandTotal(hand) {
      let total = hand.reduce((acc, c) => acc + c.val, 0);
      let aces = hand.filter(c => c.rank === 'A').length;
      while (total > 21 && aces > 0) { total -= 10; aces--; }
      return total;
    }

    function render() {
      const pTotal = getHandTotal(playerHand);
      const dTotal = getHandTotal(dealerHand);

      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-6 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🃏</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">CYBER BLACKJACK 21</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">Get closer to 21 than the dealer without going over · face cards = 10 · ace = 11 or 1 · dealer must draw to 17</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-4 mb-6 font-mono text-xs">
            <div>BANKROLL: <span class="text-amber-400 font-bold">$${bankroll}</span></div>
            <div>CURRENT BET: <span class="text-white font-bold">$${bet}</span></div>
          </div>

          <div class="bg-zinc-900 border border-amber-500/40 p-6 mb-6 text-center">
            <div class="text-amber-400 font-bold text-base mb-4">${message}</div>

            <div class="mb-4">
              <div class="text-xs text-zinc-400 mb-1">DEALER ${gameState !== 'betting' ? `(${dTotal})` : ''}</div>
              <div class="flex justify-center gap-2 min-h-[64px]">
                ${dealerHand.map(c => `
                  <div class="w-12 h-16 bg-zinc-100 font-bold flex items-center justify-center text-xl border ${['♥','♦'].includes(c.suit) ? 'text-red-600' : 'text-slate-950'}">
                    ${c.rank}${c.suit}
                  </div>
                `).join('')}
              </div>
            </div>

            <div>
              <div class="text-xs text-zinc-400 mb-1">YOUR HAND ${gameState !== 'betting' ? `(${pTotal})` : ''}</div>
              <div class="flex justify-center gap-2 min-h-[64px]">
                ${playerHand.map(c => `
                  <div class="w-12 h-16 bg-zinc-100 font-bold flex items-center justify-center text-xl border ${['♥','♦'].includes(c.suit) ? 'text-red-600' : 'text-slate-950'}">
                    ${c.rank}${c.suit}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          ${gameState === 'betting' ? `
            <div class="flex items-center justify-center gap-3 mb-3">
              <button id="bet-down" class="axiom-dpad-btn px-4 py-2">－ $25</button>
              <span class="text-amber-400 font-bold text-lg">$${bet}</span>
              <button id="bet-up" class="axiom-dpad-btn px-4 py-2">＋ $25</button>
            </div>
            <button id="deal-btn" class="w-full py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-base uppercase tracking-wider">
              🃏 DEAL CARDS ($${bet})
            </button>
          ` : `
            <div class="flex justify-center gap-4">
              <button id="hit-btn" class="w-1/2 py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-base tracking-wider ${gameState !== 'playing' ? 'opacity-40 pointer-events-none' : ''}">
                ➕ HIT
              </button>
              <button id="stand-btn" class="w-1/2 py-4 bg-zinc-800 hover:bg-amber-900 text-amber-400 font-black text-base border border-amber-500/40 tracking-wider ${gameState !== 'playing' ? 'opacity-40 pointer-events-none' : ''}">
                ✋ STAND
              </button>
            </div>
          `}
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = () => {
        // Leaving the table cashes you out: the session's peak bankroll is
        // the score that gets signed. Closing before any deal is a plain exit.
        if (!handsPlayed) { onClose(); return; }
        showResult({
          container,
          title: 'CASHED OUT',
          message: `Peak bankroll $${peak} across ${handsPlayed} hand${handsPlayed === 1 ? '' : 's'}.`,
          score: Math.min(10000, peak),
          gameId: 'cyber-blackjack',
          tone: peak > 1000 ? 'win' : 'over',
          onRestart: () => start(),
          onClose
        });
      };

      if (gameState === 'betting') {
        container.querySelector('#bet-down').onclick = () => { bet = Math.max(25, bet - 25); render(); };
        container.querySelector('#bet-up').onclick = () => { bet = Math.min(bankroll, bet + 25); render(); };

        container.querySelector('#deal-btn').onclick = () => {
          if (bankroll < bet) {
            showResult({
              container,
              title: 'OUT OF CHIPS',
              message: 'Bankroll reset to $1000.',
              onClose
            });
            bankroll = 1000;
            return;
          }
          soundFx.playClick();
          bankroll -= bet;
          playerHand = [drawCard(), drawCard()];
          dealerHand = [drawCard()];
          if (getHandTotal(playerHand) === 21) {
            // Natural pays 3 to 2, like the table says.
            const payout = bet + Math.round(bet * 1.5);
            bankroll += payout;
            gameState = 'ended';
            handsPlayed++;
            if (bankroll > peak) peak = bankroll;
            StorageService.updateHighScore('cyber-blackjack', Math.min(10000, bankroll));
            message = `♠ BLACKJACK — PAYS 3 TO 2 (+$${payout})`;
            render();
            setTimeout(() => { gameState = 'betting'; render(); }, 1800);
            return;
          }
          gameState = 'playing';
          message = 'HIT OR STAND?';
          render();
        };
      } else {
        container.querySelector('#hit-btn').onclick = () => {
          soundFx.playClick();
          playerHand.push(drawCard());
          const pt = getHandTotal(playerHand);
          if (pt > 21) {
            soundFx.playHit();
            gameState = 'ended';
            message = '💥 BUST! Hand exceeded 21.';
            notePeak();
            render();
            setTimeout(() => { gameState = 'betting'; render(); }, 1600);
          } else {
            render();
          }
        };

        container.querySelector('#stand-btn').onclick = () => {
          soundFx.playClick();
          // Dealer draws to 17.
          const drawInterval = setInterval(() => {
            if (getHandTotal(dealerHand) < 17) {
              dealerHand.push(drawCard());
              render();
            } else {
              clearInterval(drawInterval);
              settle();
            }
          }, 500);
        };
      }
    }

    function settle() {
      const pt = getHandTotal(playerHand);
      const dt = getHandTotal(dealerHand);

      if (dt > 21 || pt > dt) {
        soundFx.playWin();
        bankroll += bet * 2;
        message = '🎉 WINNER! Beat dealer hand!';
      } else if (pt === dt) {
        bankroll += bet;
        message = '🤝 PUSH! Equal totals.';
      } else {
        soundFx.playHit();
        message = 'Dealer wins this round.';
      }

      gameState = 'ended';
      notePeak();
      render();
      setTimeout(() => {
        if (bankroll <= 0) {
          showResult({
            container,
            title: 'BANKROLL DEPLETED',
            message: 'House resets you to $1000.',
            onClose
          });
          bankroll = 1000;
        } else {
          gameState = 'betting';
          message = 'PLACE YOUR BET TO DEAL CARDS';
          render();
        }
      }, 2000);
    }

    render();
  }
}