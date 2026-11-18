/**
 * DifficultyManager.js
 * Controls progressive game speed, obstacle density, and fair reaction spacing.
 */

export class DifficultyManager {
  constructor() {
    this.baseSpeed = 18.0;      // Starting runner speed (units/second)
    this.maxSpeed = 42.0;       // Maximum terminal speed
    this.speedAcceleration = 0.015; // Speed increase per meter
    this.currentSpeed = this.baseSpeed;

    // Minimum distance between sequential obstacle rows (meters)
    this.minReactionTime = 0.95; // Seconds of reaction time guaranteed
  }

  reset() {
    this.currentSpeed = this.baseSpeed;
  }

  update(distance) {
    // Smooth logarithmic-linear progression curve
    this.currentSpeed = Math.min(
      this.maxSpeed,
      this.baseSpeed + Math.sqrt(distance) * 0.55 + distance * 0.008
    );
    return this.currentSpeed;
  }

  getSpeed() {
    return this.currentSpeed;
  }

  getMinObstacleSpacing() {
    // Distance = speed * reaction time
    return Math.max(22.0, this.currentSpeed * this.minReactionTime);
  }

  getDifficultyTier() {
    if (this.currentSpeed < 24) return 1; // Beginner
    if (this.currentSpeed < 30) return 2; // Moderate
    if (this.currentSpeed < 36) return 3; // Fast
    return 4; // Expert
  }
}
