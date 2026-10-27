export const DOME_RADIUS = 8;
export const DOME_MAX_INTEGRITY = 120;
export const DOME_DECAY_PER_SECOND = 1.2;

export type ShieldDomeState = {
  active: boolean;
  x: number;
  z: number;
  integrity: number;
};

export function createShieldDomeState(): ShieldDomeState {
  return { active: false, x: 0, z: 0, integrity: 0 };
}

export function deployShieldDome(
  state: ShieldDomeState,
  x: number,
  z: number,
): ShieldDomeState {
  return { active: true, x, z, integrity: DOME_MAX_INTEGRITY };
}

export function stepShieldDome(state: ShieldDomeState, dt: number): ShieldDomeState {
  if (!state.active) {
    return state;
  }
  const integrity = state.integrity - DOME_DECAY_PER_SECOND * dt;
  if (integrity <= 0) {
    return { active: false, x: state.x, z: state.z, integrity: 0 };
  }
  return { ...state, integrity };
}

export function isInsideDome(
  state: ShieldDomeState,
  x: number,
  z: number,
): boolean {
  return state.active && Math.hypot(x - state.x, z - state.z) <= DOME_RADIUS;
}

/** Absorbs incoming ballistic damage for protected entities; returns what leaks through. */
export function domeAbsorb(
  state: ShieldDomeState,
  x: number,
  z: number,
  damage: number,
): { leaked: number; absorbed: number } {
  if (damage <= 0 || !isInsideDome(state, x, z)) {
    return { leaked: damage, absorbed: 0 };
  }
  const absorbed = Math.min(state.integrity, damage);
  return { leaked: damage - absorbed, absorbed };
}

export function drainDome(state: ShieldDomeState, absorbed: number): ShieldDomeState {
  if (absorbed <= 0) {
    return state;
  }
  const integrity = Math.max(0, state.integrity - absorbed);
  return { ...state, integrity, active: integrity > 0 };
}