import type { Teammate } from "./squad";

export const CHALLENGE_WINDOW = 30;
export const CHALLENGE_ZONE_RADIUS = 12;
export const CHALLENGE_ZONE_MAX_OFFSET = 40;
export const CHALLENGE_ZONE_CAPTURE_TIME = 12;
export const CHALLENGE_KILLS_REQUIRED = 1;
export const REVIVAL_RESPAWN_HEALTH = 50;

export type RevivalState = {
  active: boolean;
  timer: number;
  zone: { x: number; z: number };
  captureProgress: number;
  kills: number;
  succeeded: boolean;
};

export function createRevivalState(): RevivalState {
  return {
    active: false,
    timer: 0,
    zone: { x: 0, z: 0 },
    captureProgress: 0,
    kills: 0,
    succeeded: false,
  };
}

/** Fires when the player is the last survivor of a 2-5 squad. */
export function shouldTriggerRevival(squad: Teammate[]): boolean {
  return squad.length > 0 && squad.every((mate) => mate.state === "out");
}

export function triggerRevival(player: { x: number; z: number }): RevivalState {
  const angle = Math.random() * Math.PI * 2;
  const offset = 18 + Math.random() * (CHALLENGE_ZONE_MAX_OFFSET - 18);
  return {
    active: true,
    timer: CHALLENGE_WINDOW,
    zone: {
      x: player.x + Math.cos(angle) * offset,
      z: player.z + Math.sin(angle) * offset,
    },
    captureProgress: 0,
    kills: 0,
    succeeded: false,
  };
}

export function stepRevival(
  state: RevivalState,
  dt: number,
  player: { x: number; z: number },
): RevivalState {
  if (!state.active) {
    return state;
  }
  const next = { ...state, timer: state.timer - dt };
  const inside =
    Math.hypot(player.x - next.zone.x, player.z - next.zone.z) < CHALLENGE_ZONE_RADIUS;
  next.captureProgress = inside
    ? next.captureProgress + dt
    : Math.max(0, next.captureProgress - dt * 1.5);
  if (next.captureProgress >= CHALLENGE_ZONE_CAPTURE_TIME || next.kills >= CHALLENGE_KILLS_REQUIRED) {
    next.succeeded = true;
    next.active = false;
    return next;
  }
  if (next.timer <= 0) {
    next.active = false;
  }
  return next;
}

export function registerRevivalKill(state: RevivalState): RevivalState {
  if (!state.active) {
    return state;
  }
  const next = { ...state, kills: state.kills + 1 };
  if (next.kills >= CHALLENGE_KILLS_REQUIRED) {
    next.succeeded = true;
    next.active = false;
  }
  return next;
}

/** Cinematic respawn: all fallen squadmates drop back at 50% health. */
export function respawnSquad(
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
      health: REVIVAL_RESPAWN_HEALTH,
      armor: 25,
      bleedTimer: 0,
      reviveProgress: 0,
    };
  });
}