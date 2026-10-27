import { describe, expect, it } from "vitest";
import { createSquad, knockDown } from "./squad";
import {
  CHALLENGE_KILLS_REQUIRED,
  CHALLENGE_WINDOW,
  CHALLENGE_ZONE_CAPTURE_TIME,
  REVIVAL_RESPAWN_HEALTH,
  createRevivalState,
  registerRevivalKill,
  respawnSquad,
  shouldTriggerRevival,
  stepRevival,
  triggerRevival,
} from "./squadRevivalSystem";

describe("commander's last stand revival", () => {
  it("triggers only when every teammate is out", () => {
    const alive = createSquad(3);
    expect(shouldTriggerRevival(alive)).toBe(false);
    const wiped = alive.map((mate) => ({ ...knockDown(mate), state: "out" as const }));
    expect(shouldTriggerRevival(wiped)).toBe(true);
    expect(shouldTriggerRevival(createSquad(1))).toBe(false);
  });

  it("spawns the objective within 40m of the solo player", () => {
    const revival = triggerRevival({ x: 10, z: 10 });
    expect(revival.active).toBe(true);
    expect(revival.timer).toBe(CHALLENGE_WINDOW);
    expect(Math.hypot(revival.zone.x - 10, revival.zone.z - 10)).toBeLessThanOrEqual(40);
  });

  it("succeeds after capturing the zone for 12 seconds", () => {
    let revival = triggerRevival({ x: 0, z: 0 });
    revival.zone = { x: 0, z: 5 };
    for (let i = 0; i < CHALLENGE_ZONE_CAPTURE_TIME * 10; i += 1) {
      revival = stepRevival(revival, 0.1, { x: 0, z: 5 });
    }
    expect(revival.succeeded).toBe(true);
    expect(revival.active).toBe(false);
  });

  it("succeeds instantly on one kill during the window", () => {
    let revival = triggerRevival({ x: 0, z: 0 });
    revival = registerRevivalKill(revival);
    expect(revival.kills).toBe(CHALLENGE_KILLS_REQUIRED);
    expect(revival.succeeded).toBe(true);
  });

  it("expires without success when the window runs out", () => {
    let revival = triggerRevival({ x: 0, z: 0 });
    revival = stepRevival(revival, CHALLENGE_WINDOW + 1, { x: 500, z: 500 });
    expect(revival.active).toBe(false);
    expect(revival.succeeded).toBe(false);
  });

  it("respawns the fallen squad at 50% health near the player", () => {
    const squad = createSquad(3).map((mate) => ({ ...knockDown(mate), state: "out" as const }));
    const revived = respawnSquad(squad, { x: 20, z: 20 });
    expect(revived.every((mate) => mate.state === "active")).toBe(true);
    expect(revived.every((mate) => mate.health === REVIVAL_RESPAWN_HEALTH)).toBe(true);
    expect(revived.every((mate) => Math.hypot(mate.x - 20, mate.z - 20) < 6)).toBe(true);
  });
});