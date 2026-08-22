/**
 * Dr Non — Non-Gaming System · Search synonyms
 *
 * Why this file exists: the colour game was called "Stroop Match" — named
 * for a 1935 psychologist. Dr Non went looking for "the game with RED and
 * YELLOW" and could not find it, because nothing in its title, description
 * or tags contained the word "colour". The search was working perfectly and
 * was still useless, which is the worst kind of broken.
 *
 * Every entry here is a word a real person might type for a game whose
 * on-screen copy does not contain it: the common name (solitaire for
 * Klondike, wordle for Word Guess), the thing it looks like (doors, cards,
 * arrows), the spelling they might use (color/colour, math/maths), and the
 * famous title it descends from (space invaders, mastermind, sokoban).
 *
 * Rules for adding: aliases are search-only and never rendered, so they can
 * be generous. Keep them honest — an alias that lands you on a game that
 * isn't what you meant is worse than no result at all.
 */

export const SEARCH_ALIASES = {
  /* ── the one that started this ─────────────────────────────────────── */
  'stroop-match': ['colour', 'color', 'colours', 'colors', 'red', 'blue', 'green', 'yellow',
                   'orange', 'amber', 'ink', 'word colour', 'stroop', 'name the colour', 'coloured words'],
  'stroop-match-pro': ['pro', 'white', 'harder stroop', 'colour match pro', 'color match pro',
                      'white answers', 'orange'],

  /* ── TRAIN ─────────────────────────────────────────────────────────── */
  'dual-n-back': ['nback', 'n back', 'working memory', 'jaeggi', 'brain training'],
  'digit-span': ['digits', 'numbers', 'remember numbers', 'recall', 'span'],
  'go-nogo': ['impulse', 'self control', 'inhibition', 'stop', 'restraint'],
  'simon-seq': ['simon says', 'sequence', 'pattern', 'lights', 'repeat the pattern'],
  'schulte-table': ['speed reading', 'peripheral vision', 'number grid', 'find numbers', 'scan'],
  'visual-search': ['odd one out', 'spot it', 'find the letter', 'clutter'],
  'corsi-blocks': ['spatial memory', 'block tapping', 'remember positions'],
  'memory-palace': ['loci', 'mnemonic', 'method of loci', 'remember a list'],
  'flanker': ['arrows', 'distraction', 'attention', 'eriksen'],
  'aim-trainer': ['aim', 'mouse accuracy', 'targets', 'fps', 'crosshair', 'clicking'],
  'mental-math': ['maths', 'math', 'arithmetic', 'sums', 'calculation', 'times tables'],
  'type-rush': ['typing', 'keyboard', 'wpm', 'words per minute', 'touch typing'],
  'reflex-matrix': ['reflex', 'reaction', 'whack a mole', 'tap fast', 'speed'],
  'trail-making': ['connect the dots', 'trails', 'task switching', 'reitan'],
  'mental-rotation': ['rotate shapes', 'spatial', '3d shapes', 'shepard', 'mirror'],
  'iowa-gambling': ['gambling', 'risk', 'decks', 'betting', 'bechara'],
  'cog-reflection': ['crt', 'riddles', 'trick questions', 'bat and ball', 'intuition'],
  'raven-matrices': ['iq test', 'matrices', 'pattern completion', 'raven', 'progressive'],
  'sternberg': ['memory scan', 'search memory', 'sternberg'],
  'number-sense': ['estimate', 'approximate', 'dots', 'quantity', 'ans'],
  'wcst': ['card sorting', 'wisconsin', 'change the rule', 'flexibility', 'set shifting'],
  'tower-london': ['planning', 'pegs', 'balls', 'shallice', 'moves ahead'],
  'mind-eyes': ['emotions', 'faces', 'empathy', 'social', 'read people', 'eyes'],
  'posner-cueing': ['attention', 'cue', 'orienting', 'posner'],
  'change-blindness': ['spot the difference', 'find the change', 'flicker', 'rensink'],
  'operation-span': ['complex span', 'ospan', 'memory and maths'],
  'chimp-test': ['chimp', 'monkey', 'ayumu', 'number memory', 'famous test'],
  'calibration': ['confidence', 'overconfidence', 'estimation', 'how sure', 'guessing'],
  'stop-signal': ['stop', 'brakes', 'cancel', 'inhibition'],
  'reaction-gate': ['reaction time', 'reflex', 'how fast', 'ms'],
  'one-back': ['1 back', 'nback', 'quick memory'],
  'oddball': ['odd one', 'rare target', 'p300'],
  'backward-span': ['reverse', 'backwards', 'digits backwards'],
  'memory-matrix': ['grid memory', 'remember squares', 'tiles'],

  /* ── ARCADE ────────────────────────────────────────────────────────── */
  'cyber-tetris': ['tetris', 'blocks', 'tetromino', 'falling blocks', 'lines'],
  'arcade-breakout': ['breakout', 'brick breaker', 'arkanoid', 'bricks', 'paddle'],
  'arcade-pong': ['pong', 'ping pong', 'table tennis', 'paddle', 'bat'],
  'cyber-pacman': ['pacman', 'pac man', 'maze', 'ghosts', 'dots', 'namco'],
  'cyber-snake': ['snake', 'nokia', 'worm', 'grow'],
  'space-defender': ['space invaders', 'shooter', 'shooting', 'aliens', 'invaders', 'galaga'],
  'flappy-bird': ['flappy', 'bird', 'pipes', 'tap to fly'],
  'minesweeper': ['mines', 'minesweeper', 'flags', 'bombs', 'windows'],
  'slide-2048': ['2048', 'merge tiles', 'threes', 'sliding numbers'],
  'sudoku-sprint': ['sudoku', 'numbers puzzle', 'grid puzzle'],
  'fifteen-puzzle': ['15 puzzle', 'sliding tiles', 'slide puzzle', 'tile puzzle'],
  'cyber-blackjack': ['blackjack', '21', 'cards', 'casino', 'twenty one'],
  'trivia-master': ['quiz', 'trivia', 'questions', 'general knowledge'],
  'pattern-breaker': ['mastermind', 'code breaking', 'deduction', 'guess the code'],
  'rom-loader': ['rom', 'emulator', 'file inspector', 'cartridge file'],
  'ai-sandbox': ['ai', 'make a game', 'generate', 'custom game', 'builder'],
  'warehouse-push': ['sokoban', 'push boxes', 'crates', 'warehouse'],
  'rock-paper-scissors': ['rock paper scissors', 'rps', 'roshambo', 'scissors'],
  'asteroids': ['asteroids', 'space rocks', 'spaceship', 'atari', 'thrust'],
  'frogger': ['frog', 'cross the road', 'traffic', 'konami'],
  'connect-four': ['connect 4', 'four in a row', '4 in a row', 'versus', 'opponent', 'computer'],
  'solitaire': ['solitaire', 'patience', 'klondike', 'cards', 'card game', 'deck'],

  /* ── LEARN ─────────────────────────────────────────────────────────── */
  'monty-hall': ['doors', 'goat', 'switch or stay', 'probability', 'game show'],
  'number-chain': ['sequences', 'what comes next', 'number pattern'],
  'word-guess': ['wordle', 'five letter', '5 letter', 'word game', 'guess the word'],
  'mate-in-one': ['chess', 'checkmate', 'mate', 'tactics', 'puzzle chess'],
  'ear-trainer': ['music', 'pitch', 'hearing', 'ears', 'intervals', 'notes', 'sound', 'listen'],
  'morse-code': ['morse', 'sos', 'dots and dashes', 'telegraph', 'beeps', 'listen'],
  'tower-hanoi': ['hanoi', 'discs', 'rings', 'towers'],
  'lights-out': ['lights', 'toggle', 'switch puzzle'],
  'nonogram': ['picross', 'nonogram', 'griddler', 'picture logic'],
  'nim': ['nim', 'matchsticks', 'take away', 'last one loses'],
  'make-24': ['24 game', 'make 24', 'four numbers', 'arithmetic puzzle'],
  'tic-tac-toe': ['tic tac toe', 'noughts and crosses', 'xo', 'x and o', 'three in a row'],
  'anagram-scramble': ['anagram', 'unscramble', 'jumble', 'letters'],
  'word-builder': ['spelling', 'make words', 'letters', 'vocabulary'],
  'periodic-quest': ['chemistry', 'elements', 'periodic table', 'science'],
  'capital-quiz': ['geography', 'capitals', 'countries', 'cities', 'world'],
  'math-safari': ['maths for kids', 'math kids', 'arithmetic', 'sums', 'children'],
  'memory-match': ['pairs', 'concentration', 'matching game', 'flip cards'],
  'word-search': ['wordsearch', 'find words', 'letter grid'],

  /* ── LABS ──────────────────────────────────────────────────────────── */
  'non-trivial': ['quiz', 'trivia', 'dr non', 'personal'],
  'blow-cartridge': ['90s', 'nineties', 'retro trivia', 'party', 'quiz night'],
  'kings-cup': ['drinking', 'ring of fire', 'kings', 'party', 'cards', 'circle of death'],
  'never-have-i': ['drinking', 'nhie', 'party', 'confession'],
  'most-likely': ['drinking', 'party', 'who would', 'vote'],
  'ride-the-bus': ['drinking', 'party', 'cards', 'bus'],
  'power-hour': ['drinking', 'party', 'shots', 'timer'],
  'buzz-21': ['drinking', 'party', 'counting', 'buzz'],
  'truth-or-dare': ['drinking', 'party', 'truth', 'dare'],
  'higher-lower': ['drinking', 'party', 'cards', 'guess'],
  'two-truths': ['drinking', 'party', 'lie', 'bluff'],

  /* ── META ──────────────────────────────────────────────────────────── */
  'about-dr-non': ['about', 'dr non', 'why', 'story', 'who made this', 'author']
};

/** Search-only keywords for a game id. Never rendered. */
export function aliasesFor(id) {
  return SEARCH_ALIASES[id] || [];
}
