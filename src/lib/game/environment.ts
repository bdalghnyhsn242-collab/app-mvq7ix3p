import * as THREE from "three";
import {
  BUILDING_FILES,
  NATURE_FILES,
  fitModelToSize,
  instantiateEnvironmentModel,
  loadEnvironmentGltf,
} from "./environmentAssets";
import {
  BUILDING_POSITIONS,
  ISLAND_RADIUS,
  forestDensity,
  terrainHeight,
} from "./battleRoyale";
import { AIRPORT_POSITION, CAMP_POSITION } from "./worldExpansion";
import {
  concreteTexture,
  groundDetailTexture,
  plasterTexture,
  roofTileTexture,
  rustTexture,
  sandbagTexture,
  woodPlankTexture,
} from "./textures";

/** Deterministic per-point variation for grass color mottling. */
function groundVary(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function createTerrain(): THREE.Mesh {
  const size = ISLAND_RADIUS * 2.6;
  const geometry = new THREE.PlaneGeometry(size, size, 150, 150);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const sand = new THREE.Color(0xd9c08a);
  const grassLush = new THREE.Color(0x3f7a3a);
  const grassDry = new THREE.Color(0x5c8f46);
  const grassPatch = new THREE.Color(0x9aa054);
  const rock = new THREE.Color(0x8a8378);
  const mud = new THREE.Color(0x6b5a3e);
  const seabed = new THREE.Color(0x5e5642);
  const snow = new THREE.Color(0xf2f5f7);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = terrainHeight(x, z);
    position.setY(i, h);
    const dist = Math.hypot(x, z);
    const shoreline = dist > ISLAND_RADIUS - 30;
    if (h < -0.5) {
      // Seabed darkens with depth so the water never glows yellow.
      color.copy(sand).lerp(seabed, Math.min(1, -h / 3));
    } else if (h < 0.9 && shoreline) {
      // Sand is a shoreline band, not the default for all low ground.
      color.copy(sand);
    } else if (h < 0.2) {
      // Inland riverbeds and hollows stay mud.
      color.copy(mud);
    } else if (h < 12) {
      // Varied grass: two greens mottled with dry patches, blending into
      // the beach right at the waterline.
      color.copy(grassLush).lerp(grassDry, groundVary(x, z));
      if (groundVary(x + 31.7, z - 17.3) > 0.86) {
        color.lerp(grassPatch, 0.6);
      }
      if (h < 1.6) {
        color.lerp(sand, 0.35 * ((1.6 - h) / 1.4));
      }
    } else {
      color.copy(rock).lerp(grassLush, Math.max(0, (16 - h) / 6));
      if (h > 26) {
        color.lerp(snow, Math.min(1, (h - 26) / 8));
      }
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  // The grayscale detail map multiplies the vertex colors, adding ground
  // texture without a second draw call or any asset download.
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: groundDetailTexture() ?? undefined,
  });
  return new THREE.Mesh(geometry, material);
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function createRocks(count = 90): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(1337);
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 6 + random() * (ISLAND_RADIUS - 9);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = 0.8 + random() * 2.4;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(scale, 1),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.08, 0.08, 0.28 + random() * 0.18),
        flatShading: true,
      }),
    );
    rock.position.set(x, terrainHeight(x, z) + scale * 0.35, z);
    rock.rotation.set(random() * 0.6, random() * Math.PI * 2, random() * 0.6);
    rock.scale.y = 0.6 + random() * 0.5;
    group.add(rock);
  }
  return group;
}

export function createForest(): {
  group: THREE.Group;
  update: (time: number, camera: THREE.Camera) => void;
  treeLods: THREE.LOD[];
} {
  const group = new THREE.Group();
  const random = seededRandom(9021);
  const foliage: THREE.Mesh[] = [];
  const treeLods: THREE.LOD[] = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5b4630 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b34, flatShading: true });
  const leafMatLow = new THREE.MeshLambertMaterial({ color: 0x356e38 });
  let placed = 0;
  let attempts = 0;
  while (placed < 130 && attempts < 900) {
    attempts += 1;
    const x = (random() * 2 - 1) * (ISLAND_RADIUS - 8);
    const z = (random() * 2 - 1) * (ISLAND_RADIUS - 8);
    const h = terrainHeight(x, z);
    if (h < 0.8 || h > 20 || forestDensity(x, z) < 0.55) {
      continue;
    }
    const lod = new THREE.LOD();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6), trunkMat);
    trunk.position.y = 1.6;
    const crown = new THREE.Group();
    for (let c = 0; c < 3; c += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - c * 0.4, 2.2, 7), leafMat);
      cone.position.y = 3.2 + c * 1.5;
      crown.add(cone);
      foliage.push(cone);
    }
    const high = new THREE.Group();
    high.add(trunk, crown);
    const low = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5.5, 5), leafMatLow);
    low.position.y = 3;
    lod.addLevel(high, 0);
    lod.addLevel(low, 90);
    lod.position.set(x, h, z);
    lod.scale.setScalar(0.8 + random() * 1.6);
    lod.rotation.y = random() * Math.PI * 2;
    group.add(lod);
    treeLods.push(lod);
    placed += 1;
  }
  return {
    group,
    treeLods,
    update: (time: number, camera: THREE.Camera) => {
      for (let i = 0; i < foliage.length; i += 1) {
        // Upgraded trees detach the procedural crowns; skip dead references.
        if (foliage[i].parent) {
          foliage[i].rotation.z = Math.sin(time * 1.6 + i * 0.7) * 0.05;
        }
      }
      group.children.forEach((child) => {
        (child as THREE.LOD).update(camera);
      });
    },
  };
}

export function createRuins(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(4242);
  const wallMaterial = new THREE.MeshLambertMaterial({
    color: 0x9a9186,
    map: concreteTexture() ?? undefined,
  });
  const rustMaterial = new THREE.MeshLambertMaterial({
    color: 0x7a4a32,
    map: rustTexture() ?? undefined,
  });
  const center = 14;
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const x = Math.cos(angle) * center;
    const z = Math.sin(angle) * center;
    const height = 1.2 + random() * 2.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, height, 0.5), wallMaterial);
    wall.position.set(x, terrainHeight(x, z) + height / 2, z);
    wall.rotation.y = angle + (random() - 0.5) * 0.4;
    wall.rotation.z = (random() - 0.5) * 0.12;
    group.add(wall);
    if (random() > 0.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), rustMaterial);
      beam.position.set(x + 1.4, terrainHeight(x, z) + 1.4, z + 0.6);
      beam.rotation.z = 0.5 + random() * 0.5;
      group.add(beam);
    }
  }
  return group;
}

export function createSunShafts(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(31337);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfff3d0,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 12; i += 1) {
    const x = (random() * 2 - 1) * 120;
    const z = (random() * 2 - 1) * 120;
    const h = terrainHeight(x, z);
    if (h < 1) {
      continue;
    }
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 6, 1, true), material);
    shaft.position.set(x, h + 13, z);
    shaft.rotation.z = 0.35;
    shaft.rotation.x = 0.2;
    group.add(shaft);
  }
  return group;
}

export function createCheckpoints(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(777);
  const concrete = new THREE.MeshLambertMaterial({
    color: 0x8d8d85,
    map: concreteTexture() ?? undefined,
  });
  const sandbag = new THREE.MeshLambertMaterial({
    color: 0x9b8b5e,
    map: sandbagTexture() ?? undefined,
  });
  const rust = new THREE.MeshLambertMaterial({
    color: 0x6e4a2f,
    map: rustTexture() ?? undefined,
  });
  for (let c = 0; c < 3; c += 1) {
    const angle = (c / 3) * Math.PI * 2 + 0.7;
    const cx = Math.cos(angle) * 95;
    const cz = Math.sin(angle) * 95;
    const base = terrainHeight(cx, cz);
    for (let s = 0; s < 7; s += 1) {
      const a = angle + Math.PI + (s - 3) * 0.22;
      const x = cx + Math.cos(a) * 4;
      const z = cz + Math.sin(a) * 4;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8), sandbag);
      bag.position.set(x, terrainHeight(x, z) + 0.45, z);
      bag.rotation.y = -a;
      group.add(bag);
    }
    const tower = new THREE.Group();
    for (let leg = 0; leg < 4; leg += 1) {
      const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6, 0.22), rust);
      legMesh.position.set((leg % 2 === 0 ? -1 : 1) * 1.1, 3, (leg < 2 ? -1 : 1) * 1.1);
      tower.add(legMesh);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 3), rust);
    platform.position.y = 6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 4), rust);
    roof.position.y = 7.4;
    roof.rotation.y = Math.PI / 4;
    tower.add(platform, roof);
    tower.position.set(cx, base, cz);
    group.add(tower);
    for (let b = 0; b < 3; b += 1) {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 0.6), concrete);
      const bx = cx + (random() - 0.5) * 10;
      const bz = cz + (random() - 0.5) * 10;
      barrier.position.set(bx, terrainHeight(bx, bz) + 0.5, bz);
      barrier.rotation.y = random() * Math.PI;
      group.add(barrier);
    }
  }
  return group;
}

export function createBuildings(): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({
    color: 0xa89f8d,
    map: plasterTexture() ?? undefined,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: 0x8a5a3a,
    map: roofTileTexture() ?? undefined,
  });
  const crateMat = new THREE.MeshLambertMaterial({
    color: 0x8a6b3e,
    map: woodPlankTexture() ?? undefined,
  });
  const interiorMat = new THREE.MeshLambertMaterial({ color: 0x1c1a16 });
  const width = 10;
  const depth = 8;
  const height = 3.2;
  BUILDING_POSITIONS.forEach(({ x: cx, z: cz }, index) => {
    const base = terrainHeight(cx, cz);
    const building = new THREE.Group();
    // Dark interior shell: door/window gaps reveal a shaded inside instead
    // of see-through boxes, so buildings read as real structures.
    const interior = new THREE.Mesh(
      new THREE.BoxGeometry(width - 1, height, depth - 1),
      interiorMat,
    );
    interior.position.set(cx, base + height / 2, cz);
    building.add(interior);
    const addWall = (x: number, z: number, w: number, h: number, y: number, rotY = 0) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), wallMat);
      wall.position.set(x, base + y + h / 2, z);
      wall.rotation.y = rotY;
      building.add(wall);
    };
    // South wall with a door gap (entry 1)
    addWall(cx - (width / 4 + 0.5), cz - depth / 2, width / 2 - 1, height, 0);
    addWall(cx + (width / 4 + 0.5), cz - depth / 2, width / 2 - 1, height, 0);
    // North wall with shattered windows (sill + top strip)
    addWall(cx, cz + depth / 2, width, 1, 0);
    addWall(cx, cz + depth / 2, width, height - 2.2, 2.2);
    // West wall with a door gap (entry 2)
    addWall(cx - width / 2, cz - (depth / 4 + 0.5), 0.4, height, 0, Math.PI / 2);
    addWall(cx - width / 2, cz + (depth / 4 + 0.5), 0.4, height, 0, Math.PI / 2);
    // East wall with windows
    const eastX = cx + width / 2;
    addWall(eastX, cz, 0.4, 1, 0, Math.PI / 2);
    addWall(eastX, cz, 0.4, height - 2.2, 2.2, Math.PI / 2);
    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.25, depth + 0.6), roofMat);
    roof.position.set(cx, base + height + 0.12, cz);
    building.add(roof);
    // Interior cover crates + partition
    for (let c = 0; c < 3; c += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
      const ox = ((c % 2) - 0.5) * 4;
      const oz = (c - 1) * 2.2;
      crate.position.set(cx + ox, base + 0.55, cz + oz);
      crate.rotation.y = c * 0.7;
      building.add(crate);
    }
    const partition = new THREE.Mesh(new THREE.BoxGeometry(0.3, height * 0.8, 3), wallMat);
    partition.position.set(cx + 1.5, base + (height * 0.8) / 2, cz);
    building.add(partition);
    building.rotation.y = index * 0.9;
    building.userData.buildingIndex = index;
    group.add(building);
  });
  return group;
}

export type ForestChunk = {
  group: THREE.Group;
  treeLods: THREE.LOD[];
  update: (time: number, camera: THREE.Camera) => void;
};

/**
 * Replaces the high-detail LOD level of up to maxTrees procedural trees
 * with real CC0 Quaternius tree models, and scatters real grass/bush
 * props under them. The low-detail cone LOD stays procedural so distant
 * forests keep the 4GB-RAM budget. Returns false when the assets could
 * not be loaded (procedural forest remains).
 */
export async function upgradeForestWithRealTrees(
  forest: ForestChunk,
  maxTrees = 70,
): Promise<boolean> {
  const [common, pine, birch, bush, grass] = await Promise.all([
    loadEnvironmentGltf("nature", NATURE_FILES.treeCommon),
    loadEnvironmentGltf("nature", NATURE_FILES.treePine),
    loadEnvironmentGltf("nature", NATURE_FILES.treeBirch),
    loadEnvironmentGltf("nature", NATURE_FILES.bush),
    loadEnvironmentGltf("nature", NATURE_FILES.grass),
  ]);
  const treeTemplates = [common, pine, birch]
    .filter((gltf): gltf is NonNullable<typeof gltf> => gltf !== null)
    .map((gltf) => gltf.scene);
  if (treeTemplates.length === 0) {
    return false;
  }
  const upgraded = forest.treeLods.slice(0, maxTrees);
  upgraded.forEach((lod, index) => {
    const template = treeTemplates[index % treeTemplates.length];
    const clone = fitModelToSize(template.clone(true), 6.5 + (index % 4), "height");
    clone.traverse((child) => {
      const meshChild = child as THREE.Mesh;
      if (meshChild.isMesh) {
        meshChild.castShadow = true;
      }
    });
    const level = lod.levels[0];
    if (level) {
      if (level.object.parent === lod) {
        lod.remove(level.object);
      }
      level.object = clone;
      lod.add(clone);
    }
  });
  const bushTemplate = bush ? bush.scene : null;
  const grassTemplate = grass ? grass.scene : null;
  upgraded.forEach((lod, index) => {
    const jitterX = ((index * 37) % 100) / 100 - 0.5;
    const jitterZ = ((index * 61) % 100) / 100 - 0.5;
    if (bushTemplate && index % 3 === 0) {
      const bushClone = fitModelToSize(bushTemplate.clone(true), 1.1);
      bushClone.position.set(
        lod.position.x + jitterX * 3,
        lod.position.y,
        lod.position.z + jitterZ * 3,
      );
      forest.group.add(bushClone);
    }
    if (grassTemplate && index % 2 === 0) {
      const grassClone = fitModelToSize(grassTemplate.clone(true), 0.8);
      grassClone.position.set(
        lod.position.x - jitterX * 2.4,
        lod.position.y,
        lod.position.z - jitterZ * 2.4,
      );
      forest.group.add(grassClone);
    }
  });
  return true;
}

/**
 * Replaces procedural dodecahedron rocks with real CC0 rock models
 * (5-13KB each, negligible memory). Keeps positions/rotations/scales.
 */
export async function upgradeRocksWithRealRocks(rocks: THREE.Group): Promise<boolean> {
  const loaded = await Promise.all([
    loadEnvironmentGltf("nature", NATURE_FILES.rock1),
    loadEnvironmentGltf("nature", NATURE_FILES.rock2),
    loadEnvironmentGltf("nature", NATURE_FILES.rock3),
    loadEnvironmentGltf("nature", NATURE_FILES.rock4),
  ]);
  const templates = loaded
    .filter((gltf): gltf is NonNullable<typeof gltf> => gltf !== null)
    .map((gltf) => gltf.scene);
  if (templates.length === 0) {
    return false;
  }
  const previous = [...rocks.children] as THREE.Mesh[];
  previous.forEach((rock, index) => {
    const clone = instantiateEnvironmentModel(templates[index % templates.length]);
    // Match the procedural rock's footprint: the raw upstream scale does
    // not match the dodecahedron sizes used procedurally.
    const originalBox = new THREE.Box3().setFromObject(rock);
    const originalSize = new THREE.Vector3();
    originalBox.getSize(originalSize);
    const target = Math.max(originalSize.x, originalSize.y, originalSize.z);
    fitModelToSize(clone, Math.max(0.8, target));
    clone.position.copy(rock.position);
    clone.rotation.copy(rock.rotation);
    rocks.remove(rock);
    rocks.add(clone);
  });
  return true;
}

/**
 * Replaces the four procedural abandoned houses with real textured CC0
 * building models at the same positions/rotations. Loot spots, obstacles,
 * and all gameplay positions stay untouched.
 */
export async function upgradeBuildingsWithRealModels(
  buildings: THREE.Group,
): Promise<boolean> {
  const loaded = await Promise.all([
    loadEnvironmentGltf("buildings", BUILDING_FILES.house1),
    loadEnvironmentGltf("buildings", BUILDING_FILES.house2),
    loadEnvironmentGltf("buildings", BUILDING_FILES.building1Small),
    loadEnvironmentGltf("buildings", BUILDING_FILES.building2Small),
  ]);
  const templates = loaded
    .filter((gltf): gltf is NonNullable<typeof gltf> => gltf !== null)
    .map((gltf) => gltf.scene);
  if (templates.length === 0) {
    return false;
  }
  BUILDING_POSITIONS.forEach((position, index) => {
    const template = templates[index % templates.length];
    const tagged = buildings.children.find(
      (child) => child.userData.buildingIndex === index,
    );
    if (tagged) {
      buildings.remove(tagged);
    }
    const clone = fitModelToSize(template.clone(true), 9);
    clone.traverse((child) => {
      const meshChild = child as THREE.Mesh;
      if (meshChild.isMesh) {
        meshChild.castShadow = true;
        meshChild.receiveShadow = true;
      }
    });
    clone.position.set(position.x, terrainHeight(position.x, position.z), position.z);
    clone.rotation.y = index * 0.9;
    buildings.add(clone);
  });
  return true;
}
export function createMilitaryCamp(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(555);
  const tentMat = new THREE.MeshLambertMaterial({ color: 0x4d5d43 });
  const barracksMat = new THREE.MeshLambertMaterial({ color: 0x6b6255 });
  const sandbagMat = new THREE.MeshLambertMaterial({ color: 0x9b8b5e });
  const padMat = new THREE.MeshLambertMaterial({ color: 0x55554e });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0x6e4a2f });
  const { x: cx, z: cz } = CAMP_POSITION;
  const base = terrainHeight(cx, cz);
  for (let b = 0; b < 2; b += 1) {
    const barracks = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 4.5), barracksMat);
    barracks.position.set(cx - 7 + b * 14, base + 1.5, cz - 7);
    barracks.rotation.y = b * 0.25;
    group.add(barracks);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 9.4, 3, 1), tentMat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2 + b * 0.25;
    roof.position.set(cx - 7 + b * 14, base + 3.6, cz - 7);
    group.add(roof);
  }
  for (let t = 0; t < 3; t += 1) {
    const angle = (t / 3) * Math.PI * 2 + 0.6;
    const tx = cx + Math.cos(angle) * 11;
    const tz = cz + Math.sin(angle) * 11;
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 6), tentMat);
    tent.position.set(tx, terrainHeight(tx, tz) + 1.4, tz);
    tent.rotation.y = random() * Math.PI;
    group.add(tent);
  }
  for (let s = 0; s < 14; s += 1) {
    const angle = (s / 14) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * 16;
    const sz = cz + Math.sin(angle) * 16;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 0.8), sandbagMat);
    bag.position.set(sx, terrainHeight(sx, sz) + 0.5, sz);
    bag.rotation.y = -angle;
    group.add(bag);
  }
  const pad = new THREE.Mesh(new THREE.CircleGeometry(5, 24), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(cx + 4, base + 0.06, cz + 8);
  group.add(pad);
  const tower = new THREE.Group();
  for (let leg = 0; leg < 4; leg += 1) {
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.5, 0.2), metalMat);
    legMesh.position.set((leg % 2 === 0 ? -1 : 1) * 0.9, 2.75, (leg < 2 ? -1 : 1) * 0.9);
    tower.add(legMesh);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), barracksMat);
  cabin.position.y = 6;
  tower.add(cabin);
  tower.position.set(cx - 12, base, cz + 10);
  group.add(tower);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 9, 5), metalMat);
  mast.position.set(cx + 13, base + 4.5, cz - 2);
  group.add(mast);
  return group;
}

export function createAirport(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(8080);
  const runwayMat = new THREE.MeshLambertMaterial({ color: 0x3c3c40 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d0 });
  const hangarMat = new THREE.MeshLambertMaterial({ color: 0x7d7468 });
  const rustMat = new THREE.MeshLambertMaterial({ color: 0x6e4a2f });
  const wreckMat = new THREE.MeshLambertMaterial({ color: 0x9a9186 });
  const { x: cx, z: cz } = AIRPORT_POSITION;
  const base = terrainHeight(cx, cz);
  const runway = new THREE.Mesh(new THREE.BoxGeometry(52, 0.2, 8), runwayMat);
  runway.position.set(cx, base + 0.12, cz);
  runway.receiveShadow = true;
  group.add(runway);
  for (let s = -5; s <= 5; s += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.5), stripeMat);
    stripe.position.set(cx + s * 4.6, base + 0.24, cz);
    group.add(stripe);
  }
  const hangar = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 12), hangarMat);
  hangar.position.set(cx - 6, base + 3, cz - 14);
  group.add(hangar);
  const hangarRoof = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16.4, 12, 1, false, 0, Math.PI), hangarMat);
  hangarRoof.rotation.z = Math.PI / 2;
  hangarRoof.rotation.y = Math.PI / 2;
  hangarRoof.position.set(cx - 6, base + 6, cz - 14);
  group.add(hangarRoof);
  const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 10, 8), hangarMat);
  towerBase.position.set(cx + 18, base + 5, cz + 12);
  group.add(towerBase);
  const towerCab = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 4), rustMat);
  towerCab.position.set(cx + 18, base + 10.8, cz + 12);
  group.add(towerCab);
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 14, 10), wreckMat);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.rotation.x = 0.18;
  fuselage.position.set(cx + 8, base + 1.2, cz + 3);
  group.add(fuselage);
  const brokenWing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 2.2), wreckMat);
  brokenWing.position.set(cx + 6, base + 0.7, cz + 6);
  brokenWing.rotation.z = 0.5;
  brokenWing.rotation.y = 0.4;
  group.add(brokenWing);
  for (let d = 0; d < 6; d += 1) {
    const debris = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5 + random() * 0.8, 0),
      wreckMat,
    );
    debris.position.set(
      cx + (random() - 0.5) * 30,
      base + 0.4,
      cz + (random() - 0.5) * 20,
    );
    debris.rotation.set(random() * 3, random() * 3, random() * 3);
    group.add(debris);
  }
  return group;
}