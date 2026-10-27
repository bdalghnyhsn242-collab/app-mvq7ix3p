import * as THREE from "three";
import {
  createOperatorInstance,
  attachWeaponToHand,
  bodyFacingYaw,
  loadOperatorGltf,
  loadOperatorClipsGltf,
  loadWeaponGltf,
  type OperatorVariant,
} from "@/lib/game/operatorAssets";
import {
  mixerUpdateInterval,
  OperatorAnimator,
  selectOperatorState,
} from "./operatorAnimator";
import { driveHumanoidBones } from "./boneDriver";
import {
  animateSoldier,
  makeSoldier,
  type SoldierGender,
  type SoldierMotion,
} from "./soldierModel";

export type LodTier = 0 | 1 | 2;

/** How many OperatorRig instances currently display a real GLB humanoid. */
let riggedOperatorTotal = 0;

export function riggedOperatorCount(): number {
  return riggedOperatorTotal;
}

export type OperatorRigStatus = {
  /** A GLB body was loaded and cloned for this rig. */
  loaded: boolean;
  /** The GLB root is actually a child of this rig's scene group. */
  addedToScene: boolean;
  /** The procedural makeSoldier fallback is hidden. */
  proceduralHidden: boolean;
  meshes: number;
  bones: number;
};

export function operatorVariantFor(camo: string, gender: SoldierGender): OperatorVariant {
  if (camo === "ghillie") {
    return "ghillie";
  }
  return gender === "female" ? "female" : "male";
}

export function lodTierForDistance(distance: number): LodTier {
  if (distance < 45) {
    return 0;
  }
  if (distance < 110) {
    return 1;
  }
  return 2;
}

/**
 * Scales a loaded humanoid to a consistent metric height and grounds it,
 * because upstream packs ship at wildly different scales.
 */
export function normalizeHumanoidHeight(root: THREE.Object3D, targetHeight = 1.8): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.0001 && Math.abs(size.y - targetHeight) / targetHeight > 0.15) {
    root.scale.multiplyScalar(targetHeight / size.y);
  }
  const grounded = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(grounded.min.y)) {
    root.position.y -= grounded.min.y;
  }
}

export class OperatorRig {
  readonly group = new THREE.Group();
  readonly variant: OperatorVariant;
  /** Set once an upgrade has been attempted; enables lazy bot upgrades. */
  upgradeAttempted = false;
  private procedural: THREE.Group;
  private animator: OperatorAnimator | null = null;
  private gltfRoot: THREE.Object3D | null = null;
  private usesBoneDriver = false;
  private weaponAttached = false;
  private tick = 0;
  private lastMotion: SoldierMotion | null = null;
  private upgradeInFlight: Promise<boolean> | null = null;

  constructor(camo: "woodland" | "desert" | "ghillie", gender: SoldierGender = "male") {
    this.variant = operatorVariantFor(camo, gender);
    this.procedural = makeSoldier(0x22c55e, camo, gender);
    this.group.add(this.procedural);
  }

  get skeletal(): boolean {
    return this.gltfRoot !== null;
  }

  /** How the visible body is animated right now. */
  get animationMode(): "clips" | "bone-driver" | "procedural" {
    if (this.animator) {
      return "clips";
    }
    return this.gltfRoot ? "bone-driver" : "procedural";
  }

  /** Ground-truth visual state of this rig (drives the honest HUD badge). */
  get status(): OperatorRigStatus {
    let meshes = 0;
    let bones = 0;
    if (this.gltfRoot) {
      this.gltfRoot.traverse((child) => {
        if ((child as THREE.Bone).isBone) {
          bones += 1;
        }
        if ((child as THREE.Mesh).isMesh) {
          meshes += 1;
        }
      });
    }
    return {
      loaded: this.gltfRoot !== null,
      addedToScene: this.gltfRoot !== null && this.gltfRoot.parent === this.group,
      proceduralHidden: !this.procedural.visible,
      meshes,
      bones,
    };
  }

  async upgrade(): Promise<boolean> {
    if (this.gltfRoot) {
      return true;
    }
    // Concurrent callers (initial attempt + retry timer) must share one
    // run, otherwise two clones of the same GLB get added to the group.
    if (this.upgradeInFlight) {
      return this.upgradeInFlight;
    }
    const run = this.doUpgrade();
    this.upgradeInFlight = run;
    return run.finally(() => {
      this.upgradeInFlight = null;
    });
  }

  private async doUpgrade(): Promise<boolean> {
    this.upgradeAttempted = true;
    let body: Awaited<ReturnType<typeof loadOperatorGltf>> = null;
    try {
      body = await loadOperatorGltf(this.variant);
    } catch (error) {
      console.warn(
        "🎮 [LastStand:Rig] خطأ غير متوقع أثناء تحميل جسم المشغّل:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
    if (!body) {
      console.warn(
        `🎮 [LastStand:Rig] تعذر تحميل أي مصدر للمشغّل «${this.variant}» — بقي النموذج الإجرائي (makeSoldier). التفاصيل في رسائل 🎮 [LastStand:Model]`,
      );
      return false;
    }
    let clipsGltf: Awaited<ReturnType<typeof loadOperatorClipsGltf>> = null;
    try {
      clipsGltf = body.animations.length > 0 ? body : await loadOperatorClipsGltf();
      const instance = createOperatorInstance(this.variant, body, clipsGltf);
      // A real textured humanoid is always preferable to the procedural
      // fallback. When no clip matches its skeleton, the generic bone
      // driver animates it instead of leaving a static T-pose.
      normalizeHumanoidHeight(instance.root, 1.8);
      // Some packs face -Z while the game's forward is +Z.
      instance.root.rotation.y = bodyFacingYaw(`body:${this.variant}`);
      this.gltfRoot = instance.root;
      if (instance.hasMappedClips) {
        this.animator = new OperatorAnimator(instance.root, instance.clips);
        if (this.lastMotion) {
          this.animator.setState(selectOperatorState(this.lastMotion));
        }
        this.usesBoneDriver = false;
      } else {
        this.usesBoneDriver = true;
      }
      this.group.add(instance.root);
      this.procedural.visible = false;
      riggedOperatorTotal += 1;
      console.info(
        `🎮 [LastStand:Rig] تم تركيب النموذج البشري الحقيقي (${this.variant}) — وضع الحركة: ${this.animationMode}`,
      );
      void this.attachWeapon();
      return true;
    } catch (error) {
      console.warn(
        "🎮 [LastStand:Rig] فشل تركيب النموذج بعد تحميله (استنساخ/تطبيع/حركات):",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  private async attachWeapon(): Promise<void> {
    if (this.weaponAttached || !this.gltfRoot) {
      return;
    }
    const weapon = await loadWeaponGltf();
    if (!weapon || !this.gltfRoot) {
      return;
    }
    this.weaponAttached =
      attachWeaponToHand(this.gltfRoot, weapon.scene) || this.attachWeaponFallback(weapon.scene);
  }

  /** Hands the weapon when the rig has no recognizable hand bone. */
  private attachWeaponFallback(weaponScene: THREE.Object3D): boolean {
    if (!this.gltfRoot || this.gltfRoot.getObjectByName("held-weapon")) {
      return false;
    }
    const holder = new THREE.Group();
    holder.name = "held-weapon";
    holder.position.set(0.22, 1.25, 0.3);
    holder.rotation.set(-0.2, 0, 0);
    const gun = weaponScene.clone(true);
    gun.scale.setScalar(0.5);
    gun.rotation.y = Math.PI / 2;
    gun.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      }
    });
    holder.add(gun);
    this.gltfRoot.add(holder);
    return true;
  }

  update(motion: SoldierMotion, dt: number, tier: LodTier = 0): void {
    this.lastMotion = motion;
    const state = selectOperatorState(motion);
    if (this.animator && this.animator.canPlay(state)) {
      this.animator.setState(state);
      this.tick += 1;
      if (this.tick % mixerUpdateInterval(tier) === 0) {
        this.animator.update(dt * mixerUpdateInterval(tier));
      }
      return;
    }
    if (this.gltfRoot) {
      // Clips exist but not for this state (aim/crawl/swim/drive): pose
      // the skeleton directly so those states still read correctly.
      this.animator?.pause();
      driveHumanoidBones(this.gltfRoot, motion);
      return;
    }
    animateSoldier(this.procedural, motion);
  }

  get activeRoot(): THREE.Object3D {
    return this.gltfRoot ?? this.procedural;
  }
}