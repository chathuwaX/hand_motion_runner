/**
 * Game.js
 * Master game coordinator.
 * Orchestrates 3D rendering, physics, procedural environment,
 * real-time camera hand tracking, audio synthesis, and UI screens.
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

export class Game {
  constructor(canvasContainer, uiContainer) {
    this.canvasContainer = canvasContainer;
    this.uiContainer = uiContainer;

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

    // Vision processing loop
    this.visionRafId = null;
    this.lastDetection = null;

    this.init();
  }

  async init() {
    console.log('[Game] Initializing 3D Motion Runner...');

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

    // 4. Initialize UI
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
    });

    console.log('[Game] Initialization complete.');
  }

  initUI() {
    // Main Menu
    this.mainMenu = new MainMenu(this.uiContainer, {
      onPlayHand: () => this.startHandControlFlow(),
      onPlayKeyboard: () => this.startKeyboardRun(),
      onOpenSettings: () => this.settings.show()
    });
    this.mainMenu.updateHighScore(this.scoreManager.highScore);

    // Calibration Screen
    this.calibrationScreen = new CalibrationScreen(this.uiContainer, {
      onCancel: () => this.cancelCalibration(),
      onRecalibrate: () => this.calibration.startCalibration(),
      onStartGame: () => this.launchRunFromCalibration(),
      onSensitivityChange: (factor) => {
        this.movementTracker.setSensitivity(factor);
        this.gestureRecognizer.setSensitivity(factor);
      }
    });

    // Calibration progress callback
    this.calibration.onProgressCallback = (data) => {
      this.calibrationScreen.updateProgress(data.progress, data.status);
    };

    // Calibration complete callback
    this.calibration.onCompleteCallback = (neutral) => {
      this.audioManager.playGestureCue();
    };

    // Game HUD
    this.gameHUD = new GameHUD(this.uiContainer, {
      onPause: () => this.togglePause(),
      onResume: () => this.resumeRun(),
      onRestart: () => this.restartRun(),
      onQuit: () => this.quitToMainMenu()
    });

    // Game Over
    this.gameOver = new GameOver(this.uiContainer, {
      onRestart: () => this.restartRun(),
      onRecalibrate: () => this.startHandControlFlow(),
      onMainMenu: () => this.quitToMainMenu()
    });

    // Settings
    this.settings = new Settings(this.uiContainer, this.audioManager, {
      onCameraSelect: async (deviceId) => {
        if (this.cameraManager.isStreaming) {
          const videoEl = this.calibrationScreen.getCameraPreview().getVideoElement();
          await this.cameraManager.startCamera(videoEl, deviceId);
        }
      },
      onSensitivityChange: (factor) => {
        this.movementTracker.setSensitivity(factor);
        this.gestureRecognizer.setSensitivity(factor);
      }
    });
  }

  // --- Game Flow Transitions ---

  async startHandControlFlow() {
    this.inputManager.setMode(ControlMode.HAND);
    this.mainMenu.hide();
    this.calibrationScreen.hide();
    this.gameHUD.setPipVisible(true);

    try {
      this.startRun();

      // 1. Start camera directly onto the HUD PIP preview video
      const videoEl = this.gameHUD.getCameraPreview().getVideoElement();
      await this.cameraManager.startCamera(videoEl);

      // 2. Initialize MediaPipe if not loaded
      if (!this.handTracker.isLoaded) {
        await this.handTracker.init();
      }

      // Start real-time vision pump
      this.startVisionLoop();
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
    this.gameHUD.setPipVisible(false);

    // Stop camera if running
    this.cameraManager.stopCamera();
    this.stopVisionLoop();

    this.startRun();
  }

  launchRunFromCalibration() {
    this.calibrationScreen.hide();
    this.gameHUD.setPipVisible(true);

    // Reattach camera stream to HUD PIP preview
    const pipVideo = this.gameHUD.getCameraPreview().getVideoElement();
    if (this.cameraManager.stream && pipVideo) {
      pipVideo.srcObject = this.cameraManager.stream;
      pipVideo.play();
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
    this.sceneManager.camera.position.set(0, 4.2, 7.0);
    this.sceneManager.camera.lookAt(0, 1.6, -10.0);
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
      const pipVideo = this.gameHUD.getCameraPreview().getVideoElement();
      if (this.cameraManager.stream && pipVideo) {
        pipVideo.srcObject = this.cameraManager.stream;
        pipVideo.play().catch(() => {});
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

    // Clean up camera when leaving hand mode
    this.cameraManager.stopCamera();
    this.stopVisionLoop();

    gameStateManager.setState(GameStates.MAIN_MENU);
  }

  triggerGameOver() {
    gameStateManager.setState(GameStates.GAME_OVER);
    this.audioManager.stopBGM();
    this.audioManager.playCrash();

    this.player.triggerCrash();

    // Check high score
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

  // --- Vision Loop ---

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

    // Detect using active playing video element
    const activeVideo = this.cameraManager.getActiveVideo() || this.gameHUD.getCameraPreview().getVideoElement();
    if (!activeVideo || activeVideo.readyState < 2) return;

    const detection = this.handTracker.detect(activeVideo, timestamp);
    this.lastDetection = detection;

    const isPlaying = gameStateManager.is(GameStates.PLAYING);

    if (isPlaying && this.inputManager.getMode() === ControlMode.HAND) {
      this.gestureController.process(detection, timestamp);
      const preview = this.gameHUD.getCameraPreview();
      preview.render(detection, true);

      // Update HUD status pill
      this.gameHUD.updateTrackingStatus(this.gestureController.getState(), false);
    }
  }

  // --- Main Update & Render Loops ---

  update(delta) {
    const isPlaying = gameStateManager.is(GameStates.PLAYING);

    // In menu or playing, environment scrolls smoothly
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

      // Dynamic 3rd person camera follow
      const targetCamX = this.player.mesh.position.x * 0.45;
      const camDiff = targetCamX - this.sceneManager.camera.position.x;
      this.sceneManager.camera.position.x += camDiff * Math.min(1.0, 10.0 * delta);
      this.sceneManager.camera.lookAt(this.player.mesh.position.x * 0.2, 1.6, -10.0);

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

      // Update HUD
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
