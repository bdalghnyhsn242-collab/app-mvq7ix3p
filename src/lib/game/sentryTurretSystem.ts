export const SENTRY_RADIUS = 25;
export const SENTRY_MAX_HEALTH = 80;
export const SENTRY_FIRE_INTERVAL = 1.2;
export const SENTRY_STUN_TIME = 2.5;
export const SENTRY_STUN_SLOW = 0.5;
export const SENTRY_RETRIEVE_FRACTION = 0.7;
export const SENTRY_MELEE_DPS = 20;

export type SentryTurretState = {
  deployed: boolean;
  x: number;
  z: number;
  health: number;
  cooldown: number;
  flash: number;
};

export function createSentryState(): SentryTurretState {
  return { deployed: false, x: 0, z: 0, health: 0, cooldown: 0, flash: 0 };
}

export function deploySentry(
  state: SentryTurretState,
  x: number,
  z: number,
): SentryTurretState {
  return {
    deployed: true,
    x,
    z,
    health: SENTRY_MAX_HEALTH,
    cooldown: 0,
    flash: 0,
  };
}

export type SentryStepResult = {
  turret: SentryTurretState;
  stunnedBotIndexes: number[];
};

/** Scans the radius and fires non-lethal EMP stun darts at the closest hostile. */
export function stepSentry(
  state: SentryTurretState,
  dt: number,
  bots: { x: number; z: number; alive: boolean }[],
): SentryStepResult {
  if (!state.deployed) {
    return { turret: state, stunnedBotIndexes: [] };
  }
  const stunnedBotIndexes: number[] = [];
  let turret = {
    ...state,
    cooldown: Math.max(0, state.cooldown - dt),
    flash: Math.max(0, state.flash - dt),
  };
  if (turret.cooldown > 0) {
    return { turret, stunnedBotIndexes };
  }
  let targetIndex = -1;
  let targetDist = Infinity;
  bots.forEach((bot, index) => {
    if (!bot.alive) {
      return;
    }
    const dist = Math.hypot(bot.x - turret.x, bot.z - turret.z);
    if (dist <= SENTRY_RADIUS && dist < targetDist) {
      targetIndex = index;
      targetDist = dist;
    }
  });
  if (targetIndex >= 0) {
    stunnedBotIndexes.push(targetIndex);
    turret = { ...turret, cooldown: SENTRY_FIRE_INTERVAL, flash: 0.15 };
  }
  return { turret, stunnedBotIndexes };
}

export function damageSentry(state: SentryTurretState, amount: number): SentryTurretState {
  const health = Math.max(0, state.health - amount);
  return { ...state, health, deployed: health > 0 };
}

/** The owner can retrieve an undamaged-enough turret back into inventory. */
export function canRetrieveSentry(state: SentryTurretState): boolean {
  return state.deployed && state.health >= SENTRY_MAX_HEALTH * SENTRY_RETRIEVE_FRACTION;
}