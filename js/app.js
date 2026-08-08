/**
 * OmniArcade — Main coordinator
 * Floor plan: four wings (TRAIN / ARCADE / LEARN / LABS) + dense bay rows.
 * Category filter bug fixed: clicks bind to .omni-wing / .omni-bay-row.
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
import {
  renderDualNBack, renderSchulteTable, renderAimTrainer,
  renderGoNoGo, renderDigitSpan, renderMentalMath, renderVisualSearch
} from './games/trainerGames.js';
import { renderAbout } from './games/about.js';
import { bindModalUX, GameSession } from './ui.js';

const WINGS = [
  { id: 'all', label: 'ALL', blurb: 'Full floor' },
  { id: 'train', label: 'TRAIN', blurb: 'Research tasks' },
  { id: 'arcade', label: 'ARCADE', blurb: 'Play dens' },
  { id: 'learn', label: 'LEARN', blurb: 'Skill drills' },
  { id: 'labs', label: 'LABS', blurb: 'Personal packs' }
];

const WING_META = {
  train: { title: 'TRAIN', sub: 'Lab tasks with a paper trail. Gains stay closest to what you practice.' },
  arcade: { title: 'ARCADE', sub: 'Classics, shooters, casinos, and the AI sandbox. Scoreboards count.' },
  learn: { title: 'LEARN', sub: 'Math, language, science, and kids drills — fluency under a clock.' },
  labs: { title: 'LABS', sub: 'Hand-curated rooms. Friends, parties, private packs.' },
  meta: { title: 'SIGNAL', sub: 'Why this floor exists.' }
};

/** @type {Array<{id:string,code:string,title:string,wing:string,category:string,domain:string,desc:string,age:string,paper?:string,tags:string[],renderer:Function}>} */
const gamesCatalog = [
  // ── TRAIN ──────────────────────────────────────────────────────────────
  { id: 'dual-n-back', code: 'NBK', title: 'Dual N-Back', wing: 'train', category: 'memory-focus', domain: 'Working memory', age: 'Teen+', desc: 'Position + letter 2-back. The Jaeggi working-memory task.', paper: 'Jaeggi 2008', tags: ['N-back', 'Research'], renderer: renderDualNBack },
  { id: 'digit-span', code: 'DSP', title: 'Digit Span', wing: 'train', category: 'memory-focus', domain: 'Capacity', age: 'Teen+', desc: 'Watch digits, type them back. Span grows until it breaks.', paper: 'Miller 1956', tags: ['Capacity', 'Recall'], renderer: renderDigitSpan },
  { id: 'stroop-match', code: 'STR', title: 'Stroop Match', wing: 'train', category: 'memory-focus', domain: 'Inhibition', age: '8+', desc: 'Name the ink, ignore the word. Lab-standard interference since 1935.', paper: 'Stroop 1935', tags: ['Inhibition', 'Focus'], renderer: renderStroop },
  { id: 'go-nogo', code: 'GNG', title: 'Go / No-Go', wing: 'train', category: 'memory-focus', domain: 'Inhibition', age: 'Teen+', desc: 'Press on GO. Withhold on NO-GO. False starts cost more than slow hits.', paper: 'Verbruggen 2008', tags: ['Inhibition', 'Impulse'], renderer: renderGoNoGo },
  { id: 'simon-seq', code: 'SIM', title: 'Simon Sequence', wing: 'train', category: 'memory-focus', domain: 'Sequence memory', age: 'All', desc: 'Watch the pattern grow, then play it back.', tags: ['Memory', 'Sequence'], renderer: renderSimon },
  { id: 'schulte-table', code: 'SCH', title: 'Schulte Table', wing: 'train', category: 'memory-focus', domain: 'Attention field', age: 'Teen+', desc: 'Tap 1→25. Eyes on center; peripheral vision does the finding.', tags: ['Attention', 'Peripheral'], renderer: renderSchulteTable },
  { id: 'visual-search', code: 'VSR', title: 'Visual Search', wing: 'train', category: 'memory-focus', domain: 'Selective attention', age: 'Teen+', desc: 'Find the odd rotated letter in growing clutter.', paper: 'Green 2003', tags: ['Attention', 'Search'], renderer: renderVisualSearch },
  { id: 'aim-trainer', code: 'AIM', title: 'Aim Trainer', wing: 'train', category: 'skills', domain: 'Hand-eye', age: 'All', desc: 'Thirty seconds of targets. Average reaction time stays on the board.', paper: 'Dye 2009', tags: ['Reaction', 'Precision'], renderer: renderAimTrainer },
  { id: 'mental-math', code: 'MMX', title: 'Mental Math', wing: 'train', category: 'math-logic', domain: 'Fluency', age: '10+', desc: '45-second arithmetic sprint. Speed under accuracy pressure.', tags: ['Arithmetic', 'Speed'], renderer: renderMentalMath },
  { id: 'type-rush', code: 'TYP', title: 'Type Rush', wing: 'train', category: 'skills', domain: 'Keyboard fluency', age: '8+', desc: '30-second typing drill with live WPM and accuracy.', tags: ['Typing', 'WPM'], renderer: renderTypeRush },
  { id: 'reflex-matrix', code: 'RFX', title: 'Reflex Matrix', wing: 'train', category: 'casual-friv', domain: 'Coordination', age: 'All', desc: 'Tap glowing cells before they fade. Speed escalates each wave.', tags: ['Reflex', 'Coordination'], renderer: renderReflexMatrix },

  // ── ARCADE ─────────────────────────────────────────────────────────────
  { id: 'cyber-tetris', code: 'TET', title: 'Cyber Tetris 1984', wing: 'arcade', category: 'classics', domain: 'Spatial', age: 'All', desc: 'Falling tetrominoes, line clears, combo multipliers.', tags: ['Classic', 'Puzzle'], renderer: renderCyberTetris },
  { id: 'cyber-pacman', code: 'PAC', title: 'Cyber Pac-Man 1980', wing: 'arcade', category: 'classics', domain: 'Maze', age: 'All', desc: 'Dots, power pellets, four ghost AIs.', tags: ['Classic', 'Arcade'], renderer: renderCyberPacman },
  { id: 'cyber-snake', code: 'SNK', title: 'Retro Cyber Snake', wing: 'arcade', category: 'retro-vault', domain: 'Grid', age: 'All', desc: 'Grow, turn, do not bite your own tail.', tags: ['Retro', 'Classic'], renderer: renderRetroSnake },
  { id: 'space-defender', code: 'INV', title: 'Space Defender', wing: 'arcade', category: 'retro-vault', domain: 'Shooter', age: 'All', desc: 'Laser turret vs invader waves.', tags: ['Shooter', 'Space'], renderer: renderSpaceDefender },
  { id: 'flappy-bird', code: 'FLP', title: 'Flappy Cyber Bird', wing: 'arcade', category: 'casual-friv', domain: 'Timing', age: 'All', desc: 'Tap-to-fly through pipes. Precision over panic.', tags: ['Casual', 'Timing'], renderer: renderFlappyBird },
  { id: 'minesweeper', code: 'MNE', title: 'Minesweeper Pro', wing: 'arcade', category: 'casual-friv', domain: 'Logic', age: '10+', desc: 'Flag mines, read the numbers, clear the grid.', tags: ['Logic', 'Grid'], renderer: renderMinesweeper },
  { id: 'slide-2048', code: '204', title: 'Slide 2048', wing: 'arcade', category: 'casual-friv', domain: 'Planning', age: 'All', desc: 'Merge matching tiles. Reach 2048 without boxing yourself in.', tags: ['Strategy', 'Merge'], renderer: renderSlide2048 },
  { id: 'cyber-blackjack', code: 'BJ21', title: 'Cyber Blackjack 21', wing: 'arcade', category: 'adult-mind', domain: 'Cards', age: '18+', desc: 'Hit, stand, manage the bankroll against the dealer.', tags: ['Cards', 'Casino'], renderer: renderBlackjack },
  { id: 'trivia-master', code: 'TRV', title: 'Trivia Master', wing: 'arcade', category: 'adult-mind', domain: 'Knowledge', age: 'Teen+', desc: 'History, sci-fi, science, gaming culture.', tags: ['Trivia', 'Quiz'], renderer: renderTriviaMaster },
  { id: 'pattern-breaker', code: 'PTN', title: 'Pattern Breaker', wing: 'arcade', category: 'adult-mind', domain: 'Deduction', age: 'Teen+', desc: 'Crack a hidden 4-node path with Mastermind-style hints.', tags: ['Logic', 'Deduction'], renderer: renderPatternBreaker },
  { id: 'rom-loader', code: 'ROM', title: 'ROM / SWF Inspector', wing: 'arcade', category: 'classics', domain: 'Files', age: 'All', desc: 'Drop a legal .nes / .gb / .sfc / .swf backup — header metadata only.', tags: ['Local', 'Inspector'], renderer: renderRomLoader },
  { id: 'ai-sandbox', code: 'AIG', title: 'AI Game Builder', wing: 'arcade', category: 'ai-studio', domain: 'Sandbox', age: 'All', desc: 'Prompt or pick a preset; get a playable micro-game live.', tags: ['AI', 'Sandbox'], renderer: renderAIGameStudio },

  // ── LEARN ──────────────────────────────────────────────────────────────
  { id: 'number-chain', code: 'NCH', title: 'Number Chain', wing: 'learn', category: 'math-logic', domain: 'Patterns', age: '10+', desc: 'Spot the rule, predict the next number.', tags: ['Patterns', 'Reasoning'], renderer: renderNumberChain },
  { id: 'tower-hanoi', code: 'HNI', title: 'Tower of Hanoi', wing: 'learn', category: 'math-logic', domain: 'Planning', age: '8+', desc: 'Move every disk to peg 3 in the fewest moves.', tags: ['Logic', 'Recursive'], renderer: renderTowerHanoi },
  { id: 'anagram-scramble', code: 'ANA', title: 'Anagram Scramble', wing: 'learn', category: 'language', domain: 'Spelling', age: '10+', desc: 'Unscramble letters into real words under pressure.', tags: ['Spelling', 'Vocabulary'], renderer: renderAnagram },
  { id: 'word-builder', code: 'WRD', title: 'Word Builder', wing: 'learn', category: 'language', domain: 'Phonics', age: '7+', desc: 'Build valid words from 7 tiles in 60 seconds.', tags: ['Phonics', 'Timed'], renderer: renderWordBuilder },
  { id: 'periodic-quest', code: 'ELM', title: 'Periodic Quest', wing: 'learn', category: 'science', domain: 'Chemistry', age: '12+', desc: 'Match element symbols to names across 10 rounds.', tags: ['Chemistry', 'Recall'], renderer: renderPeriodicQuest },
  { id: 'capital-quiz', code: 'CAP', title: 'Capital Quest', wing: 'learn', category: 'science', domain: 'Geography', age: '8+', desc: 'Capitals of major countries, ten rounds.', tags: ['Geography', 'Capitals'], renderer: renderCapitalQuiz },
  { id: 'math-safari', code: 'MSF', title: 'Math Safari Rush', wing: 'learn', category: 'kids-edu', domain: 'Arithmetic', age: '6+', desc: 'Solve equations to clear the path.', tags: ['Math', 'Kids'], renderer: renderMathSafari },
  { id: 'memory-match', code: 'MEM', title: 'Memory Match', wing: 'learn', category: 'kids-edu', domain: 'Pairs', age: '5+', desc: 'Flip cards, match animal pairs, watch the streak.', tags: ['Memory', 'Kids'], renderer: renderMemoryMatch },
  { id: 'word-search', code: 'WSR', title: 'Word Search Quest', wing: 'learn', category: 'kids-edu', domain: 'Vocabulary', age: '7+', desc: 'Find hidden words in a letter grid.', tags: ['Words', 'Kids'], renderer: renderWordSearch },

  // ── LABS ───────────────────────────────────────────────────────────────
  { id: 'non-trivial', code: 'NTR', title: 'Non-Trivial', wing: 'labs', category: 'labs', domain: 'Personal', age: 'Friends', desc: 'Five packs from 100 days of writing — books, bikes, Shanghai, philosophers, sound.', tags: ['Trivia', 'Friends'], renderer: renderNonTrivial },
  { id: 'blow-cartridge', code: 'BIC', title: 'Blow Into The Cartridge', wing: 'labs', category: 'labs', domain: 'Party host', age: 'Party', desc: '240 questions, six 90s/00s decks. One screen, everyone shouts, score on paper.', tags: ['Party', '90s'], renderer: renderBlowIntoTheCartridge },

  // ── META ───────────────────────────────────────────────────────────────
  { id: 'about-dr-non', code: 'WHY', title: 'Why This Exists', wing: 'meta', category: 'about', domain: 'Signal', age: 'Everyone', desc: 'Dr Non, a lifetime of games, and the case against killing time.', tags: ['Story'], renderer: renderAbout }
];

class OmniArcadeApp {
  constructor() {
    this.activeWing = 'train';
    this.searchQuery = '';
    this.focusId = 'dual-n-back';
    this._releaseModalUX = null;
    this.initUI();
  }

  initUI() {
    this.renderRailMeta();
    this.renderHeader();
    this.renderWingBar();
    this.renderAttract();
    this.renderGameBay();
    this.bindEvents();
  }

  playableCount() {
    return gamesCatalog.filter(g => g.wing !== 'meta').length;
  }

  featuredGame() {
    const pool = this.filteredGames();
    if (this.focusId) {
      const focused = pool.find(g => g.id === this.focusId);
      if (focused) return focused;
    }
    if (AnalyticsService.hasHistory()) {
      const rec = AnalyticsService.getRecommendations(gamesCatalog, 1)[0];
      if (rec && pool.some(g => g.id === rec.id)) return rec;
    }
    return pool[0] || gamesCatalog.find(g => g.id === 'dual-n-back');
  }

  renderRailMeta() {
    const el = document.querySelector('#cabinet-rail-meta');
    if (!el) return;
    const stats = StorageService.getData();
    el.innerHTML = `
      <button id="sound-toggle-btn" class="cabinet-rail-btn" type="button" aria-label="Toggle sound">SOUND</button>
      <p class="cabinet-rail-played font-mono-hud"><span>${stats.gamesPlayed || 0}</span> played</p>
    `;
  }

  renderHeader() {
    const headerEl = document.querySelector('#app-header');
    if (!headerEl) return;
    headerEl.innerHTML = `
      <label class="cabinet-search">
        <span class="font-mono-hud" aria-hidden="true">/</span>
        <input id="search-input" type="search" placeholder="Find a title" value="${this.searchQuery}" aria-label="Search games" />
      </label>
      <p class="cabinet-top-note font-mono-hud">${this.playableCount()} titles</p>
    `;
  }

  renderAttract() {
    const el = document.querySelector('#omni-hud');
    if (!el) return;
    const feature = this.featuredGame();
    const high = feature ? StorageService.getHighScore(feature.id) : 0;
    const wingLabel = this.activeWing === 'all' ? 'FULL FLOOR' : (WING_META[this.activeWing]?.title || this.activeWing.toUpperCase());

    el.innerHTML = `
      <div class="attract-copy">
        <h1 class="attract-brand">OmniArcade</h1>
        <p class="attract-line">Kill time without killing your mind.</p>
        <p class="attract-sub">
          You were going to spend twenty minutes somewhere.
          Put them on working memory, inhibition, and reaction speed — not the feed.
        </p>
      </div>
      ${feature ? `
        <button type="button" class="attract-feature" data-game="${feature.id}" aria-label="Play ${feature.title}">
          <span class="attract-feature-left">
            <span class="attract-feature-wing font-mono-hud">${wingLabel} · ${feature.code}</span>
            <span class="attract-feature-title">${feature.title}</span>
            <span class="attract-feature-desc">${feature.desc}${feature.paper ? ' · ' + feature.paper : ''} · HI ${high}</span>
          </span>
          <span class="attract-feature-cta">INSERT COIN</span>
        </button>
      ` : ''}
    `;

    const feat = el.querySelector('.attract-feature');
    if (feat) feat.onclick = () => this.launchGame(feat.dataset.game);
  }

  renderWingBar() {
    const navEl = document.querySelector('#category-bar');
    if (!navEl) return;

    const counts = Object.fromEntries(
      WINGS.map(w => [
        w.id,
        w.id === 'all'
          ? gamesCatalog.filter(g => g.wing !== 'meta').length
          : gamesCatalog.filter(g => g.wing === w.id).length
      ])
    );

    navEl.innerHTML = WINGS.map(w => `
      <button type="button" class="cabinet-wing ${this.activeWing === w.id ? 'is-active' : ''}"
        data-wing="${w.id}" aria-pressed="${this.activeWing === w.id}">
        <span class="cabinet-wing-label">${w.label}</span>
        <span class="cabinet-wing-count font-mono-hud">${counts[w.id]}</span>
      </button>
    `).join('');
  }

  filteredGames() {
    const q = this.searchQuery.toLowerCase().trim();
    return gamesCatalog.filter(g => {
      if (g.wing === 'meta' && !q) return false;
      if (this.activeWing !== 'all' && g.wing !== this.activeWing) return false;
      if (!q) return true;
      const hay = `${g.title} ${g.desc} ${g.domain} ${g.code} ${g.tags.join(' ')} ${g.paper || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  renderGameBay() {
    const gridEl = document.querySelector('#game-grid');
    if (!gridEl) return;

    const filtered = this.filteredGames();
    gridEl.className = 'cabinet-select';

    if (filtered.length === 0) {
      gridEl.innerHTML = `<p class="cabinet-empty">Nothing matches. Clear search or pick another wing.</p>`;
      return;
    }

    // Keep focus inside the visible list
    if (!filtered.some(g => g.id === this.focusId)) {
      this.focusId = filtered[0].id;
    }

    const order = ['train', 'arcade', 'learn', 'labs', 'meta'];
    const groups = order
      .map(wing => ({ wing, games: filtered.filter(g => g.wing === wing) }))
      .filter(g => g.games.length > 0);

    const showGroupLabels = this.activeWing === 'all' && groups.length > 1;

    gridEl.innerHTML = groups.map(({ wing, games }) => `
      <div class="select-block" data-wing="${wing}">
        ${showGroupLabels ? `<p class="select-block-label font-mono-hud">${WING_META[wing]?.title || wing}</p>` : ''}
        <ul class="select-list" role="listbox" aria-label="${WING_META[wing]?.title || 'Games'}">
          ${games.map(game => this.selectRow(game)).join('')}
        </ul>
      </div>
    `).join('');

    if (this.activeWing === 'all' && !this.searchQuery.trim()) {
      const about = gamesCatalog.find(g => g.id === 'about-dr-non');
      if (about) {
        gridEl.insertAdjacentHTML('beforeend', `
          <div class="select-block select-block--meta">
            <ul class="select-list">${this.selectRow(about)}</ul>
          </div>`);
      }
    }

    gridEl.querySelectorAll('[data-game]').forEach(row => {
      row.addEventListener('mouseenter', () => {
        this.focusId = row.dataset.game;
        this.paintFocus();
        this.renderAttract();
      });
      row.addEventListener('focus', () => {
        this.focusId = row.dataset.game;
        this.paintFocus();
        this.renderAttract();
      });
      const launch = () => this.launchGame(row.dataset.game);
      row.addEventListener('click', launch);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
      });
    });

    this.paintFocus();
    this.renderAttract();
  }

  selectRow(game) {
    const high = StorageService.getHighScore(game.id);
    const isFocus = game.id === this.focusId;
    return `
      <li class="select-row ${isFocus ? 'is-focus' : ''}" data-game="${game.id}" tabindex="0" role="option" aria-selected="${isFocus}" aria-label="${game.title}">
        <span class="select-code font-mono-hud">${game.code}</span>
        <span class="select-name">${game.title}</span>
        <span class="select-meta font-mono-hud">${game.paper || game.domain}</span>
        <span class="select-hi font-mono-hud">${high}</span>
      </li>`;
  }

  paintFocus() {
    document.querySelectorAll('.select-row').forEach(row => {
      const on = row.dataset.game === this.focusId;
      row.classList.toggle('is-focus', on);
      row.setAttribute('aria-selected', on ? 'true' : 'false');
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

    const session = new GameSession();
    const startedAt = Date.now();
    let sessionScore = 0;

    const closeGame = () => {
      const durationMs = Date.now() - startedAt;
      try { AnalyticsService.log(game.id, game.category, sessionScore, durationMs); } catch (e) { /* ignore */ }
      session.teardown();
      overlay.classList.add('hidden');
      container.innerHTML = '';
      if (this._releaseModalUX) { this._releaseModalUX(); this._releaseModalUX = null; }
      this.renderRailMeta();
      this.renderGameBay();
    };

    this._releaseModalUX = bindModalUX(overlay, closeGame);
    container._recordScore = (s) => { sessionScore = Math.max(sessionScore, s | 0); };
    game.renderer(container, closeGame);
  }

  bindEvents() {
    document.addEventListener('input', (e) => {
      if (e.target.id === 'search-input') {
        this.searchQuery = e.target.value;
        this.renderGameBay();
      }
    });

    document.addEventListener('click', (e) => {
      const wingBtn = e.target.closest('.cabinet-wing');
      if (wingBtn) {
        soundFx.playClick();
        this.activeWing = wingBtn.dataset.wing;
        this.focusId = null;
        this.renderWingBar();
        this.renderGameBay();
        return;
      }

      if (e.target.id === 'sound-toggle-btn' || e.target.closest('#sound-toggle-btn')) {
        const btn = document.querySelector('#sound-toggle-btn');
        soundFx.init();
        const muted = soundFx.toggleMute();
        if (btn) btn.textContent = muted ? 'MUTED' : 'SOUND';
      }
    });
  }
}

function bootApp() {
  new OmniArcadeApp();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
