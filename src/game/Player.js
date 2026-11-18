/**
 * Player.js
 * 3D Animated Runner Character with procedural geometry,
 * smooth lane interpolation, jumping, sliding, and dynamic bounding box collision volume.
 */

import * as THREE from 'three';

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

    // Bounding Box for collisions
    this.box = new THREE.Box3();
    this.normalBoxSize = new THREE.Vector3(1.1, 2.1, 1.0);
    this.slideBoxSize = new THREE.Vector3(1.1, 0.8, 1.5);
    this.currentBoxSize = this.normalBoxSize.clone();

    // 3D Model root group
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);

    // Build procedural stylized runner character
    this.buildCharacter();

    this.scene.add(this.mesh);
  }

  buildCharacter() {
    // Materials
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff, // Bright Cyan hoodie
      roughness: 0.4,
      metalness: 0.1
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1f2430, // Dark navy joggers
      roughness: 0.6
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffcb9a, // Warm skin tone
      roughness: 0.7
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xff0055, // Vibrant magenta backwards cap
      roughness: 0.4
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White sneakers with neon accents
      roughness: 0.3
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.8
    });

    // 1. Torso Group
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 1.05;

    const torsoGeo = new THREE.BoxGeometry(0.72, 0.85, 0.44);
    this.torsoMesh = new THREE.Mesh(torsoGeo, hoodieMat);
    this.torsoMesh.castShadow = true;
    this.torsoGroup.add(this.torsoMesh);

    // 2. Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.65;

    const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Cap
    const capGeo = new THREE.BoxGeometry(0.48, 0.18, 0.48);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = 0.16;
    capMesh.castShadow = true;
    this.headGroup.add(capMesh);

    // Cap brim pointing backward
    const brimGeo = new THREE.BoxGeometry(0.44, 0.05, 0.25);
    const brimMesh = new THREE.Mesh(brimGeo, capMat);
    brimMesh.position.set(0, 0.1, 0.32);
    brimMesh.castShadow = true;
    this.headGroup.add(brimMesh);

    // Stylish sunglasses / visor
    const visorGeo = new THREE.BoxGeometry(0.40, 0.10, 0.08);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.04, -0.22);
    this.headGroup.add(visorMesh);

    this.torsoGroup.add(this.headGroup);

    // 3. Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.48, 0.32, 0);
    const armGeo = new THREE.BoxGeometry(0.2, 0.68, 0.2);
    const leftArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    leftArmMesh.position.y = -0.28;
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);
    this.torsoGroup.add(this.leftArmGroup);

    // 4. Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.48, 0.32, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    rightArmMesh.position.y = -0.28;
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);
    this.torsoGroup.add(this.rightArmGroup);

    this.mesh.add(this.torsoGroup);

    // 5. Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.22, 0.98, 0);
    const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.castShadow = true;
    this.leftLegGroup.add(leftLegMesh);

    // Left Shoe
    const shoeGeo = new THREE.BoxGeometry(0.26, 0.18, 0.42);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.72, -0.06);
    leftShoe.castShadow = true;
    this.leftLegGroup.add(leftShoe);
    this.mesh.add(this.leftLegGroup);

    // 6. Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.22, 0.98, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.castShadow = true;
    this.rightLegGroup.add(rightLegMesh);

    // Right Shoe
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.72, -0.06);
    rightShoe.castShadow = true;
    this.rightLegGroup.add(rightShoe);
    this.mesh.add(this.rightLegGroup);

    // Shadow blob projector underneath player
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.02;
    this.scene.add(this.shadowMesh);
  }

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
    // Cancel slide if jumping
    if (this.isSliding) {
      this.endSlide();
    }
    this.isJumping = true;
    this.jumpTimer = 0;
    return true;
  }

  slide() {
    if (this.isDead) return false;
    // Fast drop to ground if airborne
    if (this.isJumping) {
      this.isJumping = false;
      this.mesh.position.y = 0;
    }
    this.isSliding = true;
    this.slideTimer = 0;
    return true;
  }

  endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.torsoGroup.rotation.set(0, 0, 0);
    this.torsoGroup.position.set(0, 1.05, 0);
    this.leftLegGroup.position.set(-0.22, 0.98, 0);
    this.rightLegGroup.position.set(0.22, 0.98, 0);
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);
  }

  update(delta, currentSpeed) {
    if (this.isDead) return;

    // 1. Smooth Lane Interpolation
    const targetX = this.targetLane * this.LANE_WIDTH;
    const diffX = targetX - this.mesh.position.x;
    this.mesh.position.x += diffX * Math.min(1.0, this.laneTransitionSpeed * delta);

    // Subtle banking/lean tilt based on horizontal velocity
    const bankAngle = -diffX * 0.12;
    this.mesh.rotation.z = bankAngle;
    this.mesh.rotation.y = -diffX * 0.08;

    // 2. Handle Jump
    if (this.isJumping) {
      this.jumpTimer += delta;
      const progress = this.jumpTimer / this.jumpDuration;

      if (progress >= 1.0) {
        this.isJumping = false;
        this.jumpTimer = 0;
        this.mesh.position.y = 0;
      } else {
        // Parabolic vertical curve: 4 * h * p * (1 - p)
        this.mesh.position.y = this.jumpHeight * 4.0 * progress * (1.0 - progress);
      }
    } else {
      this.mesh.position.y = 0;
    }

    // 3. Handle Slide
    if (this.isSliding) {
      this.slideTimer += delta;
      if (this.slideTimer >= this.slideDuration) {
        this.endSlide();
      } else {
        // Drop torso low and lean backward
        this.torsoGroup.position.y = 0.5;
        this.torsoGroup.position.z = 0.3;
        this.torsoGroup.rotation.x = -Math.PI / 3; // Leaned back

        // Legs extended straight forward
        this.leftLegGroup.position.y = 0.35;
        this.rightLegGroup.position.y = 0.35;
        this.leftLegGroup.rotation.x = -Math.PI / 2.3;
        this.rightLegGroup.rotation.x = -Math.PI / 2.3;

        // Arms thrown out for balance
        this.leftArmGroup.rotation.x = 0.4;
        this.rightArmGroup.rotation.x = 0.4;
      }
    }

    // 4. Procedural Running Animation (when neither jumping nor sliding)
    if (!this.isJumping && !this.isSliding) {
      this.runAnimTime += delta * (currentSpeed * 0.65);
      const swing = Math.sin(this.runAnimTime);

      // Legs swing forward and backward
      this.leftLegGroup.rotation.x = swing * 0.75;
      this.rightLegGroup.rotation.x = -swing * 0.75;

      // Arms swing opposite to legs
      this.leftArmGroup.rotation.x = -swing * 0.75;
      this.rightArmGroup.rotation.x = swing * 0.75;

      // Subtle vertical bobbing
      const bob = Math.abs(Math.sin(this.runAnimTime * 2)) * 0.12;
      this.torsoGroup.position.y = 1.05 + bob;
      this.headGroup.position.y = 0.65 + bob * 0.5;
    } else if (this.isJumping) {
      // Airborne pose: arms raised slightly, knees bent
      this.leftLegGroup.rotation.x = 0.3;
      this.rightLegGroup.rotation.x = -0.2;
      this.leftArmGroup.rotation.x = -0.8;
      this.rightArmGroup.rotation.x = -0.8;
      this.torsoGroup.position.y = 1.05;
    }

    // 5. Update Shadow
    if (this.shadowMesh) {
      this.shadowMesh.position.x = this.mesh.position.x;
      this.shadowMesh.position.z = this.mesh.position.z;
      // Shrink and fade shadow when high up
      const altitude = this.mesh.position.y;
      const shadowScale = Math.max(0.3, 1.0 - altitude * 0.2);
      this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      this.shadowMesh.material.opacity = Math.max(0.12, 0.45 - altitude * 0.1);
    }

    // 6. Update Bounding Box for Collision
    this.updateBoundingBox();
  }

  updateBoundingBox() {
    const center = this.mesh.position.clone();
    if (this.isSliding) {
      // Reduced vertical profile for sliding under obstacles
      center.y += 0.45;
      this.box.setFromCenterAndSize(center, this.slideBoxSize);
    } else {
      center.y += 1.05;
      this.box.setFromCenterAndSize(center, this.normalBoxSize);
    }
  }

  triggerCrash() {
    this.isDead = true;
    // Dramatic crash ragdoll tilt
    this.torsoGroup.rotation.x = 0.9;
    this.torsoGroup.rotation.z = 0.6;
    this.mesh.position.y = 0.2;
  }
}
