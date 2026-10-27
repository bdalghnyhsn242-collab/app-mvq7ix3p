import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  attachWeaponToHand,
  facingYawForSource,
  clipTracksMatchSkeleton,
  createOperatorInstance,
  mapOperatorClips,
  operatorBodySources,
} from "./operatorAssets";

function boneNamed(name: string): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  return bone;
}

function clipNamed(name: string, boneName: string): THREE.AnimationClip {
  const track = new THREE.QuaternionKeyframeTrack(
    `${boneName}.quaternion`,
    [0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1],
  );
  return new THREE.AnimationClip(name, 1, [track]);
}

describe("CC0 asset pipeline guards", () => {
  it("accepts clips whose tracks target real bones", () => {
    const root = new THREE.Group();
    const hips = boneNamed("Hips");
    root.add(hips);
    const clips = [clipNamed("Idle", "Hips"), clipNamed("Run_Fwd", "Hips")];
    expect(clipTracksMatchSkeleton(clips, root)).toBe(true);
  });

  it("rejects clips built for a different rig", () => {
    const root = new THREE.Group();
    root.add(boneNamed("Hips"));
    const foreign = [clipNamed("Idle", "mixamorig:Spine")];
    expect(clipTracksMatchSkeleton(foreign, root)).toBe(false);
    expect(clipTracksMatchSkeleton(foreign, new THREE.Group())).toBe(false);
  });

  it("maps Quaternius-style clip names onto tactical states", () => {
    const clips = [
      clipNamed("Idle", "Hips"),
      clipNamed("Run_Fwd", "Hips"),
      clipNamed("Shoot_Rifle_Single", "Hips"),
      clipNamed("Crawl_Fwd", "Hips"),
      clipNamed("Swim_Fwd", "Hips"),
      clipNamed("Sit_Chair", "Hips"),
    ];
    const mapped = mapOperatorClips(clips);
    expect(mapped.idle?.name).toBe("Idle");
    expect(mapped.sprint?.name).toBe("Run_Fwd");
    expect(mapped.aim?.name).toBe("Shoot_Rifle_Single");
    expect(mapped.crawl?.name).toBe("Crawl_Fwd");
    expect(mapped.swim?.name).toBe("Swim_Fwd");
    expect(mapped.drive?.name).toBe("Sit_Chair");
  });

  it("marks an instance unmapped when no clip matches the skeleton", () => {
    const body = {
      scene: new THREE.Group(),
      animations: [clipNamed("Idle", "ForeignBone")],
    } as unknown as Parameters<typeof createOperatorInstance>[1];
    const instance = createOperatorInstance("male", body, null);
    expect(instance.hasMappedClips).toBe(false);
  });

  it("attaches the weapon to the right hand bone when present", () => {
    const root = new THREE.Group();
    const handLeft = boneNamed("Hand_L");
    const handRight = boneNamed("Hand_R");
    root.add(handLeft, handRight);
    const gun = new THREE.Group();
    gun.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5)));
    expect(attachWeaponToHand(root, gun)).toBe(true);
    expect(handRight.children.length).toBe(1);
    expect(handLeft.children.length).toBe(0);
  });

  it("reports failure when the rig has no hand bone", () => {
    const root = new THREE.Group();
    root.add(boneNamed("Hips"));
    expect(attachWeaponToHand(root, new THREE.Group())).toBe(false);
  });

  it("prefers the real textured soldier for the male body", () => {
    const sources = operatorBodySources("male");
    expect(sources[0]).toBe("/models/operator-male.glb");
    const soldierIndex = sources.findIndex((url) => url.includes("Soldier.glb"));
    const adventurerIndex = sources.findIndex((url) => url.includes("Adventurer.glb"));
    expect(soldierIndex).toBeGreaterThan(-1);
    expect(adventurerIndex).toBeGreaterThan(soldierIndex);
  });

  it("keeps the stylized character first for the female body", () => {
    const sources = operatorBodySources("female");
    expect(sources.some((url) => url.includes("Soldier.glb"))).toBe(false);
    expect(sources.some((url) => url.includes("Adventurer.glb"))).toBe(true);
  });

  it("flips -Z-facing packs to the game forward", () => {
    expect(
      facingYawForSource(
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Soldier.glb",
      ),
    ).toBe(Math.PI);
    expect(
      facingYawForSource("https://example.com/Adventurer.glb"),
    ).toBe(0);
    expect(facingYawForSource(null)).toBe(0);
  });
});