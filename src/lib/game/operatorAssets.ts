import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

export type OperatorVariant = "male" | "female" | "ghillie";

export type OperatorClipName =
  | "idle"
  | "sprint"
  | "aim"
  | "crawl"
  | "swim"
  | "drive";

export const OPERATOR_MODEL_URLS: Record<OperatorVariant, string> = {
  male: "/models/operator-male.glb",
  female: "/models/operator-female.glb",
  ghillie: "/models/operator-ghillie.glb",
};

const LOAD_TIMEOUT_MS = 8000;

const gltfCache = new Map<OperatorVariant, Promise<GLTF | null>>();

function loadWithTimeout(url: string): Promise<GLTF> {
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

export function loadOperatorGltf(
  variant: OperatorVariant,
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  const cached = gltfCache.get(variant);
  if (cached) {
    return cached;
  }
  const promise = loader(OPERATOR_MODEL_URLS[variant])
    .then((gltf) => {
      gltf.scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.frustumCulled = false;
        }
      });
      return gltf;
    })
    .catch(() => null);
  gltfCache.set(variant, promise);
  return promise;
}

export function resetOperatorAssetCache(): void {
  gltfCache.clear();
}

const CLIP_HINTS: Record<OperatorClipName, string[]> = {
  idle: ["idle", "stand", "breath"],
  sprint: ["sprint", "run", "jog"],
  aim: ["aim", "shoot", "fire", "attack"],
  crawl: ["crawl", "crouch", "downed", "prone"],
  swim: ["swim"],
  drive: ["drive", "sit", "vehicle"],
};

export function mapOperatorClips(
  clips: THREE.AnimationClip[],
): Record<OperatorClipName, THREE.AnimationClip | null> {
  const mapped: Record<OperatorClipName, THREE.AnimationClip | null> = {
    idle: null,
    sprint: null,
    aim: null,
    crawl: null,
    swim: null,
    drive: null,
  };
  for (const clip of clips) {
    const name = clip.name.toLowerCase();
    for (const key of Object.keys(CLIP_HINTS) as OperatorClipName[]) {
      if (mapped[key]) {
        continue;
      }
      if (CLIP_HINTS[key].some((hint) => name.includes(hint))) {
        mapped[key] = clip;
        break;
      }
    }
  }
  if (!mapped.idle && clips.length > 0) {
    mapped.idle = clips[0];
  }
  if (!mapped.sprint && clips.length > 1) {
    mapped.sprint = clips[1];
  }
  return mapped;
}

export type OperatorInstance = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Record<OperatorClipName, THREE.AnimationClip | null>;
};

export function createOperatorInstance(
  variant: OperatorVariant,
  gltf: GLTF,
): OperatorInstance {
  const root = cloneSkeleton(gltf.scene);
  const mixer = new THREE.AnimationMixer(root);
  return { root, mixer, clips: mapOperatorClips(gltf.animations) };
}