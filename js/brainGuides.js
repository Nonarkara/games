/**
 * Plain-language learning notes for every room in the Non-Gaming System.
 *
 * These describe the skill used while playing. They do not promise broad IQ,
 * academic, or clinical gains. That distinction is repeated in the UI because
 * near transfer is more defensible than far-transfer marketing claims.
 */

export const BRAIN_GUIDES = {
  'chimp-test': {
    label: 'Masked visuospatial recall', minutes: '3–5 min',
    practice: 'Snapshot the positions of numbered cells, then reproduce the sequence after the digits are masked.',
    why: 'Eidetic-style rapid encoding is the one memory task where a chimpanzee reliably beats adult humans — a hard ceiling worth feeling personally.',
    tip: 'Take the whole grid in as one picture before touching 1. Reading the digits one by one is already too slow.',
    stack: ['neuroplasticity', 'werbach']
  },
  'calibration': {
    label: 'Confidence calibration', minutes: '4–6 min',
    practice: 'State 90% confidence intervals for quantities you half-know, then face the hit rate you actually earn.',
    why: 'The gap between stated confidence and actual accuracy is the most reproducible bias in judgment research — and the most expensive one in real decisions.',
    tip: 'If a range feels comfortable, it is too narrow. The skill being trained is deliberate vagueness.',
    stack: ['kahneman', 'thaler']
  },
  'monty-hall': {
    label: 'Probability intuition', minutes: '4–6 min',
    practice: 'Play the stay-or-switch dilemma repeatedly while running tallies show which policy actually wins.',
    why: 'System 1 insists the two closed doors are 50/50; the tallies demonstrate otherwise. Feeling your intuition lose to arithmetic is the lesson.',
    tip: 'Commit to one policy for five rounds at a time — the sample makes the 2/3 visible.',
    stack: ['kahneman']
  },
  'posner-cueing': {
    label: 'Covert attention orienting', minutes: '3–4 min',
    practice: 'Hold your gaze still while attention alone shifts to a cued location, then pays a cost when the cue misleads.',
    why: 'Attention and eye position are separable: you can attend to a place you are not looking at, and re-orienting from a wrong guess takes measurable time.',
    tip: 'Keep your eyes locked on the centre cross. If you catch yourself looking at the box, the effect disappears.',
    stack: ['kahneman']
  },
  'change-blindness': {
    label: 'Change detection', minutes: '3–5 min',
    practice: 'Compare two alternating scenes across a blank gap that erases the motion signal a change normally produces.',
    why: 'Without a motion cue, seeing a change requires attending to the right object first — which is why large changes in plain sight can go unnoticed.',
    tip: 'Scan region by region instead of staring at the whole grid; the change only pops once attention lands on it.',
    stack: ['kahneman', 'neuroplasticity']
  },
  'operation-span': {
    label: 'Complex working-memory span', minutes: '4–6 min',
    practice: 'Hold a growing list of letters while a maths check keeps interrupting the rehearsal you would normally rely on.',
    why: 'Storage plus processing is closer to real cognitive load than storage alone, which is why complex span predicts comprehension better than simple span.',
    tip: 'Answer the equations honestly. Neglecting them to protect the letters is the exact failure this task is built to detect.',
    stack: ['kahneman', 'neuroplasticity']
  },
  'dual-n-back': {
    label: 'Working-memory updating', minutes: '4–6 min',
    practice: 'Track a position and a sound, then replace old information as each new pair arrives.',
    why: 'Working memory is the small mental workspace used to hold and update information during a task.',
    tip: 'Accuracy first. Add speed only when two-back feels stable.'
  },
  'digit-span': {
    label: 'Short-term recall', minutes: '3–5 min',
    practice: 'Hold an ordered string of digits long enough to reproduce it without external cues.',
    why: 'The task makes memory load visible: one more digit can be the difference between holding and losing the sequence.',
    tip: 'Group digits into chunks, then notice when chunking stops helping.'
  },
  'stroop-match': {
    label: 'Response inhibition', minutes: '2–4 min',
    practice: 'Answer with the ink color while suppressing the faster, automatic urge to read the word.',
    why: 'Inhibition helps keep an irrelevant but tempting response from taking over the action you intended.',
    tip: 'Pause for one beat when the word and ink disagree.'
  },
  'go-nogo': {
    label: 'Impulse control', minutes: '2–3 min',
    practice: 'Build a fast response, then withhold it when a no-go signal appears.',
    why: 'Good control is not only reacting quickly. It is also stopping a prepared action at the right moment.',
    tip: 'Treat false starts as the main error, not slow correct presses.'
  },
  'simon-seq': {
    label: 'Sequence memory', minutes: '3–5 min',
    practice: 'Encode an ordered pattern, retain it, and replay it as the sequence grows.',
    why: 'Order matters in instructions, music, language, and multi-step routines.',
    tip: 'Name or rhythmically group each color instead of memorizing isolated flashes.'
  },
  'schulte-table': {
    label: 'Visual scanning', minutes: '2–4 min',
    practice: 'Search a crowded field in order while resisting the urge to scan randomly.',
    why: 'A systematic search strategy reduces missed targets and repeated checking.',
    tip: 'Keep your gaze near the center and let peripheral vision find the next number.'
  },
  'visual-search': {
    label: 'Selective attention', minutes: '2–4 min',
    practice: 'Separate one target from increasingly similar distractors.',
    why: 'Selective attention prioritizes task-relevant detail when the visual field is noisy.',
    tip: 'Search by rows or quadrants. A plan beats frantic eye movement.'
  },
  'corsi-blocks': {
    label: 'Visuospatial span', minutes: '3–5 min',
    practice: 'Hold an ordered path through space long enough to reproduce it without notes.',
    why: 'Spatial working memory is a different channel from digit span — useful for maps, diagrams, and layouts.',
    tip: 'Trace the path with your eyes once before the lights finish.'
  },
  'memory-palace': {
    label: 'Method of loci', minutes: '4–7 min',
    practice: 'Bind each object to a fixed place in a known route, then retrieve by walking the route again.',
    why: 'Spatial scaffolding turns a bare list into a path you can re-enter — the classic mnemonic palace.',
    tip: 'Make the image weird. A key melting on the stove sticks harder than a key sitting politely.'
  },
  'flanker': {
    label: 'Selective attention', minutes: '2–4 min',
    practice: 'Report the center stimulus while suppressing conflicting neighbors.',
    why: 'The incongruent trial is the point: interference makes attention costs measurable.',
    tip: 'Fixate the center. Do not scan the flanks.'
  },
  'aim-trainer': {
    label: 'Hand–eye calibration', minutes: '1–3 min',
    practice: 'Map visual target position to a precise hand movement under time pressure.',
    why: 'Repeated aiming gives immediate feedback about speed–accuracy trade-offs.',
    tip: 'Move smoothly to the target center. Overshooting wastes more time than a measured approach.'
  },
  'sudoku-sprint': {
    label: 'Constraint satisfaction', minutes: '3–6 min',
    practice: 'Place digits that satisfy every row, column, and box rule without contradiction.',
    why: 'The board rewards elimination over guessing — a compact model of logical planning.',
    tip: 'Fill forced cells first. Never invent a digit that two clues do not require.'
  },
  'fifteen-puzzle': {
    label: 'Spatial planning', minutes: '2–5 min',
    practice: 'Reorder a disrupted grid by sliding tiles through a single empty cell.',
    why: 'Each move changes the whole path — the board punishes local fixes that break the global order.',
    tip: 'Solve row by row. Protect finished rows; do not reopen them for a cheap swap.'
  },
  'mental-math': {
    label: 'Arithmetic fluency', minutes: '2–4 min',
    practice: 'Retrieve number facts and choose efficient operations without writing every intermediate step.',
    why: 'Fluent basics leave more working memory available for the structure of a harder problem.',
    tip: 'Break awkward numbers into tens and ones before calculating.'
  },
  'type-rush': {
    label: 'Motor fluency', minutes: '2–4 min',
    practice: 'Coordinate visual word recognition with accurate, increasingly automatic finger sequences.',
    why: 'When keystrokes become automatic, attention can stay on composing the thought.',
    tip: 'Accuracy is the route to speed. Correct the weak keys instead of chasing raw WPM.'
  },
  'reflex-matrix': {
    label: 'Reaction control', minutes: '2–3 min',
    practice: 'Detect a brief signal, select its location, and execute a controlled response.',
    why: 'The score exposes the balance between quick detection and precise movement.',
    tip: 'Keep your pointer near the center so every target is within a similar reach.'
  },
  'cyber-tetris': {
    label: 'Mental rotation', minutes: '5–10 min',
    practice: 'Rotate shapes mentally, compare possible placements, and plan around future constraints.',
    why: 'Spatial reasoning depends on imagining how parts fit before physically moving them.',
    tip: 'Look at the next piece before locking the current one.'
  },
  'cyber-pacman': {
    label: 'Route planning', minutes: '4–8 min',
    practice: 'Track moving threats, update safe routes, and switch plans when the maze state changes.',
    why: 'Dynamic planning combines attention, prediction, and fast course correction.',
    tip: 'Plan to the next intersection, not only to the next dot.'
  },
  'cyber-snake': {
    label: 'Prospective planning', minutes: '3–6 min',
    practice: 'Commit to a movement path while protecting the space your longer future self will need.',
    why: 'The mechanic rewards thinking one or two consequences beyond the immediate reward.',
    tip: 'Preserve open lanes. The shortest route to food is not always the safest.'
  },
  'space-defender': {
    label: 'Visual tracking', minutes: '3–6 min',
    practice: 'Track several moving objects, predict trajectories, and time a response.',
    why: 'Fast arcade play makes attention allocation and prediction visible through immediate misses and hits.',
    tip: 'Aim where the target will be, not where it is.'
  },
  'flappy-bird': {
    label: 'Timing calibration', minutes: '1–4 min',
    practice: 'Estimate momentum and make small corrections instead of overreacting.',
    why: 'The narrow control loop teaches how delayed physical effects follow a brief input.',
    tip: 'Use a steady rhythm and correct early with small taps.'
  },
  'minesweeper': {
    label: 'Deductive reasoning', minutes: '4–10 min',
    practice: 'Combine local numerical clues to rule possibilities in or out.',
    why: 'Deduction turns several incomplete facts into one justified next move.',
    tip: 'Separate certain moves from guesses. Flag only what the clues force.'
  },
  'slide-2048': {
    label: 'Constraint planning', minutes: '4–8 min',
    practice: 'Preserve maneuvering room while arranging a sequence of future merges.',
    why: 'The board rewards delayed gratification: a smaller move now can protect a larger plan later.',
    tip: 'Keep the largest tile in one corner and avoid filling every lane.'
  },
  'cyber-blackjack': {
    label: 'Risk estimation', minutes: '4–8 min',
    practice: 'Compare an uncertain payoff with the cost of drawing one more card.',
    why: 'The game is a compact lesson in probability, expected outcomes, and stopping decisions—not a gambling strategy course.',
    tip: 'Explain your hit-or-stand reason before revealing the next card.'
  },
  'trivia-master': {
    label: 'Retrieval practice', minutes: '4–7 min',
    practice: 'Pull stored facts from memory instead of merely recognizing them during rereading.',
    why: 'Trying to retrieve an answer exposes what is available now and what needs another pass.',
    tip: 'After a miss, say the correct answer once in a full sentence.'
  },
  'pattern-breaker': {
    label: 'Hypothesis testing', minutes: '4–7 min',
    practice: 'Use partial feedback to eliminate paths and choose the next informative guess.',
    why: 'Good deduction updates a model after every result instead of repeating a hunch.',
    tip: 'Change one part of a promising guess so the next clue tells you more.'
  },
  'rom-loader': {
    label: 'Digital literacy', minutes: '2–4 min',
    practice: 'Inspect file headers and distinguish metadata from executable game content.',
    why: 'Understanding formats makes old media less mysterious and encourages safer handling of local files.',
    tip: 'Use only backups you own. Compare the extension with the detected header.'
  },
  'ai-sandbox': {
    label: 'Systems thinking', minutes: '5–10 min',
    practice: 'Describe rules, observe the resulting system, then revise the prompt from concrete behavior.',
    why: 'Designing a small game turns vague intentions into testable rules and feedback loops.',
    tip: 'Change one rule at a time so you know what caused the new behavior.'
  },
  'arcade-breakout': {
    label: 'Prediction and control', minutes: '3–7 min',
    practice: 'Predict rebound angles while moving the paddle to a future interception point.',
    why: 'Breakout couples visual tracking with timed motor correction and strategic target selection.',
    tip: 'Hit the ball away from the paddle center to control its exit angle.'
  },
  'arcade-pong': {
    label: 'Anticipation', minutes: '3–6 min',
    practice: 'Read velocity, forecast the intercept, and correct your paddle before the ball arrives.',
    why: 'Pong strips visuomotor prediction down to one moving object and one decisive response.',
    tip: 'Watch the ball after contact. Start moving before it crosses mid-court.'
  },
  'number-chain': {
    label: 'Pattern reasoning', minutes: '3–5 min',
    practice: 'Compare changes between terms and test a candidate rule against the whole sequence.',
    why: 'Pattern reasoning is stronger when the rule explains every step, not only the last pair.',
    tip: 'Check differences first, then ratios, then alternating rules.'
  },
  'tower-hanoi': {
    label: 'Recursive planning', minutes: '4–8 min',
    practice: 'Break one large goal into repeated smaller goals while respecting a fixed constraint.',
    why: 'The puzzle makes hierarchical planning concrete: solve the smaller tower to move the larger disk.',
    tip: 'Before each move, name which disk you are trying to free.'
  },
  'anagram-scramble': {
    label: 'Orthographic flexibility', minutes: '3–5 min',
    practice: 'Recombine letter positions while testing familiar spelling patterns.',
    why: 'Flexible word-form search supports spelling awareness and vocabulary retrieval.',
    tip: 'Find common endings and consonant pairs before guessing whole words.'
  },
  'word-builder': {
    label: 'Vocabulary retrieval', minutes: '3–6 min',
    practice: 'Search known word patterns under a letter constraint and a clock.',
    why: 'Generating words requires active retrieval rather than passive recognition.',
    tip: 'Build short words first, then reuse their letter clusters inside longer ones.'
  },
  'periodic-quest': {
    label: 'Symbol recall', minutes: '3–5 min',
    practice: 'Retrieve the stable mapping between element names and chemical symbols.',
    why: 'Fast access to notation reduces friction when later chemistry problems become more complex.',
    tip: 'For a miss, connect the symbol to the element’s Latin or historical name when relevant.'
  },
  'capital-quiz': {
    label: 'Geographic recall', minutes: '3–5 min',
    practice: 'Retrieve place-name pairs and strengthen the cue between a country and its capital.',
    why: 'Repeated recall builds a more usable mental map than repeated rereading alone.',
    tip: 'Attach each capital to a region, river, coast, or neighboring country.'
  },
  'math-safari': {
    label: 'Number fluency', minutes: '3–6 min',
    practice: 'Solve short arithmetic problems with immediate corrective feedback.',
    why: 'Automatic basic facts free attention for later multi-step reasoning.',
    tip: 'Say the operation aloud before entering the answer.'
  },
  'memory-match': {
    label: 'Location memory', minutes: '3–6 min',
    practice: 'Encode what appeared and where, then update that map after each turn.',
    why: 'The game rewards deliberate encoding more than random flipping.',
    tip: 'Name each card and its rough position when it appears.'
  },
  'word-search': {
    label: 'Visual word recognition', minutes: '4–7 min',
    practice: 'Scan letter fields for familiar sequences in several orientations.',
    why: 'The task combines systematic visual search with rapid recognition of spelling patterns.',
    tip: 'Search for the rarest letter in the target word first.'
  },
  'non-trivial': {
    label: 'Elaborative recall', minutes: '5–10 min',
    practice: 'Retrieve facts from themed stories and connect answers to books, places, and lived context.',
    why: 'Rich cues make memory more meaningful than isolated fact drilling.',
    tip: 'Explain why the answer fits the theme, even after choosing correctly.'
  },
  'blow-cartridge': {
    label: 'Social retrieval', minutes: '10–30 min',
    practice: 'Use cultural cues to retrieve shared memories, then explain them to other players.',
    why: 'Conversation adds context, disagreement, and stories that a solitary quiz cannot.',
    tip: 'Let each answer trigger one memory before moving to the next card.'
  },
  'about-dr-non': {
    label: 'Critical play', minutes: '3 min read',
    practice: 'Examine what games can train, what evidence supports, and where the claims should stop.',
    why: 'Knowing the limit of a claim is part of learning from it.',
    tip: 'Choose a game for the skill it uses now, not for a promise of becoming smarter at everything.',
    stack: ['kahneman', 'werbach', 'thaler', 'plasticity', 'clear']
  },
  'trail-making': {
    label: 'Task switching', minutes: '2–4 min',
    practice: 'Connect numbered dots in order (Part A), then alternate numbers and letters (Part B). Errors reset the trail to that point so they cost real time.',
    why: 'Part B is the classic task-switching paradigm — two response sets interleaved, the cost is the switch.',
    tip: 'Lift the pen between dots. A smooth run on Part A is the warm-up; Part B is where the test lives.',
    stack: ['kahneman', 'plasticity', 'clear']
  },
  'mental-rotation': {
    label: 'Spatial rotation', minutes: '3–5 min',
    practice: 'Two shapes side by side. Decide if the right one is the left one rotated, or mirrored.',
    why: 'Mental rotation is one of the cleanest measures of spatial transformation. Reaction time scales with the angle of rotation.',
    tip: 'Lock onto one cell of the shape and rotate just that. The rest follows.',
    stack: ['kahneman', 'plasticity', 'clear']
  },
  'iowa-gambling': {
    label: 'Risk learning under uncertainty', minutes: '5–8 min',
    practice: '40 draws from 4 decks. Two decks pay a small amount reliably; two decks pay a large amount but punish hard. Learn which.',
    why: 'Bechara’s task is the canonical demonstration of somatic-marker learning — the body decides before the mind.',
    tip: 'Track not just the wins but the losses. A win is information; a loss is more information.',
    stack: ['kahneman', 'thaler', 'plasticity', 'clear']
  },
  'kings-cup': {
    label: 'Party card prompts', minutes: '5–15 min',
    practice: 'Draw a card from a 52-card deck. Each rank has a rule — waterfall, mate, rhyme, question master, king’s cup. Apply the rule at the table.',
    why: 'The web side just removes the printed card deck and the lookup. The game is the social play, not the screen.',
    tip: 'Keep the rules for the WHOLE round, not just the moment. Rhyme and categories only work if everyone remembers.',
    stack: ['werbach', 'thaler', 'clear']
  },
  'never-have-i': {
    label: 'Confession prompts', minutes: '5–10 min',
    practice: 'Read a statement. If you have done it, put a finger down. Last player with a finger up wins.',
    why: 'The prompts are the game. The screen removes the awkward silence of trying to remember one.',
    tip: 'Lean into the confessions. The good ones are the ones you almost did, not the ones you definitely did.',
    stack: ['thaler', 'clear']
  },
  'most-likely': {
    label: 'Group-vote prompts', minutes: '5–10 min',
    practice: 'Read a prompt. Everyone points at the person who best fits. Most fingers pointed drinks.',
    why: 'The reveal is the game. The screen makes the prompt visible to everyone at once.',
    tip: 'Read the prompt out loud, then count to three. Hesitation ruins the joke.',
    stack: ['thaler', 'clear']
  },
  'cog-reflection': {
    label: 'Cognitive reflection', minutes: '3–5 min',
    practice: 'Three problems with a System-1 lure and a System-2 answer. The famous Frederick CRT — bat and ball, lily pads, widgets. The "aha" of catching the lure is the point.',
    why: 'CRT measures whether you override an intuitive wrong answer with reflection. Three out of three is rare; one out of three is normal.',
    tip: 'Read the question twice. If the first answer felt too easy, the second read usually surfaces the catch.',
    stack: ['kahneman', 'thaler', 'clear']
  },
  'raven-matrices': {
    label: 'Fluid reasoning (gF)', minutes: '4–6 min',
    practice: 'A 3x3 pattern grid with one cell missing. The pattern is one of: count progression, rotation, or color shift. Pick the option that completes the rule.',
    why: 'Raven\'s matrices are the canonical test of fluid intelligence — reasoning on novel patterns without learned content.',
    tip: 'Look at the relationship BETWEEN cells in a row, not just within a cell. The rule is usually a consistent transformation left-to-right.',
    stack: ['plasticity', 'kahneman', 'clear']
  },
  'sternberg': {
    label: 'Working-memory scanning', minutes: '3–5 min',
    practice: 'Memorize 3-5 letters for 2 seconds. Then a probe letter appears. Was it in the set? Yes or no. Set size escalates 3 -> 5 across the 24 trials.',
    why: 'Sternberg\'s 1966 paradigm is the foundation of the serial memory-scan model — reaction time scales with set size in a predictable way.',
    tip: 'Hold the set as a small chunk, not five separate items. The probe is a single yes/no, not a serial scan.',
    stack: ['kahneman', 'plasticity', 'clear']
  },
  'number-sense': {
    label: 'Approximate number system', minutes: '1 min',
    practice: 'Two clouds of dots side by side. Click the side with more. The ratio starts easy (10:9) and narrows toward 10:7 as you succeed. 60 seconds total.',
    why: 'Halberda\'s work shows that "number sense" — the ability to estimate quantities without counting — is a stable cognitive trait that predicts math achievement.',
    tip: 'Trust your first glance. Counting destroys the intuition that the ANS is testing.',
    stack: ['plasticity', 'kahneman', 'clear']
  },
};

export const PAPER_LINKS = {
  'Jaeggi 2008': 'https://doi.org/10.1073/pnas.0801268105',
  'Miller 1956': 'https://doi.org/10.1037/h0043158',
  'Stroop 1935': 'https://doi.org/10.1037/h0054651',
  'Verbruggen 2008': 'https://doi.org/10.1016/j.tics.2008.07.005',
  'Green 2003': 'https://doi.org/10.1038/nature01647',
  'Dye 2009': 'https://doi.org/10.1111/j.1467-8721.2009.01660.x',
  'Corsi 1972': 'https://doi.org/10.1016/S0010-9452(72)80024-5',
  'Eriksen 1974': 'https://doi.org/10.3758/BF03203267',
  'Yates 1966': 'https://en.wikipedia.org/wiki/Method_of_loci',
  'Reitan 1958': 'https://doi.org/10.1037/h0043828',
  'Shepard 1971': 'https://doi.org/10.1126/science.5547994',
  'Bechara 1994': 'https://doi.org/10.1093/cercor/4.8.813',
  'Frederick 2005': 'https://doi.org/10.1016/j.jesp.2005.02.005',
  'Raven 1936': 'https://en.wikipedia.org/wiki/Raven%27s_Progressive_Matrices',
  'Sternberg 1966': 'https://doi.org/10.1126/science.153.3733.652',
  'Halberda 2008': 'https://doi.org/10.1016/j.cognition.2008.05.007'
};

export function getBrainGuide(game) {
  return BRAIN_GUIDES[game.id] || {
    label: game.domain,
    minutes: '3–6 min',
    practice: `Use ${game.domain.toLowerCase()} while learning the rules through feedback.`,
    why: 'Games make a skill visible by connecting each decision to an immediate result.',
    tip: 'Play one short round, then name the strategy you would change next time.'
  };
}

export const TRANSFER_CAVEAT = 'This game practises the named task. Broad transfer to unrelated abilities is not promised.';
