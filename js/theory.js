/**
 * NGS — THE STACK
 *
 * The five theoretical frameworks that hold the whole product up.
 * Every game is tagged with which layers of the stack it exercises,
 * so the briefing → play flow has a real scientific spine — not just
 * a per-game paper citation, but the meta-frameworks that explain
 * why any of this should work.
 *
 * Used in:
 *   - brainGuides.js (per-game stack tags, the brain briefing surface)
 *   - the Why NGS / Stack panel (renderStack, future)
 *   - the brand-level "what is this?" copy
 *
 * Each entry is plain content, not a render contract. The 16-bit
 * surface in styles.css owns the visual treatment.
 */

export const STACK_ORDER = [
  'kahneman',   // System 1 / System 2 — the cognitive split
  'werbach',    // Gamification — the mechanic that holds it together
  'thaler',     // Nudge — the choice architecture on every screen
  'plasticity', // Neuroplasticity — the hope that practice changes the brain
  'clear'       // Atomic Habits — the loop that keeps the user coming back
];

export const THEORY_STACK = {
  kahneman: {
    id: 'kahneman',
    layer: 1,
    name: 'Kahneman & Tversky — System 1 / System 2',
    short: 'Kahneman',
    authors: 'Daniel Kahneman, Amos Tversky',
    year: 1974,
    claim:
      'Cognition runs two systems: System 1 is fast, automatic, emotional; System 2 is slow, deliberate, effortful. Most thinking is System 1. System 2 only intervenes when System 1 reports a conflict.',
    why:
      'Brain training means either recruiting System 2 to override System 1 (Stroop, Go/No-Go) or training System 1 to do what it currently cannot (Tetris, Aim Trainer). Without the two-system frame, the briefings are just flavor text.',
    inNgs:
      'Stroop Match, Go/No-Go, Flanker, and Simon Sequence are System 2 override drills. Tetris, Pac-Man, and Aim Trainer train System 1 pattern + motor. The Brain Briefing primes System 2 with the rules before the round starts — then play hands the load back to System 1.',
    mechanics: [
      'Stroop / Flanker / Go-No-Go — System 2 override',
      'Dual N-Back / Digit Span / Towers — System 2 capacity',
      'Tetris / Pac-Man / Aim Trainer — System 1 training',
      'Briefing before play — System 2 priming'
    ],
    citation: {
      label: 'Tversky & Kahneman 1974 · Heuristics & biases',
      url: 'https://doi.org/10.1126/science.185.4157.1124'
    },
    secondary: [
      { label: 'Kahneman 2011 · Thinking, Fast and Slow', url: 'https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow' },
      { label: 'Tversky & Kahneman 1979 · Prospect theory', url: 'https://doi.org/10.2307/1914185' }
    ]
  },

  werbach: {
    id: 'werbach',
    layer: 2,
    name: 'Werbach & Hunter — Gamification',
    short: 'Werbach',
    authors: 'Kevin Werbach, Dan Hunter',
    year: 2012,
    claim:
      'Gamification is the use of game elements in non-game contexts. It works through the PBL triad (Points, Badges, Leaderboards) and the MDA framework (Mechanics → Dynamics → Aesthetics). The six-step design process: define objective → delineate target behavior → describe players → devise activity cycles → do not forget the fun → deploy.',
    why:
      'NGS is a gamified brain-training system, not a flashcard site. Without the gamification frame, the points and the leaderboard are decoration. With it, every element has a job.',
    inNgs:
      'Points = the score. Badges = "made the board" — the 4-letter initial signing. Leaderboards = the per-game top-5. MDA: Mechanics = game rules. Dynamics = briefing → play → result loop. Aesthetics = the 16-bit CRT surface. The Werbach six-step maps directly to how a new cartridge is commissioned.',
    mechanics: [
      'PBL triad → score / board-entry / top-5 leaderboard',
      'MDA framework → briefing / play / result as the canonical loop',
      'Six-step design process → commissioning new brain games',
      '"Do not forget the fun" → the 16-bit register as the aesthetic of fun'
    ],
    citation: {
      label: 'Werbach & Hunter 2012 · For the Win',
      url: 'https://wharton.upenn.edu/story/for-the-win/'
    },
    secondary: [
      { label: 'Werbach · Gamification (Coursera, U. Pennsylvania)', url: 'https://www.coursera.org/learn/gamification' }
    ]
  },

  thaler: {
    id: 'thaler',
    layer: 3,
    name: 'Thaler & Sunstein — Nudge (and EAST)',
    short: 'Thaler',
    authors: 'Richard Thaler, Cass Sunstein',
    year: 2008,
    claim:
      'Choice architecture changes the choice without removing freedom. The EAST framework (Service et al. 2014, Behavioural Insights Team): make it Easy, Attractive, Social, Timely. Libertarian paternalism — steer gently, do not force.',
    why:
      'Every screen in NGS is a choice architecture. The briefing, the daily cartridge, the leaderboard sign flow, the Simons 2016 caveat — all are nudges. The whole point of the system is to make the right practice feel like the obvious practice.',
    inNgs:
      'Easy: "Today\'s Cartridge" tile on the landing page — one choice, not thirty. Attractive: 4-letter initials in amber, the hero cartridge cell. Social: top-5 leaderboards are public, the initials are identity. Timely: "Made the board — sign it NOW" modal at the moment of qualification. The Simons caveat in every briefing is a default of honesty over hype.',
    mechanics: [
      'Brain Briefing → easy + attractive default of honest play',
      'Daily Cartridge → one choice, no paralysis',
      '"Made the board — sign it" → timely + social + attractive',
      '4-letter initial as identity → social persistence'
    ],
    citation: {
      label: 'Thaler & Sunstein 2008 · Nudge',
      url: 'https://en.wikipedia.org/wiki/Nudge_(book)'
    },
    secondary: [
      { label: 'Service et al. 2014 · EAST (BIT)', url: 'https://www.bi.team/publications/east-four-simple-ways-to-apply-behavioural-insights/' }
    ]
  },

  plasticity: {
    id: 'plasticity',
    layer: 4,
    name: 'Neuroplasticity — the brain that changes itself',
    short: 'Neuroplasticity',
    authors: 'Michael Merzenich; Eleanor Maguire; Bogdan Draganski; Norman Doidge',
    year: 2000,
    claim:
      'The brain physically changes with use. Cortical remapping is real. "Neurons that fire together wire together" (Hebb 1949). Maguire 2000 showed London taxi drivers have larger hippocampi after years of navigation. Draganski 2004 showed medical students\' cortical thickness increased during exam prep.',
    why:
      'The whole product is built on the assumption that practice changes the brain. Without neuroplasticity, "brain training" is just marketing. The hope — and the honesty — both come from this literature.',
    inNgs:
      'Every TRAIN-wing briefing includes the paper for the task the game trains. The top-5 leaderboard is the visible feedback that the practice is accumulating over weeks. The daily cartridge is the small repeated exposure that drives cortical change. The Simons 2016 caveat on every briefing is the honesty: neuroplasticity is real for the trained task. Far transfer is contested.',
    mechanics: [
      'TRAIN wing: every drill is a published plasticity task',
      'Method of Loci (Yates 1966) — the canonical memory demonstration',
      'Top-5 board — the visible sign of cumulative practice',
      'Simons 2016 caveat — the honesty check on every claim'
    ],
    citation: {
      label: 'Maguire et al. 2000 · London taxi drivers (PNAS)',
      url: 'https://doi.org/10.1073/pnas.070039597'
    },
    secondary: [
      { label: 'Doidge 2007 · The Brain That Changes Itself', url: 'https://www.normandoidge.com/' },
      { label: 'Draganski et al. 2004 · Cortical plasticity (Nature)', url: 'https://doi.org/10.1038/nature02481' },
      { label: 'Hebb 1949 · The Organization of Behavior', url: 'https://en.wikipedia.org/wiki/Neuroplasticity#History' }
    ]
  },

  clear: {
    id: 'clear',
    layer: 5,
    name: 'James Clear — Atomic Habits',
    short: 'Atomic Habits',
    authors: 'James Clear',
    year: 2018,
    claim:
      'Habits form through the Four Laws of Behavior Change: Cue → Craving → Response → Reward. Identity-based habits ("I am the kind of person who trains my brain") stick better than outcome-based ones. The 2-minute rule: make the start so easy it cannot be refused.',
    why:
      'A brain training product is a habit, not a one-off. Without the Four Laws, the user plays once, scores, and never returns. NGS is built so the loop closes and the identity persists.',
    inNgs:
      'Cue = the daily cartridge tile, the omnicade attract. Craving = the Brain Briefing promise ("this trains focus / inhibition / spatial memory"). Response = one short round, typically 60–180 seconds. Reward = score, new high, board entry, the 4-letter initial. Identity = the 4-letter initial is literally your identity in the system — you are not your score, you are your three or four letters on the board. The 2-minute rule is why every round is short enough to fit between meetings.',
    mechanics: [
      'Cue → daily cartridge + attract-mode',
      'Craving → Brain Briefing before play',
      'Response → one short round, 60–180s',
      'Reward → score, new high, board entry, 4-letter sign',
      'Identity → 4-letter initial as the visible self'
    ],
    citation: {
      label: 'Clear 2018 · Atomic Habits',
      url: 'https://jamesclear.com/atomic-habits'
    },
    secondary: []
  }
};

/**
 * The honest version, restated as a stack — the counter-claim
 * that lives in the brand copy and the Why NGS surface.
 */
export const STACK_CLAIM = {
  punch: 'Brain expansion, not killing time.',
  notAGame: 'Not a game system. A brain expansion system.',
  short: 'Dr Non — Non-Gaming System. Five frameworks, one loop, every round short enough to fit between meetings.',
  honesty:
    'Practice is specific. Each cartridge trains the named task. Near transfer is real. Far transfer is contested — Simons 2016 is on every briefing, on purpose.',
  loop: 'Briefing → Play → Result. Briefing primes Kahneman System 2. Play hands the load to System 1 + Werbach mechanics. Result closes Clear\'s Four Laws and writes your four letters on the board.',
  five: [
    'Kahneman — System 1 / System 2',
    'Werbach — Gamification (PBL · MDA)',
    'Thaler — Nudge (EAST)',
    'Neuroplasticity — practice changes the brain',
    'Atomic Habits — Cue · Craving · Response · Reward'
  ]
};

/** Friendly framework name for the 16-bit chip. */
export function frameworkLabel(id) {
  return THEORY_STACK[id]?.short || id;
}

/** Resolve the frameworks a game engages. Pure lookup, never throws. */
export function frameworksFor(stackTags) {
  if (!Array.isArray(stackTags)) return [];
  return stackTags
    .map(id => THEORY_STACK[id])
    .filter(Boolean);
}
