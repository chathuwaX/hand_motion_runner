/**
 * CameraPreview.js
 * Renders live camera video and draws hand landmark skeletons,
 * palm center, fingertip joints, and real-time lane steering zones.
 */

export class CameraPreview {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 320;
    this.height = options.height || 240;
    this.isMirrored = options.isMirrored !== false;

    // Hand connections (pairs of landmark indices)
    this.CONNECTIONS = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm Knuckle connectors
      [5, 9], [9, 13], [13, 17]
    ];

    this.createElements();
  }

  createElements() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'camera-preview-wrapper';
    this.wrapper.style.position = 'relative';
    this.wrapper.style.width = `${this.width}px`;
    this.wrapper.style.height = `${this.height}px`;

    // Video element
    this.video = document.createElement('video');
    this.video.className = 'camera-video';
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = 'cover';
    if (this.isMirrored) {
      this.video.style.transform = 'scaleX(-1)';
    }
    this.wrapper.appendChild(this.video);

    // Overlay canvas (unmirrored in CSS so we can draw text cleanly)
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'camera-canvas';
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.wrapper.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.wrapper);
  }

  getVideoElement() {
    return this.video;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.wrapper.style.width = `${width}px`;
    this.wrapper.style.height = `${height}px`;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(detection, showSteeringZones = true) {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw Subtle Steering Zone Dividers (Left at 40%, Right at 60%)
    if (showSteeringZones) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([4, 4]);

      // Left lane divider
      this.ctx.beginPath();
      this.ctx.moveTo(w * 0.40, 0);
      this.ctx.lineTo(w * 0.40, h);
      this.ctx.stroke();

      // Right lane divider
      this.ctx.beginPath();
      this.ctx.moveTo(w * 0.60, 0);
      this.ctx.lineTo(w * 0.60, h);
      this.ctx.stroke();

      this.ctx.setLineDash([]);
    }

    if (!detection || !detection.detected || !detection.landmarks) {
      // Draw "Waiting for Hand..." badge
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(8, h - 26, 120, 20);
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.font = 'bold 11px system-ui';
      this.ctx.fillText('Show Hand ✋', 14, h - 12);
      return;
    }

    const landmarks = detection.landmarks;

    // Helper to mirror landmark X to match video scaleX(-1)
    const toCanvasX = (rawX) => (1.0 - rawX) * w;
    const toCanvasY = (rawY) => rawY * h;

    // 2. Draw Hand Skeleton Bones
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2.5;
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

    // 3. Draw Landmark Joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      this.ctx.fillStyle = isTip ? '#ff0055' : '#00ff88';
      this.ctx.beginPath();
      this.ctx.arc(toCanvasX(lm.x), toCanvasY(lm.y), isTip ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 4. Draw Palm Center Reticle & Status Banner
    if (detection.palmCenter) {
      const pc = detection.palmCenter;
      const screenX = pc.x * w; // pc.x is already mirrored in HandTracker!
      const screenY = pc.y * h;

      // Reticle
      this.ctx.fillStyle = '#ffea00';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
      this.ctx.stroke();

      // Active Direction Badge
      let badgeText = '⏺ CENTER';
      let badgeColor = '#00f0ff';

      if (pc.y < 0.35) {
        badgeText = '⬆ JUMP';
        badgeColor = '#ffea00';
      } else if (pc.y > 0.65) {
        badgeText = '⬇ SLIDE';
        badgeColor = '#ffea00';
      } else if (pc.x < 0.40) {
        badgeText = '⬅ LEFT';
        badgeColor = '#ff0055';
      } else if (pc.x > 0.60) {
        badgeText = '➡ RIGHT';
        badgeColor = '#00ff88';
      }

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(8, 8, 90, 22);
      this.ctx.fillStyle = badgeColor;
      this.ctx.font = 'bold 12px system-ui';
      this.ctx.fillText(badgeText, 14, 24);
    }
  }

  show() {
    this.wrapper.style.display = 'block';
  }

  hide() {
    this.wrapper.style.display = 'none';
  }

  dispose() {
    this.wrapper.remove();
  }
}
