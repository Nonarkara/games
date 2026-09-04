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
import { renderMentalMathPro } from './games/mentalMathPro.js';
import { renderMentalMathThai } from './games/mentalMathThai.js';
import { renderPatternBreaker, renderReflexMatrix, renderTypeRush, renderSlide2048 } from './games/curatedGames.js';
import { renderArcadeBreakout, renderArcadePong, renderSudokuSprint, renderFifteenPuzzle } from './games/openSourceGames.js';
import { renderStroop, renderStroopPro, renderColorMarchPro, renderSimon, renderAnagram, renderPeriodicQuest, renderCapitalQuiz, renderNumberChain, renderTowerHanoi, renderWordBuilder } from './games/eduGames.js';
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
import { renderAsteroids, renderFrogger, renderConnectFour, renderSolitaire } from './games/ngsArcade2.js';
import { renderWordGuess, renderMateInOne, renderEarTrainer, renderMorseCode } from './games/ngsLearn2.js';
import { renderStopSignal, renderWarehousePush, renderLightsOut } from './games/ngsExpansionSuite.js';
import { renderNonogram, renderNim, renderMake24 } from './games/ngsLogicSuite.js';
import { renderTicTacToe } from './games/ticTacToe.js';
import { renderRockPaperScissors } from './games/rockPaperScissors.js';
import { renderMemoryMatrix } from './games/memoryMatrix.js';
import { renderReactionGate, renderOneBack, renderOddball, renderBackwardSpan } from './games/ngsDailySuite.js';
import { bindModalUX, GameSession } from './ui.js';
import { getBrainGuide, PAPER_LINKS, TRANSFER_CAVEAT } from './brainGuides.js';
import { aliasesFor } from './searchAliases.js';
import { MOODS, moodById, gamesForMood, moodsForGame } from './moods.js';
import { spriteImg } from './sprites.js';

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
  { id: 'dual-n-back', code: 'NBK', title: 'Dual N-Back', wing: 'train', category: 'memory-focus', domain: 'Working memory', age: 'Teen+', desc: 'Watch each square and letter. Tap when either matches two turns ago.', paper: 'Jaeggi 2008', tags: ['N-back', 'Research'], renderer: renderDualNBack },
  { id: 'digit-span', code: 'DSP', title: 'Digit Span', wing: 'train', category: 'memory-focus', domain: 'Capacity', age: 'Teen+', desc: 'Watch the numbers, then type them back. Each win adds one more digit.', paper: 'Miller 1956', tags: ['Capacity', 'Recall'], renderer: renderDigitSpan },
  { id: 'stroop-match', code: 'STR', title: 'Colour Match', wing: 'train', category: 'memory-focus', domain: 'Inhibition', age: '8+', desc: 'The word says RED but the ink is BLUE — tap the colour of the ink, not the word it spells.', paper: 'Stroop 1935', tags: ['Colour', 'Inhibition', 'Focus'], renderer: renderStroop },
  { id: 'stroop-match-pro', code: 'CMP', title: 'Colour Match Pro', wing: 'train', category: 'memory-focus', domain: 'Inhibition', age: 'Teen+', desc: 'Tap the ink colour. All answers are white, so the buttons cannot hint.', paper: 'Stroop 1935', tags: ['Colour', 'Inhibition', 'Focus'], renderer: renderStroopPro },
  { id: 'color-march-pro', code: 'CMR', title: 'Color March Pro', wing: 'train', category: 'memory-focus', domain: 'Interference control', age: 'Teen+', desc: 'Tap the word that spells RED. Ignore the colours on every button.', paper: 'Stroop 1935', tags: ['Color', 'Reading', 'Inhibition', 'Pro'], renderer: renderColorMarchPro },
  { id: 'go-nogo', code: 'GNG', title: 'Go / No-Go', wing: 'train', category: 'memory-focus', domain: 'Inhibition', age: 'Teen+', desc: 'Tap GO. Stay still on NOGO. A tap on NOGO costs more than a slow GO.', paper: 'Verbruggen 2008', tags: ['Inhibition', 'Impulse'], renderer: renderGoNoGo },
  { id: 'simon-seq', code: 'SIM', title: 'Simon Sequence', wing: 'train', category: 'memory-focus', domain: 'Sequence memory', age: 'All', desc: 'Watch the pattern grow, then play it back.', tags: ['Memory', 'Sequence'], renderer: renderSimon },
  { id: 'schulte-table', code: 'SCH', title: 'Schulte Table', wing: 'train', category: 'memory-focus', domain: 'Attention field', age: 'Teen+', desc: 'Tap 1 to 25 in order. Keep your eyes near the middle of the grid.', tags: ['Attention', 'Peripheral'], renderer: renderSchulteTable },
  { id: 'visual-search', code: 'VSR', title: 'Visual Search', wing: 'train', category: 'memory-focus', domain: 'Selective attention', age: 'Teen+', desc: 'Find the odd rotated letter in growing clutter.', paper: 'Green 2003', tags: ['Attention', 'Search'], renderer: renderVisualSearch },
  { id: 'corsi-blocks', code: 'CRS', title: 'Corsi Blocks', wing: 'train', category: 'memory-focus', domain: 'Spatial span', age: 'Teen+', desc: 'Watch the boxes light up, then tap them in the same order.', paper: 'Corsi 1972', tags: ['Spatial', 'Working memory'], renderer: renderCorsiBlocks },
  { id: 'memory-palace', code: 'MPL', title: 'Memory Palace', wing: 'train', category: 'memory-focus', domain: 'Method of loci', age: 'Teen+', desc: 'Place objects along a familiar route, then walk the route to recall them.', paper: 'Yates 1966', tags: ['Loci', 'Episodic'], renderer: renderMemoryPalace },
  { id: 'flanker', code: 'FLK', title: 'Flanker', wing: 'train', category: 'memory-focus', domain: 'Selective attention', age: 'Teen+', desc: 'Tap LEFT or RIGHT for the middle arrow. Ignore the arrows beside it.', paper: 'Eriksen 1974', tags: ['Attention', 'Interference'], renderer: renderFlanker },
  { id: 'aim-trainer', code: 'AIM', title: 'Aim Trainer', wing: 'train', category: 'skills', domain: 'Hand-eye', age: 'All', desc: 'Tap as many targets as you can in 30 seconds without missing.', paper: 'Dye 2009', tags: ['Reaction', 'Precision'], renderer: renderAimTrainer },
  { id: 'mental-math', code: 'MMX', title: 'Mental Math', wing: 'train', category: 'math-logic', domain: 'Fluency', age: '10+', desc: 'Solve as many short arithmetic problems as you can in 45 seconds.', tags: ['Arithmetic', 'Speed'], renderer: renderMentalMath },
  { id: 'mental-math-pro', code: 'MMP', title: 'Mental Math Pro', wing: 'train', category: 'math-logic', domain: 'Verbal fluency', age: '12+', desc: 'Read the sum in words, then type the number. Twenty-one minus sixteen is 5.', tags: ['Arithmetic', 'Verbal', 'Speed'], renderer: renderMentalMathPro },
  { id: 'mental-math-thai', code: 'MMT', title: 'Mental Math Thai', wing: 'train', category: 'math-logic', domain: 'Dual-script fluency', age: '12+', desc: 'Read ๐–๙ and 0–9 in the same problem. ๒๓ + 16, ๔๒ × ๒ — same math, two scripts.', tags: ['Arithmetic', 'Bilingual', 'Speed'], renderer: renderMentalMathThai },
  { id: 'type-rush', code: 'TYP', title: 'Type Rush', wing: 'train', category: 'skills', domain: 'Keyboard fluency', age: '8+', desc: 'Type the words on screen for 30 seconds. Faster and fewer mistakes both score.', tags: ['Typing', 'WPM'], renderer: renderTypeRush },
  { id: 'reflex-matrix', code: 'RFX', title: 'Reflex Matrix', wing: 'train', category: 'casual-friv', domain: 'Coordination', age: 'All', desc: 'Tap the lit cells before they go dark. Each wave gets faster.', tags: ['Reflex', 'Coordination'], renderer: renderReflexMatrix },

  { id: 'trail-making', code: 'TMT', title: 'Trail Making', wing: 'train', category: 'memory-focus', domain: 'Task switching', age: 'Teen+', desc: 'Connect 1→2→3, then switch between numbers and letters: 1→A→2→B.', paper: 'Reitan 1958', tags: ['Task switching', 'Set shifting'], renderer: renderTrailMaking },
  { id: 'mental-rotation', code: 'ROT', title: 'Mental Rotation', wing: 'train', category: 'memory-focus', domain: 'Spatial rotation', age: 'Teen+', desc: 'Tap SAME if the right shape is a turn of the left. Tap MIRROR if it is flipped.', paper: 'Shepard 1971', tags: ['Spatial', 'Rotation'], renderer: renderMentalRotation },
  { id: 'iowa-gambling', code: 'IGT', title: 'Iowa Gambling Task', wing: 'train', category: 'memory-focus', domain: 'Risk learning', age: '18+', desc: 'Draw from four decks. Some pay now and punish later — learn which to trust.', paper: 'Bechara 1994', tags: ['Risk', 'Somatic markers', 'Decision'], renderer: renderIowaGambling },
  { id: 'cog-reflection', code: 'CRT', title: 'Cognitive Reflection', wing: 'train', category: 'memory-focus', domain: 'System 1 override', age: 'Teen+', desc: 'Solve three short questions. The first answer that pops up is usually wrong.', paper: 'Frederick 2005', tags: ['Reflection', 'System 1/2', 'Bias'], renderer: renderCognitiveReflection },
  { id: 'raven-matrices', code: 'RPM', title: "Raven's Matrices", wing: 'train', category: 'memory-focus', domain: 'Fluid intelligence', age: 'Teen+', desc: 'One cell is missing from a 3-by-3 grid. Pick the piece that finishes the pattern.', paper: 'Raven 1936', tags: ['Fluid gF', 'Pattern', 'Reasoning'], renderer: renderRavenMatrices },
  { id: 'sternberg', code: 'STM', title: 'Sternberg Memory Scan', wing: 'train', category: 'memory-focus', domain: 'Memory scanning', age: 'Teen+', desc: 'Remember a few letters, then tap YES or NO if a letter was in that list.', paper: 'Sternberg 1966', tags: ['Working memory', 'Scanning', 'Probe'], renderer: renderSternberg },
  { id: 'number-sense', code: 'ANS', title: 'Number Sense (ANS)', wing: 'train', category: 'memory-focus', domain: 'Approximate number', age: 'All', desc: 'Tap the side with more dots. Glance — do not count.', paper: 'Halberda 2008', tags: ['Number sense', 'Estimation', 'Ratio'], renderer: renderNumberSense },
  { id: 'wcst', code: 'WST', title: "Card Sorting (WCST)", wing: 'train', category: 'memory-focus', domain: 'Set shifting', age: 'Teen+', desc: 'Sort each card by a hidden rule. After five correct, the rule changes.', paper: 'Berg 1948', tags: ['Set shifting', 'Flexibility'], renderer: renderWCST },
  { id: 'tower-london', code: 'TOL', title: 'Tower of London', wing: 'train', category: 'memory-focus', domain: 'Planning', age: 'Teen+', desc: 'Move the balls to match the picture. Use as few moves as you can.', paper: 'Shallice 1982', tags: ['Planning', 'Executive'], renderer: renderTowerOfLondon },
  { id: 'mind-eyes', code: 'EYE', title: 'Mind in the Eyes · Lite', wing: 'train', category: 'memory-focus', domain: 'Social inference', age: 'Teen+', desc: 'Tap the feeling word that matches the eyes you see.', paper: 'Baron-Cohen 2001', tags: ['Emotion', 'Social', 'Schematic'], renderer: renderMindEyes },
  { id: 'posner-cueing', code: 'PSN', title: 'Posner Cueing', wing: 'train', category: 'memory-focus', domain: 'Covert attention', age: 'Teen+', desc: 'Watch the flash, then tap when the dot appears. Some flashes lie.', paper: 'Posner 1980', tags: ['Attention', 'Orienting', 'Reaction'], renderer: renderPosnerCueing },
  { id: 'change-blindness', code: 'CBL', title: 'Change Blindness', wing: 'train', category: 'memory-focus', domain: 'Change detection', age: 'All', desc: 'Find the one square that changes while a blank flash hides the movement.', paper: 'Rensink 1997', tags: ['Attention', 'Flicker'], renderer: renderChangeBlindness },
  { id: 'operation-span', code: 'OSP', title: 'Operation Span', wing: 'train', category: 'memory-focus', domain: 'Complex span', age: 'Teen+', desc: 'Check each sum, remember the letters, then type the letters in order.', paper: 'Turner & Engle 1989', tags: ['Working memory', 'Complex span'], renderer: renderOperationSpan },
  { id: 'chimp-test', code: 'CHM', title: 'Chimp Test', wing: 'train', category: 'memory-focus', domain: 'Masked recall', age: 'All', desc: 'Tap numbered cells in order after the numbers disappear.', paper: 'Inoue 2007', tags: ['Working memory', 'Iconic', 'Braggable'], renderer: renderChimpTest },
  { id: 'calibration', code: 'CAL', title: 'Calibration', wing: 'train', category: 'memory-focus', domain: 'Judgment', age: 'Teen+', desc: 'Type a low guess and a high guess. You want the true number to sit between them.', paper: 'Lichtenstein 1977', tags: ['Overconfidence', 'Kahneman', 'Judgment'], renderer: renderCalibration },
  { id: 'stop-signal', code: 'SST', title: 'Stop Signal', wing: 'train', category: 'memory-focus', domain: 'Response cancellation', age: 'Teen+', desc: 'Start tapping LEFT or RIGHT, then freeze if STOP appears.', paper: 'Logan 1984', tags: ['Inhibition', 'Reaction', 'Adaptive'], renderer: renderStopSignal },
  { id: 'reaction-gate', code: 'RTG', title: 'Reaction Gate', wing: 'train', category: 'memory-focus', domain: 'Simple reaction', age: 'All', desc: 'Wait for the orange box, then tap it. Tapping too soon is a miss.', paper: 'Dinges 1997', tags: ['Reaction', 'Vigilance', 'Daily'], renderer: renderReactionGate },
  { id: 'one-back', code: 'NB1', title: 'One-Back', wing: 'train', category: 'memory-focus', domain: 'Working memory', age: 'All', desc: 'Tap MATCH if the square is in the same place as last turn.', paper: 'Kirchner 1958', tags: ['N-back', 'On-ramp', 'Daily'], renderer: renderOneBack },
  { id: 'oddball', code: 'ODD', title: 'Oddball', wing: 'train', category: 'memory-focus', domain: 'Rare-target attention', age: 'All', desc: 'Tap only when the rare shape appears. Ignore the common one.', paper: 'Squires 1975', tags: ['Attention', 'P300', 'Daily'], renderer: renderOddball },
  { id: 'backward-span', code: 'BDS', title: 'Backward Span', wing: 'train', category: 'memory-focus', domain: 'Working memory', age: 'Teen+', desc: 'Watch the numbers, then type them last to first.', paper: 'Miller 1956', tags: ['Capacity', 'Recall', 'Daily'], renderer: renderBackwardSpan },
  { id: 'memory-matrix', code: 'MMG', title: 'Memory Matrix', wing: 'train', category: 'memory-focus', domain: 'Spatial pattern', age: 'All', desc: 'Watch the lit cells, then tap the same cells from memory.', tags: ['Memory', 'Spatial', 'Pattern'], renderer: renderMemoryMatrix },
  // ── ARCADE ─────────────────────────────────────────────────────────────
  { id: 'cyber-tetris', code: 'TET', title: 'Cyber Tetris 1984', wing: 'arcade', category: 'classics', domain: 'Spatial', age: 'All', desc: 'Rotate falling blocks to complete rows without leaving gaps.', tags: ['Classic', 'Puzzle'], renderer: renderCyberTetris },
  { id: 'arcade-breakout', code: 'BRK', title: 'Breakout 1976', wing: 'arcade', category: 'classics', domain: 'Prediction', age: 'All', desc: 'Move the paddle. Bounce the ball. Break every brick.', tags: ['Classic', 'Open source', 'Touch'], credit: 'Ania Kubow · MIT', source: 'https://github.com/kubowania/breakout', renderer: renderArcadeBreakout },
  { id: 'arcade-pong', code: 'PNG', title: 'Pong 1972', wing: 'arcade', category: 'classics', domain: 'Anticipation', age: 'All', desc: 'Move your paddle. Hit the ball. First to seven wins.', tags: ['Classic', 'Open source', 'Touch'], credit: 'Jake Gordon · MIT', source: 'https://github.com/jakesgordon/javascript-pong', renderer: renderArcadePong },
  { id: 'cyber-pacman', code: 'PAC', title: 'Cyber Pac-Man 1980', wing: 'arcade', category: 'classics', domain: 'Maze', age: 'All', desc: 'Eat every dot, dodge four ghosts, and use power pellets to fight back.', tags: ['Classic', 'Arcade'], renderer: renderCyberPacman },
  { id: 'cyber-snake', code: 'SNK', title: 'Retro Cyber Snake', wing: 'arcade', category: 'retro-vault', domain: 'Grid', age: 'All', desc: 'Grow, turn, do not bite your own tail.', tags: ['Retro', 'Classic'], renderer: renderRetroSnake },
  { id: 'space-defender', code: 'INV', title: 'Space Defender', wing: 'arcade', category: 'retro-vault', domain: 'Shooter', age: 'All', desc: 'Move the laser turret, dodge shots, and clear each invader wave.', tags: ['Shooter', 'Space'], renderer: renderSpaceDefender },
  { id: 'flappy-bird', code: 'FLP', title: 'Flappy Cyber Bird', wing: 'arcade', category: 'casual-friv', domain: 'Timing', age: 'All', desc: 'Tap to fly through the pipes. Do not hit them.', tags: ['Casual', 'Timing'], renderer: renderFlappyBird },
  { id: 'minesweeper', code: 'MNE', title: 'Minesweeper Pro', wing: 'arcade', category: 'casual-friv', domain: 'Logic', age: '10+', desc: 'Flag mines, read the numbers, clear the grid.', tags: ['Logic', 'Grid'], renderer: renderMinesweeper },
  { id: 'slide-2048', code: '204', title: 'Slide 2048', wing: 'arcade', category: 'casual-friv', domain: 'Planning', age: 'All', desc: 'Merge matching tiles. Reach 2048 without boxing yourself in.', tags: ['Strategy', 'Merge'], renderer: renderSlide2048 },
  { id: 'sudoku-sprint', code: 'SDK', title: 'Sudoku Sprint', wing: 'learn', category: 'math-logic', domain: 'Constraint logic', age: '10+', desc: 'Fill empty cells. Each row and box can use a digit only once.', tags: ['Logic', 'Open source'], credit: 'robatron/sudoku.js · MIT', source: 'https://github.com/robatron/sudoku.js', renderer: renderSudokuSprint },
  { id: 'fifteen-puzzle', code: '15P', title: 'Fifteen Puzzle', wing: 'learn', category: 'math-logic', domain: 'Spatial planning', age: '8+', desc: 'Slide the tiles into 1–15 order. Use the empty square to move.', tags: ['Planning', 'Open source'], credit: 'imshubhamsingh/15-puzzle · MIT', source: 'https://github.com/imshubhamsingh/15-puzzle', renderer: renderFifteenPuzzle },
  { id: 'cyber-blackjack', code: 'BJ21', title: 'Cyber Blackjack 21', wing: 'arcade', category: 'adult-mind', domain: 'Cards', age: '18+', desc: 'Hit for another card. Stand to stop. Stay at 21 or under.', tags: ['Cards', 'Casino'], renderer: renderBlackjack },
  { id: 'trivia-master', code: 'TRV', title: 'Trivia Master', wing: 'arcade', category: 'adult-mind', domain: 'Knowledge', age: 'Teen+', desc: 'Answer quick questions about history, science, sci-fi, and games.', tags: ['Trivia', 'Quiz'], renderer: renderTriviaMaster },
  { id: 'pattern-breaker', code: 'PTN', title: 'Pattern Breaker', wing: 'arcade', category: 'adult-mind', domain: 'Deduction', age: 'Teen+', desc: 'Guess the hidden 4-colour code. Hints show colour and place after each try.', tags: ['Logic', 'Deduction'], renderer: renderPatternBreaker },
  { id: 'rom-loader', code: 'ROM', title: 'ROM / SWF Inspector', wing: 'arcade', category: 'classics', domain: 'Files', age: 'All', desc: 'Drop a .nes / .gb / .sfc / .swf file. This only reads the header, never plays it.', tags: ['Local', 'Inspector'], renderer: renderRomLoader },
  { id: 'ai-sandbox', code: 'AIG', title: 'AI Game Builder', wing: 'arcade', category: 'ai-studio', domain: 'Sandbox', age: 'All', desc: 'Type a prompt or pick a preset. A tiny game appears you can play.', tags: ['AI', 'Sandbox'], renderer: renderAIGameStudio },
  { id: 'warehouse-push', code: 'WHK', title: 'Warehouse Push', wing: 'arcade', category: 'classics', domain: 'Spatial planning', age: '8+', desc: 'Push every crate onto a target. You can undo a step, but you can never pull.', tags: ['Classic', 'Planning', 'Open source'], credit: 'Steven Lambert · CC0', source: 'https://gist.github.com/straker/2fddb507d4bb6bec54ea2fdb022d020c', renderer: renderWarehousePush },
  { id: 'rock-paper-scissors', code: 'RPS', title: 'Rock Paper Scissors', wing: 'arcade', category: 'casual-friv', domain: 'Prediction', age: 'All', desc: 'Pick rock, paper, or scissors. The CPU reads your habits — mix it up.', tags: ['Casual', 'Prediction'], renderer: renderRockPaperScissors },

  // ── LEARN ──────────────────────────────────────────────────────────────
  { id: 'monty-hall', code: 'MTY', title: 'Monty Hall', wing: 'learn', category: 'math-logic', domain: 'Probability', age: 'All', desc: 'Pick a door, see one empty door opened, then choose whether to stay or switch.', paper: 'Selvin 1975', tags: ['Probability', 'Bayes', 'Argument-settler'], renderer: renderMontyHall },
  { id: 'asteroids', code: 'AST', title: 'Asteroids', wing: 'arcade', category: 'classics', domain: 'Spatial control', age: 'All', desc: 'Rotate, then hit the rocks. They split. Flying off one edge brings you back.', paper: 'Atari 1979', tags: ['Vector', 'Momentum', 'Classic'], renderer: renderAsteroids },
  { id: 'frogger', code: 'FRG', title: 'Frogger', wing: 'arcade', category: 'classics', domain: 'Timing', age: 'All', desc: 'Cross five lanes of traffic. Every crossing rebuilds the road faster.', paper: 'Konami 1981', tags: ['Timing', 'Lanes', 'Classic'], renderer: renderFrogger },
  { id: 'connect-four', code: 'CF4', title: 'Connect Four', wing: 'arcade', category: 'adult-mind', domain: 'Adversarial play', age: 'All', desc: 'Drop discs into columns and connect four before the computer does.', tags: ['Opponent', 'Minimax', 'Strategy'], renderer: renderConnectFour },
  { id: 'solitaire', code: 'KLD', title: 'Klondike Solitaire', wing: 'arcade', category: 'classics', domain: 'Sequencing', age: 'All', desc: 'Build alternating-color stacks, then move each suit from Ace to King.', tags: ['Cards', 'Patience', 'Classic'], renderer: renderSolitaire },
  { id: 'number-chain', code: 'NCH', title: 'Number Chain', wing: 'learn', category: 'math-logic', domain: 'Patterns', age: '10+', desc: 'Find the rule linking a number sequence, then enter the next number.', tags: ['Patterns', 'Reasoning'], renderer: renderNumberChain },
  { id: 'word-guess', code: 'WRD', title: 'Word Guess', wing: 'learn', category: 'language', domain: 'Vocabulary', age: '10+', desc: 'Guess a five-letter word in six tries. Green is the right place. Orange is in the word.', tags: ['Words', 'Deduction'], renderer: renderWordGuess },
  { id: 'mate-in-one', code: 'MT1', title: 'Mate in One', wing: 'learn', category: 'math-logic', domain: 'Tactics', age: '8+', desc: 'Six named mating patterns. Find the single move that ends the game.', tags: ['Chess', 'Tactics', 'Pattern'], renderer: renderMateInOne },
  { id: 'ear-trainer', code: 'EAR', title: 'Ear Trainer', wing: 'learn', category: 'science', domain: 'Relative pitch', age: 'All', desc: 'Hear two notes, then tap the interval name. The second note is always higher.', tags: ['Audio', 'Music', 'Listening'], renderer: renderEarTrainer },
  { id: 'morse-code', code: 'MRS', title: 'Morse Code', wing: 'learn', category: 'language', domain: 'Auditory decoding', age: '10+', desc: 'Hear a short Morse rhythm, then choose the letter it represents.', tags: ['Audio', 'Code', 'Rhythm'], renderer: renderMorseCode },
  { id: 'tower-hanoi', code: 'HNI', title: 'Tower of Hanoi', wing: 'learn', category: 'math-logic', domain: 'Planning', age: '8+', desc: 'Move every disk to peg 3 in the fewest moves.', tags: ['Logic', 'Recursive'], renderer: renderTowerHanoi },
  { id: 'lights-out', code: 'LGT', title: 'Lights Out', wing: 'learn', category: 'math-logic', domain: 'Parity', age: '8+', desc: 'Tap a cell to flip it and its neighbours. Turn every light off.', tags: ['Logic', 'Parity', '1990s'], renderer: renderLightsOut },
  { id: 'nonogram', code: 'NGR', title: 'Nonogram', wing: 'learn', category: 'math-logic', domain: 'Visual deduction', age: '8+', desc: 'Fill a 5×5 picture using the number clues beside each row and column.', tags: ['Logic', 'Deduction', 'Picture'], renderer: renderNonogram },
  { id: 'nim', code: 'NIM', title: 'Nim', wing: 'learn', category: 'math-logic', domain: 'Strategy', age: '8+', desc: 'Take any number from one heap. Whoever takes the final token wins.', tags: ['Strategy', 'Binary', 'Classic'], renderer: renderNim },
  { id: 'make-24', code: 'M24', title: 'Make 24', wing: 'learn', category: 'math-logic', domain: 'Arithmetic', age: '10+', desc: 'Combine four numbers with +, −, ×, or ÷ to make exactly 24.', tags: ['Arithmetic', 'Planning', 'Puzzle'], renderer: renderMake24 },
  { id: 'tic-tac-toe', code: 'TTT', title: 'Tic-Tac-Toe', wing: 'learn', category: 'math-logic', domain: 'Strategy', age: 'All', desc: 'Place three in a row before the CPU does. Hard mode is unbeatable.', tags: ['Strategy', 'Classic', 'Pattern'], renderer: renderTicTacToe },
  { id: 'anagram-scramble', code: 'ANA', title: 'Anagram Scramble', wing: 'learn', category: 'language', domain: 'Spelling', age: '10+', desc: 'Unscramble letters into real words under pressure.', tags: ['Spelling', 'Vocabulary'], renderer: renderAnagram },
  { id: 'word-builder', code: 'WBD', title: 'Word Builder', wing: 'learn', category: 'language', domain: 'Phonics', age: '7+', desc: 'Build valid words from 7 tiles in 60 seconds.', tags: ['Phonics', 'Timed'], renderer: renderWordBuilder },
  { id: 'periodic-quest', code: 'ELM', title: 'Periodic Quest', wing: 'learn', category: 'science', domain: 'Chemistry', age: '12+', desc: 'Match element symbols to names across 10 rounds.', tags: ['Chemistry', 'Recall'], renderer: renderPeriodicQuest },
  { id: 'capital-quiz', code: 'CAP', title: 'Capital Quest', wing: 'learn', category: 'science', domain: 'Geography', age: '8+', desc: 'Match each country to its capital across ten quick rounds.', tags: ['Geography', 'Capitals'], renderer: renderCapitalQuiz },
  { id: 'math-safari', code: 'MSF', title: 'Math Safari Rush', wing: 'learn', category: 'kids-edu', domain: 'Arithmetic', age: '6+', desc: 'Solve each sum to clear the path and keep moving.', tags: ['Math', 'Kids'], renderer: renderMathSafari },
  { id: 'memory-match', code: 'MEM', title: 'Memory Match', wing: 'learn', category: 'kids-edu', domain: 'Pairs', age: '5+', desc: 'Flip two cards at a time and match the animal pairs.', tags: ['Memory', 'Kids'], renderer: renderMemoryMatch },
  { id: 'word-search', code: 'WSR', title: 'Word Search Quest', wing: 'learn', category: 'kids-edu', domain: 'Vocabulary', age: '7+', desc: 'Find every hidden word in the letter grid.', tags: ['Words', 'Kids'], renderer: renderWordSearch },

  // ── LABS ───────────────────────────────────────────────────────────────
  { id: 'non-trivial', code: 'NTR', title: 'Non-Trivial', wing: 'labs', category: 'labs', domain: 'Personal', age: 'Friends', desc: 'Answer questions drawn from Dr Non’s writing on books, cities, bikes, and sound.', tags: ['Trivia', 'Friends'], renderer: renderNonTrivial },
  { id: 'blow-cartridge', code: 'BIC', title: 'Blow Into The Cartridge', wing: 'labs', category: 'labs', domain: 'Party host', age: 'Party', desc: 'Pick a 90s/00s deck, shout answers together, and keep score on paper.', tags: ['Party', '90s'], renderer: renderBlowIntoTheCartridge },
  { id: 'kings-cup', code: 'KNG', title: "King's Cup", wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Draw a card. Follow the rule. Drink or deal.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderKingsCup },
  { id: 'never-have-i', code: 'NHI', title: 'Never Have I Ever', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Read a statement and lower one finger if you have done it.', tags: ['Party', 'Confession', 'Drinking'], renderer: renderNeverHaveIEver },
  { id: 'most-likely', code: 'MLT', title: 'Most Likely To', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Read a prompt, point at one person, and count the group’s votes.', tags: ['Party', 'Group vote', 'Drinking'], renderer: renderMostLikelyTo },
  { id: 'ride-the-bus', code: 'BUS', title: 'Ride the Bus', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '4 phases: red/black, higher/lower, inside/outside, guess the suit. Survive all four.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderRideTheBus },
  { id: 'power-hour', code: 'PWH', title: 'Power Hour', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Follow one new prompt each minute for a 60-minute group session.', tags: ['Party', 'Timer', 'Drinking'], renderer: renderPowerHour },
  { id: 'buzz-21', code: 'BUZ', title: 'Buzz (21)', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Count to 21. +1, +2, or +3 each turn. Whoever says 21 drinks.', tags: ['Party', 'Counting', 'Drinking'], renderer: renderBuzz },
  { id: 'truth-or-dare', code: 'TOD', title: 'Truth or Dare', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: '30 truths, 30 dares. Answer or drink.', tags: ['Party', 'Confession', 'Drinking'], renderer: renderTruthOrDare },
  { id: 'higher-lower', code: 'HIL', title: 'Higher or Lower', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Single deck streak. Guess the next card. Drink on a wrong guess.', tags: ['Party', 'Cards', 'Drinking'], renderer: renderHigherLower },
  { id: 'two-truths', code: '2T1', title: '2 Truths & a Lie', wing: 'labs', category: 'drinking', domain: 'Party prompts', age: '18+', desc: 'Tell two true statements and one lie, then let the group vote.', tags: ['Party', 'Deception', 'Drinking'], renderer: renderTwoTruths },
  // ── META ───────────────────────────────────────────────────────────────
  { id: 'about-dr-non', code: 'WHY', title: 'About Dr Non', wing: 'meta', category: 'about', domain: 'Signal', age: 'Everyone', desc: 'MIT Wii photo, a life of games, and why honesty is the product.', tags: ['Story'], renderer: renderAbout }
];

class NgsApp {
  constructor() {
    this.activeWing = 'train';
    this.searchQuery = '';
    // First visit: a short cart (≤ ~5 min), not Dual N-Back as the default focus.
    const shortIds = ['reaction-gate', 'one-back', 'digit-span', 'flanker', 'oddball'];
    this.focusId = shortIds[Math.floor(Date.now() / 86400000) % shortIds.length];
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

  // User-typed search text is interpolated into innerHTML twice; escape it
  // so a query like `<img src=x onerror=…>` renders as text, not markup.
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    // First visit: rotate a short cart (≤ ~5 min), not Dual N-Back.
    const shortIds = ['reaction-gate', 'one-back', 'digit-span', 'flanker', 'oddball'];
    const day = Math.floor(Date.now() / 86400000);
    const prefer = shortIds[day % shortIds.length];
    return pool.find(g => g.id === prefer)
      || pool.find(g => g.id === 'digit-span')
      || pool[0]
      || gamesCatalog.find(g => g.id === 'digit-span');
  }

  renderRailMeta() {
    const played = document.querySelector('#played-count');
    if (played) played.textContent = StorageService.getData().gamesPlayed || 0;
  }

  /**
   * Mood pick: a random cartridge that fits the visitor's head-space, not
   * their history. Prefers unplayed carts exactly like SURPRISE — the
   * non-coercive rule — but falls back to the whole mood pool when
   * everything in it has been played. Launches through the briefing gate.
   */
  moodPick(moodId) {
    const mood = moodById(moodId);
    if (!mood) return;
    // Use the module's own selector so moods.test.mjs exercises the exact
    // code path the button runs — an inline copy would let the test pass
    // while the live pool silently diverged.
    const pool = gamesForMood(mood, gamesCatalog);
    if (!pool.length) return;
    const played = new Set(AnalyticsService.getLog().map(entry => entry.gameId));
    const unplayed = pool.filter(game => !played.has(game.id));
    const candidates = unplayed.length ? unplayed : pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) this.launchGame(pick.id);
  }

  discoveryPick(mode) {
    const visible = this.filteredGames().filter(game => game.wing !== 'meta');
    const fallback = gamesCatalog.filter(game => game.wing !== 'meta');
    const pool = visible.length ? visible : fallback;
    const played = new Set(AnalyticsService.getLog().map(entry => entry.gameId));
    const unplayed = pool.filter(game => !played.has(game.id));
    let candidates = unplayed.length ? unplayed : pool;

    if (mode === 'quick') {
      const quick = candidates.filter(game => Number.parseInt(getBrainGuide(game).minutes, 10) <= 3);
      const globalQuick = fallback.filter(game => !played.has(game.id) && Number.parseInt(getBrainGuide(game).minutes, 10) <= 3);
      if (quick.length) candidates = quick;
      else if (globalQuick.length) candidates = globalQuick;
    }
    if (mode === 'recommended') {
      const recommended = AnalyticsService.getRecommendations(fallback, 3);
      if (recommended.length) candidates = recommended;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
    if (pick) this.launchGame(pick.id);
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
          <input id="search-input" type="search" placeholder="colour, pacman, chess, memory…" value="${this.searchQuery}" aria-label="Search games" />
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

    // The car remembers where you parked. A returning player came back for
    // the thing they were playing, not for today's recommendation — so the
    // last cartridge is one tap, above everything, before the pitch.
    const lastId = AnalyticsService.getLog().at(-1)?.gameId;
    const last = lastId ? gamesCatalog.find(g => g.id === lastId && g.wing !== 'meta') : null;
    const cont = last ? `
      <button type="button" class="attract-continue" data-game="${last.id}" aria-label="Continue ${last.title}">
        ${spriteImg(last.id, 'cart-sprite cart-sprite--continue')}
        <span class="attract-continue-label">CONTINUE</span>
        <span class="attract-continue-title">${last.title}</span>
        <span class="attract-continue-meta">HI ${StorageService.getHighScore(last.id)} · ${getBrainGuide(last).minutes}</span>
        <span class="attract-continue-cta">PLAY ▶</span>
      </button>` : '';

    el.innerHTML = cont + `
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
          <div class="attract-picks" aria-label="Fast ways to choose a game">
            <button type="button" data-discovery="quick"><b>QUICK HIT</b><span>Starts around 1–3 min</span></button>
            <button type="button" data-discovery="recommended"><b>PICK FOR ME</b><span>Least-practised skill</span></button>
            <button type="button" data-discovery="surprise"><b>SURPRISE</b><span>Prefers an unplayed cart</span></button>
          </div>
          <div class="attract-moods" aria-label="Pick a random game for your mood">
            <p class="attract-moods-label">OR PICK BY MOOD — RANDOM CART, YOUR HEAD-SPACE</p>
            ${MOODS.map(m => `<button type="button" data-mood="${m.id}"><b>${m.label}</b><span>${m.blurb}</span></button>`).join('')}
          </div>
        </figcaption>
      </figure>
      ${feature ? `
        <button type="button" class="attract-feature" data-game="${feature.id}" aria-label="Load ${feature.title}">
          <span class="attract-feature-kicker">TODAY'S CARTRIDGE · ${wingLabel}</span>
          ${spriteImg(feature.id, 'cart-sprite cart-sprite--hero', 'ink')}
          <span class="attract-feature-code">${feature.code}</span>
          <span class="attract-feature-title">${feature.title}</span>
          <span class="attract-feature-skill">${guide.label} · ${guide.minutes} · HI ${high}</span>
          <span class="attract-feature-cta">LOAD GAME</span>
        </button>
      ` : ''}
    `;

    const feat = el.querySelector('.attract-feature');
    if (feat) feat.onclick = () => this.launchGame(feat.dataset.game);
    const contBtn = el.querySelector('.attract-continue');
    if (contBtn) contBtn.onclick = () => this.launchGame(contBtn.dataset.game);
    el.querySelectorAll('[data-discovery]').forEach(button => {
      button.onclick = () => this.discoveryPick(button.dataset.discovery);
    });
    el.querySelectorAll('[data-mood]').forEach(button => {
      button.onclick = () => this.moodPick(button.dataset.mood);
    });
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

  /**
   * Search haystack for one game. Includes alias keywords (search-only),
   * the wing name, and the mood labels — so "nostalgia" or "party" narrows
   * the floor to the same carts the mood picker would random-pick from.
   */
  haystackFor(g) {
    return [
      g.title, g.desc, g.domain, g.code, g.tags.join(' '),
      g.paper || '', g.age || '', aliasesFor(g.id).join(' '),
      WING_META[g.wing]?.title || '',
      moodsForGame(g).map(m => m.label).join(' ')
    ].join(' ');
  }

  filteredGames() {
    const raw = this.searchQuery.trim();
    // Punctuation-insensitive: "pac-man" and "pacman" and "pac man" are one
    // query. `words` keeps separators for token matching; `squash` drops them
    // entirely so a run-together query still lands.
    const words = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const squash = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const q = words(raw);
    const qSquashed = squash(raw);

    return gamesCatalog.filter(g => {
      if (g.wing === 'meta' && !q) return false;
      // A search covers the WHOLE floor. Confining it to the open room is how
      // a cartridge that plainly exists reads as missing: you are standing in
      // TRAIN, you type "pacman", you get nothing, and you conclude the game
      // was never built. Rooms filter browsing; search overrides them.
      if (!q && this.activeWing !== 'all' && g.wing !== this.activeWing) return false;
      if (!q) return true;
      const hay = this.haystackFor(g);
      // Every typed word must appear somewhere — so "tower london" finds the
      // right tower, and word order never matters.
      const allWords = q.split(' ').every(t => words(hay).includes(t));
      return allWords || squash(hay).includes(qSquashed);
    });
  }

  renderGameBay() {
    const gridEl = document.querySelector('#game-grid');
    if (!gridEl) return;

    const filtered = this.filteredGames();
    this._playedIds = new Set(AnalyticsService.getLog().map(entry => entry.gameId));
    gridEl.className = 'game-library';

    if (filtered.length === 0) {
      gridEl.innerHTML = `<p class="cabinet-empty">Nothing matches “${this.esc(this.searchQuery)}”.<br><span style="opacity:.7">Try what the game <em>is</em> — colour, cards, chess, typing, drinking, reaction — or clear the search.</span></p>`;
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

    // A search spans every room, so say so — otherwise the still-highlighted
    // room chip contradicts the list underneath it.
    const searching = this.searchQuery.trim();
    const summary = searching
      ? `<div class="search-summary">
           <span><b>${filtered.length}</b> ${filtered.length === 1 ? 'cartridge' : 'cartridges'} match “${this.esc(searching)}” · all rooms</span>
           <button id="search-clear" type="button">✕ CLEAR</button>
         </div>`
      : '';

    gridEl.innerHTML = summary + groups.map(({ wing, games }) => `
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

    const clearBtn = gridEl.querySelector('#search-clear');
    if (clearBtn) clearBtn.onclick = () => {
      this.searchQuery = '';
      const inp = document.querySelector('#search-input');
      if (inp) { inp.value = ''; inp.focus(); }
      this.renderGameBay();
    };

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
    const isNew = ['color-march-pro'].includes(game.id);
    const hasPlayed = this._playedIds?.has(game.id);
    return `
      <li class="select-row ${isFocus ? 'is-focus' : ''}" data-game="${game.id}" tabindex="0" role="option" aria-selected="${isFocus}" aria-label="${game.title}">
        <span class="select-card-top"><span class="select-code">${game.code}</span><span class="select-state">${isNew ? '<b>NEW</b>' : (hasPlayed ? '<i>PLAYED</i>' : '')}<span class="select-age">${game.age}</span></span></span>
        ${spriteImg(game.id, 'cart-sprite')}
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

    // Focus in, focus back out. Keyboard and screen-reader users used to be
    // left on the row behind the modal, tabbing a page they cannot see.
    this._modalOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    overlay.classList.remove('hidden');
    container.innerHTML = '';

    const session = new GameSession();
    let startedAt = null;
    let didStart = false;
    let sessionScore = 0;

    const closeGame = () => {
      const durationMs = startedAt ? Date.now() - startedAt : 0;
      if (didStart) {
        try { AnalyticsService.log(game.id, game.category, sessionScore, durationMs); } catch (e) { /* ignore */ }
      }
      session.teardown();
      overlay.classList.add('hidden');
      container.innerHTML = '';
      if (this._releaseModalUX) { this._releaseModalUX(); this._releaseModalUX = null; }
      this.renderRailMeta();
      this.renderGameBay();
      if (didStart) this.renderAttract();
      const opener = this._modalOpener;
      this._modalOpener = null;
      if (opener && opener.isConnected) opener.focus();
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
              <div class="briefing-lead">
                ${spriteImg(game.id, 'briefing-sprite')}
                <p class="briefing-label">THE BRAIN BRIEFING</p>
              </div>
              <h3>${guide.label}</h3>
              <div class="briefing-step"><b>1</b><div><span>HOW TO PLAY</span><p>${game.desc}</p></div></div>
              <div class="briefing-step"><b>2</b><div><span>IN THE ROUND</span><p>${guide.practice}</p></div></div>
              <div class="briefing-step"><b>3</b><div><span>WHY IT MATTERS</span><p>${guide.why}</p></div></div>
            </div>
            <aside class="briefing-side">
              <p class="briefing-label">COACH NOTE</p>
              <blockquote>${guide.tip}</blockquote>
              <div class="briefing-caveat"><span>HONEST CLAIM</span><p>${TRANSFER_CAVEAT}</p></div>
              ${sourceUrl ? `<a class="briefing-source" href="${sourceUrl}" target="_blank" rel="noopener">${sourceLabel || 'VIEW SOURCE'}<i></i></a>` : ''}
              <button class="briefing-play" type="button">PLAY</button>
              <button class="briefing-skip" type="button">SKIP — I KNOW THIS ONE</button>
            </aside>
          </div>
        </article>`;
      container.querySelector('.briefing-close').onclick = closeGame;
      container.querySelector('.briefing-play').onclick = renderGame;
      // Keyboard entry point lands on PLAY, inside the dialog.
      container.querySelector('.briefing-play').focus();
      const skip = container.querySelector('.briefing-skip');
      if (skip) skip.onclick = renderGame;
    };

    const renderGame = () => {
      didStart = true;
      startedAt = Date.now();
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

    // Briefing first, every time. The attract screen's CONTINUE button is
    // the one-tap path for returning players; opening a cartridge from the
    // floor always re-shows what it trains. Closing without PLAY never
    // counts as a session.
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
