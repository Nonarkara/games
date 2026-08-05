/**
 * OmniArcade - Main Application Coordinator & Router (Axiom Core Edition)
 */
import { soundFx } from './audio.js';
import { StorageService } from './storage.js';

import { renderCyberTetris, renderCyberPacman, renderRomLoader } from './games/classicArcade.js';
import { renderMathSafari, renderMemoryMatch, renderWordSearch } from './games/kidsEdu.js';
import { renderRetroSnake, renderSpaceDefender } from './games/retroArcade.js';
import { renderFlappyBird, renderMinesweeper } from './games/casualArcade.js';
import { renderTriviaMaster, renderBlackjack } from './games/adultMind.js';
import { renderAIGameStudio } from './games/aiGameStudio.js';
import { renderPatternBreaker, renderReflexMatrix, renderTypeRush, renderSlide2048 } from './games/curatedGames.js';
import { bindModalUX } from './ui.js';

const gamesCatalog = [
  {
    id: 'cyber-tetris',
    title: 'Cyber Tetris 1984',
    category: 'classics',
    badge: '🕹️ CLASSIC LEGEND',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🧱',
    age: 'All Ages',
    desc: 'Original falling tetromino block puzzle. Rotate pieces, clear lines, and build high combo multipliers.',
    tags: ['Tetris', 'Classic', 'Puzzle'],
    renderer: renderCyberTetris
  },
  {
    id: 'cyber-pacman',
    title: 'Cyber Pac-Man 1980',
    category: 'classics',
    badge: '🕹️ CLASSIC LEGEND',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🟡',
    age: 'All Ages',
    desc: 'Classic arcade maze navigation! Eat dots, power pellets, and outsmart Blinky, Pinky, Inky & Clyde AI.',
    tags: ['Pac-Man', 'Arcade', 'Ghost AI'],
    renderer: renderCyberPacman
  },
  {
    id: 'rom-loader',
    title: 'Retro ROM / SWF Loader',
    category: 'classics',
    badge: '💾 FILE INSPECTOR',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '💾',
    age: 'All Ages',
    desc: "Local game-file inspector. Drop a legal .nes, .gb, .sfc, or .swf backup to preview its header metadata.",
    tags: ['File Inspector', 'ROM Info', 'Local'],
    renderer: renderRomLoader
  },
  {
    id: 'ai-sandbox',
    title: 'AI Game Builder Studio',
    category: 'ai-studio',
    badge: '🤖 AI GENERATOR',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🤖',
    age: 'All Ages',
    desc: 'Inspired by Tesana.ai — Type prompts or pick presets to build custom playable games live!',
    tags: ['AI Prompt', 'Custom Physics', 'Sandbox'],
    renderer: renderAIGameStudio
  },
  {
    id: 'cyber-snake',
    title: 'Retro Cyber Snake',
    category: 'retro-vault',
    badge: '🕹️ RETRO VAULT',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🐍',
    age: 'All Ages',
    desc: "Classic 8-bit arcade grid snake with speed boosts and glowing food.",
    tags: ['Retro', 'Arcade', 'Classic'],
    renderer: renderRetroSnake
  },
  {
    id: 'space-defender',
    title: 'Space Defender',
    category: 'retro-vault',
    badge: '🕹️ RETRO VAULT',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '👾',
    age: 'All Ages',
    desc: 'Classic space shooter! Control your laser turret to defend against alien invader waves.',
    tags: ['Shooter', 'Invaders', 'Space'],
    renderer: renderSpaceDefender
  },
  {
    id: 'math-safari',
    title: 'Math Safari Rush',
    category: 'kids-edu',
    badge: '👶 KIDS & EDU',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🧮',
    age: 'Age 6+',
    desc: 'Inspired by Educaplay — Solve arithmetic equations to leap over obstacles!',
    tags: ['Math', 'Speed Quiz', 'Educational'],
    renderer: renderMathSafari
  },
  {
    id: 'memory-match',
    title: 'Memory Match Mania',
    category: 'kids-edu',
    badge: '👶 KIDS & EDU',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🧠',
    age: 'Age 5+',
    desc: 'Flip cards and match animal pairs with streak bonuses & moves counter.',
    tags: ['Memory', 'Animals', 'Puzzle'],
    renderer: renderMemoryMatch
  },
  {
    id: 'word-search',
    title: 'Word Search Quest',
    category: 'kids-edu',
    badge: '👶 KIDS & EDU',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🔤',
    age: 'Age 7+',
    desc: 'Search for hidden vocabulary words in an interactive letter grid.',
    tags: ['Words', 'Vocabulary', 'Learning'],
    renderer: renderWordSearch
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Cyber Bird',
    category: 'casual-friv',
    badge: '⚡ CASUAL FRIV',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🐦',
    age: 'All Ages',
    desc: 'Inspired by Friv — Precision tap-to-fly arcade action through glowing pipes.',
    tags: ['Casual', 'Timing', 'Addictive'],
    renderer: renderFlappyBird
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper Pro',
    category: 'casual-friv',
    badge: '⚡ CASUAL FRIV',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '💣',
    age: 'Age 10+',
    desc: 'Classic logic puzzle game. Flag mines and uncover safe grid numbers.',
    tags: ['Logic', 'Strategy', 'Grid'],
    renderer: renderMinesweeper
  },
  {
    id: 'trivia-master',
    title: 'Ultimate Trivia Master',
    category: 'adult-mind',
    badge: '🧠 MIND & ADULT',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '❓',
    age: 'Teen & Adult',
    desc: 'Deep trivia challenge covering History, Sci-Fi, Science, and Gaming culture.',
    tags: ['Trivia', 'Quiz', 'Knowledge'],
    renderer: renderTriviaMaster
  },
  {
    id: 'pattern-breaker',
    title: 'Pattern Breaker',
    category: 'adult-mind',
    badge: '🧠 MIND & ADULT',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🔐',
    age: 'Teen & Adult',
    desc: 'Deductive logic puzzle. Crack a hidden 4-node path on a 3x3 grid using Mastermind-style hints.',
    tags: ['Logic', 'Deduction', 'Memory'],
    renderer: renderPatternBreaker
  },
  {
    id: 'type-rush',
    title: 'Type Rush',
    category: 'skills',
    badge: '🎓 LEARN SKILL',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '⌨️',
    age: 'Age 8+',
    desc: '30-second typing fluency trainer. Build keyboard muscle memory with live WPM and accuracy scoring.',
    tags: ['Typing', 'Keyboard', 'Fluency'],
    renderer: renderTypeRush
  },
  {
    id: 'reflex-matrix',
    title: 'Reflex Matrix',
    category: 'casual-friv',
    badge: '⚡ CASUAL FRIV',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '⚡',
    age: 'All Ages',
    desc: 'Hand-eye coordination trainer. Tap glowing cells before they fade — speed escalates each wave.',
    tags: ['Reflex', 'Coordination', 'Reaction'],
    renderer: renderReflexMatrix
  },
  {
    id: 'slide-2048',
    title: 'Slide 2048',
    category: 'casual-friv',
    badge: '⚡ CASUAL FRIV',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🔢',
    age: 'All Ages',
    desc: 'Classic sliding-tile strategy. Merge matching numbers and plan ahead to reach the 2048 tile.',
    tags: ['Strategy', 'Merge', 'Planning'],
    renderer: renderSlide2048
  },
  {
    id: 'cyber-blackjack',
    title: 'Cyber Blackjack 21',
    category: 'adult-mind',
    badge: '🧠 MIND & ADULT',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🃏',
    age: 'Adult 18+',
    desc: 'Casino card game against AI dealer. Manage bankroll chips, hit, and stand.',
    tags: ['Cards', 'Casino', 'Strategy'],
    renderer: renderBlackjack
  }
];

class OmniArcadeApp {
  constructor() {
    this.activeCategory = 'all';
    this.searchQuery = '';
    this._releaseModalUX = null;
    this.initUI();
  }

  initUI() {
    this.renderHeader();
    this.renderCategoryBar();
    this.renderGameGrid();
    this.bindEvents();
  }

  renderHeader() {
    const stats = StorageService.getData();
    const headerEl = document.querySelector('#app-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 font-mono-hud">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-black border-2 border-amber-500 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            🎮
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-3xl font-black tracking-wider text-amber-400">
                OMNI_ARCADE
              </h1>
              <span class="text-[10px] px-2 py-0.5 bg-amber-950 border border-amber-500 text-amber-300">v2.0_AXIOM</span>
            </div>
            <p class="text-[10px] text-amber-500/80 font-mono tracking-widest uppercase">
              SATELLITE INTELLIGENCE GAMING PROTOCOL [EVENT_ID: OMNI_2026]
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <input id="search-input" type="text" placeholder="QUERY GAMES..." value="${this.searchQuery}" class="bg-black border border-amber-500/50 px-4 py-2 text-xs pl-8 text-amber-200 focus:outline-none focus:border-amber-400 w-44 md:w-56" />
            <span class="absolute left-2.5 top-2 text-amber-500 text-xs">🔍</span>
          </div>

          <button id="sound-toggle-btn" class="px-3 py-2 bg-zinc-950 border border-amber-500/50 text-amber-300 hover:bg-amber-900 text-xs transition">
            🔊 SOUND FX
          </button>

          <div class="bg-black border border-amber-500/50 px-3 py-2 text-xs">
            <span class="text-amber-500/80">PLAYED:</span>
            <span class="text-amber-400 font-bold ml-1">${stats.gamesPlayed || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoryBar() {
    const navEl = document.querySelector('#category-bar');
    if (!navEl) return;

    const baseCats = [
      { id: 'all', label: '🚀 ALL GAMES' },
      { id: 'classics', label: '🕹️ CLASSICS' },
      { id: 'ai-studio', label: '🤖 AI BUILDER' },
      { id: 'skills', label: '🎓 LEARN SKILLS' },
      { id: 'kids-edu', label: '👶 KIDS & EDU' },
      { id: 'retro-vault', label: '🐍 RETRO VAULT' },
      { id: 'casual-friv', label: '⚡ CASUAL FRIV' },
      { id: 'adult-mind', label: '🧠 MIND & ADULT' }
    ];
    const categories = baseCats.map(c => ({
      ...c,
      count: c.id === 'all' ? gamesCatalog.length : gamesCatalog.filter(g => g.category === c.id).length
    }));

    navEl.innerHTML = `
      <div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-2 font-mono-hud">
        ${categories.map(cat => `
          <button class="cat-pill-btn px-4 py-2 font-bold text-xs whitespace-nowrap transition flex items-center gap-2 ${this.activeCategory === cat.id ? 'bg-amber-500 text-black border border-amber-400 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-black text-amber-400 border border-amber-500/40 hover:bg-amber-950'}" data-cat="${cat.id}">
            <span>${cat.label}</span>
            <span class="text-[9px] px-1.5 py-0.5 ${this.activeCategory === cat.id ? 'bg-black text-amber-400' : 'bg-zinc-900 text-amber-500'}">${cat.count}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  renderGameGrid() {
    const gridEl = document.querySelector('#game-grid');
    if (!gridEl) return;

    const filtered = gamesCatalog.filter(g => {
      const matchCat = this.activeCategory === 'all' || g.category === this.activeCategory;
      const q = this.searchQuery.toLowerCase();
      const matchSearch = g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full py-16 text-center text-amber-500/60 font-mono-hud">
          <div class="text-4xl mb-2">🔍</div>
          <p class="text-sm font-bold">QUERY RETURNED ZERO MATCHES IN CATALOG.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(game => {
      const high = StorageService.getHighScore(game.id);
      return `
        <div class="axiom-card p-5 flex flex-col justify-between group cursor-pointer font-mono-hud" data-game="${game.id}" tabindex="0" role="button" aria-label="Launch ${game.title}">
          <div>
            <div class="flex justify-between items-start mb-3">
              <span class="text-3xl text-amber-400">${game.icon}</span>
              <span class="text-[9px] font-bold px-2 py-0.5 border ${game.badgeBg}">
                ${game.badge}
              </span>
            </div>

            <h3 class="text-lg font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
              ${game.title}
            </h3>
            <p class="text-xs text-zinc-400 mb-4 line-clamp-2">
              ${game.desc}
            </p>
          </div>

          <div>
            <div class="flex flex-wrap gap-1 mb-4">
              ${game.tags.map(t => `<span class="text-[9px] bg-zinc-950 text-amber-500/80 px-2 py-0.5 border border-amber-500/30">#${t}</span>`).join('')}
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-amber-500/30 text-xs">
              <span class="text-zinc-500">HIGH: <strong class="text-amber-400">${high}</strong></span>
              <button class="play-btn px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-black text-xs uppercase tracking-wider transition">
                ▶ LAUNCH
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('.axiom-card').forEach(card => {
      const launch = () => this.launchGame(card.dataset.game);
      card.onclick = launch;
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); } };
    });
  }

  launchGame(gameId) {
    soundFx.playClick();
    soundFx.init();
    const game = gamesCatalog.find(g => g.id === gameId);
    if (!game) return;

    const overlay = document.querySelector('#game-modal-overlay');
    const container = document.querySelector('#game-modal-container');
    if (!overlay || !container) return;

    if (this._releaseModalUX) { this._releaseModalUX(); this._releaseModalUX = null; }

    overlay.classList.remove('hidden');
    container.innerHTML = '';

    const closeGame = () => {
      overlay.classList.add('hidden');
      container.innerHTML = '';
      if (this._releaseModalUX) { this._releaseModalUX(); this._releaseModalUX = null; }
      this.renderHeader();
      this.renderGameGrid();
    };

    // Backdrop click + ESC to close (Rams: unobtrusive, obvious when needed).
    this._releaseModalUX = bindModalUX(overlay, closeGame);

    game.renderer(container, closeGame);
  }

  bindEvents() {
    document.addEventListener('input', (e) => {
      if (e.target.id === 'search-input') {
        this.searchQuery = e.target.value;
        this.renderGameGrid();
      }
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pill-btn');
      if (btn) {
        soundFx.playClick();
        this.activeCategory = btn.dataset.cat;
        this.renderCategoryBar();
        this.renderGameGrid();
      }

      if (e.target.id === 'sound-toggle-btn') {
        soundFx.init();
        const muted = soundFx.toggleMute();
        e.target.innerText = muted ? '🔇 MUTED' : '🔊 SOUND FX';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OmniArcadeApp();
});