/**
 * HandCalibration.js
 * Guides the user through a calibration procedure,
 * samples stable neutral palm positions, evaluates position variance,
 * and calculates calibrated baseline coordinates for gesture detection.
 */

export class HandCalibration {
  constructor() {
    this.isCalibrated = false;
    this.isCalibrating = false;

    // Neutral baseline center and scale
    this.neutralCenter = { x: 0.5, y: 0.5 };
    this.neutralScale = 0.18; // Default hand scale

    // Sampling configuration
    this.requiredSamples = 14;
    this.samples = [];
    this.maxVariance = 0.085; // Maximum allowed position jitter during calibration
    this.missingFrames = 0;

    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  startCalibration() {
    this.isCalibrating = true;
    this.isCalibrated = false;
    this.samples = [];
    this.missingFrames = 0;
    console.log('[HandCalibration] Calibration started. Hold hand in center...');
  }

  reset() {
    this.isCalibrating = false;
    this.isCalibrated = false;
    this.samples = [];
    this.missingFrames = 0;
    this.neutralCenter = { x: 0.5, y: 0.5 };
    this.neutralScale = 0.18;
  }

  sample(detection) {
    if (!this.isCalibrating) return;

    if (!detection || !detection.detected || !detection.palmCenter) {
      this.missingFrames++;
      // Only reset samples if hand is missing for multiple consecutive frames (>10 frames)
      if (this.missingFrames > 10 && this.samples.length > 0) {
        this.samples = [];
        if (this.onProgressCallback) {
          this.onProgressCallback({ progress: 0, status: 'Hand not detected. Show hand to camera.' });
        }
      }
      return;
    }

    this.missingFrames = 0;

    const { x, y } = detection.palmCenter;
    const scale = detection.handScale || 0.18;

    // Check if hand is approximately in central target region (0.25 to 0.75)
    if (x < 0.25 || x > 0.75 || y < 0.25 || y > 0.75) {
      if (this.onProgressCallback) {
        this.onProgressCallback({
          progress: this.samples.length / this.requiredSamples,
          status: 'Move hand closer to the center ring.'
        });
      }
      return;
    }

    this.samples.push({ x, y, scale });

    const progress = Math.min(1.0, this.samples.length / this.requiredSamples);
    if (this.onProgressCallback) {
      this.onProgressCallback({
        progress,
        status: `Hold steady... ${Math.floor(progress * 100)}%`
      });
    }

    // Check if we have collected enough samples
    if (this.samples.length >= this.requiredSamples) {
      this.finishCalibration();
    }
  }

  finishCalibration() {
    // Calculate mean
    let sumX = 0, sumY = 0, sumScale = 0;
    for (const s of this.samples) {
      sumX += s.x;
      sumY += s.y;
      sumScale += s.scale;
    }
    const n = this.samples.length;
    const meanX = sumX / n;
    const meanY = sumY / n;
    const meanScale = sumScale / n;

    // Calculate variance to ensure player was holding hand steady
    let varX = 0, varY = 0;
    for (const s of this.samples) {
      varX += Math.pow(s.x - meanX, 2);
      varY += Math.pow(s.y - meanY, 2);
    }
    const stdDev = Math.hypot(Math.sqrt(varX / n), Math.sqrt(varY / n));

    if (stdDev > this.maxVariance) {
      // Hand was moving too erratically
      this.samples = [];
      if (this.onProgressCallback) {
        this.onProgressCallback({
          progress: 0,
          status: 'Too much movement detected. Please hold still.'
        });
      }
      return;
    }

    // Calibration succeeded!
    this.neutralCenter = { x: meanX, y: meanY };
    this.neutralScale = meanScale;
    this.isCalibrated = true;
    this.isCalibrating = false;

    console.log('[HandCalibration] Calibration complete:', this.neutralCenter, 'scale:', this.neutralScale);

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.neutralCenter, this.neutralScale);
    }
  }

  getNeutralCenter() {
    return this.neutralCenter;
  }
}
