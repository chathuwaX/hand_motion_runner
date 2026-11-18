/**
 * GameHUD.js
 * In-game Heads-Up Display showing score, distance, coin count, running speed,
 * live gesture feedback badge, hand tracking status, PIP camera feed, and pause overlay.
 */

import { CameraPreview } from './CameraPreview.js';
import { ControllerState } from '../vision/GestureController.js';

export class GameHUD {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.element = null;
    this.pipPreview = null;
    this.gestureToastTimer = null;

    this.createElements();
  }

  createElements() {
    this.element = document.createElement('div');
    this.element.className = 'ui-screen game-hud';

    this.element.innerHTML = `
      <!-- Top Stats Bar -->
      <div class="hud-top-bar">
        <div class="hud-stat-box score-box">
          <span class="stat-label">SCORE</span>
          <span id="hud-score" class="stat-value">0</span>
        </div>

        <div class="hud-stat-box coin-box">
          <span class="coin-icon">🪙</span>
          <span id="hud-coins" class="stat-value">0</span>
        </div>

        <div class="hud-stat-box dist-box">
          <span class="stat-label">DISTANCE</span>
          <span id="hud-distance" class="stat-value">0 m</span>
        </div>

        <div class="hud-stat-box speed-box">
          <span class="stat-label">SPEED</span>
          <span id="hud-speed" class="stat-value">18.0 m/s</span>
        </div>

        <button id="btn-hud-pause" class="btn-icon-pause" title="Pause Game (ESC)">
          <span>⏸️</span>
        </button>
      </div>

      <!-- Center Action Gesture Alert Pill -->
      <div id="gesture-toast" class="gesture-toast-container hidden">
        <div id="gesture-toast-content" class="gesture-toast-pill">
          <span id="gesture-toast-icon">⬅️</span>
          <span id="gesture-toast-text">LEFT</span>
        </div>
      </div>

      <!-- Picture-In-Picture Camera Corner Widget -->
      <div id="hud-pip-container" class="hud-pip-wrapper">
        <div class="pip-header">
          <div id="hud-tracking-badge" class="tracking-badge badge-active">
            <span class="badge-dot">●</span>
            <span id="hud-tracking-text">Hand Active</span>
          </div>
          <button id="btn-toggle-pip" class="btn-pip-toggle" title="Minimize Webcam Feed">_</button>
        </div>
        <div id="pip-camera-mount" class="pip-mount">
          <!-- PIP CameraPreview mounts here -->
        </div>
      </div>

      <!-- Pause Overlay Modal -->
      <div id="pause-modal" class="modal-overlay hidden">
        <div class="modal-box glass-panel">
          <h2 class="modal-title">GAME PAUSED</h2>
          <div class="pause-menu-actions">
            <button id="btn-pause-resume" class="btn btn-primary btn-glow">▶ RESUME RUN</button>
            <button id="btn-pause-restart" class="btn btn-secondary">🔄 RESTART</button>
            <button id="btn-pause-quit" class="btn btn-ghost">🚪 QUIT TO MENU</button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Create PIP Camera Preview
    const pipMount = this.element.querySelector('#pip-camera-mount');
    this.pipPreview = new CameraPreview(pipMount, {
      width: 170,
      height: 128,
      isMirrored: true
    });

    this.bindEvents();
  }

  bindEvents() {
    const btnPause = this.element.querySelector('#btn-hud-pause');
    const btnResume = this.element.querySelector('#btn-pause-resume');
    const btnRestart = this.element.querySelector('#btn-pause-restart');
    const btnQuit = this.element.querySelector('#btn-pause-quit');
    const btnTogglePip = this.element.querySelector('#btn-toggle-pip');
    const pipMount = this.element.querySelector('#pip-camera-mount');

    btnPause.addEventListener('click', () => {
      if (this.callbacks.onPause) this.callbacks.onPause();
    });

    btnResume.addEventListener('click', () => {
      this.hidePauseModal();
      if (this.callbacks.onResume) this.callbacks.onResume();
    });

    btnRestart.addEventListener('click', () => {
      this.hidePauseModal();
      if (this.callbacks.onRestart) this.callbacks.onRestart();
    });

    btnQuit.addEventListener('click', () => {
      this.hidePauseModal();
      if (this.callbacks.onQuit) this.callbacks.onQuit();
    });

    btnTogglePip.addEventListener('click', () => {
      if (pipMount.style.display === 'none') {
        pipMount.style.display = 'block';
        btnTogglePip.textContent = '_';
      } else {
        pipMount.style.display = 'none';
        btnTogglePip.textContent = '□';
      }
    });
  }

  updateStats(stats, speed) {
    const elScore = this.element.querySelector('#hud-score');
    const elCoins = this.element.querySelector('#hud-coins');
    const elDist = this.element.querySelector('#hud-distance');
    const elSpeed = this.element.querySelector('#hud-speed');

    if (elScore) elScore.textContent = stats.score.toLocaleString();
    if (elCoins) elCoins.textContent = stats.coins;
    if (elDist) elDist.textContent = `${stats.distance} m`;
    if (elSpeed) elSpeed.textContent = `${speed.toFixed(1)} m/s`;
  }

  showGestureToast(actionName) {
    const toast = this.element.querySelector('#gesture-toast');
    const icon = this.element.querySelector('#gesture-toast-icon');
    const text = this.element.querySelector('#gesture-toast-text');

    let iconChar = '✋';
    let label = actionName;

    switch (actionName) {
      case 'MOVE_LEFT':
        iconChar = '⬅️';
        label = 'LEFT';
        break;
      case 'MOVE_RIGHT':
        iconChar = '➡️';
        label = 'RIGHT';
        break;
      case 'JUMP':
        iconChar = '⬆️';
        label = 'JUMP';
        break;
      case 'SLIDE':
        iconChar = '⬇️';
        label = 'SLIDE';
        break;
    }

    icon.textContent = iconChar;
    text.textContent = label;

    toast.classList.remove('hidden');
    toast.classList.add('pop');

    if (this.gestureToastTimer) clearTimeout(this.gestureToastTimer);
    this.gestureToastTimer = setTimeout(() => {
      toast.classList.remove('pop');
      toast.classList.add('hidden');
    }, 450);
  }

  updateTrackingStatus(controllerState, isKeyboardMode = false) {
    const badge = this.element.querySelector('#hud-tracking-badge');
    const text = this.element.querySelector('#hud-tracking-text');

    if (isKeyboardMode) {
      badge.className = 'tracking-badge badge-active';
      text.textContent = 'Keyboard Mode';
      return;
    }

    switch (controllerState) {
      case ControllerState.IDLE:
      case ControllerState.TRACKING:
        badge.className = 'tracking-badge badge-active';
        text.textContent = 'Hand Active';
        break;
      case ControllerState.REARMING:
      case ControllerState.COOLDOWN:
        badge.className = 'tracking-badge badge-rearm';
        text.textContent = 'Neutral Reset';
        break;
      case ControllerState.LOST:
      default:
        badge.className = 'tracking-badge badge-lost';
        text.textContent = 'Hand Lost';
        break;
    }
  }

  showPauseModal() {
    this.element.querySelector('#pause-modal').classList.remove('hidden');
  }

  hidePauseModal() {
    this.element.querySelector('#pause-modal').classList.add('hidden');
  }

  setPipVisible(visible) {
    const pip = this.element.querySelector('#hud-pip-container');
    pip.style.display = visible ? 'block' : 'none';
  }

  getCameraPreview() {
    return this.pipPreview;
  }

  show() {
    this.element.classList.add('active');
  }

  hide() {
    this.element.classList.remove('active');
  }
}
