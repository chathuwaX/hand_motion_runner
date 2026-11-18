/**
 * HandTracker.js
 * MediaPipe Tasks Vision HandLandmarker integration.
 * Detects 21 hand landmarks, extracts normalized coordinates, computes
 * the 5-point palm center, and handles mirrored coordinates.
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.lastVideoTime = -1;
    this.lastResult = null;
    this.lastTimestampMs = 0;

    // Palm landmark indices (0: Wrist, 5: Index MCP, 9: Middle MCP, 13: Ring MCP, 17: Pinky MCP)
    this.PALM_INDICES = [0, 5, 9, 13, 17];
  }

  async init() {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    try {
      console.log('[HandTracker] Initializing MediaPipe HandLandmarker...');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      // 1. Resolve WASM assets (try local first, fallback to CDN)
      let vision = null;
      try {
        vision = await FilesetResolver.forVisionTasks(`${origin}/mediapipe/wasm`);
      } catch (wasmErr) {
        console.warn('[HandTracker] Local WASM load failed, using official CDN...', wasmErr);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
      }

      // 2. Helper to try creating landmarker with GPU then CPU fallback
      const tryCreate = async (modelPath) => {
        try {
          return await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        } catch (gpuErr) {
          console.warn('[HandTracker] GPU delegate failed, falling back to CPU...', gpuErr);
          return await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        }
      };

      try {
        this.landmarker = await tryCreate(`${origin}/mediapipe/hand_landmarker.task`);
      } catch (localModelErr) {
        console.warn('[HandTracker] Local model load failed, trying Google CDN model...', localModelErr);
        this.landmarker = await tryCreate(
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
        );
      }

      this.isLoaded = true;
      this.isLoading = false;
      console.log('[HandTracker] HandLandmarker ready.');
    } catch (err) {
      this.isLoading = false;
      console.error('[HandTracker] Failed to initialize HandLandmarker:', err);
      throw err;
    }
  }

  detect(videoElement, timestampMs) {
    if (!this.isLoaded || !this.landmarker || !videoElement || videoElement.readyState < 2) {
      return this.lastResult || null;
    }

    // Process frame if video timestamp has advanced
    if (videoElement.currentTime === this.lastVideoTime && this.lastResult) {
      return this.lastResult;
    }
    this.lastVideoTime = videoElement.currentTime;

    // Strictly monotonic timestamp required by MediaPipe
    let ts = Math.round(timestampMs || performance.now());
    if (ts <= this.lastTimestampMs) {
      ts = this.lastTimestampMs + 1;
    }
    this.lastTimestampMs = ts;

    try {
      const results = this.landmarker.detectForVideo(videoElement, ts);

      if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0]; // First detected hand (21 landmarks)
        const handedness = results.handednesses && results.handednesses.length > 0
          ? results.handednesses[0][0]
          : null;

        // Calculate stable 5-point palm center
        let sumX = 0, sumY = 0, sumZ = 0;
        for (const idx of this.PALM_INDICES) {
          sumX += landmarks[idx].x;
          sumY += landmarks[idx].y;
          sumZ += landmarks[idx].z;
        }
        const count = this.PALM_INDICES.length;
        const rawPalmX = sumX / count;
        const rawPalmY = sumY / count;
        const rawPalmZ = sumZ / count;

        // Mirrored coordinate: In a mirrored webcam preview, moving hand physically left
        // moves to lower mirroredX (0.0 = left edge of screen, 1.0 = right edge)
        const mirroredPalmX = 1.0 - rawPalmX;

        // Compute hand scale (wrist to middle MCP) for distance normalization
        const handScale = Math.hypot(
          landmarks[9].x - landmarks[0].x,
          landmarks[9].y - landmarks[0].y
        );

        this.lastResult = {
          detected: true,
          landmarks, // Raw 21 landmarks
          handedness,
          confidence: handedness ? handedness.score : 0.85,
          palmCenter: {
            x: mirroredPalmX,
            y: rawPalmY,
            z: rawPalmZ,
            rawX: rawPalmX
          },
          handScale: Math.max(0.08, handScale)
        };
        return this.lastResult;
      }

      this.lastResult = {
        detected: false,
        confidence: 0
      };
      return this.lastResult;
    } catch (detectErr) {
      console.warn('[HandTracker] Frame detection exception:', detectErr);
      return this.lastResult || { detected: false, confidence: 0 };
    }
  }

  dispose() {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {}
      this.landmarker = null;
    }
    this.isLoaded = false;
  }
}
