export const DRONE_SPEED = 13;
export const DRONE_ALTITUDE = 18;
export const DRONE_SPOT_RADIUS = 26;
export const DRONE_SPOTTED_TIME = 6;
export const DRONE_COOLDOWN = 18;
export const DRONE_SPEED_BONUS = 1.35;

export type DroneState = {
  x: number;
  z: number;
  angle: number;
  orbitRadius: number;
  orbitAngle: number;
  spottedTimer: number;
  cooldown: number;
};

export function createDroneState(): DroneState {
  return {
    x: 120,
    z: -120,
    angle: 0,
    orbitRadius: 90,
    orbitAngle: 0,
    spottedTimer: 0,
    cooldown: 0,
  };
}

export function stepDrone(
  state: DroneState,
  dt: number,
  player: { x: number; z: number },
): DroneState {
  const next = { ...state };
  next.orbitAngle += (DRONE_SPEED / Math.max(1, next.orbitRadius)) * dt;
  next.x = Math.cos(next.orbitAngle) * next.orbitRadius;
  next.z = Math.sin(next.orbitAngle) * next.orbitRadius;
  next.angle = next.orbitAngle + Math.PI / 2;
  const dist = Math.hypot(player.x - next.x, player.z - next.z);
  next.spottedTimer = Math.max(0, next.spottedTimer - dt);
  next.cooldown = Math.max(0, next.cooldown - dt);
  if (dist < DRONE_SPOT_RADIUS && next.spottedTimer <= 0 && next.cooldown <= 0) {
    next.spottedTimer = DRONE_SPOTTED_TIME;
    next.cooldown = DRONE_COOLDOWN;
  }
  return next;
}

export function droneSpotBonus(spotted: boolean): number {
  return spotted ? DRONE_SPEED_BONUS : 1;
}