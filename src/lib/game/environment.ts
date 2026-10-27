import * as THREE from "three";
import {
  BUILDING_POSITIONS,
  ISLAND_RADIUS,
  forestDensity,
  terrainHeight,
} from "./battleRoyale";

export function createTerrain(): THREE.Mesh {
  const size = ISLAND_RADIUS * 2.6;
  const geometry = new THREE.PlaneGeometry(size, size, 150, 150);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const sand = new THREE.Color(0xd9c08a);
  const grass = new THREE.Color(0x4d8f4d);
  const rock = new THREE.Color(0x8a8378);
  const mud = new THREE.Color(0x6b5a3e);
  const snow = new THREE.Color(0xf2f5f7);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = terrainHeight(x, z);
    position.setY(i, h);
    const dist = Math.hypot(x, z);
    if (h < 0.15 && dist < ISLAND_RADIUS - 2) {
      color.copy(mud);
    } else if (h < 0.6) {
      color.copy(sand);
    } else if (h < 9) {
      color.copy(grass).lerp(sand, Math.max(0, (0.6 - h) / 0.6 + 0.1));
    } else {
      color.copy(rock).lerp(grass, Math.max(0, (14 - h) / 5));
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
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
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
} {
  const group = new THREE.Group();
  const random = seededRandom(9021);
  const foliage: THREE.Mesh[] = [];
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
    placed += 1;
  }
  return {
    group,
    update: (time: number, camera: THREE.Camera) => {
      for (let i = 0; i < foliage.length; i += 1) {
        foliage[i].rotation.z = Math.sin(time * 1.6 + i * 0.7) * 0.05;
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
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x9a9186 });
  const rustMaterial = new THREE.MeshLambertMaterial({ color: 0x7a4a32 });
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

export function createCheckpoints(): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(777);
  const concrete = new THREE.MeshLambertMaterial({ color: 0x8d8d85 });
  const sandbag = new THREE.MeshLambertMaterial({ color: 0x9b8b5e });
  const rust = new THREE.MeshLambertMaterial({ color: 0x6e4a2f });
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
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xa89f8d });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x6e4a2f });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6b3e });
  const width = 10;
  const depth = 8;
  const height = 3.2;
  BUILDING_POSITIONS.forEach(({ x: cx, z: cz }, index) => {
    const base = terrainHeight(cx, cz);
    const building = new THREE.Group();
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
    group.add(building);
  });
  return group;
}