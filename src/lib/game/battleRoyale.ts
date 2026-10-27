export const ISLAND_RADIUS = 160;
export const ZONE_START_RADIUS = 144;
export const ZONE_MIN_RADIUS = 24;
export const ZONE_SHRINK_RATE = 1.2;
export const PLAYER_SPEED = 18;
export const TURN_SPEED = 2.4;
export const BOT_SPEED = 9;
export const BOT_COUNT = 14;
export const ZONE_DAMAGE_PER_SECOND = 8;
export const CONTACT_DAMAGE_PER_SECOND = 25;
export const WATER_LEVEL = 0;
export const WATER_SPEED_FACTOR = 0.55;
export const SHALLOW_DEPTH = 0.35;

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function terrainHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const island = Math.max(0, 1 - dist / ISLAND_RADIUS);
  const base = island * island * 10;
  const hills = valueNoise(x * 0.02, z * 0.02) * 14 * island;
  const ridge = 1 - Math.abs(valueNoise(x * 0.045, z * 0.045) * 2 - 1);
  const mountains = ridge * ridge * 22 * island * island;
  const detail = valueNoise(x * 0.12, z * 0.12) * 2.4 * island;
  const river = Math.abs(valueNoise(x * 0.015 + 3.7, z * 0.015 - 1.9) - 0.5);
  const riverbed = river < 0.05 ? -(0.05 - river) * 90 * island * Math.min(1, dist / 30) : 0;
  return base + hills + mountains + detail + riverbed - 2.4;
}

export function forestDensity(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const island = Math.max(0, 1 - dist / ISLAND_RADIUS);
  return valueNoise(x * 0.03 + 7.3, z * 0.03 - 2.1) * island;
}

export function movementSpeed(x: number, z: number): number {
  const height = terrainHeight(x, z);
  if (height < WATER_LEVEL + SHALLOW_DEPTH) {
    return PLAYER_SPEED * WATER_SPEED_FACTOR;
  }
  return PLAYER_SPEED;
}

import { createVehicles, damageVehicle, stepVehicle, type Vehicle } from "./vehicles";
import { createAirdropState, stepAirdrops, type AirdropState } from "./airdrops";

export type WeaponId = "pistol" | "smg" | "ar" | "dmr" | "lmg" | "shotgun";
export type Weapon = {
  id: WeaponId;
  name: string;
  range: number;
  arc: number;
  damage: number;
  cooldown: number;
  muzzleVelocity: number;
  bulletDrop: number;
  recoil: number;
  magazine: number;
};
export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol", name: "مسدس M9", range: 18, arc: 0.35, damage: 50, cooldown: 0.5,
    muzzleVelocity: 380, bulletDrop: 0.15, recoil: 0.02, magazine: 12,
  },
  smg: {
    id: "smg", name: "MP5", range: 20, arc: 0.3, damage: 26, cooldown: 0.16,
    muzzleVelocity: 400, bulletDrop: 0.08, recoil: 0.012, magazine: 30,
  },
  ar: {
    id: "ar", name: "M4A1", range: 30, arc: 0.22, damage: 32, cooldown: 0.2,
    muzzleVelocity: 900, bulletDrop: 0.03, recoil: 0.018, magazine: 30,
  },
  dmr: {
    id: "dmr", name: "Kar98k قنص", range: 65, arc: 0.08, damage: 90, cooldown: 1.3,
    muzzleVelocity: 890, bulletDrop: 0.006, recoil: 0.05, magazine: 5,
  },
  lmg: {
    id: "lmg", name: "M249", range: 34, arc: 0.3, damage: 28, cooldown: 0.11,
    muzzleVelocity: 910, bulletDrop: 0.04, recoil: 0.03, magazine: 100,
  },
  shotgun: {
    id: "shotgun", name: "خرطوش S12", range: 10, arc: 0.6, damage: 100, cooldown: 0.8,
    muzzleVelocity: 300, bulletDrop: 0.2, recoil: 0.06, magazine: 8,
  },
};
export const LOOT_COUNT = 8;
export const PICKUP_RADIUS = 1.8;
export type Loot = { x: number; z: number; weapon: WeaponId; ammo: number; taken: boolean };

export function lootWeaponForIndex(index: number): WeaponId {
  const cycle: WeaponId[] = ["ar", "smg", "shotgun", "dmr", "lmg", "pistol"];
  return cycle[index % cycle.length];
}

export type Soldier = { x: number; z: number; angle: number; health: number; alive: boolean };
export type MatchStatus = "idle" | "running" | "won" | "lost";
export type MatchInput = { forward: number; turn: number; enter?: boolean };
export type MatchState = {
  player: Soldier;
  bots: Soldier[];
  zone: { x: number; z: number; radius: number };
  weapon: WeaponId;
  ammo: Record<WeaponId, number>;
  cooldown: number;
  loot: Loot[];
  vehicles: Vehicle[];
  playerVehicle: number;
  airdrop: AirdropState;
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
    const radius = 72 + (i % 3) * 24;
    bots.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      angle: Math.random() * Math.PI * 2,
      health: 100,
      alive: true,
    });
  }
  const loot: Loot[] = [];
  for (let i = 0; i < LOOT_COUNT; i += 1) {
    const angle = (i / LOOT_COUNT) * Math.PI * 2 + 0.4;
    const radius = 32 + (i % 4) * 28;
    const weapon = lootWeaponForIndex(i);
    loot.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      weapon,
      ammo: weapon === "shotgun" ? 8 : weapon === "dmr" ? 10 : weapon === "lmg" ? 60 : 30,
      taken: false,
    });
  }
  return {
    player: { x: 0, z: 0, angle: 0, health: 100, alive: true },
    bots,
    zone: { x: 0, z: 0, radius: ZONE_START_RADIUS },
    weapon: "pistol",
    ammo: { pistol: 24, smg: 0, ar: 0, dmr: 0, lmg: 0, shotgun: 0 },
    cooldown: 0,
    loot,
    vehicles: createVehicles(),
    playerVehicle: -1,
    airdrop: createAirdropState(),
    time: 0,
    status: "running",
  };
}

export function stepMatch(state: MatchState, dt: number, input: MatchInput): MatchState {
  if (state.status !== "running") {
    return state;
  }
  const player = { ...state.player };
  let vehicles = state.vehicles;
  let playerVehicle = state.playerVehicle;

  if (input.enter) {
    if (playerVehicle >= 0) {
      vehicles = vehicles.map((v, i) => (i === playerVehicle ? { ...v, occupied: false } : v));
      playerVehicle = -1;
    } else {
      const idx = vehicles.findIndex(
        (v) => !v.occupied && v.health > 0 && Math.hypot(v.x - player.x, v.z - player.z) < 5,
      );
      if (idx >= 0) {
        playerVehicle = idx;
        vehicles = vehicles.map((v, i) => (i === idx ? { ...v, occupied: true } : v));
      }
    }
  }

  if (playerVehicle >= 0) {
    const driven = stepVehicle(vehicles[playerVehicle], dt, input);
    vehicles = vehicles.map((v, i) => (i === playerVehicle ? driven : v));
    player.x = driven.x;
    player.z = driven.z;
    player.angle = driven.angle;
    clampToIsland(player);
  } else {
    player.angle += input.turn * TURN_SPEED * dt;
    if (input.forward !== 0) {
      const speed = movementSpeed(player.x, player.z);
      player.x += Math.sin(player.angle) * input.forward * speed * dt;
      player.z += Math.cos(player.angle) * input.forward * speed * dt;
      clampToIsland(player);
    }
  }

  const zone = {
    ...state.zone,
    radius: Math.max(ZONE_MIN_RADIUS, state.zone.radius - ZONE_SHRINK_RATE * dt),
  };

  const cooldown = Math.max(0, state.cooldown - dt);
  let weapon = state.weapon;
  const ammo = { ...state.ammo };
  const loot = state.loot.map((crate) => {
    if (crate.taken || Math.hypot(crate.x - player.x, crate.z - player.z) > PICKUP_RADIUS) {
      return crate;
    }
    weapon = crate.weapon;
    ammo[crate.weapon] += crate.ammo;
    return { ...crate, taken: true };
  });

  const bots = state.bots.map((bot) => {
    if (!bot.alive) {
      return bot;
    }
    const next = { ...bot };
    const dx = player.x - next.x;
    const dz = player.z - next.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed = movementSpeed(next.x, next.z) * (BOT_SPEED / PLAYER_SPEED);
    next.x += (dx / dist) * speed * dt;
    next.z += (dz / dist) * speed * dt;
    next.angle = Math.atan2(dx, dz);
    clampToIsland(next);
    return next;
  });

  let health = player.health;
  if (Math.hypot(player.x - zone.x, player.z - zone.z) > zone.radius) {
    health -= ZONE_DAMAGE_PER_SECOND * dt;
  }
  for (const bot of bots) {
    if (!bot.alive || Math.hypot(bot.x - player.x, bot.z - player.z) >= 1.6) {
      continue;
    }
    if (playerVehicle >= 0) {
      const damaged = damageVehicle(vehicles[playerVehicle], CONTACT_DAMAGE_PER_SECOND * dt * 2);
      vehicles = vehicles.map((v, i) => (i === playerVehicle ? damaged : v));
      if (damaged.health <= 0) {
        playerVehicle = -1;
        health -= 15;
      }
    } else {
      health -= CONTACT_DAMAGE_PER_SECOND * dt;
    }
  }

  const airdrop = stepAirdrops(state.airdrop, dt);
  if (airdrop.crate && airdrop.crate.landed && !airdrop.crate.taken) {
    const crate = airdrop.crate;
    if (Math.hypot(crate.x - player.x, crate.z - player.z) < PICKUP_RADIUS + 0.6) {
      weapon = crate.weapon;
      ammo[crate.weapon] += crate.ammo;
      health = Math.min(100, health + 25);
      airdrop.crate = { ...crate, taken: true };
    }
  }

  const next: MatchState = {
    player: { ...player, health },
    bots,
    zone,
    weapon,
    ammo,
    cooldown,
    loot,
    vehicles,
    playerVehicle,
    airdrop,
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

export function shoot(state: MatchState): { state: MatchState; hit: boolean; killed: boolean } {
  if (state.status !== "running") {
    return { state, hit: false, killed: false };
  }
  const weapon = WEAPONS[state.weapon];
  if (state.cooldown > 0 || state.ammo[state.weapon] <= 0) {
    return { state, hit: false, killed: false };
  }
  let targetIndex = -1;
  let targetDist = Infinity;
  state.bots.forEach((bot, index) => {
    if (!bot.alive) {
      return;
    }
    const dx = bot.x - state.player.x;
    const dz = bot.z - state.player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > weapon.range) {
      return;
    }
    let diff = Math.abs(Math.atan2(dx, dz) - state.player.angle);
    if (diff > Math.PI) {
      diff = Math.PI * 2 - diff;
    }
    if (diff <= weapon.arc && dist < targetDist) {
      targetIndex = index;
      targetDist = dist;
    }
  });
  const ammo = { ...state.ammo, [state.weapon]: state.ammo[state.weapon] - 1 };
  if (targetIndex === -1) {
    return { state: { ...state, ammo, cooldown: weapon.cooldown }, hit: false, killed: false };
  }
  const bots = state.bots.map((bot, i) => {
    if (i !== targetIndex) {
      return bot;
    }
    const health = bot.health - weapon.damage;
    return { ...bot, health, alive: health > 0 };
  });
  return {
    state: {
      ...state,
      ammo,
      cooldown: weapon.cooldown,
      bots,
      status: bots.every((bot) => !bot.alive) ? "won" : state.status,
    },
    hit: true,
    killed: !bots[targetIndex].alive,
  };
}