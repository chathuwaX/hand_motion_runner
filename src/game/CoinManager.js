/**
 * CoinManager.js
 * Collectible spinning gold coins with object pooling,
 * jump/slide trail patterns, pickup detection, and sparkle particles.
 */

import * as THREE from 'three';

export class CoinManager {
  constructor(scene) {
    this.scene = scene;
    this.LANE_WIDTH = 3.2;
    this.lanes = [-this.LANE_WIDTH, 0, this.LANE_WIDTH];

    this.pool = [];
    this.activeCoins = [];
    this.particles = [];

    this.spawnDistanceZ = -170.0;
    this.despawnDistanceZ = 15.0;
    this.lastCoinSpawnZ = -15.0;

    this.initMaterial();
    this.initPool();
    this.initParticles();
  }

  initMaterial() {
    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Brilliant metallic gold
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x996515,
      emissiveIntensity: 0.3
    });

    this.innerStarMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.9
    });
  }

  initPool() {
    for (let i = 0; i < 40; i++) {
      this.pool.push(this.createCoinMesh());
    }
  }

  createCoinMesh() {
    const group = new THREE.Group();

    // Cylindrical Gold Coin
    const coinGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 18);
    const coinMesh = new THREE.Mesh(coinGeo, this.coinMaterial);
    coinMesh.rotation.x = Math.PI / 2;
    coinMesh.castShadow = true;
    group.add(coinMesh);

    // Inner embossed star/accent
    const innerGeo = new THREE.BoxGeometry(0.25, 0.25, 0.14);
    const inner = new THREE.Mesh(innerGeo, this.innerStarMaterial);
    group.add(inner);

    group.userData = {
      box: new THREE.Box3(),
      radius: 0.75, // Pickup trigger radius
      isCollected: false
    };
    return group;
  }

  initParticles() {
    // Reusable collection spark particles
    const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < 25; i++) {
      const p = new THREE.Mesh(pGeo, this.particleMaterial);
      p.visible = false;
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.35
      });
    }
  }

  spawnTrail(laneIndex, startZ, count = 6, heightType = 'GROUND') {
    const laneX = this.lanes[laneIndex];
    const spacing = 3.2;

    for (let i = 0; i < count; i++) {
      let coin = this.pool.pop();
      if (!coin) coin = this.createCoinMesh();

      let y = 1.0;
      if (heightType === 'ARC') {
        // High parabolic arc for jumps (reaches y = 3.0 at apex)
        const progress = i / (count - 1);
        y = 1.0 + 2.2 * 4.0 * progress * (1.0 - progress);
      } else if (heightType === 'LOW') {
        y = 0.5; // Low trail for slides
      }

      const z = startZ - i * spacing;
      coin.position.set(laneX, y, z);
      coin.userData.isCollected = false;

      this.scene.add(coin);
      this.activeCoins.push(coin);
    }
  }

  update(delta, currentSpeed) {
    const moveZ = currentSpeed * delta;
    const rotSpeed = 3.5 * delta;

    // 1. Move and animate active coins
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      coin.position.z += moveZ;
      coin.rotation.y += rotSpeed;

      // Update pickup box
      coin.userData.box.setFromCenterAndSize(coin.position, new THREE.Vector3(1.0, 1.0, 1.0));

      if (coin.position.z > this.despawnDistanceZ) {
        this.despawnCoin(i);
      }
    }

    // 2. Spawn coin trails periodically
    this.lastCoinSpawnZ += moveZ;
    if (this.lastCoinSpawnZ > 24.0) {
      const randomLane = Math.floor(Math.random() * 3);
      const patternRoll = Math.random();
      const heightType = patternRoll < 0.4 ? 'GROUND' : (patternRoll < 0.75 ? 'ARC' : 'LOW');
      this.spawnTrail(randomLane, this.spawnDistanceZ, 6, heightType);
      this.lastCoinSpawnZ = 0;
    }

    // 3. Update collection sparkles
    for (let p of this.particles) {
      if (p.mesh.visible) {
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.mesh.visible = false;
        } else {
          p.mesh.position.addScaledVector(p.velocity, delta);
          p.mesh.scale.setScalar(Math.max(0.1, 1.0 - p.life / p.maxLife));
        }
      }
    }
  }

  checkPickup(playerBox, playerPos) {
    let collectedCount = 0;

    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      if (coin.userData.isCollected) continue;

      // Distance check or box intersection
      const dist = coin.position.distanceTo(playerPos);
      if (dist < 1.8 || coin.userData.box.intersectsBox(playerBox)) {
        coin.userData.isCollected = true;
        this.emitPickupParticles(coin.position);
        this.despawnCoin(i);
        collectedCount++;
      }
    }

    return collectedCount;
  }

  emitPickupParticles(pos) {
    let spawned = 0;
    for (let p of this.particles) {
      if (!p.mesh.visible && spawned < 5) {
        p.mesh.visible = true;
        p.mesh.position.copy(pos);
        p.life = 0;
        p.velocity.set(
          (Math.random() - 0.5) * 6.0,
          Math.random() * 5.0 + 2.0,
          (Math.random() - 0.5) * 6.0
        );
        spawned++;
      }
    }
  }

  despawnCoin(index) {
    const coin = this.activeCoins[index];
    this.scene.remove(coin);
    this.activeCoins.splice(index, 1);
    this.pool.push(coin);
  }

  reset() {
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      this.despawnCoin(i);
    }
    this.lastCoinSpawnZ = -15.0;
    for (let p of this.particles) {
      p.mesh.visible = false;
    }
  }
}
