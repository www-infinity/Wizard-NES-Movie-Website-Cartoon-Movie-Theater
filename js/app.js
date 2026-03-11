/**
 * WIZARD NES - Main Application
 * User points, coins, levels, streaks, and UI management
 */

'use strict';

const App = (() => {

  /* ---- User Data Schema ---- */
  const DEFAULT_USER = {
    name:             'PLAYER 1',
    avatar:           '🎮',
    points:           0,
    coins:            0,
    levelsCompleted:  0,
    gamesPlayed:      0,
    bestSpeedTime:    0,
    contestsEntered:  0,
    contestsWon:      0,
    moviesWatched:    0,
    watchTimeMinutes: 0,
    loginStreak:      0,
    lastLogin:        null,
    loginDates:       [],
    recentActivity:   [],
    achievements:     [],
    createdAt:        Date.now(),
  };

  const STORAGE_KEY = 'wizard_nes_user';
  const LB_KEY      = 'wizard_nes_leaderboard';

  let user      = null;
  let toastTimer = null;

  /* ---- Persistence ---- */
  function loadUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      user = saved ? { ...DEFAULT_USER, ...JSON.parse(saved) } : { ...DEFAULT_USER };
    } catch (e) {
      user = { ...DEFAULT_USER };
    }
    updateLoginStreak();
    saveUser();
    return user;
  }

  function saveUser() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) { /* storage full */ }
  }

  function resetUser() {
    user = { ...DEFAULT_USER, name: user.name, avatar: user.avatar };
    saveUser();
    updateAllDisplays();
    showToast('✨ Profile reset!', 'info');
  }

  /* ---- Login Streak ---- */
  function updateLoginStreak() {
    const today  = new Date().toDateString();
    const lastLogin = user.lastLogin;

    if (!lastLogin) {
      user.loginStreak = 1;
      user.lastLogin   = today;
      if (!user.loginDates.includes(today)) user.loginDates.push(today);
      addPoints(20, 'Daily login bonus!');
      return;
    }

    if (lastLogin === today) return; // already logged in today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastLogin === yesterday) {
      user.loginStreak++;
      const bonus = Math.min(user.loginStreak * 10, 100);
      addPoints(bonus, `🔥 Day ${user.loginStreak} streak! +${bonus} pts`);
    } else {
      user.loginStreak = 1;
      addPoints(20, 'Daily login bonus!');
    }

    user.lastLogin = today;
    if (!user.loginDates.includes(today)) user.loginDates.push(today);
  }

  /* ---- Points & Currency ---- */
  function addPoints(amount, reason) {
    if (!user) return;
    const prev = user.points;
    user.points += amount;

    // Track recent activity
    user.recentActivity.push({ points: amount, timestamp: Date.now(), reason });
    if (user.recentActivity.length > 100) user.recentActivity.shift();

    saveUser();
    updatePointsDisplay();
    if (reason) triggerPointsPopup(amount, reason);

    // Check achievements
    const newAchs = AIEngine.checkAchievements(user);
    newAchs.forEach(ach => {
      user.achievements.push(ach.id);
      saveUser();
      showToast(`🏆 Achievement Unlocked: ${ach.name}!`, 'success');
    });
  }

  function addCoins(amount) {
    if (!user) return;
    user.coins += amount;
    addPoints(Math.floor(amount * 0.5), null); // coins give half points
    saveUser();
    updateCoinsDisplay();
    triggerPointsPopup(amount, null, '🪙');
  }

  function completeLevel() {
    if (!user) return;
    user.levelsCompleted++;
    const bonus = 50 + user.levelsCompleted * 5;
    addPoints(bonus, `🏆 Level ${user.levelsCompleted} complete! +${bonus} pts`);
    addCoins(10);
    saveUser();
  }

  function recordGamePlay() {
    if (!user) return;
    user.gamesPlayed++;
    addPoints(10, '🎮 Game started! +10 pts');
    saveUser();
  }

  function recordMovieWatch(movieId, pointValue) {
    if (!user) return;
    user.moviesWatched++;
    addPoints(pointValue || 30, `🎬 Watched a movie! +${pointValue || 30} pts`);
    saveUser();
  }

  function recordSpeedContest(timeMs, won) {
    if (!user) return;
    user.contestsEntered++;
    if (won) {
      user.contestsWon++;
      addPoints(500, '⚡ Speed Contest WIN! +500 pts');
    } else {
      addPoints(100, '⚡ Speed Contest entry! +100 pts');
    }
    if (!user.bestSpeedTime || timeMs < user.bestSpeedTime) {
      user.bestSpeedTime = timeMs;
    }
    saveUser();
  }

  /* ---- UI Updates ---- */
  function updateAllDisplays() {
    updatePointsDisplay();
    updateCoinsDisplay();
    updateUserDisplay();
  }

  function updatePointsDisplay() {
    const pts = user ? user.points : 0;
    document.querySelectorAll('[data-points]').forEach(el => {
      el.textContent = pts.toLocaleString();
    });
  }

  function updateCoinsDisplay() {
    const coins = user ? user.coins : 0;
    document.querySelectorAll('[data-coins]').forEach(el => {
      el.textContent = coins.toLocaleString();
    });
  }

  function updateUserDisplay() {
    if (!user) return;
    document.querySelectorAll('[data-username]').forEach(el => {
      el.textContent = user.name;
    });
    document.querySelectorAll('[data-avatar]').forEach(el => {
      el.textContent = user.avatar;
    });
  }

  /* ---- Points Popup ---- */
  function triggerPointsPopup(amount, reason, icon = '⭐') {
    const popup = document.createElement('div');
    popup.className = 'points-popup';
    popup.style.color = amount > 0 ? '#ffd700' : '#ff4444';
    popup.style.left = `${20 + Math.random() * 60}%`;
    popup.style.top  = '70%';

    const sign = amount > 0 ? '+' : '';
    popup.textContent = reason
      ? `${icon} ${sign}${amount}`
      : `${icon} ${sign}${amount}`;

    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1600);
  }

  /* ---- Toast Notifications ---- */
  function showToast(message, type = 'default') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    // Sound effect (optional)
    playSound(type === 'success' ? 'coin' : type === 'error' ? 'error' : 'click');

    setTimeout(() => {
      toast.style.animation = 'toast-in 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /* ---- Sound Effects ---- */
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const sounds = {
        coin:  { freq: [523, 659, 784], dur: 0.08 },
        click: { freq: [440],           dur: 0.05 },
        error: { freq: [200, 150],      dur: 0.1  },
        level: { freq: [523, 659, 784, 1047], dur: 0.12 },
        win:   { freq: [523, 659, 784, 1047, 1319], dur: 0.1 },
      };

      const sound = sounds[type] || sounds.click;
      let t = ctx.currentTime;

      sound.freq.forEach(freq => {
        osc.frequency.setValueAtTime(freq, t);
        t += sound.dur;
      });

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.freq.length * sound.dur + 0.1);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + sound.freq.length * sound.dur + 0.1);
    } catch (e) { /* Web Audio not supported */ }
  }

  /* ---- Profile Modal ---- */
  function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    modal.classList.add('active');
    renderProfileContent();
  }

  function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('active');
  }

  function renderProfileContent() {
    const content = document.getElementById('profile-modal-content');
    if (!content || !user) return;

    const report  = AIEngine.generateReport(user);
    const aiScore = report.aiScore;
    const rank    = report.rank;

    content.innerHTML = `
      <div class="profile-card" style="max-width:100%">
        <div class="profile-avatar" style="background:var(--nes-blue)">
          <span style="font-size:4rem">${user.avatar}</span>
        </div>
        <div class="profile-name">${user.name}</div>
        <div class="profile-rank" style="color:${rank.color}">${rank.title}</div>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="icon">⭐</span>
            <div class="value text-yellow">${user.points.toLocaleString()}</div>
            <div class="label">POINTS</div>
          </div>
          <div class="stat-card">
            <span class="icon">🪙</span>
            <div class="value text-cyan">${user.coins.toLocaleString()}</div>
            <div class="label">COINS</div>
          </div>
          <div class="stat-card">
            <span class="icon">🏆</span>
            <div class="value text-yellow">${user.levelsCompleted}</div>
            <div class="label">LEVELS</div>
          </div>
          <div class="stat-card">
            <span class="icon">⚡</span>
            <div class="value text-pink">${user.contestsWon}</div>
            <div class="label">WINS</div>
          </div>
          <div class="stat-card">
            <span class="icon">🎬</span>
            <div class="value text-cyan">${user.moviesWatched}</div>
            <div class="label">MOVIES</div>
          </div>
          <div class="stat-card">
            <span class="icon">🔥</span>
            <div class="value text-red">${user.loginStreak}</div>
            <div class="label">STREAK</div>
          </div>
        </div>

        <div class="ai-panel mt-4" style="text-align:left">
          <div class="ai-panel-header">
            <span class="ai-icon">🤖</span>
            <div>
              <div class="ai-title">AI SCORE: ${aiScore.toLocaleString()}</div>
              <div style="font-family:var(--vt-font);color:var(--nes-gray);font-size:1.6rem">
                ${rank.title}
              </div>
            </div>
          </div>
          ${report.nextRank ? `
            <div class="progress-container">
              <div class="progress-label">
                <span>Next Rank Progress</span>
                <span>${report.nextRank.percentage}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill progress-points" style="width:${report.nextRank.percentage}%"></div>
              </div>
              <div style="font-family:var(--vt-font);color:var(--nes-gray);font-size:1.4rem;margin-top:0.5rem">
                ${report.nextRank.needed.toLocaleString()} AI pts until ${report.nextRank.title}
              </div>
            </div>` : '<div class="text-yellow" style="font-family:var(--pixel-font);font-size:1rem">🏆 TOP RANK ACHIEVED!</div>'}

          ${report.strengths.length > 0 ? `
            <div style="margin-top:1.5rem">
              <div style="font-family:var(--pixel-font);color:var(--nes-green);font-size:0.85rem;margin-bottom:0.8rem">YOUR STRENGTHS</div>
              ${report.strengths.map(s => `<div style="font-family:var(--vt-font);font-size:1.6rem;color:var(--nes-white);margin:0.3rem 0">${s}</div>`).join('')}
            </div>` : ''}

          ${report.tips.length > 0 ? `
            <div style="margin-top:1.5rem">
              <div style="font-family:var(--pixel-font);color:var(--nes-yellow);font-size:0.85rem;margin-bottom:0.8rem">AI TIPS</div>
              ${report.tips.map(t => `<div style="font-family:var(--vt-font);font-size:1.6rem;color:var(--nes-gray);margin:0.3rem 0">💡 ${t}</div>`).join('')}
            </div>` : ''}
        </div>

        <div class="achievements-grid mt-4">
          ${AIEngine.getAllAchievements(user).map(a => `
            <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
              <span class="badge-icon">${a.icon}</span>
              <span class="badge-name">${a.name}</span>
            </div>`).join('')}
        </div>

        <div style="margin-top:2rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
          <button class="nes-btn nes-btn-secondary" onclick="App.openNameModal()">✏️ CHANGE NAME</button>
          <button class="nes-btn nes-btn-primary" onclick="App.resetUser()">🔄 RESET</button>
        </div>
      </div>
    `;
  }

  /* ---- Name Change Modal ---- */
  function openNameModal() {
    const name = prompt('Enter your player name (max 12 chars):');
    if (name && name.trim()) {
      user.name = name.trim().toUpperCase().slice(0, 12);
      saveUser();
      updateUserDisplay();
      showToast(`🎮 Name changed to ${user.name}!`, 'success');
      renderProfileContent();
    }
  }

  /* ---- Stars Background ---- */
  function createStars(containerId, count = 80) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        --duration: ${2 + Math.random() * 4}s;
        --delay: ${Math.random() * 3}s;
        width: ${1 + Math.random() * 3}px;
        height: ${1 + Math.random() * 3}px;
      `;
      container.appendChild(star);
    }
  }

  /* ---- Loading Screen ---- */
  function initLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    setTimeout(() => screen.classList.add('hidden'), 2200);
  }

  /* ---- Intersection Observer for Animations ---- */
  function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .movie-card, .game-card, .contest-card').forEach(el => {
      observer.observe(el);
    });
  }

  /* ---- Animated Counters ---- */
  function animateCounter(el, target, duration = 2000) {
    const start = 0;
    const step  = (timestamp) => {
      if (!el._startTime) el._startTime = timestamp;
      const progress = Math.min((timestamp - el._startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(start + (target - start) * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initStatCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseInt(el.dataset.counter, 10);
      if (!isNaN(target)) animateCounter(el, target);
    });
  }

  /* ---- Active Nav Link ---- */
  function setActiveNavLink() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  /* ---- Event Delegation ---- */
  function initEvents() {
    // Profile button
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      switch (action) {
        case 'open-profile':  openProfileModal(); break;
        case 'close-modal':   closeProfileModal(); break;
        case 'add-demo-coin': addCoins(1); break;
        case 'play-game':     recordGamePlay(); break;
        case 'complete-level':completeLevel(); break;
        default: break;
      }
    });

    // Modal overlay click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  /* ---- Public Init ---- */
  function init() {
    loadUser();
    initLoadingScreen();
    createStars('hero-stars');
    updateAllDisplays();
    setActiveNavLink();
    initEvents();
    initAnimations();
    initStatCounters();
  }

  /* ---- Public API ---- */
  return {
    init,
    getUser:             () => user,
    addPoints,
    addCoins,
    completeLevel,
    recordGamePlay,
    recordMovieWatch,
    recordSpeedContest,
    showToast,
    playSound,
    openProfileModal,
    closeProfileModal,
    openNameModal,
    resetUser,
    animateCounter,
    updateAllDisplays,
  };

})();

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', App.init);
