export const ISLAND_RADIUS = 40;
export const ZONE_START_RADIUS = 36;
export const ZONE_MIN_RADIUS = 8;
export const ZONE_SHRINK_RATE = 0.5;
export const PLAYER_SPEED = 10;
export const TURN_SPEED = 2.4;
export const BOT_SPEED = 5;
export const BOT_COUNT = 6;
export const ZONE_DAMAGE_PER_SECOND = 8;
export const CONTACT_DAMAGE_PER_SECOND = 25;

export type WeaponId = "pistol" | "rifle" | "shotgun";
export type Weapon = {
  id: WeaponId;
  name: string;
  range: number;
  arc: number;
  damage: number;
  cooldown: number;
};
export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: { id: "pistol", name: "مسدس", range: 18, arc: 0.35, damage: 50, cooldown: 0.5 },
  rifle: { id: "rifle", name: "بندقية", range: 26, arc: 0.25, damage: 34, cooldown: 0.25 },
  shotgun: { id: "shotgun", name: "خرطوش", range: 10, arc: 0.6, damage: 100, cooldown: 0.8 },
};
export const LOOT_COUNT = 8;
export const PICKUP_RADIUS = 1.8;
export type Loot = { x: number; z: number; weapon: WeaponId; ammo: number; taken: boolean };

export function lootWeaponForIndex(index: number): WeaponId {
  return index % 3 === 0 ? "rifle" : index % 3 === 1 ? "shotgun" : "pistol";
}

export type Soldier = { x: number; z: number; angle: number; health: number; alive: boolean };
export type MatchStatus = "idle" | "running" | "won" | "lost";
export type MatchInput = { forward: number; turn: number };
export type MatchState = {
  player: Soldier;
  bots: Soldier[];
  zone: { x: number; z: number; radius: number };
  weapon: WeaponId;
  ammo: Record<WeaponId, number>;
  cooldown: number;
  loot: Loot[];
  time: number;
  status: MatchStatus;
};

function clampToIsland(point: { x: number; z: number }) {
  const dist = Math.hypot(point.x, point.z);
  const limit = ISLAND_RADIUS - 1;
  if (dist > limit && dist > 0) {
    point.x *= limit / dist;
    point.z *= limit / dist;
  }
}

export function createMatchState(): MatchState {
  const bots: Soldier[] = [];
  for (let i = 0; i < BOT_COUNT; i += 1) {
    const angle = (i / BOT_COUNT) * Math.PI * 2;
    const radius = 18 + (i % 3) * 6;
    bots.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      angle: Math.random() * Math.PI * 2,
      health: 100,
      alive: true,
    });
  }
  return {
    player: { x: 0, z: 0, angle: 0, health: 100, alive: true },
    bots,
    zone: { x: 0, z: 0, radius: ZONE_START_RADIUS },
    time: 0,
    status: "running",
  };
}

export function stepMatch(state: MatchState, dt: number, input: MatchInput): MatchState {
  if (state.status !== "running") {
    return state;
  }
  const player = { ...state.player };
  player.angle += input.turn * TURN_SPEED * dt;
  if (input.forward !== 0) {
    player.x += Math.sin(player.angle) * input.forward * PLAYER_SPEED * dt;
    player.z += Math.cos(player.angle) * input.forward * PLAYER_SPEED * dt;
    clampToIsland(player);
  }

  const zone = {
    ...state.zone,
    radius: Math.max(ZONE_MIN_RADIUS, state.zone.radius - ZONE_SHRINK_RATE * dt),
  };

  const bots = state.bots.map((bot) => {
    if (!bot.alive) {
      return bot;
    }
    const next = { ...bot };
    const dx = player.x - next.x;
    const dz = player.z - next.z;
    const dist = Math.hypot(dx, dz) || 1;
    next.x += (dx / dist) * BOT_SPEED * dt;
    next.z += (dz / dist) * BOT_SPEED * dt;
    next.angle = Math.atan2(dx, dz);
    clampToIsland(next);
    return next;
  });

  let health = player.health;
  if (Math.hypot(player.x - zone.x, player.z - zone.z) > zone.radius) {
    health -= ZONE_DAMAGE_PER_SECOND * dt;
  }
  for (const bot of bots) {
    if (bot.alive && Math.hypot(bot.x - player.x, bot.z - player.z) < 1.6) {
      health -= CONTACT_DAMAGE_PER_SECOND * dt;
    }
  }

  const next: MatchState = {
    player: { ...player, health },
    bots,
    zone,
    time: state.time + dt,
    status: "running",
  };
  if (health <= 0) {
    next.status = "lost";
  } else if (bots.every((bot) => !bot.alive)) {
    next.status = "won";
  }
  return next;
}

export function shoot(state: MatchState): { state: MatchState; hit: boolean } {
  if (state.status !== "running") {
    return { state, hit: false };
  }
  const index = state.bots.findIndex((bot) => {
    if (!bot.alive) {
      return false;
    }
    const dx = bot.x - state.player.x;
    const dz = bot.z - state.player.z;
    if (Math.hypot(dx, dz) > SHOOT_RANGE) {
      return false;
    }
    let diff = Math.abs(Math.atan2(dx, dz) - state.player.angle);
    if (diff > Math.PI) {
      diff = Math.PI * 2 - diff;
    }
    return diff <= SHOOT_ARC;
  });
  if (index === -1) {
    return { state, hit: false };
  }
  const bots = state.bots.map((bot, i) => (i === index ? { ...bot, alive: false } : bot));
  return {
    state: { ...state, bots, status: bots.every((bot) => !bot.alive) ? "won" : state.status },
    hit: true,
  };
}