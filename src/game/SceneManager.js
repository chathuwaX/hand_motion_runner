/**
 * SceneManager.js
 * Manages Three.js scene, camera, lighting, renderer, and viewport resizing.
 * Designed for dynamic split-screen layouts:
 * - Adapts dynamically to container clientWidth / clientHeight with ResizeObserver
 * - Dynamic 3rd person runner camera with smooth lateral and vertical tracking
 * - Vibrant sunny daylight lighting with soft shadows
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

    this.resizeObserver = null;

    this.init();
  }

  init() {
    // 1. Scene: Bright sunny daytime blue sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x76b8ed);
    // Soft sunny atmospheric horizon haze
    this.scene.fog = new THREE.Fog(0x99ccf5, 75, 340);

    // 2. Camera: Sized to container dimensions
    const width = (this.container && this.container.clientWidth) ? this.container.clientWidth : window.innerWidth;
    const height = (this.container && this.container.clientHeight) ? this.container.clientHeight : window.innerHeight;
    const aspect = width / height;

    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 500);
    this.camera.position.set(0, 3.8, 6.4);
    this.camera.lookAt(0, 1.65, -18.0);

    // 3. Renderer with high performance & PBR tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting setup
    this.setupLighting();

    // 5. Container ResizeObserver & Window resize handling
    window.addEventListener('resize', () => this.onWindowResize());
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
      this.resizeObserver.observe(this.container);
    }
  }

  setupLighting() {
    // Hemisphere light for natural sunny sky & warm bounce
    this.hemiLight = new THREE.HemisphereLight(0x8bc9ff, 0xfff3e0, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Ambient light - high enough to prevent dark unidentifiable obstacles
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    // Key Directional Sun with clean shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaea, 1.35);
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
    this.dirLight.shadow.bias = -0.0004;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  updateCamera(delta, playerPos, currentSpeed) {
    if (!this.camera || !playerPos) return;

    // Smooth lateral tracking
    const targetCamX = playerPos.x * 0.45;
    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, 7.5 * delta);

    // Smooth vertical cushioning
    const targetCamY = 3.8 + playerPos.y * 0.32;
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, 6.0 * delta);

    // Look-ahead target towards incoming trains
    const lookX = playerPos.x * 0.20;
    const lookY = 1.65 + playerPos.y * 0.25;
    const lookZ = -18.0;
    this.camera.lookAt(lookX, lookY, lookZ);

    if (this.dirLight && this.dirLight.target) {
      this.dirLight.position.x = 25 + playerPos.x * 0.4;
      this.dirLight.target.position.set(playerPos.x, 0, -10);
    }
  }

  resetCamera() {
    if (!this.camera) return;
    this.camera.position.set(0, 3.8, 6.4);
    this.camera.lookAt(0, 1.65, -18.0);
    this.onWindowResize();
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    const width = (this.container && this.container.clientWidth) ? this.container.clientWidth : window.innerWidth;
    const height = (this.container && this.container.clientHeight) ? this.container.clientHeight : window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
