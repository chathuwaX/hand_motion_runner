/**
 * SceneManager.js
 * Manages Three.js scene, camera, lighting, renderer, and viewport resizing.
 * Vibrant Daytime Sunny Light Theme for maximum obstacle & player contrast.
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

    this.init();
  }

  init() {
    // 1. Scene: Bright sunny daytime blue sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x76b8ed);
    // Soft sunny atmospheric horizon haze
    this.scene.fog = new THREE.Fog(0x99ccf5, 75, 340);

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 500);
    // Position camera in 3rd person runner view
    this.camera.position.set(0, 4.2, 7.0);
    this.camera.lookAt(0, 1.6, -10.0);

    // 3. Renderer
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
