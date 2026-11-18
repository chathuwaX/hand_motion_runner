/**
 * MainMenu.js
 * High-energy cyber arcade main menu with mode selection,
 * interactive how-to-play guide, settings button, and high score display.
 */

export class MainMenu {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.element = null;
    this.createElements();
  }

  createElements() {
    this.element = document.createElement('div');
    this.element.className = 'ui-screen main-menu-screen active';

    this.element.innerHTML = `
      <div class="menu-backdrop"></div>
      <div class="menu-content">
        <div class="game-branding">
          <div class="cyber-badge">3D MOTION CONTROLLED RUNNER</div>
          <h1 class="game-title">
            <span class="title-motion">MOTION</span>
            <span class="title-runner">RUNNER</span>
          </h1>
          <p class="game-tagline">Real-Time Webcam Hand Tracking Subway Adventure</p>
        </div>

        <div class="menu-action-card">
          <button id="btn-play-hand" class="btn btn-primary btn-glow">
            <span class="btn-icon">🖐️</span>
            <div class="btn-text">
              <span class="btn-heading">PLAY WITH HAND MOTION</span>
              <span class="btn-subheading">Control with your real hand movements</span>
            </div>
          </button>

          <button id="btn-play-keyboard" class="btn btn-secondary">
            <span class="btn-icon">⌨️</span>
            <div class="btn-text">
              <span class="btn-heading">PLAY WITH KEYBOARD</span>
              <span class="btn-subheading">Classic WASD or Arrow Keys</span>
            </div>
          </button>

          <div class="menu-row">
            <button id="btn-how-to-play" class="btn btn-ghost">
              <span>📖 How to Play</span>
            </button>
            <button id="btn-settings" class="btn btn-ghost">
              <span>⚙️ Settings</span>
            </button>
          </div>
        </div>

        <div class="high-score-pill">
          <span class="trophy-icon">🏆</span>
          <span class="pill-label">BEST RECORD:</span>
          <span id="menu-high-score" class="pill-value">0</span>
        </div>
      </div>

      <!-- How to play modal -->
      <div id="how-to-play-modal" class="modal-overlay hidden">
        <div class="modal-box glass-panel">
          <h2 class="modal-title">HAND GESTURE CONTROLS</h2>
          <div class="gestures-grid">
            <div class="gesture-card">
              <div class="gesture-icon">⬅️</div>
              <div class="gesture-name">SWIPE LEFT</div>
              <div class="gesture-desc">Move character one lane to the left</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">➡️</div>
              <div class="gesture-name">SWIPE RIGHT</div>
              <div class="gesture-desc">Move character one lane to the right</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">⬆️</div>
              <div class="gesture-name">SWIPE UP</div>
              <div class="gesture-desc">Jump over trains and track hurdles</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">⬇️</div>
              <div class="gesture-name">SWIPE DOWN</div>
              <div class="gesture-desc">Slide under overhead hazards & pipes</div>
            </div>
          </div>
          <div class="pro-tip-box">
            💡 <strong>Pro Tip:</strong> After each swipe, return your hand to the center neutral position to prepare for your next move!
          </div>
          <button id="btn-close-how-to-play" class="btn btn-primary" style="margin-top: 18px;">GOT IT!</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);
    this.bindEvents();
  }

  bindEvents() {
    const playHand = this.element.querySelector('#btn-play-hand');
    const playKb = this.element.querySelector('#btn-play-keyboard');
    const howTo = this.element.querySelector('#btn-how-to-play');
    const closeHowTo = this.element.querySelector('#btn-close-how-to-play');
    const settings = this.element.querySelector('#btn-settings');
    const howToModal = this.element.querySelector('#how-to-play-modal');

    playHand.addEventListener('click', () => {
      if (this.callbacks.onPlayHand) this.callbacks.onPlayHand();
    });

    playKb.addEventListener('click', () => {
      if (this.callbacks.onPlayKeyboard) this.callbacks.onPlayKeyboard();
    });

    howTo.addEventListener('click', () => {
      howToModal.classList.remove('hidden');
    });

    closeHowTo.addEventListener('click', () => {
      howToModal.classList.add('hidden');
    });

    settings.addEventListener('click', () => {
      if (this.callbacks.onOpenSettings) this.callbacks.onOpenSettings();
    });
  }

  updateHighScore(score) {
    const el = this.element.querySelector('#menu-high-score');
    if (el) el.textContent = score.toLocaleString();
  }

  show() {
    this.element.classList.add('active');
  }

  hide() {
    this.element.classList.remove('active');
  }
}
