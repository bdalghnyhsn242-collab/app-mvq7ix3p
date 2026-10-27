import { describe, expect, it } from "vitest";
import {
  SENTRY_FIRE_INTERVAL,
  SENTRY_MAX_HEALTH,
  SENTRY_RADIUS,
  SENTRY_STUN_TIME,
  canRetrieveSentry,
  createSentryState,
  damageSentry,
  deploySentry,
  stepSentry,
} from "./sentryTurretSystem";

describe("automated defensive sentry turret", () => {
  it("deploys with full health on a tripod", () => {
    const sentry = deploySentry(createSentryState(), 3, 4);
    expect(sentry.deployed).toBe(true);
    expect(sentry.health).toBe(SENTRY_MAX_HEALTH);
  });

  it("stuns the closest hostile within the 25m scan radius", () => {
    const sentry = deploySentry(createSentryState(), 0, 0);
    const bots = [
      { x: 10, z: 0, alive: true },
      { x: 5, z: 0, alive: true },
      { x: 100, z: 100, alive: true },
    ];
    const result = stepSentry(sentry, 0.1, bots);
    expect(result.stunnedBotIndexes).toEqual([1]);
    expect(result.turret.cooldown).toBe(SENTRY_FIRE_INTERVAL);
  });

  it("respects the fire interval between stun darts", () => {
    let sentry = deploySentry(createSentryState(), 0, 0);
    const bots = [{ x: 5, z: 0, alive: true }];
    const first = stepSentry(sentry, 0.1, bots);
    const second = stepSentry(first.turret, 0.5, bots);
    expect(second.stunnedBotIndexes).toHaveLength(0);
    const third = stepSentry(second.turret, SENTRY_FIRE_INTERVAL, bots);
    expect(third.stunnedBotIndexes).toEqual([0]);
  });

  it("ignores dead bots and distant hostiles", () => {
    const sentry = deploySentry(createSentryState(), 0, 0);
    const result = stepSentry(sentry, 0.1, [
      { x: 5, z: 0, alive: false },
      { x: SENTRY_RADIUS + 5, z: 0, alive: true },
    ]);
    expect(result.stunnedBotIndexes).toHaveLength(0);
  });

  it("can be dismantled and retrieved only when mostly undamaged", () => {
    let sentry = deploySentry(createSentryState(), 0, 0);
    expect(canRetrieveSentry(sentry)).toBe(true);
    sentry = damageSentry(sentry, 30);
    expect(canRetrieveSentry(sentry)).toBe(false);
    sentry = damageSentry(sentry, SENTRY_MAX_HEALTH);
    expect(sentry.deployed).toBe(false);
  });

  it("stuns for 2.5 seconds", () => {
    expect(SENTRY_STUN_TIME).toBe(2.5);
  });
});