import * as THREE from "three";
import type { OperatorClipName } from "@/lib/game/operatorAssets";

export type OperatorState = OperatorClipName;

export const FADE_DURATION = 0.25;

export type OperatorMotionInput = {
  speed01: number;
  sprinting?: boolean;
  swimming?: boolean;
  driving?: boolean;
  downed?: boolean;
  aiming?: boolean;
  reloading?: boolean;
  jumping?: boolean;
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
  // Three locomotion tiers: idle below a slow shuffle, sprint only when
  // Shift is actually held (or the speed is unmistakably a run), and walk
  // for everything in between — so the soldier never runs in place.
  if (input.speed01 < 0.12) {
    return "idle";
  }
  if (input.sprinting || input.speed01 > 0.85) {
    return "sprint";
  }
  return "walk";
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
  private updateCount = 0;
  private lastUpdateAt = 0;

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

  /** Name of the clip currently playing, for the HUD diagnostics line. */
  get currentClipName(): string | null {
    return this.current ? this.actions.get(this.current)?.getClip().name ?? null : null;
  }

  /** All mapped clips with their tactical state, for the HUD diagnostics. */
  get availableClips(): { state: OperatorState; name: string }[] {
    return [...this.actions.entries()].map(([state, action]) => ({
      state,
      name: action.getClip().name,
    }));
  }

  /** Mixer heartbeat: total updates and the timestamp of the last one. */
  get stats(): { updates: number; lastUpdateAt: number } {
    return { updates: this.updateCount, lastUpdateAt: this.lastUpdateAt };
  }

  /** True when a clip exists for this state (mixer can play it). */
  canPlay(state: OperatorState): boolean {
    return this.actions.has(state);
  }

  /** Fades out the current clip so direct bone posing can take over. */
  pause(): void {
    if (this.current) {
      // stop() (not fadeOut): the mixer is not updated while the bone
      // driver poses the skeleton, so a fadeOut would never progress and
      // the stale action would re-blend into the next clip switch.
      this.actions.get(this.current)?.stop();
      this.current = null;
    }
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
    this.updateCount += 1;
    this.lastUpdateAt = performance.now();
  }

  stopAll(): void {
    this.actions.forEach((action) => action.stop());
    this.current = null;
  }
}