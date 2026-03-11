/**
 * WIZARD NES - AI Points Engine
 * Calculates scores, rankings, and contest performance using AI-inspired algorithms
 */

'use strict';

const AIEngine = (() => {

  /* ---- Constants ---- */
  const WEIGHTS = {
    basePoints:       1.0,
    coinsBonus:       0.05,
    levelsMultiplier: 1.15,
    speedBonus:       2.0,
    consistencyBonus: 0.3,
    velocityBonus:    0.5,
    watchTimeBonus:   0.2,
    streakMultiplier: 1.1,
  };

  const RANK_THRESHOLDS = [
    { min: 50000, title: '👑 WIZARD MASTER',    color: '#ffd700' },
    { min: 25000, title: '⚔️  DUNGEON LORD',      color: '#ff69b4' },
    { min: 10000, title: '🧙 ARCANE KNIGHT',     color: '#9b59b6' },
    { min: 5000,  title: '🛡️  CHAMPION',           color: '#00e5ff' },
    { min: 2000,  title: '🗡️  WARRIOR',            color: '#00c800' },
    { min: 500,   title: '🪄  APPRENTICE',         color: '#f5a623' },
    { min: 100,   title: '⭐ ADVENTURER',         color: '#e94560' },
    { min: 0,     title: '🧪 NOVICE',             color: '#808080' },
  ];

  const ACHIEVEMENT_DEFINITIONS = [
    { id: 'first_game',    icon: '🎮', name: 'FIRST GAME',    desc: 'Play your first NES game',       req: (u) => u.gamesPlayed >= 1 },
    { id: 'coin_100',      icon: '🪙', name: '100 COINS',     desc: 'Collect 100 coins',               req: (u) => u.coins >= 100 },
    { id: 'coin_1000',     icon: '💰', name: '1K COINS',      desc: 'Collect 1,000 coins',             req: (u) => u.coins >= 1000 },
    { id: 'level_1',       icon: '🏆', name: 'FIRST LEVEL',   desc: 'Complete your first level',       req: (u) => u.levelsCompleted >= 1 },
    { id: 'level_10',      icon: '🥇', name: '10 LEVELS',     desc: 'Complete 10 levels',              req: (u) => u.levelsCompleted >= 10 },
    { id: 'speed_first',   icon: '⚡', name: 'SPEED DEMON',   desc: 'Enter your first speed contest',  req: (u) => u.contestsEntered >= 1 },
    { id: 'speed_win',     icon: '🏅', name: 'SPEED WINNER',  desc: 'Win a speed contest',             req: (u) => u.contestsWon >= 1 },
    { id: 'point_500',     icon: '⭐', name: '500 POINTS',    desc: 'Earn 500 points',                 req: (u) => u.points >= 500 },
    { id: 'point_5000',    icon: '🌟', name: '5K POINTS',     desc: 'Earn 5,000 points',               req: (u) => u.points >= 5000 },
    { id: 'point_50000',   icon: '💫', name: '50K POINTS',    desc: 'Earn 50,000 points',              req: (u) => u.points >= 50000 },
    { id: 'movie_watch',   icon: '🎬', name: 'MOVIE FAN',     desc: 'Watch a cartoon movie',           req: (u) => u.moviesWatched >= 1 },
    { id: 'movie_10',      icon: '🎥', name: 'CINEPHILE',     desc: 'Watch 10 cartoon movies',         req: (u) => u.moviesWatched >= 10 },
    { id: 'login_streak_7',icon: '📅', name: 'WEEK STREAK',   desc: '7 day login streak',              req: (u) => u.loginStreak >= 7 },
    { id: 'login_streak_30',icon:'🗓️', name: 'MONTH STREAK',  desc: '30 day login streak',             req: (u) => u.loginStreak >= 30 },
  ];

  /* ---- Internal helpers ---- */
  function calculateVelocity(recentActivity) {
    if (!recentActivity || recentActivity.length === 0) return 0;
    const now = Date.now();
    const recentPoints = recentActivity
      .filter(a => now - a.timestamp < 7 * 24 * 60 * 60 * 1000)
      .reduce((sum, a) => sum + (a.points || 0), 0);
    return Math.floor(recentPoints * WEIGHTS.velocityBonus);
  }

  function calculateConsistency(loginDates) {
    if (!loginDates || loginDates.length < 2) return 0;
    const sorted = [...loginDates].sort();
    let streak = 1, maxStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / (1000 * 60 * 60 * 24);
      if (diff <= 1.5) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else { streak = 1; }
    }
    return Math.floor(maxStreak * WEIGHTS.consistencyBonus * 100);
  }

  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function normalizeScore(score, maxScore) {
    return sigmoid((score / (maxScore || 1000)) * 6 - 3);
  }

  /* ---- Public API ---- */

  /**
   * Calculate AI-enhanced score for a user
   * Uses multiple weighted factors inspired by ML scoring models
   */
  function calculateAIScore(user) {
    if (!user) return 0;

    const base       = (user.points || 0) * WEIGHTS.basePoints;
    const coinsBonus = (user.coins || 0) * WEIGHTS.coinsBonus;
    const levelsScore = Math.pow(user.levelsCompleted || 0, WEIGHTS.levelsMultiplier) * 10;
    const speedScore  = (user.bestSpeedTime || 0) > 0
      ? WEIGHTS.speedBonus * 1000 / user.bestSpeedTime
      : 0;
    const velocity    = calculateVelocity(user.recentActivity || []);
    const consistency = calculateConsistency(user.loginDates || []);
    const watchBonus  = (user.moviesWatched || 0) * WEIGHTS.watchTimeBonus * 100;
    const streakMult  = user.loginStreak > 1
      ? Math.pow(WEIGHTS.streakMultiplier, Math.min(user.loginStreak, 30))
      : 1;
    const contestBonus = (user.contestsWon || 0) * 500 + (user.contestsEntered || 0) * 50;

    const rawScore = (base + coinsBonus + levelsScore + speedScore + watchBonus + contestBonus)
                     * streakMult + velocity + consistency;

    return Math.round(rawScore);
  }

  /**
   * Get user rank title based on AI score
   */
  function getRank(aiScore) {
    return RANK_THRESHOLDS.find(t => aiScore >= t.min) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  }

  /**
   * Calculate percentile rank among all users
   */
  function calculatePercentile(userScore, allScores) {
    if (!allScores || allScores.length === 0) return 100;
    const below = allScores.filter(s => s < userScore).length;
    return Math.round((below / allScores.length) * 100);
  }

  /**
   * Predict next rank requirements
   */
  function predictNextRank(currentAIScore) {
    const currentRankIndex = RANK_THRESHOLDS.findIndex(t => currentAIScore >= t.min);
    if (currentRankIndex === 0) return null; // Already at top
    const nextRank = RANK_THRESHOLDS[currentRankIndex - 1];
    return {
      title:      nextRank.title,
      needed:     nextRank.min - currentAIScore,
      percentage: Math.round((currentAIScore / nextRank.min) * 100),
    };
  }

  /**
   * Generate AI analysis report for a user
   */
  function generateReport(user) {
    const aiScore   = calculateAIScore(user);
    const rank      = getRank(aiScore);
    const nextRank  = predictNextRank(aiScore);
    const strengths = [];
    const tips      = [];

    // Analyze strengths
    if ((user.coins || 0) > 500)            strengths.push('💰 Expert coin collector');
    if ((user.levelsCompleted || 0) > 20)   strengths.push('🏆 Level master');
    if ((user.contestsWon || 0) > 0)        strengths.push('⚡ Speed contest champion');
    if ((user.moviesWatched || 0) > 5)      strengths.push('🎬 Movie enthusiast');
    if ((user.loginStreak || 0) >= 7)       strengths.push('📅 Dedicated player');

    // Generate tips
    if ((user.coins || 0) < 100)            tips.push('Collect more coins in NES games for bonus multipliers');
    if ((user.levelsCompleted || 0) < 5)    tips.push('Complete more levels to boost your AI score significantly');
    if ((user.contestsEntered || 0) === 0)  tips.push('Enter speed contests for massive point bonuses');
    if ((user.moviesWatched || 0) < 3)      tips.push('Watch cartoons in the Movie Theater for watch time bonuses');
    if ((user.loginStreak || 0) < 3)        tips.push('Log in daily to build your streak multiplier');

    return { aiScore, rank, nextRank, strengths, tips };
  }

  /**
   * Calculate speed contest score
   * Faster completion = higher score, with complexity bonuses
   */
  function calculateSpeedScore(timeMs, difficulty, perfectRun) {
    const baseTime   = 60000; // 60 seconds baseline
    const timeScore  = Math.max(0, (baseTime - timeMs) / 1000) * difficulty * 100;
    const perfectMult = perfectRun ? 1.5 : 1.0;
    return Math.round(timeScore * perfectMult);
  }

  /**
   * Check and return newly unlocked achievements
   */
  function checkAchievements(user) {
    const unlocked    = new Set(user.achievements || []);
    const newUnlocks  = [];

    for (const ach of ACHIEVEMENT_DEFINITIONS) {
      if (!unlocked.has(ach.id) && ach.req(user)) {
        newUnlocks.push(ach);
      }
    }

    return newUnlocks;
  }

  /**
   * Get all achievement definitions with unlock status
   */
  function getAllAchievements(user) {
    const unlocked = new Set(user.achievements || []);
    return ACHIEVEMENT_DEFINITIONS.map(a => ({
      ...a,
      unlocked: unlocked.has(a.id),
    }));
  }

  /**
   * Sort leaderboard using AI scores
   */
  function sortLeaderboard(users) {
    return users
      .map(u => ({ ...u, aiScore: calculateAIScore(u) }))
      .sort((a, b) => b.aiScore - a.aiScore);
  }

  /**
   * Generate simulated leaderboard data
   */
  function generateLeaderboardData(count = 20) {
    const names    = [
      'MarioMaster','ZeldaHero','LinkRunner','SamusX','KirbyFan',
      'MegaManX','CastleBoss','DKKing','StarFoxAce','IceClimber',
      'NinjaTurtle','PacManGhost','SpaceInvader','GalagaAce','QBertFan',
      'BombermanX','ContraHero','CupheadFan','SonicFast','Toadette88',
    ];
    const avatars = ['🧙','⚔️','🛡️','🪄','👑','🎮','🕹️','🎲','🏆','⭐','🌟','💫','🔥','💎','🌊'];

    return names.slice(0, count).map((name, i) => {
      const points         = Math.floor(Math.random() * 40000) + (count - i) * 2000;
      const coins          = Math.floor(Math.random() * 5000) + 500;
      const levelsCompleted = Math.floor(Math.random() * 50) + 5;
      const bestSpeedTime  = Math.floor(Math.random() * 55000) + 5000;
      const contestsWon    = Math.floor(Math.random() * 10);
      const moviesWatched  = Math.floor(Math.random() * 20);
      const loginStreak    = Math.floor(Math.random() * 30) + 1;

      const user = {
        id: `ai_user_${i}`,
        name,
        avatar: avatars[i % avatars.length],
        points,
        coins,
        levelsCompleted,
        bestSpeedTime,
        contestsWon,
        contestsEntered: contestsWon + Math.floor(Math.random() * 5),
        moviesWatched,
        loginStreak,
        recentActivity: [],
        loginDates: [],
        achievements: [],
      };

      return { ...user, aiScore: calculateAIScore(user) };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }

  return {
    calculateAIScore,
    getRank,
    calculatePercentile,
    predictNextRank,
    generateReport,
    calculateSpeedScore,
    checkAchievements,
    getAllAchievements,
    sortLeaderboard,
    generateLeaderboardData,
    RANK_THRESHOLDS,
    ACHIEVEMENT_DEFINITIONS,
  };

})();

// Export for module usage (optional)
if (typeof module !== 'undefined') module.exports = AIEngine;
