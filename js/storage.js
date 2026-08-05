/**
 * OmniArcade Local Storage & Persistence Service
 */

const STORAGE_KEY = 'omni_arcade_data_v1';

const defaultData = {
  highScores: {
    'cyber-tetris': 0,
    'cyber-pacman': 0,
    'math-safari': 0,
    'memory-match': 0,
    'word-search': 0,
    'cyber-snake': 0,
    'space-defender': 0,
    'neon-breakout': 0,
    'cyber-pong': 0,
    'flappy-bird': 0,
    'tower-stacker': 0,
    'minesweeper': 0,
    '2048-fusion': 0,
    'trivia-master': 0,
    'cyber-blackjack': 1000,
    'pattern-breaker': 0,
    'reflex-matrix': 0,
    'type-rush': 0,
    'slide-2048': 0,
    'cipher-breaker': 0,
    'ai-sandbox': 0
  },
  favorites: [],
  gamesPlayed: 0,
  theme: 'cyber', // 'cyber' | 'retro' | 'light'
  customGames: []
};

export class StorageService {
  static getData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch (e) {
      console.warn('LocalStorage access error:', e);
      return defaultData;
    }
  }

  static saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  static getHighScore(gameId) {
    const data = this.getData();
    return data.highScores[gameId] || 0;
  }

  static updateHighScore(gameId, score) {
    const data = this.getData();
    const currentHigh = data.highScores[gameId] || 0;
    if (score > currentHigh) {
      data.highScores[gameId] = score;
      data.gamesPlayed = (data.gamesPlayed || 0) + 1;
      this.saveData(data);
      return { isNewHigh: true, score };
    }
    data.gamesPlayed = (data.gamesPlayed || 0) + 1;
    this.saveData(data);
    return { isNewHigh: false, score: currentHigh };
  }

  static toggleFavorite(gameId) {
    const data = this.getData();
    const idx = data.favorites.indexOf(gameId);
    if (idx >= 0) {
      data.favorites.splice(idx, 1);
    } else {
      data.favorites.push(gameId);
    }
    this.saveData(data);
    return data.favorites.includes(gameId);
  }

  static isFavorite(gameId) {
    const data = this.getData();
    return data.favorites.includes(gameId);
  }

  static saveCustomGame(customGame) {
    const data = this.getData();
    data.customGames = data.customGames || [];
    data.customGames.unshift(customGame);
    this.saveData(data);
    return data.customGames;
  }

  static getCustomGames() {
    const data = this.getData();
    return data.customGames || [];
  }
}
