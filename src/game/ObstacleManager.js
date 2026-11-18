/**
 * ObstacleManager.js
 * Generates and pools dynamic obstacles (Modern Subway Trains, Railway Track Barriers,
 * Overhead Hazard Clearances, Concrete Track Buffers).
 * Ensures fair obstacle layout algorithms and maintains bounding volumes for collision detection.
 */

import * as THREE from 'three';

export const ObstacleType = Object.freeze({
  TRAIN: 'TRAIN',
  LOW_BARRIER: 'LOW_BARRIER',
  OVERHEAD_HAZARD: 'OVERHEAD_HAZARD',
  ROADBLOCK: 'ROADBLOCK'
});

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.LANE_WIDTH = 3.2;
    this.lanes = [-this.LANE_WIDTH, 0, this.LANE_WIDTH];

    // Pools for different obstacle types
    this.pools = {
      [ObstacleType.TRAIN]: [],
      [ObstacleType.LOW_BARRIER]: [],
      [ObstacleType.OVERHEAD_HAZARD]: [],
      [ObstacleType.ROADBLOCK]: []
    };

    this.activeObstacles = [];
    this.spawnDistanceZ = -160.0; // Distance ahead of player where obstacles spawn
    this.despawnDistanceZ = 25.0;  // Distance behind player where obstacles despawn
    this.distanceSinceLastSpawn = 0; // Accumulated distance since last obstacle row

    this.initMaterials();
    this.initPools();
  }

  initMaterials() {
    this.materials = {
      // Modern Subway Train Body (Vibrant High-Visibility Ruby/Crimson)
      trainBody: new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        roughness: 0.25,
        metalness: 0.45
      }),
      // Aerodynamic Train Cab Nose (Dark graphite accent)
      trainCabNose: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.6
      }),
      // Aerodynamic Roof Shell
      trainRoof: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.55
      }),
      // Crisp White Livery Speed-Stripe
      trainStripe: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25
      }),
      // Panoramic Windshield & Passenger Tinted Glass
      trainWindow: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.9
      }),
      // Illuminated Passenger Interior Glow
      passengerGlow: new THREE.MeshBasicMaterial({
        color: 0xfef08a // Warm interior cabin lighting
      }),
      // High-Intensity Twin LED Headlights
      headlight: new THREE.MeshBasicMaterial({
        color: 0xfff07c
      }),
      // Red Tail Marker Lamps
      tailLight: new THREE.MeshBasicMaterial({
        color: 0xef4444
      }),
      // Destination LED Rollsign ("METRO 1")
      destSign: new THREE.MeshBasicMaterial({
        color: 0x38bdf8 // Glowing cyan destination matrix
      }),
      // Wheel Bogie Steel & Axles
      bogieSteel: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.8
      }),
      bogieWheel: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.2,
        metalness: 0.95
      }),
      // Track barrier posts and beams
      barrierPost: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4
      }),
      barrierStripeRed: new THREE.MeshStandardMaterial({
        color: 0xdc2626, // Vivid Warning Red
        roughness: 0.3
      }),
      barrierStripeWhite: new THREE.MeshStandardMaterial({
        color: 0xffffff, // Pure High-Contrast White
        roughness: 0.3
      }),
      barrierFlashingBeacon: new THREE.MeshBasicMaterial({
        color: 0xfbbf24 // Glowing amber caution light
      }),
      overheadBeam: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Vivid Amber / Industrial Caution Yellow
        roughness: 0.3,
        metalness: 0.3
      }),
      hazardStripe: new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Pitch Black Caution Diagonal Stripe
        roughness: 0.4
      }),
      roadblockConcrete: new THREE.MeshStandardMaterial({
        color: 0x94a3b8, // Heavy track-end buffer concrete
        roughness: 0.85
      }),
      roadblockRedDisk: new THREE.MeshBasicMaterial({
        color: 0xef4444 // Track-end red warning reflector
      })
    };
  }

  initPools() {
    // Pre-instantiate reusable meshes
    for (let i = 0; i < 6; i++) {
      this.pools[ObstacleType.TRAIN].push(this.createTrainMesh());
    }
    for (let i = 0; i < 10; i++) {
      this.pools[ObstacleType.LOW_BARRIER].push(this.createLowBarrierMesh());
    }
    for (let i = 0; i < 10; i++) {
      this.pools[ObstacleType.OVERHEAD_HAZARD].push(this.createOverheadHazardMesh());
    }
    for (let i = 0; i < 8; i++) {
      this.pools[ObstacleType.ROADBLOCK].push(this.createRoadblockMesh());
    }
  }

  createTrainMesh() {
    const group = new THREE.Group();
    const length = 18.0;
    const width = 2.6;
    const height = 3.6;

    // 1. Main Train Body Shell
    const bodyGeo = new THREE.BoxGeometry(width, height - 0.4, length);
    const body = new THREE.Mesh(bodyGeo, this.materials.trainBody);
    body.position.y = (height - 0.4) / 2 + 0.45;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. White Livery Speed Stripe along both flanks
    const stripeGeo = new THREE.BoxGeometry(width + 0.04, 0.32, length * 0.98);
    const stripe = new THREE.Mesh(stripeGeo, this.materials.trainStripe);
    stripe.position.set(0, 1.45, 0);
    group.add(stripe);

    // 3. Passenger Side Windows with Warm Cabin Interior Illumination
    const windowCount = 5;
    const winSpacing = length / (windowCount + 1);
    for (let w = 1; w <= windowCount; w++) {
      const wz = -length / 2 + w * winSpacing;

      // Left & Right passenger windows
      const winGeo = new THREE.BoxGeometry(width + 0.06, 0.75, 1.4);
      const win = new THREE.Mesh(winGeo, this.materials.passengerGlow);
      win.position.set(0, 2.3, wz);
      group.add(win);
    }

    // 4. Aerodynamic Front Cab Nose
    const noseGeo = new THREE.BoxGeometry(width * 0.96, height * 0.85, 1.2);
    const nose = new THREE.Mesh(noseGeo, this.materials.trainCabNose);
    nose.position.set(0, height * 0.48, length / 2 + 0.5);
    nose.castShadow = true;
    group.add(nose);

    // 5. Large Panoramic Windshield
    const windGeo = new THREE.BoxGeometry(width * 0.88, 1.1, 0.12);
    const windshield = new THREE.Mesh(windGeo, this.materials.trainWindow);
    windshield.position.set(0, height * 0.65, length / 2 + 1.12);
    group.add(windshield);

    // 6. Glowing LED Destination Rollsign ("METRO 1")
    const signGeo = new THREE.BoxGeometry(width * 0.55, 0.28, 0.08);
    const signMesh = new THREE.Mesh(signGeo, this.materials.destSign);
    signMesh.position.set(0, height * 0.86, length / 2 + 1.12);
    group.add(signMesh);

    // 7. Twin High-Intensity LED Headlights
    const lightGeo = new THREE.BoxGeometry(0.32, 0.22, 0.12);
    const lightL = new THREE.Mesh(lightGeo, this.materials.headlight);
    lightL.position.set(-0.85, 1.15, length / 2 + 1.12);
    group.add(lightL);

    const lightR = new THREE.Mesh(lightGeo, this.materials.headlight);
    lightR.position.set(0.85, 1.15, length / 2 + 1.12);
    group.add(lightR);

    // 8. Roof & Dual Aerodynamic HVAC Units
    const roofGeo = new THREE.BoxGeometry(width * 0.94, 0.35, length);
    const roof = new THREE.Mesh(roofGeo, this.materials.trainRoof);
    roof.position.y = height + 0.2;
    group.add(roof);

    [-length * 0.25, length * 0.25].forEach(hz => {
      const hvacGeo = new THREE.BoxGeometry(width * 0.70, 0.35, 2.4);
      const hvac = new THREE.Mesh(hvacGeo, this.materials.bogieSteel);
      hvac.position.set(0, height + 0.45, hz);
      group.add(hvac);
    });

    // 9. Steel Wheel Bogies (Front & Rear Trucks)
    [-length * 0.35, length * 0.35].forEach(bz => {
      const bogieFrame = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.85, 0.30, 2.6),
        this.materials.bogieSteel
      );
      bogieFrame.position.set(0, 0.22, bz);
      group.add(bogieFrame);

      // Flanged Steel Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16);
      [-0.8, 0.8].forEach(wz => {
        [-width * 0.42, width * 0.42].forEach(wx => {
          const wheel = new THREE.Mesh(wheelGeo, this.materials.bogieWheel);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.25, bz + wz);
          group.add(wheel);
        });
      });
    });

    group.userData = {
      type: ObstacleType.TRAIN,
      box: new THREE.Box3(),
      size: new THREE.Vector3(width * 0.95, height + 0.4, length + 1.2)
    };
    return group;
  }

  createLowBarrierMesh() {
    const group = new THREE.Group();
    const width = 2.8;
    const height = 1.05;

    // Heavy Industrial A-Frame Upright Supports
    const postGeo = new THREE.BoxGeometry(0.20, height, 0.22);
    const postL = new THREE.Mesh(postGeo, this.materials.barrierPost);
    postL.position.set(-width / 2 + 0.12, height / 2, 0);
    postL.castShadow = true;
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.materials.barrierPost);
    postR.position.set(width / 2 - 0.12, height / 2, 0);
    postR.castShadow = true;
    group.add(postR);

    // Flashing Warning Beacon on Left and Right Posts
    const beaconGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12);
    const beaconL = new THREE.Mesh(beaconGeo, this.materials.barrierFlashingBeacon);
    beaconL.position.set(-width / 2 + 0.12, height + 0.10, 0);
    group.add(beaconL);

    const beaconR = new THREE.Mesh(beaconGeo, this.materials.barrierFlashingBeacon);
    beaconR.position.set(width / 2 - 0.12, height + 0.10, 0);
    group.add(beaconR);

    // Horizontal Reflector Beam with Alternating Red & White Chevrons
    const stripeCount = 6;
    const stripeWidth = width / stripeCount;
    for (let s = 0; s < stripeCount; s++) {
      const mat = s % 2 === 0 ? this.materials.barrierStripeRed : this.materials.barrierStripeWhite;
      const stripeGeo = new THREE.BoxGeometry(stripeWidth, 0.36, 0.14);
      const stripeMesh = new THREE.Mesh(stripeGeo, mat);
      stripeMesh.position.set(-width / 2 + s * stripeWidth + stripeWidth / 2, height * 0.72, 0);
      stripeMesh.castShadow = true;
      group.add(stripeMesh);
    }

    group.userData = {
      type: ObstacleType.LOW_BARRIER,
      box: new THREE.Box3(),
      size: new THREE.Vector3(width * 0.9, height * 0.85, 0.5),
      canJumpOver: true,
      canSlideUnder: false
    };
    return group;
  }

  createOverheadHazardMesh() {
    const group = new THREE.Group();
    const width = 2.8;
    const beamY = 2.1; // Overhead clearance: player must slide (height < 1.0)

    // Industrial Steel Hanger Posts
    const postGeo = new THREE.BoxGeometry(0.16, 2.6, 0.16);
    const postL = new THREE.Mesh(postGeo, this.materials.hazardStripe);
    postL.position.set(-width / 2 + 0.12, beamY + 1.30, 0);
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.materials.hazardStripe);
    postR.position.set(width / 2 - 0.12, beamY + 1.30, 0);
    group.add(postR);

    // Heavy Industrial Clearance Crossbeam
    const beamGeo = new THREE.BoxGeometry(width, 0.48, 0.38);
    const beam = new THREE.Mesh(beamGeo, this.materials.overheadBeam);
    beam.position.set(0, beamY, 0);
    beam.castShadow = true;
    group.add(beam);

    // Diagonal Yellow & Black Warning Stripes
    const stripeCount = 5;
    const sWidth = width / stripeCount;
    for (let s = 0; s < stripeCount; s += 2) {
      const sMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sWidth * 0.85, 0.50, 0.40),
        this.materials.hazardStripe
      );
      sMesh.position.set(-width / 2 + s * sWidth + sWidth / 2, beamY, 0);
      group.add(sMesh);
    }

    group.userData = {
      type: ObstacleType.OVERHEAD_HAZARD,
      box: new THREE.Box3(),
      // Box covers vertical space from y=1.5 up to y=4.5 so upright player hits it, but sliding player clears it!
      size: new THREE.Vector3(width * 0.9, 2.4, 0.6),
      centerOffsetY: beamY + 0.8,
      canJumpOver: false,
      canSlideUnder: true
    };
    return group;
  }

  createRoadblockMesh() {
    const group = new THREE.Group();
    const width = 2.6;
    const height = 1.4;

    // Heavy Reinforced Concrete Track-End Buffer
    const baseGeo = new THREE.BoxGeometry(width, height * 0.75, 0.55);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.roadblockConcrete);
    baseMesh.position.y = height * 0.42;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // Buffer Beam Cushion
    const beamGeo = new THREE.BoxGeometry(width * 0.95, 0.35, 0.20);
    const beamMesh = new THREE.Mesh(beamGeo, this.materials.barrierPost);
    beamMesh.position.set(0, height * 0.55, 0.32);
    group.add(beamMesh);

    // Circular Red Warning Reflector Disk (Track Terminal Danger Sign)
    const diskGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20);
    const disk = new THREE.Mesh(diskGeo, this.materials.roadblockRedDisk);
    disk.rotation.x = Math.PI / 2;
    disk.position.set(0, height * 0.55, 0.44);
    group.add(disk);

    // Warning Flashing Amber Beacon on Top
    const beaconGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.24, 12);
    const beacon = new THREE.Mesh(beaconGeo, this.materials.barrierFlashingBeacon);
    beacon.position.set(0, height * 0.88, 0);
    group.add(beacon);

    group.userData = {
      type: ObstacleType.ROADBLOCK,
      box: new THREE.Box3(),
      size: new THREE.Vector3(width * 0.9, height, 0.7),
      canJumpOver: false,
      canSlideUnder: false
    };
    return group;
  }

  spawnPattern(spawnZ, difficultyTier) {
    // Generate an obstacle row at spawnZ
    // Guaranteed fairness rules:
    // 1. NEVER block all 3 lanes completely.
    // 2. If 2 lanes have impassable obstacles (trains or roadblocks), the 3rd lane MUST be open or jumpable/slideable.
    // 3. Provide varied combinations (e.g. 1 train + 1 hurdle, or 1 overhead + 1 roadblock).

    const laneIndices = [0, 1, 2]; // 0: Left (-1), 1: Center (0), 2: Right (+1)
    
    // Choose how many lanes to occupy based on difficulty
    const count = difficultyTier === 1 ? 1 : (Math.random() < 0.7 ? 2 : 1);

    // Shuffle lane indices
    const shuffledLanes = laneIndices.sort(() => Math.random() - 0.5).slice(0, count);

    let trainsSpawned = 0;

    shuffledLanes.forEach(laneIdx => {
      const laneX = this.lanes[laneIdx];

      // Pick an obstacle type
      let type;
      const roll = Math.random();

      if (roll < 0.35 && trainsSpawned === 0) {
        type = ObstacleType.TRAIN;
        trainsSpawned++;
      } else if (roll < 0.65) {
        type = ObstacleType.LOW_BARRIER; // Jumpable
      } else if (roll < 0.85) {
        type = ObstacleType.OVERHEAD_HAZARD; // Slideable
      } else {
        type = ObstacleType.ROADBLOCK;
      }

      this.spawnObstacle(type, laneX, spawnZ);
    });
  }

  spawnObstacle(type, x, z) {
    let pool = this.pools[type];
    if (!pool || pool.length === 0) {
      if (type === ObstacleType.TRAIN) pool.push(this.createTrainMesh());
      else if (type === ObstacleType.LOW_BARRIER) pool.push(this.createLowBarrierMesh());
      else if (type === ObstacleType.OVERHEAD_HAZARD) pool.push(this.createOverheadHazardMesh());
      else pool.push(this.createRoadblockMesh());
    }

    const obstacle = pool.pop();
    obstacle.position.set(x, 0, z);
    this.scene.add(obstacle);
    this.activeObstacles.push(obstacle);
    this.updateObstacleBox(obstacle);
  }

  updateObstacleBox(obstacle) {
    const pos = obstacle.position;
    const size = obstacle.userData.size;
    const center = pos.clone();

    if (obstacle.userData.type === ObstacleType.OVERHEAD_HAZARD) {
      center.y = obstacle.userData.centerOffsetY;
    } else {
      center.y += size.y / 2;
    }

    obstacle.userData.box.setFromCenterAndSize(center, size);
  }

  update(delta, currentSpeed, difficultyTier, minSpacing) {
    const moveZ = currentSpeed * delta;

    // 1. Move active obstacles forward
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.position.z += moveZ;
      this.updateObstacleBox(obs);

      // Despawn if passed behind player
      if (obs.position.z > this.despawnDistanceZ) {
        this.despawnObstacle(i);
      }
    }

    // 2. Check if we should spawn new obstacles ahead
    this.distanceSinceLastSpawn += moveZ;
    if (this.distanceSinceLastSpawn >= minSpacing) {
      this.spawnPattern(this.spawnDistanceZ, difficultyTier);
      this.distanceSinceLastSpawn = 0;
    }
  }

  despawnObstacle(index) {
    const obs = this.activeObstacles[index];
    this.scene.remove(obs);
    this.activeObstacles.splice(index, 1);
    this.pools[obs.userData.type].push(obs);
  }

  reset() {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      this.despawnObstacle(i);
    }
    // Give player a generous runway on game start before first obstacle row spawns
    this.distanceSinceLastSpawn = -25.0;
  }
}
