/**
 * Game.js
 * Master game coordinator.
 * Orchestrates:
 * - 3D Three.js rendering with photorealistic human runner and subway tracks
 * - Dual split-screen architecture (Game Viewport on one side, Human Tracking Station on the other)
 * - Real-time camera hand tracking, MediaPipe HandLandmarker, and GestureController
 * - Audio synthesis, obstacle pooling, and interactive UI screens
 */

import { SceneManager } from './SceneManager.js';
import { Player } from './Player.js';
import { Environment } from './Environment.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CoinManager } from './CoinManager.js';
import { CollisionManager } from './CollisionManager.js';
import { ScoreManager } from './ScoreManager.js';
import { DifficultyManager } from './DifficultyManager.js';
import { GameLoop } from './GameLoop.js';
import { gameStateManager, GameStates } from './GameStateManager.js';

import { CameraManager } from '../vision/CameraManager.js';
import { HandTracker } from '../vision/HandTracker.js';
import { HandMovementTracker } from '../vision/HandMovementTracker.js';
import { GestureRecognizer } from '../vision/GestureRecognizer.js';
import { HandCalibration } from '../vision/HandCalibration.js';
import { GestureController, GameActions, ControllerState } from '../vision/GestureController.js';

import { InputManager, ControlMode } from '../controls/InputManager.js';
import { audioManager } from '../audio/AudioManager.js';

import { MainMenu } from '../ui/MainMenu.js';
import { CalibrationScreen } from '../ui/CalibrationScreen.js';
import { GameHUD } from '../ui/GameHUD.js';
import { GameOver } from '../ui/GameOver.js';
import { Settings } from '../ui/Settings.js';
import { TrackingPanel } from '../ui/TrackingPanel.js';

export class Game {
  constructor(canvasContainer, uiContainer, trackingContainer, hudContainer) {
    this.canvasContainer = canvasContainer;
    this.uiContainer = uiContainer;
    this.trackingContainer = trackingContainer || document.getElementById('tracking-panel');
    this.hudContainer = hudContainer || document.getElementById('game-hud-mount') || uiContainer;

    // Subsystems
    this.sceneManager = null;
    this.player = null;
    this.environment = null;
    this.obstacleManager = null;
    this.coinManager = null;
    this.collisionManager = null;
    this.scoreManager = null;
    this.difficultyManager = null;
    this.gameLoop = null;

    // Vision
    this.cameraManager = null;
    this.handTracker = null;
    this.movementTracker = null;
    this.gestureRecognizer = null;
    this.calibration = null;
    this.gestureController = null;

    // Input & Audio
    this.inputManager = null;
    this.audioManager = audioManager;

    // UI
    this.mainMenu = null;
    this.calibrationScreen = null;
    this.gameHUD = null;
    this.gameOver = null;
    this.settings = null;
    this.trackingPanel = null;

    // Vision processing loop
    this.visionRafId = null;
    this.lastDetection = null;

    this.init();
  }

  async init() {
    console.log('[Game] Initializing 3D Motion Runner (Split-Screen Architecture)...');

    // 1. Initialize 3D Engine
    this.sceneManager = new SceneManager(this.canvasContainer);
    this.player = new Player(this.sceneManager.scene);
    this.environment = new Environment(this.sceneManager.scene);
    this.obstacleManager = new ObstacleManager(this.sceneManager.scene);
    this.coinManager = new CoinManager(this.sceneManager.scene);
    this.collisionManager = new CollisionManager(
      this.player,
      this.obstacleManager,
      this.coinManager,
      this.audioManager
    );
    this.scoreManager = new ScoreManager();
    this.difficultyManager = new DifficultyManager();

    // 2. Initialize Vision Subsystems
    this.cameraManager = new CameraManager();
    this.handTracker = new HandTracker();
    this.movementTracker = new HandMovementTracker();
    this.gestureRecognizer = new GestureRecognizer();
    this.calibration = new HandCalibration();
    this.gestureController = new GestureController(
      this.movementTracker,
      this.gestureRecognizer,
      this.calibration
    );

    // 3. Initialize Input
    this.inputManager = new InputManager(this.gestureController);
    this.inputManager.onActionCallback = (action, details) => this.handleAction(action, details);
    this.inputManager.onPauseCallback = () => this.togglePause();

    // 4. Initialize UI & Tracking Panel
    this.initUI();

    // 5. Setup Game Loop
    this.gameLoop = new GameLoop(
      (delta) => this.update(delta),
      () => this.render()
    );

    // State machine setup
    gameStateManager.on('change', (newState, oldState) => this.handleStateChange(newState, oldState));
    gameStateManager.setState(GameStates.MAIN_MENU);

    // Start background render loop (for main menu 3D scenery)
    this.gameLoop.start();

    // Preload available camera devices
    this.cameraManager.getAvailableCameras().then(cams => {
      if (this.settings) this.settings.updateCameraList(cams);
      if (this.trackingPanel) this.trackingPanel.updateCameraList(cams);
    });

    console.log('[Game] Split-screen initialization complete.');
  }

  initUI() {
    // 1. Dedicated Human Motion Tracking Panel (Right / Split Side)
    if (this.trackingContainer) {
      this.trackingPanel = new TrackingPanel(this.trackingContainer, {
        onSwapSides: () => this.toggleSwapSides(),
        onRecalibrate: () => this.startHandControlFlow(true),
        onSensitivityChange: (factorName) => {
          const factor = factorName === 'high' ? 1.4 : (factorName === 'low' ? 0.7 : 1.0);
          this.movementTracker.setSensitivity(factor);
          this.gestureRecognizer.setSensitivity(factor);
        },
        onCameraChange: async (deviceId) => {
          const videoEl = this.trackingPanel.getVideoElement();
          await this.cameraManager.startCamera(videoEl, deviceId);
        }
      });
    }

    // 2. Center Divider Swap Sides Button
    const btnCenterSwap = document.getElementById('btn-split-swap');
    if (btnCenterSwap) {
      btnCenterSwap.addEventListener('click', () => this.toggleSwapSides());
    }

    // 3. Main Menu Modal
    this.mainMenu = new MainMenu(this.uiContainer, {
      onPlayHand: () => this.startHandControlFlow(),
      onPlayKeyboard: () => this.startKeyboardRun(),
      onOpenSettings: () => this.settings.show()
    });
    this.mainMenu.updateHighScore(this.scoreManager.highScore);

    // 4. Calibration Screen Modal
    this.calibrationScreen = new CalibrationScreen(this.uiContainer, {
      onCancel: () => this.cancelCalibration(),
      onRecalibrate: () => this.calibration.startCalibration(),
      onStartGame: () => this.launchRunFromCalibration(),
      onSensitivityChange: (factor) => {
        this.movementTracker.setSensitivity(factor);
        this.gestureRecognizer.setSensitivity(factor);
      }
    });

    this.calibration.onProgressCallback = (data) => {
      this.calibrationScreen.updateProgress(data.progress, data.status);
    };

    this.calibration.onCompleteCallback = (neutral) => {
      this.audioManager.playGestureCue();
    };

    // 5. Game HUD (Mounted over the Game Viewport)
    this.gameHUD = new GameHUD(this.hudContainer, {
      onPause: () => this.togglePause(),
      onResume: () => this.resumeRun(),
      onRestart: () => this.restartRun(),
      onQuit: () => this.quitToMainMenu()
    });
    // In split-screen mode, the dedicated TrackingPanel handles full video and skeleton rendering
    this.gameHUD.setPipVisible(false);

    // 6. Game Over Modal
    this.gameOver = new GameOver(this.uiContainer, {
      onRestart: () => this.restartRun(),
      onRecalibrate: () => this.startHandControlFlow(true),
      onMainMenu: () => this.quitToMainMenu()
    });

    // 7. Settings Modal
    this.settings = new Settings(this.uiContainer, this.audioManager, {
      onCameraSelect: async (deviceId) => {
        if (this.cameraManager.isStreaming && this.trackingPanel) {
          const videoEl = this.trackingPanel.getVideoElement();
          await this.cameraManager.startCamera(videoEl, deviceId);
        }
      },
      onSensitivityChange: (factor) => {
        this.movementTracker.setSensitivity(factor);
        this.gestureRecognizer.setSensitivity(factor);
      }
    });
  }

  toggleSwapSides() {
    const app = document.getElementById('app-container');
    if (app) {
      app.classList.toggle('layout-swapped');
    }
    // Resize Three.js viewport immediately
    if (this.sceneManager) {
      setTimeout(() => this.sceneManager.onWindowResize(), 50);
    }
  }

  // --- Game Flow Transitions ---

  async startHandControlFlow(forceCalibration = false) {
    this.inputManager.setMode(ControlMode.HAND);
    this.mainMenu.hide();
    this.gameOver.hide();

    try {
      // 1. Hook camera directly to the dedicated Tracking Panel video element
      const trackingVideo = this.trackingPanel ? this.trackingPanel.getVideoElement() : null;
      if (trackingVideo) {
        await this.cameraManager.startCamera(trackingVideo);
      }

      // 2. Initialize MediaPipe HandLandmarker if needed
      if (!this.handTracker.isLoaded) {
        await this.handTracker.init();
      }

      // Start continuous vision tracking loop
      this.startVisionLoop();

      if (forceCalibration) {
        // Open calibration modal
        this.calibrationScreen.show();
        this.calibration.startCalibration();
      } else {
        // Launch directly into split-screen game
        this.startRun();
      }
    } catch (err) {
      console.error('[Game] Hand tracking initialization failed:', err);
      alert('Could not access webcam for hand tracking: ' + err.message + '\nSwitching to Keyboard mode.');
      this.startKeyboardRun();
    }
  }

  startKeyboardRun() {
    this.inputManager.setMode(ControlMode.KEYBOARD);
    this.mainMenu.hide();
    this.calibrationScreen.hide();

    this.startRun();
  }

  launchRunFromCalibration() {
    this.calibrationScreen.hide();

    // Reattach camera stream to Tracking Panel video element
    const trackingVideo = this.trackingPanel ? this.trackingPanel.getVideoElement() : null;
    if (this.cameraManager.stream && trackingVideo) {
      trackingVideo.srcObject = this.cameraManager.stream;
      trackingVideo.play().catch(() => {});
    }

    this.startRun();
  }

  cancelCalibration() {
    this.calibrationScreen.hide();
    this.cameraManager.stopCamera();
    this.stopVisionLoop();
    this.mainMenu.show();
    gameStateManager.setState(GameStates.MAIN_MENU);
  }

  startRun() {
    this.audioManager.unlock();
    this.audioManager.startBGM();

    // Reset systems
    this.player.reset();
    this.sceneManager.resetCamera();
    this.environment.reset();
    this.obstacleManager.reset();
    this.coinManager.reset();
    this.collisionManager.reset();
    this.scoreManager.reset();
    this.difficultyManager.reset();
    this.gestureController.reset();

    this.gameOver.hide();
    this.gameHUD.show();
    this.gameHUD.hidePauseModal();

    if (this.inputManager.getMode() === ControlMode.HAND) {
      this.startVisionLoop();
      const trackingVideo = this.trackingPanel ? this.trackingPanel.getVideoElement() : null;
      if (this.cameraManager.stream && trackingVideo) {
        trackingVideo.srcObject = this.cameraManager.stream;
        trackingVideo.play().catch(() => {});
      }
    }

    gameStateManager.setState(GameStates.PLAYING);
  }

  restartRun() {
    this.startRun();
  }

  togglePause() {
    if (gameStateManager.is(GameStates.PLAYING)) {
      gameStateManager.setState(GameStates.PAUSED);
      this.gameHUD.showPauseModal();
      this.audioManager.stopBGM();
    } else if (gameStateManager.is(GameStates.PAUSED)) {
      this.resumeRun();
    }
  }

  resumeRun() {
    this.gameHUD.hidePauseModal();
    gameStateManager.setState(GameStates.PLAYING);
    this.audioManager.startBGM();
  }

  quitToMainMenu() {
    this.audioManager.stopBGM();
    this.gameHUD.hide();
    this.gameOver.hide();
    this.calibrationScreen.hide();

    this.mainMenu.updateHighScore(this.scoreManager.highScore);
    this.mainMenu.show();

    this.cameraManager.stopCamera();
    this.stopVisionLoop();

    gameStateManager.setState(GameStates.MAIN_MENU);
  }

  triggerGameOver() {
    gameStateManager.setState(GameStates.GAME_OVER);
    this.audioManager.stopBGM();
    this.audioManager.playCrash();

    this.player.triggerCrash();

    const isRecord = this.scoreManager.saveHighScore();
    const stats = this.scoreManager.getStats();

    this.gameHUD.hide();
    this.gameOver.setStats({ ...stats, isNewRecord: isRecord });
    this.gameOver.show();
  }

  // --- Input & Gameplay Actions ---

  handleAction(action, details) {
    if (!gameStateManager.is(GameStates.PLAYING)) return;

    let success = false;
    switch (action) {
      case GameActions.MOVE_LEFT:
      case GameActions.MOVE_RIGHT:
        if (details && details.targetLane !== undefined) {
          success = this.player.setLane(details.targetLane);
        } else if (action === GameActions.MOVE_LEFT) {
          success = this.player.moveLeft();
        } else {
          success = this.player.moveRight();
        }

        if (success) {
          this.audioManager.playLaneSwitch();
          this.gameHUD.showGestureToast(action);
        }
        break;

      case GameActions.JUMP:
        success = this.player.jump();
        if (success) {
          this.audioManager.playJump();
          this.gameHUD.showGestureToast('JUMP');
        }
        break;

      case GameActions.SLIDE:
        success = this.player.slide();
        if (success) {
          this.audioManager.playSlide();
          this.gameHUD.showGestureToast('SLIDE');
        }
        break;
    }
  }

  // --- Real-Time Vision Loop ---

  startVisionLoop() {
    if (this.visionRafId) return;

    const visionPump = (timestamp) => {
      this.processVisionFrame(timestamp);
      this.visionRafId = requestAnimationFrame(visionPump);
    };

    this.visionRafId = requestAnimationFrame(visionPump);
  }

  stopVisionLoop() {
    if (this.visionRafId) {
      cancelAnimationFrame(this.visionRafId);
      this.visionRafId = null;
    }
  }

  processVisionFrame(timestamp) {
    if (!this.cameraManager.isStreaming || !this.handTracker.isLoaded) return;

    const activeVideo = (this.trackingPanel && this.trackingPanel.getVideoElement()) ||
      this.cameraManager.getActiveVideo() ||
      this.gameHUD.getCameraPreview().getVideoElement();

    if (!activeVideo || activeVideo.readyState < 2) return;

    const detection = this.handTracker.detect(activeVideo, timestamp);
    this.lastDetection = detection;

    const isPlaying = gameStateManager.is(GameStates.PLAYING);
    const ctrlState = this.gestureController.getState();
    const currentLane = this.player ? this.player.targetLane : 0;

    // 1. Update Tracking Panel Viewport & Telemetry
    if (this.trackingPanel) {
      this.trackingPanel.render(detection, ctrlState, currentLane);
    }

    // 2. Process Hand Gestures into Game Actions
    if (isPlaying && this.inputManager.getMode() === ControlMode.HAND) {
      this.gestureController.process(detection, timestamp);
      this.gameHUD.updateTrackingStatus(this.gestureController.getState(), false);
    }
  }

  // --- Main Update & Render Loops ---

  update(delta) {
    const isPlaying = gameStateManager.is(GameStates.PLAYING);

    // Environment scrolls in menu and during gameplay
    const speed = isPlaying ? this.difficultyManager.getSpeed() : 10.0;
    this.environment.update(delta, speed);

    if (isPlaying) {
      // Update Difficulty
      this.difficultyManager.update(this.scoreManager.distance);
      const currentSpeed = this.difficultyManager.getSpeed();
      const minSpacing = this.difficultyManager.getMinObstacleSpacing();
      const difficultyTier = this.difficultyManager.getDifficultyTier();

      // Update Music Tempo
      this.audioManager.updateTempo(currentSpeed);

      // Update Player
      this.player.update(delta, currentSpeed);

      // Dynamic 3rd person cinematic camera follow
      this.sceneManager.updateCamera(delta, this.player.mesh.position, currentSpeed);

      // Update Obstacles & Coins
      this.obstacleManager.update(delta, currentSpeed, difficultyTier, minSpacing);
      this.coinManager.update(delta, currentSpeed);

      // Update Collision System
      this.collisionManager.update(delta);
      const colResult = this.collisionManager.checkCollisions();

      if (colResult.coins > 0) {
        for (let i = 0; i < colResult.coins; i++) {
          this.scoreManager.addCoin();
        }
      }

      if (colResult.crashed) {
        this.triggerGameOver();
        return;
      }

      // Update Score
      this.scoreManager.update(delta, currentSpeed);

      // Update HUD Stats
      this.gameHUD.updateStats(this.scoreManager.getStats(), currentSpeed);
    } else {
      // Idle player animation in menu
      this.player.update(delta, 10.0);
    }
  }

  render() {
    this.sceneManager.render();
  }

  handleStateChange(newState, oldState) {
    if (newState === GameStates.PLAYING && this.inputManager.getMode() === ControlMode.KEYBOARD) {
      this.gameHUD.updateTrackingStatus(ControllerState.IDLE, true);
    }
  }
}
