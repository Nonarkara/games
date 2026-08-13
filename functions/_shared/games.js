/**
 * Server-side game registry.
 *
 * One allowlist protects both score-session issuance and score submission.
 * Keep this in step with js/app.js; functions/api/leaderboard.test.mjs checks
 * both directions so an unknown cartridge can never mint a server session.
 */
export const GAME_MAX = Object.freeze({
  // 2026 expansion
  'asteroids': 99999,
  'frogger': 9999,
  'connect-four': 200,
  'solitaire': 800,
  'word-guess': 120,
  'mate-in-one': 180,
  'ear-trainer': 120,
  'morse-code': 120,
  'nonogram': 500,
  'nim': 300,
  'make-24': 240,

  // TRAIN
  'dual-n-back': 400,
  'digit-span': 20,
  'stroop-match': 100,
  'go-nogo': 100,
  'simon-seq': 30,
  'schulte-table': 60,
  'visual-search': 100,
  'corsi-blocks': 12,
  'memory-palace': 12,
  'flanker': 100,
  'aim-trainer': 300,
  'mental-math': 100,
  'type-rush': 200,
  'reflex-matrix': 100,
  'trail-making': 600,
  'mental-rotation': 200,
  'iowa-gambling': 2000,
  'posner-cueing': 1200,
  'change-blindness': 1200,
  'operation-span': 600,
  'chimp-test': 1200,
  'calibration': 100,
  'stop-signal': 150,
  'reaction-gate': 400,
  'one-back': 400,
  'oddball': 480,
  'backward-span': 20,
  'monty-hall': 150,

  // ARCADE
  'cyber-tetris': 999999,
  'cyber-pacman': 99999,
  'cyber-snake': 99999,
  'space-defender': 99999,
  'flappy-bird': 999,
  'minesweeper': 600,
  'slide-2048': 131072,
  'cyber-blackjack': 10000,
  'trivia-master': 100,
  'pattern-breaker': 20,
  'arcade-breakout': 99999,
  'arcade-pong': 21,
  'rom-loader': 1,
  'ai-sandbox': 1,
  'warehouse-push': 600,

  // LEARN
  'number-chain': 50,
  'tower-hanoi': 1000,
  'anagram-scramble': 100,
  'word-builder': 100,
  'periodic-quest': 50,
  'capital-quiz': 50,
  'math-safari': 100,
  'memory-match': 600,
  'word-search': 300,
  'sudoku-sprint': 600,
  'fifteen-puzzle': 300,
  'lights-out': 600,

  // LABS
  'non-trivial': 50,
  'blow-cartridge': 50,
  'kings-cup': 52,
  'never-have-i': 50,
  'most-likely': 40,
  'cog-reflection': 30,
  'raven-matrices': 80,
  'sternberg': 240,
  'number-sense': 600,
  'wcst': 240,
  'tower-london': 200,
  'mind-eyes': 80,
  'ride-the-bus': 100,
  'power-hour': 600,
  'buzz-21': 100,
  'truth-or-dare': 100,
  'higher-lower': 100,
  'two-truths': 100
});

export const ALLOWED_GAME_IDS = new Set(Object.keys(GAME_MAX));
