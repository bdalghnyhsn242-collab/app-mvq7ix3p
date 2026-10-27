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

/**
 * Real textured soldier humanoid (green military fatigues, face, hands,
 * boots, PBR-baked textures) with an embedded skeleton and Idle/Walk/Run
 * clips — the primary CDN body for the male operator. Sourced from the
 * three.js example assets (origin: Mixamo character). Referenced at
 * runtime only; drop a locally licensed file at
 * `public/models/operator-male.glb` to take precedence.
 */
const SOLDIER_CDN_URL =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Soldier.glb";

export const SOLDIER_CDN_SOURCES: Record<OperatorVariant, string | null> = {
  male: SOLDIER_CDN_URL,
  female: null,
  ghillie: null,
};

export const CHARACTER_CDN_SOURCES: Record<OperatorVariant, string | null> = {
  male: "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_men/Adventurer.glb",
  female: "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_women/Adventurer.glb",
  ghillie: null,
};

export const WEAPON_CDN_URL =
  "https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_sci_fi_guns_pack/AR_1.glb";

const LOAD_TIMEOUT_MS = 20000;
/** Failed source sets are retried after this cooldown instead of being
 * cached as `null` for the whole session (the old behaviour locked the
 * procedural cube fallback in permanently after one bad moment). */
const FAILED_RETRY_COOLDOWN_MS = 15000;

const gltfCache = new Map<string, Promise<GLTF | null>>();
const failedAt = new Map<string, number>();

export type OperatorAssetDiagnostic = {
  time: string;
  level: "info" | "warn" | "error";
  message: string;
};

const diagnostics: OperatorAssetDiagnostic[] = [];

function logAsset(level: "info" | "warn" | "error", message: string): void {
  diagnostics.push({ time: new Date().toISOString(), level, message });
  if (diagnostics.length > 80) {
    diagnostics.splice(0, diagnostics.length - 80);
  }
  const tag = "🎮 [LastStand:Model]";
  if (level === "error") {
    console.error(tag, message);
  } else if (level === "warn") {
    console.warn(tag, message);
  } else {
    console.info(tag, message);
  }
}

/** Console + in-memory diagnostics for the operator asset pipeline. */
export function getOperatorDiagnostics(): {
  entries: OperatorAssetDiagnostic[];
  lastError: string | null;
} {
  const lastError =
    [...diagnostics].reverse().find((entry) => entry.level !== "info")?.message ?? null;
  return { entries: [...diagnostics], lastError };
}

/** Exposes live diagnostics on `window.__LAST_STAND_MODEL_DIAGNOSTICS`. */
export function installOperatorDiagnosticsProbe(): void {
  if (typeof window === "undefined") {
    return;
  }
  (window as unknown as Record<string, unknown>).__LAST_STAND_MODEL_DIAGNOSTICS = {
    entries: () => getOperatorDiagnostics().entries,
    lastError: () => getOperatorDiagnostics().lastError,
    clearCache: () => {
      resetOperatorAssetCache();
      failedAt.clear();
    },
  };
}

function describeScene(root: THREE.Object3D): string {
  let meshes = 0;
  let bones = 0;
  let vertices = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      bones += 1;
    }
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    meshes += 1;
    vertices += mesh.geometry?.attributes?.position?.count ?? 0;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material) {
        materials.add(material);
      }
    }
  });
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(root).getSize(size);
  return `${meshes} meshes / ${materials.size} materials / ${bones} bones / ${vertices} vertices / height≈${size.y.toFixed(2)}m`;
}

function countMeshes(root: THREE.Object3D): number {
  let meshes = 0;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes += 1;
    }
  });
  return meshes;
}

/** The URL that actually produced each cached asset (shown in diagnostics). */
const loadedSource = new Map<string, string>();

export function loadedSourceFor(key: string): string | null {
  return loadedSource.get(key) ?? null;
}

/**
 * Soldier.glb faces -Z while the game's forward is +Z, so it needs a
 * 180° yaw. Everything else keeps its native facing.
 */
export function facingYawForSource(url: string | null): number {
  if (url && /Soldier\.glb/i.test(url)) {
    return Math.PI;
  }
  return 0;
}

export function bodyFacingYaw(key: string): number {
  return facingYawForSource(loadedSourceFor(key));
}

const GLB_MAGIC = [0x67, 0x6c, 0x54, 0x46]; // "glTF"

/**
 * Fetches the model bytes manually instead of letting GLTFLoader open the
 * URL. This is required on static hosts with an SPA fallback: a missing
 * /models/*.glb returns index.html with HTTP 200, which GLTFLoader would
 * otherwise report as an opaque parse error. Here we verify the GLB magic
 * bytes (or a JSON glTF signature) first and name the real problem.
 */
async function fetchModelBuffer(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, mode: "cors" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
    }
    const buffer = await response.arrayBuffer();
    const head = new Uint8Array(buffer.slice(0, 4));
    const isGlb =
      head[0] === GLB_MAGIC[0] &&
      head[1] === GLB_MAGIC[1] &&
      head[2] === GLB_MAGIC[2] &&
      head[3] === GLB_MAGIC[3];
    const headText = new TextDecoder()
      .decode(new Uint8Array(buffer.slice(0, 32)))
      .trimStart();
    const isGltfJson = headText.startsWith("{");
    if (!isGlb && !isGltfJson) {
      const contentType = response.headers.get("content-type") ?? "غير معروف";
      throw new Error(
        `الخادم أعاد محتوى غير GLTF (${contentType}) — غالبًا صفحة SPA الاحتياطية (index.html) بدل ملف النموذج: ${url}`,
      );
    }
    return buffer;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`انتهت مهلة ${LOAD_TIMEOUT_MS / 1000}ث أثناء تحميل ${url}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadWithTimeout(url: string): Promise<GLTF> {
  logAsset("info", `بدء تحميل: ${url}`);
  const buffer = await fetchModelBuffer(url);
  // Relative URIs (external .bin / textures) resolve against the model URL.
  const basePath = url.slice(0, url.lastIndexOf("/") + 1);
  return await new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().parse(
      buffer,
      basePath,
      (gltf) => {
        logAsset("info", `تم تحميل وتحليل الملف: ${url}`);
        resolve(gltf);
      },
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        logAsset("error", `فشل تحليل ${url} — السبب: ${message}`);
        reject(new Error(message));
      },
    );
  });
}

async function loadFirstAvailable(
  urls: string[],
  loader: (url: string) => Promise<GLTF>,
  diagKey?: string,
): Promise<GLTF | null> {
  for (const url of urls) {
    try {
      const gltf = await loader(url);
      logAsset(
        "info",
        `نجح المصدر ${url} — المحتوى: ${describeScene(gltf.scene)} / ${gltf.animations.length} مقطع حركة`,
      );
      if (diagKey) {
        loadedSource.set(diagKey, url);
      }
      return gltf;
    } catch {
      // The real error was already logged by loadWithTimeout.
      continue;
    }
  }
  logAsset("error", `فشلت جميع المصادر (${urls.length}): ${urls.join(" | ")}`);
  return null;
}

/** Adds a raw.githubusercontent.com mirror next to every jsdelivr URL. */
function withRawFallback(url: string): string[] {
  const raw = url
    .replace("https://cdn.jsdelivr.net/gh/", "https://raw.githubusercontent.com/")
    .replace("@main/", "/main/");
  return raw === url ? [url] : [url, raw];
}

function cachedOrLoad(
  key: string,
  urls: string[],
  loader: (url: string) => Promise<GLTF>,
): Promise<GLTF | null> {
  const cached = gltfCache.get(key);
  if (cached) {
    return cached;
  }
  const lastFailure = failedAt.get(key) ?? 0;
  if (Date.now() - lastFailure < FAILED_RETRY_COOLDOWN_MS) {
    logAsset("warn", `مصادر «${key}» فشلت مؤخرًا — إعادة المحاولة بعد فترة تهدئة قصيرة`);
    return Promise.resolve(null);
  }
  const promise = loadFirstAvailable(urls, loader, key);
  void promise.then((result) => {
    if (result) {
      failedAt.delete(key);
    } else {
      failedAt.set(key, Date.now());
      // Do not keep the failed promise cached: the next rig (or a manual
      // window.__LAST_STAND_MODEL_DIAGNOSTICS.clearCache()) retries.
      gltfCache.delete(key);
    }
  });
  gltfCache.set(key, promise);
  return promise;
}

/**
 * A visible BODY must contain at least one mesh. The animation-library GLTF
 * (skeleton + preview mannequin) is clips-only and must never become the
 * displayed body — that is exactly what produced "green badge + blocky
 * mannequin" when the textured character failed.
 */
async function loadBodyGltf(
  url: string,
  loader: (url: string) => Promise<GLTF>,
): Promise<GLTF> {
  const gltf = await loader(url);
  if (countMeshes(gltf.scene) === 0) {
    logAsset(
      "error",
      `رفض المصدر ${url} كجسم مرئي: لا يحتوي أي mesh (هيكل حركات فقط)`,
    );
    throw new Error(`no meshes in ${url}`);
  }
  return gltf;
}

/**
 * Loads the operator body: local override first, then the CC0 textured
 * character from the CDN. The animation library is clips-only (see
 * loadOperatorClipsGltf) and is never used as a visible body.
 */
export function loadOperatorGltf(
  variant: OperatorVariant,
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  const urls = [OPERATOR_MODEL_URLS[variant]];
  const character = CHARACTER_CDN_SOURCES[variant];
  if (character) {
    urls.push(...withRawFallback(character));
  }
  return cachedOrLoad(`body:${variant}`, urls, (url) => loadBodyGltf(url, loader));
}

/** Loads the shared CC0 animation-library clips (cached across variants). */
export function loadOperatorClipsGltf(
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  return cachedOrLoad("clips", withRawFallback(ANIMATION_LIBRARY_URL), loader);
}

/** Loads the CC0 rifle model (local override first, then CDN). */
export function loadWeaponGltf(
  loader: (url: string) => Promise<GLTF> = loadWithTimeout,
): Promise<GLTF | null> {
  return cachedOrLoad(
    "weapon",
    [WEAPON_MODEL_URL, ...withRawFallback(WEAPON_CDN_URL)],
    loader,
  );
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