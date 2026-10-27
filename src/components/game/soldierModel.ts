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
  pouch: new THREE THREE.BoxGeometry(0.12, 0.1, 0.07),
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