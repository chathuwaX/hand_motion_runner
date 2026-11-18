/**
 * Settings.js
 * Settings dialog for camera selection, hand sensitivity, and audio volume controls.
 */

export class Settings {
  constructor(container, audioManager, callbacks = {}) {
    this.container = container;
    this.audioManager = audioManager;
    this.callbacks = callbacks;
    this.element = null;

    this.createElements();
  }

  createElements() {
    this.element = document.createElement('div');
    this.element.className = 'modal-overlay hidden';
    this.element.id = 'settings-modal';

    this.element.innerHTML = `
      <div class="modal-box glass-panel settings-panel">
        <div class="modal-header">
          <h2 class="modal-title">SETTINGS</h2>
          <button id="btn-close-settings" class="btn-close-icon">✕</button>
        </div>

        <div class="settings-content">
          <!-- Camera Selection -->
          <div class="setting-group">
            <label for="camera-select" class="setting-label">Webcam Device:</label>
            <select id="camera-select" class="form-select">
              <option value="">Default Camera</option>
            </select>
          </div>

          <!-- Hand Sensitivity -->
          <div class="setting-group">
            <div class="setting-header-row">
              <label for="settings-sensitivity" class="setting-label">Hand Sensitivity:</label>
              <span id="settings-sensitivity-val" class="setting-val">1.0x</span>
            </div>
            <input type="range" id="settings-sensitivity" class="form-range" min="0.6" max="1.8" step="0.1" value="1.0">
            <div class="range-hint-row">
              <span>Low (Requires larger swipes)</span>
              <span>High (Twitchy)</span>
            </div>
          </div>

          <!-- Master Volume -->
          <div class="setting-group">
            <div class="setting-header-row">
              <label for="settings-vol-master" class="setting-label">Master Volume:</label>
              <span id="settings-vol-master-val" class="setting-val">80%</span>
            </div>
            <input type="range" id="settings-vol-master" class="form-range" min="0" max="1" step="0.05" value="${this.audioManager.masterVolume}">
          </div>

          <!-- SFX Volume -->
          <div class="setting-group">
            <div class="setting-header-row">
              <label for="settings-vol-sfx" class="setting-label">Sound Effects (SFX):</label>
              <span id="settings-vol-sfx-val" class="setting-val">80%</span>
            </div>
            <input type="range" id="settings-vol-sfx" class="form-range" min="0" max="1" step="0.05" value="${this.audioManager.sfxVolume}">
          </div>

          <!-- BGM Volume -->
          <div class="setting-group">
            <div class="setting-header-row">
              <label for="settings-vol-bgm" class="setting-label">Synth Music (BGM):</label>
              <span id="settings-vol-bgm-val" class="setting-val">50%</span>
            </div>
            <input type="range" id="settings-vol-bgm" class="form-range" min="0" max="1" step="0.05" value="${this.audioManager.bgmVolume}">
          </div>
        </div>

        <button id="btn-done-settings" class="btn btn-primary" style="margin-top: 20px;">SAVE & CLOSE</button>
      </div>
    `;

    this.container.appendChild(this.element);
    this.bindEvents();
  }

  bindEvents() {
    const btnClose = this.element.querySelector('#btn-close-settings');
    const btnDone = this.element.querySelector('#btn-done-settings');
    const cameraSelect = this.element.querySelector('#camera-select');
    const sensitivity = this.element.querySelector('#settings-sensitivity');
    const sensVal = this.element.querySelector('#settings-sensitivity-val');

    const volMaster = this.element.querySelector('#settings-vol-master');
    const volMasterVal = this.element.querySelector('#settings-vol-master-val');
    const volSfx = this.element.querySelector('#settings-vol-sfx');
    const volSfxVal = this.element.querySelector('#settings-vol-sfx-val');
    const volBgm = this.element.querySelector('#settings-vol-bgm');
    const volBgmVal = this.element.querySelector('#settings-vol-bgm-val');

    const closeHandler = () => this.hide();
    btnClose.addEventListener('click', closeHandler);
    btnDone.addEventListener('click', closeHandler);

    cameraSelect.addEventListener('change', (e) => {
      if (this.callbacks.onCameraSelect) {
        this.callbacks.onCameraSelect(e.target.value);
      }
    });

    sensitivity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      sensVal.textContent = `${val.toFixed(1)}x`;
      if (this.callbacks.onSensitivityChange) {
        this.callbacks.onSensitivityChange(val);
      }
    });

    volMaster.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.audioManager.setMasterVolume(val);
      volMasterVal.textContent = `${Math.round(val * 100)}%`;
    });

    volSfx.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.audioManager.setSfxVolume(val);
      volSfxVal.textContent = `${Math.round(val * 100)}%`;
    });

    volBgm.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.audioManager.setBgmVolume(val);
      volBgmVal.textContent = `${Math.round(val * 100)}%`;
    });
  }

  updateCameraList(cameras) {
    const select = this.element.querySelector('#camera-select');
    select.innerHTML = '<option value="">Default Camera</option>';
    cameras.forEach((cam) => {
      const opt = document.createElement('option');
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `Camera ${cam.deviceId.slice(0, 6)}...`;
      select.appendChild(opt);
    });
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
