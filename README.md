# Dr Non — Non-Gaming System

Small playable experiments by Dr Non. Arcade-scale civic toys, not a product company.

This repository is the source for **[games.nonarkara.org](https://games.nonarkara.org)**: a 16-bit floor of short browser games, research-style drills, and a few personal packs. Every cartridge opens with a briefing — how to play, what it practises, and the limit of the claim. No ads. No login required.

These are **experiments**, not a studio product and not a clinical tool. Near transfer (you get better at the task) is the honest claim. Far transfer is not sold.

Vanilla JavaScript, no build step. Scores stay on the device unless a guest later links an account on the live site.

## Run the floor

Requires [Node.js](https://nodejs.org/). There are no package dependencies.

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000). Same entry: `npm start`.

That is the only local binary. Every game below is a cartridge on this floor — pick a wing (TRAIN / ARCADE / LEARN / LABS), open the title, read the briefing, then play. Keyboard and touch both work where the cart needs them.

Optional checks:

```bash
npm test
npm run check
```

## How to play each game

Titles and play lines are taken from the catalog in `js/app.js`. Nothing here is an invented name.

### TRAIN — lab tasks with a paper trail

| Game | Play |
|---|---|
| Dual N-Back | Watch each square and letter. Tap when either matches two turns ago. |
| Digit Span | Watch digits, type them back. Span grows until it breaks. |
| Colour Match | The word says RED but the ink is BLUE — tap the colour of the ink, not the word it spells. |
| Colour Match Pro | Tap the ink colour. All answers are white, so the buttons cannot hint. |
| Go / No-Go | Press on GO. Withhold on NO-GO. False starts cost more than slow hits. |
| Simon Sequence | Watch the pattern grow, then play it back. |
| Schulte Table | Tap 1→25. Eyes on center; peripheral vision does the finding. |
| Visual Search | Find the odd rotated letter in growing clutter. |
| Corsi Blocks | Watch the path light up, then tap it back. Span grows until it breaks. |
| Memory Palace | Place objects along a familiar route, then walk the route to recall them. |
| Flanker | Report the center arrow. Ignore the flanks — especially when they disagree. |
| Aim Trainer | Tap as many targets as you can in 30 seconds without missing. |
| Mental Math | Solve as many short arithmetic problems as you can in 45 seconds. |
| Type Rush | Type the shown words for 30 seconds; speed and accuracy both count. |
| Reflex Matrix | Tap glowing cells before they fade. Speed escalates each wave. |
| Trail Making | Connect 1→2→3, then switch between numbers and letters: 1→A→2→B. |
| Mental Rotation | Decide whether two shapes are rotated copies or mirror images. |
| Iowa Gambling Task | Draw from four decks and learn which ones pay off over time. |
| Cognitive Reflection | Solve three short problems whose obvious first answer is usually wrong. |
| Raven's Matrices | 3x3 pattern grid, one cell missing. Pick the option that completes the rule. |
| Sternberg Memory Scan | Memorize a short letter set, then decide whether one shown letter was in it. |
| Number Sense (ANS) | Pick the dot cloud with more dots before there is time to count. |
| Card Sorting (WCST) | Sort by the hidden rule. It changes every 5 correct sorts. Notice the change. |
| Tower of London | Three pegs, three balls. Match the target in the fewest moves. |
| Mind in the Eyes · Lite | Match a simple gaze drawing to the emotion word that fits best. |
| Posner Cueing | Follow a flashing cue, then respond when a dot appears—some cues mislead you. |
| Change Blindness | Find the one square that changes while a blank flash hides the movement. |
| Operation Span | Check each equation while holding letters, then recall the letters in order. |
| Chimp Test | Tap numbered cells in order after the numbers disappear. |
| Calibration | Give a high and low estimate that you believe has a 90% chance of being right. |
| Stop Signal | Start a left/right response, then cancel it when a delayed STOP signal appears. |
| Reaction Gate | Wait for the amber box, then tap it. Early taps count as misses. |
| One-Back | Tap MATCH if the square is in the same place as last turn. |
| Oddball | Tap only when the rare shape appears. Ignore the common one. |
| Backward Span | Watch digits, then type them back in reverse order. |
| Memory Matrix | Watch cells light up, then tap the same cells from memory before the grid clears. |

### ARCADE — classics, shooters, and the sandbox

| Game | Play |
|---|---|
| Cyber Tetris 1984 | Rotate falling blocks to complete rows without leaving gaps. |
| Breakout 1976 | Shape rebound angles, keep the rally alive, clear the wall. |
| Pong 1972 | Read the ball early and race the CPU to seven. |
| Cyber Pac-Man 1980 | Eat every dot, dodge four ghosts, and use power pellets to fight back. |
| Retro Cyber Snake | Grow, turn, do not bite your own tail. |
| Space Defender | Move the laser turret, dodge shots, and clear each invader wave. |
| Flappy Cyber Bird | Tap-to-fly through pipes. Precision over panic. |
| Minesweeper Pro | Flag mines, read the numbers, clear the grid. |
| Slide 2048 | Merge matching tiles. Reach 2048 without boxing yourself in. |
| Cyber Blackjack 21 | Hit, stand, manage the bankroll against the dealer. |
| Trivia Master | Answer quick questions about history, science, sci-fi, and games. |
| Pattern Breaker | Crack a hidden 4-node path with Mastermind-style hints. |
| ROM / SWF Inspector | Drop a legal .nes / .gb / .sfc / .swf backup — header metadata only. |
| AI Game Builder | Prompt or pick a preset; get a playable micro-game live. |
| Warehouse Push | Push every crate onto a target. You can undo a step, but you can never pull. |
| Rock Paper Scissors | Pick rock, paper, or scissors. The CPU reads your habits — mix it up. |
| Asteroids | Rotate, thrust, fire. Rocks split when hit and the screen wraps on both axes. |
| Frogger | Cross five lanes of traffic. Every crossing rebuilds the road faster. |
| Connect Four | Drop discs into columns and connect four before the computer does. |
| Klondike Solitaire | Build alternating-color stacks, then move each suit from Ace to King. |

### LEARN — math, language, science, kids drills

| Game | Play |
|---|---|
| Sudoku Sprint | Fill a small board under a clock. Every digit must earn its cell. |
| Fifteen Puzzle | Slide tiles into order. Every move is a plan under a shrinking empty cell. |
| Monty Hall | Pick a door, see one empty door opened, then choose whether to stay or switch. |
| Number Chain | Find the rule linking a number sequence, then enter the next number. |
| Word Guess | Guess a five-letter word in six tries using green and amber letter clues. |
| Mate in One | Six named mating patterns. Find the single move that ends the game. |
| Ear Trainer | Two tones, always ascending. Name the interval. Relative pitch is trainable at any age. |
| Morse Code | Hear a short Morse rhythm, then choose the letter it represents. |
| Tower of Hanoi | Move every disk to peg 3 in the fewest moves. |
| Lights Out | Each press flips a cell and its neighbours. Darken a solvable grid. |
| Nonogram | Fill a 5×5 picture using the number clues beside each row and column. |
| Nim | Take any number from one heap. Whoever takes the final token wins. |
| Make 24 | Combine four numbers with +, −, ×, or ÷ to make exactly 24. |
| Tic-Tac-Toe | Place three in a row before the CPU does. Hard mode is unbeatable. |
| Anagram Scramble | Unscramble letters into real words under pressure. |
| Word Builder | Build valid words from 7 tiles in 60 seconds. |
| Periodic Quest | Match element symbols to names across 10 rounds. |
| Capital Quest | Match each country to its capital across ten quick rounds. |
| Math Safari Rush | Solve equations to clear the path. |
| Memory Match | Flip cards, match animal pairs, watch the streak. |
| Word Search Quest | Find hidden words in a letter grid. |

### LABS — personal packs and party prompts

Drinking-prompt carts are **18+**. They are prompt decks, not a bar.

| Game | Play |
|---|---|
| Non-Trivial | Answer questions drawn from Dr Non’s writing on books, cities, bikes, and sound. |
| Blow Into The Cartridge | Pick a 90s/00s deck, shout answers together, and keep score on paper. |
| King's Cup | 52-card ring of fire. Each card = a rule. Draw, deal, drink. |
| Never Have I Ever | Read a statement and lower one finger if you have done it. |
| Most Likely To | Read a prompt, point at one person, and count the group’s votes. |
| Ride the Bus | 4 phases: red/black, higher/lower, inside/outside, guess the suit. Survive all four. |
| Power Hour | Follow one new prompt each minute for a 60-minute group session. |
| Buzz (21) | Count to 21. +1, +2, or +3 each turn. Whoever says 21 drinks. |
| Truth or Dare | 30 truths, 30 dares. Answer or drink. |
| Higher or Lower | Single deck streak. Guess the next card. Drink on a wrong guess. |
| 2 Truths & a Lie | Tell two true statements and one lie, then let the group vote. |

**About Dr Non** is the SIGNAL cart on the same floor (not a game): why the floor exists.

## Stack

Plain ESM. `index.html` loads `js/app.js`, which registers one catalog entry per cartridge and a renderer in `js/games/`. Shared session, scores, and briefing live in `js/ui.js`, `js/storage.js`, and `js/brainGuides.js`. `server.js` is local static serving only.

Mechanic studies from other open-source projects are named in [CREDITS.md](CREDITS.md). No third-party game is iframed.

## License

[MIT](LICENSE). Copyright (c) 2026 Non Arkaraprasertkul.
