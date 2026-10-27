import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { animateSoldier, makeSoldier } from "./soldierModel";

describe("tactical operator models", () => {
  it("builds male and female operators with a full rig", () => {
    for (const gender of ["male", "female"] as const) {
      const soldier = makeSoldier(0x22c55e, "woodland", gender);
      expect(soldier).toBeInstanceOf(THREE.Group);
      expect(soldier.userData.rig.arms).toHaveLength(2);
      expect(soldier.userData.rig.legs).toHaveLength(2);
      expect(soldier.userData.rig.pouches.length).toBeGreaterThan(2);
      expect(soldier.userData.rig.torso).toBeInstanceOf(THREE.Group);
    }
  });

  it("gives the female operator hair geometry the male lacks", () => {
    const female = makeSoldier(0x22c55e, "desert", "female");
    const male = makeSoldier(0x22c55e, "desert", "male");
    expect(female.children.length).toBeGreaterThan(male.children.length);
  });

  it("adds 3D foliage strips to the ghillie variant", () => {
    const ghillie = makeSoldier(0x22c55e, "ghillie");
    const woodland = makeSoldier(0x22c55e, "woodland");
    expect(ghillie.children.length).toBeGreaterThan(woodland.children.length);
  });

  it("animates limbs from motion speed", () => {
    const soldier = makeSoldier(0x22c55e, "woodland");
    const before = soldier.userData.rig.arms[0].rotation.x;
    animateSoldier(soldier, { time: 0.35, speed01: 1 });
    expect(soldier.userData.rig.arms[0].rotation.x).not.toBe(before);
  });

  it("poses operators for swimming and driving", () => {
    const swimmer = makeSoldier(0x22c55e, "woodland");
    animateSoldier(swimmer, { time: 0, speed01: 0, swimming: true });
    expect(swimmer.userData.rig.torso.rotation.x).toBeCloseTo(0.9);
    const driver = makeSoldier(0x22c55e, "woodland");
    animateSoldier(driver, { time: 0, speed01: 0, driving: true });
    expect(driver.userData.rig.legs[0].rotation.x).toBe(-1.2);
  });

  it("marks every mesh as a shadow caster", () => {
    const soldier = makeSoldier(0x22c55e, "woodland");
    let casters = 0;
    soldier.traverse((child) => {
      const meshChild = child as THREE.Mesh;
      if (meshChild.isMesh && meshChild.castShadow) {
        casters += 1;
      }
    });
    expect(casters).toBeGreaterThan(20);
  });

  it("builds a detailed face and merged hands with fingers", () => {
    const soldier = makeSoldier(0x22c55e, "woodland");
    const rig = soldier.userData.rig;
    expect(rig.hands).toHaveLength(2);
    for (const hand of rig.hands) {
      expect(hand.isMesh).toBe(true);
      // Palm + 4 fingers + thumb merged into one geometry.
      expect(hand.geometry.attributes.position.count).toBeGreaterThan(24);
    }
    expect(rig.head.children.length).toBeGreaterThan(15);
  });
});