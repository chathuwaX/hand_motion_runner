/**
 * Environment.js
 * Creates the immersive endless 3D railway environment.
 * Includes three railway tracks (rails, ties, ballast), side platforms,
 * overhead gantries, city skyscrapers, streetlights, and seamless segment pooling.
 */

import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;

    this.LANE_WIDTH = 3.2;
    this.SEGMENT_LENGTH = 70.0;
    this.SEGMENT_COUNT = 6; // Spans ~420 units
    this.TOTAL_SPAN = this.SEGMENT_LENGTH * this.SEGMENT_COUNT;

    this.segments = [];
    this.recycledMeshes = [];

    // Shared materials to minimize draw calls and maximize 60 FPS performance
    this.initSharedMaterials();
    this.createSegments();
  }

  initSharedMaterials() {
    this.materials = {
      ballast: new THREE.MeshStandardMaterial({
        color: 0x1a2130, // Dark asphalt / gravel ballast
        roughness: 0.9,
        metalness: 0.1
      }),
      rail: new THREE.MeshStandardMaterial({
        color: 0x9fa8b8, // Steel chrome rails
        roughness: 0.25,
        metalness: 0.85
      }),
      sleeper: new THREE.MeshStandardMaterial({
        color: 0x3d3023, // Weathered railway ties
        roughness: 0.8
      }),
      platform: new THREE.MeshStandardMaterial({
        color: 0x272c3d, // Concrete platform
        roughness: 0.7
      }),
      curbYellow: new THREE.MeshStandardMaterial({
        color: 0xffcc00, // Warning yellow platform edge
        roughness: 0.4
      }),
      buildingA: new THREE.MeshStandardMaterial({
        color: 0x121724, // Midnight navy skyscraper
        roughness: 0.6
      }),
      buildingB: new THREE.MeshStandardMaterial({
        color: 0x1c2336, // Deep slate building
        roughness: 0.5
      }),
      windowGlow: new THREE.MeshBasicMaterial({
        color: 0x55ccff // Cyber neon windows
      }),
      windowWarm: new THREE.MeshBasicMaterial({
        color: 0xffaa44 // Warm amber office lights
      }),
      gantryMetal: new THREE.MeshStandardMaterial({
        color: 0x475569, // Steel overhead truss
        roughness: 0.5,
        metalness: 0.6
      }),
      signalRed: new THREE.MeshBasicMaterial({
        color: 0xff2222
      }),
      signalGreen: new THREE.MeshBasicMaterial({
        color: 0x22ff66
      })
    };
  }

  createSegments() {
    for (let i = 0; i < this.SEGMENT_COUNT; i++) {
      const segment = this.buildSegment(i);
      segment.position.z = -i * this.SEGMENT_LENGTH;
      this.scene.add(segment);
      this.segments.push(segment);
    }
  }

  buildSegment(index) {
    const group = new THREE.Group();

    // 1. Ground Ballast Bed
    const groundGeo = new THREE.PlaneGeometry(36, this.SEGMENT_LENGTH);
    const ground = new THREE.Mesh(groundGeo, this.materials.ballast);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    group.add(ground);

    // 2. Three Railway Tracks
    const lanes = [-this.LANE_WIDTH, 0, this.LANE_WIDTH];
    const railGauge = 1.4; // Distance between pair of rails

    lanes.forEach(laneX => {
      // Left Rail
      const railGeo = new THREE.BoxGeometry(0.12, 0.16, this.SEGMENT_LENGTH);
      const railL = new THREE.Mesh(railGeo, this.materials.rail);
      railL.position.set(laneX - railGauge / 2, 0.1, 0);
      railL.receiveShadow = true;
      group.add(railL);

      // Right Rail
      const railR = new THREE.Mesh(railGeo, this.materials.rail);
      railR.position.set(laneX + railGauge / 2, 0.1, 0);
      railR.receiveShadow = true;
      group.add(railR);

      // Railroad Sleepers (ties) spaced every 2.5m
      const tieCount = Math.floor(this.SEGMENT_LENGTH / 2.5);
      const tieGeo = new THREE.BoxGeometry(2.1, 0.1, 0.4);
      for (let t = 0; t < tieCount; t++) {
        const tie = new THREE.Mesh(tieGeo, this.materials.sleeper);
        const tz = -this.SEGMENT_LENGTH / 2 + t * 2.5 + 1.25;
        tie.position.set(laneX, 0.05, tz);
        tie.receiveShadow = true;
        group.add(tie);
      }
    });

    // 3. Side Platforms & Safety Curbs
    const platformWidth = 5.0;
    const platformHeight = 0.55;
    const platformGeo = new THREE.BoxGeometry(platformWidth, platformHeight, this.SEGMENT_LENGTH);
    const curbGeo = new THREE.BoxGeometry(0.25, platformHeight + 0.02, this.SEGMENT_LENGTH);

    // Left platform
    const platL = new THREE.Mesh(platformGeo, this.materials.platform);
    platL.position.set(-8.5, platformHeight / 2, 0);
    platL.receiveShadow = true;
    group.add(platL);

    const curbL = new THREE.Mesh(curbGeo, this.materials.curbYellow);
    curbL.position.set(-6.0, platformHeight / 2, 0);
    group.add(curbL);

    // Right platform
    const platR = new THREE.Mesh(platformGeo, this.materials.platform);
    platR.position.set(8.5, platformHeight / 2, 0);
    platR.receiveShadow = true;
    group.add(platR);

    const curbR = new THREE.Mesh(curbGeo, this.materials.curbYellow);
    curbR.position.set(6.0, platformHeight / 2, 0);
    group.add(curbR);

    // 4. Overhead Steel Gantry (every other segment)
    if (index % 2 === 0) {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(0, 0, 0);

      // Left Pillar
      const pillarGeo = new THREE.BoxGeometry(0.5, 7.5, 0.5);
      const pillarL = new THREE.Mesh(pillarGeo, this.materials.gantryMetal);
      pillarL.position.set(-6.2, 3.75, 0);
      pillarL.castShadow = true;
      gantryGroup.add(pillarL);

      // Right Pillar
      const pillarR = new THREE.Mesh(pillarGeo, this.materials.gantryMetal);
      pillarR.position.set(6.2, 3.75, 0);
      pillarR.castShadow = true;
      gantryGroup.add(pillarR);

      // Horizontal Overhead Crossbeam
      const beamGeo = new THREE.BoxGeometry(13.2, 0.6, 0.6);
      const beam = new THREE.Mesh(beamGeo, this.materials.gantryMetal);
      beam.position.set(0, 7.2, 0);
      beam.castShadow = true;
      gantryGroup.add(beam);

      // Railway signals (glowing green/red lights over each lane)
      lanes.forEach((laneX, lIdx) => {
        const signalHousing = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.6, 0.25),
          this.materials.gantryMetal
        );
        signalHousing.position.set(laneX, 6.6, 0);
        gantryGroup.add(signalHousing);

        const lightMat = (lIdx + index) % 2 === 0 ? this.materials.signalGreen : this.materials.signalRed;
        const signalLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), lightMat);
        signalLight.position.set(laneX, 6.6, 0.15);
        gantryGroup.add(signalLight);
      });

      group.add(gantryGroup);
    }

    // 5. City Skyscrapers / Background Buildings
    this.addCityBuildings(group, index);

    return group;
  }

  addCityBuildings(group, segmentIndex) {
    // Generate stylized buildings flanking the railway
    const buildingCounts = 5;
    const spacing = this.SEGMENT_LENGTH / buildingCounts;

    for (let side = -1; side <= 1; side += 2) {
      const baseX = side * (14.0 + Math.random() * 3.0);

      for (let b = 0; b < buildingCounts; b++) {
        const z = -this.SEGMENT_LENGTH / 2 + b * spacing + spacing / 2;
        const height = 22.0 + ((segmentIndex * 7 + b * 13) % 28);
        const width = 7.0 + ((segmentIndex * 5 + b * 9) % 6);
        const depth = spacing * 0.92;

        const bMat = (segmentIndex + b) % 2 === 0 ? this.materials.buildingA : this.materials.buildingB;
        const bGeo = new THREE.BoxGeometry(width, height, depth);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(baseX + (side > 0 ? width / 2 : -width / 2), height / 2, z);
        group.add(bMesh);

        // Neon Windows grid
        const windowRows = Math.floor(height / 4);
        for (let r = 1; r < windowRows; r++) {
          if ((segmentIndex + b + r) % 3 !== 0) {
            const winMat = (r + b) % 2 === 0 ? this.materials.windowGlow : this.materials.windowWarm;
            const winGeo = new THREE.BoxGeometry(0.15, 0.8, 1.4);
            const winMesh = new THREE.Mesh(winGeo, winMat);
            winMesh.position.set(
              baseX + (side > 0 ? 0.05 : -0.05),
              r * 4.0,
              z + ((r % 2) * 2 - 1) * (depth / 4)
            );
            group.add(winMesh);
          }
        }
      }
    }
  }

  update(delta, currentSpeed) {
    const moveZ = currentSpeed * delta;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      segment.position.z += moveZ;

      // When segment scrolls completely behind camera, recycle it to the horizon
      if (segment.position.z > this.SEGMENT_LENGTH) {
        // Find most distant segment in negative Z
        let minZ = 0;
        for (let j = 0; j < this.segments.length; j++) {
          if (this.segments[j].position.z < minZ) {
            minZ = this.segments[j].position.z;
          }
        }
        segment.position.z = minZ - this.SEGMENT_LENGTH;
      }
    }
  }

  reset() {
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].position.z = -i * this.SEGMENT_LENGTH;
    }
  }
}
