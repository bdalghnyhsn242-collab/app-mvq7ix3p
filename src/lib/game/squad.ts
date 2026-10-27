export const SQUAD_SIZES = [1, 2, 3, 5] as const;
export type SquadSize = (typeof SQUAD_SIZES)[number];

export const BLEED_OUT_TIME = 30;
export const REVIVE_TIME = 5;
export const REVIVE_RADIUS = 3.2;
export const DOWNED_CRAWL_SPEED = 1.2;
export const REVIVE_HEALTH = 40;
export const FOLLOW_DISTANCE = 4;

export type TeammateState = "active" | "downed" | "out";

export type Teammate = {
  x: number;
  z: number;
  angle: number;
  health: number;
  armor: number;
  state: TeammateState;
  bleedTimer: number;
  reviveProgress: number;
};

export function createSquad(size: SquadSize): Teammate[] {
  const teammates: Teammate[] = [];
  const count = size - 1;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + 0.5;
    teammates.push({
      x: Math.cos(angle) * 3,
      z: Math.sin(angle) * 3,
      angle: 0,
      health: 100,
      armor: 50,
      state: "active",
      bleedTimer: 0,
      reviveProgress: 0,
    });
  }
  return teammates;
}

export function knockDown(mate: Teammate): Teammate {
  if (mate.state !== "active") {
    return mate;
  }
  return {
    ...mate,
    state: "downed",
    health: 30,
    bleedTimer: BLEED_OUT_TIME,
    reviveProgress: 0,
  };
}

export function stepSquad(
  squad: Teammate[],
  dt: number,
  player: { x: number; z: number },
  input: { revive: boolean },
  zone: { x: number; z: number; radius: number },
): Teammate[] {
  return squad.map((mate) => {
    if (mate.state === "out") {
      return mate;
    }
    const next = { ...mate };
    const dx = player.x - next.x;
    const dz = player.z - next.z;
    const dist = Math.hypot(dx, dz) || 1;
    next.angle = Math.atan2(dx, dz);
    if (next.state === "active") {
      if (dist > FOLLOW_DISTANCE) {
        const speed = Math.min(16, dist * 1.5);
        next.x += (dx / dist) * speed * dt;
        next.z += (dz / dist) * speed * dt;
      }
    } else {
      next.x += (dx / dist) * DOWNED_CRAWL_SPEED * dt;
      next.z += (dz / dist) * DOWNED_CRAWL_SPEED * dt;
      next.bleedTimer -= dt;
      if (next.bleedTimer <= 0) {
        return { ...next, state: "out" as const };
      }
      if (dist < REVIVE_RADIUS && input.revive) {
        next.reviveProgress += dt;
        if (next.reviveProgress >= REVIVE_TIME) {
          return {
            ...next,
            state: "active" as const,
            health: REVIVE_HEALTH,
            reviveProgress: 0,
            bleedTimer: 0,
          };
        }
      } else {
        next.reviveProgress = Math.max(0, next.reviveProgress - dt * 2);
      }
    }
    if (Math.hypot(next.x - zone.x, next.z - zone.z) > zone.radius) {
      next.health -= 8 * dt;
      if (next.state === "active" && next.health <= 0) {
        return knockDown(next);
      }
      if (next.state === "downed" && next.health <= -30) {
        return { ...next, state: "out" as const };
      }
    }
    return next;
  });
}