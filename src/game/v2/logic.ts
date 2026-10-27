/**
 * Pure game logic for the clean v2 rebuild — no three.js dependency, so
 * every rule here is unit-testable without a WebGL context.
 */

export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7.2;
export const ENEMY_SPEED = 2.6;
export const JUMP_VELOCITY = 6.5;
export const GRAVITY = 18;

export type ClipName = "Idle" | "Walk" | "Run";

/**
 * Maps motion to the Soldier.glb clip names. Grounded tiers: idle below a
 * slow shuffle, walk for jogging pace, run only for sprint speed; airborne
 * keeps the run pose.
 */
export function selectClip(speed01: number, grounded: boolean): ClipName {
  if (!grounded) {
    return "Run";
  }
  if (speed01 < 0.12) {
    return "Idle";
  }
  if (speed01 < 0.62) {
    return "Walk";
  }
  return "Run";
}

/**
 * World-space planar direction from camera yaw and WASD input.
 * yaw=0 puts the camera behind the player at +Z, so forward is -Z.
 */
export function moveDirection(
  forwardInput: number,
  strafeInput: number,
  yaw: number,
): { x: number; z: number } {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  let x = fx * forwardInput + rx * strafeInput;
  let z = fz * forwardInput + rz * strafeInput;
  const len = Math.hypot(x, z);
  if (len > 1e-6) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

/** Moves an actor toward a target, stopping at stopDist. */
export function chaseStep(
  ex: number,
  ez: number,
  px: number,
  pz: number,
  speed: number,
  dt: number,
  stopDist: number,
): { x: number; z: number; dist: number; moving: boolean } {
  const dx = px - ex;
  const dz = pz - ez;
  const dist = Math.hypot(dx, dz);
  if (dist <= stopDist) {
    return { x: ex, z: ez, dist, moving: false };
  }
  const step = Math.min(speed * dt, dist - stopDist);
  return {
    x: ex + (dx / dist) * step,
    z: ez + (dz / dist) * step,
    dist: dist - step,
    moving: true,
  };
}

/** Radial push-out so props (trees/rocks/houses) block movement. */
export function pushOutOfObstacles(
  x: number,
  z: number,
  obstacles: { x: number; z: number; r: number }[],
  radius = 0.45,
): { x: number; z: number } {
  let nx = x;
  let nz = z;
  for (const obstacle of obstacles) {
    const dx = nx - obstacle.x;
    const dz = nz - obstacle.z;
    const d = Math.hypot(dx, dz);
    const min = obstacle.r + radius;
    if (d < min && d > 1e-6) {
      nx = obstacle.x + (dx / d) * min;
      nz = obstacle.z + (dz / d) * min;
    }
  }
  return { x: nx, z: nz };
}

/** Shortest-path angle interpolation for smooth model turning. */
export function angleLerp(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  if (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return a + diff * Math.min(1, t);
}