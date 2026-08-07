/**
 * OmniArcade - Main Application Coordinator & Router (Axiom Core Edition)
 */
import { soundFx } from './audio.js';
import { StorageService } from './storage.js';
import { AnalyticsService } from './analytics.js';

import { renderCyberTetris, renderCyberPacman, renderRomLoader } from './games/classicArcade.js';
import { renderMathSafari, renderMemoryMatch, renderWordSearch } from './games/kidsEdu.js';
import { renderRetroSnake, renderSpaceDefender } from './games/retroArcade.js';
import { renderFlappyBird, renderMinesweeper } from './games/casualArcade.js';
import { renderTriviaMaster, renderBlackjack } from './games/adultMind.js';
import { renderAIGameStudio } from './games/aiGameStudio.js';
import { renderPatternBreaker, renderReflexMatrix, renderTypeRush, renderSlide2048 } from './games/curatedGames.js';
import { renderStroop, renderSimon, renderAnagram, renderPeriodicQuest, renderCapitalQuiz, renderNumberChain, renderTowerHanoi, renderWordBuilder } from './games/eduGames.js';
import { renderNonTrivial } from './games/labsGames.js';
import { renderBlowIntoTheCartridge } from './games/nineties.js';
import { bindModalUX, GameSession } from './ui.js';

const gamesCatalog = [
  {
    id: 'cyber-tetris',
    title: 'Cyber Tetris 1984',
    category: 'classics',
    badge: '🕹️ CLASSIC LEGEND',
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
    icon: '🃏',
    age: 'Adult 18+',
    desc: 'Casino card game against AI dealer. Manage bankroll chips, hit, and stand.',
    tags: ['Cards', 'Casino', 'Strategy'],
    renderer: renderBlackjack
  },
  { id: 'stroop-match', title: 'Stroop Color Match', category: 'memory-focus', badge: '🧠 FOCUS', icon: '🎨', age: 'Age 8+', desc: 'Cognitive inhibition trainer. Pick the ink color — not the word. Builds executive function.', tags: ['Stroop', 'Focus', 'Inhibition'], renderer: renderStroop },
  { id: 'simon-seq', title: 'Simon Sequence', category: 'memory-focus', badge: '🧠 FOCUS', icon: '🔵', age: 'All Ages', desc: 'Auditory working-memory trainer. Watch the glowing pattern grow, then repeat it back.', tags: ['Memory', 'Sequence', 'Recall'], renderer: renderSimon },
  { id: 'anagram-scramble', title: 'Anagram Scramble', category: 'language', badge: '📖 LANGUAGE', icon: '🔤', age: 'Age 10+', desc: 'Spelling & vocabulary builder. Unscramble jumbled letters into real words under pressure.', tags: ['Spelling', 'Vocabulary', 'Anagram'], renderer: renderAnagram },
  { id: 'word-builder', title: 'Word Builder', category: 'language', badge: '📖 LANGUAGE', icon: '🅰️', age: 'Age 7+', desc: 'Phonics & spelling sprint. Build as many valid words as you can from 7 letter tiles in 60 seconds.', tags: ['Phonics', 'Spelling', 'Timed'], renderer: renderWordBuilder },
  { id: 'periodic-quest', title: 'Periodic Quest', category: 'science', badge: '🔬 SCIENCE', icon: '⚗️', age: 'Age 12+', desc: 'Chemistry recall trainer. Match element symbols to their names across 10 rounds.', tags: ['Chemistry', 'Elements', 'Recall'], renderer: renderPeriodicQuest },
  { id: 'capital-quiz', title: 'Capital Quest', category: 'science', badge: '🔬 SCIENCE', icon: '🌍', age: 'Age 8+', desc: 'World geography trainer. Learn the capitals of 15 major countries across 10 rounds.', tags: ['Geography', 'Capitals', 'Recall'], renderer: renderCapitalQuiz },
  { id: 'number-chain', title: 'Number Chain', category: 'math-logic', badge: '🎯 MATH', icon: '🔗', age: 'Age 10+', desc: 'Numerical reasoning trainer. Identify the pattern and predict the next number in the sequence.', tags: ['Patterns', 'Reasoning', 'Algebra'], renderer: renderNumberChain },
  { id: 'tower-hanoi', title: 'Tower of Hanoi', category: 'math-logic', badge: '🎯 MATH', icon: '🗼', age: 'Age 8+', desc: 'Classic recursive-planning puzzle. Move all disks to peg 3 in the fewest moves possible.', tags: ['Logic', 'Planning', 'Recursive'], renderer: renderTowerHanoi },
  { id: 'non-trivial', title: 'Non-Trivial', category: 'labs', badge: '🧪 LABS', icon: '🧠', age: 'Friends only', desc: 'Personal trivia portal. Five packs hand-curated from 100 days of writing — books, bikes, Shanghai, philosophers, sound. Play with friends. Add your own packs in js/games/labsGames.js.', tags: ['Trivia', 'Personal', 'Multi-pack', 'Friends'], renderer: renderNonTrivial },
  { id: 'blow-cartridge', title: 'Blow Into The Cartridge', category: 'labs', badge: '🧪 LABS', icon: '🕹', age: 'Party', desc: 'Host-mode 90s/00s trivia for a room. 240 questions across six decks — artifacts, screen, sound, pixels, dial-up, playground. One screen, everyone shouts, score on paper. Nothing repeats until the deck runs dry.', tags: ['Trivia', 'Party', '90s', 'Host mode'], renderer: renderBlowIntoTheCartridge }
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
    this.renderRecommended();
    this.renderCategoryBar();
    this.renderGameGrid();
    this.bindEvents();
  }

  renderRecommended() {
    const el = document.querySelector('#recommended-strip');
    if (!el) return;

    // First-time visitors: a single welcome row, no recommendations yet.
    if (!AnalyticsService.hasHistory()) {
      el.innerHTML = `
        <div class="omni-recommended">
          <div class="omni-recommended-head">
            <span class="omni-recommended-eyebrow">✨ WELCOME</span>
            <h3 class="omni-recommended-title">Pick a game. We'll suggest what to play next based on what you skip.</h3>
          </div>
        </div>`;
      return;
    }

    const recs = AnalyticsService.getRecommendations(gamesCatalog, 3);
    if (recs.length === 0) { el.innerHTML = ''; return; }

    const weakest = AnalyticsService.getWeakestSkill();
    el.innerHTML = `
      <div class="omni-recommended">
        <div class="omni-recommended-head">
          <span class="omni-recommended-eyebrow">🎯 RECOMMENDED FOR YOU</span>
          <h3 class="omni-recommended-title">Build up your <em>${weakest}</em> skills</h3>
        </div>
        <div class="omni-recommended-grid">
          ${recs.map(g => `
            <button class="omni-rec-card" data-game="${g.id}" data-cat="${g.category}" aria-label="Play ${g.title}">
              <span class="omni-rec-icon">${g.icon}</span>
              <span class="omni-rec-title">${g.title}</span>
              <span class="omni-rec-meta">${g.age} · ${g.tags.slice(0,2).join(' · ')}</span>
            </button>
          `).join('')}
        </div>
      </div>`;

    el.querySelectorAll('.omni-rec-card').forEach(btn => {
      btn.onclick = () => this.launchGame(btn.dataset.game);
    });
  }

  renderHeader() {
    const stats = StorageService.getData();
    const headerEl = document.querySelector('#app-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="omni-logo">🎮</div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="omni-brand">OmniArcade</h1>
              <span class="omni-version">LEARN EDITION</span>
            </div>
            <p class="omni-tagline">25 educational & brain games · Math · Language · Memory · Science</p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap justify-center">
          <div class="omni-search-wrap">
            <span class="omni-search-icon" aria-hidden="true">🔍</span>
            <input id="search-input" type="text" placeholder="Search games…" value="${this.searchQuery}" class="omni-search" aria-label="Search games" />
          </div>

          <button id="sound-toggle-btn" class="omni-pill" aria-label="Toggle sound effects">
            🔊 SOUND
          </button>

          <div class="omni-stat">
            <span class="omni-stat-label">PLAYED</span>
            <span class="omni-stat-value">${stats.gamesPlayed || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoryBar() {
    const navEl = document.querySelector('#category-bar');
    if (!navEl) return;

    const baseCats = [
      { id: 'all', label: '🚀 All Games' },
      { id: 'labs', label: '🧪 Labs' },
      { id: 'math-logic', label: '🎯 Math & Logic' },
      { id: 'language', label: '📖 Language' },
      { id: 'memory-focus', label: '🧠 Memory & Focus' },
      { id: 'science', label: '🔬 Science' },
      { id: 'skills', label: '🎓 Skills' },
      { id: 'kids-edu', label: '👶 Kids & Edu' },
      { id: 'casual-friv', label: '⚡ Arcade' },
      { id: 'classics', label: '🕹️ Classics' },
      { id: 'retro-vault', label: '🐍 Retro Vault' },
      { id: 'adult-mind', label: '🧠 Mind Games' },
      { id: 'ai-studio', label: '🤖 AI Builder' }
    ];
    const categories = baseCats.map(c => ({
      ...c,
      count: c.id === 'all' ? gamesCatalog.length : gamesCatalog.filter(g => g.category === c.id).length
    }));

    navEl.innerHTML = `
      <div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-2 omni-cat-bar">
        ${categories.map(cat => `
          <button class="omni-cat ${this.activeCategory === cat.id ? 'is-active' : ''}" data-cat="${cat.id}" aria-pressed="${this.activeCategory === cat.id}">
            <span>${cat.label}</span>
            <span class="omni-cat-count">${cat.count}</span>
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
        <div class="col-span-full omni-empty">
          <div class="omni-empty-icon">🔍</div>
          <p class="omni-empty-title">No games match your search.</p>
          <p class="omni-empty-hint">Try a different keyword or pick another category.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(game => {
      const high = StorageService.getHighScore(game.id);
      return `
        <div class="axiom-card omni-card" data-game="${game.id}" data-cat="${game.category}" tabindex="0" role="button" aria-label="Launch ${game.title}">
          <div class="omni-card-head">
            <span class="omni-card-icon">${game.icon}</span>
            <span class="omni-card-badge">${game.badge}</span>
          </div>
          <h3 class="omni-card-title">${game.title}</h3>
          <p class="omni-card-desc">${game.desc}</p>
          <div class="omni-card-tags">
            ${game.tags.map(t => `<span class="omni-card-tag">#${t}</span>`).join('')}
          </div>
          <div class="omni-card-foot">
            <span class="omni-card-high">HIGH <strong>${high}</strong></span>
            <button class="omni-card-launch" type="button">▶ LAUNCH</button>
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

    // GameSession traps every timer/listener/raf the game creates so we can
    // kill them all on close — fixes stray-loop bugs across all 25 games.
    const session = new GameSession();
    const startedAt = Date.now();
    let sessionScore = 0;

    const closeGame = () => {
      const durationMs = Date.now() - startedAt;
      // Log to local analytics. Backend-ready contract (see analytics.js).
      try { AnalyticsService.log(game.id, game.category, sessionScore, durationMs); } catch (e) { /* storage full etc. */ }
      session.teardown();
      overlay.classList.add('hidden');
      container.innerHTML = '';
      if (this._releaseModalUX) { this._releaseModalUX(); this._releaseModalUX = null; }
      this.renderRecommended();
      this.renderHeader();
      this.renderGameGrid();
    };

    this._releaseModalUX = bindModalUX(overlay, closeGame);

    // Inject a score-setter hook so each game's showResult can record final score.
    container._recordScore = (s) => { sessionScore = Math.max(sessionScore, s | 0); };
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
        e.target.innerText = muted ? '🔇 MUTED' : '🔊 SOUND';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OmniArcadeApp();
});