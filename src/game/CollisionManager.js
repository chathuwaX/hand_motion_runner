/**
 * CollisionManager.js
 * High precision 3D AABB collision detection.
 * Evaluates player bounding volumes against obstacles, taking into account
 * jump clearance over low hurdles and slide clearance under overhead hazards.
 */

export class CollisionManager {
  constructor(player, obstacleManager, coinManager, audioManager) {
    this.player = player;
    this.obstacleManager = obstacleManager;
    this.coinManager = coinManager;
    this.audioManager = audioManager;

    this.gracePeriod = 1.2; // Invulnerability seconds on start
    this.graceTimer = 0;
  }

  reset() {
    this.graceTimer = this.gracePeriod;
  }

  update(delta) {
    if (this.graceTimer > 0) {
      this.graceTimer -= delta;
    }
  }

  checkCollisions() {
    // 1. Check Coin Pickups (always active)
    const collected = this.coinManager.checkPickup(this.player.box, this.player.mesh.position);
    if (collected > 0) {
      for (let c = 0; c < collected; c++) {
        this.audioManager.playCoin();
      }
    }

    // 2. Check Obstacle Collisions
    if (this.graceTimer > 0 || this.player.isDead) {
      return { crashed: false, coins: collected };
    }

    const playerBox = this.player.box;
    const obstacles = this.obstacleManager.activeObstacles;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const obsBox = obs.userData.box;

      // Fast Z-proximity filter first
      const distZ = Math.abs(obs.position.z - this.player.mesh.position.z);
      if (distZ > 12.0) continue;

      if (playerBox.intersectsBox(obsBox)) {
        // Detailed clearance logic:
        // Case A: Low Barrier - cleared if player is jumping high enough
        if (obs.userData.canJumpOver && this.player.isJumping && this.player.mesh.position.y > 1.1) {
          // Cleared barrier successfully!
          continue;
        }

        // Case B: Overhead Hazard - cleared if player is sliding low
        if (obs.userData.canSlideUnder && this.player.isSliding) {
          // Cleared hazard successfully!
          continue;
        }

        // Fatal crash!
        return {
          crashed: true,
          obstacle: obs,
          coins: collected
        };
      }
    }

    return { crashed: false, coins: collected };
  }
}
