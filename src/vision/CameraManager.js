/**
 * CameraManager.js
 * Manages webcam access, active video element attachment,
 * stream constraints, device selection, and lifecycle cleanup.
 */

export class CameraManager {
  constructor() {
    this.stream = null;
    this.activeVideo = null;
    this.selectedDeviceId = null;
    this.isStreaming = false;
    this.availableCameras = [];

    this.onReadyCallback = null;
    this.onErrorCallback = null;
  }

  async getAvailableCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));
      return this.availableCameras;
    } catch (err) {
      console.warn('[CameraManager] Could not enumerate devices:', err);
      return [];
    }
  }

  async startCamera(targetVideoElement = null, preferredDeviceId = null) {
    if (preferredDeviceId) {
      this.selectedDeviceId = preferredDeviceId;
    }

    // Stop existing stream if active
    this.stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Webcam API (getUserMedia) not supported in this browser.');
      if (this.onErrorCallback) this.onErrorCallback(err);
      throw err;
    }

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    };

    if (this.selectedDeviceId) {
      constraints.video.deviceId = { exact: this.selectedDeviceId };
    } else {
      constraints.video.facingMode = 'user';
    }

    try {
      console.log('[CameraManager] Requesting webcam permission...');
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isStreaming = true;

      if (targetVideoElement) {
        await this.attachVideo(targetVideoElement);
      }

      console.log('[CameraManager] Webcam stream active.');
      await this.getAvailableCameras();

      if (this.onReadyCallback) {
        this.onReadyCallback(this.activeVideo);
      }

      return this.activeVideo;
    } catch (err) {
      this.isStreaming = false;
      console.error('[CameraManager] Camera initialization error:', err);
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
      throw err;
    }
  }

  async attachVideo(videoElement) {
    if (!videoElement) return null;
    this.activeVideo = videoElement;

    if (this.stream) {
      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.muted = true;
      try {
        await videoElement.play();
      } catch (e) {
        console.warn('[CameraManager] Video play deferred:', e);
      }
    }

    return videoElement;
  }

  getActiveVideo() {
    return this.activeVideo;
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.activeVideo) {
      this.activeVideo.srcObject = null;
      this.activeVideo = null;
    }
    this.isStreaming = false;
    console.log('[CameraManager] Camera stopped.');
  }
}
