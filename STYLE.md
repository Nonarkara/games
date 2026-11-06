# Non-Gaming System — deliberate visual choices

The product is a browser arcade, not a generic productivity dashboard.
Preserve the dark cartridge floor, amber action ink, original game artwork,
pixel sprites, Jost reading face and JetBrains Mono score face. These are
established product choices, not permission for illegible text or inflated UI.

## Homepage hierarchy

Named grid: column. Entry is the large plain-language headline. Its exit holds
the explanation and one amber quick-play action. The small cabinet portrait is
supporting identity, not a competing full-bleed hero. On phones the text is the
entry; the portrait remains on larger screens and in link previews.

Attention order: understand the collection → start a short game → browse.
Featured game, rooms, daily picks and learning notes are secondary. Discovery
alternatives and mood choices remain in a named native disclosure. Do not turn
all pickers back into equal-weight primary buttons or hide the explanation on
phones to meet a row-top target.

Keep source order and keyboard order aligned. No idle homepage animation.
Spacing uses 4/8/12/16/24/32px. Buttons fit labels; no decorative logo boxes.
New games and their playfields may use task-specific palettes and geometry.

Rendered homepage budgets live in `scripts/hierarchy-browser.mjs`. A real game
name—not only its card border—must enter the first screen. This gate does not
replace independent screenshot review or the shared geometry/contrast audit.
