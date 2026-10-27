import { describe, expect, it } from "vitest";
import { createSquad, knockDown } from "./squad";
import {
  FORTRESS_CHOPPER_TIME,
  FORTRESS_COOLDOWN_MULT,
  FORTRESS_DAMAGE_RESIST,
  FORTRESS_HOLD_TIME,
  FORTRESS_RESPAWN_ARMOR,
  FORTRESS_ZONE_RADIUS,
  activateFortress,
  createFortressState,
  fortressCooldownFactor,
  fortressDamageFactor,
  fortressRespawnSquad,
  stepFortress,
} from "./squadFortressSystem";

describe("last stand fortress", () => {
  it("activates at the challenge zone with the buff", () => {
    const fortress = activateFortress({ x: 5, z: 5 });
    expect(fortress.active).toBe(true);
    expect(fortressDamageFactor(fortress)).toBeCloseTo(1 - FORTRESS_DAMAGE_RESIST);
    expect(fortressCooldownFactor(fortress)).toBe(FORTRESS_COOLDOWN_MULT);
  });

  it("grants no buff while inactive or while the chopper arrives", () => {
    expect(fortressDamageFactor(createFortressState())).toBe(1);
    const chopper = { ...activateFortress({ x: 0, z: 0 }), chopperIncoming: true };
    expect(fortressDamageFactor(chopper)).toBe(1);
  });

  it("calls the chopper after holding the zone for 30 seconds", () => {
    let fortress = activateFortress({ x: 0, z: 0 });
    for (let i = 0; i < FORTRESS_HOLD_TIME * 10; i += 1) {
      fortress = stepFortress(fortress, 0.1, { x: 1, z: 1 });
    }
    expect(fortress.chopperIncoming).toBe(true);
    expect(fortress.chopperTimer).toBe(FORTRESS_CHOPPER_TIME);
  });

  it("decays hold progress when the player leaves the zone", () => {
    let fortress = activateFortress({ x: 0, z: 0 });
    fortress = stepFortress(fortress, 10, { x: 1, z: 1 });
    fortress = stepFortress(fortress, 2, { x: 500, z: 500 });
    expect(fortress.holdProgress).toBeLessThan(10);
  });

  it("respawns the squad at full health with standard armor", () => {
    const squad = createSquad(3).map((mate) => ({ ...knockDown(mate), state: "out" as const }));
    const revived = fortressRespawnSquad(squad, { x: 10, z: 10 });
    expect(revived.every((mate) => mate.state === "active")).toBe(true);
    expect(revived.every((mate) => mate.health === 100)).toBe(true);
    expect(revived.every((mate) => mate.armor === FORTRESS_RESPAWN_ARMOR)).toBe(true);
  });

  it("defines a 14m secure zone", () => {
    expect(FORTRESS_ZONE_RADIUS).toBe(14);
  });
});