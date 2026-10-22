# Assessment — gamedev-skills/awesome-gamedev-agent-skills

Studied 2026-10-22. Source: <https://github.com/gamedev-skills/awesome-gamedev-agent-skills>
(Apache-2.0, 2.8k stars, 74 skills + a router).

## What it is

74 portable `SKILL.md` Agent Skills plus a **router** that fingerprints the project,
classifies the request, and loads only the matching skills — engine fundamentals
first, then the discipline concept, then genre glue, then workflow. Godot, Unity,
Unreal, Phaser, PixiJS, three.js, Bevy, pygame, LÖVE, Roblox.

The engine is the interesting part, not the content. It has three layers —
**exactly one** engine (exclusive) + **additive** disciplines + **additive**
genres + independent workflows — with an explicit ownership rule when they
overlap: the engine skill owns API, the discipline owns the portable concept,
the genre owns structure and links out instead of re-teaching a primitive.

Its engineering discipline is what we actually came for: a `validate-skills.py`
gate, a review rubric, and a rule that a skill is **not complete until it is
reachable from the router** — coverage is a test, not an intention.

## Verdict

**Take the discipline. Refuse the content. We are already ahead on the parts
that matter.**

### Refuse — the content

| Why | Detail |
|---|---|
| No engine, so no engine skills | 46 of 74 skills are Godot/Unity/Unreal/Roblox/Bevy APIs. We ship zero of those. They would be pure routing noise. |
| `create-game-assets` conflicts with our law | It advocates generated asset *families* locked to a visual target. Our 16-bit register requires hand-drawn 12×12 pixel art and treats AI-rendered art as a defect, not a source. Direct collision — hard refuse. |
| Version pinning is over-engineering here | Every skill is pinned to a stated engine release (Godot 4.7, Unity 6.3 LTS). We have no engine and no such migration surface. |
| Genre templates barely map | Our floor is 104 cognitive and classic cartridges — Stroop, N-back, Go, Sudoku, Spider. `platformer`/`fps-shooter`/`tower-defense`/`survival-crafting` do not apply. `puzzle` and `card-game` are marginal. |

One genuinely reusable idea: **`game-feel`'s importance-tier discipline** —
scale feedback to event importance, keep juice transient, never let feedback
block input. That is a good rule for our trainers and is already partly encoded
in `brainGuides.js`.

### Take — the discipline, applied to our own registries

We already do most of this well. Our guards are stronger than theirs in one
respect: **we mutation-test them**. `check-tailwind.mjs` deletes `.h-full` and
requires failure; `gamePreviews.test.mjs` removes a real entry and requires
failure. Upstream ships a validator but I did not find evidence it is
mutation-tested.

Two real gaps upstream's "router coverage" check exposed in our system:

1. **Prose can drift from the catalog.** Every registry test checks internal
   consistency; none checked the sentence a human reads. "One floor, five
   frameworks, **eighty** cartridges" shipped live against a floor of 104 with
   all tests green. → `js/countClaims.test.mjs`.

2. **Orphans were invisible.** Each registry proved it had no gaps; none proved
   it had no dead keys. Deleting one cart leaves live entries in five maps and
   every gap-test still passes. → `js/registryAgreement.test.mjs`.

Both are the same check they call router coverage: *is everything reachable, and
is everything reachable real?* Applied to cartridges rather than skills.

Both were first proven against one planted case each. That turned out to be
weaker evidence than it sounded: the 2026-10-22 audit of the audit planted 8
stale-claim forms and 7 orphan-key variants, and these detectors missed 5 and 2
of them respectively. Both are rebuilt and re-proven across the full set — see
`docs/AUDIT-2026-10-22.md`. One mutation is a smoke test; a table of them is a
guard.

### Consider later, not now

- **The script contract** — `script.py TARGET [--json] [--strict]`, exit 0/1/2,
  one `ERROR`/`WARNING path:line: message` line plus a `fix:` line per issue,
  then a `Summary:`. Our check scripts would be machine-consumable and
  self-describing with this. Real benefit, no urgency.
- **Ownership-on-overlap in prose.** Their rule — "the engine skill owns API,
  the discipline owns the concept, the genre links out" — is the right shape
  for our parallel registries. Worth writing down in `context.md` when a new
  registry is added, not before.

## Sources

- <https://github.com/gamedev-skills/awesome-gamedev-agent-skills> — README, catalog
- `docs/SKILL-FORMAT.md` — authoring standard, validator contract, review rubric
- `router/SKILL.md` — routing algorithm, composition rules, ownership-on-overlap
- `skills/disciplines/game-feel/SKILL.md` — sample skill body, read in full