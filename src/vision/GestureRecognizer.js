/**
 * GestureRecognizer.js
 * Analyzes directional displacement and velocity vectors.
 * Resolves dominant movement axes and identifies deliberate LEFT, RIGHT, UP, and DOWN gestures.
 */

export const Gestures = Object.freeze({
  NONE: 'NONE',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  UP: 'UP',
  DOWN: 'DOWN'
});

export class GestureRecognizer {
  constructor() {
    // Configurable gesture trigger thresholds (normalized screen units)
    this.thresholdX = 0.055; // Horizontal displacement needed
    this.thresholdY = 0.060; // Vertical displacement needed

    // Velocity thresholds (normalized units / second)
    this.velocityThresholdX = 0.22;
    this.velocityThresholdY = 0.25;

    // Minimum tracking confidence
    this.minConfidence = 0.35;
  }

  setSensitivity(factor) {
    // Higher sensitivity -> lower required displacement and velocity thresholds
    const baseThreshX = 0.055;
    const baseThreshY = 0.060;
    const baseVelX = 0.22;
    const baseVelY = 0.25;

    this.thresholdX = baseThreshX / factor;
    this.thresholdY = baseThreshY / factor;
    this.velocityThresholdX = baseVelX / factor;
    this.velocityThresholdY = baseVelY / factor;
  }

  recognize(movement, neutralCenter = null) {
    if (!movement || movement.confidence < this.minConfidence) {
      return { gesture: Gestures.NONE, reason: 'insufficient_confidence' };
    }

    const { deltaX, deltaY, velocityX, velocityY } = movement;

    // Displacement relative to calibrated neutral center (if provided)
    let offsetFromNeutralX = 0;
    let offsetFromNeutralY = 0;
    if (neutralCenter) {
      offsetFromNeutralX = movement.x - neutralCenter.x;
      offsetFromNeutralY = movement.y - neutralCenter.y;
    }

    // Combine window delta and neutral offset
    const effectiveX = neutralCenter
      ? (Math.abs(offsetFromNeutralX) >= Math.abs(deltaX) ? offsetFromNeutralX : deltaX)
      : deltaX;
    const effectiveY = neutralCenter
      ? (Math.abs(offsetFromNeutralY) >= Math.abs(deltaY) ? offsetFromNeutralY : deltaY)
      : deltaY;

    const absX = Math.abs(effectiveX);
    const absY = Math.abs(effectiveY);
    const absVelX = Math.abs(velocityX);
    const absVelY = Math.abs(velocityY);

    // 1. Check if movement exceeds deliberate thresholds
    // A gesture is triggered if there is clear displacement OR a dynamic swipe flick
    const isHorizontalCandidate = (absX >= this.thresholdX * 1.15) ||
      (absX >= this.thresholdX * 0.7 && absVelX >= this.velocityThresholdX * 0.7) ||
      (absX >= this.thresholdX * 0.5 && absVelX >= this.velocityThresholdX * 1.2);

    const isVerticalCandidate = (absY >= this.thresholdY * 1.15) ||
      (absY >= this.thresholdY * 0.7 && absVelY >= this.velocityThresholdY * 0.7) ||
      (absY >= this.thresholdY * 0.5 && absVelY >= this.velocityThresholdY * 1.2);

    if (!isHorizontalCandidate && !isVerticalCandidate) {
      return { gesture: Gestures.NONE, reason: 'below_threshold' };
    }

    // 2. Resolve dominant axis (distinguish horizontal swipe from jump/slide)
    if (absX >= absY * 1.05 || (isHorizontalCandidate && !isVerticalCandidate)) {
      // Dominantly horizontal
      if (effectiveX < 0) {
        return {
          gesture: Gestures.LEFT,
          displacement: absX,
          velocity: absVelX,
          axis: 'horizontal'
        };
      } else {
        return {
          gesture: Gestures.RIGHT,
          displacement: absX,
          velocity: absVelX,
          axis: 'horizontal'
        };
      }
    } else if (absY >= absX * 1.05 || (isVerticalCandidate && !isHorizontalCandidate)) {
      // Dominantly vertical
      if (effectiveY < 0) {
        return {
          gesture: Gestures.UP,
          displacement: absY,
          velocity: absVelY,
          axis: 'vertical'
        };
      } else {
        return {
          gesture: Gestures.DOWN,
          displacement: absY,
          velocity: absVelY,
          axis: 'vertical'
        };
      }
    }

    // Diagonal movement without a clear dominant axis is ignored to prevent misfires
    return { gesture: Gestures.NONE, reason: 'diagonal_ambiguity' };
  }
}
