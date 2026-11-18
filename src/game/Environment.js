/**
 * Environment.js
 * Creates an authentic, realistic, natural 3D railway and subway environment.
 * Features:
 * - Real dual steel rails with shiny rail crowns, tie plates, and timber sleepers
 * - Third rail (electrification power rail) with protective safety cover board
 * - Natural crushed stone granite ballast bed
 * - Natural urban trees with organic foliage canopies and shrubs along track embankments
 * - Authentic passenger platforms with bright yellow tactile safety paving and stainless steel railings
 * - Subway station signs and overhead platform lighting
 * - Overhead steel catenary gantries with electrical tension wires and railway signal heads
 * - Realistic city architecture with rooftop details and window reflections
 * - Seamless segment recycling for endless running
 */

import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;

    this.LANE_WIDTH = 3.2;
    this.SEGMENT_LENGTH = 70.0;
    this.SEGMENT_COUNT = 6; // Spans 420 units
    this.TOTAL_SPAN = this.SEGMENT_LENGTH * this.SEGMENT_COUNT;

    this.segments = [];

    // Shared materials to minimize draw calls and maximize 60 FPS performance
    this.initSharedMaterials();
    this.initSharedGeometries();
    this.createSegments();
  }

  initSharedMaterials() {
    this.materials = {
      // Natural crushed granite ballast bed (light gray with stone flecks)
      ballast: new THREE.MeshStandardMaterial({
        color: 0xd4dbe6,
        roughness: 0.90,
        metalness: 0.05
      }),
      // Ballast sloped shoulder
      ballastShoulder: new THREE.MeshStandardMaterial({
        color: 0xc4ccd8,
        roughness: 0.95
      }),
      // Real polished steel rail crown (high metallic sheen reflecting sunlight)
      railSteel: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.18,
        metalness: 0.92
      }),
      // Rail base / tie plate (dark oxidized steel)
      railTiePlate: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.70,
        metalness: 0.50
      }),
      // Weathered timber railway sleepers / ties
      sleeperWood: new THREE.MeshStandardMaterial({
        color: 0x6d4c41,
        roughness: 0.82
      }),
      // Third rail electrified conductor
      thirdRailConductor: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.8
      }),
      // Third rail protective safety cover board (warning ochre)
      thirdRailCover: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.6
      }),
      // Subway passenger platform concrete
      platformConcrete: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.75
      }),
      // Railway safety tactile blister pavers (mandatory warning yellow edge)
      tactileYellow: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.4
      }),
      // Platform stainless steel safety railing
      railingSteel: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.25,
        metalness: 0.85
      }),
      // Subway station sign board (Navy blue with crisp white lettering)
      stationSignBlue: new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.3
      }),
      stationSignWhite: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      // Platform streetlight poles and luminaires
      streetLampPole: new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.4,
        metalness: 0.6
      }),
      streetLampGlow: new THREE.MeshBasicMaterial({
        color: 0xfef08a // Warm glowing platform lantern
      }),
      // Overhead catenary steel gantries
      gantrySteel: new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.35,
        metalness: 0.70
      }),
      // Overhead catenary tension wire
      catenaryWire: new THREE.MeshBasicMaterial({
        color: 0x334155
      }),
      // Railway signal heads
      signalGreen: new THREE.MeshBasicMaterial({ color: 0x10b981 }),
      signalRed: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      signalYellow: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
      // Natural Trees & Foliage Materials
      treeBark: new THREE.MeshStandardMaterial({
        color: 0x543d2b, // Natural tree trunk wood
        roughness: 0.90
      }),
      foliageGreenDark: new THREE.MeshStandardMaterial({
        color: 0x2d6a4f, // Deep forest green leaves
        roughness: 0.75
      }),
      foliageGreenLight: new THREE.MeshStandardMaterial({
        color: 0x40916c, // Fresh spring green canopy
        roughness: 0.70
      }),
      foliageGreenBright: new THREE.MeshStandardMaterial({
        color: 0x52b788, // Sunlit foliage accent
        roughness: 0.65
      }),
      // City buildings
      buildingConcrete: new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.6
      }),
      buildingBrick: new THREE.MeshStandardMaterial({
        color: 0x9a3412, // Warm terracotta brick facade
        roughness: 0.8
      }),
      buildingGlass: new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Sky-reflective blue glass
        roughness: 0.15,
        metalness: 0.85
      }),
      windowSkyReflect: new THREE.MeshBasicMaterial({
        color: 0xbae6fd
      })
    };
  }

  initSharedGeometries() {
    this.geos = {
      ground: new THREE.PlaneGeometry(36, this.SEGMENT_LENGTH),
      rail: new THREE.BoxGeometry(0.12, 0.16, this.SEGMENT_LENGTH),
      tie: new THREE.BoxGeometry(2.3, 0.12, 0.38),
      tiePlate: new THREE.BoxGeometry(0.24, 0.03, 0.34),
      platform: new THREE.BoxGeometry(4.8, 0.60, this.SEGMENT_LENGTH),
      tactileStrip: new THREE.BoxGeometry(0.40, 0.62, this.SEGMENT_LENGTH),
      curbEdge: new THREE.BoxGeometry(0.08, 0.64, this.SEGMENT_LENGTH),
      // Third rail geometries
      thirdRailConductor: new THREE.BoxGeometry(0.10, 0.14, this.SEGMENT_LENGTH),
      thirdRailCover: new THREE.BoxGeometry(0.24, 0.08, this.SEGMENT_LENGTH),
      // Catenary wire
      wire: new THREE.CylinderGeometry(0.015, 0.015, this.SEGMENT_LENGTH, 6)
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

    // 1. Natural Granite Ballast Ground Bed
    const ground = new THREE.Mesh(this.geos.ground, this.materials.ballast);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    group.add(ground);

    // 2. Three Railway Tracks (Rails, Tie Plates, Timber Sleepers & 3rd Rail)
    const lanes = [-this.LANE_WIDTH, 0, this.LANE_WIDTH];
    const railGauge = 1.435; // Standard international track gauge (~1.435m)

    lanes.forEach((laneX, laneIdx) => {
      // Left Steel Rail
      const railL = new THREE.Mesh(this.geos.rail, this.materials.railSteel);
      railL.position.set(laneX - railGauge / 2, 0.11, 0);
      railL.receiveShadow = true;
      group.add(railL);

      // Right Steel Rail
      const railR = new THREE.Mesh(this.geos.rail, this.materials.railSteel);
      railR.position.set(laneX + railGauge / 2, 0.11, 0);
      railR.receiveShadow = true;
      group.add(railR);

      // Railroad Sleepers (timber ties) spaced every 2.2m with tie plates
      const tieSpacing = 2.2;
      const tieCount = Math.floor(this.SEGMENT_LENGTH / tieSpacing);

      for (let t = 0; t < tieCount; t++) {
        const tz = -this.SEGMENT_LENGTH / 2 + t * tieSpacing + tieSpacing / 2;

        // Timber Sleeper
        const tie = new THREE.Mesh(this.geos.tie, this.materials.sleeperWood);
        tie.position.set(laneX, 0.05, tz);
        tie.receiveShadow = true;
        group.add(tie);

        // Steel tie plates beneath rails
        const plateL = new THREE.Mesh(this.geos.tiePlate, this.materials.railTiePlate);
        plateL.position.set(laneX - railGauge / 2, 0.11, tz);
        group.add(plateL);

        const plateR = new THREE.Mesh(this.geos.tiePlate, this.materials.railTiePlate);
        plateR.position.set(laneX + railGauge / 2, 0.11, tz);
        group.add(plateR);
      }

      // Third Rail along the outer lanes (Left of Lane -1, Right of Lane 1)
      if (laneIdx === 0 || laneIdx === 2) {
        const thirdRailX = laneIdx === 0 ? laneX - 1.15 : laneX + 1.15;

        // Insulated conductor
        const thirdConductor = new THREE.Mesh(this.geos.thirdRailConductor, this.materials.thirdRailConductor);
        thirdConductor.position.set(thirdRailX, 0.16, 0);
        group.add(thirdConductor);

        // Protective wooden/composite cover board
        const thirdCover = new THREE.Mesh(this.geos.thirdRailCover, this.materials.thirdRailCover);
        thirdCover.position.set(thirdRailX, 0.26, 0);
        group.add(thirdCover);
      }
    });

    // 3. Realistic Subway Passenger Platforms with Tactile Pavers
    const platformHeight = 0.60;
    const platOffset = 7.8;

    // Left Platform
    const platL = new THREE.Mesh(this.geos.platform, this.materials.platformConcrete);
    platL.position.set(-platOffset, platformHeight / 2, 0);
    platL.receiveShadow = true;
    group.add(platL);

    // Left Platform Tactile Safety Pavers (warning strip at platform edge)
    const tactileL = new THREE.Mesh(this.geos.tactileStrip, this.materials.tactileYellow);
    tactileL.position.set(-5.6, platformHeight / 2, 0);
    group.add(tactileL);

    // Right Platform
    const platR = new THREE.Mesh(this.geos.platform, this.materials.platformConcrete);
    platR.position.set(platOffset, platformHeight / 2, 0);
    platR.receiveShadow = true;
    group.add(platR);

    // Right Platform Tactile Safety Pavers
    const tactileR = new THREE.Mesh(this.geos.tactileStrip, this.materials.tactileYellow);
    tactileR.position.set(5.6, platformHeight / 2, 0);
    group.add(tactileR);

    // Platform Stainless Steel Safety Railings
    this.addPlatformRailings(group, platOffset);

    // Platform Streetlights & Subway Station Signs
    this.addPlatformFixtures(group, index, platOffset);

    // 4. Overhead Catenary Gantries & Power Wires
    this.addCatenarySystem(group, index, lanes);

    // 5. Natural Urban Trees, Hedges & Greenery
    this.addNaturalGreenery(group, index);

    // 6. City Architecture Backdrop
    this.addCityBuildings(group, index);

    return group;
  }

  addPlatformRailings(group, platOffset) {
    // Elegant modern stainless steel platform fence along rear of platform
    const postCount = 8;
    const spacing = this.SEGMENT_LENGTH / postCount;
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
    const railGeo = new THREE.BoxGeometry(0.06, 0.06, this.SEGMENT_LENGTH);

    for (let side = -1; side <= 1; side += 2) {
      const railX = side * (platOffset + 2.3);

      // Top handrail
      const topRail = new THREE.Mesh(railGeo, this.materials.railingSteel);
      topRail.position.set(railX, 1.70, 0);
      group.add(topRail);

      // Mid safety rail
      const midRail = new THREE.Mesh(railGeo, this.materials.railingSteel);
      midRail.position.set(railX, 1.20, 0);
      group.add(midRail);

      // Railing upright posts
      for (let p = 0; p < postCount; p++) {
        const post = new THREE.Mesh(postGeo, this.materials.railingSteel);
        const pz = -this.SEGMENT_LENGTH / 2 + p * spacing + spacing / 2;
        post.position.set(railX, 1.15, pz);
        group.add(post);
      }
    }
  }

  addPlatformFixtures(group, segmentIndex, platOffset) {
    // Add realistic modern platform lights every segment
    const lampZ = -this.SEGMENT_LENGTH / 4;
    const lampZ2 = this.SEGMENT_LENGTH / 4;

    [lampZ, lampZ2].forEach((lz) => {
      for (let side = -1; side <= 1; side += 2) {
        const lampGroup = new THREE.Group();
        const lampX = side * (platOffset - 0.4);
        lampGroup.position.set(lampX, 0.60, lz);

        // Mast pole
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10),
          this.materials.streetLampPole
        );
        mast.position.y = 2.1;
        lampGroup.add(mast);

        // Curved arm extending towards platform
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.06, 0.06),
          this.materials.streetLampPole
        );
        arm.position.set(side * -0.35, 4.2, 0);
        lampGroup.add(arm);

        // Luminaire lantern
        const lantern = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.10, 0.25),
          this.materials.streetLampPole
        );
        lantern.position.set(side * -0.7, 4.15, 0);
        lampGroup.add(lantern);

        // Glowing LED lens
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.40, 0.04, 0.20),
          this.materials.streetLampGlow
        );
        glow.position.set(side * -0.7, 4.09, 0);
        lampGroup.add(glow);

        group.add(lampGroup);
      }
    });

    // Subway Station Name Signs
    if (segmentIndex % 2 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        const signGroup = new THREE.Group();
        signGroup.position.set(side * (platOffset - 0.2), 2.2, 0);

        // Station blue signboard
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.55, 3.2),
          this.materials.stationSignBlue
        );
        signGroup.add(board);

        // White graphic stripe
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.08, 3.0),
          this.materials.stationSignWhite
        );
        stripe.position.set(0, 0.12, 0);
        signGroup.add(stripe);

        // Hanging brackets
        const bracketL = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8),
          this.materials.railingSteel
        );
        bracketL.position.set(0, 0.65, -1.1);
        signGroup.add(bracketL);

        const bracketR = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8),
          this.materials.railingSteel
        );
        bracketR.position.set(0, 0.65, 1.1);
        signGroup.add(bracketR);

        group.add(signGroup);
      }
    }
  }

  addCatenarySystem(group, segmentIndex, lanes) {
    // Overhead steel gantry every segment
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, 0);

    // Left Support Tower
    const towerGeo = new THREE.BoxGeometry(0.45, 8.0, 0.45);
    const towerL = new THREE.Mesh(towerGeo, this.materials.gantrySteel);
    towerL.position.set(-5.6, 4.0, 0);
    towerL.castShadow = true;
    gantryGroup.add(towerL);

    // Right Support Tower
    const towerR = new THREE.Mesh(towerGeo, this.materials.gantrySteel);
    towerR.position.set(5.6, 4.0, 0);
    towerR.castShadow = true;
    gantryGroup.add(towerR);

    // Horizontal Overhead Lattice Crossbeam
    const beamGeo = new THREE.BoxGeometry(11.6, 0.55, 0.55);
    const beam = new THREE.Mesh(beamGeo, this.materials.gantrySteel);
    beam.position.set(0, 7.6, 0);
    beam.castShadow = true;
    gantryGroup.add(beam);

    // Cantilever Droppers and Railway Signals above each track
    lanes.forEach((laneX, lIdx) => {
      // Insulator dropper
      const dropper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
        this.materials.gantrySteel
      );
      dropper.position.set(laneX, 7.0, 0);
      gantryGroup.add(dropper);

      // Signal Head Housing with Hood
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.70, 0.32),
        this.materials.streetLampPole
      );
      housing.position.set(laneX, 6.2, 0);
      gantryGroup.add(housing);

      // Signal Light (Alternates green/yellow/red)
      let lightMat = this.materials.signalGreen;
      if ((lIdx + segmentIndex) % 3 === 1) lightMat = this.materials.signalYellow;
      if ((lIdx + segmentIndex) % 3 === 2) lightMat = this.materials.signalRed;

      const light = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.06), lightMat);
      light.position.set(laneX, 6.2, 0.17);
      gantryGroup.add(light);
    });

    group.add(gantryGroup);

    // Continuous overhead catenary contact wires spanning the segment
    lanes.forEach((laneX) => {
      const wireMesh = new THREE.Mesh(this.geos.wire, this.materials.catenaryWire);
      wireMesh.rotation.x = Math.PI / 2;
      wireMesh.position.set(laneX, 6.4, 0);
      group.add(wireMesh);
    });
  }

  addNaturalGreenery(group, segmentIndex) {
    // Add lush, natural 3D trees and shrubs along trackside embankments
    const treeCount = 4;
    const spacing = this.SEGMENT_LENGTH / treeCount;

    for (let side = -1; side <= 1; side += 2) {
      for (let t = 0; t < treeCount; t++) {
        const treeX = side * (11.8 + ((segmentIndex * 3 + t * 5) % 4) * 0.4);
        const treeZ = -this.SEGMENT_LENGTH / 2 + t * spacing + spacing / 2 + ((t % 2) * 2 - 1) * 1.5;

        // Tree Root Group
        const tree = new THREE.Group();
        tree.position.set(treeX, 0.60, treeZ);

        // Organic trunk with slight natural taper
        const trunkHeight = 3.2 + (t % 3) * 0.6;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.28, trunkHeight, 10),
          this.materials.treeBark
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        // Multi-layered organic leaf foliage canopy
        const canopyBaseY = trunkHeight * 0.85;

        // Layer 1: Broad lower foliage cluster
        const fol1 = new THREE.Mesh(
          new THREE.SphereGeometry(1.4, 12, 12),
          this.materials.foliageGreenDark
        );
        fol1.scale.set(1.15, 0.85, 1.10);
        fol1.position.set(0, canopyBaseY + 0.6, 0);
        fol1.castShadow = true;
        tree.add(fol1);

        // Layer 2: Mid fresh green canopy
        const fol2 = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 12, 12),
          this.materials.foliageGreenLight
        );
        fol2.scale.set(1.0, 0.95, 1.05);
        fol2.position.set(0.2, canopyBaseY + 1.4, -0.1);
        fol2.castShadow = true;
        tree.add(fol2);

        // Layer 3: Sunlit crown
        const fol3 = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 10, 10),
          this.materials.foliageGreenBright
        );
        fol3.position.set(-0.15, canopyBaseY + 2.1, 0.15);
        fol3.castShadow = true;
        tree.add(fol3);

        group.add(tree);

        // Trackside foliage shrubs / bushes
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.65, 8, 8),
          this.materials.foliageGreenDark
        );
        bush.scale.set(1.4, 0.8, 1.2);
        bush.position.set(treeX - side * 1.2, 0.9, treeZ + 2.5);
        group.add(bush);
      }
    }
  }

  addCityBuildings(group, segmentIndex) {
    // Generate realistic urban buildings and architectural facades behind the platforms
    const buildingCounts = 4;
    const spacing = this.SEGMENT_LENGTH / buildingCounts;

    for (let side = -1; side <= 1; side += 2) {
      const baseX = side * (16.5 + Math.random() * 2.0);

      for (let b = 0; b < buildingCounts; b++) {
        const z = -this.SEGMENT_LENGTH / 2 + b * spacing + spacing / 2;
        const height = 24.0 + ((segmentIndex * 7 + b * 13) % 30);
        const width = 8.5;
        const depth = spacing * 0.94;

        // Alternate building architectural materials (modern concrete vs warm urban brick)
        const bMat = (segmentIndex + b) % 2 === 0
          ? this.materials.buildingConcrete
          : this.materials.buildingBrick;

        const bGeo = new THREE.BoxGeometry(width, height, depth);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(baseX + (side > 0 ? width / 2 : -width / 2), height / 2, z);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        group.add(bMesh);

        // Rooftop architecture: HVAC chiller unit or water tower
        if ((segmentIndex + b) % 2 === 0) {
          const hvac = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.2, 2.5),
            this.materials.gantrySteel
          );
          hvac.position.set(bMesh.position.x, height + 0.6, z);
          group.add(hvac);
        } else {
          // Classic wooden rooftop water tank
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 2.0, 12),
            this.materials.treeBark
          );
          tank.position.set(bMesh.position.x, height + 1.0, z);
          group.add(tank);
        }

        // Realistic architectural window arrays
        const windowRows = Math.floor(height / 4.2);
        for (let r = 1; r < windowRows; r++) {
          const winMat = this.materials.windowSkyReflect;
          const winGeo = new THREE.BoxGeometry(0.12, 1.2, 1.8);
          const winMesh = new THREE.Mesh(winGeo, winMat);
          winMesh.position.set(
            baseX + (side > 0 ? 0.06 : -0.06),
            r * 4.2,
            z + ((r % 2) * 2 - 1) * (depth / 4)
          );
          group.add(winMesh);
        }
      }
    }
  }

  update(delta, currentSpeed) {
    const moveZ = currentSpeed * delta;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      segment.position.z += moveZ;

      // When segment scrolls completely behind camera, recycle it to the distant horizon
      if (segment.position.z > this.SEGMENT_LENGTH) {
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
