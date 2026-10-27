import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export type EnvironmentCategory = "nature" | "buildings" | "vehicles";

/**
 * Real, CC0-1.0 licensed Quaternius assets served from GitHub through the
 * jsdelivr CDN. Every filename below was verified against the upstream
 * repository listing, and the licenses were verified against the repo's
 * own LICENSES.md (all packs CC0-1.0; newer QAL packs are NOT used):
 *
 * - nature_pack    = Ultimate Nature Pack   (CC0-1.0)
 * - buildings_pack_2 = Ultimate Buildings Pack, textured (CC0-1.0)
 * - tank_pack      = Animated Tanks Pack    (CC0-1.0)
 *
 * Source: https://github.com/trebeljahr/quaternius-showcase
 * Upstream: https://quaternius.com (CC0 pack pages)
 */
export const ENVIRONMENT_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/";

/** Local overrides live in `public/models/env/<category>/<file>`. */
export const ENVIRONMENT_LOCAL_BASE = "/models/env/";

/**
 * Actual folder names inside the upstream repository (verified via the
 * GitHub API tree listing). The logical category names differ from the
 * upstream pack folder names, so every CDN url must go through this map.
 */
export const CDN_FOLDERS: Record<EnvironmentCategory, string> = {
  nature: "nature_pack",
  buildings: "buildings_pack_2",
  vehicles: "tank_pack",
};

export const NATURE_FILES = {
  treeCommon: "CommonTree_1.glb",
  treePine: "PineTree_1.glb",
  treeBirch: "BirchTree_1.glb",
  treeDead: "CommonTree_Dead_1.glb",
  bush: "Bush_1.glb",
  grass: "Grass.glb",
  rock1: "Rock_1.glb",
  rock2: "Rock_2.glb",
  rock3: "Rock_3.glb",
  rock4: "Rock_4.glb",
  stump: "TreeStump.glb",
} as const;

export const BUILDING_FILES = {
  house1: "House1.glb",
  house2: "House2.glb",
  building1Small: "Building1_Small.glb",
  building2Small: "Building2_Small.glb",
  building3Small: "Building3_Small.glb",
} as const;

export const VEHICLE_FILES = {
  tank: "Tank.glb",
} as const;

export function environmentAssetUrl(
  category: EnvironmentCategory,
  file: string,
  localBase: string = ENVIRONMENT_LOCAL_BASE,
  cdnBase: string = ENVIRONMENT_CDN_BASE,
): { local: string; cdn: string } {
  const cdnFolder = CDN_FOLDERS[category];
  return {
    local: `${localBase}${category}/${file}`,
    cdn: `${cdnBase}${cdnFolder}/${file}`,
  };
}

const LOAD_TIMEOUT_MS = 12000;

const envCache = new Map<string, Promise<GLTF | null>>();

function loadEnvWithTimeout(url: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), LOAD_TIMEOUT_MS);
    new GLTFLoader().load(
      url,
      (gltf) => {
        window.clearTimeout(timer);
        resolve(gltf);
      },
      undefined,
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Loads one environment asset: local override first, then the CC0 CDN
 * copy. Returns null when both fail so callers keep their procedural
 * fallback instead of breaking the scene.
 */
export function loadEnvironmentGltf(
  category: EnvironmentCategory,
  file: string,
  loader: (url: string) => Promise<GLTF> = loadEnvWithTimeout,
): Promise<GLTF | null> {
  const key = `${category}/${file}`;
  const cached = envCache.get(key);
  if (cached) {
    return cached;
  }
  const { local, cdn } = environmentAssetUrl(category, file);
  const raw = cdn
    .replace("https://cdn.jsdelivr.net/gh/", "https://raw.githubusercontent.com/")
    .replace(/@([^/]+)\//, "/$1/");
  const promise = (async () => {
    for (const url of raw === cdn ? [local, cdn] : [local, cdn, raw]) {
      try {
        return await loader(url);
      } catch {
        continue;
      }
    }
    return null;
  })();
  envCache.set(key, promise);
  return promise;
}

export function resetEnvironmentAssetCache(): void {
  envCache.clear();
}

/** Clones a loaded model with shadow flags; clones share GPU resources. */
export function instantiateEnvironmentModel(gltf: GLTF): THREE.Object3D {
  const clone = gltf.scene.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return clone;
}

/**
 * Uniformly scales a model so its largest dimension (or height) matches
 * targetSize, then grounds it so the bounding-box minimum sits at y=0.
 * Used because upstream pack scales vary between packs.
 */
export function fitModelToSize(
  object: THREE.Object3D,
  targetSize: number,
  axis: "max" | "height" = "max",
): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const current = axis === "height" ? size.y : Math.max(size.x, size.y, size.z);
  if (current > 0.0001) {
    object.scale.multiplyScalar(targetSize / current);
  }
  const grounded = new THREE.Box3().setFromObject(object);
  object.position.y -= grounded.min.y;
  return object;
}

/**
 * Swaps a procedural vehicle mesh for a real model while preserving the
 * named "turretFlash" muzzle marker used by the turret gameplay.
 */
export function upgradeVehicleMeshWithRealModel(
  mesh: THREE.Group,
  gltf: GLTF,
  lengthTarget = 5.6,
): boolean {
  const flash = mesh.getObjectByName("turretFlash");
  const flashClone = flash ? flash.clone(true) : null;
  while (mesh.children.length > 0) {
    mesh.remove(mesh.children[0]);
  }
  const body = fitModelToSize(instantiateEnvironmentModel(gltf), lengthTarget);
  mesh.add(body);
  if (flashClone) {
    mesh.add(flashClone);
  }
  return true;
}

/**
 * Loads the CC0 tank once and applies it to the armed vehicle slot
 * (the one with turret gameplay). Returns false when the asset is
 * unavailable so the procedural vehicle stays visible.
 */
export async function upgradeVehicleMeshesWithRealModels(
  meshes: THREE.Group[],
): Promise<boolean> {
  const tank = await loadEnvironmentGltf("vehicles", VEHICLE_FILES.tank);
  if (!tank) {
    return false;
  }
  const armed = meshes[1];
  if (!armed) {
    return false;
  }
  return upgradeVehicleMeshWithRealModel(armed, tank);
}