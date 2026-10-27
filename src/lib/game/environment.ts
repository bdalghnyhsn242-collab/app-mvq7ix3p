import * as THREE from "three";
import { ISLAND_RADIUS, forestDensity, terrainHeight } from "./battleRoyale";

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