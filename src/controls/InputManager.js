/**
 * InputManager.js
 * Central coordinator combining Hand Motion input and Keyboard input.
 * Allows toggling between Hand and Keyboard modes seamlessly.
 */

import { KeyboardController } from './KeyboardController.js';
import { GameActions } from '../vision/GestureController.js';

export const ControlMode = Object.freeze({
  HAND: 'HAND',
  KEYBOARD: 'KEYBOARD'
});

export class InputManager {
  constructor(gestureController) {
    this.gestureController = gestureController;
    this.keyboardController = new KeyboardController();

    this.mode = ControlMode.HAND;
    this.onActionCallback = null;
    this.onPauseCallback = null;

    this.init();
  }

  init() {
    // Forward keyboard events
    this.keyboardController.onActionCallback = (action, details) => {
      if (this.onActionCallback) {
        this.onActionCallback(action, details);
      }
    };

    this.keyboardController.onPauseCallback = () => {
      if (this.onPauseCallback) {
        this.onPauseCallback();
      }
    };

    // Forward gesture events
    if (this.gestureController) {
      this.gestureController.onActionCallback = (action, details) => {
        if (this.mode === ControlMode.HAND && this.onActionCallback) {
          this.onActionCallback(action, { source: 'HAND', ...details });
        }
      };
    }
  }

  setMode(mode) {
    this.mode = mode;
    console.log(`[InputManager] Control mode set to: ${mode}`);
  }

  getMode() {
    return this.mode;
  }
}
