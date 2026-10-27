import * as THREE from "three";

export function makeSoldier(color: number): THREE.Group {
  const group = new THREE.Group();
  const cloth = new THREE.MeshLambertMaterial({ color });
  const gear = new THREE.MeshLambertMaterial({ color: 0x2b2f33 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x4a4f55 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xf1c27d });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), cloth);
  body.position.y = 0.9;

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.62, 0.5), gear);
  vest.position.y = 1.05;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.08), metal);
  plate.position.set(0, 1.08, 0.27);
  const pouchA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.12), gear);
  pouchA.position.set(-0.22, 0.82, 0.28);
  const pouchB = pouchA.clone();
  pouchB.position.x = 0.22;
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), gear);
  backpack.position.set(0, 1.05, -0.36);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skin);
  head.position.y = 1.7;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), gear);
  helmet.position.y = 1.72;
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.16), metal);
  mount.position.set(0, 1.86, 0.3);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), metal);
  goggles.position.set(0, 1.74, 0.28);

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1), metal);
  gun.position.set(0.3, 1.1, 0.5);
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.12), gear);
  magazine.position.set(0.3, 0.92, 0.42);

  group.add(
    body, vest, plate, pouchA, pouchB, backpack,
    head, helmet, mount, goggles, gun, magazine,
  );
  return group;
}