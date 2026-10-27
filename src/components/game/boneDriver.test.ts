import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { driveHumanoidBones } from "./boneDriver";

function makeHumanoid(): THREE.Group {
  const root = new THREE.Group();
  const hips = new THREE.Bone();
  hips.name = "Hips";
  const spine = new THREE.Bone();
  spine.name = "Spine";
  const head = new THREE.Bone();
  head.name = "Head";
  const armL = new THREE.Bone();
  armL.name = "LeftArm";
  const armR = new THREE.Bone();
  armR.name = "RightArm";
  const foreL = new THREE.Bone();
  foreL.name = "LeftForeArm";
  const thighL = new THREE.Bone();
  thighL.name = "LeftUpLeg";
  const thighR = new THREE.Bone();
  thighR.name = "RightUpLeg";
  const shinL = new THREE.Bone();
  shinL.name = "LeftLeg";
  const shinR = new THREE.Bone();
  shinR.name = "RightLeg";
  spine.add(head, armL, armR);
  armL.add(foreL);
  hips.add(spine, thighL, thighR);
  thighL.add(shinL);
  thighR.add(shinR);
  root.add(hips);
  return root;
}

function bone(root: THREE.Group, name: string): THREE.Bone {
  let found: THREE.Bone | null = null;
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone && child.name === name) {
      found = child as THREE.Bone;
    }
  });
  if (!found) {
    throw new Error(`missing bone ${name}`);
  }
  return found;
}

describe("generic humanoid bone driver", () => {
  it("animates a mixamo-style rig while running without accumulating poses", () => {
    const root = makeHumanoid();
    const thighL = bone(root, "LeftUpLeg");
    const rest = thighL.quaternion.clone();
    const motion = { time: 0.4, speed01: 1 };
    expect(driveHumanoidBones(root, motion)).toBe(true);
    expect(thighL.quaternion.angleTo(rest)).toBeGreaterThan(0.05);
    const afterFirst = thighL.quaternion.clone();
    driveHumanoidBones(root, motion);
    expect(thighL.quaternion.angleTo(afterFirst)).toBeLessThan(1e-9);
  });

  it("raises both arms forward in the aim pose", () => {
    const root = makeHumanoid();
    const armR = bone(root, "RightArm");
    const rest = armR.quaternion.clone();
    driveHumanoidBones(root, { time: 0, speed01: 0, aiming: true });
    expect(armR.quaternion.angleTo(rest)).toBeGreaterThan(1.2);
    const armL = bone(root, "LeftArm");
    const restL = armL.quaternion.clone();
    driveHumanoidBones(root, { time: 0, speed01: 0, aiming: true });
    expect(armL.quaternion.angleTo(restL)).toBeGreaterThan(1.0);
  });

  it("poses seated legs and forward arms while driving", () => {
    const root = makeHumanoid();
    const thighR = bone(root, "RightUpLeg");
    const armR = bone(root, "RightArm");
    const restThigh = thighR.quaternion.clone();
    const restArm = armR.quaternion.clone();
    driveHumanoidBones(root, { time: 0, speed01: 0.4, driving: true });
    expect(thighR.quaternion.angleTo(restThigh)).toBeGreaterThan(1.0);
    expect(armR.quaternion.angleTo(restArm)).toBeGreaterThan(0.5);
  });

  it("reports false for rigs without humanoid bones", () => {
    const root = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    root.add(box);
    expect(driveHumanoidBones(root, { time: 0, speed01: 1 })).toBe(false);
  });
});