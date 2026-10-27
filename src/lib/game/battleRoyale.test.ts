import { describe, expect, it } from "vitest";
import {
  BOT_COUNT,
  LOOT_COUNT,
  ISLAND_RADIUS,
  ZONE_START_RADIUS,
  BUILDING_POSITIONS,
  createMatchState,
  landedDeployment,
  forestDensity,
  movementSpeed,
  isSwimming,
  PLAYER_SPEED,
  terrainHeight,
  shoot,
  stepMatch,
  type MatchState,
} from "./battleRoyale";
import { blowTire, createVehicles, stepVehicle } from "./vehicles";
import { createAirdropState, stepAirdrops } from "./airdrops";
import { BLEED_OUT_TIME, REVIVE_TIME, createSquad, knockDown, stepSquad } from "./squad";

function withState(overrides: Partial<MatchState>): MatchState {
  return { ...createMatchState(), deployment: landedDeployment(), ...overrides };
}

describe("battle royale core logic", () => {
  it("starts on the deployment plane with bots around", () => {
    const state = createMatchState();
    expect(state.deployment.phase).toBe("plane");
    expect(state.squad).toHaveLength(0);
    expect(state.bots).toHaveLength(BOT_COUNT);
    expect(state.zone.radius).toBe(ZONE_START_RADIUS);
    expect(state.status).toBe("running");
  });

  it("deploys the squad from the plane and lands with a parachute", () => {
    let state = createMatchState(5);
    expect(state.squad).toHaveLength(4);
    state = stepMatch(state, 1, { forward: 0, turn: 0, drop: true });
    expect(state.deployment.phase).toBe("falling");
    for (let i = 0; i < 40; i += 1) {
      state = stepMatch(state, 1, { forward: 0, turn: 0 });
    }
    expect(state.deployment.phase).toBe("landed");
    expect(state.deployment.chute).toBe(false);
  });

  it("moves the player forward along its facing direction", () => {
    const state = stepMatch(withState({}), 1, { forward: 1, turn: 0 });
    expect(state.player.z).toBeGreaterThan(0);
    expect(state.player.x).toBeCloseTo(0);
  });

  it("turns the player", () => {
    const state = stepMatch(withState({}), 1, { forward: 0, turn: 1 });
    expect(state.player.angle).toBeGreaterThan(0);
  });

  it("shrinks the safe zone over time", () => {
    const state = stepMatch(withState({}), 10, { forward: 0, turn: 0 });
    expect(state.zone.radius).toBeLessThan(ZONE_START_RADIUS);
  });

  it("damages the player outside the safe zone", () => {
    const state = withState({
      player: { x: ISLAND_RADIUS - 2, z: 0, angle: 0, health: 100, alive: true },
    });
    const next = stepMatch(state, 1, { forward: 0, turn: 0 });
    expect(next.player.health).toBeLessThan(100);
  });

  it("damages a bot directly in front when shooting the pistol", () => {
    const state = withState({ bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }] });
    const result = shoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.bots[0].health).toBe(50);
    expect(result.state.bots[0].alive).toBe(true);
    expect(result.state.ammo.pistol).toBe(23);
  });

  it("kills a bot with a second shot and wins", () => {
    const first = shoot(withState({ bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }] }));
    const second = shoot({ ...first.state, cooldown: 0 });
    expect(second.killed).toBe(true);
    expect(second.state.status).toBe("won");
  });

  it("cannot shoot without ammo", () => {
    const state = withState({
      ammo: { pistol: 0, smg: 0, ar: 0, dmr: 0, lmg: 0, shotgun: 0 },
      bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }],
    });
    expect(shoot(state).hit).toBe(false);
  });

  it("cannot shoot during cooldown", () => {
    const state = withState({ cooldown: 0.4, bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }] });
    expect(shoot(state).hit).toBe(false);
  });

  it("misses bots behind the player", () => {
    const state = withState({ bots: [{ x: 0, z: -10, angle: 0, health: 100, alive: true }] });
    expect(shoot(state).hit).toBe(false);
  });

  it("spawns loot crates on the island", () => {
    const state = createMatchState();
    expect(state.loot).toHaveLength(LOOT_COUNT + BUILDING_POSITIONS.length);
    expect(state.loot.every((crate) => Math.hypot(crate.x, crate.z) < ISLAND_RADIUS)).toBe(true);
  });

  it("picks up a nearby crate and switches weapon", () => {
    const state = withState({
      loot: [{ x: 1, z: 0, weapon: "ar", ammo: 30, taken: false }],
    });
    const next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(next.loot[0].taken).toBe(true);
    expect(next.weapon).toBe("ar");
    expect(next.ammo.ar).toBe(30);
  });

  it("applies bullet drop falloff at long range", () => {
    const state = withState({ bots: [{ x: 0, z: 16, angle: 0, health: 100, alive: true }] });
    const result = shoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.bots[0].health).toBeGreaterThan(50);
    expect(result.state.bots[0].health).toBeLessThan(60);
  });

  it("kicks the aim with recoil after each shot", () => {
    const result = shoot(createMatchState());
    expect(result.state.player.angle).toBeGreaterThan(0);
  });

  it("drives vehicles with acceleration and speed-dependent turning", () => {
    const vehicle = createVehicles()[0];
    const stepped = stepVehicle(vehicle, 1, { forward: 1, turn: 0 });
    expect(stepped.speed).toBeGreaterThan(0);
    const turned = stepVehicle({ ...vehicle, speed: 20 }, 1, { forward: 0, turn: 1 });
    expect(turned.angle).not.toBe(vehicle.angle);
    const stationary = stepVehicle(vehicle, 1, { forward: 0, turn: 1 });
    expect(stationary.angle).toBe(vehicle.angle);
  });

  it("slows vehicles with blown tires", () => {
    const healthy = stepVehicle(createVehicles()[0], 3, { forward: 1, turn: 0 });
    const damaged = stepVehicle(blowTire(createVehicles()[0], 0), 3, { forward: 1, turn: 0 });
    expect(damaged.speed).toBeLessThan(healthy.speed);
  });

  it("lets the player enter and exit a nearby vehicle", () => {
    const vehicles = createVehicles();
    vehicles[0] = { ...vehicles[0], x: 2, z: 0 };
    const state = withState({ vehicles, playerVehicle: -1 });
    const entered = stepMatch(state, 0.1, { forward: 0, turn: 0, enter: true });
    expect(entered.playerVehicle).toBe(0);
    const exited = stepMatch(entered, 0.1, { forward: 0, turn: 0, enter: true });
    expect(exited.playerVehicle).toBe(-1);
  });

  it("descends airdrop crates until they land", () => {
    const airdrop = createAirdropState();
    const falling = {
      ...airdrop,
      crate: { x: 5, z: 5, altitude: 12, landed: false, weapon: "dmr" as const, ammo: 20, taken: false },
    };
    const landed = stepAirdrops(falling, 2);
    expect(landed.crate?.landed).toBe(true);
    expect(landed.crate?.altitude).toBe(0);
  });

  it("grants the exclusive airdrop weapon and armor on pickup", () => {
    const airdrop = createAirdropState();
    const state = withState({
      player: { x: 0, z: 0, angle: 0, health: 60, alive: true },
      airdrop: {
        ...airdrop,
        crate: { x: 1, z: 0, altitude: 0, landed: true, weapon: "dmr", ammo: 10, taken: false },
      },
    });
    const next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(next.airdrop.crate?.taken).toBe(true);
    expect(next.weapon).toBe("dmr");
    expect(next.ammo.dmr).toBe(10);
    expect(next.player.health).toBe(85);
  });

  it("ends the match as lost when health is depleted", () => {
    const state = withState({
      player: { x: ISLAND_RADIUS - 2, z: 0, angle: 0, health: 1, alive: true },
    });
    expect(stepMatch(state, 1, { forward: 0, turn: 0 }).status).toBe("lost");
  });

  it("computes forest density deterministically for biome placement", () => {
    expect(forestDensity(5, 5)).toBe(forestDensity(5, 5));
    expect(forestDensity(0, 0)).toBeGreaterThanOrEqual(0);
  });

  it("raises terrain toward the island center deterministically", () => {
    expect(terrainHeight(0, 0)).toBe(terrainHeight(0, 0));
    expect(terrainHeight(0, 0)).toBeGreaterThan(terrainHeight(ISLAND_RADIUS - 2, 0));
    expect(terrainHeight(ISLAND_RADIUS + 10, 0)).toBeLessThan(0);
  });

  it("slows movement in shallow water near the shore", () => {
    expect(movementSpeed(0, 0)).toBeGreaterThan(movementSpeed(ISLAND_RADIUS - 1, 0));
  });

  it("swims slower than walking in deep water", () => {
    let foundDeep = false;
    let deepSpeed = Infinity;
    for (let x = -ISLAND_RADIUS; x <= ISLAND_RADIUS && !foundDeep; x += 2) {
      for (let z = -ISLAND_RADIUS; z <= ISLAND_RADIUS; z += 2) {
        if (isSwimming(x, z)) {
          deepSpeed = Math.min(deepSpeed, movementSpeed(x, z));
          foundDeep = true;
          break;
        }
      }
    }
    expect(foundDeep).toBe(true);
    expect(deepSpeed).toBeLessThan(PLAYER_SPEED);
  });

  it("knocks down teammates instead of killing them", () => {
    const squad = createSquad(2);
    const downed = knockDown({ ...squad[0], health: 0 });
    expect(downed.state).toBe("downed");
    expect(downed.bleedTimer).toBe(BLEED_OUT_TIME);
  });

  it("revives a downed teammate after holding the revive input", () => {
    const squad = [knockDown({ ...createSquad(2)[0], x: 1, z: 0 })];
    let next = squad;
    for (let i = 0; i < REVIVE_TIME * 10; i += 1) {
      next = stepSquad(next, 0.1, { x: 0, z: 0 }, { revive: true }, { x: 0, z: 0, radius: 200 });
    }
    expect(next[0].state).toBe("active");
    expect(next[0].health).toBeGreaterThan(0);
  });

  it("bleeds out downed teammates who are not revived", () => {
    const squad = [knockDown({ ...createSquad(2)[0], x: 50, z: 0 })];
    const next = stepSquad(
      squad,
      BLEED_OUT_TIME + 1,
      { x: 0, z: 0 },
      { revive: false },
      { x: 0, z: 0, radius: 200 },
    );
    expect(next[0].state).toBe("out");
  });

  it("lets AI bots commandeer vehicles and pursue the player", () => {
    const vehicles = createVehicles();
    vehicles[0] = { ...vehicles[0], x: 6, z: 0 };
    const state = withState({
      bots: [{ x: 4, z: 0, angle: 0, health: 100, alive: true }],
      vehicles,
    });
    const entered = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(entered.vehicles[0].driverBot).toBe(0);
    const before = entered.vehicles[0].x;
    const pursuing = stepMatch(entered, 1, { forward: 0, turn: 0 });
    expect(pursuing.vehicles[0].speed).toBeGreaterThan(0);
    expect(pursuing.vehicles[0].x).not.toBe(before);
  });
});