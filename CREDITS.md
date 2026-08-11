# Open-source game credits

Dr Non's Non-Gaming System (NGS) uses original vanilla-JavaScript renderers inside its own game lifecycle. Where a mechanic or implementation study came from an open-source project, the source and license are named here and inside the relevant game.

## Added in the arcade revival

| Game | Source | Creator | License | What NGS changed |
|---|---|---|---|---|
| Breakout 1976 | [kubowania/breakout](https://github.com/kubowania/breakout) | Ania Kubow | MIT | Rebuilt for canvas scaling, touch/keyboard input, rebound control, scoring, lifecycle cleanup, and the Axiom learning layer. |
| Pong 1972 | [jakesgordon/javascript-pong](https://github.com/jakesgordon/javascript-pong) | Jake Gordon | MIT | Rebuilt as a responsive single-player match with pointer controls, adaptive ball speed, scoring, lifecycle cleanup, and the Axiom learning layer. |
| Sudoku Sprint | [robatron/sudoku.js](https://github.com/robatron/sudoku.js) | Rob Olson | MIT | Puzzle study; NGS boards and UI are original. Library not bundled. |
| Fifteen Puzzle | [imshubhamsingh/15-puzzle](https://github.com/imshubhamsingh/15-puzzle) | Shubham Singh | MIT | Solvability / slide study; NGS board, scoring, and UI are original. |
| Warehouse Push | [straker/basic-sokoban](https://gist.github.com/straker/2fddb507d4bb6bec54ea2fdb022d020c) | Steven Lambert | CC0 1.0 | Format and movement study; NGS levels, state engine, undo, scoring, responsive UI, and solvability tests are original. The mechanic traces to Hiroyuki Imabayashi's 1982 Sokoban. |

## Existing mechanic studies

| Game | Source | Creator / project | License | Use |
|---|---|---|---|---|
| Pattern Breaker | [maxwellito/breaklock](https://github.com/maxwellito/breaklock) | Maxwell Ito | MIT | Mechanic study; reimplemented in NGS. |
| Type Rush | [ninest/typer](https://github.com/ninest/typer), [knadh/wordpluck](https://github.com/knadh/wordpluck) | ninest; Kailash Nadh | MIT | Mechanic studies; reimplemented in NGS. |
| Reflex Matrix | [Sagar-Sharma-7/Reaction-Game](https://github.com/Sagar-Sharma-7/Reaction-Game), [zoozf/TestYourReactions](https://github.com/zoozf/TestYourReactions) | Sagar Sharma; zoozf | MIT | Genre studies; reimplemented in NGS. |
| Slide 2048 | [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048) | Gabriele Cirulli | MIT | Classic mechanic reference; reimplemented in NGS. |

No third-party game is embedded as an iframe. This keeps controls, accessibility, saved scores, and teardown behavior consistent on phones and laptops.
