/**
 * Dr Non — Non-Gaming System · Today's Five
 *
 * With 104 cartridges on the floor, the honest problem is not discovery — the
 * search and the moods handle that — it is that nothing gives you a reason to
 * come back tomorrow.
 *
 * The obvious mechanic is a streak, and this deliberately is not one. A streak
 * works by making you afraid to lose it, which is loss aversion pointed at the
 * user for the platform's benefit — a sludge, not a nudge, and the house rules
 * forbid shipping one (§12.5). Miss a day here and nothing is taken away,
 * because nothing was being held.
 *
 * What it does instead: five carts, chosen by the date, the same five for
 * everybody, rotating tomorrow. Curiosity rather than obligation. The pick is
 * deterministic so two people can compare notes on the same day, and seeded
 * only by the date so there is no profile being optimised against you.
 */

/** Days since epoch — the seed. Local midnight, because that is when a day turns. */
export function dayNumber(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / 86400000);
}

/** Small integer hash. Stable across runs and machines, unlike Math.random. */
function mix(seed) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export const DAILY_COUNT = 5;

/**
 * Five cartridges for the given day.
 *
 * Spread across rooms on purpose: five trainers in a row reads as homework,
 * and five arcade carts reads as a different product. One from each room, then
 * fill from whatever is left.
 *
 * 18+ carts are never in the pick. The drinking games are a deliberate part of
 * the floor, but this strip appears unasked on the front page, and putting
 * Ride the Bus in front of someone who did not go looking for it is the kind
 * of default that is nobody's friend.
 */
export function dailyFive(catalog, day = dayNumber(), count = DAILY_COUNT) {
  const pool = catalog.filter(g => g.wing !== 'meta' && g.age !== '18+');
  if (!pool.length) return [];

  // Rank every cart by a per-day hash of its id, so the order is stable for
  // the day and unrecognisable from one day to the next.
  const score = new Map();
  for (const g of pool) {
    let h = mix(day);
    for (let i = 0; i < g.id.length; i++) h = mix(h + g.id.charCodeAt(i));
    score.set(g.id, h);
  }
  const ranked = [...pool].sort((a, b) => score.get(a.id) - score.get(b.id));

  const picked = [];
  const seen = new Set();
  // One per room first.
  for (const wing of ['train', 'arcade', 'learn', 'labs']) {
    const first = ranked.find(g => g.wing === wing && !seen.has(g.id));
    if (first && picked.length < count) { picked.push(first); seen.add(first.id); }
  }
  // Then fill, still in the day's order.
  for (const g of ranked) {
    if (picked.length >= count) break;
    if (!seen.has(g.id)) { picked.push(g); seen.add(g.id); }
  }
  return picked.slice(0, count);
}

/** Friendly date label for the strip — no year, it is today. */
export function dailyLabel(date = new Date()) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}
