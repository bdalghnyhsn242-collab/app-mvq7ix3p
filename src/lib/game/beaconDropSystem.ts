import type { WeaponId } from "./battleRoyale";

export const BEACON_COUNTDOWN = 10;
export const BEACON_PLANE_SPEED = 55;
export const BEACON_PLANE_ALTITUDE = 70;
export const BEACON_CRATE_FALL_SPEED = 12;
export const BEACON_ALERT_TIME = 8;
export const BEACON_PICKUP_RADIUS = 2.4;

export type BeaconPlane = { x: number; z: number; angle: number; altitude: number };

export type BeaconDrop = {
  x: number;
  z: number;
  timer: number;
  plane: BeaconPlane | null;
  crate: {
    x: number;
    z: number;
    altitude: number;
    landed: boolean;
    taken: boolean;
    weapon: WeaponId;
  } | null;
  alertTimer: number;
};

export type BeaconState = {
  held: number;
  drop: BeaconDrop | null;
};

const SUPPLY_WEAPONS: WeaponId[] = ["dmr", "lmg", "ar"];

export function createBeaconState(): BeaconState {
  return { held: 0, drop: null };
}

export function deployBeacon(
  state: BeaconState,
  x: number,
  z: number,
  dropIndex: number,
): BeaconState {
  if (state.held <= 0 || state.drop) {
    return state;
  }
  return {
    held: state.held - 1,
    drop: {
      x,
      z,
      timer: BEACON_COUNTDOWN,
      plane: null,
      crate: null,
      alertTimer: BEACON_ALERT_TIME,
      weapon: SUPPLY_WEAPONS[dropIndex % SUPPLY_WEAPONS.length],
    },
  };
}

export function stepBeacons(state: BeaconState, dt: number): BeaconState {
  const drop = state.drop ? { ...state.drop } : null;
  if (drop) {
    drop.alertTimer = Math.max(0, drop.alertTimer - dt);
    if (drop.crate === null && drop.plane === null) {
      drop.timer -= dt;
      if (drop.timer <= 0) {
        drop.plane = {
          x: drop.x - 120,
          z: drop.z - 90,
          angle: Math.atan2(90, 120),
          altitude: BEACON_PLANE_ALTITUDE,
        };
      }
    } else if (drop.plane) {
      const plane = { ...drop.plane };
      const dx = drop.x - plane.x;
      const dz = drop.z - plane.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) {
        drop.crate = {
          x: drop.x,
          z: drop.z,
          altitude: plane.altitude,
          landed: false,
          taken: false,
          weapon: drop.weapon,
        };
        drop.plane = null;
      } else {
        plane.x += (dx / dist) * BEACON_PLANE_SPEED * dt;
        plane.z += (dz / dist) * BEACON_PLANE_SPEED * dt;
        drop.plane = plane;
      }
    } else if (drop.crate) {
      const crate = { ...drop.crate };
      crate.altitude -= BEACON_CRATE_FALL_SPEED * dt;
      if (crate.altitude <= 0) {
        crate.altitude = 0;
        crate.landed = true;
      }
      drop.crate = crate;
    }
  }
  return { held: state.held, drop };
}

/** Tier-3 armor, scoped high-power weapon, and full health kits. */
export function beaconCrateRewards(): {
  armor: number;
  health: number;
  ammo: number;
} {
  return { armor: 100, health: 100, ammo: 40 };
}