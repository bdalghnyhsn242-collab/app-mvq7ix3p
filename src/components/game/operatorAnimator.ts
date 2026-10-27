import * as THREE from "three";
import type { OperatorClipName } from "@/lib/game/operatorAssets";

export type OperatorState = OperatorClipName;

export const FADE_DURATION = 0.25;

export type OperatorMotionInput = {
  speed01: number;
  swimming?: boolean;
  driving?: boolean;
  downed?: boolean;
  aiming?: boolean;
};

export function selectOperatorState(input: OperatorMotionInput): OperatorState {
  if (input.driving) {
    return "drive";
  }
  if (input.swimming) {
    return "swim";
  }
  if (input.downed) {
    return "crawl";
  }
  if (input.aiming && input.speed01 < 0.3) {
    return "aim";
  }
  return input.speed01 > 0.25 ? "sprint" : "idle";
}

export function mixerUpdateInterval(tier: 0 | 1 | 2): number {
  return [1, 2, 4][tier];
}

export function shouldUpdateMixer(tick: number, tier: 0 | 1 | 2): boolean {
  return tick % mixerUpdateInterval(tier) === 0;
}

export class OperatorAnimator {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<OperatorState, THREE.AnimationAction>();
  private current: OperatorState | null = null;

  constructor(
    root: THREE.Object3D,
    clips: Record<OperatorClipName, THREE.AnimationClip | null>,
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    (Object.keys(clips) as OperatorClipName[]).forEach((state) => {
      const clip = clips[state];
      if (clip) {
        this.actions.set(state, this.mixer.clipAction(clip));
      }
    });
  }

  get state(): OperatorState | null {
    return this.current;
  }

  get hasActions(): boolean {
    return this.actions.size > 0;
  }

  setState(next: OperatorState, fade: number = FADE_DURATION): boolean {
    if (next === this.current) {
      return false;
    }
    const nextAction = this.actions.get(next);
    if (!nextAction) {
      return false;
    }
    nextAction.reset().fadeIn(fade).play();
    if (this.current) {
      this.actions.get(this.current)?.fadeOut(fade);
    }
    this.current = next;
    return true;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  stopAll(): void {
    this.actions.forEach((action) => action.stop());
    this.current = null;
  }
}