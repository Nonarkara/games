/**
 * Dr Non — Non-Gaming System · Main coordinator
 * Floor plan: four wings (TRAIN / ARCADE / LEARN / LABS) + dense bay rows.
 * Wing clicks bind to .cabinet-wing; cartridge rows are .select-row.
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
import { renderArcadeBreakout, renderArcadePong, renderSudokuSprint, renderFifteenPuzzle } from './games/openSourceGames.js';
import { renderStroop, renderSimon, renderAnagram, renderPeriodicQuest, renderCapitalQuiz, renderNumberChain, renderTowerHanoi, renderWordBuilder } from './games/eduGames.js';
import { renderNonTrivial } from './games/labsGames.js';
import { renderBlowIntoTheCartridge } from './games/nineties.js';
import {
  renderDualNBack, renderSchulteTable, renderAimTrainer,
  renderGoNoGo, renderDigitSpan, renderMentalMath, renderVisualSearch,
  renderCorsiBlocks, renderFlanker, renderMemoryPalace
} from './games/trainerGames.js';
import { renderAbout } from './games/about.js';
import { renderTrailMaking, renderMentalRotation, renderIowaGambling } from './games/ngsNewTrainers.js';
import { renderKingsCup, renderNeverHaveIEver, renderMostLikelyTo } from './games/ngsDrinkingGames.js';
import { renderCognitiveReflection, renderRavenMatrices, renderSternberg, renderNumberSense } from './games/ngsNewTrainers2.js';
import { renderRideTheBus, renderPowerHour, renderBuzz, renderTruthOrDare, renderHigherLower, renderTwoTruths } from './games/ngsDrinkingGames2.js';
import { renderWCST, renderTowerOfLondon, renderMindEyes } from './games/ngsNewTrainers3.js';
import { renderPosnerCueing, renderChangeBlindness, renderOperationSpan } from './games/ngsAttentionSuite.js';
import { renderChimpTest, renderCalibration, renderMontyHall } from './games/ngsCuriositySuite.js';
import { bindModalUX, GameSession } from './ui.js';
import { getBrainGuide, PAPER_LINKS, TRANSFER_CAVEAT } from './brainGuides.js';

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
  labs: { title: 'LABS', sub: 'Hand-curated rooms. Friends, parties, private packs, drinking prompts. 18+ for the drinking set.' },
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
  { id: 'corsi-blocks', code: 'CRS', title: 'Corsi Blocks', wing: 'train', category: 'memory-focus', domain: 'Spatial span', age: 'Teen+', desc: 'Watch the path light up, then tap it back. Span grows until it breaks.', paper: 'Corsi 1972', tags: ['Spatial', 'Working memory'], renderer: renderCorsiBlocks },
  { id: 'memory-palace', code: 'MPL', title: 'Memory Palace', wing: 'train', category: 'memory-focus', domain: 'Method of loci', age: 'Teen+', desc: 'Walk a fixed house. Plant objects at loci. Walk it again and name what lived where.', paper: 'Yates 1966', tags: ['Loci', 'Episodic'], renderer: renderMemoryPalace },
  { id: 'flanker', code: 'FLK', title: 'Flanker', wing: 'train', category: 'memory-focus', domain: 'Selective attention', age: 'Teen+', desc: 'Report the center arrow. Ignore the flanks — especially when they disagree.', paper: 'Eriksen 1974', tags: ['Attention', 'Interference'], renderer: renderFlanker },
  { id: 'aim-trainer', code: 'AIM', title: 'Aim Trainer', wing: 'train', category: 'skills', domain: 'Hand-eye', age: 'All', desc: 'Thirty seconds of targets. Average reaction time stays on the board.', paper: 'Dye 2009', tags: ['Reaction', 'Precision'], renderer: renderAimTrainer },
  { id: 'mental-math', code: 'MMX', title: 'Mental Math', wing: 'train', category: 'math-logic', domain: 'Fluency', age: '10+', desc: '45-second arithmetic sprint. Speed under accuracy pressure.', tags: ['Arithmetic', 'Speed'], renderer: renderMentalMath },
  { id: 'type-rush', code: 'TYP', title: 'Type Rush', wing: 'train', category: 'skills', domain: 'Keyboard fluency', age: '8+', desc: '30-second typing drill with live WPM and accuracy.', tags: ['Typing', 'WPM'], renderer: renderTypeRush },
  { id: 'reflex-matrix', code: 'RFX', title: 'Reflex Matrix', wing: 'train', category: 'casual-friv', domain: 'Coordination', age: 'All', desc: 'Tap glowing cells before they fade. Speed escalates each wave.', tags: ['Reflex', 'Coordination'], renderer: renderReflexMatrix },

  { id: 'trail-making', code: 'TMT', title: 'Trail Making', wing: 'train', category: 'memory-focus', domain: 'Task switching', age: 'Teen+', desc: 'Part A: 1→2→3… Part B: 1→A→2→B alternating. Errors reset the trail.', paper: 'Reitan 1958', tags: ['Task switching', 'Set shifting'], renderer: renderTrailMaking },
  { id: 'mental-rotation', code: 'ROT', title: 'Mental Rotation', wing: 'train', category: 'memory-focus', domain: 'Spatial rotation', age: 'Teen+', desc: 'Same shape rotated? Or mirrored? 20 trials, 8s each.', paper: 'Shepard 1971', tags: ['Spatial', 'Rotation'], renderer: renderMentalRotation },
  { id: 'iowa-gambling', code: 'IGT', title: 'Iowa Gambling Task', wing: 'train', category: 'memory-focus', domain: 'Risk learning', age: '18+', desc: '40 cards, 4 decks, two good and two bad. Learn which.', paper: 'Bechara 1994', tags: ['Risk', 'Somatic markers', 'Decision'], renderer: renderIowaGambling },
  { id: 'cog-reflection', code: 'CRT', title: 'Cognitive Reflection', wing: 'train', category: 'memory-focus', domain: 'System 1 override', age: 'Teen+', desc: 'Three problems with a System-1 lure and a System-2 answer. The classic Frederick 2005 CRT.', paper: 'Frederick 2005', tags: ['Reflection', 'System 1/2', 'Bias'], renderer: renderCognitiveReflection },
  { id: 'raven-matrices', code: 'RPM', title: "Raven's Matrices", wing: 'train', category: 'memory-focus', domain: 'Fluid intelligence', age: 'Teen+', desc: '3x3 pattern grid, one cell missing. Pick the option that completes the rule.', paper: 'Raven 1936', tags: ['Fluid gF', 'Pattern', 'Reasoning'], renderer: renderRavenMatrices },
  { id: 'sternberg', code: 'STM', title: 'Sternberg Memory Scan', wing: 'train', category: 'memory-focus', domain: 'Memory scanning', age: 'Teen+', desc: 'Memorize 3-5 letters. Then a probe: was it in the set? Set size escalates.', paper: 'Sternberg 1966', tags: ['Working memory', 'Scanning', 'Probe'], renderer: renderSternberg },
  { id: 'number-sense', code: 'ANS', title: 'Number Sense (ANS)', wing: 'train', category: 'memory-focus', domain: 'Approximate number', age: 'All', desc: 'Two dot clouds. Click the side with more. Ratio narrows as you succeed.', paper: 'Halberda 2008', tags: ['Number sense', 'Estimation', 'Ratio'], renderer: renderNumberSense },
  { id: 'wcst', code: 'WST', title: "Card Sorting (WCST)", wing: 'train', category: 'memory-focus', domain: 'Set shifting', age: 'Teen+', desc: 'Sort by the hidden rule. It changes every 5 correct sorts. Notice the change.', paper: 'Berg 1948', tags: ['Set shifting', 'Flexibility'], renderer: renderWCST },
  { id: 'tower-london', code: 'TOL', title: 'Tower of London', wing: 'train', category: 'memory-focus', domain: 'Planning', age: 'Teen+', desc: 'Three pegs, three balls. Match the target in the fewest moves.', paper: 'Shallice 1982', tags: ['Planning', 'Executive'], renderer: renderTowerOfLondon },
  { id: 'mind-eyes', code: 'EYE', title: 'Mind in the Eyes', wing: 'train', category: 'memory-focus', domain: 'Theory of Mind', age: 'Teen+', desc: 'Pick the best word for the expression. Tests empathy and social cognition.', paper: 'Baron-Cohen 2001', tags: ['ToM', 'Emotion', 'Social'], renderer: renderMindEyes },  { id: 'posner-cueing', code: 'PSN', title: 'Posner Cueing', wing: 'train', category: 'memory-focus', domain: 'Covert attention', age: 'Teen+', desc: 'A box flashes, then a dot. Most flashes tell the truth; some lie. Measures the cost of looking the wrong way.', paper: 'Posner 1980', tags: ['Attention', 'Orienting', 'Reaction'], renderer: renderPosnerCueing },
  { id: 'change-blindness', code: 'CBL', title: 'Change Blindness', wing: 'train', category: 'memory-focus', domain: 'Change detection', age: 'All', desc: 'One square keeps changing. A blank flash hides the motion your eye would normally catch.', paper: 'Rensink 1997', tags: ['Attention', 'Flicker'], renderer: renderChangeBlindness },
  { id: 'operation-span', code: 'OSP', title: 'Operation Span', wing: 'train', category: 'memory-focus', domain: 'Complex span', age: 'Teen+', desc: 'Check an equation, hold a letter, repeat. Recall the letters in order — storage while processing.', paper: 'Turner & Engle 1989', tags: ['Working memory', 'Complex span'], renderer: renderOperationSpan },
  { id: 'chimp-test', code: 'CHM', title: 'Chimp Test', wing: 'train', category: 'memory-focus', domain: 'Masked recall', age: 'All', desc: 'Digits vanish behind blanks the moment you tap 1. Finish from memory. Ayumu the chimp holds 9.', paper: 'Inoue 2007', tags: ['Working memory', 'Iconic', 'Braggable'], renderer: renderChimpTest },
  { id: 'calibration', code: 'CAL', title: 'Calibration', wing: 'train', category: 'memory-focus', domain: 'Judgment', age: 'Teen+', desc: 'Ten 90%-confidence intervals. Calibrated people trap 9. Most people trap 4 — that gap runs the world.', paper: 'Lichtenstein 1977', tags: ['Overconfidence', 'Kahneman', 'Judgment'], renderer: renderCalibration },
  // ── ARCADE ─────────────────────────────────────────────────────────────
  { id: 'cyber-tetris', code: 'TET', title: 'Cyber Tetris 1984', wing: 'arcade', category: 'classics', domain: 'Spatial', age: 'All', desc: 'Falling tetrominoes, line clears, combo multipliers.', tags: ['Classic', 'Puzzle'], renderer: renderCyberTetris },
  { id: 'arcade-breakout', code: 'BRK', title: 'Breakout 1976', wing: 'arcade', category: 'classics', domain: 'Prediction', age: 'All', desc: 'Shape rebound angles, keep the rally alive, clear the wall.', tags: ['Classic', 'Open source', 'Touch'], credit: 'Ania Kubow · MIT', source: 'https://github.com/kubowania/breakout', renderer: renderArcadeBreakout },
  { id: 'arcade-pong', code: 'PNG', title: 'Pong 1972', wing: 'arcade', category: 'classics', domain: 'Anticipation', age: 'All', desc: 'Read the ball early and race the CPU to seven.', tags: ['Classic', 'Open source', 'Touch'], credit: 'Jake Gordon · MIT', source: 'https://github.com/jakesgordon/javascript-pong', renderer: renderArcadePong },
  { id: 'cyber-pacman', code: 'PAC', title: 'Cyber Pac-Man 1980', wing: 'arcade', category: 'classics', domain: 'Maze', age: 'All', desc: 'Dots, power pellets, four ghost AIs.', tags: ['Classic', 'Arcade'], renderer: renderCyberPacman },
  { id: 'cyber-snake', code: 'SNK', title: 'Retro Cyber Snake', wing: 'arcade', category: 'retro-vault', domain: 'Grid', age: 'All', desc: 'Grow, turn, do not bite your own tail.', tags: ['Retro', 'Classic'], renderer: renderRetroSnake },
  { id: 'space-defender', code: 'INV', title: 'Space Defender', wing: 'arcade', category: 'retro-vault', domain: 'Shooter', age: 'All', desc: 'Laser turret vs invader waves.', tags: ['Shooter', 'Space'], renderer: renderSpaceDefender },
  { id: 'flappy-bird', code: 'FLP', title: 'Flappy Cyber Bird', wing: 'arcade', category: 'casual-friv', domain: 'Timing', age: 'All', desc: 'Tap-to-fly through pipes. Precision over panic.', tags: ['Casual', 'Timing'], renderer: renderFlappyBird },
  { id: 'minesweeper', code: 'MNE', title: 'Minesweeper Pro', wing: 'arcade', category: 'casual-friv', domain: 'Logic', age: '10+', desc: 'Flag mines, read the numbers, clear the grid.', tags: ['Logic', 'Grid'], renderer: renderMinesweeper },
  { id: 'slide-2048', code: '204', title: 'Slide 2048', wing: 'arcade', category: 'casual-friv', domain: 'Planning', age: 'All', desc: 'Merge matching tiles. Reach 2048 without boxing yourself in.', tags: ['Strategy', 'Merge'], renderer: renderSlide2048 },
  { id: 'sudoku-sprint', code: 'SDK', title: 'Sudoku Sprint', wing: 'learn', category: 'math-logic', domain: 'Constraint logic', age: '10+', desc: 'Fill a small board under a clock. Every digit must earn its cell.', tags: ['Logic', 'Open source'], credit: 'robatron/sudoku.js · MIT', source: 'https://github.com/robatron/sudoku.js', renderer: renderSudokuSprint },
  { id: 'fifteen-puzzle', code: '15P', title: 'Fifteen Puzzle', wing: 'learn', category: 'math-logic', domain: 'Spatial planning', age: '8+', desc: 'Slide tiles into order. Every move is a plan under a shrinking empty cell.', tags: ['Planning', 'Open source'], credit: 'imshubhamsingh/15-puzzle · MIT', source: 'https://github.com/imshubhamsingh/15-puzzle', renderer: renderFifteenPuzzle },
  { id: 'cyber-blackjack', code: 'BJ21', title: 'Cyber Blackjack 21', wing: 'arcade', category: 'adult-mind', domain: 'Cards', age: '18+', desc: 'Hit, stand, manage the bankroll against the dealer.', tags: ['Cards', 'Casino'], renderer: renderBlackjack },
  { id: 'trivia-master', code: 'TRV', title: 'Trivia Master', wing: 'arcade', category: 'adult-mind', domain: 'Knowledge', age: 'Teen+', desc: 'History, sci-fi, science, gaming culture.', tags: ['Trivia', 'Quiz'], renderer: renderTriviaMaster },
  { id: 'pattern-breaker', code: 'PTN', title: 'Pattern Breaker', wing: 'arcade', category: 'adult-mind', domain: 'Deduction', age: 'Teen+', desc: 'Crack a hidden 4-node path with Mastermind-style hints.', tags: ['Logic', 'Deduction'], renderer: renderPatternBreaker },
  { id: 'rom-loader', code: 'ROM', title: 'ROM / SWF Inspector', wing: 'arcade', category: 'classics', domain: 'Files', age: 'All', desc: 'Drop a legal .nes / .gb / .sfc / .swf backup — header metadata only.', tags: ['Local', 'Inspector'], renderer: renderRomLoader },
  { id: 'ai-sandbox', code: 'AIG', title: 'AI Game Builder', wing: 'arcade', category: 'ai-studio', domain: 'Sandbox', age: 'All', desc: 'Prompt or pick a preset; get a playable micro-game live.', tags: ['AI', 'Sandbox'], renderer: renderAIGameStudio },

  // ── LEARN ──────────────────────────────────────────────────────────────
  { id: 'monty-hall', code: 'MTY', title: 'Monty Hall', wing: 'learn', category: 'math-logic', domain: 'Probability', age: 'All', desc: 'Stay or switch? 15 rounds and a running tally settle the argument a thousand PhDs lost in 1990.', paper: 'Selvin 1975', tags: ['Probability', 'Bayes', 'Argument-settler'], renderer: renderMontyHall },
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
  { id: 'kings-cup', code: 'KNG', title: "King's Cup", wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '52-card ring of fire. Each card = a rule. Draw, deal, drink.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderKingsCup },
  { id: 'never-have-i', code: 'NHI', title: 'Never Have I Ever', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '50 statements. Fingers down if you have. Last finger up wins.', tags: ['Party', 'Confession', 'Drinking'], renderer: renderNeverHaveIEver },
  { id: 'most-likely', code: 'MLT', title: 'Most Likely To', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '40 prompts. Everyone points. Most fingers pointed drinks.', tags: ['Party', 'Group vote', 'Drinking'], renderer: renderMostLikelyTo },
  { id: 'ride-the-bus', code: 'BUS', title: 'Ride the Bus', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '4 phases: red/black, higher/lower, inside/outside, guess the suit. Survive all four.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderRideTheBus },
  { id: 'power-hour', code: 'PWH', title: 'Power Hour', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '60 prompts on a 60-minute timer. One sip per minute.', tags: ['Party', 'Timer', 'Drinking'], renderer: renderPowerHour },
  { id: 'buzz-21', code: 'BUZ', title: 'Buzz (21)', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Count to 21. +1, +2, or +3 each turn. Whoever says 21 drinks.', tags: ['Party', 'Counting', 'Drinking'], renderer: renderBuzz },
  { id: 'truth-or-dare', code: 'TOD', title: 'Truth or Dare', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '30 truths, 30 dares. Answer or drink.', tags: ['Party', 'Confession', 'Drinking'], renderer: renderTruthOrDare },
  { id: 'higher-lower', code: 'HIL', title: 'Higher or Lower', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Single deck streak. Guess the next card. Drink on a wrong guess.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderHigherLower },
  { id: 'two-truths', code: '2T1', title: '2 Truths & a Lie', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Two true, one false. The group votes on the lie.', tags: ['Party', 'Deception', 'Drinking'], renderer: renderTwoTruths },
  // ── META ───────────────────────────────────────────────────────────────
  { id: 'about-dr-non', code: 'WHY', title: 'About Dr Non', wing: 'meta', category: 'about', domain: 'Signal', age: 'Everyone', desc: 'MIT Wii photo, a life of games, and why honesty is the product.', tags: ['Story'], renderer: renderAbout }
];

class NgsApp {
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
    const played = document.querySelector('#played-count');
    if (played) played.textContent = StorageService.getData().gamesPlayed || 0;
  }

  renderHeader() {
    const headerEl = document.querySelector('#app-header');
    if (!headerEl) return;
    const stats = StorageService.getData();
    headerEl.innerHTML = `
      <a class="arcade-brand" href="#top" aria-label="Dr Non — Non-Gaming System, home">
        <span class="arcade-brand-disc">NG<span></span></span>
        <span><b>DR NON</b><small>NON-GAMING SYSTEM</small></span>
      </a>
      <div class="arcade-tools">
        <label class="arcade-search">
          <span>FIND</span>
          <input id="search-input" type="search" placeholder="Title, skill, or code" value="${this.searchQuery}" aria-label="Search games" />
        </label>
        <p class="arcade-play-count"><b id="played-count">${stats.gamesPlayed || 0}</b><span>PLAYS</span></p>
        <button id="about-link" class="arcade-about-link" type="button" aria-label="Open the About panel">WHY</button>
        <button id="sound-toggle-btn" class="arcade-sound" type="button" aria-label="Toggle sound">${soundFx.muted ? 'MUTED' : 'SOUND'}</button>
      </div>
    `;
  }

  renderAttract() {
    const el = document.querySelector('#ngs-hud');
    if (!el) return;
    const feature = this.featuredGame();
    const high = feature ? StorageService.getHighScore(feature.id) : 0;
    const wingLabel = this.activeWing === 'all' ? 'FULL FLOOR' : (WING_META[this.activeWing]?.title || this.activeWing.toUpperCase());
    const guide = feature ? getBrainGuide(feature) : null;

    el.innerHTML = `
      <figure class="attract-hero">
        <img
          src="./public/insert-coin-hero.jpg"
          width="1024"
          height="768"
          alt="Dr Non in a suit inserting a coin into a Street Fighter II cabinet"
          decoding="async"
          fetchpriority="high"
        />
        <figcaption class="attract-copy" id="top">
          <p class="attract-kicker">${this.playableCount()} CARTS · 16-BIT FLOOR · BRIEFING ON EVERY TITLE</p>
          <h1>INSERT<br><em>COIN</em></h1>
          <p class="attract-line">Kill time. Keep the mind.</p>
          <p class="attract-sub">Chunky carts. Honest claims. Every title opens with the skill it trains, how long a round takes, and the Simons caveat — far transfer is contested. Near transfer is real.</p>
        </figcaption>
      </figure>
      ${feature ? `
        <button type="button" class="attract-feature" data-game="${feature.id}" aria-label="Load ${feature.title}">
          <span class="attract-feature-kicker">TODAY'S CARTRIDGE · ${wingLabel}</span>
          <span class="attract-feature-code">${feature.code}</span>
          <span class="attract-feature-title">${feature.title}</span>
          <span class="attract-feature-skill">${guide.label} · ${guide.minutes} · HI ${high}</span>
          <span class="attract-feature-cta">LOAD GAME</span>
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
      <button type="button" class="cabinet-wing route-${w.id} ${this.activeWing === w.id ? 'is-active' : ''}"
        data-wing="${w.id}" aria-pressed="${this.activeWing === w.id}">
        <span class="cabinet-wing-disc">${w.label.slice(0, 1)}</span>
        <span class="cabinet-wing-copy"><b>${w.label}</b><small>${w.blurb}</small></span>
        <span class="cabinet-wing-count">${counts[w.id]}</span>
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
    gridEl.className = 'game-library';

    if (filtered.length === 0) {
      gridEl.innerHTML = `<p class="cabinet-empty">No cartridge matches. Clear the search or pick another room.</p>`;
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
      <section class="select-block route-${wing}" data-wing="${wing}">
        <header class="select-block-header">
          <div><p>ROOM ${String(order.indexOf(wing) + 1).padStart(2, '0')}</p><h2>${WING_META[wing]?.title || wing}</h2></div>
          <p>${WING_META[wing]?.sub || ''}</p>
        </header>
        <ul class="select-list" role="listbox" aria-label="${WING_META[wing]?.title || 'Games'}">
          ${games.map(game => this.selectRow(game)).join('')}
        </ul>
      </section>
    `).join('');

    if (this.activeWing === 'all' && !this.searchQuery.trim()) {
      const about = gamesCatalog.find(g => g.id === 'about-dr-non');
      if (about) {
        gridEl.insertAdjacentHTML('beforeend', `
          <section class="select-block select-block--meta route-meta">
            <header class="select-block-header"><div><p>SIGNAL</p><h2>WHY THIS EXISTS</h2></div><p>The claim, the caveat, and the person behind the floor.</p></header>
            <ul class="select-list">${this.selectRow(about)}</ul>
          </section>`);
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
    const guide = getBrainGuide(game);
    return `
      <li class="select-row ${isFocus ? 'is-focus' : ''}" data-game="${game.id}" tabindex="0" role="option" aria-selected="${isFocus}" aria-label="${game.title}">
        <span class="select-card-top"><span class="select-code">${game.code}</span><span class="select-age">${game.age}</span></span>
        <span class="select-name">${game.title}</span>
        <span class="select-desc">${game.desc}</span>
        <span class="select-brain"><small>TRAINS</small>${guide.label}</span>
        <span class="select-card-bottom"><span>${guide.minutes}</span><span>HI ${high}</span><b>LOAD</b></span>
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
    const guide = getBrainGuide(game);
    const sourceUrl = game.source || PAPER_LINKS[game.paper];
    const sourceLabel = game.credit || game.paper;

    // About is a reading surface, not a drill — skip the briefing gate.
    if (game.id === 'about-dr-non') {
      game.renderer(container, closeGame);
      return;
    }

    const renderBriefing = () => {
      container.innerHTML = `
        <article class="brain-briefing route-${game.wing}" aria-labelledby="briefing-title">
          <header class="briefing-header">
            <div class="briefing-code">${game.code}</div>
            <div><p>${game.wing.toUpperCase()} · ${guide.minutes} · ${game.age}</p><h2 id="briefing-title">${game.title}</h2></div>
            <button class="briefing-close" type="button" aria-label="Close game">CLOSE</button>
          </header>
          <div class="briefing-grid">
            <div class="briefing-primary">
              <p class="briefing-label">THE BRAIN BRIEFING</p>
              <h3>${guide.label}</h3>
              <div class="briefing-step"><b>1</b><div><span>WHAT YOU DO</span><p>${game.desc}</p></div></div>
              <div class="briefing-step"><b>2</b><div><span>WHAT YOU PRACTISE</span><p>${guide.practice}</p></div></div>
              <div class="briefing-step"><b>3</b><div><span>WHY IT MATTERS</span><p>${guide.why}</p></div></div>
            </div>
            <aside class="briefing-side">
              <p class="briefing-label">COACH NOTE</p>
              <blockquote>${guide.tip}</blockquote>
              <div class="briefing-caveat"><span>HONEST CLAIM</span><p>${TRANSFER_CAVEAT}</p></div>
              ${sourceUrl ? `<a class="briefing-source" href="${sourceUrl}" target="_blank" rel="noopener">${sourceLabel || 'VIEW SOURCE'}<i></i></a>` : ''}
              <button class="briefing-play" type="button">START ONE ROUND</button>
            </aside>
          </div>
        </article>`;
      container.querySelector('.briefing-close').onclick = closeGame;
      container.querySelector('.briefing-play').onclick = renderGame;
    };

    const renderGame = () => {
      container.innerHTML = `
        <div class="game-session-shell route-${game.wing}">
          <header class="game-session-bar">
            <div><b>${game.code}</b><span>${game.title}</span></div>
            <details>
              <summary>BRAIN NOTE</summary>
              <div><b>${guide.label}</b><p>${guide.practice}</p><small>${TRANSFER_CAVEAT}</small></div>
            </details>
            <button type="button">EXIT</button>
          </header>
          <div class="game-session-stage"></div>
        </div>`;
      const stage = container.querySelector('.game-session-stage');
      const recordScore = (s) => { sessionScore = Math.max(sessionScore, s | 0); };
      container._recordScore = recordScore;
      stage._recordScore = recordScore;
      container.querySelector('.game-session-bar > button').onclick = closeGame;
      game.renderer(stage, closeGame);
    };

    renderBriefing();
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
        return;
      }

      if (e.target.id === 'about-link' || e.target.closest('#about-link')) {
        const about = gamesCatalog.find(g => g.id === 'about-dr-non');
        if (about) {
          soundFx.playClick();
          this.launchGame('about-dr-non');
        }
        return;
      }
    });
  }
}

function bootApp() {
  new NgsApp();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
