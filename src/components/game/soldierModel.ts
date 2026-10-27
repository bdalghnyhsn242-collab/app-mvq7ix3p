import * as THREE from "three";

export type SoldierVariant = "woodland" | "desert" | "ghillie";

export function makeSoldier(color: number, variant: SoldierVariant = "woodland"): THREE.Group {
  const group = new THREE.Group();
  const clothColor = variant === "desert" ? 0xc2a36b : variant === "ghillie" ? 0x3d5a2a : color;
  const cloth = new THREE.MeshLambertMaterial({ color: clothColor });
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
  const nvg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), metal);
  nvg.rotation.x = Math.PI / 2;
  nvg.position.set(0, 1.86, 0.42);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), metal);
  goggles.position.set(0, 1.74, 0.28);
  const headsetL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.14), gear);
  headsetL.position.set(-0.32, 1.72, 0);
  const headsetR = headsetL.clone();
  headsetR.position.x = 0.32;

  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1), metal);
  gun.position.set(0.3, 1.1, 0.5);
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.12), gear);
  magazine.position.set(0.3, 0.92, 0.42);

  group.add(
    body, vest, plate, pouchA, pouchB, backpack,
    head, helmet, mount, nvg, goggles, headsetL, headsetR, gun, magazine,
  );
  if (variant === "ghillie") {
    const stripMat = new THREE.MeshLambertMaterial({ color: 0x2f4a1f, flatShading: true });
    for (let s = 0; s < 7; s += 1) {
      const strip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 4), stripMat);
      const a = (s / 7) * Math.PI * 2;
      strip.position.set(Math.cos(a) * 0.42, 0.85 + (s % 3) * 0.28, Math.sin(a) * 0.3);
      strip.rotation.z = Math.cos(a) * 0.9;
      strip.rotation.x = Math.sin(a) * 0.9;
      group.add(strip);
    }
  }
  return group;
}