/**
 * GameLoop.js
 * High-performance 60 FPS requestAnimationFrame game loop
 * with delta-time clamping and pause/resume lifecycle handling.
 */

import * as THREE from 'three';

export class GameLoop {
  constructor(updateCallback, renderCallback) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;

    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.rafId = null;
    this.maxDelta = 0.08; // Clamp to avoid physics tunnel jumps
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.clock.stop();
  }

  tick = () => {
    if (!this.isRunning) return;

    let delta = this.clock.getDelta();
    // Clamp delta
    if (delta > this.maxDelta) delta = this.maxDelta;

    if (this.updateCallback) {
      this.updateCallback(delta);
    }

    if (this.renderCallback) {
      this.renderCallback();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
