import { WEAPONS, type WeaponId } from "./battleRoyale";
import type { SquadSize } from "./squad";

export const LOBBY_COUNTDOWN = 20;
export const TARGET_COUNT = 3;
export const TARGET_HIT_FLASH = 0.4;
export const LOBBY_RANGE = 30;
export const LOBBY_ARC = 0.35;
export const LOBBY_START_AMMO = 24;

export type OperatorGender = "male" | "female";

export type LobbyTarget = { x: number; z: number; hitFlash: number };

export type LobbyState = {
  countdown: number;
  gender: OperatorGender;
  squadSize: SquadSize;
  weapon: WeaponId;
  ammo: number;
  cooldown: number;
  targets: LobbyTarget[];
  shots: number;
  hits: number;
  status: "waiting" | "launching";
};

export function createLobbyState(): LobbyState {
  const targets: LobbyTarget[] = [];
  for (let i = 0; i < TARGET_COUNT; i += 1) {
    targets.push({ x: (i - (TARGET_COUNT - 1) / 2) * 5, z: 16, hitFlash: 0 });
  }
  return {
    countdown: LOBBY_COUNTDOWN,
    gender: "male",
    squadSize: 1,
    weapon: "pistol",
    ammo: LOBBY_START_AMMO,
    cooldown: 0,
    targets,
    shots: 0,
    hits: 0,
    status: "waiting",
  };
}

export function stepLobby(state: LobbyState, dt: number): LobbyState {
  const next: LobbyState = {
    ...state,
    cooldown: Math.max(0, state.cooldown - dt),
    targets: state.targets.map((target) => ({
      ...target,
      hitFlash: Math.max(0, target.hitFlash - dt),
    })),
  };
  if (next.status === "waiting") {
    next.countdown -= dt;
    if (next.countdown <= 0) {
      next.countdown = 0;
      next.status = "launching";
    }
  }
  return next;
}

export function lobbyShoot(state: LobbyState): { state: LobbyState; hit: boolean } {
  if (state.status !== "waiting" || state.cooldown > 0 || state.ammo <= 0) {
    return { state, hit: false };
  }
  const weapon = WEAPONS[state.weapon];
  let targetIndex = -1;
  let targetDist = Infinity;
  state.targets.forEach((target, index) => {
    const dist = Math.hypot(target.x, target.z);
    if (dist > LOBBY_RANGE) {
      return;
    }
    const diff = Math.abs(Math.atan2(target.x, target.z));
    if (diff <= LOBBY_ARC && dist < targetDist) {
      targetIndex = index;
      targetDist = dist;
    }
  });
  const targets = state.targets.map((target, i) =>
    i === targetIndex ? { ...target, hitFlash: TARGET_HIT_FLASH } : target,
  );
  return {
    state: {
      ...state,
      targets,
      ammo: state.ammo - 1,
      cooldown: weapon.cooldown,
      shots: state.shots + 1,
      hits: state.hits + (targetIndex >= 0 ? 1 : 0),
    },
    hit: targetIndex >= 0,
  };
}

export function lobbySelectWeapon(state: LobbyState, weapon: WeaponId): LobbyState {
  return { ...state, weapon, ammo: LOBBY_START_AMMO };
}

export function lobbyDeployNow(state: LobbyState): LobbyState {
  return { ...state, countdown: 0, status: "launching" };
}