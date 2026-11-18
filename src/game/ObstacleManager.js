/**
 * ObstacleManager.js
 * Generates and pools dynamic obstacles (Trains, Low Jump Barriers, Overhead Slide Hazards, Roadblocks).
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
      trainBody: new THREE.MeshStandardMaterial({
        color: 0xd62828, // Crimson Red Subway Train
        roughness: 0.3,
        metalness: 0.6
      }),
      trainRoof: new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.6
      }),
      trainStripe: new THREE.MeshStandardMaterial({
        color: 0xfdf0d5, // Cream stripe
        roughness: 0.4
      }),
      trainWindow: new THREE.MeshStandardMaterial({
        color: 0x003049,
        roughness: 0.1,
        metalness: 0.9
      }),
      headlight: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      barrierPost: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5
      }),
      barrierStripeRed: new THREE.MeshStandardMaterial({
        color: 0xe63946,
        roughness: 0.4
      }),
      barrierStripeWhite: new THREE.MeshStandardMaterial({
        color: 0xf1faee,
        roughness: 0.4
      }),
      overheadBeam: new THREE.MeshStandardMaterial({
        color: 0xfca311, // Warning industrial yellow
        roughness: 0.4,
        metalness: 0.5
      }),
      hazardStripe: new THREE.MeshStandardMaterial({
        color: 0x14213d,
        roughness: 0.5
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

    // Body
    const bodyGeo = new THREE.BoxGeometry(width, height, length);
    const body = new THREE.Mesh(bodyGeo, this.materials.trainBody);
    body.position.y = height / 2 + 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof
    const roofGeo = new THREE.BoxGeometry(width * 0.95, 0.4, length);
    const roof = new THREE.Mesh(roofGeo, this.materials.trainRoof);
    roof.position.y = height + 0.45;
    group.add(roof);

    // Front windshield
    const windGeo = new THREE.BoxGeometry(width * 0.85, 1.2, 0.1);
    const windshield = new THREE.Mesh(windGeo, this.materials.trainWindow);
    windshield.position.set(0, height * 0.65, length / 2 + 0.02);
    group.add(windshield);

    // Front Headlights
    const lightGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const lightL = new THREE.Mesh(lightGeo, this.materials.headlight);
    lightL.position.set(-0.8, 1.2, length / 2 + 0.05);
    group.add(lightL);

    const lightR = new THREE.Mesh(lightGeo, this.materials.headlight);
    lightR.position.set(0.8, 1.2, length / 2 + 0.05);
    group.add(lightR);

    // Undercarriage Bogies
    const bogieGeo = new THREE.BoxGeometry(width * 0.8, 0.4, 3.0);
    const bogieF = new THREE.Mesh(bogieGeo, this.materials.trainRoof);
    bogieF.position.set(0, 0.2, length * 0.35);
    group.add(bogieF);
    const bogieB = new THREE.Mesh(bogieGeo, this.materials.trainRoof);
    bogieB.position.set(0, 0.2, -length * 0.35);
    group.add(bogieB);

    group.userData = {
      type: ObstacleType.TRAIN,
      box: new THREE.Box3(),
      size: new THREE.Vector3(width * 0.95, height + 0.4, length)
    };
    return group;
  }

  createLowBarrierMesh() {
    const group = new THREE.Group();
    const width = 2.8;
    const height = 1.05;

    // Side Posts
    const postGeo = new THREE.BoxGeometry(0.2, height, 0.2);
    const postL = new THREE.Mesh(postGeo, this.materials.barrierPost);
    postL.position.set(-width / 2 + 0.1, height / 2, 0);
    postL.castShadow = true;
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.materials.barrierPost);
    postR.position.set(width / 2 - 0.1, height / 2, 0);
    postR.castShadow = true;
    group.add(postR);

    // Horizontal barrier beam with striped sections
    const stripeCount = 6;
    const stripeWidth = width / stripeCount;
    for (let s = 0; s < stripeCount; s++) {
      const mat = s % 2 === 0 ? this.materials.barrierStripeRed : this.materials.barrierStripeWhite;
      const stripeGeo = new THREE.BoxGeometry(stripeWidth, 0.32, 0.12);
      const stripeMesh = new THREE.Mesh(stripeGeo, mat);
      stripeMesh.position.set(-width / 2 + s * stripeWidth + stripeWidth / 2, height * 0.75, 0);
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

    // Hanging support posts
    const postGeo = new THREE.BoxGeometry(0.15, 2.5, 0.15);
    const postL = new THREE.Mesh(postGeo, this.materials.hazardStripe);
    postL.position.set(-width / 2 + 0.1, beamY + 1.25, 0);
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.materials.hazardStripe);
    postR.position.set(width / 2 - 0.1, beamY + 1.25, 0);
    group.add(postR);

    // Hazard crossbar
    const beamGeo = new THREE.BoxGeometry(width, 0.45, 0.35);
    const beam = new THREE.Mesh(beamGeo, this.materials.overheadBeam);
    beam.position.set(0, beamY, 0);
    beam.castShadow = true;
    group.add(beam);

    // Diagonal hazard warning stripes
    const stripeCount = 5;
    const sWidth = width / stripeCount;
    for (let s = 0; s < stripeCount; s += 2) {
      const sMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sWidth * 0.8, 0.46, 0.37),
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
    const width = 2.5;
    const height = 1.4;

    const baseGeo = new THREE.BoxGeometry(width, height * 0.7, 0.3);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.overheadBeam);
    baseMesh.position.y = height * 0.4;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // Warning flashing beacon light on top
    const beaconGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12);
    const beacon = new THREE.Mesh(beaconGeo, this.materials.barrierStripeRed);
    beacon.position.set(0, height * 0.85, 0);
    group.add(beacon);

    group.userData = {
      type: ObstacleType.ROADBLOCK,
      box: new THREE.Box3(),
      size: new THREE.Vector3(width * 0.9, height, 0.6),
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
    // Tier 1: 1 obstacle
    // Tier 2: 1-2 obstacles
    // Tier 3 & 4: 2 obstacles (1 lane always clear or passable)
    const count = difficultyTier === 1 ? 1 : (Math.random() < 0.7 ? 2 : 1);

    // Shuffle lane indices
    const shuffledLanes = laneIndices.sort(() => Math.random() - 0.5).slice(0, count);

    // Track passability
    let hasClearLane = (3 - count) > 0;
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
      // Create new one if pool depleted
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
    // Give player a short comfortable initial runway before first obstacle row spawns
    this.distanceSinceLastSpawn = 0;
  }
}
