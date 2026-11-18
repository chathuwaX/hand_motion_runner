/**
 * GameOver.js
 * Game Over screen displaying run statistics (score, distance, coins, record badge)
 * and providing options to replay, recalibrate, or return to the main menu.
 */

export class GameOver {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.element = null;

    this.createElements();
  }

  createElements() {
    this.element = document.createElement('div');
    this.element.className = 'ui-screen game-over-screen';

    this.element.innerHTML = `
      <div class="game-over-backdrop"></div>
      <div class="game-over-container glass-panel">
        <div class="game-over-header">
          <div class="crash-banner">COLLISION DETECTED</div>
          <h2 class="game-over-title">GAME OVER</h2>
        </div>

        <div id="new-record-badge" class="new-record-pill hidden">
          🌟 NEW PERSONAL BEST! 🌟
        </div>

        <div class="stats-summary-grid">
          <div class="summary-card">
            <span class="card-label">TOTAL SCORE</span>
            <span id="go-score" class="card-value highlight-gold">0</span>
          </div>

          <div class="summary-card">
            <span class="card-label">DISTANCE</span>
            <span id="go-distance" class="card-value">0 m</span>
          </div>

          <div class="summary-card">
            <span class="card-label">COINS COLLECTED</span>
            <span id="go-coins" class="card-value highlight-cyan">0</span>
          </div>

          <div class="summary-card">
            <span class="card-label">ALL-TIME BEST</span>
            <span id="go-best" class="card-value">0</span>
          </div>
        </div>

        <div class="game-over-actions">
          <button id="btn-go-restart" class="btn btn-primary btn-glow">🔄 PLAY AGAIN</button>
          <button id="btn-go-recalib" class="btn btn-secondary">🖐️ RECALIBRATE</button>
          <button id="btn-go-menu" class="btn btn-ghost">🏠 MAIN MENU</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);
    this.bindEvents();
  }

  bindEvents() {
    const btnRestart = this.element.querySelector('#btn-go-restart');
    const btnRecalib = this.element.querySelector('#btn-go-recalib');
    const btnMenu = this.element.querySelector('#btn-go-menu');

    btnRestart.addEventListener('click', () => {
      if (this.callbacks.onRestart) this.callbacks.onRestart();
    });

    btnRecalib.addEventListener('click', () => {
      if (this.callbacks.onRecalibrate) this.callbacks.onRecalibrate();
    });

    btnMenu.addEventListener('click', () => {
      if (this.callbacks.onMainMenu) this.callbacks.onMainMenu();
    });
  }

  setStats(stats) {
    const elScore = this.element.querySelector('#go-score');
    const elDist = this.element.querySelector('#go-distance');
    const elCoins = this.element.querySelector('#go-coins');
    const elBest = this.element.querySelector('#go-best');
    const recordBadge = this.element.querySelector('#new-record-badge');

    elScore.textContent = stats.score.toLocaleString();
    elDist.textContent = `${stats.distance} m`;
    elCoins.textContent = stats.coins;
    elBest.textContent = stats.highScore.toLocaleString();

    if (stats.isNewRecord && stats.score > 0) {
      recordBadge.classList.remove('hidden');
    } else {
      recordBadge.classList.add('hidden');
    }
  }

  show() {
    this.element.classList.add('active');
  }

  hide() {
    this.element.classList.remove('active');
  }
}
