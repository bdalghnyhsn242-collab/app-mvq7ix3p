import * as THREE from "three";

export type Obstacle = { x: number; z: number; r: number };

export const ISLAND_RADIUS = 62;
export const PLAY_RADIUS = 68;

/** Deterministic PRNG so the island layout is identical on every run. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Light low-poly island: grass disc, sand ring, water plane, trees, rocks,
 * and houses. All props share a handful of geometries/materials so the
 * whole scene stays cheap on integrated graphics (4GB RAM target).
 */
export function buildIsland(): { group: THREE.Group; obstacles: Obstacle[] } {
  const group = new THREE.Group();
  const obstacles: Obstacle[] = [];

  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(ISLAND_RADIUS, 48),
    new THREE.MeshLambertMaterial({ color: 0x4e8c4a }),
  );
  grass.rotation.x = -Math.PI / 2;
  group.add(grass);

  const sand = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 1, PLAY_RADIUS + 8, 48),
    new THREE.MeshLambertMaterial({ color: 0xd9c98d }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.02;
  group.add(sand);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(320, 48),
    new THREE.MeshLambertMaterial({
      color: 0x3b7fc4,
      transparent: true,
      opacity: 0.92,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.35;
  group.add(water);

  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.3, 6);
  const leafGeo = new THREE.ConeGeometry(0.95, 2.1, 7);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b34 });
  const rockGeo = new THREE.IcosahedronGeometry(0.7, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });

  const rand = lcg(20260504);
  for (let i = 0; i < 42; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * (ISLAND_RADIUS - 14);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const scale = 0.8 + rand() * 0.6;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.65;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = 2.1;
    tree.add(trunk, leaf);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    group.add(tree);
    obstacles.push({ x, z, r: 0.55 * scale });
  }

  for (let i = 0; i < 14; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 10 + rand() * (ISLAND_RADIUS - 16);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const scale = 0.7 + rand() * 0.9;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.3 * scale, z);
    rock.scale.setScalar(scale);
    rock.rotation.y = rand() * Math.PI;
    group.add(rock);
    obstacles.push({ x, z, r: 0.8 * scale });
  }

  const wallMat = new THREE.MeshLambertMaterial({ color: 0xcfc4ae });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a4a3a });
  const wallGeo = new THREE.BoxGeometry(4.2, 2.6, 3.6);
  const roofGeo = new THREE.ConeGeometry(3.3, 1.6, 4);
  for (const [hx, hz] of [
    [18, 8],
    [-20, 14],
    [10, -24],
    [-16, -18],
  ] as const) {
    const house = new THREE.Group();
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.3;
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.4;
    roof.rotation.y = Math.PI / 4;
    house.add(wall, roof);
    house.position.set(hx, 0, hz);
    group.add(house);
    obstacles.push({ x: hx, z: hz, r: 2.9 });
  }

  return { group, obstacles };
}