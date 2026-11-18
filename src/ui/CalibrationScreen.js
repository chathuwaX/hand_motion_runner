/**
 * CalibrationScreen.js
 * Visual calibration screen that guides the player through neutral position alignment,
 * displays real-time stability progress, and allows sensitivity adjustment before launching the run.
 */

import { CameraPreview } from './CameraPreview.js';

export class CalibrationScreen {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.element = null;
    this.preview = null;

    this.createElements();
  }

  createElements() {
    this.element = document.createElement('div');
    this.element.className = 'ui-screen calibration-screen';

    this.element.innerHTML = `
      <div class="calibration-container glass-panel">
        <div class="calibration-header">
          <h2 class="calib-title">HAND CALIBRATION</h2>
          <p id="calib-instruction" class="calib-sub">Sit comfortably and place your open hand in the center ring</p>
        </div>

        <div class="calib-preview-frame" id="calib-camera-mount">
          <!-- CameraPreview mounts here -->
        </div>

        <div class="calib-progress-container">
          <div class="progress-bar-track">
            <div id="calib-progress-fill" class="progress-bar-fill" style="width: 0%;"></div>
          </div>
          <div class="progress-status-row">
            <span id="calib-status-text" class="status-text">Detecting hand...</span>
            <span id="calib-percent-text" class="percent-text">0%</span>
          </div>
        </div>

        <div class="calib-controls-card">
          <div class="slider-row">
            <label for="calib-sensitivity">Hand Sensitivity:</label>
            <input type="range" id="calib-sensitivity" min="0.6" max="1.8" step="0.1" value="1.0">
            <span id="calib-sensitivity-val">1.0x</span>
          </div>

          <div class="calib-actions-row">
            <button id="btn-cancel-calib" class="btn btn-secondary">← Menu</button>
            <button id="btn-recalibrate" class="btn btn-secondary" style="display: none;">🔄 Recalibrate</button>
            <button id="btn-start-run" class="btn btn-primary btn-glow">🚀 START RUN</button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Initialize CameraPreview in large size
    const mount = this.element.querySelector('#calib-camera-mount');
    this.preview = new CameraPreview(mount, {
      width: 440,
      height: 330,
      isMirrored: true
    });

    this.bindEvents();
  }

  bindEvents() {
    const btnCancel = this.element.querySelector('#btn-cancel-calib');
    const btnRecalib = this.element.querySelector('#btn-recalibrate');
    const btnStart = this.element.querySelector('#btn-start-run');
    const sensitivity = this.element.querySelector('#calib-sensitivity');
    const sensitivityVal = this.element.querySelector('#calib-sensitivity-val');

    btnCancel.addEventListener('click', () => {
      if (this.callbacks.onCancel) this.callbacks.onCancel();
    });

    btnRecalib.addEventListener('click', () => {
      this.resetUI();
      if (this.callbacks.onRecalibrate) this.callbacks.onRecalibrate();
    });

    btnStart.addEventListener('click', () => {
      if (this.callbacks.onStartGame) this.callbacks.onStartGame();
    });

    sensitivity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      sensitivityVal.textContent = `${val.toFixed(1)}x`;
      if (this.callbacks.onSensitivityChange) {
        this.callbacks.onSensitivityChange(val);
      }
    });
  }

  updateProgress(progress, statusText) {
    const fill = this.element.querySelector('#calib-progress-fill');
    const stat = this.element.querySelector('#calib-status-text');
    const pct = this.element.querySelector('#calib-percent-text');

    const percent = Math.floor(progress * 100);
    fill.style.width = `${percent}%`;
    stat.textContent = statusText;
    pct.textContent = `${percent}%`;

    if (progress >= 1.0) {
      this.onCalibrationComplete();
    }
  }

  onCalibrationComplete() {
    const btnStart = this.element.querySelector('#btn-start-run');
    const btnRecalib = this.element.querySelector('#btn-recalibrate');
    const instruction = this.element.querySelector('#calib-instruction');

    btnStart.disabled = false;
    btnStart.classList.add('pulse');
    btnRecalib.style.display = 'inline-block';
    instruction.textContent = '✨ Calibration Complete! Click START RUN to begin.';
    instruction.style.color = '#00ffcc';
  }

  resetUI() {
    const btnStart = this.element.querySelector('#btn-start-run');
    const btnRecalib = this.element.querySelector('#btn-recalibrate');
    const fill = this.element.querySelector('#calib-progress-fill');
    const stat = this.element.querySelector('#calib-status-text');
    const pct = this.element.querySelector('#calib-percent-text');
    const instruction = this.element.querySelector('#calib-instruction');

    btnStart.classList.remove('pulse');
    btnRecalib.style.display = 'none';
    fill.style.width = '0%';
    stat.textContent = 'Hold hand in center ring or click Start Run...';
    pct.textContent = '0%';
    instruction.textContent = 'Place hand in center ring to calibrate, or click START RUN to jump in';
    instruction.style.color = '';
  }

  getCameraPreview() {
    return this.preview;
  }

  show() {
    this.resetUI();
    this.element.classList.add('active');
  }

  hide() {
    this.element.classList.remove('active');
  }
}
