export const MEDEVAC_DRONE_ALTITUDE = 40;
export const MEDEVAC_DRONE_SPEED = 28;
export const MEDEVAC_DESCENT_SPEED = 9;
export const MEDEVAC_HEAL_AMOUNT = 50;
export const MEDEVAC_HEAL_DURATION = 5;
export const MEDEVAC_SMOKE_TIME = 8;
export const MEDEVAC_REVIVE_HEALTH = 50;

export type MedEvacDrone = { x: number; z: number; altitude: number };

export type MedEvacState = {
  active: boolean;
  beacon: { x: number; z: number } | null;
  drone: MedEvacDrone | null;
  mateIndex: number;
  onStation: boolean;
  healTimer: number;
  healed: boolean;
  smokeTimer: number;
};

export function createMedEvacState(): MedEvacState {
  return {
    active: false,
    beacon: null,
    drone: null,
    mateIndex: -1,
    onStation: false,
    healTimer: 0,
    healed: false,
    smokeTimer: 0,
  };
}

export function deployMedEvac(
  state: MedEvacState,
  x: number,
  z: number,
  mateIndex: number,
): MedEvacState {
  if (state.active) {
    return state;
  }
  return {
    active: true,
    beacon: { x, z },
    drone: { x: x - 30, z: z - 30, altitude: MEDEVAC_DRONE_ALTITUDE },
    mateIndex,
    onStation: false,
    healTimer: 0,
    healed: false,
    smokeTimer: 0,
  };
}

/** Nano-field heal rate while the drone is on station. */
export function medEvacHealPerSecond(): number {
  return MEDEVAC_HEAL_AMOUNT / MEDEVAC_HEAL_DURATION;
}

export function stepMedEvac(state: MedEvacState, dt: number): MedEvacState {
  if (!state.active || !state.beacon || !state.drone) {
    return state;
  }
  const next = { ...state, drone: { ...state.drone } };
  if (!next.onStation) {
    const dx = next.beacon.x - next.drone.x;
    const dz = next.beacon.z - next.drone.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.5) {
      const step = Math.min(dist, MEDEVAC_DRONE_SPEED * dt);
      next.drone.x += (dx / dist) * step;
      next.drone.z += (dz / dist) * step;
    }
    next.drone.altitude = Math.max(1.2, next.drone.altitude - MEDEVAC_DESCENT_SPEED * dt);
    if (dist <= 2 && next.drone.altitude <= 1.5) {
      next.onStation = true;
      next.smokeTimer = MEDEVAC_SMOKE_TIME;
    }
    return next;
  }
  next.smokeTimer = Math.max(0, next.smokeTimer - dt);
  if (!next.healed) {
    next.healTimer += dt;
    if (next.healTimer >= MEDEVAC_HEAL_DURATION) {
      next.healed = true;
    }
  }
  if (next.healed && next.smokeTimer <= 0) {
    return createMedEvacState();
  }
  return next;
}