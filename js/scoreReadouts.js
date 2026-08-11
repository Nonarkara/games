/**
 * End-of-round score readouts — plain English, skill-honest.
 *
 * Bands: rough → warming → solid → sharp.
 * Rough is candid and points to a short practice path.
 * Solid/sharp make the player feel the work landed — without claiming IQ.
 */

import { BRAIN_GUIDES } from './brainGuides.js';

/** Absolute cutoffs: score < cuts[0] rough, < cuts[1] warming, < cuts[2] solid, else sharp. */
const CUTS = {
  'dual-n-back': [40, 100, 180],
  'digit-span': [4, 6, 9],
  'stroop-match': [40, 65, 85],
  'go-nogo': [40, 65, 85],
  'simon-seq': [4, 8, 14],
  'schulte-table': [15, 30, 45],
  'visual-search': [40, 65, 85],
  'corsi-blocks': [3, 5, 7],
  'memory-palace': [3, 5, 6],
  'flanker': [40, 65, 85],
  'aim-trainer': [80, 140, 200],
  'mental-math': [12, 28, 50],
  'type-rush': [25, 45, 70],
  'reflex-matrix': [15, 35, 60],
  'trail-making': [120, 280, 420],
  'mental-rotation': [40, 90, 140],
  'iowa-gambling': [200, 700, 1200],
  'cog-reflection': [1, 10, 20],
  'raven-matrices': [20, 40, 60],
  'sternberg': [80, 140, 190],
  'number-sense': [200, 350, 480],
  'wcst': [60, 120, 180],
  'tower-london': [50, 100, 150],
  'mind-eyes': [20, 40, 60],
  'posner-cueing': [200, 500, 850],
  'change-blindness': [200, 500, 850],
  'operation-span': [80, 220, 400],
  'chimp-test': [150, 400, 700],
  'calibration': [30, 55, 80],
  'stop-signal': [35, 70, 115],
  'monty-hall': [40, 80, 120],
  'cyber-tetris': [800, 2500, 8000],
  'arcade-breakout': [200, 800, 2500],
  'arcade-pong': [3, 7, 14],
  'cyber-pacman': [500, 2000, 6000],
  'cyber-snake': [40, 120, 300],
  'space-defender': [200, 800, 2500],
  'flappy-bird': [2, 8, 20],
  'minesweeper': [80, 200, 400],
  'slide-2048': [512, 2048, 8192],
  'sudoku-sprint': [200, 400, 520],
  'fifteen-puzzle': [80, 160, 240],
  'warehouse-push': [120, 280, 450],
  'lights-out': [120, 280, 450],
  'cyber-blackjack': [200, 800, 2500],
  'trivia-master': [30, 55, 80],
  'pattern-breaker': [3, 8, 14],
  'number-chain': [15, 28, 40],
  'tower-hanoi': [200, 450, 700],
  'anagram-scramble': [20, 45, 70],
  'word-builder': [15, 35, 60],
  'periodic-quest': [15, 28, 40],
  'capital-quiz': [15, 28, 40],
  'math-safari': [20, 45, 70],
  'memory-match': [100, 250, 420],
  'word-search': [60, 140, 220],
  'non-trivial': [15, 28, 40],
  'blow-cartridge': [10, 22, 35],
  'kings-cup': [8, 20, 36],
  'never-have-i': [8, 20, 35],
  'most-likely': [6, 16, 28],
  'ride-the-bus': [15, 40, 70],
  'power-hour': [150, 350, 500],
  'buzz-21': [15, 40, 70],
  'truth-or-dare': [10, 30, 60],
  'higher-lower': [15, 40, 70],
  'two-truths': [20, 50, 80],
  'rom-loader': [0, 0, 1],
  'ai-sandbox': [0, 0, 1]
};

/**
 * Family copy keyed by brain-guide skill theme.
 * feel = what this band means in human terms
 * tip = what to do next (especially for rough)
 */
const FAMILY = {
  memory: {
    skill: 'short-term and working memory',
    rough: {
      title: 'COLD START',
      feel: 'Your mind dropped the sequence before you could play it back. That is normal on a first pass — the load spiked past what you were holding.',
      tip: 'Play one quieter round. Chunk items in twos or threes, and say them out loud once before answering.'
    },
    warming: {
      title: 'HOLDING ON',
      feel: 'You kept some of the sequence under pressure. The workspace is opening — not locked in yet, but alive.',
      tip: 'One more round at the same difficulty. Resist speeding up until accuracy feels boring.'
    },
    solid: {
      title: 'CLEAN HOLD',
      feel: 'You held and updated information under load. That is real working-memory control — the same muscle you use when instructions stack up.',
      tip: 'Stretch one notch harder next time, or switch to a sibling memory cart to keep the skill transferable.'
    },
    sharp: {
      title: 'SHARP SPAN',
      feel: 'You carried a heavy load and still returned it clean. That is a strong short-term workspace — worth defending on the board.',
      tip: 'Sign the board if you qualify. Then try a harder trainer in the same wing while the groove is warm.'
    }
  },
  attention: {
    skill: 'attention and interference control',
    rough: {
      title: 'NOISE WON',
      feel: 'Distractors pulled your answers. The skill under test is ignoring what wants to steal the click — and today the noise got through.',
      tip: 'Slow the first three trials on purpose. Fixate the center. Treat wrong cues as practice, not failure.'
    },
    warming: {
      title: 'FILTER OPENING',
      feel: 'You caught some conflict and missed some. Attention is warming — the filter exists, it just needs reps.',
      tip: 'Do one short session focusing only on incongruent / hard trials. Easy trials teach less.'
    },
    solid: {
      title: 'CLEAN FILTER',
      feel: 'You kept the target in view while neighbors lied. That is selective attention under pressure — useful anywhere a screen shouts at you.',
      tip: 'Keep the streak honest: one more round, same rules, no heroics.'
    },
    sharp: {
      title: 'LOCKED IN',
      feel: 'Interference barely dented you. Hand and mind stayed on the signal. That is a crisp attention read.',
      tip: 'Celebrate it. Then pick a harder attention cart so the skill does not plateau on easy wins.'
    }
  },
  'hand-eye': {
    skill: 'hand–eye timing and coordination',
    rough: {
      title: 'HANDS LATE',
      feel: 'Eyes saw it; hands arrived late — or early. Coordination is a timing problem, not a character flaw.',
      tip: 'Stand or sit still. Aim for smooth paths, not panic taps. Three calm rounds beat one frantic one.'
    },
    warming: {
      title: 'FINDING THE BEAT',
      feel: 'Some hits landed clean. The loop between seeing and moving is starting to sync.',
      tip: 'Watch the target center, not your finger. Let the hand follow the eye.'
    },
    solid: {
      title: 'IN THE POCKET',
      feel: 'You mapped vision to motion under a clock. That is honest hand–eye calibration — the same feel as catching a key tossed across a desk.',
      tip: 'One more round focusing on consistency, not a personal-best chase.'
    },
    sharp: {
      title: 'SURGEON HANDS',
      feel: 'Fast and precise. Your timing loop is tight — see, decide, move, without the flinch.',
      tip: 'Sign if you made the board. Rest ten seconds, then prove it was not luck.'
    }
  },
  reasoning: {
    skill: 'quick cognitive reasoning',
    rough: {
      title: 'GUESS MODE',
      feel: 'You reached for the first answer that felt right. System 1 talked; System 2 did not get a turn.',
      tip: 'On the next round, force a one-breath pause before every choice. Name the rule you are using out loud.'
    },
    warming: {
      title: 'RULES FORMING',
      feel: 'Some patterns clicked. Reasoning is waking — you are between lucky guesses and a real method.',
      tip: 'Write (or whisper) the rule before you tap. If you cannot say it, you do not have it yet.'
    },
    solid: {
      title: 'CLEAR LOGIC',
      feel: 'You found structure under a clock. That is quick reasoning with a spine — not vibes, not freeze.',
      tip: 'Keep the method. Harder puzzles next; same pause discipline.'
    },
    sharp: {
      title: 'FAST MIND',
      feel: 'You saw the rule early and ran it clean. That is sharp cognitive control — satisfying for a reason.',
      tip: 'Own it. Then pick a tougher logic cart so the win does not become a comfort habit.'
    }
  },
  planning: {
    skill: 'spatial planning and foresight',
    rough: {
      title: 'LOCAL FIXES',
      feel: 'You solved the cell in front of you and broke the path behind you. Planning needs a whole-board glance first.',
      tip: 'Before the first move, name the end state. Protect finished rows or corners — do not reopen them for a cheap swap.'
    },
    warming: {
      title: 'MAP OPENING',
      feel: 'You planned some moves ahead. The board is starting to feel like a route, not a pile of tiles.',
      tip: 'Spend five silent seconds staring before you move. Speed comes after the map.'
    },
    solid: {
      title: 'ROUTE HELD',
      feel: 'You kept a plan under changing constraints. That is spatial foresight — the same habit as packing a bag without redoing it twice.',
      tip: 'Try one harder board or a sibling planning cart while the strategy is fresh.'
    },
    sharp: {
      title: 'WHOLE BOARD',
      feel: 'You saw several moves out and did not thrash. Clean planning under pressure — rare and worth a signature on the board.',
      tip: 'Sign it. Then raise the difficulty so the skill keeps earning its keep.'
    }
  },
  knowledge: {
    skill: 'recall and retrieval',
    rough: {
      title: 'BLANK SPOTS',
      feel: 'The cue did not unlock the answer. Retrieval failed — not because you are slow, but because the link is thin.',
      tip: 'After each miss, say the correct pair once with a place or story attached. Then replay only the misses.'
    },
    warming: {
      title: 'HALF MAP',
      feel: 'Some facts came back clean; others stayed foggy. The map is half-drawn.',
      tip: 'Drill the misses only. Correct answers teach less than the ones you almost had.'
    },
    solid: {
      title: 'READY RECALL',
      feel: 'You pulled answers under a clock. That is usable knowledge — available when asked, not just when reread.',
      tip: 'One more pass tomorrow beats cramming tonight.'
    },
    sharp: {
      title: 'ON DEMAND',
      feel: 'Fast, accurate retrieval. The facts showed up when called — the point of practice.',
      tip: 'Sign the board. Teach one answer to someone else; teaching locks it harder than replaying.'
    }
  },
  judgment: {
    skill: 'judgment under uncertainty',
    rough: {
      title: 'OVERCONFIDENT',
      feel: 'Your gut wrote checks your data could not cash. That gap is expensive in real life — better to meet it here.',
      tip: 'Widen every estimate on the next round. If a range feels comfortable, it is still too narrow.'
    },
    warming: {
      title: 'CALIBRATING',
      feel: 'Some bets matched reality. Judgment is learning its own error rate — that is the whole game.',
      tip: 'Track how often you were right when you felt “sure.” Feelings lie; tallies do not.'
    },
    solid: {
      title: 'HONEST BETS',
      feel: 'You sized uncertainty without freezing. That is calibrated judgment — rare and bankable.',
      tip: 'Keep logging. Calibration is a habit, not a mood.'
    },
    sharp: {
      title: 'WELL CALIBRATED',
      feel: 'Your confidence matched your hit rate. That is the adult skill behind good decisions.',
      tip: 'Protect it. One cocky round can undo a week of honesty — stay wide on purpose.'
    }
  },
  social: {
    skill: 'social read and party rhythm',
    rough: {
      title: 'ROOM STILL COLD',
      feel: 'The prompts did not land, or the group never found a tempo. Party games need a warm room more than a clever player.',
      tip: 'Pick an easier deck. Read the card out loud once before anyone drinks or votes. Lower the stakes for two rounds.'
    },
    warming: {
      title: 'ICE BREAKING',
      feel: 'A few laughs, a few stalls. The room is waking up.',
      tip: 'Keep cards short. Pass the phone. Let quiet people answer first once.'
    },
    solid: {
      title: 'GOOD TABLE',
      feel: 'The group found a rhythm. You read the room well enough to keep play moving — that is social skill, not trivia.',
      tip: 'Quit while the energy is high. One more deck only if everyone leans in.'
    },
    sharp: {
      title: 'HOST MODE',
      feel: 'You carried the table. Timing, tone, and turn-taking all clicked — the rare “this was actually fun” round.',
      tip: 'Note which deck worked. Reuse it next gathering; do not invent chaos for its own sake.'
    }
  },
  timing: {
    skill: 'timing and rhythm',
    rough: {
      title: 'OFF THE BEAT',
      feel: 'You pressed when the window was already gone — or before it opened. Timing is a feel you rebuild, not a lecture.',
      tip: 'Watch one full cycle without pressing. Then take the next window late on purpose — late teaches more than early.'
    },
    warming: {
      title: 'CATCHING RHYTHM',
      feel: 'Some windows you nailed. The beat is audible now.',
      tip: 'Breathe out on the press. Tension in the shoulders ruins timing.'
    },
    solid: {
      title: 'ON THE BEAT',
      feel: 'You met the window cleanly more often than not. Hand and mind shared a clock.',
      tip: 'One more round for consistency. Ignore the high-score itch for sixty seconds.'
    },
    sharp: {
      title: 'METRONOME',
      feel: 'Presses landed inside the window like they belonged there. That is trained timing.',
      tip: 'Sign it. Then rest — sharp timing fades when you chase tilt.'
    }
  },
  generic: {
    skill: 'focused practice',
    rough: {
      title: 'ROUGH ROUND',
      feel: 'This pass did not stick. Everyone has those — the useful part is what you change next.',
      tip: 'Replay once at half speed or with one rule: accuracy first. Then stop for today if frustration rises.'
    },
    warming: {
      title: 'WARMING UP',
      feel: 'Pieces of the skill showed up. You are in the middle of learning, which is exactly where practice belongs.',
      tip: 'One more short round. Stop while you still want another.'
    },
    solid: {
      title: 'SOLID READ',
      feel: 'You put in a clean, honest round. That is the kind of score that makes coming back feel fair.',
      tip: 'Keep the method. Stretch difficulty only when this level feels easy twice in a row.'
    },
    sharp: {
      title: 'SHARP EDGE',
      feel: 'Strong round. You earned the right to feel good about this one — without pretending it rewired your whole life.',
      tip: 'Sign the board if you qualify. Then pick a different cart so the win stays a win, not a loop.'
    }
  }
};

function familyFor(gameId) {
  const label = (BRAIN_GUIDES[gameId]?.label || '').toLowerCase();
  if (/memory|span|recall|loci|scanning|operation|chimp|sternberg/.test(label)) return 'memory';
  if (/attention|inhibition|impulse|interference|flanker|stroop|posner|change|search|schulte/.test(label)) return 'attention';
  if (/hand|aim|motor|reaction|reflex|coordination|tracking/.test(label)) return 'hand-eye';
  if (/timing|rhythm|flappy|anticipation|prediction/.test(label)) return 'timing';
  if (/planning|rotation|spatial|tower|sudoku|fifteen|snake|tetris|2048|route|constraint/.test(label)) return 'planning';
  if (/reason|logic|pattern|hypothesis|matrix|reflection|probability|number sense|deduc/.test(label)) return 'reasoning';
  if (/calibrat|risk|judgment|gambling|blackjack/.test(label)) return 'judgment';
  if (/party|social|confession|prompt|vote|deception|host/.test(label)) return 'social';
  if (/retriev|vocabulary|symbol|geographic|trivia|knowledge|elaborative/.test(label)) return 'knowledge';
  if (/party|cup|never|likely|bus|hour|buzz|truth|higher|two-truths|kings/.test(gameId)) return 'social';
  return 'generic';
}

function bandKey(score, cuts) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'warming';
  if (n < cuts[0]) return 'rough';
  if (n < cuts[1]) return 'warming';
  if (n < cuts[2]) return 'solid';
  return 'sharp';
}

function defaultCuts(max) {
  if (!Number.isFinite(max) || max <= 1) return [0, 0, 1];
  if (max >= 10000) return [Math.round(max * 0.02), Math.round(max * 0.08), Math.round(max * 0.2)];
  if (max >= 1000) return [Math.round(max * 0.12), Math.round(max * 0.35), Math.round(max * 0.65)];
  if (max <= 40) {
    return [
      Math.max(1, Math.floor(max * 0.25)),
      Math.max(2, Math.floor(max * 0.5)),
      Math.max(3, Math.floor(max * 0.75))
    ];
  }
  return [Math.round(max * 0.2), Math.round(max * 0.45), Math.round(max * 0.7)];
}

/**
 * @param {string|null} gameId
 * @param {number|null} score
 * @returns {null | {
 *   band: 'rough'|'warming'|'solid'|'sharp',
 *   title: string,
 *   skill: string,
 *   range: string,
 *   feel: string,
 *   tip: string,
 *   tone: 'rough'|'ok'|'good'
 * }}
 */
export function explainScore(gameId, score) {
  if (gameId == null || score == null || !Number.isFinite(Number(score))) return null;
  if (gameId === 'about-dr-non' || gameId === 'rom-loader' || gameId === 'ai-sandbox') return null;

  const cuts = CUTS[gameId] || defaultCuts(100);
  const band = bandKey(Number(score), cuts);
  const famKey = familyFor(gameId);
  const fam = FAMILY[famKey] || FAMILY.generic;
  const copy = fam[band];
  const guide = BRAIN_GUIDES[gameId];
  const skill = guide?.label ? guide.label.toLowerCase() : fam.skill;

  const range = `Rough < ${cuts[0]} · Warming ${cuts[0]}–${cuts[1] - 1} · Solid ${cuts[1]}–${cuts[2] - 1} · Sharp ≥ ${cuts[2]}`;

  return {
    band,
    title: copy.title,
    skill,
    range,
    feel: copy.feel,
    tip: copy.tip,
    tone: band === 'rough' ? 'rough' : (band === 'warming' ? 'ok' : 'good')
  };
}

/** For tests — every scoring catalog id should resolve a readout. */
export function hasScoreProfile(gameId) {
  if (gameId === 'about-dr-non' || gameId === 'rom-loader' || gameId === 'ai-sandbox') return true;
  return Boolean(CUTS[gameId] || BRAIN_GUIDES[gameId]);
}
