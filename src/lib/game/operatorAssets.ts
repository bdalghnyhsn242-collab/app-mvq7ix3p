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

/**
 * Local override files. When a real GLB is placed in `public/models/` it
 * takes precedence over every CDN source below.
 */
export const OPERATOR_MODEL_URLS: Record<OperatorVariant, string> = {
  male: "/models/operator-male.glb",
  female: "/models/operator-female.glb",
  ghillie: "/models/operator-ghillie.glb",
};

export const WEAPON_MODEL_URL = "/models/weapon-ar.glb";

/**
 * Real, CC0-licensed (public domain, commercial use allowed) Quaternius
 * assets served from GitHub through the jsdelivr CDN:
 *
 * - Animation library: rigged humanoid with 120+ real animation clips
 *   (idle / walk / run / shoot / crawl / swim / sit ...).
 *   Source: https://github.com/J-Ponzo/gltf-universal-animation-library (CC0)
 *   Upstream: https://quaternius.itch.io/universal-animation-library (CC0)
 *
 * - Textured character bodies (Ultimate Modular Men/Women, rigged).
 *   Source: https://github.com/trebeljahr/quaternius-showcase (CC0 upstream)
 *   Upstream: https://quaternius.com/packs/ultimatemodularcharacters.html
 *
 * - Weapon: Sci-Fi Modular Gun Pack AR rifle with PBR materials.
 *   Source: https://github.com/trebeljahr/quaternius-showcase (CC0 upstream)
 *   Upstream: https://quaternius.com/packs/scifimodularguns.html
 */
const ANIMATION_LIBRARY_URL =
  "https://cdn.jsdelivr.net/gh/J-Ponzo/gltf-universal-animation-library@main/glTF/AnimationLibrary_Godot_Standard.gltf";

export const OPERATOR_CDN_SOURCES: Record<OperatorVariant, string> = {
  male: ANIMATION_LIBRARY_URL,
  female: ANIMATION_LIBRARY_URL,
  ghillie: ANIMATION_LIBRARY_URL,
};

export const CHARACTER_CDN_SOURCES: Record<OperatorVariant, string | null> = {
  male: "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_men/Adventurer.glb",
  female: "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_women/Adventurer.glb",
  ghillie: null,
};

export const WEAPON_CDN_URL =
  "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_sci_fi_guns_pack/AR_1.glb";

const LOAD_TIMEOUT_MS = 8000;

const gltfCache = new Map<string, Promise<GLTF | null>>();

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

async function loadFirstAvailable(
  urls: string[],
  loader: (url: string) => Promise<GLTF>,
): Promise<GLTF | null> {
  for (const url of urls) {
    try {
      return await loader(url);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Loads the operator body: local override first, then the CC0 textured
 * character from the CDN, then the CC0 rigged animation-library mannequin.
 */
export function loadOperatorGltf(
  variant: OperatorVariant,
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  const cached = gltfCache.get(`body:${variant}`);
  if (cached) {
    return cached;
  }
  const urls = [OPERATOR_MODEL_URLS[variant]];
  const character = CHARACTER_CDN_SOURCES[variant];
  if (character) {
    urls.push(character);
  }
  urls.push(OPERATOR_CDN_SOURCES[variant]);
  const promise = loadFirstAvailable(urls, loader);
  gltfCache.set(`body:${variant}`, promise);
  return promise;
}

/** Loads the shared CC0 animation-library clips (cached across variants). */
export function loadOperatorClipsGltf(
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  const cached = gltfCache.get("clips");
  if (cached) {
    return cached;
  }
  const promise = loadFirstAvailable([ANIMATION_LIBRARY_URL], loader);
  gltfCache.set("clips", promise);
  return promise;
}

/** Loads the CC0 rifle model (local override first, then CDN). */
export function loadWeaponGltf(
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  const cached = gltfCache.get("weapon");
  if (cached) {
    return cached;
  }
  const promise = loadFirstAvailable([WEAPON_MODEL_URL, WEAPON_CDN_URL], loader);
  gltfCache.set("weapon", promise);
  return promise;
}

export function resetOperatorAssetCache(): void {
  gltfCache.clear();
}

const OPERATOR_TINTS: Record<OperatorVariant, number> = {
  male: 0x5a6b46,
  female: 0x6b5f46,
  ghillie: 0x3d5a2a,
};

function tintMaterial(material: THREE.Material, tint: THREE.Color): THREE.Material {
  const standard = material as THREE.MeshStandardMaterial;
  if (!standard || typeof standard.color !== "object" || standard.map) {
    return material;
  }
  const cloned = standard.clone();
  cloned.color.multiply(tint);
  return cloned;
}

/** Applies shadow flags and a military palette to untextured materials. */
function applyOperatorTint(root: THREE.Object3D, variant: OperatorVariant): void {
  const tint = new THREE.Color(OPERATOR_TINTS[variant]);
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => tintMaterial(material, tint));
    } else if (mesh.material) {
      mesh.material = tintMaterial(mesh.material, tint);
    }
  });
}

/**
 * True when at least one clip animates bones that actually exist on the
 * given skeleton. Used to avoid playing clips against an incompatible rig.
 */
export function clipTracksMatchSkeleton(
  clips: THREE.AnimationClip[],
  root: THREE.Object3D,
): boolean {
  const bones = new Set<string>();
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      bones.add(child.name);
    }
  });
  if (bones.size === 0) {
    return false;
  }
  return clips.some((clip) =>
    clip.tracks.some((track) => {
      const nodePath = track.name.split(".")[0] ?? "";
      const leaf = nodePath.split("/").pop() ?? nodePath;
      return bones.has(leaf);
    }),
  );
}

const CLIP_HINTS: Record<OperatorClipName, string[]> = {
  idle: ["idle", "stand", "breath"],
  sprint: ["sprint", "run", "jog", "walk"],
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
  hasMappedClips: boolean;
};

/**
 * Builds a playable operator instance from a body GLTF plus an optional
 * clip source. Clips are only used when they animate the body's actual
 * bones; otherwise hasMappedClips stays false and the caller keeps the
 * procedural rig instead of a static T-pose.
 */
export function createOperatorInstance(
  variant: OperatorVariant,
  bodyGltf: GLTF,
  clipsGltf?: GLTF | null,
): OperatorInstance {
  const root = cloneSkeleton(bodyGltf.scene);
  applyOperatorTint(root, variant);
  let clips = mapOperatorClips([]);
  if (bodyGltf.animations.length > 0 && clipTracksMatchSkeleton(bodyGltf.animations, root)) {
    clips = mapOperatorClips(bodyGltf.animations);
  } else if (
    clipsGltf &&
    clipsGltf.animations.length > 0 &&
    clipTracksMatchSkeleton(clipsGltf.animations, root)
  ) {
    clips = mapOperatorClips(clipsGltf.animations);
  }
  const hasMappedClips = Object.values(clips).some(Boolean);
  const mixer = new THREE.AnimationMixer(root);
  return { root, mixer, clips, hasMappedClips };
}

/**
 * Attaches a weapon model to the operator's hand bone. Prefers the right
 * hand; returns false when the rig has no recognizable hand bone.
 */
export function attachWeaponToHand(
  root: THREE.Object3D,
  weaponScene: THREE.Object3D,
): boolean {
  const hands: THREE.Object3D[] = [];
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone && /hand|palm/i.test(child.name)) {
      hands.push(child);
    }
  });
  const hand =
    hands.find((bone) => /right|[_\.]r$/i.test(bone.name)) ?? hands[0] ?? null;
  if (!hand) {
    return false;
  }
  const gun = weaponScene.clone(true);
  gun.scale.setScalar(0.5);
  gun.rotation.set(0, Math.PI / 2, 0);
  gun.position.set(0, 0.1, 0.12);
  gun.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    }
  });
  hand.add(gun);
  return true;
}