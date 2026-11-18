# 🏃 MOTION RUNNER – 3D Hand-Motion Controlled Endless Runner

**MOTION RUNNER** is a complete, production-quality 3D endless runner inspired by *Subway Surfers*, built with **Three.js** and controlled entirely by physical hand movements in real time using your laptop webcam powered by **Google MediaPipe Tasks Vision**.

---

## 🌟 Key Features

### 🖐️ Real-Time Computer Vision & Hand Tracking
- **MediaPipe Hand Landmarker**: Tracks 21 hand landmarks locally in the browser with GPU acceleration.
- **5-Point Palm Center**: Calculates stable palm center averaging landmarks 0 (wrist), 5 (index MCP), 9 (middle MCP), 13 (ring MCP), and 17 (pinky MCP).
- **EMA Movement Smoothing**: Exponential Moving Average noise filtering eliminates micro-tremors and natural hand floating while maintaining instant response.
- **Dominant Axis Gesture Recognition**: Resolves diagonal movements by calculating axis dominance ratios to trigger clean **LEFT**, **RIGHT**, **UP (Jump)**, and **DOWN (Slide)** actions.
- **Return-to-Neutral Rearming**: Enforces return to a calibrated neutral center after each gesture, preventing accidental repeat triggers or command spam.
- **Tracking Loss & Recovery**: Gracefully handles temporary hand loss and smooth recovery without crashing.

### 🎮 3D Endless Gameplay (Three.js)
- **Three Railway Lanes**: Strict 3-lane railway system (-1 Left, 0 Center, +1 Right) with smooth banking transitions.
- **Procedural Character**: Animated 3D cyberpunk runner with articulated running gait, dynamic parabolic jump trajectories, and low-profile sliding animations.
- **Dynamic Bounding Volumes**: Real-time AABB collision box adjustments that shrink during slides (allowing clearance under overhead hazards) and elevate during jumps (clearing track hurdles).
- **Dynamic Obstacle Spawning**: Stationary subway trains, red & white railway hurdles, overhead yellow hazard clearance bars, and construction barricades with object pooling and guaranteed fair passage algorithms.
- **Spinning Gold Coins**: Rotating coins in straight lines, jump arcs, and slide tunnels with magnet pickup detection and particle burst effects.
- **Endless Environment**: Seamless segment pooling with steel rails, sleepers, gravel ballast, platforms, city skyscrapers with neon windows, overhead gantries, and railway signals.
- **Difficulty Curve**: Smooth speed progression from 18 m/s up to 42 m/s with adaptive reaction spacing.

### 🔊 Procedural Web Audio Synth
- Custom Web Audio API procedural synthesizer for instant zero-latency SFX (Jump pitch glide, Slide swoosh, Coin bell chimes, Crash explosion, UI clicks).
- Dynamic adaptive synth background music whose tempo accelerates with player speed.

### ⌨️ Keyboard Fallback
- Full keyboard support (A/D or Arrows for lanes, W/Space for jump, S for slide, ESC for pause).

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18+)
- A modern web browser with WebGL & WebRTC webcam support (Chrome, Edge, Brave, etc.)

### 2. Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

### 4. Run Automated Test Suite
```bash
npm test
```

---

## 🕹️ Controls Guide

### Hand Motion Mode (Webcam)
| Gesture | Movement | Action |
| :--- | :--- | :--- |
| **SWIPE LEFT** ⬅️ | Move hand deliberately to your left | Change to Left Lane |
| **SWIPE RIGHT** ➡️ | Move hand deliberately to your right | Change to Right Lane |
| **SWIPE UP** ⬆️ | Move hand deliberately upward | Jump over Hurdles |
| **SWIPE DOWN** ⬇️ | Move hand deliberately downward | Slide under Overhead Hazards |
| **NEUTRAL** ✋ | Return hand to central position | Rearms system for next gesture |

> **Pro Tip**: After performing any swipe, return your hand toward the center target zone to prepare for the next move.

### Keyboard Fallback Mode
- **A** or **Left Arrow**: Move Left
- **D** or **Right Arrow**: Move Right
- **W**, **Up Arrow**, or **Space**: Jump
- **S** or **Down Arrow**: Slide
- **Escape** or **P**: Pause / Resume

---

## 📁 Project Architecture

```
d:/subway_Game/
├── index.html                  # HTML entry point
├── package.json                # Project configuration & scripts
├── vite.config.js              # Vite server & dependency optimizer
├── README.md                   # Complete documentation
│
├── public/
│   └── mediapipe/
│       ├── hand_landmarker.task # Offline MediaPipe model asset
│       └── wasm/               # High-performance WebAssembly vision runtime
│
├── test/
│   └── acceptance_tests.js     # Automated test suite (21 tests)
│
└── src/
    ├── main.js                 # Application bootstrap
    │
    ├── game/
    │   ├── Game.js             # Master coordinator
    │   ├── GameLoop.js         # 60 FPS requestAnimationFrame loop
    │   ├── GameStateManager.js # Finite state machine
    │   ├── SceneManager.js     # Three.js scene, camera & lighting
    │   ├── Player.js           # 3D animated character & bounding volumes
    │   ├── Environment.js      # Endless railway track & city pooling
    │   ├── ObstacleManager.js  # Trains, hurdles & overhead hazards
    │   ├── CoinManager.js      # Gold coins & pickup particles
    │   ├── CollisionManager.js # 3D AABB clearance detection
    │   ├── ScoreManager.js     # Distance, coins & high score
    │   └── DifficultyManager.js# Speed progression & reaction spacing
    │
    ├── vision/
    │   ├── CameraManager.js    # WebRTC webcam initialization & camera selection
    │   ├── HandTracker.js      # MediaPipe 21 landmarks & palm center
    │   ├── HandMovementTracker.js # EMA smoothing & velocity history
    │   ├── GestureRecognizer.js# Dominant axis directional classifier
    │   ├── GestureController.js# State machine & neutral rearming
    │   └── HandCalibration.js  # Target ring alignment & neutral sampling
    │
    ├── controls/
    │   ├── InputManager.js     # Unified Hand & Keyboard dispatcher
    │   └── KeyboardController.js # Discrete keyboard handler
    │
    ├── ui/
    │   ├── MainMenu.js         # Cyber-arcade title & mode select
    │   ├── CalibrationScreen.js# Interactive guided calibration
    │   ├── CameraPreview.js    # Canvas skeleton & joint visualization
    │   ├── GameHUD.js          # In-game stats, gesture pills & PIP webcam
    │   ├── GameOver.js         # Run summary & record banner
    │   └── Settings.js         # Camera selection, sensitivity & audio
    │
    ├── audio/
    │   └── AudioManager.js     # Procedural Web Audio synthesizer
    │
    └── styles/
        └── style.css           # Glassmorphism & cyber-subway CSS
```

---

## 🔒 Privacy & Performance
- **100% Local Inference**: Hand detection is executed purely inside your browser using WebAssembly and WebGL. No video feed or camera images are ever recorded or transmitted over the internet.
- **Resource Cleanup**: Webcam video tracks are cleanly terminated when switching modes or closing the application.
- **Hardware Optimized**: Geometry instancing, shared materials, and object pooling ensure stable 60 FPS performance on standard laptop hardware.
