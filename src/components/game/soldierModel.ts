import * as THREE from "three";
import {
  bootMaterial,
  clothMaterial,
  gearMaterial,
  hairMaterial,
  lensMaterial,
  metalMaterial,
  skinMaterial,
  type CamoVariant,
} from "@/lib/game/textures";

export type SoldierVariant = CamoVariant;

export type SoldierGender = "male" | "female";

const G = {
  torso: new THREE.BoxGeometry(0.42, 0.52, 0.26),
  hips: new THREE.BoxGeometry(0.38, 0.22, 0.24),
  upperArm: new THREE.CylinderGeometry(0.07, 0.06, 0.3, 8),
  forearm: new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8),
  thigh: new THREE.CylinderGeometry(0.095, 0.08, 0.42, 8),
  shin: new THREE.CylinderGeometry(0.08, 0.065, 0.4, 8),
  boot: new THREE.BoxGeometry(0.14, 0.12, 0.3),
  bootToe: new THREE.BoxGeometry(0.13, 0.07, 0.12),
  head: new THREE.SphereGeometry(0.115, 14, 12),
  helmet: new THREE.SphereGeometry(0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  helmetRim: new THREE.TorusGeometry(0.142, 0.018, 6, 18),
  carrier: new THREE.BoxGeometry(0.4, 0.46, 0.1),
  backPlate: new THREE.BoxGeometry(0.38, 0.42, 0.08),
  mag: new THREE.BoxGeometry(0.07, 0.16, 0.05),
  pouch: new THREE.BoxGeometry(0.12, 0.1, 0.07),
  pack: new THREE.BoxGeometry(0.36, 0.44, 0.2),
  packRoll: new THREE.CylinderGeometry(0.07, 0.07, 0.38, 8),
  antenna: new THREE.CylinderGeometry(0.008, 0.005, 0.5, 5),
  nvg: new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10),
  cup: new THREE.CylinderGeometry(0.05, 0.055, 0.05, 10),
  goggle: new THREE.BoxGeometry(0.2, 0.05, 0.04),
  knee: new THREE.BoxGeometry(0.12, 0.1, 0.05),
  glove: new THREE.SphereGeometry(0.055, 8, 6),
  strip: new THREE.ConeGeometry(0.07, 0.34, 4),
  strap: new THREE.BoxGeometry(0.05, 0.3, 0.02),
  gun: new THREE.BoxGeometry(0.07, 0.1, 0.85),
  radio: new THREE.BoxGeometry(0.07, 0.14, 0.05),
  ponytail: new THREE.CylinderGeometry(0.045, 0.02, 0.34, 6),
  bun: new THREE.SphereGeometry(0.07, 8, 6),
  eyeStrip: new THREE.BoxGeometry(0.16, 0.045, 0.02),
  lens: new THREE.CircleGeometry(0.028, 10),
  band: new THREE.TorusGeometry(0.15, 0.015, 6, 14, Math.PI),
  hose: new THREE.TorusGeometry(0.16, 0.012, 6, 12, Math.PI * 0.8),
};

export type SoldierRig = {
  arms: THREE.Group[];
  elbows: THREE.Group[];
  legs: THREE.Group[];
  torso: THREE.Group;
  head: THREE.Group;
  pouches: THREE.Object3D[];
};

export function makeSoldier(
  color: number,
  variant: SoldierVariant = "woodland",
  gender: SoldierGender = "male",
): THREE.Group {
  const group = new THREE.Group();
  const cloth = clothMaterial(variant);
  const gear = gearMaterial();
  const metal = metalMaterial();
  const skin = skinMaterial();
  const boots = bootMaterial();
  const hair = hairMaterial();
  const lens = lensMaterial();
  void color;

  const hips = new THREE.Mesh(G.hips, cloth);
  hips.position.y = 1.0;
  group.add(hips);

  const torso = new THREE.Group();
  torso.position.y = 1.28;
  const chest = new THREE.Mesh(G.torso, cloth);
  chest.position.y = 0.02;
  const carrier = new THREE.Mesh(G.carrier, gear);
  carrier.position.set(0, 0.06, 0.14);
  const backPlate = new THREE.Mesh(G.backPlate, gear);
  backPlate.position.set(0, 0.05, -0.15);
  torso.add(chest, carrier, backPlate);
  for (let m = 0; m < 3; m += 1) {
    const mag = new THREE.Mesh(G.mag, gear);
    mag.position.set(-0.1 + m * 0.1, 0.02, 0.2);
    mag.rotation.x = -0.12;
    torso.add(mag);
  }
  const radio = new THREE.Mesh(G.radio, gear);
  radio.position.set(-0.19, 0.18, 0.05);
  const antenna = new THREE.Mesh(G.antenna, metal);
  antenna.position.set(-0.19, 0.42, 0.05);
  antenna.rotation.z = 0.15;
  torso.add(radio, antenna);
  for (const sx of [-0.12, 0.12]) {
    const strap = new THREE.Mesh(G.strap, gear);
    strap.position.set(sx, 0.28, 0.02);
    torso.add(strap);
  }
  group.add(torso);

  const pouches: THREE.Object3D[] = [];
  for (const px of [-0.16, 0.16]) {
    const pouch = new THREE.Mesh(G.pouch, gear);
    pouch.position.set(px, 0.98, 0.14);
    pouches.push(pouch);
    group.add(pouch);
  }
  const dump = new THREE.Mesh(G.pouch, gear);
  dump.position.set(0, 0.98, -0.15);
  dump.scale.set(1.2, 1.1, 1);
  pouches.push(dump);
  group.add(dump);

  const pack = new THREE.Mesh(G.pack, gear);
  pack.position.set(0, 1.25, -0.24);
  const roll = new THREE.Mesh(G.packRoll, cloth);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 1.5, -0.26);
  const hose = new THREE.Mesh(G.hose, gear);
  hose.position.set(0.12, 1.4, -0.12);
  hose.rotation.y = Math.PI / 2;
  group.add(pack, roll, hose);

  const arms: THREE.Group[] = [];
  const elbows: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 1.46, 0);
    const upper = new THREE.Mesh(G.upperArm, cloth);
    upper.position.y = -0.15;
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    const fore = new THREE.Mesh(G.forearm, cloth);
    fore.position.y = -0.13;
    const glove = new THREE.Mesh(G.glove, gear);
    glove.position.y = -0.28;
    elbow.add(fore, glove);
    shoulder.add(upper, elbow);
    group.add(shoulder);
    arms.push(shoulder);
    elbows.push(elbow);
  }
  const gun = new THREE.Mesh(G.gun, metal);
  gun.position.set(0, -0.26, 0.14);
  gun.rotation.x = -1.35;
  elbows[1].add(gun);

  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0.92, 0);
    const thigh = new THREE.Mesh(G.thigh, cloth);
    thigh.position.y = -0.21;
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    const shin = new THREE.Mesh(G.shin, cloth);
    shin.position.y = -0.2;
    const pad = new THREE.Mesh(G.knee, gear);
    pad.position.set(0, -0.02, 0.07);
    const boot = new THREE.Mesh(G.boot, boots);
    boot.position.y = -0.44;
    const toe = new THREE.Mesh(G.bootToe, boots);
    toe.position.set(0, -0.47, 0.18);
    knee.add(shin, pad, boot, toe);
    hip.add(thigh, knee);
    group.add(hip);
    legs.push(hip);
  }

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.62;
  const balaclava = new THREE.Mesh(G.head, gear);
  const eyes = new THREE.Mesh(G.eyeStrip, skin);
  eyes.position.set(0, 0.02, 0.1);
  const goggles = new THREE.Mesh(G.goggle, lens);
  goggles.position.set(0, 0.09, 0.1);
  const helmet = new THREE.Mesh(G.helmet, gear);
  helmet.position.y = 0.06;
  const rim = new THREE.Mesh(G.helmetRim, gear);
  rim.position.y = 0.055;
  rim.rotation.x = Math.PI / 2;
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), metal);
  mount.position.set(0, 0.1, 0.12);
  const nvg = new THREE.Mesh(G.nvg, metal);
  nvg.rotation.x = Math.PI / 2;
  nvg.position.set(0, 0.08, 0.2);
  const nvgLens = new THREE.Mesh(G.lens, lens);
  nvgLens.position.set(0, 0.08, 0.262);
  const band = new THREE.Mesh(G.band, gear);
  band.position.y = 0.03;
  const cupL = new THREE.Mesh(G.cup, gear);
  cupL.rotation.z = Math.PI / 2;
  cupL.position.set(-0.15, 0, 0);
  const cupR = cupL.clone();
  cupR.position.x = 0.15;
  headGroup.add(
    balaclava, eyes, goggles, helmet, rim, mount, nvg, nvgLens, band, cupL, cupR,
  );
  group.add(headGroup);

  if (gender === "female") {
    torso.scale.x = 0.88;
    hips.scale.x = 0.92;
    const bun = new THREE.Mesh(G.bun, hair);
    bun.position.set(0, 1.74, -0.12);
    const tail = new THREE.Mesh(G.ponytail, hair);
    tail.position.set(0, 1.56, -0.16);
    tail.rotation.x = 0.25;
    group.add(bun, tail);
  }

  if (variant === "ghillie") {
    for (let s = 0; s < 14; s += 1) {
      const strip = new THREE.Mesh(G.strip, cloth);
      const a = (s / 14) * Math.PI * 2;
      strip.position.set(Math.cos(a) * 0.24, 1.0 + (s % 5) * 0.16, Math.sin(a) * 0.18);
      strip.rotation.z = Math.cos(a) * 0.8;
      strip.rotation.x = Math.sin(a) * 0.8;
      group.add(strip);
    }
  }

  group.traverse((child) => {
    const meshChild = child as THREE.Mesh;
    if (meshChild.isMesh) {
      meshChild.castShadow = true;
    }
  });

  const rig: SoldierRig = { arms, elbows, legs, torso, head: headGroup, pouches };
  group.userData.rig = rig;
  return group;
}

export type SoldierMotion = {
  time: number;
  speed01: number;
  swimming?: boolean;
  driving?: boolean;
  downed?: boolean;
  aiming?: boolean;
  reloading?: boolean;
  jumping?: boolean;
};

export function animateSoldier(group: THREE.Group, motion: SoldierMotion): void {
  const rig = group.userData.rig as SoldierRig | undefined;
  if (!rig) {
    return;
  }
  const t = motion.time;
  const s = Math.max(0, Math.min(1, motion.speed01));
  if (motion.driving) {
    rig.arms.forEach((arm) => {
      arm.rotation.x = -0.9;
    });
    rig.legs.forEach((leg) => {
      leg.rotation.x = -1.2;
    });
    rig.torso.rotation.x = 0.15;
    return;
  }
  if (motion.swimming) {
    rig.arms.forEach((arm, i) => {
      arm.rotation.x = Math.sin(t * 3 + i * Math.PI) * 1.1 - 0.4;
    });
    rig.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * 5 + i * Math.PI) * 0.5;
    });
    rig.torso.rotation.x = 0.9;
    return;
  }
  const swing = Math.sin(t * 9) * 0.6 * s;
  rig.arms[0].rotation.x = swing;
  rig.arms[1].rotation.x = -swing;
  rig.legs[0].rotation.x = -swing;
  rig.legs[1].rotation.x = swing;
  rig.torso.rotation.x = 0.1 * s;
  rig.torso.rotation.z = Math.sin(t * 4.5) * 0.03 * s;
  rig.pouches.forEach((pouch, i) => {
    pouch.rotation.z = Math.sin(t * 7 + i * 1.3) * 0.12 * s;
    pouch.rotation.x = Math.cos(t * 6 + i) * 0.08 * s;
  });
}