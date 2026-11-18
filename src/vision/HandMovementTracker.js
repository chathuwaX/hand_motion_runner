/**
 * HandMovementTracker.js
 * Identifies deliberate hand motion using multi-frame history,
 * exponential moving average (EMA) smoothing, velocity vectors, and noise deadzones.
 */

export class HandMovementTracker {
  constructor() {
    // Current smoothed position
    this.currentPosition = { x: 0.5, y: 0.5 };
    this.previousPosition = { x: 0.5, y: 0.5 };
    this.lastTimestamp = 0;

    // Smoothing factor (alpha for EMA: higher = more responsive, lower = smoother)
    this.smoothingAlpha = 0.45;

    // Movement history buffer (stores [timestamp, x, y])
    this.history = [];
    this.historyMaxAgeMs = 280; // 280ms movement analysis window

    // Displacement and velocity
    this.deltaX = 0;
    this.deltaY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 0;

    // User sensitivity multiplier (0.6: sluggish, 1.0: standard, 1.4: twitchy)
    this.sensitivity = 1.0;

    // Deadzone threshold (normalized coords): movements smaller than this are filtered as jitter
    this.deadzone = 0.022;

    this.isTracking = false;
  }

  setSensitivity(factor) {
    this.sensitivity = Math.max(0.4, Math.min(2.5, factor));
  }

  reset() {
    this.history = [];
    this.deltaX = 0;
    this.deltaY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 0;
    this.isTracking = false;
  }

  update(detection, timestampMs) {
    if (!detection || !detection.detected || !detection.palmCenter) {
      this.isTracking = false;
      return null;
    }

    const rawPos = detection.palmCenter;

    if (!this.isTracking || this.lastTimestamp === 0) {
      // Initialize tracking position
      this.currentPosition = { x: rawPos.x, y: rawPos.y };
      this.previousPosition = { x: rawPos.x, y: rawPos.y };
      this.lastTimestamp = timestampMs;
      this.history = [{ t: timestampMs, x: rawPos.x, y: rawPos.y }];
      this.isTracking = true;
      return {
        x: this.currentPosition.x,
        y: this.currentPosition.y,
        deltaX: 0,
        deltaY: 0,
        velocityX: 0,
        velocityY: 0,
        speed: 0
      };
    }

    const dt = Math.max(0.005, (timestampMs - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestampMs;

    // Exponential Moving Average (EMA) smoothing
    this.previousPosition = { ...this.currentPosition };
    this.currentPosition.x = this.smoothingAlpha * rawPos.x + (1 - this.smoothingAlpha) * this.currentPosition.x;
    this.currentPosition.y = this.smoothingAlpha * rawPos.y + (1 - this.smoothingAlpha) * this.currentPosition.y;

    // Add to history
    this.history.push({
      t: timestampMs,
      x: this.currentPosition.x,
      y: this.currentPosition.y
    });

    // Prune history older than window
    const cutoff = timestampMs - this.historyMaxAgeMs;
    while (this.history.length > 0 && this.history[0].t < cutoff) {
      this.history.shift();
    }

    // Calculate displacement across the history window (deliberate motion)
    const oldest = this.history[0];
    const rawDeltaX = this.currentPosition.x - oldest.x;
    const rawDeltaY = this.currentPosition.y - oldest.y;
    const historyDuration = Math.max(0.04, (timestampMs - oldest.t) / 1000);

    // Apply deadzone noise filter
    this.deltaX = Math.abs(rawDeltaX) > this.deadzone ? rawDeltaX : 0;
    this.deltaY = Math.abs(rawDeltaY) > this.deadzone ? rawDeltaY : 0;

    // Calculate velocities with sensitivity
    this.velocityX = (this.deltaX / historyDuration) * this.sensitivity;
    this.velocityY = (this.deltaY / historyDuration) * this.sensitivity;
    this.speed = Math.hypot(this.velocityX, this.velocityY);

    return {
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      rawX: rawPos.rawX,
      deltaX: this.deltaX,
      deltaY: this.deltaY,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      speed: this.speed,
      confidence: detection.confidence,
      handScale: detection.handScale
    };
  }
}
