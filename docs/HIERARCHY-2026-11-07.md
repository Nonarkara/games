# Homepage hierarchy repair

User finding: everything competed for attention and the site did not explain
itself. The supplied screenshot showed slogan, three equal pickers, house game,
learning disclosure, oversized room tabs and daily picks all asking to lead.

Direction: preserve the authored arcade, repair the reading order. Column grid;
headline leads, explanation and quick-play sit immediately below it. Amber is
reserved for quick-play. No change to game mechanics, storage or backend.

Changes: plain-language collection description visible on phones; one primary
start action; additional pickers/moods in a native disclosure; quiet house-game
row; compact room tabs with counts; compact daily picks; desktop cartridge names
paired with their sprites rather than buried below badges and an empty gap.
Every game, picker, room and learning note remains reachable.

Measured on Chrome, fresh profile, 390×844 / 1024×900 / 1440×900:

| Region | Before phone/tablet/desktop px | After phone/tablet/desktop px |
|---|---|---|
| Sticky header | 45 / 45 / 45 | 45 / 45 / 45 |
| Attract + feature | 234 / 716 / 630 | 465 / 454 / 454 |
| Directory | 122 / 177 / 177 | 85 / 89 / 89 |
| First catalogue row top | 609 / 1280 / 1194 | 757 / 793 / 793 |

The phone opening grows intentionally: the previous version hid the explanation.
It now answers what the site is and how to start, while retaining a visible
catalogue name within the first screen. This is comprehension, not a density
contest. Tablet/desktop remove the stretched introduction and repeated chrome.

Budgets: intro <400px, quick-play bottom <400px, explanation visible, headline
≥1.5× featured title, actual first game name inside viewport, no overflow.
Falsifier restores the legacy 540px hero floor and must fail the intro budget.
Rendered geometry audit also checks header and page-wide text contrast.

Independent reviewer: hierarchy_review. Findings closed: names below the desktop
fold; tiny labels in large expanded mood boxes. The latter now uses two compact
columns with readable labels and blurbs. Browser flows cover quick-play,
surprise, room selection, search, empty results and doubled decision text.

Run with a configured Playwright install:
`PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/hierarchy-browser.mjs`
Use `HIERARCHY_URL=https://games.nonarkara.org` after deployment.
