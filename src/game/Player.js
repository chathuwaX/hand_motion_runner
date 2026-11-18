/**
 * Player.js
 * Photorealistic 3D Human Runner Character.
 * Features:
 * - High-quality rigged humanoid 3D model loaded via GLTFLoader with MeshoptDecoder
 * - Realistic human anatomy, face, skin, hair, sportswear, running shoes, and skeletal hierarchy
 * - Skeletal animation system powered by Three.js AnimationMixer:
 *   - Continuous running cycle with leg alternation, arm pumping, and foot contact
 *   - Smooth jumping animation (takeoff compression, airborne tuck, landing absorption)
 *   - Smooth sliding animation (hips dropped, lead leg extended, trail leg tucked, torso leaned back)
 *   - Dynamic lane changing with natural athletic banking and spine twist
 *   - Collision and stumble ragdoll reaction
 * - Animation blending and cross-fading
 * - Automatic model scaling to real-world human proportions (~1.85m) and rail surface alignment
 * - Dynamic collision bounding volumes for upright running, jumping, and sliding
 * - High-fidelity anatomical procedural backup for zero-lag startup and headless test environments
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Lane configuration
    this.LANE_WIDTH = 3.2;
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.targetLane = 0;
    this.laneTransitionSpeed = 14.0; // Interpolation speed

    // Vertical state (Jump)
    this.isJumping = false;
    this.jumpHeight = 3.3;
    this.jumpDuration = 0.72; // seconds
    this.jumpTimer = 0;
    this.baseY = 0;

    // Slide state
    this.isSliding = false;
    this.slideDuration = 0.70; // seconds
    this.slideTimer = 0;

    // Movement & animation state
    this.runAnimTime = 0;
    this.isDead = false;

    // Bounding Box for collisions (Realistic human scale: ~1.85m tall)
    this.box = new THREE.Box3();
    this.normalBoxSize = new THREE.Vector3(1.1, 2.1, 1.0);
    this.slideBoxSize = new THREE.Vector3(1.1, 0.8, 1.5);
    this.currentBoxSize = this.normalBoxSize.clone();

    // 3D Model root group
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);

    // Sub-groups for GLTF character and procedural fallback
    this.gltfRoot = new THREE.Group();
    this.gltfRoot.visible = false;
    this.mesh.add(this.gltfRoot);

    this.proceduralRoot = new THREE.Group();
    this.mesh.add(this.proceduralRoot);

    // AnimationMixer & Actions for GLTF humanoid character
    this.mixer = null;
    this.actions = {};
    this.currentActionName = null;
    this.bones = {};
    this.isGltfLoaded = false;

    // Build anatomical procedural character (active until GLTF finishes loading)
    this.buildProceduralCharacter();

    // Add root to scene
    this.scene.add(this.mesh);

    // Load photorealistic rigged 3D human character
    if (typeof window !== 'undefined') {
      this.loadHumanModel();
    }
  }

  // -------------------------------------------------------------
  // Photorealistic 3D Human Model Loading & Skeletal Retargeting
  // -------------------------------------------------------------
  async loadHumanModel() {
    try {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      // Load Soldier.glb first to extract high-fidelity Mixamo skeletal running animations
      const soldierGLTF = await new Promise((resolve, reject) => {
        loader.load('/models/Soldier.glb', resolve, undefined, reject);
      });

      const origRunClip = soldierGLTF.animations.find(a => a.name === 'Run') || soldierGLTF.animations[1];
      const origWalkClip = soldierGLTF.animations.find(a => a.name === 'Walk') || soldierGLTF.animations[3];
      const origIdleClip = soldierGLTF.animations.find(a => a.name === 'Idle') || soldierGLTF.animations[0];

      // Load the photorealistic civilian human runner model (VALID library)
      let humanGLTF = null;
      try {
        humanGLTF = await new Promise((resolve, reject) => {
          loader.load('/models/runner_human.glb', resolve, undefined, reject);
        });
      } catch (e) {
        console.warn('[Player] runner_human.glb fallback to Soldier character:', e);
        humanGLTF = soldierGLTF;
      }

      const isHumanRig = (humanGLTF !== soldierGLTF);
      const model = humanGLTF.scene;

      // Enable PBR materials, tone mapping, and shadows across all meshes
      model.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          if (obj.material) {
            obj.material.roughness = Math.min(0.85, Math.max(0.2, obj.material.roughness || 0.6));
            obj.material.metalness = Math.min(0.85, obj.material.metalness || 0.1);
            obj.material.needsUpdate = true;
          }
        }
        if (obj.isBone) {
          this.bones[obj.name] = obj;
        }
      });

      // Compute bounding box and normalize scale to exact human height (~1.85m)
      const bbox = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const targetHeight = 1.85;
      const scaleFactor = targetHeight / (size.y || targetHeight);
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Re-align character feet precisely with ground level (y = 0)
      bbox.setFromObject(model);
      model.position.y = -bbox.min.y;

      // Orient character to face direction of travel (-Z)
      model.rotation.y = Math.PI;

      // Add to GLTF root
      this.gltfRoot.add(model);

      // Initialize AnimationMixer on loaded humanoid model
      this.mixer = new THREE.AnimationMixer(model);

      // Retarget Mixamo Run, Walk, and Idle clips
      const retargetClip = (origClip, newName) => {
        if (!origClip) return null;
        const tracks = [];
        origClip.tracks.forEach(t => {
          const newTrack = t.clone();
          if (isHumanRig) {
            newTrack.name = t.name.replace(/^mixamorig:?/, '');
          }
          tracks.push(newTrack);
        });
        return new THREE.AnimationClip(newName, origClip.duration, tracks);
      };

      const runClip = retargetClip(origRunClip, 'Run');
      const walkClip = retargetClip(origWalkClip, 'Walk');
      const idleClip = retargetClip(origIdleClip, 'Idle');

      // Create high-fidelity custom skeletal Jump, Slide, and Crash clips
      const prefix = isHumanRig ? '' : 'mixamorig:';
      const jumpClip = this.createSkeletalJumpClip(prefix);
      const slideClip = this.createSkeletalSlideClip(prefix);
      const crashClip = this.createSkeletalCrashClip(prefix);

      // Register all animation actions in the mixer
      if (runClip) this.actions.Run = this.mixer.clipAction(runClip);
      if (walkClip) this.actions.Walk = this.mixer.clipAction(walkClip);
      if (idleClip) this.actions.Idle = this.mixer.clipAction(idleClip);
      if (jumpClip) this.actions.Jump = this.mixer.clipAction(jumpClip);
      if (slideClip) this.actions.Slide = this.mixer.clipAction(slideClip);
      if (crashClip) this.actions.Crash = this.mixer.clipAction(crashClip);

      // Start default running animation
      if (this.actions.Run) {
        this.actions.Run.play();
        this.currentActionName = 'Run';
      }

      // Switch view from procedural fallback to realistic 3D human
      this.proceduralRoot.visible = false;
      this.gltfRoot.visible = true;
      this.isGltfLoaded = true;

      console.log('[Player] Photorealistic 3D human character successfully loaded and rigged.');
    } catch (err) {
      console.error('[Player] Error loading GLTF human runner:', err);
    }
  }

  createEulerKeyframes(boneName, times, eulers) {
    const quatValues = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (const [x, y, z] of eulers) {
      e.set(x, y, z);
      q.setFromEuler(e);
      quatValues.push(q.x, q.y, q.z, q.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, quatValues);
  }

  createSkeletalJumpClip(prefix) {
    // 0.72s athletic hurdle jump
    return new THREE.AnimationClip('Jump', 0.72, [
      this.createEulerKeyframes(`${prefix}Hips`, [0, 0.15, 0.36, 0.60, 0.72], [
        [0.1, 0, 0], [-0.05, 0, 0], [0.15, 0, 0], [0.05, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftUpLeg`, [0, 0.15, 0.36, 0.60, 0.72], [
        [-0.3, 0, 0], [0.2, 0, 0], [-0.9, 0, 0], [-0.2, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftLeg`, [0, 0.15, 0.36, 0.60, 0.72], [
        [0.6, 0, 0], [0.1, 0, 0], [1.4, 0, 0], [0.3, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}RightUpLeg`, [0, 0.15, 0.36, 0.60, 0.72], [
        [-0.2, 0, 0], [0.3, 0, 0], [-0.7, 0, 0], [-0.3, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}RightLeg`, [0, 0.15, 0.36, 0.60, 0.72], [
        [0.5, 0, 0], [0.1, 0, 0], [1.2, 0, 0], [0.4, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftArm`, [0, 0.15, 0.36, 0.60, 0.72], [
        [0.2, 0, 0.3], [-0.4, 0, 0.4], [-1.2, 0, 0.6], [-0.5, 0, 0.3], [0, 0, 0.1]
      ]),
      this.createEulerKeyframes(`${prefix}RightArm`, [0, 0.15, 0.36, 0.60, 0.72], [
        [0.2, 0, -0.3], [-0.4, 0, -0.4], [-1.2, 0, -0.6], [-0.5, 0, -0.3], [0, 0, -0.1]
      ])
    ]);
  }

  createSkeletalSlideClip(prefix) {
    // 0.70s athletic baseball ground slide
    return new THREE.AnimationClip('Slide', 0.70, [
      this.createEulerKeyframes(`${prefix}Hips`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [-0.75, 0, 0], [-0.75, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}RightUpLeg`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [-1.5, 0, 0], [-1.5, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}RightLeg`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [0.1, 0, 0], [0.1, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftUpLeg`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [-0.4, 0.3, 0], [-0.4, 0.3, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftLeg`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [1.8, 0, 0], [1.8, 0, 0], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftArm`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [0.5, 0, 0.7], [0.5, 0, 0.7], [0, 0, 0]
      ]),
      this.createEulerKeyframes(`${prefix}RightArm`, [0, 0.12, 0.55, 0.70], [
        [0, 0, 0], [0.5, 0, -0.7], [0.5, 0, -0.7], [0, 0, 0]
      ])
    ]);
  }

  createSkeletalCrashClip(prefix) {
    // 1.0s stumble and collision ragdoll collapse
    return new THREE.AnimationClip('Crash', 1.0, [
      this.createEulerKeyframes(`${prefix}Hips`, [0, 0.25, 0.6, 1.0], [
        [0, 0, 0], [-0.4, 0, 0.3], [-1.1, 0, 0.7], [-1.4, 0, 0.8]
      ]),
      this.createEulerKeyframes(`${prefix}Spine`, [0, 0.25, 0.6, 1.0], [
        [0, 0, 0], [-0.3, 0.2, 0], [-0.6, 0.4, 0], [-0.8, 0.5, 0]
      ]),
      this.createEulerKeyframes(`${prefix}LeftUpLeg`, [0, 0.25, 0.6, 1.0], [
        [0, 0, 0], [-0.8, 0, 0.3], [-1.2, 0, 0.5], [-1.4, 0, 0.6]
      ]),
      this.createEulerKeyframes(`${prefix}RightUpLeg`, [0, 0.25, 0.6, 1.0], [
        [0, 0, 0], [0.4, 0, -0.2], [0.8, 0, -0.3], [1.0, 0, -0.4]
      ])
    ]);
  }

  fadeToAction(name, duration = 0.15, loop = THREE.LoopRepeat) {
    if (!this.actions || !this.actions[name]) return;
    if (this.currentActionName === name && this.actions[name].isRunning()) return;

    const prevAction = this.actions[this.currentActionName];
    const nextAction = this.actions[name];

    nextAction.reset();
    nextAction.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    nextAction.clampWhenFinished = (loop === THREE.LoopOnce);
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, duration, true);
    }

    this.currentActionName = name;
  }

  // -------------------------------------------------------------
  // Anatomical Procedural Character (Startup & Headless Tests)
  // -------------------------------------------------------------
  buildProceduralCharacter() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xebaf88, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.85 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.60 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.40 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });

    // Pelvis
    this.pelvisGroup = new THREE.Group();
    this.pelvisGroup.position.y = 1.02;
    this.proceduralRoot.add(this.pelvisGroup);

    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.22, 16), shortsMat);
    pelvisMesh.castShadow = true;
    this.pelvisGroup.add(pelvisMesh);

    // Torso
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.10, 0);
    this.pelvisGroup.add(this.torsoGroup);

    const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.50, 16), jerseyMat);
    chestMesh.position.y = 0.25;
    chestMesh.scale.set(1.15, 1.0, 0.85);
    chestMesh.castShadow = true;
    this.torsoGroup.add(chestMesh);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.65, 0);
    this.torsoGroup.add(this.headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
    headMesh.scale.set(0.9, 1.15, 1.05);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hairMesh.scale.set(0.92, 1.12, 1.08);
    hairMesh.position.y = 0.03;
    this.headGroup.add(hairMesh);

    // Arms
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.31, 0.45, 0);
    this.torsoGroup.add(this.leftShoulder);
    const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 12), skinMat);
    leftArmMesh.position.y = -0.27;
    leftArmMesh.castShadow = true;
    this.leftShoulder.add(leftArmMesh);

    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.31, 0.45, 0);
    this.torsoGroup.add(this.rightShoulder);
    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 12), skinMat);
    rightArmMesh.position.y = -0.27;
    rightArmMesh.castShadow = true;
    this.rightShoulder.add(rightArmMesh);

    // Legs
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.14, -0.10, 0);
    this.pelvisGroup.add(this.leftHip);
    const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.85, 14), skinMat);
    leftLegMesh.position.y = -0.42;
    leftLegMesh.castShadow = true;
    this.leftHip.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.32), shoeMat);
    leftShoe.position.set(0, -0.85, -0.05);
    leftShoe.castShadow = true;
    this.leftHip.add(leftShoe);

    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.14, -0.10, 0);
    this.pelvisGroup.add(this.rightHip);
    const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.85, 14), skinMat);
    rightLegMesh.position.y = -0.42;
    rightLegMesh.castShadow = true;
    this.rightHip.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.32), shoeMat);
    rightShoe.position.set(0, -0.85, -0.05);
    rightShoe.castShadow = true;
    this.rightHip.add(rightShoe);

    // Soft ground shadow projector
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.40,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.02;
    this.scene.add(this.shadowMesh);
  }

  // -------------------------------------------------------------
  // Gameplay State & Actions
  // -------------------------------------------------------------
  reset() {
    this.currentLane = 0;
    this.targetLane = 0;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.isJumping = false;
    this.jumpTimer = 0;
    this.isDead = false;
    this.runAnimTime = 0;
    this.endSlide();
    this.fadeToAction('Run', 0.1, THREE.LoopRepeat);
    this.updateBoundingBox();
  }

  setLane(lane) {
    if (this.isDead) return false;
    const clamped = Math.max(-1, Math.min(1, Math.round(lane)));
    if (this.targetLane !== clamped) {
      this.targetLane = clamped;
      return true;
    }
    return false;
  }

  moveLeft() {
    if (this.isDead) return false;
    if (this.targetLane > -1) {
      this.targetLane -= 1;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.isDead) return false;
    if (this.targetLane < 1) {
      this.targetLane += 1;
      return true;
    }
    return false;
  }

  jump() {
    if (this.isDead || this.isJumping) return false;
    if (this.isSliding) {
      this.endSlide();
    }
    this.isJumping = true;
    this.jumpTimer = 0;
    this.fadeToAction('Jump', 0.08, THREE.LoopOnce);
    return true;
  }

  slide() {
    if (this.isDead) return false;
    if (this.isJumping) {
      this.isJumping = false;
      this.mesh.position.y = 0;
    }
    this.isSliding = true;
    this.slideTimer = 0;
    this.fadeToAction('Slide', 0.08, THREE.LoopOnce);
    return true;
  }

  endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    if (!this.isDead && !this.isJumping) {
      this.fadeToAction('Run', 0.12, THREE.LoopRepeat);
    }
    if (this.pelvisGroup) {
      this.pelvisGroup.position.set(0, 1.02, 0);
      this.pelvisGroup.rotation.set(0, 0, 0);
      this.torsoGroup.rotation.set(0, 0, 0);
      this.leftHip.rotation.set(0, 0, 0);
      this.rightHip.rotation.set(0, 0, 0);
    }
  }

  update(delta, currentSpeed) {
    if (this.isDead) return;

    // 1. Smooth Lateral Lane Interpolation with Natural Body Banking
    const targetX = this.targetLane * this.LANE_WIDTH;
    const diffX = targetX - this.mesh.position.x;
    this.mesh.position.x += diffX * Math.min(1.0, this.laneTransitionSpeed * delta);

    // Realistic athletic banking and weight shift into turns
    const bankAngle = -diffX * 0.14;
    this.mesh.rotation.z = bankAngle;
    this.mesh.rotation.y = -diffX * 0.08;

    // Subtle spine twist if bone exists
    const spine = this.bones.Spine || this.bones['mixamorig:Spine'];
    if (spine) {
      spine.rotation.y = -diffX * 0.06;
    }

    // 2. Vertical Jump Arc (Realistic Parabolic Trajectory)
    if (this.isJumping) {
      this.jumpTimer += delta;
      const progress = this.jumpTimer / this.jumpDuration;

      if (progress >= 1.0) {
        this.isJumping = false;
        this.jumpTimer = 0;
        this.mesh.position.y = 0;
        this.fadeToAction('Run', 0.12, THREE.LoopRepeat);
      } else {
        // Parabolic vertical curve: 4 * h * p * (1 - p)
        this.mesh.position.y = this.jumpHeight * 4.0 * progress * (1.0 - progress);
      }
    } else {
      this.mesh.position.y = 0;
    }

    // 3. Slide Progression
    if (this.isSliding) {
      this.slideTimer += delta;
      if (this.slideTimer >= this.slideDuration) {
        this.endSlide();
      }
    }

    // 4. Update AnimationMixer (GLTF Human Model)
    if (this.mixer) {
      // Scale running stride cadence realistically with current railway velocity
      const playbackRate = (this.currentActionName === 'Run') ? Math.max(0.8, currentSpeed / 12.0) : 1.0;
      this.mixer.update(delta * playbackRate);
    } else {
      // Biomechanical kinematics fallback for procedural mesh
      this.updateProceduralKinematics(delta, currentSpeed);
    }

    // 5. Update Dynamic Soft Shadow
    if (this.shadowMesh) {
      this.shadowMesh.position.x = this.mesh.position.x;
      this.shadowMesh.position.z = this.mesh.position.z;
      const altitude = this.mesh.position.y;
      const shadowScale = Math.max(0.35, 1.0 - altitude * 0.22);
      this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      this.shadowMesh.material.opacity = Math.max(0.10, 0.40 - altitude * 0.12);
    }

    // 6. Update Bounding Box for Precise Collision Detection
    this.updateBoundingBox();
  }

  updateProceduralKinematics(delta, currentSpeed) {
    if (this.isSliding) {
      this.pelvisGroup.position.y = 0.40;
      this.pelvisGroup.rotation.x = -Math.PI / 4;
      this.rightHip.rotation.x = -Math.PI / 2.2;
      this.leftHip.rotation.x = -0.4;
      return;
    }

    if (!this.isJumping) {
      this.runAnimTime += delta * (currentSpeed * 0.70);
      const phase = this.runAnimTime;

      this.leftHip.rotation.x = Math.sin(phase) * 0.75;
      this.rightHip.rotation.x = Math.sin(phase + Math.PI) * 0.75;

      this.leftShoulder.rotation.x = -Math.sin(phase) * 0.70;
      this.rightShoulder.rotation.x = -Math.sin(phase + Math.PI) * 0.70;

      const bobbing = Math.abs(Math.sin(phase)) * 0.09;
      this.pelvisGroup.position.y = 1.02 + bobbing;
      this.torsoGroup.rotation.x = 0.15;
    } else {
      this.pelvisGroup.position.y = 1.02;
      this.torsoGroup.rotation.x = 0.20;
      this.leftHip.rotation.x = -0.55;
      this.rightHip.rotation.x = 0.35;
      this.leftShoulder.rotation.x = -0.95;
      this.rightShoulder.rotation.x = -0.80;
    }
  }

  updateBoundingBox() {
    const center = this.mesh.position.clone();
    if (this.isSliding) {
      // Reduced profile volume for sliding under clearance hazards
      center.y += 0.45;
      this.box.setFromCenterAndSize(center, this.slideBoxSize);
    } else {
      // Full upright human runner volume
      center.y += 1.05;
      this.box.setFromCenterAndSize(center, this.normalBoxSize);
    }
  }

  triggerCrash() {
    this.isDead = true;
    this.fadeToAction('Crash', 0.10, THREE.LoopOnce);

    if (this.pelvisGroup) {
      this.pelvisGroup.rotation.x = 1.1;
      this.pelvisGroup.rotation.z = 0.7;
      this.torsoGroup.rotation.y = 0.5;
    }
    this.mesh.position.y = 0.15;
  }
}
