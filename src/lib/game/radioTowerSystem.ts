export const TOWER_TERMINAL = { x: 6, z: -6 };
export const TOWER_CAPTURE_RADIUS = 5;
export const TOWER_CAPTURE_TIME = 8;
export const RADAR_JAM_DURATION = 60;
export const RADAR_JAM_COOLDOWN = 90;

export type RadioTowerState = {
  captureProgress: number;
  captured: boolean;
  jamTimer: number;
  cooldown: number;
};

export function createRadioTowerState(): RadioTowerState {
  return {
    captureProgress: 0,
    captured: false,
    jamTimer: 0,
    cooldown: 0,
  };
}

export function towerDistance(
  position: { x: number; z: number },
): number {
  return Math.hypot(position.x - TOWER_TERMINAL.x, position.z - TOWER_TERMINAL.z);
}

export function stepRadioTower(
  state: RadioTowerState,
  dt: number,
  squadPositions: { x: number; z: number }[],
): RadioTowerState {
  const next = { ...state };
  next.jamTimer = Math.max(0, next.jamTimer - dt);
  next.cooldown = Math.max(0, next.cooldown - dt);
  if (next.jamTimer <= 0 && next.cooldown <= 0 && next.captured) {
    next.cooldown = RADAR_JAM_COOLDOWN;
    next.captured = false;
    next.captureProgress = 0;
    return next;
  }
  if (next.captured || next.cooldown > 0) {
    next.captureProgress = 0;
    return next;
  }
  const holding = squadPositions.some(
    (position) => towerDistance(position) < TOWER_CAPTURE_RADIUS,
  );
  if (holding) {
    next.captureProgress += dt;
    if (next.captureProgress >= TOWER_CAPTURE_TIME) {
      next.captured = true;
      next.jamTimer = RADAR_JAM_DURATION;
      next.captureProgress = 0;
    }
  } else {
    next.captureProgress = Math.max(0, next.captureProgress - dt * 2);
  }
  return next;
}

/** True while the capturing team sees thermal/radar pings of every entity. */
export function radarRevealActive(state: RadioTowerState): boolean {
  return state.jamTimer > 0;
}

/** True while opponent minimaps/HUDs show static noise and hidden markers. */
export function radarJammedForOpponents(state: RadioTowerState): boolean {
  return state.jamTimer > 0;
}