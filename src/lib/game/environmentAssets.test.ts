import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  BUILDING_FILES,
  NATURE_FILES,
  VEHICLE_FILES,
  environmentAssetUrl,
  fitModelToSize,
  instantiateEnvironmentModel,
  upgradeVehicleMeshWithRealModel,
} from "./environmentAssets";

function boxModel(size: { x: number; y: number; z: number }): THREE.Group {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z));
  mesh.position.y = size.y / 2;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

describe("CC0 environment asset pipeline", () => {
  it("builds local-first and CDN urls for verified pack files", () => {
    const url = environmentAssetUrl("nature", NATURE_FILES.treePine);
    expect(url.local).toBe("/models/env/nature/PineTree_1.glb");
    expect(url.cdn).toBe(
      "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/nature_pack/PineTree_1.glb",
    );
    const building = environmentAssetUrl("buildings", BUILDING_FILES.house1);
    expect(building.local).toBe("/models/env/buildings/House1.glb");
    expect(building.cdn).toBe(
      "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/buildings_pack_2/House1.glb",
    );
    const vehicle = environmentAssetUrl("vehicles", VEHICLE_FILES.tank);
    expect(vehicle.cdn.endsWith("/tank_pack/Tank.glb")).toBe(true);
  });

  it("normalizes model scale and grounds the base at y=0", () => {
    const model = fitModelToSize(boxModel({ x: 10, y: 4, z: 2 }), 5);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(5);
    expect(box.min.y).toBeCloseTo(0);
  });

  it("normalizes by height when requested", () => {
    const model = fitModelToSize(boxModel({ x: 2, y: 8, z: 2 }), 4, "height");
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.y).toBeCloseTo(4);
  });

  it("marks instantiated clones as shadow casters and receivers", () => {
    const gltf = {
      scene: boxModel({ x: 1, y: 1, z: 1 }),
    } as unknown as Parameters<typeof instantiateEnvironmentModel>[0];
    const clone = instantiateEnvironmentModel(gltf);
    let casters = 0;
    let receivers = 0;
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.castShadow) casters += 1;
        if (mesh.receiveShadow) receivers += 1;
      }
    });
    expect(casters).toBe(1);
    expect(receivers).toBe(1);
  });

  it("swaps a vehicle mesh for a real model and keeps the turret flash", () => {
    const vehicle = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 3.6));
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.3));
    flash.name = "turretFlash";
    vehicle.add(body, flash);
    const gltf = {
      scene: boxModel({ x: 6, y: 2, z: 12 }),
    } as unknown as Parameters<typeof upgradeVehicleMeshWithRealModel>[1];
    expect(upgradeVehicleMeshWithRealModel(vehicle, gltf, 5.6)).toBe(true);
    expect(vehicle.getObjectByName("turretFlash")).not.toBe(null);
    const children = vehicle.children.filter((child) => child.name !== "turretFlash");
    expect(children).toHaveLength(1);
    const box = new THREE.Box3().setFromObject(children[0]);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(5.6);
  });
});