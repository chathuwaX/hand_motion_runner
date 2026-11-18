/**
 * SceneManager.js
 * Manages Three.js scene, dynamic third-person camera, lighting, renderer, and viewport resizing.
 * Features:
 * - Dynamic 3rd person runner camera with smooth lateral tracking, vertical dampening, and velocity FOV
 * - Realistic sunny daytime lighting with soft directional shadows, sky hemisphere bounce, and fill
 * - ACES Filmic Tone Mapping with balanced exposure for photorealistic PBR rendering
 * - Atmospheric aerial horizon perspective fog
 */

import * as THREE from 'three';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Lighting
    this.dirLight = null;
    this.hemiLight = null;
    this.ambientLight = null;

    // Dynamic Camera State
    this.baseFov = 62.0;
    this.targetFov = 62.0;

    this.init();
  }

  init() {
    // 1. Scene: Bright sunny daytime blue sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x76b8ed);
    // Soft sunny atmospheric horizon haze
    this.scene.fog = new THREE.Fog(0x9bcaf5, 75, 360);

    // 2. Camera: Wide cinematic runner perspective
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 500);
    this.camera.position.set(0, 3.8, 6.4);
    this.camera.lookAt(0, 1.65, -18.0);

    // 3. Renderer with high performance & PBR tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Window resize handling
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Hemisphere light for natural sunny sky & warm ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x8bc9ff, 0xfff3e0, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Ambient light - ensures crystal clear visibility across all obstacles & player details
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.60);
    this.scene.add(this.ambientLight);

    // Key Directional Sun with clean high-res soft shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaea, 1.40);
    this.dirLight.position.set(25, 45, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 160;
    this.dirLight.shadow.camera.left = -25;
    this.dirLight.shadow.camera.right = 25;
    this.dirLight.shadow.camera.top = 35;
    this.dirLight.shadow.camera.bottom = -15;
    this.dirLight.shadow.bias = -0.0003;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  updateCamera(delta, playerPos, currentSpeed) {
    if (!this.camera || !playerPos) return;

    // 1. Dynamic Smooth Lateral Camera Tracking
    const targetCamX = playerPos.x * 0.45;
    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, 7.5 * delta);

    // 2. Vertical Camera Cushioning for Jumps and Slides
    const targetCamY = 3.8 + playerPos.y * 0.32;
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, 6.0 * delta);

    // 3. Look-Ahead Point Extending Far Down Railway Towards Approaching Trains
    const lookX = playerPos.x * 0.20;
    const lookY = 1.65 + playerPos.y * 0.25;
    const lookZ = -18.0;
    this.camera.lookAt(lookX, lookY, lookZ);

    // 4. Dynamic Velocity FOV Expansion (Subtle exhilarating sense of speed)
    const speedRatio = Math.max(0, (currentSpeed - 12.0) / 12.0);
    this.targetFov = this.baseFov + Math.min(6.0, speedRatio * 5.0);
    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov += (this.targetFov - this.camera.fov) * Math.min(1.0, 3.5 * delta);
      this.camera.updateProjectionMatrix();
    }

    // 5. Keep Sun Shadow Frustum Centered on Active Player Section
    if (this.dirLight && this.dirLight.target) {
      this.dirLight.position.x = 25 + playerPos.x * 0.4;
      this.dirLight.target.position.set(playerPos.x, 0, -10);
    }
  }

  resetCamera() {
    if (!this.camera) return;
    this.camera.position.set(0, 3.8, 6.4);
    this.camera.lookAt(0, 1.65, -18.0);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
