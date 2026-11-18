/**
 * Player.js
 * Realistic, Natural Human Runner Character with authentic human proportions,
 * articulated joints (hips, knees, ankles, shoulders, elbows, wrists, neck),
 * natural biomechanical running gait (knee flexion, arm pumping, pelvic sway, torso counter-rotation),
 * athletic apparel, running sneakers, and dynamic collision bounding volumes.
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

    // Bounding Box for collisions (Human proportions: ~1.85m tall)
    this.box = new THREE.Box3();
    this.normalBoxSize = new THREE.Vector3(1.1, 2.1, 1.0);
    this.slideBoxSize = new THREE.Vector3(1.1, 0.8, 1.5);
    this.currentBoxSize = this.normalBoxSize.clone();

    // 3D Model root group
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);

    // Build anatomical natural human runner character
    this.buildCharacter();

    this.scene.add(this.mesh);
  }

  buildCharacter() {
    // -------------------------------------------------------------
    // Natural Materials with realistic PBR properties
    // -------------------------------------------------------------
    // Skin: Warm, natural human skin tone with soft micro-roughness
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xebaf88,
      roughness: 0.65,
      metalness: 0.05
    });

    // Dark styled natural hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x241812,
      roughness: 0.85,
      metalness: 0.05
    });

    // Athletic technical running singlet / top (Vibrant electric cobalt with breathable weave)
    const jerseyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vivid athletic cyan-blue
      roughness: 0.45,
      metalness: 0.1
    });

    // Jersey trim & reflective accents
    const jerseyTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.3
    });

    // Athletic compression running shorts (Dark charcoal slate)
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.05
    });

    // Running sneaker mesh upper (High-contrast bright crimson / coral)
    const shoeUpperMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.4
    });

    // Sneaker thick foam midsole (Clean cushioned white)
    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05
    });

    // Rubber sneaker outsole tread
    const shoeTreadMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8
    });

    // Aerodynamic sports wrap sunglasses (Sleek mirrored iridium)
    const sunglassFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8
    });
    const sunglassLensMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan iridescent mirrored sheen
      roughness: 0.05,
      metalness: 0.95
    });

    // -------------------------------------------------------------
    // Pelvis & Root Hierarchy
    // -------------------------------------------------------------
    // The pelvis acts as the biomechanical root of human gait
    this.pelvisGroup = new THREE.Group();
    this.pelvisGroup.position.y = 1.02; // Hip center at ~1.02m height
    this.mesh.add(this.pelvisGroup);

    // Pelvis mesh (running shorts waist & hips)
    const pelvisGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.22, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
    pelvisMesh.position.y = 0;
    pelvisMesh.castShadow = true;
    this.pelvisGroup.add(pelvisMesh);

    // Shorts leg cuffs
    const cuffGeo = new THREE.CylinderGeometry(0.125, 0.12, 0.12, 16);
    const leftCuff = new THREE.Mesh(cuffGeo, shortsMat);
    leftCuff.position.set(-0.13, -0.12, 0);
    this.pelvisGroup.add(leftCuff);

    const rightCuff = new THREE.Mesh(cuffGeo, shortsMat);
    rightCuff.position.set(0.13, -0.12, 0);
    this.pelvisGroup.add(rightCuff);

    // -------------------------------------------------------------
    // Torso (Spine, Ribcage & Shoulders)
    // -------------------------------------------------------------
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.10, 0);
    this.pelvisGroup.add(this.torsoGroup);

    // Abdomen / Midsection (tapered waist)
    const waistGeo = new THREE.CylinderGeometry(0.23, 0.21, 0.24, 16);
    const waistMesh = new THREE.Mesh(waistGeo, jerseyMat);
    waistMesh.position.y = 0.12;
    waistMesh.castShadow = true;
    this.torsoGroup.add(waistMesh);

    // Chest & Ribcage (athletic V-taper broadening at shoulders)
    const chestGeo = new THREE.CylinderGeometry(0.27, 0.23, 0.32, 16);
    const chestMesh = new THREE.Mesh(chestGeo, jerseyMat);
    chestMesh.position.y = 0.38;
    chestMesh.scale.set(1.15, 1.0, 0.85); // Flatten slightly in depth for realistic human ribcage
    chestMesh.castShadow = true;
    this.torsoGroup.add(chestMesh);

    // Reflective athletic racing stripes across jersey
    const stripeGeo = new THREE.BoxGeometry(0.48, 0.04, 0.38);
    const stripeMesh = new THREE.Mesh(stripeGeo, jerseyTrimMat);
    stripeMesh.position.set(0, 0.42, 0);
    this.torsoGroup.add(stripeMesh);

    // Runner race bib number on chest
    const bibGeo = new THREE.PlaneGeometry(0.24, 0.18);
    const bibMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3
    });
    const bibMesh = new THREE.Mesh(bibGeo, bibMat);
    bibMesh.position.set(0, 0.36, -0.19);
    bibMesh.rotation.y = Math.PI; // Facing forward (-Z in runner view)
    this.torsoGroup.add(bibMesh);

    // -------------------------------------------------------------
    // Neck & Head
    // -------------------------------------------------------------
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0.54, 0);
    this.torsoGroup.add(this.neckGroup);

    // Neck cylinder
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.14, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.07;
    neckMesh.castShadow = true;
    this.neckGroup.add(neckMesh);

    // Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.16, 0);
    this.neckGroup.add(this.headGroup);

    // Anatomical head (rounded cranium tapering to jaw)
    const headGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.scale.set(0.9, 1.15, 1.05); // Realistic human facial proportions
    headMesh.position.y = 0.14;
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Styled athletic cropped hair (crown and sides)
    const hairCrownGeo = new THREE.SphereGeometry(0.195, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const hairCrownMesh = new THREE.Mesh(hairCrownGeo, hairMat);
    hairCrownMesh.scale.set(0.92, 1.12, 1.08);
    hairCrownMesh.position.y = 0.17;
    hairCrownMesh.castShadow = true;
    this.headGroup.add(hairCrownMesh);

    // Athletic runner headband
    const bandGeo = new THREE.TorusGeometry(0.18, 0.025, 12, 24);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.rotation.x = Math.PI / 2;
    bandMesh.scale.set(0.92, 1.05, 1.0);
    bandMesh.position.y = 0.21;
    this.headGroup.add(bandMesh);

    // Wrap-around sports sunglasses
    const sunglassFrameGeo = new THREE.BoxGeometry(0.32, 0.05, 0.14);
    const sunglassFrame = new THREE.Mesh(sunglassFrameGeo, sunglassFrameMat);
    sunglassFrame.position.set(0, 0.17, -0.14);
    this.headGroup.add(sunglassFrame);

    const sunglassLensGeo = new THREE.BoxGeometry(0.30, 0.045, 0.02);
    const sunglassLens = new THREE.Mesh(sunglassLensGeo, sunglassLensMat);
    sunglassLens.position.set(0, 0.17, -0.21);
    this.headGroup.add(sunglassLens);

    // -------------------------------------------------------------
    // Articulated Upper Limbs (Shoulder -> Bicep -> Elbow -> Forearm -> Hand)
    // -------------------------------------------------------------
    const armRadius = 0.062;
    const forearmRadius = 0.055;
    const upperArmLength = 0.32;
    const forearmLength = 0.30;

    // Build Left Arm Hierarchy
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.31, 0.48, 0);
    this.torsoGroup.add(this.leftShoulder);

    // Shoulder cap joint
    const shoulderCapGeo = new THREE.SphereGeometry(armRadius * 1.15, 14, 14);
    const leftShoulderCap = new THREE.Mesh(shoulderCapGeo, jerseyMat);
    this.leftShoulder.add(leftShoulderCap);

    // Left Upper Arm (Bicep/Tricep)
    const upperArmGeo = new THREE.CylinderGeometry(armRadius * 0.9, armRadius, upperArmLength, 14);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
    leftUpperArm.position.y = -upperArmLength / 2;
    leftUpperArm.castShadow = true;
    this.leftShoulder.add(leftUpperArm);

    // Left Elbow Joint (Child of shoulder, placed at bottom of upper arm)
    this.leftElbow = new THREE.Group();
    this.leftElbow.position.y = -upperArmLength;
    this.leftShoulder.add(this.leftElbow);

    const elbowJointGeo = new THREE.SphereGeometry(forearmRadius * 1.05, 12, 12);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeo, skinMat);
    this.leftElbow.add(leftElbowJoint);

    // Left Forearm
    const forearmGeo = new THREE.CylinderGeometry(forearmRadius, forearmRadius * 0.85, forearmLength, 14);
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.position.y = -forearmLength / 2;
    leftForearm.castShadow = true;
    this.leftElbow.add(leftForearm);

    // Left Hand (Curled athletic runner fist)
    const fistGeo = new THREE.SphereGeometry(0.065, 14, 14);
    const leftFist = new THREE.Mesh(fistGeo, skinMat);
    leftFist.scale.set(0.85, 1.15, 1.25);
    leftFist.position.set(0, -forearmLength - 0.04, 0);
    leftFist.castShadow = true;
    this.leftElbow.add(leftFist);

    // Build Right Arm Hierarchy
    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.31, 0.48, 0);
    this.torsoGroup.add(this.rightShoulder);

    const rightShoulderCap = new THREE.Mesh(shoulderCapGeo, jerseyMat);
    this.rightShoulder.add(rightShoulderCap);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
    rightUpperArm.position.y = -upperArmLength / 2;
    rightUpperArm.castShadow = true;
    this.rightShoulder.add(rightUpperArm);

    this.rightElbow = new THREE.Group();
    this.rightElbow.position.y = -upperArmLength;
    this.rightShoulder.add(this.rightElbow);

    const rightElbowJoint = new THREE.Mesh(elbowJointGeo, skinMat);
    this.rightElbow.add(rightElbowJoint);

    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.position.y = -forearmLength / 2;
    rightForearm.castShadow = true;
    this.rightElbow.add(rightForearm);

    const rightFist = new THREE.Mesh(fistGeo, skinMat);
    rightFist.scale.set(0.85, 1.15, 1.25);
    rightFist.position.set(0, -forearmLength - 0.04, 0);
    rightFist.castShadow = true;
    this.rightElbow.add(rightFist);

    // Set natural runner default elbow bend (~85° forward flexion)
    this.leftElbow.rotation.x = 1.45;
    this.rightElbow.rotation.x = 1.45;
    // Slight inward forearm cant
    this.leftElbow.rotation.z = -0.18;
    this.rightElbow.rotation.z = 0.18;

    // -------------------------------------------------------------
    // Articulated Lower Limbs (Hip -> Thigh -> Knee -> Calf/Shin -> Ankle -> Sneaker)
    // -------------------------------------------------------------
    const thighRadiusTop = 0.12;
    const thighRadiusBottom = 0.095;
    const thighLength = 0.46;
    const shinRadiusTop = 0.09;
    const shinRadiusBottom = 0.07;
    const shinLength = 0.46;

    // Left Leg
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.14, -0.10, 0);
    this.pelvisGroup.add(this.leftHip);

    // Left Thigh (Quadricep / Hamstring)
    const thighGeo = new THREE.CylinderGeometry(thighRadiusTop, thighRadiusBottom, thighLength, 16);
    const leftThigh = new THREE.Mesh(thighGeo, skinMat);
    leftThigh.position.y = -thighLength / 2;
    leftThigh.castShadow = true;
    this.leftHip.add(leftThigh);

    // Left Knee Joint (Child of Hip)
    this.leftKnee = new THREE.Group();
    this.leftKnee.position.y = -thighLength;
    this.leftHip.add(this.leftKnee);

    const kneeJointGeo = new THREE.SphereGeometry(shinRadiusTop * 1.05, 14, 14);
    const leftKneeJoint = new THREE.Mesh(kneeJointGeo, skinMat);
    this.leftKnee.add(leftKneeJoint);

    // Left Shin & Calf (Gastrocnemius contour)
    const shinGeo = new THREE.CylinderGeometry(shinRadiusTop, shinRadiusBottom, shinLength, 16);
    const leftShin = new THREE.Mesh(shinGeo, skinMat);
    leftShin.position.y = -shinLength / 2;
    leftShin.castShadow = true;
    this.leftKnee.add(leftShin);

    // Left Ankle & Sneaker Foot
    this.leftFoot = new THREE.Group();
    this.leftFoot.position.set(0, -shinLength, 0);
    this.leftKnee.add(this.leftFoot);
    this.leftFoot.add(this.createRunningSneaker(shoeUpperMat, shoeSoleMat, shoeTreadMat));

    // Right Leg
    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.14, -0.10, 0);
    this.pelvisGroup.add(this.rightHip);

    const rightThigh = new THREE.Mesh(thighGeo, skinMat);
    rightThigh.position.y = -thighLength / 2;
    rightThigh.castShadow = true;
    this.rightHip.add(rightThigh);

    this.rightKnee = new THREE.Group();
    this.rightKnee.position.y = -thighLength;
    this.rightHip.add(this.rightKnee);

    const rightKneeJoint = new THREE.Mesh(kneeJointGeo, skinMat);
    this.rightKnee.add(rightKneeJoint);

    const rightShin = new THREE.Mesh(shinGeo, skinMat);
    rightShin.position.y = -shinLength / 2;
    rightShin.castShadow = true;
    this.rightKnee.add(rightShin);

    this.rightFoot = new THREE.Group();
    this.rightFoot.position.set(0, -shinLength, 0);
    this.rightKnee.add(this.rightFoot);
    this.rightFoot.add(this.createRunningSneaker(shoeUpperMat, shoeSoleMat, shoeTreadMat));

    // -------------------------------------------------------------
    // Ground Shadow Blob Projector
    // -------------------------------------------------------------
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

  createRunningSneaker(upperMat, soleMat, treadMat) {
    const sneakerGroup = new THREE.Group();

    // 1. Thick Cushioned Midsole (flared runner heel rocker)
    const soleGeo = new THREE.BoxGeometry(0.17, 0.08, 0.36);
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(0, 0.04, -0.05);
    soleMesh.castShadow = true;
    sneakerGroup.add(soleMesh);

    // 2. Beveled toe rocker wedge
    const toeGeo = new THREE.CylinderGeometry(0.08, 0.085, 0.16, 12, 1, false, 0, Math.PI);
    const toeMesh = new THREE.Mesh(toeGeo, soleMat);
    toeMesh.rotation.z = Math.PI / 2;
    toeMesh.rotation.y = -Math.PI / 2;
    toeMesh.position.set(0, 0.05, -0.22);
    sneakerGroup.add(toeMesh);

    // 3. Sneaker Upper (aerodynamic mesh)
    const upperGeo = new THREE.BoxGeometry(0.155, 0.11, 0.31);
    const upperMesh = new THREE.Mesh(upperGeo, upperMat);
    upperMesh.position.set(0, 0.11, -0.05);
    upperMesh.castShadow = true;
    sneakerGroup.add(upperMesh);

    // 4. Outsole Dark Traction Tread
    const treadGeo = new THREE.BoxGeometry(0.175, 0.02, 0.37);
    const treadMesh = new THREE.Mesh(treadGeo, treadMat);
    treadMesh.position.set(0, 0.01, -0.05);
    sneakerGroup.add(treadMesh);

    return sneakerGroup;
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
    this.pelvisGroup.position.set(0, 1.02, 0);
    this.pelvisGroup.rotation.set(0, 0, 0);
    this.torsoGroup.position.set(0, 0.10, 0);
    this.torsoGroup.rotation.set(0, 0, 0);
    this.leftHip.rotation.set(0, 0, 0);
    this.rightHip.rotation.set(0, 0, 0);
    this.leftKnee.rotation.set(0, 0, 0);
    this.rightKnee.rotation.set(0, 0, 0);
    this.leftShoulder.rotation.set(0, 0, 0);
    this.rightShoulder.rotation.set(0, 0, 0);
    this.leftElbow.rotation.set(1.45, 0, -0.18);
    this.rightElbow.rotation.set(1.45, 0, 0.18);
  }

  update(delta, currentSpeed) {
    if (this.isDead) return;

    // 1. Smooth Lane Interpolation
    const targetX = this.targetLane * this.LANE_WIDTH;
    const diffX = targetX - this.mesh.position.x;
    this.mesh.position.x += diffX * Math.min(1.0, this.laneTransitionSpeed * delta);

    // Natural athletic banking and lateral lean into lane transitions
    const bankAngle = -diffX * 0.14;
    this.mesh.rotation.z = bankAngle;
    this.mesh.rotation.y = -diffX * 0.08;

    // 2. Handle Jump with realistic parabolic arc and airborne kinetics
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

    // 3. Handle Slide (Authentic athletic baseball slide)
    if (this.isSliding) {
      this.slideTimer += delta;
      if (this.slideTimer >= this.slideDuration) {
        this.endSlide();
      } else {
        // Drop pelvis low to track surface and lean torso back
        this.pelvisGroup.position.y = 0.40;
        this.pelvisGroup.rotation.x = -Math.PI / 4; // ~45 deg backward slide lean

        // Lead leg (right leg) extended straight forward skimming the track
        this.rightHip.rotation.x = -Math.PI / 2.2;
        this.rightKnee.rotation.x = 0.05;

        // Trail leg (left leg) tucked neatly under hip
        this.leftHip.rotation.x = -0.4;
        this.leftKnee.rotation.x = 1.6;

        // Arms thrown out for balance during slide
        this.leftShoulder.rotation.x = 0.4;
        this.rightShoulder.rotation.x = 0.4;
        this.leftElbow.rotation.x = 0.8;
        this.rightElbow.rotation.x = 0.8;
      }
    }

    // 4. Natural Biomechanical Running Kinematics (when running on ground)
    if (!this.isJumping && !this.isSliding) {
      // Running cadence scales realistically with current track speed
      this.runAnimTime += delta * (currentSpeed * 0.70);
      const phase = this.runAnimTime;

      // Leg swing cycles (opposite phases: Left = phase, Right = phase + PI)
      const legSwingAmplitude = 0.75;
      const leftHipAngle = Math.sin(phase) * legSwingAmplitude;
      const rightHipAngle = Math.sin(phase + Math.PI) * legSwingAmplitude;

      this.leftHip.rotation.x = leftHipAngle;
      this.rightHip.rotation.x = rightHipAngle;

      // Real Human Knee Flexion:
      // When the thigh swings backward into recovery/swing phase, the knee bends sharply
      // backwards (up to 75 deg / 1.3 rad) to pull the heel under the glutes, then extends forward!
      const leftKneeBend = Math.max(0, -Math.sin(phase)) * 1.30 + 0.12;
      const rightKneeBend = Math.max(0, -Math.sin(phase + Math.PI)) * 1.30 + 0.12;

      this.leftKnee.rotation.x = leftKneeBend;
      this.rightKnee.rotation.x = rightKneeBend;

      // Ankle plantar/dorsiflexion for foot-strike realism
      this.leftFoot.rotation.x = -Math.sin(phase) * 0.25;
      this.rightFoot.rotation.x = -Math.sin(phase + Math.PI) * 0.25;

      // Dynamic Arm Swing: Arms pump from the shoulder opposite to the legs
      const armSwingAmplitude = 0.70;
      this.leftShoulder.rotation.x = -Math.sin(phase) * armSwingAmplitude;
      this.rightShoulder.rotation.x = -Math.sin(phase + Math.PI) * armSwingAmplitude;

      // Natural variable elbow flexion during arm drive (tightens slightly at peak forward drive)
      this.leftElbow.rotation.x = 1.45 + Math.sin(phase) * 0.25;
      this.rightElbow.rotation.x = 1.45 + Math.sin(phase + Math.PI) * 0.25;

      // Pelvis & Spine Dynamics:
      // 1. Pelvis yaw rotation twisting slightly with hip drive
      this.pelvisGroup.rotation.y = Math.sin(phase) * 0.08;

      // 2. Torso counter-rotates to balance the pelvis yaw
      this.torsoGroup.rotation.y = -Math.sin(phase) * 0.06;

      // 3. Athletic forward sprint lean (~8.5 degrees)
      this.torsoGroup.rotation.x = 0.15;

      // 4. Natural double-bounce vertical bobbing (crests at mid-support, dips at contact)
      const bobbing = Math.abs(Math.sin(phase)) * 0.09;
      this.pelvisGroup.position.y = 1.02 + bobbing;

      // 5. Subtle head stability (compensates slightly for torso bob)
      this.headGroup.rotation.x = -0.08 - bobbing * 0.5;

    } else if (this.isJumping) {
      // Airborne athletic hurdle/jump pose:
      // Knees tucked forward, arms raised outward for aerodynamic balance
      this.pelvisGroup.position.y = 1.02;
      this.torsoGroup.rotation.x = 0.20;
      this.leftHip.rotation.x = -0.55;
      this.rightHip.rotation.x = 0.35;
      this.leftKnee.rotation.x = 0.85;
      this.rightKnee.rotation.x = 1.10;

      this.leftShoulder.rotation.x = -0.95;
      this.rightShoulder.rotation.x = -0.80;
      this.leftElbow.rotation.x = 0.90;
      this.rightElbow.rotation.x = 0.90;
    }

    // 5. Update Dynamic Soft Shadow
    if (this.shadowMesh) {
      this.shadowMesh.position.x = this.mesh.position.x;
      this.shadowMesh.position.z = this.mesh.position.z;
      // Shrink and soften shadow with altitude
      const altitude = this.mesh.position.y;
      const shadowScale = Math.max(0.35, 1.0 - altitude * 0.22);
      this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      this.shadowMesh.material.opacity = Math.max(0.10, 0.40 - altitude * 0.12);
    }

    // 6. Update Bounding Box for Precise Collision Detection
    this.updateBoundingBox();
  }

  updateBoundingBox() {
    const center = this.mesh.position.clone();
    if (this.isSliding) {
      // Low profile volume for sliding safely under overhead hazard beams
      center.y += 0.45;
      this.box.setFromCenterAndSize(center, this.slideBoxSize);
    } else {
      // Full upright human runner bounding volume
      center.y += 1.05;
      this.box.setFromCenterAndSize(center, this.normalBoxSize);
    }
  }

  triggerCrash() {
    this.isDead = true;
    // Dramatic ragdoll tumble on collision
    this.pelvisGroup.rotation.x = 1.1;
    this.pelvisGroup.rotation.z = 0.7;
    this.torsoGroup.rotation.y = 0.5;
    this.leftHip.rotation.x = -0.9;
    this.rightHip.rotation.x = 0.8;
    this.mesh.position.y = 0.15;
  }
}
