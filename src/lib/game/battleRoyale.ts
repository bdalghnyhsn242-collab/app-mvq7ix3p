export const ISLAND_RADIUS = 160;
export const ZONE_START_RADIUS = 144;
export const ZONE_MIN_RADIUS = 24;
export const ZONE_SHRINK_RATE = 1.2;
export const PLAYER_SPEED = 18;
export const TURN_SPEED = 2.4;
export const BOT_SPEED = 9;
export const BOT_COUNT = 99;
export const BOT_CULL_DISTANCE = 170;
export const BOT_LOD_DISTANCE = 70;
export const ZONE_DAMAGE_PER_SECOND = 8;
export const ZONE_WALL_DAMAGE_PER_SECOND = 15;
export const CONTACT_DAMAGE_PER_SECOND = 25;
export const WATER_LEVEL = 0;
export const WATER_SPEED_FACTOR = 0.55;
export const SHALLOW_DEPTH = 0.35;
export const SWIM_DEPTH = 1.1;
export const SWIM_SPEED_FACTOR = 0.45;
export const DEPLOY_PLANE_ALTITUDE = 55;
export const DEPLOY_PLANE_SPEED = 46;
export const FALL_SPEED_FAST = 24;
export const FALL_SPEED_CHUTE = 6;
export const CHUTE_ALTITUDE = 40;
export const AI_VEHICLE_SEEK_RADIUS = 14;
export const RUNOVER_DAMAGE_PER_SECOND = 45;
export const EXPLOSION_RADIUS = 9;
export const EXPLOSION_DAMAGE = 50;
export const EXPLOSION_DURATION = 0.8;
export const TRACER_LIFE = 0.12;

export const BUILDING_POSITIONS = [
  { x: 42, z: -34 },
  { x: -58, z: 26 },
  { x: 24, z: 64 },
  { x: -34, z: -62 },
] as const;

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
  if (height < WATER_LEVEL - SWIM_DEPTH) {
    return PLAYER_SPEED * SWIM_SPEED_FACTOR;
  }
  if (height < WATER_LEVEL + SHALLOW_DEPTH) {
    return PLAYER_SPEED * WATER_SPEED_FACTOR;
  }
  return PLAYER_SPEED;
}

export function isSwimming(x: number, z: number): boolean {
  return terrainHeight(x, z) < WATER_LEVEL - SWIM_DEPTH;
}

export type Obstacle = { x: number; z: number; r: number };

export const OBSTACLES: Obstacle[] = (() => {
  const list: Obstacle[] = BUILDING_POSITIONS.map((position) => ({
    x: position.x,
    z: position.z,
    r: 7,
  }));
  for (let i = 0; i < 48; i += 1) {
    const angle = hash2(i * 3.1 + 1.7, i * 7.7 - 0.3) * Math.PI * 2;
    const radius = 12 + hash2(i * 1.3 + 4.2, i * 9.1 + 2.8) * (ISLAND_RADIUS - 24);
    list.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      r: 1.6 + hash2(i + 0.5, i + 2.5) * 1.6,
    });
  }
  return [...list, ...expansionObstacles()];
})();

export function steerAroundObstacles(
  x: number,
  z: number,
  angle: number,
  desiredTurn: number,
  obstacles: Obstacle[],
): number {
  const probeX = x + Math.sin(angle) * 7;
  const probeZ = z + Math.cos(angle) * 7;
  for (const obstacle of obstacles) {
    const dx = probeX - obstacle.x;
    const dz = probeZ - obstacle.z;
    if (Math.hypot(dx, dz) > obstacle.r + 2.2) {
      continue;
    }
    const lateral = (obstacle.x - x) * Math.cos(angle) - (obstacle.z - z) * Math.sin(angle);
    const away = lateral >= 0 ? -1 : 1;
    return Math.max(-1, Math.min(1, desiredTurn + away * 1.5));
  }
  return desiredTurn;
}

export function steerAround(
  x: number,
  z: number,
  angle: number,
  desiredTurn: number,
): number {
  return steerAroundObstacles(x, z, angle, desiredTurn, OBSTACLES);
}

export function blastDamage(bx: number, bz: number, x: number, z: number): number {
  const dist = Math.hypot(x - bx, z - bz);
  return dist < EXPLOSION_RADIUS ? EXPLOSION_DAMAGE * (1 - dist / EXPLOSION_RADIUS) : 0;
}

export type DeployPhase = "plane" | "falling" | "landed";
export type Deployment = {
  phase: DeployPhase;
  altitude: number;
  chute: boolean;
  plane: { x: number; z: number; angle: number };
};

export function createDeployment(): Deployment {
  return {
    phase: "plane",
    altitude: DEPLOY_PLANE_ALTITUDE,
    chute: false,
    plane: { x: -240, z: -170, angle: 0.62 },
  };
}

export function landedDeployment(): Deployment {
  return { phase: "landed", altitude: 0, chute: false, plane: { x: 0, z: 0, angle: 0 } };
}

export function stepDeployment(deployment: Deployment, dt: number): Deployment {
  const next = { ...deployment, plane: { ...deployment.plane } };
  if (next.phase === "plane") {
    next.plane.x += Math.sin(next.plane.angle) * DEPLOY_PLANE_SPEED * dt;
    next.plane.z += Math.cos(next.plane.angle) * DEPLOY_PLANE_SPEED * dt;
    return next;
  }
  if (next.phase === "falling") {
    next.chute = next.altitude < CHUTE_ALTITUDE;
    next.altitude -= (next.chute ? FALL_SPEED_CHUTE : FALL_SPEED_FAST) * dt;
    if (next.altitude <= 0) {
      next.altitude = 0;
      next.phase = "landed";
      next.chute = false;
    }
  }
  return next;
}

import {
  createVehicles,
  coolTurret,
  damageVehicle,
  destroyVehicle,
  hasTurret,
  stepVehicle,
  TURRET_DAMAGE,
  TURRET_INTERVAL,
  TURRET_RANGE,
  PLAYER_TURRET_COOLDOWN,
  PLAYER_TURRET_DAMAGE,
  PLAYER_TURRET_RANGE,
  type Vehicle,
} from "./vehicles";
import { createAirdropState, stepAirdrops, type AirdropState } from "./airdrops";
import { createSquad, knockDown, stepSquad, type SquadSize, type Teammate } from "./squad";
import { createWeatherState, stepWeather, weatherEffects, type WeatherState } from "./weather";
import { createDroneState, stepDrone, droneSpotBonus, type DroneState } from "./drones";
import { applyAttachment, attachmentForIndex, type AttachmentId } from "./arsenal";
import {
  createRadioTowerState,
  stepRadioTower,
  type RadioTowerState,
} from "./radioTowerSystem";
import {
  BEACON_PICKUP_RADIUS,
  beaconCrateRewards,
  createBeaconState,
  deployBeacon,
  stepBeacons,
  type BeaconState,
} from "./beaconDropSystem";
import {
  createDustStormState,
  stepDustStorm,
  withDustStorm,
  type DustStormState,
} from "./weatherSystem";
import {
  createRevivalState,
  registerRevivalKill,
  respawnSquad,
  shouldTriggerRevival,
  stepRevival,
  triggerRevival,
  type RevivalState,
} from "./squadRevivalSystem";
import {
  DOME_MAX_INTEGRITY,
  domeAbsorb,
  drainDome,
  createShieldDomeState,
  deployShieldDome,
  stepShieldDome,
  type ShieldDomeState,
} from "./shieldDomeSystem";
import {
  SENTRY_MELEE_DPS,
  SENTRY_STUN_SLOW,
  SENTRY_STUN_TIME,
  canRetrieveSentry,
  createSentryState,
  damageSentry,
  deploySentry,
  stepSentry,
  type SentryTurretState,
} from "./sentryTurretSystem";
import {
  MEDEVAC_REVIVE_HEALTH,
  createMedEvacState,
  deployMedEvac,
  medEvacHealPerSecond,
  stepMedEvac,
  type MedEvacState,
} from "./medEvacDroneSystem";
import {
  FORTRESS_CHOPPER_TIME,
  activateFortress,
  createFortressState,
  fortressCooldownFactor,
  fortressDamageFactor,
  fortressRespawnSquad,
  stepFortress,
  type FortressState,
} from "./squadFortressSystem";
import {
  expansionLootSpots,
  expansionObstacles,
} from "./worldExpansion";
export { EXPANSION_LOOT_COUNT } from "./worldExpansion";

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
export type Loot = {
  x: number;
  z: number;
  weapon: WeaponId;
  ammo: number;
  taken: boolean;
  attachment?: AttachmentId;
  beacon?: boolean;
  shield?: boolean;
  sentry?: boolean;
  medevac?: boolean;
};

export function lootWeaponForIndex(index: number): WeaponId {
  const cycle: WeaponId[] = ["ar", "smg", "shotgun", "dmr", "lmg", "pistol"];
  return cycle[index % cycle.length];
}

export type Soldier = { x: number; z: number; angle: number; health: number; alive: boolean };
export type MatchStatus = "idle" | "running" | "won" | "lost";
export type MatchInput = {
  forward: number;
  turn: number;
  enter?: boolean;
  drop?: boolean;
  revive?: boolean;
  beacon?: boolean;
  shield?: boolean;
  sentry?: boolean;
  medevac?: boolean;
};
export type Tracer = { x1: number; z1: number; x2: number; z2: number; life: number };
export type Explosion = { x: number; z: number; timer: number };
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
  weather: WeatherState;
  drone: DroneState;
  radio: RadioTowerState;
  beacon: BeaconState;
  dust: DustStormState;
  revival: RevivalState;
  shield: ShieldDomeState;
  sentry: SentryTurretState;
  medevac: MedEvacState;
  fortress: FortressState;
  gadgets: { shield: number; sentry: number; medevac: number };
  attachments: Partial<Record<WeaponId, AttachmentId>>;
  squadSize: SquadSize;
  squad: Teammate[];
  deployment: Deployment;
  tracers: Tracer[];
  explosions: Explosion[];
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

export function createMatchState(squadSize: SquadSize = 1): MatchState {
  const bots: Soldier[] = [];
  for (let i = 0; i < BOT_COUNT; i += 1) {
    const angle = (i / BOT_COUNT) * Math.PI * 2 + (i % 7) * 0.11;
    const radius = 18 + ((i * 53) % 122);
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
      attachment: i % 3 === 0 ? attachmentForIndex(i) : undefined,
      beacon: i === 2,
      shield: i === 3,
      sentry: i === 5,
    });
  }
  BUILDING_POSITIONS.forEach((position, i) => {
    const weapon = lootWeaponForIndex(i + 2);
    loot.push({
      x: position.x + 2,
      z: position.z + 2,
      weapon,
      ammo: weapon === "shotgun" ? 8 : weapon === "dmr" ? 10 : weapon === "lmg" ? 60 : 30,
      taken: false,
      attachment: attachmentForIndex(i + 4),
    });
  });
  expansionLootSpots().forEach((spot, i) => {
    const weapon = lootWeaponForIndex(i + 3);
    loot.push({
      x: spot.x,
      z: spot.z,
      weapon,
      ammo: weapon === "shotgun" ? 8 : weapon === "dmr" ? 10 : weapon === "lmg" ? 60 : 30,
      taken: false,
      attachment: attachmentForIndex(i + 2),
    });
  });
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
    weather: createWeatherState(),
    drone: createDroneState(),
    radio: createRadioTowerState(),
    beacon: createBeaconState(),
    dust: createDustStormState(),
    revival: createRevivalState(),
    shield: createShieldDomeState(),
    sentry: createSentryState(),
    medevac: createMedEvacState(),
    fortress: createFortressState(),
    gadgets: { shield: 0, sentry: 0, medevac: 0 },
    attachments: {},
    squadSize,
    squad: createSquad(squadSize),
    deployment: createDeployment(),
    tracers: [],
    explosions: [],
    time: 0,
    status: "running",
  };
}

export function applyVehicleDestruction(
  vehicles: Vehicle[],
  index: number,
  player: { x: number; z: number },
  bots: Soldier[],
  squad: Teammate[],
): {
  vehicles: Vehicle[];
  bots: Soldier[];
  squad: Teammate[];
  playerDamage: number;
  explosion: Explosion;
} {
  const vehicle = vehicles[index];
  const explosion: Explosion = { x: vehicle.x, z: vehicle.z, timer: EXPLOSION_DURATION };
  const botsNext = bots.map((bot) => {
    if (!bot.alive) {
      return bot;
    }
    const damage = blastDamage(vehicle.x, vehicle.z, bot.x, bot.z);
    if (damage <= 0) {
      return bot;
    }
    const health = bot.health - damage;
    return { ...bot, health, alive: health > 0 };
  });
  const squadNext = squad.map((mate) => {
    if (mate.state !== "active") {
      return mate;
    }
    const damage = blastDamage(vehicle.x, vehicle.z, mate.x, mate.z);
    if (damage <= 0) {
      return mate;
    }
    const armorBefore = mate.armor;
    const next = {
      ...mate,
      armor: Math.max(0, armorBefore - damage),
      health: mate.health - Math.max(0, damage - armorBefore),
    };
    return next.health <= 0 ? knockDown(next) : next;
  });
  return {
    vehicles: vehicles.map((v, i) => (i === index ? destroyVehicle(v) : v)),
    bots: botsNext,
    squad: squadNext,
    playerDamage: blastDamage(vehicle.x, vehicle.z, player.x, player.z),
    explosion,
  };
}

export function stepMatch(state: MatchState, dt: number, input: MatchInput): MatchState {
  if (state.status !== "running") {
    return state;
  }
  const player = { ...state.player };

  if (state.deployment.phase !== "landed") {
    let deployment = stepDeployment(state.deployment, dt);
    const airborne = { ...state.player };
    if (deployment.phase === "plane") {
      airborne.x = deployment.plane.x;
      airborne.z = deployment.plane.z;
      airborne.angle = deployment.plane.angle;
      const headingAway =
        airborne.x * Math.sin(deployment.plane.angle) +
        airborne.z * Math.cos(deployment.plane.angle) >
        0;
      if (
        input.drop ||
        (headingAway && Math.hypot(airborne.x, airborne.z) > ISLAND_RADIUS + 30)
      ) {
        deployment = { ...deployment, phase: "falling" };
      }
    } else {
      airborne.x += Math.sin(deployment.plane.angle) * 6 * dt;
      airborne.z += Math.cos(deployment.plane.angle) * 6 * dt;
    }
    return {
      ...state,
      player: airborne,
      deployment,
      airdrop: stepAirdrops(state.airdrop, dt),
      time: state.time + dt,
    };
  }

  const tracers = state.tracers
    .map((tracer) => ({ ...tracer, life: tracer.life - dt }))
    .filter((tracer) => tracer.life > 0);
  const explosions = state.explosions
    .map((explosion) => ({ ...explosion, timer: explosion.timer - dt }))
    .filter((explosion) => explosion.timer > 0);

  const dust = stepDustStorm(state.dust, dt);
  const weather = withDustStorm(stepWeather(state.weather, dt), dust);
  const effects = weatherEffects(weather);
  const drone = stepDrone(state.drone, dt, player);
  const droneBonus = droneSpotBonus(drone.spottedTimer > 0);
  const radio = stepRadioTower(state.radio, dt, [
    { x: player.x, z: player.z },
    ...state.squad
      .filter((mate) => mate.state === "active")
      .map((mate) => ({ x: mate.x, z: mate.z })),
  ]);
  let beacon = input.beacon
    ? deployBeacon(state.beacon, player.x, player.z, Math.floor(state.time))
    : state.beacon;
  beacon = stepBeacons(beacon, dt);

  let vehicles = state.vehicles;
  let playerVehicle = state.playerVehicle;

  if (input.enter) {
    if (playerVehicle >= 0) {
      vehicles = vehicles.map((v, i) => (i === playerVehicle ? { ...v, occupied: false } : v));
      playerVehicle = -1;
    } else {
      const idx = vehicles.findIndex(
        (v) =>
          !v.occupied &&
          v.driverBot < 0 &&
          v.health > 0 &&
          Math.hypot(v.x - player.x, v.z - player.z) < 5,
      );
      if (idx >= 0) {
        playerVehicle = idx;
        vehicles = vehicles.map((v, i) => (i === idx ? { ...v, occupied: true } : v));
      }
    }
  }

  if (playerVehicle >= 0) {
    const driven = coolTurret(stepVehicle(vehicles[playerVehicle], dt, input), dt);
    vehicles = vehicles.map((v, i) => (i === playerVehicle ? driven : v));
    player.x = driven.x;
    player.z = driven.z;
    player.angle = driven.angle;
    clampToIsland(player);
  } else {
    player.angle += input.turn * TURN_SPEED * dt;
    if (input.forward !== 0) {
      const speed = movementSpeed(player.x, player.z) * effects.speedFactor;
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
  const attachments = { ...state.attachments };
  let beaconHeld = beacon.held;
  const loot = state.loot.map((crate) => {
    if (crate.taken || Math.hypot(crate.x - player.x, crate.z - player.z) > PICKUP_RADIUS) {
      return crate;
    }
    weapon = crate.weapon;
    ammo[crate.weapon] += crate.ammo;
    if (crate.beacon) {
      beaconHeld += 1;
    }
    if (crate.attachment) {
      attachments[crate.weapon] = crate.attachment;
    }
    return { ...crate, taken: true };
  });
  beacon = { ...beacon, held: beaconHeld };

  let health = player.health;
  if (beacon.drop?.crate && beacon.drop.crate.landed && !beacon.drop.crate.taken) {
    const crate = beacon.drop.crate;
    if (Math.hypot(crate.x - player.x, crate.z - player.z) < BEACON_PICKUP_RADIUS) {
      const rewards = beaconCrateRewards();
      weapon = crate.weapon;
      ammo[crate.weapon] += rewards.ammo;
      health = Math.min(100, health + rewards.health);
      beacon = {
        ...beacon,
        drop: beacon.drop
          ? { ...beacon.drop, crate: { ...crate, taken: true } }
          : null,
      };
    }
  }
  const squadHits: Record<number, number> = {};
  const blasts: { x: number; z: number }[] = [];
  const wreckVehicle = (index: number) => {
    const vehicle = vehicles[index];
    vehicles = vehicles.map((v, i) => (i === index ? destroyVehicle(v) : v));
    explosions.push({ x: vehicle.x, z: vehicle.z, timer: EXPLOSION_DURATION });
    blasts.push({ x: vehicle.x, z: vehicle.z });
    health -= blastDamage(vehicle.x, vehicle.z, player.x, player.z);
  };
  let bots = state.bots.map((bot, botIndex) => {
    if (!bot.alive) {
      return bot;
    }
    const next = { ...bot };
    const drivenIndex = vehicles.findIndex((v) => v.driverBot === botIndex);
    if (drivenIndex >= 0) {
      const vehicle = vehicles[drivenIndex];
      const dx = player.x - vehicle.x;
      const dz = player.z - vehicle.z;
      const dist = Math.hypot(dx, dz) || 1;
      let diff = Math.atan2(dx, dz) - vehicle.angle;
      while (diff > Math.PI) {
        diff -= Math.PI * 2;
      }
      while (diff < -Math.PI) {
        diff += Math.PI * 2;
      }
      const desiredTurn = Math.max(-1, Math.min(1, diff * 2));
      let driven = coolTurret(
        stepVehicle(vehicle, dt, {
          forward: dist > 6 ? 1 : 0.35,
          turn: steerAround(vehicle.x, vehicle.z, vehicle.angle, desiredTurn),
        }),
        dt,
      );
      if (hasTurret(driven.kind) && !driven.wreck && dist < TURRET_RANGE && driven.turretCooldown <= 0) {
        driven = { ...driven, turretCooldown: TURRET_INTERVAL, turretFlash: 0.12 };
        let targetX = player.x;
        let targetZ = player.z;
        let mateIndex = -1;
        state.squad.forEach((mate, mi) => {
          if (mate.state !== "active") {
            return;
          }
          if (Math.hypot(mate.x - driven.x, mate.z - driven.z) < dist) {
            targetX = mate.x;
            targetZ = mate.z;
            mateIndex = mi;
          }
        });
        tracers.push({ x1: driven.x, z1: driven.z, x2: targetX, z2: targetZ, life: TRACER_LIFE });
        if (tracers.length > 24) {
          tracers.shift();
        }
        if (mateIndex >= 0) {
          squadHits[mateIndex] = (squadHits[mateIndex] ?? 0) + TURRET_DAMAGE;
        } else if (playerVehicle >= 0) {
          const damaged = damageVehicle(vehicles[playerVehicle], TURRET_DAMAGE);
          vehicles = vehicles.map((v, i) => (i === playerVehicle ? damaged : v));
          if (damaged.health <= 0) {
            wreckVehicle(playerVehicle);
            playerVehicle = -1;
          }
        } else {
          health -= TURRET_DAMAGE;
        }
      }
      vehicles = vehicles.map((v, i) => (i === drivenIndex ? driven : v));
      next.x = driven.x;
      next.z = driven.z;
      next.angle = driven.angle;
      clampToIsland(next);
      if (dist < 2.8 && Math.abs(driven.speed) > 4) {
        if (playerVehicle >= 0) {
          const damaged = damageVehicle(vehicles[playerVehicle], RUNOVER_DAMAGE_PER_SECOND * dt);
          vehicles = vehicles.map((v, i) => (i === playerVehicle ? damaged : v));
          if (damaged.health <= 0) {
            wreckVehicle(playerVehicle);
            playerVehicle = -1;
          }
        } else {
          health -= RUNOVER_DAMAGE_PER_SECOND * dt;
        }
      }
      return next;
    }
    const seekIndex = vehicles.findIndex(
      (v) =>
        v.driverBot < 0 &&
        !v.occupied &&
        v.health > 0 &&
        Math.hypot(v.x - next.x, v.z - next.z) < AI_VEHICLE_SEEK_RADIUS,
    );
    if (seekIndex >= 0) {
      vehicles = vehicles.map((v, i) => (i === seekIndex ? { ...v, driverBot: botIndex } : v));
      return next;
    }
    const dx = player.x - next.x;
    const dz = player.z - next.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed =
      movementSpeed(next.x, next.z) * (BOT_SPEED / PLAYER_SPEED) * effects.speedFactor * droneBonus;
    next.x += (dx / dist) * speed * dt;
    next.z += (dz / dist) * speed * dt;
    next.angle = Math.atan2(dx, dz);
    clampToIsland(next);
    return next;
  });
  bots = bots.map((bot) => {
    if (!bot.alive) {
      return bot;
    }
    let damage = 0;
    for (const blast of blasts) {
      damage += blastDamage(blast.x, blast.z, bot.x, bot.z);
    }
    if (damage <= 0) {
      return bot;
    }
    const nextHealth = bot.health - damage;
    return { ...bot, health: nextHealth, alive: nextHealth > 0 };
  });

  if (Math.hypot(player.x - zone.x, player.z - zone.z) > zone.radius) {
    health -= ZONE_DAMAGE_PER_SECOND * dt;
  }
  const playerCenterDist = Math.hypot(player.x - zone.x, player.z - zone.z);
  if (playerCenterDist <= zone.radius && zone.radius - playerCenterDist < 2.5) {
    health -= ZONE_WALL_DAMAGE_PER_SECOND * dt;
  }
  for (const bot of bots) {
    if (!bot.alive || Math.hypot(bot.x - player.x, bot.z - player.z) >= 1.6) {
      continue;
    }
    if (playerVehicle >= 0) {
      const damaged = damageVehicle(vehicles[playerVehicle], CONTACT_DAMAGE_PER_SECOND * dt * 2);
      vehicles = vehicles.map((v, i) => (i === playerVehicle ? damaged : v));
      if (damaged.health <= 0) {
        wreckVehicle(playerVehicle);
        playerVehicle = -1;
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

  let squad = stepSquad(state.squad, dt, player, { revive: Boolean(input.revive) }, zone).map(
    (mate, mateIndex) => {
      if (mate.state !== "active") {
        return mate;
      }
      const next = { ...mate };
      let extra = squadHits[mateIndex] ?? 0;
      for (const blast of blasts) {
        extra += blastDamage(blast.x, blast.z, next.x, next.z);
      }
      if (extra > 0) {
        const armorBefore = next.armor;
        next.armor = Math.max(0, armorBefore - extra);
        next.health -= Math.max(0, extra - armorBefore);
        if (next.health <= 0) {
          return knockDown(next);
        }
      }
      for (const bot of bots) {
        if (!bot.alive || Math.hypot(bot.x - next.x, bot.z - next.z) >= 1.6) {
          continue;
        }
        if (next.armor > 0) {
          next.armor = Math.max(0, next.armor - CONTACT_DAMAGE_PER_SECOND * dt);
        } else {
          next.health -= CONTACT_DAMAGE_PER_SECOND * dt;
        }
        if (next.health <= 0) {
          return knockDown(next);
        }
      }
      return next;
    },
  );

  let revival = state.revival;
  if (!revival.active && shouldTriggerRevival(squad)) {
    revival = triggerRevival(player);
  }
  revival = stepRevival(revival, dt, player);
  if (revival.succeeded) {
    squad = respawnSquad(squad, player);
    revival = createRevivalState();
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
    weather,
    drone,
    radio,
    beacon,
    dust,
    revival,
    attachments,
    squadSize: state.squadSize,
    squad,
    deployment: state.deployment,
    tracers,
    explosions,
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

function findTargetIndex(
  bots: Soldier[],
  player: Soldier,
  range: number,
  arc: number,
): number {
  let targetIndex = -1;
  let targetDist = Infinity;
  bots.forEach((bot, index) => {
    if (!bot.alive) {
      return;
    }
    const dx = bot.x - player.x;
    const dz = bot.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range) {
      return;
    }
    let diff = Math.abs(Math.atan2(dx, dz) - player.angle);
    if (diff > Math.PI) {
      diff = Math.PI * 2 - diff;
    }
    if (diff <= arc && dist < targetDist) {
      targetIndex = index;
      targetDist = dist;
    }
  });
  return targetIndex;
}

function pushTracer(tracers: Tracer[], tracer: Tracer): Tracer[] {
  const next = [...tracers, tracer];
  return next.length > 24 ? next.slice(next.length - 24) : next;
}

export function shoot(state: MatchState): { state: MatchState; hit: boolean; killed: boolean } {
  if (state.status !== "running") {
    return { state, hit: false, killed: false };
  }

  const turretVehicle = state.playerVehicle >= 0 ? state.vehicles[state.playerVehicle] : null;
  if (turretVehicle && hasTurret(turretVehicle.kind) && !turretVehicle.wreck) {
    if (turretVehicle.turretCooldown > 0) {
      return { state, hit: false, killed: false };
    }
    const targetIndex = findTargetIndex(state.bots, state.player, PLAYER_TURRET_RANGE, 0.35);
    const aimX =
      targetIndex >= 0
        ? state.bots[targetIndex].x
        : state.player.x + Math.sin(state.player.angle) * PLAYER_TURRET_RANGE;
    const aimZ =
      targetIndex >= 0
        ? state.bots[targetIndex].z
        : state.player.z + Math.cos(state.player.angle) * PLAYER_TURRET_RANGE;
    const tracers = pushTracer(state.tracers, {
      x1: state.player.x,
      z1: state.player.z,
      x2: aimX,
      z2: aimZ,
      life: TRACER_LIFE,
    });
    let vehicles = state.vehicles.map((v, i) =>
      i === state.playerVehicle
        ? { ...v, turretCooldown: PLAYER_TURRET_COOLDOWN, turretFlash: 0.12 }
        : v,
    );
    if (targetIndex === -1) {
      return { state: { ...state, vehicles, tracers }, hit: false, killed: false };
    }
    const driverIndex = vehicles.findIndex((v) => v.driverBot === targetIndex);
    let bots = state.bots;
    let squad = state.squad;
    let explosions = state.explosions;
    let playerDamage = 0;
    if (driverIndex >= 0) {
      const damaged = damageVehicle(vehicles[driverIndex], PLAYER_TURRET_DAMAGE);
      vehicles = vehicles.map((v, i) => (i === driverIndex ? damaged : v));
      if (damaged.health <= 0) {
        const result = applyVehicleDestruction(vehicles, driverIndex, state.player, bots, squad);
        vehicles = result.vehicles;
        bots = result.bots;
        squad = result.squad;
        explosions = [...explosions, result.explosion];
        playerDamage = result.playerDamage;
      }
    } else {
      bots = state.bots.map((bot, i) => {
        if (i !== targetIndex) {
          return bot;
        }
        const health = bot.health - PLAYER_TURRET_DAMAGE;
        return { ...bot, health, alive: health > 0 };
      });
    }
    return {
      state: {
        ...state,
        vehicles,
        bots,
        squad,
        tracers,
        explosions,
        player: { ...state.player, health: state.player.health - playerDamage },
        cooldown: PLAYER_TURRET_COOLDOWN,
        status: bots.every((bot) => !bot.alive) ? "won" : state.status,
      },
      hit: true,
      killed: driverIndex < 0 && !bots[targetIndex].alive,
    };
  }

  const weapon = applyAttachment(WEAPONS[state.weapon], state.attachments[state.weapon]);
  const stormRange = weapon.range * weatherEffects(state.weather).rangeFactor;
  if (state.cooldown > 0 || state.ammo[state.weapon] <= 0) {
    return { state, hit: false, killed: false };
  }
  const targetIndex = findTargetIndex(state.bots, state.player, stormRange, weapon.arc);
  const targetDist =
    targetIndex >= 0
      ? Math.hypot(
          state.bots[targetIndex].x - state.player.x,
          state.bots[targetIndex].z - state.player.z,
        )
      : 0;
  const ammo = { ...state.ammo, [state.weapon]: state.ammo[state.weapon] - 1 };
  const aimX =
    targetIndex >= 0
      ? state.bots[targetIndex].x
      : state.player.x + Math.sin(state.player.angle) * stormRange;
  const aimZ =
    targetIndex >= 0
      ? state.bots[targetIndex].z
      : state.player.z + Math.cos(state.player.angle) * stormRange;
  const tracers = pushTracer(state.tracers, {
    x1: state.player.x,
    z1: state.player.z,
    x2: aimX,
    z2: aimZ,
    life: TRACER_LIFE,
  });
  const base = {
    ...state,
    ammo,
    cooldown: weapon.cooldown,
    tracers,
    player: { ...state.player, angle: state.player.angle + weapon.recoil },
  };
  if (targetIndex === -1) {
    return { state: base, hit: false, killed: false };
  }
  const driverIndex = state.vehicles.findIndex((v) => v.driverBot === targetIndex);
  if (driverIndex >= 0) {
    const damaged = damageVehicle(state.vehicles[driverIndex], weapon.damage);
    let vehicles = state.vehicles.map((v, i) => (i === driverIndex ? damaged : v));
    let bots = state.bots;
    let squad = state.squad;
    let explosions = state.explosions;
    let playerDamage = 0;
    if (damaged.health <= 0) {
      const result = applyVehicleDestruction(vehicles, driverIndex, base.player, bots, squad);
      vehicles = result.vehicles;
      bots = result.bots;
      squad = result.squad;
      explosions = [...explosions, result.explosion];
      playerDamage = result.playerDamage;
    }
    return {
      state: {
        ...base,
        vehicles,
        bots,
        squad,
        explosions,
        player: { ...base.player, health: base.player.health - playerDamage },
      },
      hit: true,
      killed: false,
    };
  }
  const falloff = Math.max(0.35, 1 - (weapon.bulletDrop * Math.max(0, targetDist - 12)) / 10);
  const bots = state.bots.map((bot, i) => {
    if (i !== targetIndex) {
      return bot;
    }
    const health = bot.health - weapon.damage * falloff;
    return { ...bot, health, alive: health > 0 };
  });
  return {
    state: {
      ...base,
      bots,
      revival: !bots[targetIndex].alive
        ? registerRevivalKill(state.revival)
        : state.revival,
      status: bots.every((bot) => !bot.alive) ? "won" : state.status,
    },
    hit: true,
    killed: !bots[targetIndex].alive,
  };
}