import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { selectClip, type ClipName } from "./logic";

/**
 * Soldier.glb from the official three.js examples (r169) — a real textured
 * human mesh with a skeleton and built-in Idle/Walk/Run clips. Loaded at
 * runtime from CDN with a mirror fallback; nothing is embedded.
 */
export const SOLDIER_SOURCES = [
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Soldier.glb",
  "https://raw.githubusercontent.com/mrdoob/three.js/r169/examples/models/gltf/Soldier.glb",
];

export type SoldierLoadStatus =
  | { state: "loading" }
  | { state: "ready"; meshes: number; bones: number; clips: string[] }
  | { state: "failed"; error: string };

type ClipMap = Record<ClipName, THREE.AnimationClip | null>;

/** Loads the soldier once; every actor is a skeleton-sharing clone. */
export class SoldierFactory {
  private template: THREE.Object3D | null = null;
  private clips: ClipMap = { Idle: null, Walk: null, Run: null };
  private loadPromise: Promise<SoldierLoadStatus> | null = null;

  get ready(): boolean {
    return this.template !== null;
  }

  load(): Promise<SoldierLoadStatus> {
    if (!this.loadPromise) {
      this.loadPromise = this.doLoad();
    }
    return this.loadPromise;
  }

  private async doLoad(): Promise<SoldierLoadStatus> {
    let lastError = "سبب غير معروف";
    for (const url of SOLDIER_SOURCES) {
      try {
        const gltf = await new GLTFLoader().loadAsync(url);
        let meshes = 0;
        let bones = 0;
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Bone).isBone) {
            bones += 1;
          }
          if ((obj as THREE.Mesh).isMesh) {
            meshes += 1;
          }
        });
        if (meshes === 0) {
          throw new Error("الملف لا يحتوي أي mesh");
        }
        this.template = gltf.scene;
        for (const clip of gltf.animations) {
          if (/idle/i.test(clip.name)) {
            this.clips.Idle = clip;
          } else if (/walk/i.test(clip.name)) {
            this.clips.Walk = clip;
          } else if (/run/i.test(clip.name)) {
            this.clips.Run = clip;
          }
        }
        return {
          state: "ready",
          meshes,
          bones,
          clips: gltf.animations.map((clip) => clip.name),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    // Honest failure: the caller shows this message instead of a fake body.
    return { state: "failed", error: lastError };
  }

  /** Skeleton-sharing clone normalized to 1.8m and grounded at the feet. */
  create(): Actor | null {
    if (!this.template) {
      return null;
    }
    const model = skeletonClone(this.template);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.001) {
      model.scale.multiplyScalar(1.8 / size.y);
    }
    const grounded = new THREE.Box3().setFromObject(model);
    if (Number.isFinite(grounded.min.y)) {
      model.position.y -= grounded.min.y;
    }
    // Soldier.glb faces -Z; rotate so the actor's front is +Z.
    model.rotation.y = Math.PI;
    return new Actor(model, this.clips);
  }
}

/**
 One animated actor: an AnimationMixer bound to its own clone, with
 * Idle/Walk/Run cross-fading. update() must be called every frame with the
 * real frame delta — that is the whole contract.
 */
export class Actor {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions: Partial<Record<ClipName, THREE.AnimationAction>> = {};
  private current: ClipName | null = null;

  constructor(model: THREE.Object3D, clips: ClipMap) {
    this.group.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    (Object.keys(clips) as ClipName[]).forEach((name) => {
      const clip = clips[name];
      if (clip) {
        this.actions[name] = this.mixer.clipAction(clip);
      }
    });
  }

  get currentClip(): ClipName | null {
    return this.current;
  }

  /** How many of Idle/Walk/Run were actually bound to this skeleton. */
  get clipCount(): number {
    return Object.keys(this.actions).length;
  }

  setState(name: ClipName, fade = 0.25): void {
    if (name === this.current) {
      return;
    }
    const next = this.actions[name];
    if (!next) {
      return;
    }
    next.reset().fadeIn(fade).play();
    if (this.current) {
      this.actions[this.current]?.fadeOut(fade);
    }
    this.current = name;
  }

  /** Advances the mixer by the real frame delta. */
  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** Convenience: pick the clip from motion, then advance the mixer. */
  updateTowards(motion: { speed01: number; grounded: boolean }, dt: number): void {
    this.setState(selectClip(motion.speed01, motion.grounded));
    this.update(dt);
  }
}