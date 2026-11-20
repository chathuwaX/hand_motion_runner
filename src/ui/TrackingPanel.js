/**
 * TrackingPanel.js
 * Dedicated Split-Screen Live Capture Hand Camera Interface.
 * Forms the entire human motion tracking half of the screen with:
 * - Edge-to-edge high-definition mirrored webcam live capture feed
 * - Real-time skeletal hand landmark tracking (21 joints, bones, palm reticle)
 * - Three vertical steering zone columns (Left, Center, Right) with live active glow
 * - Horizontal Jump ($Y < 0.35$) and Slide ($Y > 0.65$) threshold indicators
 * - Cyberpunk viewfinder HUD with crosshairs, corner brackets, and coordinate telemetry
 * - Interactive Lane Indicator tiles (LEFT, CENTER, RIGHT)
 * - Detected Gesture Action badge and confidence metrics
 * - Live camera activation, camera switcher, sensitivity controls, and swap sides button
 */

export class TrackingPanel {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks; // onSwapSides, onRecalibrate, onSensitivityChange, onCameraChange, onStartCamera

    // State
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.currentAction = 'RUNNING';
    this.controllerState = 'IDLE';
    this.isCameraActive = false;

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
    this.wrapper.className = 'camera-interface-container';

    this.wrapper.innerHTML = `
      <!-- 1. Header Toolbar -->
      <div class="cam-interface-header">
        <div class="cam-status-pill" id="tp-status-badge">
          <span class="cam-rec-dot" id="tp-rec-dot"></span>
          <span class="cam-status-title" id="tp-status-text">HAND TRACKING CAMERA</span>
          <span class="cam-fps-badge" id="tp-fps-badge">30 FPS</span>
        </div>

        <div class="cam-header-tools">
          <button id="btn-tp-swap" class="cam-tool-btn" title="Swap Game & Camera Sides">
            <span>⇄ Swap Sides</span>
          </button>
          <button id="btn-tp-recalib" class="cam-tool-btn" title="Recalibrate Hand Position">
            <span>🎯 Recalibrate</span>
          </button>
        </div>
      </div>

      <!-- 2. Live Capture Viewport (Dominates the screen) -->
      <div class="cam-live-viewport" id="tp-feed-mount">
        <!-- Live Mirrored Video Stream -->
        <video id="tp-video" class="cam-video" autoplay playsinline muted></video>

        <!-- Overlay Canvas for Hand Skeleton & Lane Boundaries -->
        <canvas id="tp-canvas" class="cam-canvas"></canvas>

        <!-- Cyber Viewfinder Corner Brackets -->
        <div class="cam-bracket bracket-tl"></div>
        <div class="cam-bracket bracket-tr"></div>
        <div class="cam-bracket bracket-bl"></div>
        <div class="cam-bracket bracket-br"></div>

        <!-- Lane Steering Zone Headers -->
        <div class="cam-zone-banner banner-left" id="zone-banner-left">
          <span>◀ LEFT LANE</span>
          <small>X &lt; 0.40</small>
        </div>
        <div class="cam-zone-banner banner-center" id="zone-banner-center">
          <span>● CENTER LANE</span>
          <small>0.40 - 0.60</small>
        </div>
        <div class="cam-zone-banner banner-right" id="zone-banner-right">
          <span>RIGHT LANE ▶</span>
          <small>X &gt; 0.60</small>
        </div>

        <!-- Jump & Slide Horizontal Threshold Markers -->
        <div class="cam-threshold-tag tag-jump" id="tag-jump">
          <span>▲ JUMP ZONE (Y &lt; 0.35)</span>
        </div>
        <div class="cam-threshold-tag tag-slide" id="tag-slide">
          <span>▼ SLIDE ZONE (Y &gt; 0.65)</span>
        </div>

        <!-- Floating Action Flash Badge -->
        <div class="cam-action-flash hidden" id="tp-action-flash">
          <span class="flash-icon" id="tp-flash-icon">🏃</span>
          <span class="flash-text" id="tp-flash-text">RUNNING</span>
        </div>

        <!-- Camera Standby / Activation Overlay (shown before webcam starts) -->
        <div class="cam-standby-overlay" id="tp-standby-overlay">
          <div class="standby-card glass-panel">
            <div class="standby-icon">📷</div>
            <h3 class="standby-title">LIVE HAND CAMERA INTERFACE</h3>
            <p class="standby-desc">Control the 3D subway runner with your real hand movements captured through your laptop webcam.</p>
            <button id="btn-activate-camera" class="btn btn-primary btn-glow">
              <span>▶ START CAMERA FEED</span>
            </button>
            <div class="standby-hint">
              <span>👈 Move Left</span> &bull; <span>🖐️ Center</span> &bull; <span>👉 Move Right</span> &bull; <span>👆 Jump</span> &bull; <span>👇 Slide</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Bottom Telemetry & Steering Control Drawer -->
      <div class="cam-telemetry-drawer">
        <!-- Interactive 3-Lane Selector Strip -->
        <div class="cam-lane-strip">
          <div class="cam-lane-tile" id="tile-lane-left">
            <span class="tile-arrow">◀</span>
            <div class="tile-text">
              <strong>LEFT LANE</strong>
              <small>LANE -1</small>
            </div>
          </div>
          <div class="cam-lane-tile active" id="tile-lane-center">
            <span class="tile-arrow">●</span>
            <div class="tile-text">
              <strong>CENTER LANE</strong>
              <small>LANE 0</small>
            </div>
          </div>
          <div class="cam-lane-tile" id="tile-lane-right">
            <span class="tile-arrow">▶</span>
            <div class="tile-text">
              <strong>RIGHT LANE</strong>
              <small>LANE +1</small>
            </div>
          </div>
        </div>

        <!-- Hand Position Metrics & Status Row -->
        <div class="cam-metrics-row">
          <div class="metric-gauge">
            <div class="gauge-header">
              <span>STEERING (X)</span>
              <span id="metric-x-val">0.50</span>
            </div>
            <div class="gauge-track">
              <div class="gauge-fill" id="metric-x-bar" style="width: 50%;"></div>
              <div class="gauge-notch notch-center"></div>
            </div>
          </div>

          <div class="metric-gauge">
            <div class="gauge-header">
              <span>ELEVATION (Y)</span>
              <span id="metric-y-val">0.50</span>
            </div>
            <div class="gauge-track">
              <div class="gauge-fill gauge-fill-cyan" id="metric-y-bar" style="width: 50%;"></div>
              <div class="gauge-notch notch-jump"></div>
              <div class="gauge-notch notch-slide"></div>
            </div>
          </div>

          <div class="metric-gauge gauge-conf">
            <div class="gauge-header">
              <span>TRACKING</span>
              <span id="metric-conf-val">100%</span>
            </div>
            <div class="gauge-track">
              <div class="gauge-fill gauge-fill-green" id="metric-conf-bar" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        <!-- Quick Settings & Controls Strip -->
        <div class="cam-controls-strip">
          <div class="ctrl-group">
            <label for="cam-sensitivity-select">SENSITIVITY:</label>
            <select id="cam-sensitivity-select" class="cam-select">
              <option value="low">Low (Deliberate)</option>
              <option value="medium" selected>Medium (Standard)</option>
              <option value="high">High (Quick Swipe)</option>
            </select>
          </div>

          <div class="ctrl-group">
            <label for="cam-device-select">CAMERA INPUT:</label>
            <select id="cam-device-select" class="cam-select">
              <option value="default">Default Camera</option>
            </select>
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
    this.standbyOverlay = this.wrapper.querySelector('#tp-standby-overlay');

    this.statusBadge = this.wrapper.querySelector('#tp-status-badge');
    this.statusText = this.wrapper.querySelector('#tp-status-text');
    this.recDot = this.wrapper.querySelector('#tp-rec-dot');

    this.zoneBannerLeft = this.wrapper.querySelector('#zone-banner-left');
    this.zoneBannerCenter = this.wrapper.querySelector('#zone-banner-center');
    this.zoneBannerRight = this.wrapper.querySelector('#zone-banner-right');
    this.tagJump = this.wrapper.querySelector('#tag-jump');
    this.tagSlide = this.wrapper.querySelector('#tag-slide');

    this.tileLaneLeft = this.wrapper.querySelector('#tile-lane-left');
    this.tileLaneCenter = this.wrapper.querySelector('#tile-lane-center');
    this.tileLaneRight = this.wrapper.querySelector('#tile-lane-right');

    this.actionFlash = this.wrapper.querySelector('#tp-action-flash');
    this.flashIcon = this.wrapper.querySelector('#tp-flash-icon');
    this.flashText = this.wrapper.querySelector('#tp-flash-text');

    this.metricXVal = this.wrapper.querySelector('#metric-x-val');
    this.metricXBar = this.wrapper.querySelector('#metric-x-bar');
    this.metricYVal = this.wrapper.querySelector('#metric-y-val');
    this.metricYBar = this.wrapper.querySelector('#metric-y-bar');
    this.metricConfVal = this.wrapper.querySelector('#metric-conf-val');
    this.metricConfBar = this.wrapper.querySelector('#metric-conf-bar');
  }

  bindEvents() {
    // Start Camera Feed button
    const btnActivate = this.wrapper.querySelector('#btn-activate-camera');
    if (btnActivate) {
      btnActivate.addEventListener('click', () => {
        if (this.callbacks.onStartCamera) {
          this.callbacks.onStartCamera();
        }
      });
    }

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
    const sensSelect = this.wrapper.querySelector('#cam-sensitivity-select');
    if (sensSelect && this.callbacks.onSensitivityChange) {
      sensSelect.addEventListener('change', (e) => {
        this.callbacks.onSensitivityChange(e.target.value);
      });
    }

    // Camera Input Select
    const camSelect = this.wrapper.querySelector('#cam-device-select');
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

  setCameraActive(active) {
    this.isCameraActive = active;
    if (this.standbyOverlay) {
      this.standbyOverlay.style.display = active ? 'none' : 'flex';
    }
    if (this.recDot) {
      this.recDot.classList.toggle('live', active);
      this.recDot.classList.toggle('rec-live', active);
    }
  }

  startCameraFeed() {
    this.setCameraActive(true);
  }

  stopCameraFeed() {
    this.setCameraActive(false);
  }

  updateCameraList(cameras) {
    const camSelect = this.wrapper.querySelector('#cam-device-select');
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
    }
  }

  /**
   * Main render update called each vision frame from Game.js
   */
  render(detection, controllerState = 'IDLE', currentLane = 0, lastAction = null) {
    this.controllerState = controllerState;
    this.currentLane = currentLane;

    // Ensure standby overlay is hidden once we receive frames
    if (detection || (this.video && this.video.readyState >= 2)) {
      if (this.standbyOverlay && this.standbyOverlay.style.display !== 'none') {
        this.setCameraActive(true);
      }
    }

    // 1. Render Overlay Canvas (Skeleton, Bones, Reticle, Zones)
    this.renderCanvas(detection);

    // 2. Update Interactive Lane Indicator Tiles
    this.updateLaneTiles(currentLane);

    // 3. Update Status Header
    this.updateStatusHeader(controllerState, detection && detection.detected);

    // 4. Update Position Metrics & Action Flash
    if (detection && detection.detected && detection.palmCenter) {
      const pc = detection.palmCenter;
      const xPercent = Math.round(pc.x * 100);
      const yPercent = Math.round(pc.y * 100);
      const confPercent = Math.round((detection.confidence || 0.95) * 100);

      this.metricXVal.textContent = pc.x.toFixed(2);
      this.metricXBar.style.width = `${xPercent}%`;

      this.metricYVal.textContent = pc.y.toFixed(2);
      this.metricYBar.style.width = `${yPercent}%`;

      this.metricConfVal.textContent = `${confPercent}%`;
      this.metricConfBar.style.width = `${confPercent}%`;

      // Highlight active zone banners
      this.zoneBannerLeft.classList.toggle('active', pc.x < 0.40);
      this.zoneBannerCenter.classList.toggle('active', pc.x >= 0.40 && pc.x <= 0.60);
      this.zoneBannerRight.classList.toggle('active', pc.x > 0.60);
      this.tagJump.classList.toggle('active', pc.y < 0.35);
      this.tagSlide.classList.toggle('active', pc.y > 0.65);

      // Determine active action
      if (pc.y < 0.35) {
        this.flashAction('⬆️', 'JUMPING UP', 'flash-jump');
      } else if (pc.y > 0.65) {
        this.flashAction('⬇️', 'SLIDING DOWN', 'flash-slide');
      } else if (pc.x < 0.40) {
        this.flashAction('⬅️', 'STEERING LEFT', 'flash-left');
      } else if (pc.x > 0.60) {
        this.flashAction('➡️', 'STEERING RIGHT', 'flash-right');
      } else {
        this.flashAction('🏃', 'RUNNING CENTER', 'flash-run');
      }
    } else {
      this.metricXVal.textContent = '--';
      this.metricYVal.textContent = '--';
      this.metricConfVal.textContent = '0%';
      this.metricConfBar.style.width = '0%';

      this.zoneBannerLeft.classList.remove('active');
      this.zoneBannerCenter.classList.remove('active');
      this.zoneBannerRight.classList.remove('active');
      this.tagJump.classList.remove('active');
      this.tagSlide.classList.remove('active');

      this.flashAction('✋', 'SHOW HAND IN FRAME', 'flash-wait');
    }
  }

  renderCanvas(detection) {
    if (!this.ctx || !this.feedMount) return;
    const rect = this.feedMount.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    const hasHand = detection && detection.detected && detection.palmCenter;
    const px = hasHand ? detection.palmCenter.x : 0.5;

    // 1. Draw Tinted Steering Zone Columns
    // Left Zone (0 to 40%)
    if (hasHand && px < 0.40) {
      this.ctx.fillStyle = 'rgba(255, 0, 85, 0.16)';
      this.ctx.fillRect(0, 0, w * 0.40, h);
    }

    // Center Zone (40% to 60%)
    if (hasHand && px >= 0.40 && px <= 0.60) {
      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      this.ctx.fillRect(w * 0.40, 0, w * 0.20, h);
    }

    // Right Zone (60% to 100%)
    if (hasHand && px > 0.60) {
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      this.ctx.fillRect(w * 0.60, 0, w * 0.40, h);
    }

    // 2. Draw Lane Boundary Divider Lines
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
    this.ctx.lineWidth = 2.0;
    this.ctx.setLineDash([8, 6]);

    // Left Lane Boundary Line
    this.ctx.beginPath();
    this.ctx.moveTo(w * 0.40, 0);
    this.ctx.lineTo(w * 0.40, h);
    this.ctx.stroke();

    // Right Lane Boundary Line
    this.ctx.beginPath();
    this.ctx.moveTo(w * 0.60, 0);
    this.ctx.lineTo(w * 0.60, h);
    this.ctx.stroke();

    // 3. Draw Jump and Slide Threshold Lines
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.45)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.35);
    this.ctx.lineTo(w, h * 0.35);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 107, 0, 0.45)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.65);
    this.ctx.lineTo(w, h * 0.65);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // If no hand detected, render subtle search crosshair in center
    if (!detection || !detection.detected || !detection.landmarks) {
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(w / 2, h / 2, 36, 0, Math.PI * 2);
      this.ctx.moveTo(w / 2 - 50, h / 2);
      this.ctx.lineTo(w / 2 + 50, h / 2);
      this.ctx.moveTo(w / 2, h / 2 - 50);
      this.ctx.lineTo(w / 2, h / 2 + 50);
      this.ctx.stroke();

      this.ctx.fillStyle = '#00f0ff';
      this.ctx.font = 'bold 13px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('✋ PLACE HAND IN CAMERA VIEW', w / 2, h / 2 + 65);
      return;
    }

    const landmarks = detection.landmarks;
    const toCanvasX = (rawX) => (1.0 - rawX) * w; // Mirrored coordinate matching video scaleX(-1)
    const toCanvasY = (rawY) => rawY * h;

    // 4. Draw Hand Skeleton Bones
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 3.5;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 10;

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

    // 5. Draw 21 Landmark Nodes
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const isWrist = (i === 0);

      if (isTip) {
        // Fingertip radiant beacon
        this.ctx.fillStyle = '#ff0055';
        this.ctx.beginPath();
        this.ctx.arc(toCanvasX(lm.x), toCanvasY(lm.y), 6.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else if (isWrist) {
        // Wrist anchor
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(toCanvasX(lm.x), toCanvasY(lm.y), 6, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Knuckle joints
        this.ctx.fillStyle = '#00ff88';
        this.ctx.beginPath();
        this.ctx.arc(toCanvasX(lm.x), toCanvasY(lm.y), 4.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#050b14';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }

    // 6. Draw Palm Center Targeting Reticle
    if (detection.palmCenter) {
      const pc = detection.palmCenter;
      const screenX = pc.x * w;
      const screenY = pc.y * h;

      // Glow pulse
      this.ctx.fillStyle = 'rgba(255, 234, 0, 0.35)';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 18, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer targeting crosshair
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 2.0;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 16, 0, Math.PI * 2);
      this.ctx.moveTo(screenX - 22, screenY);
      this.ctx.lineTo(screenX + 22, screenY);
      this.ctx.moveTo(screenX, screenY - 22);
      this.ctx.lineTo(screenX, screenY + 22);
      this.ctx.stroke();

      // Center point
      this.ctx.fillStyle = '#ff0055';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Live Coordinates HUD Tag
      this.ctx.fillStyle = 'rgba(7, 10, 18, 0.88)';
      this.ctx.fillRect(screenX + 22, screenY - 14, 86, 24);
      this.ctx.strokeStyle = '#00f0ff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX + 22, screenY - 14, 86, 24);

      this.ctx.fillStyle = '#00f0ff';
      this.ctx.font = 'bold 11px system-ui';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`X:${pc.x.toFixed(2)} Y:${pc.y.toFixed(2)}`, screenX + 28, screenY + 2);
    }
  }

  updateLaneTiles(currentLane) {
    if (this.tileLaneLeft) this.tileLaneLeft.classList.toggle('active', currentLane === -1);
    if (this.tileLaneCenter) this.tileLaneCenter.classList.toggle('active', currentLane === 0);
    if (this.tileLaneRight) this.tileLaneRight.classList.toggle('active', currentLane === 1);
  }

  updateStatusHeader(state, isDetected) {
    if (!this.statusBadge || !this.statusText) return;

    if (!isDetected || state === 'LOST') {
      this.statusBadge.className = 'cam-status-pill status-lost';
      this.statusText.textContent = 'NO HAND DETECTED';
    } else if (state === 'REARMING') {
      this.statusBadge.className = 'cam-status-pill status-rearm';
      this.statusText.textContent = 'RETURNING TO NEUTRAL';
    } else {
      this.statusBadge.className = 'cam-status-pill status-active';
      this.statusText.textContent = 'HAND TRACKING LOCKED';
    }
  }

  flashAction(icon, text, styleClass) {
    if (!this.actionFlash) return;
    this.flashIcon.textContent = icon;
    this.flashText.textContent = text;
    this.actionFlash.className = `cam-action-flash ${styleClass || ''}`;
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
