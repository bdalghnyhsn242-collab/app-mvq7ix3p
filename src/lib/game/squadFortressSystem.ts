import type { Teammate } from "./squad";

export const FORTRESS_DAMAGE_RESIST = 0.3;
export const FORTRESS_ZONE_RADIUS = 14;
export const FORTRESS_HOLD_TIME = 30;
export const FORTRESS_RESPAWN_ARMOR = 50;
export const FORTRESS_CHOPPER_TIME = 3;
export const FORTRESS_COOLDOWN_MULT = 0.75;

export type FortressState = {
  active: boolean;
  x: number;
  z: number;
  holdProgress: number;
  chopperIncoming: boolean;
  chopperTimer: number;
};

export function createFortressState(): FortressState {
  return {
    active: false,
    x: 0,
    z: 0,
    holdProgress: 0,
    chopperIncoming: false,
    chopperTimer: 0,
  };
}

export function activateFortress(
  zone: { x: number; z: number },
): FortressState {
  return {
    active: true,
    x: zone.x,
    z: zone.z,
    holdProgress: 0,
    chopperIncoming: false,
    chopperTimer: 0,
  };
}

export function stepFortress(
  state: FortressState,
  dt: number,
  player: { x: number; z: number },
): FortressState {
  if (!state.active) {
    return state;
  }
  if (state.chopperIncoming) {
    return { ...state, chopperTimer: Math.max(0, state.chopperTimer - dt) };
  }
  const inside =
    Math.hypot(player.x - state.x, player.z - state.z) <= FORTRESS_ZONE_RADIUS;
  const holdProgress = inside
    ? state.holdProgress + dt
    : Math.max(0, state.holdProgress - dt * 1.5);
  if (holdProgress >= FORTRESS_HOLD_TIME) {
    return { ...state, holdProgress, chopperIncoming: true, chopperTimer: FORTRESS_CHOPPER_TIME };
  }
  return { ...state, holdProgress };
}

/** +30% damage resistance while the fortress buff is active. */
export function fortressDamageFactor(state: FortressState): number {
  return state.active && !state.chopperIncoming ? 1 - FORTRESS_DAMAGE_RESIST : 1;
}

/** Faster reload while the fortress buff is active. */
export function fortressCooldownFactor(state: FortressState): number {
  return state.active && !state.chopperIncoming ? FORTRESS_COOLDOWN_MULT : 1;
}

/** Extraction chopper drops all fallen squadmates with standard armor and loadout. */
export function fortressRespawnSquad(
  squad: Teammate[],
  player: { x: number; z: number },
): Teammate[] {
  return squad.map((mate, index) => {
    const angle = (index / Math.max(1, squad.length)) * Math.PI * 2 + 0.4;
    return {
      ...mate,
      x: player.x + Math.cos(angle) * 4,
      z: player.z + Math.sin(angle) * 4,
      state: "active" as const,
      health: 100,
      armor: FORTRESS_RESPAWN_ARMOR,
      bleedTimer: 0,
      reviveProgress: 0,
    };
  });
}