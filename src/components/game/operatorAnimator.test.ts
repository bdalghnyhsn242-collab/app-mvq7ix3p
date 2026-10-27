import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  mapOperatorClips,
  type OperatorClipName,
} from "@/lib/game/operatorAssets";
import {
  FADE_DURATION,
  OperatorAnimator,
  mixerUpdateInterval,
  selectOperatorState,
  shouldUpdateMixer,
} from "./operatorAnimator";
import { OperatorRig, lodTierForDistance, operatorVariantFor } from "./operatorRig";

function makeClip(name: string, target: THREE.Object3D): THREE.AnimationClip {
  const track = new THREE.VectorKeyframeTrack(
    `${target.name}.position`,
    [0, 1],
    [0, 0, 0, 0, 2, 0],
  );
  return new THREE.AnimationClip(name, 1, [track]);
}

describe("operator animation state machine", () => {
  it("prioritizes vehicle, swim, and downed states over locomotion", () => {
    expect(selectOperatorState({ speed01: 1, driving: true })).toBe("drive");
    expect(selectOperatorState({ speed01: 1, swimming: true })).toBe("swim");
    expect(selectOperatorState({ speed01: 0, downed: true })).toBe("crawl");
    expect(selectOperatorState({ speed01: 0.1, aiming: true })).toBe("aim");
    expect(selectOperatorState({ speed01: 0.1 })).toBe("idle");
  });

  it("separates idle, walk, and sprint locomotion tiers", () => {
    expect(selectOperatorState({ speed01: 0 })).toBe("idle");
    expect(selectOperatorState({ speed01: 0.05 })).toBe("idle");
    // Walking pace (~0.74 after sprint normalization) must be walk, not
    // sprint — the soldier may never run in place while strolling.
    expect(selectOperatorState({ speed01: 0.74 })).toBe("walk");
    expect(selectOperatorState({ speed01: 0.5 })).toBe("walk");
    // Sprint requires Shift (sprinting flag) or an unmistakable run speed.
    expect(selectOperatorState({ speed01: 0.74, sprinting: true })).toBe("sprint");
    expect(selectOperatorState({ speed01: 1 })).toBe("sprint");
    expect(selectOperatorState({ speed01: 0.9 })).toBe("sprint");
  });

  it("throttles mixer updates by LOD tier", () => {
    expect(mixerUpdateInterval(0)).toBe(1);
    expect(mixerUpdateInterval(1)).toBe(2);
    expect(mixerUpdateInterval(2)).toBe(4);
    expect(shouldUpdateMixer(4, 2)).toBe(true);
    expect(shouldUpdateMixer(5, 2)).toBe(false);
    expect(shouldUpdateMixer(3, 1)).toBe(true);
  });

  it("cross-fades between clips with fadeIn/fadeOut", () => {
    const root = new THREE.Object3D();
    const child = new THREE.Object3D();
    child.name = "child";
    root.add(child);
    const clips: Record<OperatorClipName, THREE.AnimationClip | null> = {
      idle: makeClip("Idle", child),
      walk: null,
      sprint: makeClip("Sprint", child),
      aim: null,
      crawl: null,
      swim: null,
      drive: null,
    };
    const animator = new OperatorAnimator(root, clips);
    expect(animator.hasActions).toBe(true);
    expect(animator.setState("aim")).toBe(false);
    expect(animator.setState("idle")).toBe(true);
    animator.update(0.5);
    expect(animator.state).toBe("idle");
    expect(animator.setState("sprint", FADE_DURATION)).toBe(true);
    expect(animator.state).toBe("sprint");
    animator.update(FADE_DURATION);
    animator.update(0.5);
    expect(child.position.x).toBeGreaterThan(0);
    animator.stopAll();
    expect(animator.state).toBe(null);
  });

  it("reports playable states and pauses for direct bone posing", () => {
    const root = new THREE.Object3D();
    const child = new THREE.Object3D();
    child.name = "child";
    root.add(child);
    const clips: Record<OperatorClipName, THREE.AnimationClip | null> = {
      idle: makeClip("Idle", child),
      walk: null,
      sprint: null,
      aim: null,
      crawl: null,
      swim: null,
      drive: null,
    };
    const animator = new OperatorAnimator(root, clips);
    expect(animator.canPlay("idle")).toBe(true);
    expect(animator.canPlay("sprint")).toBe(false);
    expect(animator.setState("idle")).toBe(true);
    animator.update(0.1);
    animator.pause();
    expect(animator.state).toBe(null);
  });

  it("exposes the mapped clip list for live diagnostics", () => {
    const root = new THREE.Object3D();
    const child = new THREE.Object3D();
    child.name = "child";
    root.add(child);
    const clips: Record<OperatorClipName, THREE.AnimationClip | null> = {
      idle: makeClip("Idle", child),
      walk: makeClip("Walk", child),
      sprint: makeClip("Run", child),
      aim: null,
      crawl: null,
      swim: null,
      drive: null,
    };
    const animator = new OperatorAnimator(root, clips);
    expect(animator.availableClips).toEqual([
      { state: "idle", name: "Idle" },
      { state: "walk", name: "Walk" },
      { state: "sprint", name: "Run" },
    ]);
  });

  it("maps GLTF clip names to tactical states by heuristics", () => {
    const root = new THREE.Object3D();
    const child = new THREE.Object3D();
    child.name = "child";
    root.add(child);
    const mapped = mapOperatorClips([
      makeClip("03_Aim_Shoot", child),
      makeClip("01_Idle_Breath", child),
      makeClip("02_Tactical_Sprint", child),
      makeClip("Swim_Front", child),
      makeClip("Drive_Sit", child),
      makeClip("Crawl_Downed", child),
    ]);
    expect(mapped.idle?.name).toBe("01_Idle_Breath");
    expect(mapped.sprint?.name).toBe("02_Tactical_Sprint");
    expect(mapped.aim?.name).toBe("03_Aim_Shoot");
    expect(mapped.crawl?.name).toBe("Crawl_Downed");
    expect(mapped.swim?.name).toBe("Swim_Front");
    expect(mapped.drive?.name).toBe("Drive_Sit");
  });
});

describe("operator rig fallback and LOD", () => {
  it("starts procedural and animates without GLTF assets", () => {
    const rig = new OperatorRig("woodland", "male");
    expect(rig.skeletal).toBe(false);
    expect(rig.activeRoot).toBeInstanceOf(THREE.Group);
    rig.update({ time: 0.4, speed01: 1 }, 0.016);
    const arm = (rig.activeRoot as THREE.Group).userData.rig.arms[0] as THREE.Group;
    expect(arm.rotation.x).not.toBe(0);
  });

  it("maps camo and gender to GLTF variants", () => {
    expect(operatorVariantFor("ghillie", "male")).toBe("ghillie");
    expect(operatorVariantFor("woodland", "female")).toBe("female");
    expect(operatorVariantFor("desert", "male")).toBe("male");
  });

  it("assigns mixer LOD tiers by distance", () => {
    expect(lodTierForDistance(10)).toBe(0);
    expect(lodTierForDistance(80)).toBe(1);
    expect(lodTierForDistance(150)).toBe(2);
  });
});