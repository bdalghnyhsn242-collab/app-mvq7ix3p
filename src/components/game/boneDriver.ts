import * as THREE from "three";

/**
 * Generic humanoid bone driver.
 *
 * Real GLB characters often ship without clips that match our tactical
 * state machine. Instead of falling back to primitive boxes, this driver
 * animates any skinned humanoid by bone-name heuristics (mixamo-style,
 * Godot-library style, and Quaternius naming all match), applying delta
 * rotations on top of each bone's rest pose so arbitrary rigs stay valid.
 */

type Side = "left" | "right" | "center";

type HumanoidBones = {
  hips: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  head: THREE.Object3D | null;
  arms: Record<Side, THREE.Object3D | null>;
  forearms: Record<Side, THREE.Object3D | null>;
  thighs: Record<Side, THREE.Object3D | null>;
  shins: Record<Side, THREE.Object3D | null>;
};

type BoneRecord = {
  bone: THREE.Object3D;
  rest: THREE.Quaternion;
};

type RigCache = {
  bones: HumanoidBones;
  records: BoneRecord[];
};

const rigCache = new WeakMap<THREE.Object3D, RigCache>();

function sideOf(name: string): Side {
  if (/left|\.l$|_l$|lft/i.test(name)) {
    return "left";
  }
  if (/right|\.r$|_r$|rgt/i.test(name)) {
    return "right";
  }
  return "center";
}

function isBoneLike(object: THREE.Object3D): boolean {
  return Boolean((object as THREE.Bone).isBone) || object.type === "Bone";
}

function firstMatch(bones: THREE.Object3D[], pattern: RegExp): THREE.Object3D | null {
  return bones.find((bone) => pattern.test(bone.name)) ?? null;
}

function collectHumanoidBones(root: THREE.Object3D): RigCache | null {
  const cached = rigCache.get(root);
  if (cached) {
    return cached;
  }
  const found: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (isBoneLike(child) && !/armature/i.test(child.name)) {
      found.push(child);
    }
  });
  if (found.length < 4) {
    rigCache.set(root, { bones: emptyBones(), records: [] });
    return rigCache.get(root) ?? null;
  }
  const bySide = (pattern: RegExp): Record<Side, THREE.Object3D | null> => {
    const matches = found.filter((bone) => pattern.test(bone.name));
    const pick = (side: Side) =>
      matches.find((bone) => sideOf(bone.name) === side) ?? null;
    return { left: pick("left"), right: pick("right"), center: pick("center") };
  };
  const forearmMatches = found.filter((bone) => /forearm|lowerarm|elbow/i.test(bone.name));
  const arms: Record<Side, THREE.Object3D | null> = {
    left: null,
    right: null,
    center: null,
  };
  for (const bone of found) {
    if (!/arm/i.test(bone.name) || /forearm|lowerarm/i.test(bone.name)) {
      continue;
    }
    const side = sideOf(bone.name);
    if (!arms[side]) {
      arms[side] = bone;
    }
  }
  const thighMatches = found.filter((bone) => /thigh|upleg|upperleg/i.test(bone.name));
  const shinMatches = found.filter(
    (bone) => /shin|calf|lowerleg|leg/i.test(bone.name) && !thighMatches.includes(bone),
  );
  const pickSide = (matches: THREE.Object3D[]): Record<Side, THREE.Object3D | null> => ({
    left: matches.find((bone) => sideOf(bone.name) === "left") ?? null,
    right: matches.find((bone) => sideOf(bone.name) === "right") ?? null,
    center: matches.find((bone) => sideOf(bone.name) === "center") ?? null,
  });
  const bones: HumanoidBones = {
    hips: firstMatch(found, /hips|pelvis/i),
    spine: firstMatch(found, /spine|chest|torso|upperbody/i),
    head: firstMatch(found, /head|neck/i),
    arms,
    forearms: {
      left: forearmMatches.find((bone) => sideOf(bone.name) === "left") ?? null,
      right: forearmMatches.find((bone) => sideOf(bone.name) === "right") ?? null,
      center: null,
    },
    thighs: pickSide(thighMatches),
    shins: pickSide(shinMatches),
  };
  const records: BoneRecord[] = [];
  const track = (bone: THREE.Object3D | null) => {
    if (bone) {
      records.push({ bone, rest: bone.quaternion.clone() });
    }
  };
  track(bones.hips);
  track(bones.spine);
  track(bones.head);
  for (const side of ["left", "right", "center"] as Side[]) {
    track(bones.arms[side]);
    track(bones.forearms[side]);
    track(bones.thighs[side]);
    track(bones.shins[side]);
  }
  const cache: RigCache = { bones, records };
  rigCache.set(root, cache);
  return cache;
}

function emptyBones(): HumanoidBones {
  return {
    hips: null,
    spine: null,
    head: null,
    arms: { left: null, right: null, center: null },
    forearms: { left: null, right: null, center: null },
    thighs: { left: null, right: null, center: null },
    shins: { left: null, right: null, center: null },
  };
}

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const delta = new THREE.Quaternion();

/** Applies a delta rotation on top of the bone's rest pose. */
function rotate(record: BoneRecord, axis: THREE.Vector3, angle: number): void {
  if (!record.bone || angle === 0) {
    return;
  }
  delta.setFromAxisAngle(axis, angle);
  record.bone.quaternion.copy(record.rest).multiply(delta);
}

export type HumanoidMotion = {
  time: number;
  speed01: number;
  swimming?: boolean;
  driving?: boolean;
  downed?: boolean;
  aiming?: boolean;
  reloading?: boolean;
  jumping?: boolean;
};

/**
 * Animates a skinned humanoid root. Returns false when the rig has no
 * recognizable humanoid bones (caller keeps its own fallback).
 */
export function driveHumanoidBones(root: THREE.Object3D, motion: HumanoidMotion): boolean {
  const cache = collectHumanoidBones(root);
  if (!cache || cache.records.length === 0) {
    return false;
  }
  const { bones, records } = cache;
  // Restore rest poses first so poses never accumulate between frames.
  for (const record of records) {
    record.bone.quaternion.copy(record.rest);
  }
  const t = motion.time;
  const s = Math.max(0, Math.min(1, motion.speed01));
  const swing = Math.sin(t * 9) * 0.65 * s;

  if (bones.spine) {
    rotate(records.find((r) => r.bone === bones.spine)!, AXIS_X, 0.08 * s + Math.sin(t * 2) * 0.02 * (1 - s));
  }
  if (bones.hips) {
    rotate(records.find((r) => r.bone === bones.hips)!, AXIS_Z, Math.sin(t * 4.5) * 0.04 * s);
  }

  const armFor = (side: "left" | "right") => {
    const bone = bones.arms[side] ?? bones.arms.center;
    return bone ? records.find((r) => r.bone === bone) ?? null : null;
  };
  const forearmFor = (side: "left" | "right") => {
    const bone = bones.forearms[side];
    return bone ? records.find((r) => r.bone === bone) ?? null : null;
  };
  const thighFor = (side: "left" | "right") => {
    const bone = bones.thighs[side] ?? bones.thighs.center;
    return bone ? records.find((r) => r.bone === bone) ?? null : null;
  };
  const shinFor = (side: "left" | "right") => {
    const bone = bones.shins[side] ?? bones.shins.center;
    return bone ? records.find((r) => r.bone === bone) ?? null : null;
  };

  if (motion.driving) {
    for (const side of ["left", "right"] as const) {
      const thigh = thighFor(side);
      const shin = shinFor(side);
      const arm = armFor(side);
      if (thigh) {
        rotate(thigh, AXIS_X, -1.35);
      }
      if (shin) {
        rotate(shin, AXIS_X, 1.15);
      }
      if (arm) {
        rotate(arm, AXIS_X, -0.75);
      }
    }
    return true;
  }

  if (motion.swimming) {
    if (bones.spine) {
      rotate(records.find((r) => r.bone === bones.spine)!, AXIS_X, 0.85);
    }
    const armL = armFor("left");
    const armR = armFor("right");
    if (armL) {
      rotate(armL, AXIS_X, Math.sin(t * 3) * 1.15 - 0.5);
    }
    if (armR) {
      rotate(armR, AXIS_X, Math.sin(t * 3 + Math.PI) * 1.15 - 0.5);
    }
    for (const side of ["left", "right"] as const) {
      const thigh = thighFor(side);
      if (thigh) {
        rotate(thigh, AXIS_X, Math.sin(t * 5 + (side === "left" ? 0 : Math.PI)) * 0.5);
      }
    }
    return true;
  }

  if (motion.downed) {
    const armL = armFor("left");
    const armR = armFor("right");
    if (armL) {
      rotate(armL, AXIS_X, -1.1 + Math.sin(t * 5) * 0.5);
    }
    if (armR) {
      rotate(armR, AXIS_X, -1.1 + Math.sin(t * 5 + Math.PI) * 0.5);
    }
    const thighL = thighFor("left");
    if (thighL) {
      rotate(thighL, AXIS_X, Math.sin(t * 4) * 0.25);
    }
    return true;
  }

  const aiming = Boolean(motion.aiming) && s < 0.55;
  const armL = armFor("left");
  const armR = armFor("right");
  if (aiming) {
    // Rifle-ready pose: both arms forward, right arm carrying the weapon.
    if (armR) {
      rotate(armR, AXIS_X, -1.42);
      rotate(armR, AXIS_Z, -0.12);
    }
    if (armL) {
      rotate(armL, AXIS_X, -1.28);
      rotate(armL, AXIS_Z, 0.35);
    }
    const foreR = forearmFor("right");
    if (foreR) {
      rotate(foreR, AXIS_X, -0.35);
    }
  } else {
    if (armL) {
      rotate(armL, AXIS_X, swing + (motion.reloading ? 0.55 : 0));
    }
    if (armR) {
      rotate(armR, AXIS_X, -swing + (motion.reloading ? 0.55 : 0));
    }
  }
  const foreL = forearmFor("left");
  const foreR2 = forearmFor("right");
  if (foreL) {
    rotate(foreL, AXIS_X, aiming ? -0.55 : -0.25 * s);
  }
  if (foreR2) {
    rotate(foreR2, AXIS_X, aiming ? -0.3 : -0.25 * s);
  }

  for (const side of ["left", "right"] as const) {
    const thigh = thighFor(side);
    const shin = shinFor(side);
    const phase = side === "left" ? 1 : -1;
    if (motion.jumping) {
      if (thigh) {
        rotate(thigh, AXIS_X, -0.55);
      }
      if (shin) {
        rotate(shin, AXIS_X, 0.85);
      }
    } else {
      if (thigh) {
        rotate(thigh, AXIS_X, -swing * phase);
      }
      if (shin) {
        rotate(shin, AXIS_X, Math.max(0, Math.sin(t * 9 + (phase > 0 ? 0.9 : 0.9 + Math.PI))) * 0.7 * s);
      }
    }
  }

  if (bones.head) {
    rotate(records.find((r) => r.bone === bones.head)!, AXIS_X, motion.reloading ? 0.3 : -0.05 * s);
  }
  return true;
}