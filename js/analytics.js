/**
 * OmniArcade - Analytics & Adaptive Learning Service
 * Logs every play to localStorage in a backend-ready format.
 * Future: swap localStorage for a REST API — the contract is identical.
 */
const LOG_KEY = 'omni_arcade_analytics_v1';

const CATEGORY_SKILLS = {
  'math-logic': 'Mathematical Reasoning',
  'language': 'Language & Literacy',
  'memory-focus': 'Memory & Focus',
  'science': 'Science & Knowledge',
  'skills': 'Practical Skills',
  'kids-edu': 'Early Learning',
  'casual-friv': 'Reflex & Coordination',
  'classics': 'Spatial Reasoning',
  'retro-vault': 'Reflex & Coordination',
  'adult-mind': 'Critical Thinking',
  'ai-studio': 'Creativity'
};

export class AnalyticsService {
  static log(gameId, category, score, durationMs) {
    const entry = {
      gameId, category, score,
      skill: CATEGORY_SKILLS[category] || 'General',
      durationMs,
      timestamp: Date.now()
    };
    const log = this.getLog();
    log.push(entry);
    // Cap at 500 entries to avoid bloat.
    if (log.length > 500) log.splice(0, log.length - 500);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }

  static getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }

  /** Returns a skill profile: { skill: { plays, avgScore, lastPlayed } } */
  static getSkillProfile() {
    const log = this.getLog();
    const profile = {};
    log.forEach(e => {
      if (!profile[e.skill]) profile[e.skill] = { plays: 0, totalScore: 0, lastPlayed: 0 };
      profile[e.skill].plays++;
      profile[e.skill].totalScore += e.score || 0;
      profile[e.skill].lastPlayed = Math.max(profile[e.skill].lastPlayed, e.timestamp);
    });
    return profile;
  }

  /** The skill the user has practiced LEAST (or never) — for the adaptive strip. */
  static getWeakestSkill() {
    const profile = this.getSkillProfile();
    const allSkills = [...new Set(Object.values(CATEGORY_SKILLS))];
    let weakest = null, fewest = Infinity;
    allSkills.forEach(skill => {
      const p = profile[skill];
      const plays = p ? p.plays : 0;
      if (plays < fewest) { fewest = plays; weakest = skill; }
    });
    return weakest;
  }

  /** Recommended games: from the weakest skill area, not recently played. */
  static getRecommendations(catalog, limit = 3) {
    const weakest = this.getWeakestSkill();
    if (!weakest) return [];
    // Map skill back to categories.
    const targetCats = Object.entries(CATEGORY_SKILLS).filter(([, s]) => s === weakest).map(([c]) => c);
    const recent = new Set(this.getLog().slice(-10).map(e => e.gameId));
    let pool = catalog.filter(g => targetCats.includes(g.category));
    // Prefer not-recently-played.
    let recs = pool.filter(g => !recent.has(g.id));
    if (recs.length < limit) recs = recs.concat(pool.filter(g => recent.has(g.id)));
    return recs.slice(0, limit);
  }

  static hasHistory() { return this.getLog().length > 0; }
}