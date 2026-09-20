/**
 * NGS · GIF-like animated previews
 * -- 8-bit loop, no video, no external GIF, pure CSS.
 * -- Each cartridge shows a 3-5s loop of WHAT PLAY FEELS LIKE.
 * -- The preview is decorative (aria-hidden); the briefing text is the truth.
 * -- Respects prefers-reduced-motion: loops freeze at frame 0.
 */

const MAP = {
  // inhibition / Stroop family
  'stroop-match': 'stroop',
  'stroop-match-pro': 'stroop',
  'color-march-pro': 'stroop',
  'flanker': 'flanker',
  'go-nogo': 'gongo',
  'stop-signal': 'gongo',
  // memory span / n-back
  'dual-n-back': 'nback',
  'digit-span': 'span',
  'backward-span': 'span',
  'operation-span': 'span',
  'one-back': 'nback',
  'chimp-test': 'nback',
  'sternberg': 'nback',
  'corsi-blocks': 'corsi',
  'memory-matrix': 'corsi',
  'memory-palace': 'corsi',
  'simon-seq': 'simon',
  // attention
  'schulte-table': 'attn',
  'visual-search': 'attn',
  'posner-cueing': 'attn',
  'change-blindness': 'attn',
  'number-sense': 'attn',
  'oddball': 'gongo',
  'reaction-gate': 'gongo',
  'aim-trainer': 'aim',
  'reflex-matrix': 'aim',
  // Trail / rotation / executive
  'trail-making': 'trail',
  'mental-rotation': 'rotate',
  'iowa-gambling': 'cards',
  'cog-reflection': 'math',
  'raven-matrices': 'logic',
  'wcst': 'logic',
  'tower-london': 'tower',
  'mind-eyes': 'eyes',
  'calibration': 'math',
  'monty-hall': 'cards',
  // arcade
  'cyber-tetris': 'tetris',
  'arcade-breakout': 'breakout',
  'arcade-pong': 'pong',
  'cyber-pacman': 'pacman',
  'cyber-snake': 'snake',
  'space-defender': 'shooter',
  'flappy-bird': 'flap',
  'slide-2048': 'merge',
  'minesweeper': 'mines',
  'warehouse-push': 'push',
  'lights-out': 'lights',
  'asteroids': 'asteroids',
  'frogger': 'frogger',
  'connect-four': 'connect4',
  'solitaire': 'cards',
  'chess': 'chess',
  'checkers': 'checkers',
  'spider-solitaire': 'cards',
  'go': 'go',
  'rock-paper-scissors': 'rps',
  'paper-soccer': 'soccer',
  // learn
  'number-chain': 'math',
  'word-guess': 'wordle',
  'mate-in-one': 'chess',
  'ear-trainer': 'audio',
  'morse-code': 'audio',
  'tower-hanoi': 'tower',
  'nonogram': 'nonogrid',
  'nim': 'nim',
  'make-24': 'math',
  'tic-tac-toe': 'tictac',
  'anagram-scramble': 'words',
  'word-builder': 'words',
  'periodic-quest': 'periodic',
  'capital-quiz': 'geo',
  'math-safari': 'math',
  'memory-match': 'match',
  'word-search': 'search',
  'sudoku': 'sudoku',
  'sudoku-sprint': 'sudoku',
  'fifteen-puzzle': 'fifteen',
  'mental-math': 'math',
  'mental-math-pro': 'math',
  'mental-math-thai': 'math',
  'type-rush': 'typing',
  // labs party
  'kings-cup': 'party',
  'never-have-i': 'party',
  'most-likely': 'party',
  'ride-the-bus': 'party',
  'power-hour': 'party',
  'buzz-21': 'party',
  'truth-or-dare': 'party',
  'higher-lower': 'party',
  'two-truths': 'party',
  'heads-up': 'party',
  'non-trivial': 'trivia',
  'blow-cartridge': 'trivia',
  'cyber-blackjack': 'cards',
  'trivia-master': 'trivia',
  'pattern-breaker': 'mastermind',
  'rom-loader': 'rom',
  'ai-sandbox': 'ai',
  'about-dr-non': 'about',
};

export function previewTypeFor(id) {
  return MAP[id] || 'generic';
}

export function previewHtmlFor(game) {
  const id = typeof game === 'string' ? game : game.id;
  const type = previewTypeFor(id);
  const title = typeof game === 'string' ? id : game.title || id;
  // The outer frame: 8-bit window, looping animation inside.
  // The inner scene is pure CSS — no timers, no JS, so GameSession teardown
  // cannot leak it. Reduced-motion freezes at 0% via media query in styles.css
  const scenes = {
    stroop: `
      <div class="pv-scene pv-stroop" aria-hidden="true">
        <span class="pv-word pv-w1">RED</span><span class="pv-word pv-w2">BLUE</span><span class="pv-word pv-w3">GREEN</span>
        <span class="pv-cursor"></span>
      </div>
      <p class="pv-cap">Ink vs word — tap the colour, not the letters</p>`,
    flanker: `
      <div class="pv-scene pv-flanker" aria-hidden="true">
        <span>◀</span><span>◀</span><span class="pv-mid">▶</span><span>◀</span><span>◀</span>
        <i class="pv-focus"></i>
      </div>
      <p class="pv-cap">Middle arrow only — sides are noise</p>`,
    gongo: `
      <div class="pv-scene pv-gongo" aria-hidden="true">
        <span class="pv-go">GO</span><span class="pv-nogo">NOGO</span><span class="pv-go">GO</span>
      </div>
      <p class="pv-cap">GO = tap · NOGO = freeze</p>`,
    nback: `
      <div class="pv-scene pv-nback" aria-hidden="true">
        <i></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i><i></i><i></i>
      </div>
      <p class="pv-cap">Same as 2 ago? — MATCH or PASS</p>`,
    span: `
      <div class="pv-scene pv-span" aria-hidden="true">
        <span>4</span><span>9</span><span>2</span><span>7</span><em>→</em><span class="pv-ans">7 2 9 4</span>
      </div>
      <p class="pv-cap">Watch · then type back (or reverse)</p>`,
    corsi: `
      <div class="pv-scene pv-corsi" aria-hidden="true">
        <i></i><i class="on"></i><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i><i></i>
      </div>
      <p class="pv-cap">Path lights — tap it back in order</p>`,
    simon: `
      <div class="pv-scene pv-simon" aria-hidden="true">
        <i class="p1"></i><i class="p2"></i><i class="p3"></i><i class="p4"></i>
      </div>
      <p class="pv-cap">Watch the order grow — play it back</p>`,
    attn: `
      <div class="pv-scene pv-attn" aria-hidden="true">
        <span>–</span><span>–</span><span>–</span><span class="pv-targ">/</span><span>–</span><span>–</span><span>–</span><span>–</span>
      </div>
      <p class="pv-cap">One target hides in noise — find it fast</p>`,
    aim: `
      <div class="pv-scene pv-aim" aria-hidden="true">
        <span class="pv-dot d1"></span><span class="pv-dot d2"></span><span class="pv-dot d3"></span>
        <span class="pv-cross">+</span>
      </div>
      <p class="pv-cap">Targets appear — tap before they vanish</p>`,
    trail: `
      <div class="pv-scene pv-trail" aria-hidden="true">
        <span>1</span><em>—</em><span>A</span><em>—</em><span>2</span><em>—</em><span>B</span><em>—</em><span>3</span>
      </div>
      <p class="pv-cap">1 → A → 2 → B — switch the rule each step</p>`,
    rotate: `
      <div class="pv-scene pv-rotate" aria-hidden="true">
        <span class="pv-shape s1">◩</span><span class="pv-arrow">→</span><span class="pv-shape s2">◪</span>
      </div>
      <p class="pv-cap">Same shape turned — or mirrored?</p>`,
    tetris: `
      <div class="pv-scene pv-tetris" aria-hidden="true">
        <span class="pv-piece"></span><span class="pv-stack"></span><span class="pv-line"></span>
      </div>
      <p class="pv-cap">Rotate · drop · clear the line</p>`,
    breakout: `
      <div class="pv-scene pv-breakout" aria-hidden="true">
        <span class="pv-bricks"></span><span class="pv-ball"></span><span class="pv-paddle"></span>
      </div>
      <p class="pv-cap">Bounce the ball — break every brick</p>`,
    pong: `
      <div class="pv-scene pv-pong" aria-hidden="true">
        <span class="pv-pdl l"></span><span class="pv-ball"></span><span class="pv-pdl r"></span>
      </div>
      <p class="pv-cap">Read the bounce — be there before it arrives</p>`,
    pacman: `
      <div class="pv-scene pv-pacman" aria-hidden="true">
        <span class="pv-pac">◉</span><span class="pv-dots">• • •</span><span class="pv-ghost">👾</span>
      </div>
      <p class="pv-cap">Eat the dots — don’t get eaten</p>`,
    math: `
      <div class="pv-scene pv-math" aria-hidden="true">
        <span>23</span><em>+</em><span>17</span><em>=</em><span class="pv-ans">40</span>
      </div>
      <p class="pv-cap">Short sums — as many as you can in the clock</p>`,
    typing: `
      <div class="pv-scene pv-typing" aria-hidden="true">
        <span>type</span><span class="pv-caret">▌</span><span class="pv-ghost">rush</span>
      </div>
      <p class="pv-cap">Words appear — type them, don’t chase errors</p>`,
    sudoku: `
      <div class="pv-scene pv-sudoku" aria-hidden="true">
        <span>5</span><span></span><span>3</span><span></span><span>7</span><span></span><span></span><span>2</span><span>5</span>
      </div>
      <p class="pv-cap">One digit per row, column, and box</p>`,
    fifteen: `
      <div class="pv-scene pv-fifteen" aria-hidden="true">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span class="pv-hole"></span>
      </div>
      <p class="pv-cap">Slide through the gap — order 1 → 15</p>`,
    words: `
      <div class="pv-scene pv-words" aria-hidden="true">
        <span>T</span><span>R</span><span>A</span><span> C</span><span class="pv-blank">_</span>
      </div>
      <p class="pv-cap">Unscramble — build a real word</p>`,
    wordle: `
      <div class="pv-scene pv-wordle" aria-hidden="true">
        <span class="g">A</span><span class="y">R</span><span>I</span><span>S</span><span>E</span>
      </div>
      <p class="pv-cap">Green = right spot · Orange = in the word</p>`,
    chess: `
      <div class="pv-scene pv-chess" aria-hidden="true">
        <span class="pv-board"></span><span class="pv-move">♞ →</span>
      </div>
      <p class="pv-cap">Full rules — one move, whole board replies</p>`,
    party: `
      <div class="pv-scene pv-party" aria-hidden="true">
        <span class="pv-card">K</span><span class="pv-card">A</span><span class="pv-card">Q</span><em>→</em><span>drink</span>
      </div>
      <p class="pv-cap">Draw a card — the table does the rest</p>`,
    generic: `
      <div class="pv-scene pv-generic" aria-hidden="true">
        <span class="pv-play">▶</span><span>PLAY</span><span class="pv-score">+10</span>
      </div>
      <p class="pv-cap">One short round — score, then beat it</p>`,
    // aliases
    tower: `
      <div class="pv-scene pv-tower" aria-hidden="true">
        <span class="pv-peg"><em></em><em></em></span><span class="pv-peg"><em></em></span><span class="pv-peg"></span>
      </div>
      <p class="pv-cap">Move the stack — fewest moves wins</p>`,
    push: `
      <div class="pv-scene pv-push" aria-hidden="true">
        <span class="pv-man">◉</span><span class="pv-crate">▣</span><span class="pv-target">◎</span>
      </div>
      <p class="pv-cap">Push every crate onto a target — never pull</p>`,
    lights: `
      <div class="pv-scene pv-lights" aria-hidden="true">
        <i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i>
      </div>
      <p class="pv-cap">Tap a cell — it flips its neighbours</p>`,
    rps: `
      <div class="pv-scene pv-rps" aria-hidden="true">
        <span>✊</span><span>✋</span><span>✌</span><em>→</em><span class="pv-win">WIN</span>
      </div>
      <p class="pv-cap">Rock · paper · scissors — CPU learns your habit</p>`,
    tictac: `
      <div class="pv-scene pv-tictac" aria-hidden="true">
        <span>X</span><span>O</span><span>X</span><span class="pv-winl">—</span>
      </div>
      <p class="pv-cap">Three in a row — hard mode never loses</p>`,
    search: `
      <div class="pv-scene pv-search" aria-hidden="true">
        <span>A</span><span>B</span><span class="hl">F</span><span>C</span><span>D</span>
      </div>
      <p class="pv-cap">Hidden words — scan every direction</p>`,
    nonogrid: `
      <div class="pv-scene pv-nonogrid" aria-hidden="true">
        <span>3</span><span>■ ■ ■</span><span>1</span>
      </div>
      <p class="pv-cap">Row and column clues — fill the picture</p>`,
    nim: `
      <div class="pv-scene pv-nim" aria-hidden="true">
        <span>| | |</span><span>| |</span><span>| | | |</span><em>→</em><span>take</span>
      </div>
      <p class="pv-cap">Take any number from one heap — last wins</p>`,
    trivia: `
      <div class="pv-scene pv-trivia" aria-hidden="true">
        <span>?</span><span class="pv-opts">A B C D</span>
      </div>
      <p class="pv-cap">Pick one — explain why, not just what</p>`,
    cards: `
      <div class="pv-scene pv-cards" aria-hidden="true">
        <span class="pv-card">A</span><span class="pv-card">7</span><span class="pv-card">K</span>
      </div>
      <p class="pv-cap">One card turns — read the table, not the hand</p>`,
    snake: `
      <div class="pv-scene pv-snake" aria-hidden="true">
        <span class="pv-snakebody">■ ■ ■ ●</span>
      </div>
      <p class="pv-cap">Grow without biting your tail</p>`,
    shooter: `
      <div class="pv-scene pv-shooter" aria-hidden="true">
        <span class="pv-inv">👾 👾</span><span class="pv-laser">↑</span><span class="pv-ship">▲</span>
      </div>
      <p class="pv-cap">Lead the target — shoot where it will be</p>`,
    asteroids: `
      <div class="pv-scene pv-asteroids" aria-hidden="true">
        <span>⬢</span><span class="pv-ship">▲</span><span>⬡</span>
      </div>
      <p class="pv-cap">Thrust in taps — rocks split when hit</p>`,
    frogger: `
      <div class="pv-scene pv-frogger" aria-hidden="true">
        <span>▬</span><span class="pv-frog">🐸</span><span>▬ ▬</span>
      </div>
      <p class="pv-cap">Read the gaps — cross before they close</p>`,
    soccer: `
      <div class="pv-scene pv-soccer" aria-hidden="true">
        <span class="pv-pitch">▭</span><span class="pv-ball">●</span><span class="pv-goal">▥</span>
      </div>
      <p class="pv-cap">Drag to pass — move one man, first to 3</p>`,
    connect4: `
      <div class="pv-scene pv-connect4" aria-hidden="true">
        <span class="pv-disc r"></span><span class="pv-disc y"></span><span class="pv-disc r"></span><span class="pv-disc r"></span>
      </div>
      <p class="pv-cap">Drop discs — connect four before the engine does</p>`,
    logic: `
      <div class="pv-scene pv-logic" aria-hidden="true">
        <span>◇</span><span>◆</span><span class="pv-miss">?</span>
      </div>
      <p class="pv-cap">One cell missing — finish the pattern</p>`,
    eyes: `
      <div class="pv-scene pv-eyes" aria-hidden="true">
        <span>◉ ◉</span><em>→</em><span class="pv-feel">calm?</span>
      </div>
      <p class="pv-cap">Eyes only — pick the feeling word</p>`,
    audio: `
      <div class="pv-scene pv-audio" aria-hidden="true">
        <span>♪</span><span class="pv-wave">∿∿∿</span><span>?</span>
      </div>
      <p class="pv-cap">Hear it — name the interval or code</p>`,
    geo: `
      <div class="pv-scene pv-geo" aria-hidden="true">
        <span>🇹🇭</span><em>→</em><span>Bangkok</span>
      </div>
      <p class="pv-cap">Country → capital — ten quick rounds</p>`,
    periodic: `
      <div class="pv-scene pv-periodic" aria-hidden="true">
        <span>Fe</span><em>→</em><span>Iron</span>
      </div>
      <p class="pv-cap">Symbol → name — ten elements, ten rounds</p>`,
    mastermind: `
      <div class="pv-scene pv-mastermind" aria-hidden="true">
        <span class="pv-peg r"></span><span class="pv-peg g"></span><span class="pv-peg b"></span><span class="pv-peg y"></span>
      </div>
      <p class="pv-cap">Guess the code — colour + place hints each try</p>`,
    match: `
      <div class="pv-scene pv-match" aria-hidden="true">
        <span class="pv-card">?</span><span class="pv-card">🐯</span><span class="pv-card">?</span><span class="pv-card">🐯</span>
      </div>
      <p class="pv-cap">Flip two — match the pairs</p>`,
    flap: `
      <div class="pv-scene pv-flap" aria-hidden="true">
        <span class="pv-bird">🐦</span><span class="pv-pipe">▐</span><span class="pv-pipe">▐</span>
      </div>
      <p class="pv-cap">Tap to fly — don’t hit the pipes</p>`,
    merge: `
      <div class="pv-scene pv-merge" aria-hidden="true">
        <span>2</span><span>2</span><em>→</em><span class="pv-big">4</span>
      </div>
      <p class="pv-cap">Merge matching tiles — reach 2048</p>`,
    mines: `
      <div class="pv-scene pv-mines" aria-hidden="true">
        <span>1</span><span>2</span><span class="pv-flag">⚑</span><span>?</span>
      </div>
      <p class="pv-cap">Read the numbers — flag the mines</p>`,
    checkers: `
      <div class="pv-scene pv-checkers" aria-hidden="true">
        <span class="pv-man">●</span><span class="pv-man r">●</span><span>→</span><span>jump</span>
      </div>
      <p class="pv-cap">Mandatory captures — jump the longest line</p>`,
    go: `
      <div class="pv-scene pv-go" aria-hidden="true">
        <span class="pv-board"></span><span>● ○</span>
      </div>
      <p class="pv-cap">9×9 to 19×19 — corners first, centre last</p>`,
    rom: `
      <div class="pv-scene pv-rom" aria-hidden="true">
        <span>▭</span><span class="pv-chip">▣</span><span>→</span><span>header</span>
      </div>
      <p class="pv-cap">Drop a file — header only, never plays</p>`,
    ai: `
      <div class="pv-scene pv-ai" aria-hidden="true">
        <span>prompt</span><em>→</em><span class="pv-play">▶ PLAY</span>
      </div>
      <p class="pv-cap">Type a prompt — a tiny game appears to play</p>`,
    about: `
      <div class="pv-scene pv-about" aria-hidden="true">
        <span>Dr Non</span><span class="pv-sig">— Bangkok 2026</span>
      </div>
      <p class="pv-cap">The person behind the floor — why this exists</p>`,
  };
  const inner = scenes[type] || scenes.generic;
  return `<div class="pv-wrap route-${type}" role="img" aria-label="Animated preview of ${title}: ${stripTags(inner)}">${inner}</div>`;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
