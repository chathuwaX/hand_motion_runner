/**
 * ScoreManager.js
 * Manages player distance, collected coins, score calculations,
 * and high score persistence via localStorage.
 */

export class ScoreManager {
  constructor() {
    this.distance = 0;       // in meters
    this.coins = 0;          // collected coins count
    this.score = 0;          // combined score (distance + coins * 10)
    this.highScore = 0;
    this.multiplier = 1;

    this.loadHighScore();
  }

  loadHighScore() {
    try {
      const stored = localStorage.getItem('motion_runner_highscore');
      this.highScore = stored ? parseInt(stored, 10) : 0;
      if (isNaN(this.highScore)) this.highScore = 0;
    } catch (e) {
      this.highScore = 0;
    }
  }

  saveHighScore() {
    try {
      if (this.score > this.highScore) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem('motion_runner_highscore', this.highScore.toString());
        return true; // New record!
      }
    } catch (e) {
      console.warn('Could not save high score:', e);
    }
    return false;
  }

  reset() {
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.multiplier = 1;
    this.loadHighScore();
  }

  update(deltaTime, currentSpeed) {
    // Distance traveled = speed * deltaTime
    this.distance += currentSpeed * deltaTime;
    // Multiplier increases slightly with distance (1x at 0m, 2x at 1000m, etc.)
    this.multiplier = 1 + Math.floor(this.distance / 400) * 0.2;
    this.score = Math.floor(this.distance * this.multiplier + this.coins * 10);
  }

  addCoin() {
    this.coins += 1;
    this.score = Math.floor(this.distance * this.multiplier + this.coins * 10);
    return this.coins;
  }

  getStats() {
    return {
      distance: Math.floor(this.distance),
      coins: this.coins,
      score: this.score,
      highScore: Math.max(this.highScore, this.score),
      isNewRecord: this.score > this.highScore,
      multiplier: this.multiplier.toFixed(1)
    };
  }
}
