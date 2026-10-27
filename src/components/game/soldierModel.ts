import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const combined = mergeGeometries(parts);
  return combined ?? parts[0]!;
}

/** One hand = palm + 4 fingers + thumb merged into a single draw call. */
function buildHandGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const palm = new THREE.BoxGeometry(0.075, 0.09, 0.05);
  palm.translate(0, -0.04, 0);
  parts.push(palm);
  for (let i = 0; i < 4; i += 1) {
    const finger = new THREE.BoxGeometry(0.013, 0.052, 0.016);
    finger.translate(-0.027 + i * 0.018, -0.108, 0.004);
    parts.push(finger);
  }
  const thumb = new THREE.BoxGeometry(0.014, 0.046, 0.016);
  thumb.rotateZ(0.55);
  thumb.translate(0.043, -0.07, 0.014);
  parts.push(thumb);
  return merged(parts);
}

/** One boot = upper + sole + toe cap merged into a single draw call. */
function buildBootGeometry(): THREE.BufferGeometry {
  const upper = new THREE.BoxGeometry(0.13, 0.11, 0.28);
  upper.translate(0, 0.055, -0.01);
  const sole = new THREE.BoxGeometry(0.145, 0.035, 0.3);
  sole.translate(0, -0.017, 0);
  const toe = new THREE.BoxGeometry(0.12, 0.06, 0.09);
  toe.translate(0, 0.01, 0.16);
  return merged([upper, sole, toe]);
}

/** Three MOLLE webbing rows merged into one mesh for the plate carrier. */
function buildMolleGeometry(): THREE.BufferGeometry {
  const rows: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i += 1) {
    const row = new THREE.BoxGeometry(0.36, 0.03, 0.02);
    row.translate(0, 0.16 - i * 0.13, 0);
    rows.push(row);
  }
  return merged(rows);
}

const G = {
  torso: new THREE.BoxGeometry(0.42, 0.52, 0.26),
  hips: new THREE.BoxGeometry(0.38, 0.22, 0.24),
  upperArm: new THREE.CylinderGeometry(0.07, 0.06, 0.3, 8),
  forearm: new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8),
  thigh: new THREE.CylinderGeometry(0.095, 0.08, 0.42, 8),
  shin: new THREE.CylinderGeometry(0.08, 0.065, 0.4, 8),
  skull: new THREE.SphereGeometry(0.115, 16, 14),
  jaw: new THREE.BoxGeometry(0.13, 0.08, 0.1),
  nose: new THREE.ConeGeometry(0.02, 0.055, 6),
  ear: new THREE.SphereGeometry(0.025, 6, 6),
  eye: new THREE.SphereGeometry(0.016, 8, 6),
  brow: new THREE.BoxGeometry(0.05, 0.012, 0.02),
  mouth: new THREE.BoxGeometry(0.05, 0.008, 0.01),
  facePaint: new THREE.BoxGeometry(0.035, 0.018, 0.006),
  helmet: new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2 + 0.4),
  helmetBand: new THREE.TorusGeometry(0.148, 0.02, 6, 18),
  chinStrap: new THREE.BoxGeometry(0.018, 0.14, 0.012),
  strap: new THREE.BoxGeometry(0.05, 0.3, 0.02),
  nvg: new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10),
  nvgLens: new THREE.CircleGeometry(0.028, 10),
  mount: new THREE.BoxGeometry(0.06, 0.05, 0.05),
  goggle: new THREE.BoxGeometry(0.2, 0.05, 0.04),
  cup: new THREE.CylinderGeometry(0.05, 0.055, 0.05, 10),
  vestFront: new THREE.BoxGeometry(0.4, 0.44, 0.07),
  vestBack: new THREE.BoxGeometry(0.4, 0.44, 0.06),
  mag: new THREE.BoxGeometry(0.07, 0.16, 0.05),
  ifak: new THREE.BoxGeometry(0.1, 0.08, 0.06),
  radio: new THREE.BoxGeometry(0.07, 0.14, 0.05),
  antenna: new THREE.CylinderGeometry(0.008, 0.005, 0.5, 5),
  belt: new THREE.BoxGeometry(0.42, 0.07, 0.28),
  holster: new THREE.BoxGeometry(0.09, 0.16, 0.07),
  pouch: new THREE.BoxGeometry(0.12, 0.1, 0.07),
  pack: new THREE.BoxGeometry(0.36, 0.44, 0.22),
  packRoll: new THREE.CylinderGeometry(0.07, 0.07, 0.38, 8),
  sidePouch: new THREE.BoxGeometry(0.1, 0.18, 0.12),
  hose: new THREE.TorusGeometry(0.16, 0.012, 6, 12, Math.PI * 0.8),
  knee: new THREE.BoxGeometry(0.12, 0.1, 0.05),
  ankle: new THREE.CylinderGeometry(0.075, 0.085, 0.08, 8),
  cuff: new THREE.CylinderGeometry(0.055, 0.06, 0.06, 8),
  strip: new THREE.ConeGeometry(0.07, 0.34, 4),
  ponytail: new THREE.CylinderGeometry(0.045, 0.02, 0.34, 6),
  bun: new THREE.SphereGeometry(0.07, 8, 6),
  receiver: new THREE.BoxGeometry(0.06, 0.09, 0.5),
  barrel: new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8),
  handguard: new THREE.BoxGeometry(0.05, 0.06, 0.22),
  rifleMag: new THREE.BoxGeometry(0.045, 0.14, 0.07),
  stock: new THREE.BoxGeometry(0.05, 0.1, 0.18),
  grip: new THREE.BoxGeometry(0.04, 0.09, 0.05),
  scope: new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8),
  foregrip: new THREE.CylinderGeometry(0.02, 0.02, 0.09, 6),
};

// Bake the head shape once: slightly taller skull, forward-pointing nose.
G.skull.scale(1, 1.12, 1.02);
G.nose.rotateX(Math.PI / 2);

const HAND_GEO = buildHandGeometry();
const BOOT_GEO = buildBootGeometry();
const MOLLE_GEO = buildMolleGeometry();

export type SoldierRig = {
  arms: THREE.Group[];
  elbows: THREE.Group[];
  legs: THREE.Group[];
  torso: THREE.Group;
  head: THREE.Group;
  pouches: THREE.Object3D[];
  hands: THREE.Mesh[];
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
  const vestFront = new THREE.Mesh(G.vestFront, gear);
  vestFront.position.set(0, 0.05, 0.15);
  const vestBack = new THREE.Mesh(G.vestBack, gear);
  vestBack.position.set(0, 0.05, -0.15);
  const molle = new THREE.Mesh(MOLLE_GEO, gear);
  molle.position.set(0, 0.05, 0.195);
  torso.add(chest, vestFront, vestBack, molle);
  for (let m = 0; m < 3; m += 1) {
    const mag = new THREE.Mesh(G.mag, gear);
    mag.position.set(-0.1 + m * 0.1, 0.02, 0.21);
    mag.rotation.x = -0.12;
    torso.add(mag);
  }
  const ifak = new THREE.Mesh(G.ifak, gear);
  ifak.position.set(0.15, -0.13, 0.2);
  const radio = new THREE.Mesh(G.radio, gear);
  radio.position.set(-0.19, 0.18, 0.05);
  const antenna = new THREE.Mesh(G.antenna, metal);
  antenna.position.set(-0.19, 0.42, 0.05);
  antenna.rotation.z = 0.15;
  torso.add(ifak, radio, antenna);
  for (const sx of [-0.12, 0.12]) {
    const strap = new THREE.Mesh(G.strap, gear);
    strap.position.set(sx, 0.28, 0.02);
    torso.add(strap);
  }
  group.add(torso);

  const belt = new THREE.Mesh(G.belt, gear);
  belt.position.set(0, 1.04, 0);
  const holster = new THREE.Mesh(G.holster, gear);
  holster.position.set(0.2, 0.94, 0.06);
  group.add(belt, holster);

  const pouches: THREE.Object3D[] = [];
  for (const px of [-0.16, 0.16]) {
    const pouch = new THREE.Mesh(G.pouch, gear);
    pouch.position.set(px, 0.98, 0.14);
    pouches.push(pouch);
    group.add(pouch);
  }
  const dump = new THREE.Mesh(G.pouch, gear);
  dump.position.set(0, 1.0, -0.16);
  dump.scale.set(1.2, 1.1, 1);
  pouches.push(dump);
  group.add(dump);

  const pack = new THREE.Mesh(G.pack, gear);
  pack.position.set(0, 1.25, -0.26);
  const roll = new THREE.Mesh(G.packRoll, cloth);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 1.5, -0.28);
  const hose = new THREE.Mesh(G.hose, gear);
  hose.position.set(0.12, 1.4, -0.12);
  hose.rotation.y = Math.PI / 2;
  group.add(pack, roll, hose);
  for (const px of [-0.2, 0.2]) {
    const side = new THREE.Mesh(G.sidePouch, gear);
    side.position.set(px, 1.2, -0.26);
    group.add(side);
  }

  const arms: THREE.Group[] = [];
  const elbows: THREE.Group[] = [];
  const hands: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 1.46, 0);
    const upper = new THREE.Mesh(G.upperArm, cloth);
    upper.position.y = -0.15;
    const cuff = new THREE.Mesh(G.cuff, gear);
    cuff.position.y = -0.29;
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    const fore = new THREE.Mesh(G.forearm, cloth);
    fore.position.y = -0.13;
    const hand = new THREE.Mesh(HAND_GEO, skin);
    hand.position.y = -0.3;
    elbow.add(fore, hand);
    shoulder.add(upper, cuff, elbow);
    group.add(shoulder);
    arms.push(shoulder);
    elbows.push(elbow);
    hands.push(hand);
  }

  const rifle = new THREE.Group();
  const receiver = new THREE.Mesh(G.receiver, metal);
  const barrel = new THREE.Mesh(G.barrel, metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.42);
  const handguard = new THREE.Mesh(G.handguard, gear);
  handguard.position.set(0, 0.005, 0.3);
  const rifleMag = new THREE.Mesh(G.rifleMag, metal);
  rifleMag.position.set(0, -0.1, 0.06);
  rifleMag.rotation.x = 0.18;
  const stock = new THREE.Mesh(G.stock, gear);
  stock.position.set(0, -0.01, -0.32);
  const grip = new THREE.Mesh(G.grip, gear);
  grip.position.set(0, -0.08, -0.1);
  grip.rotation.x = 0.35;
  const scope = new THREE.Mesh(G.scope, metal);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.08, 0.05);
  const scopeLens = new THREE.Mesh(G.nvgLens, lens);
  scopeLens.position.set(0, 0.08, 0.115);
  const foregrip = new THREE.Mesh(G.foregrip, gear);
  foregrip.position.set(0, -0.06, 0.32);
  rifle.add(
    receiver, barrel, handguard, rifleMag, stock, grip, scope, scopeLens, foregrip,
  );
  rifle.position.set(0, -0.28, 0.16);
  rifle.rotation.x = -1.35;
  elbows[1].add(rifle);

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
    const boot = new THREE.Mesh(BOOT_GEO, boots);
    boot.position.y = -0.44;
    const ankle = new THREE.Mesh(G.ankle, gear);
    ankle.position.y = -0.36;
    knee.add(shin, pad, boot, ankle);
    hip.add(thigh, knee);
    group.add(hip);
    legs.push(hip);
  }

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.62;
  const skull = new THREE.Mesh(G.skull, skin);
  const jaw = new THREE.Mesh(G.jaw, skin);
  jaw.position.set(0, -0.06, 0.04);
  const nose = new THREE.Mesh(G.nose, skin);
  nose.position.set(0, -0.005, 0.115);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(G.ear, skin);
    ear.position.set(sx * 0.112, 0.005, 0);
    ear.scale.set(0.6, 1, 0.8);
    headGroup.add(ear);
    const eye = new THREE.Mesh(G.eye, gear);
    eye.position.set(sx * 0.045, 0.03, 0.098);
    headGroup.add(eye);
    const brow = new THREE.Mesh(G.brow, hair);
    brow.position.set(sx * 0.045, 0.056, 0.1);
    headGroup.add(brow);
    const paint = new THREE.Mesh(G.facePaint, cloth);
    paint.position.set(sx * 0.055, 0.012, 0.104);
    headGroup.add(paint);
    const chinStrap = new THREE.Mesh(G.chinStrap, gear);
    chinStrap.position.set(sx * 0.06, -0.06, 0.03);
    headGroup.add(chinStrap);
    const cup = new THREE.Mesh(G.cup, gear);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx * 0.15, 0, 0);
    headGroup.add(cup);
  }
  const mouth = new THREE.Mesh(G.mouth, hair);
  mouth.position.set(0, -0.048, 0.102);
  const helmet = new THREE.Mesh(G.helmet, cloth);
  helmet.position.y = 0.055;
  const band = new THREE.Mesh(G.helmetBand, gear);
  band.position.y = 0.02;
  band.rotation.x = Math.PI / 2;
  const mount = new THREE.Mesh(G.mount, metal);
  mount.position.set(0, 0.1, 0.12);
  const nvg = new THREE.Mesh(G.nvg, metal);
  nvg.rotation.x = Math.PI / 2;
  nvg.position.set(0, 0.08, 0.2);
  const nvgLens = new THREE.Mesh(G.nvgLens, lens);
  nvgLens.position.set(0, 0.08, 0.262);
  const goggles = new THREE.Mesh(G.goggle, lens);
  goggles.position.set(0, 0.1, 0.13);
  headGroup.add(
    skull, jaw, nose, mouth, helmet, band, mount, nvg, nvgLens, goggles,
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

  const rig: SoldierRig = { arms, elbows, legs, torso, head: headGroup, pouches, hands };
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
    rig.elbows.forEach((elbow) => {
      elbow.rotation.x = -0.4;
    });
    rig.legs.forEach((leg) => {
      leg.rotation.x = -1.2;
    });
    rig.torso.rotation.set(0.15, 0, 0);
    rig.head.rotation.set(0, 0, 0);
    return;
  }
  if (motion.swimming) {
    rig.arms.forEach((arm, i) => {
      arm.rotation.x = Math.sin(t * 3 + i * Math.PI) * 1.1 - 0.4;
      arm.rotation.z = 0;
    });
    rig.elbows.forEach((elbow) => {
      elbow.rotation.x = -0.3;
    });
    rig.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * 5 + i * Math.PI) * 0.5;
    });
    rig.torso.rotation.set(0.9, 0, 0);
    rig.head.rotation.set(-0.5, 0, 0);
    return;
  }
  const swing = Math.sin(t * 9) * 0.6 * s;
  const aiming = Boolean(motion.aiming) && s < 0.55;
  if (aiming) {
    // Rifle-ready pose: support arm bent under the handguard.
    rig.arms[0].rotation.x = -1.25;
    rig.arms[1].rotation.x = -1.38;
    rig.arms[1].rotation.z = -0.15;
    rig.elbows[0].rotation.x = -0.55;
    rig.elbows[1].rotation.x = -0.2;
  } else {
    rig.arms[0].rotation.x = swing + (motion.reloading ? 0.5 : 0);
    rig.arms[1].rotation.x = -swing + (motion.reloading ? 0.5 : 0);
    rig.arms[1].rotation.z = 0;
    rig.elbows[0].rotation.x = -0.2 - 0.15 * s;
    rig.elbows[1].rotation.x = -0.2 - 0.15 * s;
  }
  if (motion.jumping) {
    rig.legs[0].rotation.x = -0.55;
    rig.legs[1].rotation.x = -0.55;
  } else {
    rig.legs[0].rotation.x = -swing;
    rig.legs[1].rotation.x = swing;
  }
  rig.torso.rotation.x = 0.1 * s + Math.sin(t * 1.8) * 0.02 * (1 - s);
  rig.torso.rotation.z = Math.sin(t * 4.5) * 0.03 * s;
  rig.head.rotation.x = motion.reloading ? 0.28 : -0.05 * s;
  rig.head.rotation.y = Math.sin(t * 0.7) * 0.08 * (1 - s);
  rig.pouches.forEach((pouch, i) => {
    pouch.rotation.z = Math.sin(t * 7 + i * 1.3) * 0.12 * s;
    pouch.rotation.x = Math.cos(t * 6 + i) * 0.08 * s;
  });
}