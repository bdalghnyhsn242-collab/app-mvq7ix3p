import * as THREE from "three";
import {
  createOperatorInstance,
  loadOperatorGltf,
  type OperatorVariant,
} from "@/lib/game/operatorAssets";
import {
  mixerUpdateInterval,
  OperatorAnimator,
  selectOperatorState,
} from "./operatorAnimator";
import {
  animateSoldier,
  makeSoldier,
  type SoldierGender,
  type SoldierMotion,
} from "./soldierModel";

export type LodTier = 0 | 1 | 2;

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

export class OperatorRig {
  readonly group = new THREE.Group();
  readonly variant: OperatorVariant;
  private procedural: THREE.Group;
  private animator: OperatorAnimator | null = null;
  private gltfRoot: THREE.Object3D | null = null;
  private tick = 0;
  private lastMotion: SoldierMotion | null = null;

  constructor(camo: "woodland" | "desert" | "ghillie", gender: SoldierGender = "male") {
    this.variant = operatorVariantFor(camo, gender);
    this.procedural = makeSoldier(0x22c55e, camo, gender);
    this.group.add(this.procedural);
  }

  get skeletal(): boolean {
    return this.animator !== null;
  }

  async upgrade(): Promise<boolean> {
    if (this.animator) {
      return true;
    }
    const gltf = await loadOperatorGltf(this.variant);
    if (!gltf) {
      return false;
    }
    const instance = createOperatorInstance(this.variant, gltf);
    this.gltfRoot = instance.root;
    this.animator = new OperatorAnimator(instance.root, instance.clips);
    this.group.add(instance.root);
    this.procedural.visible = false;
    if (this.lastMotion) {
      this.animator.setState(selectOperatorState(this.lastMotion));
    }
    return true;
  }

  update(motion: SoldierMotion, dt: number, tier: LodTier = 0): void {
    this.lastMotion = motion;
    if (this.animator) {
      this.animator.setState(selectOperatorState(motion));
      this.tick += 1;
      if (this.tick % mixerUpdateInterval(tier) === 0) {
        this.animator.update(dt * mixerUpdateInterval(tier));
      }
      return;
    }
    animateSoldier(this.procedural, motion);
  }

  get activeRoot(): THREE.Object3D {
    return this.gltfRoot ?? this.procedural;
  }
}