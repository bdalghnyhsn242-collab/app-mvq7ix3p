import type { WeaponId } from "./battleRoyale";

export const AIRDROP_FIRST_DELAY = 14;
export const AIRDROP_INTERVAL = 24;
export const CRATE_FALL_SPEED = 9;
export const PLANE_SPEED = 42;
export const PLANE_ALTITUDE_CRUISE = 60;
export const PLANE_ALTITUDE_PASS = 32;

export type AirdropCrate = {
  x: number;
  z: number;
  altitude: number;
  landed: boolean;
  weapon: WeaponId;
  ammo: number;
  taken: boolean;
};

export type AirdropState = {
  plane: { x: number; z: number; angle: number; altitude: number };
  crate: AirdropCrate | null;
  timer: number;
  dropsUsed: number;
};

const CRATE_WEAPONS: WeaponId[] = ["dmr", "lmg", "ar"];

export function createAirdropState(): AirdropState {
  return {
    plane: { x: -220, z: -140, angle: 0.65, altitude: PLANE_ALTITUDE_PASS },
    crate: null,
    timer: AIRDROP_FIRST_DELAY,
    dropsUsed: 0,
  };
}

export function stepAirdrops(state: AirdropState, dt: number): AirdropState {
  const plane = { ...state.plane };
  plane.altitude += (PLANE_ALTITUDE_CRUISE - plane.altitude) * Math.min(1, dt * 0.25);
  plane.x += Math.sin(plane.angle) * PLANE_SPEED * dt;
  plane.z += Math.cos(plane.angle) * PLANE_SPEED * dt;
  if (Math.hypot(plane.x, plane.z) > 420) {
    plane.x = -plane.x * 0.9;
    plane.z = -plane.z * 0.9;
    plane.angle += Math.PI * (0.8 + Math.random() * 0.4);
  }
  let crate = state.crate ? { ...state.crate } : null;
  let timer = state.timer - dt;
  let dropsUsed = state.dropsUsed;
  if (!crate && timer <= 0) {
    crate = {
      x: plane.x,
      z: plane.z,
      altitude: plane.altitude,
      landed: false,
      weapon: CRATE_WEAPONS[dropsUsed % CRATE_WEAPONS.length],
      ammo: 20,
      taken: false,
    };
    dropsUsed += 1;
    timer = AIRDROP_INTERVAL;
  }
  if (crate && !crate.landed) {
    crate.altitude -= CRATE_FALL_SPEED * dt;
    if (crate.altitude <= 0) {
      crate.altitude = 0;
      crate.landed = true;
    }
  }
  return { plane, crate, timer, dropsUsed };
}