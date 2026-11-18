/**
 * DifficultyManager.js
 * Controls progressive game speed, obstacle density, and fair reaction spacing.
 * Calibrated for comfortable hand-motion reaction times and clear decision making.
 */

export class DifficultyManager {
  constructor() {
    this.baseSpeed = 12.0;      // Comfortable starting speed (units/second)
    this.maxSpeed = 22.0;       // Smooth capped terminal speed
    this.currentSpeed = this.baseSpeed;

    // Generous reaction time guaranteed between obstacles (seconds)
    this.reactionTimeSeconds = 2.8;
  }

  reset() {
    this.currentSpeed = this.baseSpeed;
  }

  update(distance) {
    // Very gentle and smooth speed progression curve
    this.currentSpeed = Math.min(
      this.maxSpeed,
      this.baseSpeed + Math.sqrt(distance) * 0.22 + distance * 0.002
    );
    return this.currentSpeed;
  }

  getSpeed() {
    return this.currentSpeed;
  }

  getMinObstacleSpacing() {
    // Distance = speed * reaction time, with a generous base gap of 48 meters
    return Math.max(48.0, this.currentSpeed * this.reactionTimeSeconds);
  }

  getDifficultyTier() {
    if (this.currentSpeed < 14.5) return 1; // Beginner - single obstacles with huge gaps
    if (this.currentSpeed < 17.5) return 2; // Moderate
    if (this.currentSpeed < 20.0) return 3; // Brisk
    return 4; // Expert
  }
}
