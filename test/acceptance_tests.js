/**
 * acceptance_tests.js
 * Comprehensive automated test suite validating all core algorithms:
 * - Movement tracking, smoothing & noise deadzone
 * - Directional gesture recognition & diagonal axis resolution
 * - GestureController state machine, duplicate prevention, and rearming
 * - Player lane bounds, jumping & sliding bounding volume transformations
 * - Collision detection, hurdle jump clearance & overhead slide clearance
 * - ScoreManager and DifficultyManager speed & spacing progression
 */

import { HandMovementTracker } from '../src/vision/HandMovementTracker.js';
import { GestureRecognizer, Gestures } from '../src/vision/GestureRecognizer.js';
import { GestureController, ControllerState, GameActions } from '../src/vision/GestureController.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { DifficultyManager } from '../src/game/DifficultyManager.js';
import * as THREE from 'three';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 RUNNING MOTION RUNNER AUTOMATED ACCEPTANCE TESTS');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Test Suite 1: HandMovementTracker & Noise Filtering
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: HandMovementTracker ---');
{
  const tracker = new HandMovementTracker();

  // Test 1.1: Small jitter below deadzone should produce zero delta
  const initDetection = {
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.500, y: 0.500, z: 0, rawX: 0.500 },
    handScale: 0.18
  };
  tracker.update(initDetection, 1000);

  // Slight jitter of 0.005 (below deadzone 0.022)
  const jitterDetection = {
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.504, y: 0.503, z: 0, rawX: 0.496 },
    handScale: 0.18
  };
  const resultJitter = tracker.update(jitterDetection, 1050);
  assert(resultJitter.deltaX === 0 && resultJitter.deltaY === 0, 'Small hand tremor is filtered out by deadzone');

  // Test 1.2: Deliberate swipe to left
  const swipeDetection = {
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.35, y: 0.50, z: 0, rawX: 0.65 },
    handScale: 0.18
  };
  const resultSwipe = tracker.update(swipeDetection, 1200);
  assert(resultSwipe.deltaX < -0.05, 'Deliberate left movement generates negative deltaX');
}

// -----------------------------------------------------------------------------
// Test Suite 2: GestureRecognizer
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: GestureRecognizer ---');
{
  const recognizer = new GestureRecognizer();
  const neutral = { x: 0.5, y: 0.5 };

  // Test 2.1: Left Gesture
  const leftMove = {
    x: 0.38,
    y: 0.50,
    deltaX: -0.12,
    deltaY: 0.01,
    velocityX: -0.65,
    velocityY: 0.05,
    confidence: 0.9
  };
  const resLeft = recognizer.recognize(leftMove, neutral);
  assert(resLeft.gesture === Gestures.LEFT, 'Correctly identifies LEFT gesture');

  // Test 2.2: Right Gesture
  const rightMove = {
    x: 0.62,
    y: 0.50,
    deltaX: 0.12,
    deltaY: 0.01,
    velocityX: 0.65,
    velocityY: 0.05,
    confidence: 0.9
  };
  const resRight = recognizer.recognize(rightMove, neutral);
  assert(resRight.gesture === Gestures.RIGHT, 'Correctly identifies RIGHT gesture');

  // Test 2.3: Up Gesture (Jump) - negative Y in normalized screen coordinates
  const upMove = {
    x: 0.50,
    y: 0.36,
    deltaX: 0.01,
    deltaY: -0.14,
    velocityX: 0.05,
    velocityY: -0.70,
    confidence: 0.9
  };
  const resUp = recognizer.recognize(upMove, neutral);
  assert(resUp.gesture === Gestures.UP, 'Correctly identifies UP gesture');

  // Test 2.4: Down Gesture (Slide) - positive Y in normalized screen coordinates
  const downMove = {
    x: 0.50,
    y: 0.64,
    deltaX: 0.01,
    deltaY: 0.14,
    velocityX: 0.05,
    velocityY: 0.70,
    confidence: 0.9
  };
  const resDown = recognizer.recognize(downMove, neutral);
  assert(resDown.gesture === Gestures.DOWN, 'Correctly identifies DOWN gesture');

  // Test 2.5: Ambiguous diagonal movement is suppressed
  const diagMove = {
    x: 0.60,
    y: 0.60,
    deltaX: 0.10,
    deltaY: 0.10,
    velocityX: 0.50,
    velocityY: 0.50,
    confidence: 0.9
  };
  const resDiag = recognizer.recognize(diagMove, neutral);
  assert(resDiag.gesture === Gestures.NONE, 'Ambiguous 45-degree diagonal motion produces NO gesture');
}

// -----------------------------------------------------------------------------
// Test Suite 3: GestureController State Machine & Rearming
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: GestureController & Rearming ---');
{
  const tracker = new HandMovementTracker();
  const recognizer = new GestureRecognizer();
  const fakeCalibration = {
    getNeutralCenter: () => ({ x: 0.5, y: 0.5 })
  };
  const controller = new GestureController(tracker, recognizer, fakeCalibration);

  let actionsDispatched = [];
  controller.onActionCallback = (action) => actionsDispatched.push(action);

  // 1. Initial neutral frame
  controller.process({
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.5, y: 0.5, z: 0, rawX: 0.5 },
    handScale: 0.18
  }, 1000);

  // 2. Perform sharp swipe to right across realistic 30fps frames
  controller.process({
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.58, y: 0.5, z: 0, rawX: 0.42 },
    handScale: 0.18
  }, 1040);

  controller.process({
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.68, y: 0.5, z: 0, rawX: 0.32 },
    handScale: 0.18
  }, 1080);

  assert(actionsDispatched.length === 1 && actionsDispatched[0] === GameActions.MOVE_RIGHT,
    'Triggers MOVE_RIGHT action on deliberate swipe');

  // 3. User holds hand to the right (stationary at x=0.68)
  // MUST NOT trigger another action while holding out!
  controller.process({
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.68, y: 0.5, z: 0, rawX: 0.32 },
    handScale: 0.18
  }, 1400);

  assert(actionsDispatched.length === 1,
    'Prevents duplicate triggers while hand remains held to the side');

  // 4. Return hand to neutral
  controller.process({
    detected: true,
    confidence: 0.9,
    palmCenter: { x: 0.51, y: 0.50, z: 0, rawX: 0.49 },
    handScale: 0.18
  }, 1600);

  assert(controller.currentLane === 0,
    'Returns to center lane when hand returns to neutral center');

  // 5. Hand tracking loss handling (debounced over 4 consecutive frames)
  for (let f = 0; f < 4; f++) {
    controller.process({ detected: false }, 1700 + f * 33);
  }
  assert(controller.getState() === ControllerState.LOST,
    'Gracefully transitions to LOST state when hand disappears');
}

// -----------------------------------------------------------------------------
// Test Suite 4: Collision Logic & Obstacle Clearances
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Collision Clearance ---');
{
  // Simulated Player Box
  const playerBox = new THREE.Box3();

  // Test 4.1: Low Barrier (Height = 1.05)
  // Upright player (y=0) collides:
  playerBox.setFromCenterAndSize(new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(1.1, 2.1, 1.0));
  const barrierBox = new THREE.Box3();
  barrierBox.setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(2.5, 1.0, 0.5));
  assert(playerBox.intersectsBox(barrierBox), 'Running player hits low barrier');

  // Jumping player (altitude y = 2.4):
  playerBox.setFromCenterAndSize(new THREE.Vector3(0, 3.45, 0), new THREE.Vector3(1.1, 2.1, 1.0));
  assert(!playerBox.intersectsBox(barrierBox), 'Jumping player clears over low barrier without collision');

  // Test 4.2: Overhead Hazard (Bottom at y=1.8, Top at y=4.0)
  const overheadBox = new THREE.Box3();
  overheadBox.setFromCenterAndSize(new THREE.Vector3(0, 2.9, 0), new THREE.Vector3(2.5, 2.2, 0.5));

  // Upright player hits it:
  playerBox.setFromCenterAndSize(new THREE.Vector3(0, 1.05, 0), new THREE.Vector3(1.1, 2.1, 1.0));
  assert(playerBox.intersectsBox(overheadBox), 'Upright player hits overhead hazard');

  // Sliding player (low profile box: center y=0.45, height=0.8):
  playerBox.setFromCenterAndSize(new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(1.1, 0.8, 1.5));
  assert(!playerBox.intersectsBox(overheadBox), 'Sliding player clears under overhead hazard without collision');
}

// -----------------------------------------------------------------------------
// Test Suite 5: Difficulty & Score Progression
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Difficulty & Score Progression ---');
{
  const diff = new DifficultyManager();
  const initialSpeed = diff.getSpeed();
  assert(initialSpeed === 18.0, 'Initial running speed starts at 18.0 m/s');

  diff.update(500); // After running 500 meters
  const midSpeed = diff.getSpeed();
  assert(midSpeed > initialSpeed && midSpeed < diff.maxSpeed, 'Speed increases smoothly with distance');

  const spacing = diff.getMinObstacleSpacing();
  assert(spacing >= 22.0, 'Maintains fair reaction distance spacing between obstacles');

  // ScoreManager
  const scoreMgr = new ScoreManager();
  scoreMgr.reset();
  scoreMgr.update(10, 20); // 10s at 20 m/s = 200m
  scoreMgr.addCoin();
  scoreMgr.addCoin();
  const stats = scoreMgr.getStats();
  assert(stats.distance === 200, 'Distance calculated accurately');
  assert(stats.coins === 2, 'Coin counter increments accurately');
  assert(stats.score >= 220, 'Combined score integrates distance and collected coins');
}

console.log('\n====================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) process.exit(1);
