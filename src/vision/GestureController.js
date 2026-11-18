/**
 * GestureController.js
 * High-responsiveness hand motion controller.
 * Combines positional lane steering (move hand left -> runner left lane,
 * move hand right -> runner right lane, center -> center lane) with
 * intuitive vertical jump/slide gestures and swipe actions.
 */

import { Gestures } from './GestureRecognizer.js';

export const ControllerState = Object.freeze({
  IDLE: 'IDLE',
  TRACKING: 'TRACKING',
  ACTION_TRIGGERED: 'ACTION_TRIGGERED',
  LOST: 'LOST'
});

export const GameActions = Object.freeze({
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  JUMP: 'JUMP',
  SLIDE: 'SLIDE',
  SET_LANE: 'SET_LANE'
});

export class GestureController {
  constructor(movementTracker, gestureRecognizer, calibration) {
    this.movementTracker = movementTracker;
    this.gestureRecognizer = gestureRecognizer;
    this.calibration = calibration;

    this.state = ControllerState.IDLE;
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right

    // Vertical cooldowns (jump / slide)
    this.lastVerticalActionTime = 0;
    this.verticalCooldownMs = 500;

    // Loss debouncing
    this.consecutiveLostFrames = 0;

    this.onActionCallback = null;
    this.onStateChangeCallback = null;
    this.lastRecognizedGesture = Gestures.NONE;
  }

  setState(newState) {
    if (this.state !== newState) {
      const prev = this.state;
      this.state = newState;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(newState, prev);
      }
    }
  }

  getState() {
    return this.state;
  }

  process(detection, timestampMs) {
    // 1. Check Hand Tracking Loss with debouncing
    const hasHand = detection && detection.detected && detection.palmCenter;
    if (!hasHand) {
      this.consecutiveLostFrames++;
      if (this.consecutiveLostFrames >= 4) {
        if (this.state !== ControllerState.LOST) {
          this.setState(ControllerState.LOST);
          this.movementTracker.reset();
        }
      }
      return { state: this.state, action: null };
    }

    this.consecutiveLostFrames = 0;
    this.setState(ControllerState.TRACKING);

    // 2. Update Movement Tracking
    const movement = this.movementTracker.update(detection, timestampMs);
    const palm = detection.palmCenter;

    // -------------------------------------------------------------
    // 3. HORIZONTAL LANE CONTROL: Positional Zones + Swipe Flicks
    // Mirrored coordinates:
    // Left side of camera preview: palm.x < 0.40
    // Center of camera preview: 0.40 <= palm.x <= 0.60
    // Right side of camera preview: palm.x > 0.60
    // -------------------------------------------------------------
    let targetLane = 0;
    if (palm.x < 0.40) {
      targetLane = -1; // Left Lane
    } else if (palm.x > 0.60) {
      targetLane = 1;  // Right Lane
    } else {
      targetLane = 0;  // Center Lane
    }

    // Check if lane changed
    if (targetLane !== this.currentLane) {
      const prevLane = this.currentLane;
      this.currentLane = targetLane;

      const action = targetLane < prevLane ? GameActions.MOVE_LEFT : GameActions.MOVE_RIGHT;
      this.lastRecognizedGesture = action === GameActions.MOVE_LEFT ? Gestures.LEFT : Gestures.RIGHT;

      if (this.onActionCallback) {
        this.onActionCallback(action, {
          source: 'HAND_POSITION',
          targetLane,
          palmX: palm.x
        });
      }

      return {
        state: ControllerState.ACTION_TRIGGERED,
        action,
        targetLane
      };
    }

    // -------------------------------------------------------------
    // 4. VERTICAL ACTIONS: JUMP & SLIDE
    // -------------------------------------------------------------
    const canDoVertical = (timestampMs - this.lastVerticalActionTime) > this.verticalCooldownMs;

    if (canDoVertical) {
      const velY = movement ? movement.velocityY : 0;
      const deltaY = movement ? movement.deltaY : 0;

      // JUMP: Hand raised high (palm.y < 0.35) OR upward flick (velY < -0.22)
      if (palm.y < 0.35 || velY < -0.22 || deltaY < -0.06) {
        this.lastVerticalActionTime = timestampMs;
        this.lastRecognizedGesture = Gestures.UP;

        if (this.onActionCallback) {
          this.onActionCallback(GameActions.JUMP, { source: 'HAND_UP', palmY: palm.y });
        }
        return { state: ControllerState.ACTION_TRIGGERED, action: GameActions.JUMP };
      }

      // SLIDE: Hand lowered (palm.y > 0.65) OR downward flick (velY > 0.22)
      if (palm.y > 0.65 || velY > 0.22 || deltaY > 0.06) {
        this.lastVerticalActionTime = timestampMs;
        this.lastRecognizedGesture = Gestures.DOWN;

        if (this.onActionCallback) {
          this.onActionCallback(GameActions.SLIDE, { source: 'HAND_DOWN', palmY: palm.y });
        }
        return { state: ControllerState.ACTION_TRIGGERED, action: GameActions.SLIDE };
      }
    }

    return { state: this.state, action: null, currentLane: this.currentLane };
  }

  reset() {
    this.state = ControllerState.IDLE;
    this.currentLane = 0;
    this.lastVerticalActionTime = 0;
    this.consecutiveLostFrames = 0;
    this.lastRecognizedGesture = Gestures.NONE;
    this.movementTracker.reset();
  }
}
