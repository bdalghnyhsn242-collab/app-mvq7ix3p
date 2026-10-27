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
  altitude: مumber;
  landed: boolean;
  weapon: WeaponId;
  ammo: number;
  taken: boolean;
};