/**
 * TrackingPanel.js
 * Dedicated Split-Screen Human Motion Tracking Control Station.
 * Occupies one side of the split screen, providing:
 * - High-definition live mirrored webcam feed
 * - Real-time skeletal hand landmark rendering (21 joints, bones, palm reticle)
 * - Dynamic interactive lane steering zone overlays (Left, Center, Right)
 * - Real-time jump ($Y < 0.35$) and slide ($Y > 0.65$) threshold indicators
 * - Live telemetry dashboard: Active Lane, Detected Motion Action, Hand X/Y coordinates, and Confidence
 * - Interactive controls: Swap Sides, Fullscreen Toggle, Sensitivity adjustment, Camera selector, and Recalibrate
 * - Visual gesture instructions guide
 */

export class TrackingPanel {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks; // onSwapSides, onToggleFullscreen, onSensitivityChange, onRecalibrate, onCameraChange

    // State
    this.currentLane = 0; // -1, 0, 1
    this.currentAction = 'RUNNING';
    this.controllerState = 'IDLE';
    this.isMirrored = true;
    this.isSplitMode = true;
    this.isSwapped = false; // false: Game on Left, Tracking on Right; true: reversed

    // Skeletal landmark connections (pairs of joint indices)
    this.CONNECTIONS = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring finger
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky finger
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm knuckles
      [5, 9], [9, 13], [13, 17]
    ];

    this.createElements();
    this.bindEvents();
    this.setupResizeObserver();
  }

  createElements() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'tracking-panel-inner';

    this.wrapper.innerHTML = `
      <!-- Top Control & Status Bar -->
      <div class="tracking-top-bar">
        <div class="tracking-status-badge badge-active" id="tp-status-badge">
          <span class="tracking-pulse-dot"></span>
          <span id="tp-status-text">HUMAN TRACKING ACTIVE</span>
        </div>

        <div class="tracking-header-actions">
          <button id="btn-tp-swap" class="tp-btn-tool" title="Swap Game & Tracking Sides">
            <span>⇄ Swap Sides</span>
          </button>
          <button id="btn-tp-recalib" class="tp-btn-tool" title="Recalibrate Neutral Hand Position">
            <span>🎯 Recalibrate</span>
          </button>
        </div>
      </div>

      <!-- Live Video & Skeletal Vision Viewport Card -->
      <div class="tracking-feed-card">
        <div class="feed-header-strip">
          <span class="feed-title">WEBCAM HAND SKELETON FEED</span>
          <span class="feed-fps" id="tp-fps-counter">30 FPS</span>
        </div>

        <div class="tracking-feed-viewport" id="tp-feed-mount">
          <!-- Video Element (mirrored) -->
          <video id="tp-video" class="tracking-video" autoplay playsinline muted></video>

          <!-- Transparent Vision Overlay Canvas -->
          <canvas id="tp-canvas" class="tracking-canvas"></canvas>

          <!-- Zone Overlay Markers -->
          <div class="lane-zone-tag tag-left" id="zone-tag-left">LEFT LANE</div>
          <div class="lane-zone-tag tag-center" id="zone-tag-center">CENTER LANE</div>
          <div class="lane-zone-tag tag-right" id="zone-tag-right">RIGHT LANE</div>

          <div class="vert-zone-line line-jump" id="zone-line-jump">
            <span>▲ JUMP ZONE (Y &lt; 0.35)</span>
          </div>
          <div class="vert-zone-line line-slide" id="zone-line-slide">
            <span>▼ SLIDE ZONE (Y &gt; 0.65)</span>
          </div>
        </div>
      </div>

      <!-- Real-Time Telemetry Dashboard -->
      <div class="tracking-telemetry-container">
        <!-- 1. Active Lane Status Indicator -->
        <div class="telemetry-card lane-card">
          <div class="card-caption">CURRENT STEERING LANE</div>
          <div class="lane-indicator-strip">
            <div class="lane-block" id="lane-block-left">
              <span class="lane-arrow">◀</span>
              <span class="lane-name">LEFT</span>
              <span class="lane-id">LANE -1</span>
            </div>
            <div class="lane-block active" id="lane-block-center">
              <span class="lane-arrow">●</span>
              <span class="lane-name">CENTER</span>
              <span class="lane-id">LANE 0</span>
            </div>
            <div class="lane-block" id="lane-block-right">
              <span class="lane-arrow">▶</span>
              <span class="lane-name">RIGHT</span>
              <span class="lane-id">LANE +1</span>
            </div>
          </div>
        </div>

        <!-- 2. Detected Motion Action Card -->
        <div class="telemetry-card action-card">
          <div class="card-caption">DETECTED GESTURE ACTION</div>
          <div class="action-display-pill" id="tp-action-pill">
            <span class="action-icon" id="tp-action-icon">🏃</span>
            <span class="action-label" id="tp-action-text">RUNNING FORWARD</span>
          </div>
        </div>

        <!-- 3. Coordinates & Tracking Confidence -->
        <div class="telemetry-card coords-card">
          <div class="card-caption">HAND POSITION TELEMETRY</div>
          <div class="coords-meters-grid">
            <div class="coord-meter-col">
              <div class="meter-label">
                <span>HORIZONTAL (X)</span>
                <span id="tp-x-val">0.50</span>
              </div>
              <div class="meter-bar-track">
                <div class="meter-bar-fill" id="tp-x-bar" style="width: 50%;"></div>
                <div class="meter-center-marker"></div>
              </div>
            </div>

            <div class="coord-meter-col">
              <div class="meter-label">
                <span>VERTICAL (Y)</span>
                <span id="tp-y-val">0.50</span>
              </div>
              <div class="meter-bar-track">
                <div class="meter-bar-fill meter-fill-cyan" id="tp-y-bar" style="width: 50%;"></div>
                <div class="meter-center-marker"></div>
              </div>
            </div>

            <div class="coord-meter-col">
              <div class="meter-label">
                <span>CONFIDENCE</span>
                <span id="tp-conf-val">100%</span>
              </div>
              <div class="meter-bar-track">
                <div class="meter-bar-fill meter-fill-green" id="tp-conf-bar" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Quick Gesture Control Reference Guide -->
        <div class="telemetry-card guide-card">
          <div class="card-caption">HAND MOTION CONTROLS GUIDE</div>
          <div class="motion-guide-grid">
            <div class="guide-item">
              <span class="guide-icon">🖐️</span>
              <div class="guide-info">
                <strong>Hand Centered</strong>
                <span>Stay in Center Lane</span>
              </div>
            </div>
            <div class="guide-item">
              <span class="guide-icon">👈</span>
              <div class="guide-info">
                <strong>Move Hand Left</strong>
                <span>Steer to Left Lane</span>
              </div>
            </div>
            <div class="guide-item">
              <span class="guide-icon">👉</span>
              <div class="guide-info">
                <strong>Move Hand Right</strong>
                <span>Steer to Right Lane</span>
              </div>
            </div>
            <div class="guide-item">
              <span class="guide-icon">👆</span>
              <div class="guide-info">
                <strong>Move Hand Up</strong>
                <span>Jump Over Barriers</span>
              </div>
            </div>
            <div class="guide-item">
              <span class="guide-icon">👇</span>
              <div class="guide-info">
                <strong>Move Hand Down</strong>
                <span>Slide Under Hazards</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Settings Strip -->
        <div class="telemetry-card settings-card">
          <div class="card-caption">TRACKING SETTINGS</div>
          <div class="tp-settings-row">
            <div class="tp-setting-item">
              <label for="tp-sensitivity-select">SENSITIVITY:</label>
              <select id="tp-sensitivity-select" class="tp-select">
                <option value="low">Low (Deliberate)</option>
                <option value="medium" selected>Medium (Balanced)</option>
                <option value="high">High (Quick Swipe)</option>
              </select>
            </div>

            <div class="tp-setting-item">
              <label for="tp-camera-select">CAMERA:</label>
              <select id="tp-camera-select" class="tp-select">
                <option value="default">Default Camera</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.wrapper);

    // Cache elements
    this.video = this.wrapper.querySelector('#tp-video');
    this.canvas = this.wrapper.querySelector('#tp-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.feedMount = this.wrapper.querySelector('#tp-feed-mount');

    this.statusBadge = this.wrapper.querySelector('#tp-status-badge');
    this.statusText = this.wrapper.querySelector('#tp-status-text');

    this.laneBlockLeft = this.wrapper.querySelector('#lane-block-left');
    this.laneBlockCenter = this.wrapper.querySelector('#lane-block-center');
    this.laneBlockRight = this.wrapper.querySelector('#lane-block-right');

    this.actionPill = this.wrapper.querySelector('#tp-action-pill');
    this.actionIcon = this.wrapper.querySelector('#tp-action-icon');
    this.actionText = this.wrapper.querySelector('#tp-action-text');

    this.xVal = this.wrapper.querySelector('#tp-x-val');
    this.xBar = this.wrapper.querySelector('#tp-x-bar');
    this.yVal = this.wrapper.querySelector('#tp-y-val');
    this.yBar = this.wrapper.querySelector('#tp-y-bar');
    this.confVal = this.wrapper.querySelector('#tp-conf-val');
    this.confBar = this.wrapper.querySelector('#tp-conf-bar');

    this.zoneTagLeft = this.wrapper.querySelector('#zone-tag-left');
    this.zoneTagCenter = this.wrapper.querySelector('#zone-tag-center');
    this.zoneTagRight = this.wrapper.querySelector('#zone-tag-right');
    this.zoneLineJump = this.wrapper.querySelector('#zone-line-jump');
    this.zoneLineSlide = this.wrapper.querySelector('#zone-line-slide');
  }

  bindEvents() {
    // Swap Sides
    const btnSwap = this.wrapper.querySelector('#btn-tp-swap');
    if (btnSwap) {
      btnSwap.addEventListener('click', () => {
        if (this.callbacks.onSwapSides) {
          this.callbacks.onSwapSides();
        } else {
          this.toggleSwapSides();
        }
      });
    }

    // Recalibrate
    const btnRecalib = this.wrapper.querySelector('#btn-tp-recalib');
    if (btnRecalib && this.callbacks.onRecalibrate) {
      btnRecalib.addEventListener('click', () => this.callbacks.onRecalibrate());
    }

    // Sensitivity Select
    const sensSelect = this.wrapper.querySelector('#tp-sensitivity-select');
    if (sensSelect && this.callbacks.onSensitivityChange) {
      sensSelect.addEventListener('change', (e) => {
        this.callbacks.onSensitivityChange(e.target.value);
      });
    }

    // Camera Select
    const camSelect = this.wrapper.querySelector('#tp-camera-select');
    if (camSelect && this.callbacks.onCameraChange) {
      camSelect.addEventListener('change', (e) => {
        this.callbacks.onCameraChange(e.target.value);
      });
    }
  }

  setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.updateCanvasDimensions());
    if (this.feedMount) {
      this.resizeObserver.observe(this.feedMount);
    }
  }

  updateCanvasDimensions() {
    if (!this.feedMount || !this.canvas) return;
    const rect = this.feedMount.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  getVideoElement() {
    return this.video;
  }

  updateCameraList(cameras) {
    const camSelect = this.wrapper.querySelector('#tp-camera-select');
    if (!camSelect || !cameras || cameras.length === 0) return;

    camSelect.innerHTML = '';
    cameras.forEach((cam, idx) => {
      const opt = document.createElement('option');
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `Camera ${idx + 1}`;
      camSelect.appendChild(opt);
    });
  }

  toggleSwapSides() {
    const app = document.getElementById('app-container');
    if (app) {
      app.classList.toggle('layout-swapped');
      this.isSwapped = app.classList.contains('layout-swapped');
    }
  }

  /**
   * Main render update called each vision frame
   */
  render(detection, controllerState = 'IDLE', currentLane = 0, lastAction = null) {
    this.controllerState = controllerState;
    this.currentLane = currentLane;

    // 1. Update Canvas Skeleton & Zones
    this.renderCanvas(detection);

    // 2. Update Lane Blocks
    this.updateLaneBlocks(currentLane);

    // 3. Update Status Badge
    this.updateStatusBadge(controllerState, detection && detection.detected);

    // 4. Update Telemetry Coordinates
    if (detection && detection.detected && detection.palmCenter) {
      const pc = detection.palmCenter;
      const xPercent = Math.round(pc.x * 100);
      const yPercent = Math.round(pc.y * 100);
      const confPercent = Math.round((detection.confidence || 0.95) * 100);

      this.xVal.textContent = pc.x.toFixed(2);
      this.xBar.style.width = `${xPercent}%`;

      this.yVal.textContent = pc.y.toFixed(2);
      this.yBar.style.width = `${yPercent}%`;

      this.confVal.textContent = `${confPercent}%`;
      this.confBar.style.width = `${confPercent}%`;

      // Update Zone Tags Highlight
      this.zoneTagLeft.classList.toggle('active', pc.x < 0.40);
      this.zoneTagCenter.classList.toggle('active', pc.x >= 0.40 && pc.x <= 0.60);
      this.zoneTagRight.classList.toggle('active', pc.x > 0.60);
      this.zoneLineJump.classList.toggle('active', pc.y < 0.35);
      this.zoneLineSlide.classList.toggle('active', pc.y > 0.65);

      // Determine Action label
      if (pc.y < 0.35) {
        this.setAction('⬆️', 'JUMPING (UPWARD)', 'action-jump');
      } else if (pc.y > 0.65) {
        this.setAction('⬇️', 'SLIDING (DOWNWARD)', 'action-slide');
      } else if (pc.x < 0.40) {
        this.setAction('⬅️', 'STEERING LEFT', 'action-left');
      } else if (pc.x > 0.60) {
        this.setAction('➡️', 'STEERING RIGHT', 'action-right');
      } else {
        this.setAction('🏃', 'RUNNING FORWARD', 'action-run');
      }
    } else {
      this.xVal.textContent = '--';
      this.yVal.textContent = '--';
      this.confVal.textContent = '0%';
      this.confBar.style.width = '0%';
      this.setAction('✋', 'SHOW HAND TO CAMERA', 'action-wait');

      this.zoneTagLeft.classList.remove('active');
      this.zoneTagCenter.classList.remove('active');
      this.zoneTagRight.classList.remove('active');
      this.zoneLineJump.classList.remove('active');
      this.zoneLineSlide.classList.remove('active');
    }
  }

  renderCanvas(detection) {
    if (!this.ctx || !this.feedMount) return;
    const rect = this.feedMount.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw Lane Steering Guide Dividers (Left at 40%, Right at 60%)
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([6, 6]);

    // Left Lane boundary line
    this.ctx.beginPath();
    this.ctx.moveTo(w * 0.40, 0);
    this.ctx.lineTo(w * 0.40, h);
    this.ctx.stroke();

    // Right Lane boundary line
    this.ctx.beginPath();
    this.ctx.moveTo(w * 0.60, 0);
    this.ctx.lineTo(w * 0.60, h);
    this.ctx.stroke();

    // Jump & Slide Horizontal Guide Lines
    this.ctx.strokeStyle = 'rgba(255, 234, 0, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.35);
    this.ctx.lineTo(w, h * 0.35);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 107, 0, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.65);
    this.ctx.lineTo(w, h * 0.65);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // If no hand detected, draw waiting hint
    if (!detection || !detection.detected || !detection.landmarks) {
      this.ctx.fillStyle = 'rgba(11, 17, 30, 0.65)';
      this.ctx.fillRect(w / 2 - 120, h / 2 - 25, 240, 50);
      this.ctx.strokeStyle = '#00f0ff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(w / 2 - 120, h / 2 - 25, 240, 50);

      this.ctx.fillStyle = '#00f0ff';
      this.ctx.font = 'bold 14px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('✋ PLACE HAND IN CAMERA VIEW', w / 2, h / 2 + 5);
      return;
    }

    const landmarks = detection.landmarks;
    // Mirrored coordinates matching video scaleX(-1)
    const toCanvasX = (rawX) => (1.0 - rawX) * w;
    const toCanvasY = (rawY) => rawY * h;

    // 2. Draw Hand Skeleton Bones
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 3.0;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 8;

    for (const [startIdx, endIdx] of this.CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (p1 && p2) {
        this.ctx.beginPath();
        this.ctx.moveTo(toCanvasX(p1.x), toCanvasY(p1.y));
        this.ctx.lineTo(toCanvasX(p2.x), toCanvasY(p2.y));
        this.ctx.stroke();
      }
    }

    this.ctx.shadowBlur = 0;

    // 3. Draw Landmark Joint Nodes
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);

      this.ctx.fillStyle = isTip ? '#ff0055' : '#00ff88';
      this.ctx.beginPath();
      this.ctx.arc(toCanvasX(lm.x), toCanvasY(lm.y), isTip ? 5.5 : 3.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // 4. Draw Palm Center Reticle
    if (detection.palmCenter) {
      const pc = detection.palmCenter;
      const screenX = pc.x * w;
      const screenY = pc.y * h;

      // Glow circle
      this.ctx.fillStyle = 'rgba(255, 234, 0, 0.45)';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer targeting ring
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2.0;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
      this.ctx.stroke();

      // Inner dot
      this.ctx.fillStyle = '#ff0055';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Coordinate banner
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(screenX + 16, screenY - 12, 76, 22);
      this.ctx.fillStyle = '#00f0ff';
      this.ctx.font = 'bold 11px system-ui';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`X:${pc.x.toFixed(2)} Y:${pc.y.toFixed(2)}`, screenX + 20, screenY + 3);
    }
  }

  updateLaneBlocks(currentLane) {
    if (this.laneBlockLeft) this.laneBlockLeft.classList.toggle('active', currentLane === -1);
    if (this.laneBlockCenter) this.laneBlockCenter.classList.toggle('active', currentLane === 0);
    if (this.laneBlockRight) this.laneBlockRight.classList.toggle('active', currentLane === 1);
  }

  updateStatusBadge(state, isDetected) {
    if (!this.statusBadge || !this.statusText) return;

    this.statusBadge.className = 'tracking-status-badge';

    if (!isDetected || state === 'LOST') {
      this.statusBadge.classList.add('badge-lost');
      this.statusText.textContent = 'NO HAND DETECTED';
    } else if (state === 'REARMING') {
      this.statusBadge.classList.add('badge-rearm');
      this.statusText.textContent = 'RETURNING TO NEUTRAL';
    } else {
      this.statusBadge.classList.add('badge-active');
      this.statusText.textContent = 'LOCKED & TRACKING';
    }
  }

  setAction(icon, text, styleClass) {
    if (this.actionIcon) this.actionIcon.textContent = icon;
    if (this.actionText) this.actionText.textContent = text;
    if (this.actionPill) {
      this.actionPill.className = `action-display-pill ${styleClass || ''}`;
    }
  }

  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.wrapper) {
      this.wrapper.remove();
    }
  }
}
