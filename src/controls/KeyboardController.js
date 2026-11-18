/**
 * KeyboardController.js
 * Keyboard fallback input controller.
 * Maps WASD / Arrow keys / Space / Escape to game actions with key-repeat prevention.
 */

import { GameActions } from '../vision/GestureController.js';

export class KeyboardController {
  constructor() {
    this.enabled = true;
    this.activeKeys = new Set();
    this.onActionCallback = null;
    this.onPauseCallback = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    if (!this.enabled) return;

    // Prevent scrolling for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    // Ignore key repeat to ensure single discrete action per press
    if (e.repeat || this.activeKeys.has(e.code)) return;
    this.activeKeys.add(e.code);

    let action = null;
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        action = GameActions.MOVE_LEFT;
        break;

      case 'KeyD':
      case 'ArrowRight':
        action = GameActions.MOVE_RIGHT;
        break;

      case 'KeyW':
      case 'ArrowUp':
      case 'Space':
        action = GameActions.JUMP;
        break;

      case 'KeyS':
      case 'ArrowDown':
        action = GameActions.SLIDE;
        break;

      case 'Escape':
      case 'KeyP':
        if (this.onPauseCallback) this.onPauseCallback();
        return;
    }

    if (action && this.onActionCallback) {
      this.onActionCallback(action, { source: 'KEYBOARD', code: e.code });
    }
  }

  handleKeyUp(e) {
    this.activeKeys.delete(e.code);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.activeKeys.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
