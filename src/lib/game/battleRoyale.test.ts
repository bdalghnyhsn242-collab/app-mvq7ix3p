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
  applyVehicleDestruction,
  blastDamage,
  steerAroundObstacles,
  EXPANSION_LOOT_COUNT,
  RELOAD_TIME,
  reloadWeapon,
  switchWeapon,
  damagePlayer,
  fullMagazine,
  type MatchState,
} from "./battleRoyale";
import { TOWER_TERMINAL, TOWER_CAPTURE_TIME } from "./radioTowerSystem";
import {
  blowTire,
  createVehicles,
  destroyVehicle,
  hasTurret,
  stepVehicle,
} from "./vehicles";
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
    expect(state.bots.every((bot) => Math.hypot(bot.x, bot.z) < ISLAND_RADIUS)).toBe(true);
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
    expect(result.state.magazine.pistol).toBe(11);
    expect(result.state.ammo.pistol).toBe(24);
  });

  it("kills a bot with a second shot and wins", () => {
    const first = shoot(withState({ bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }] }));
    const second = shoot({ ...first.state, cooldown: 0 });
    expect(second.killed).toBe(true);
    expect(second.state.status).toBe("won");
  });

  it("auto-reloads when firing an empty magazine", () => {
    const state = withState({
      ammo: { pistol: 0, smg: 0, ar: 0, dmr: 0, lmg: 0, shotgun: 0 },
      magazine: { pistol: 0, smg: 0, ar: 0, dmr: 0, lmg: 0, shotgun: 0 },
      bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }],
    });
    const result = shoot(state);
    expect(result.hit).toBe(false);
    expect(result.state.reloadTimer).toBe(RELOAD_TIME);
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
    expect(state.loot).toHaveLength(
      LOOT_COUNT + BUILDING_POSITIONS.length + EXPANSION_LOOT_COUNT,
    );
    expect(state.loot.every((crate) => Math.hypot(crate.x, crate.z) < ISLAND_RADIUS)).toBe(true);
  });

  it("initializes weather, drone, and attachment state", () => {
    const state = createMatchState();
    expect(state.weather.kind).toBe("clear");
    expect(state.drone.spottedTimer).toBe(0);
    expect(state.attachments).toEqual({});
  });

  it("picks up field attachments with weapon crates", () => {
    const state = withState({
      loot: [{ x: 1, z: 0, weapon: "ar", ammo: 30, taken: false, attachment: "scope-4x" }],
    });
    const next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(next.attachments.ar).toBe("scope-4x");
  });

  it("extends weapon range with a mounted scope", () => {
    const state = withState({
      bots: [{ x: 0, z: 40, angle: 0, health: 100, alive: true }],
      weapon: "ar",
      attachments: { ar: "scope-8x" },
    });
    const result = shoot(state);
    expect(result.hit).toBe(true);
  });

  it("captures the radio tower and activates radar jamming", () => {
    const state = withState({
      player: { x: TOWER_TERMINAL.x, z: TOWER_TERMINAL.z, angle: 0, health: 100, alive: true },
      bots: [{ x: 0, z: 150, angle: 0, health: 100, alive: true }],
    });
    let next = state;
    for (let i = 0; i < (TOWER_CAPTURE_TIME + 1) * 10; i += 1) {
      next = stepMatch(next, 0.1, { forward: 0, turn: 0 });
    }
    expect(next.radio.captured).toBe(true);
    expect(next.radio.jamTimer).toBeGreaterThan(0);
  });

  it("deploys a beacon and delivers the supply crate", () => {
    let state = withState({
      beacon: { held: 1, drop: null },
      player: { x: 0, z: 0, angle: 0, health: 60, alive: true },
      bots: [{ x: 0, z: 150, angle: 0, health: 100, alive: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0, beacon: true });
    expect(state.beacon.held).toBe(0);
    expect(state.beacon.drop).not.toBe(null);
    for (let i = 0; i < 120 && !state.beacon.drop?.crate?.landed; i += 1) {
      state = stepMatch(state, 0.5, { forward: 0, turn: 0 });
    }
    expect(state.beacon.drop?.crate?.landed).toBe(true);
    const before = state.player.health;
    const picked = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(picked.beacon.drop?.crate?.taken).toBe(true);
    expect(picked.player.health).toBeGreaterThan(before);
  });

  it("forces amber dust weather while the storm is active", () => {
    const state = withState({ dust: { active: true, timer: 30, duration: 50 } });
    const next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(next.weather.kind).toBe("dust");
  });

  it("runs the last-stand challenge and revives the squad on a kill", () => {
    const wiped = createSquad(2).map((mate) => ({
      ...knockDown(mate),
      state: "out" as const,
    }));
    let state = withState({
      squadSize: 2,
      squad: wiped,
      bots: [
        { x: 0, z: 10, angle: 0, health: 100, alive: true },
        { x: 0, z: 150, angle: 0, health: 100, alive: true },
      ],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(state.revival.active).toBe(true);
    const shot = shoot(state);
    expect(shot.killed).toBe(true);
    expect(shot.state.revival.succeeded).toBe(true);
    const revived = stepMatch(shot.state, 0.1, { forward: 0, turn: 0 });
    expect(revived.squad[0].state).toBe("active");
    expect(revived.squad[0].health).toBe(50);
  });

  it("deploys the shield dome and absorbs turret fire inside it", () => {
    let state = withState({
      gadgets: { shield: 1, sentry: 0, medevac: 0 },
      bots: [{ x: 0, z: 150, angle: 0, health: 100, alive: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0, shield: true });
    expect(state.shield.active).toBe(true);
    expect(state.gadgets.shield).toBe(0);
    const integrityBefore = state.shield.integrity;
    const vehicles = state.vehicles;
    vehicles[1] = { ...vehicles[1], x: 8, z: 0, driverBot: 0 };
    const underFire = stepMatch({ ...state, vehicles }, 0.1, { forward: 0, turn: 0 });
    expect(underFire.shield.integrity).toBeLessThan(integrityBefore);
    expect(underFire.player.health).toBe(100);
  });

  it("deploys a sentry turret that stuns approaching bots", () => {
    let state = withState({
      gadgets: { shield: 0, sentry: 1, medevac: 0 },
      bots: [{ x: 20, z: 0, angle: 0, health: 100, alive: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0, sentry: true });
    expect(state.sentry.deployed).toBe(true);
    expect(state.gadgets.sentry).toBe(0);
    const next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(next.bots[0].stunTimer ?? 0).toBeGreaterThan(0);
  });

  it("retrieves an undamaged sentry back into the inventory", () => {
    let state = withState({
      gadgets: { shield: 0, sentry: 1, medevac: 0 },
      bots: [{ x: 0, z: 150, angle: 0, health: 100, alive: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0, sentry: true });
    expect(state.sentry.deployed).toBe(true);
    const retrieved = stepMatch(state, 0.1, { forward: 0, turn: 0, sentry: true });
    expect(retrieved.sentry.deployed).toBe(false);
    expect(retrieved.gadgets.sentry).toBe(1);
  });

  it("evacuates a downed squadmate with the medical drone", () => {
    const squad = [knockDown({ ...createSquad(2)[0], x: 4, z: 0 })];
    let state = withState({
      squadSize: 2,
      squad,
      gadgets: { shield: 0, sentry: 0, medevac: 1 },
      bots: [{ x: 0, z: 150, angle: 0, health: 100, alive: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0, medevac: true });
    expect(state.medevac.active).toBe(true);
    expect(state.gadgets.medevac).toBe(0);
    for (let i = 0; i < 200 && !state.medevac.healed; i += 1) {
      state = stepMatch(state, 0.5, { forward: 0, turn: 0 });
    }
    expect(state.medevac.healed).toBe(true);
    const revived = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(revived.squad[0].state).toBe("active");
    expect(revived.squad[0].health).toBe(50);
  });

  it("grants the fortress buff during the last-stand challenge", () => {
    const wiped = createSquad(2).map((mate) => ({
      ...knockDown(mate),
      state: "out" as const,
    }));
    let state = withState({
      squadSize: 2,
      squad: wiped,
      bots: [
        { x: 0, z: 150, angle: 0, health: 100, alive: true },
        { x: 0, z: 160, angle: 0, health: 100, alive: true },
      ],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(state.revival.active).toBe(true);
    expect(state.fortress.active).toBe(true);
    const shot = shoot(state);
    expect(shot.killed).toBe(true);
    expect(shot.state.fortress.chopperIncoming).toBe(true);
    let next = shot.state;
    for (let i = 0; i < 40 && next.fortress.chopperIncoming; i += 1) {
      next = stepMatch(next, 0.1, { forward: 0, turn: 0 });
    }
    expect(next.squad[0].state).toBe("active");
    expect(next.squad[0].armor).toBe(50);
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

  it("fires turret rounds from AI-driven armed vehicles at the player", () => {
    const vehicles = createVehicles();
    vehicles[1] = { ...vehicles[1], x: 8, z: 0, driverBot: 0 };
    const state = withState({
      bots: [{ x: 6, z: 0, angle: 0, health: 100, alive: true }],
      vehicles,
    });
    const fired = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(hasTurret(fired.vehicles[1].kind)).toBe(true);
    expect(fired.vehicles[1].turretCooldown).toBeGreaterThan(0);
    expect(fired.tracers.length).toBeGreaterThan(0);
    expect(fired.player.health).toBeLessThan(100);
    const later = stepMatch(fired, 0.2, { forward: 0, turn: 0 });
    expect(later.tracers).toHaveLength(0);
  });

  it("lets the player fire the mounted turret without spending ammo", () => {
    const vehicles = createVehicles();
    vehicles[1] = { ...vehicles[1], x: 0, z: 0, occupied: true };
    const state = withState({
      bots: [{ x: 0, z: 30, angle: 0, health: 100, alive: true }],
      vehicles,
      playerVehicle: 1,
    });
    const result = shoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.ammo.pistol).toBe(24);
    expect(result.state.bots[0].health).toBe(35);
    expect(result.state.vehicles[1].turretCooldown).toBeGreaterThan(0);
    expect(result.state.tracers.length).toBe(1);
  });

  it("damages AI vehicles instead of the driver when shooting them", () => {
    const vehicles = createVehicles();
    vehicles[0] = { ...vehicles[0], x: 0, z: 10, driverBot: 0 };
    const state = withState({
      bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }],
      vehicles,
    });
    const result = shoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.bots[0].health).toBe(100);
    expect(result.state.vehicles[0].health).toBeLessThan(220);
  });

  it("steers AI drivers away from obstacles ahead", () => {
    const obstacles = [{ x: 0, z: 8, r: 3 }];
    const avoided = steerAroundObstacles(0, 0, 0, 0, obstacles);
    expect(avoided).not.toBe(0);
    const clear = steerAroundObstacles(0, 0, 0, 0, [{ x: 60, z: 60, r: 2 }]);
    expect(clear).toBe(0);
  });

  it("explodes destroyed vehicles with shockwave damage and wreck cover", () => {
    const vehicles = createVehicles();
    vehicles[0] = { ...vehicles[0], x: 2, z: 0 };
    const result = applyVehicleDestruction(
      vehicles,
      0,
      { x: 4, z: 0 },
      [{ x: 6, z: 0, angle: 0, health: 100, alive: true }],
      [],
    );
    expect(result.vehicles[0].wreck).toBe(true);
    expect(result.vehicles[0].speed).toBe(0);
    expect(result.explosion.timer).toBeGreaterThan(0);
    expect(result.bots[0].health).toBeLessThan(100);
    expect(result.playerDamage).toBeGreaterThan(0);
    expect(blastDamage(0, 0, 50, 0)).toBe(0);
    const wrecked = destroyVehicle(createVehicles()[0]);
    expect(wrecked.health).toBe(0);
    const blocked = withState({
      vehicles: [{ ...createVehicles()[0], x: 2, z: 0, health: 0, wreck: true }],
      playerVehicle: -1,
    });
    const entered = stepMatch(blocked, 0.1, { forward: 0, turn: 0, enter: true });
    expect(entered.playerVehicle).toBe(-1);
  });

  it("wrecks the player vehicle with a blast when it is destroyed in combat", () => {
    const vehicles = createVehicles();
    vehicles[0] = { ...vehicles[0], x: 0, z: 0, occupied: true, health: 5 };
    const state = withState({
      bots: [{ x: 1, z: 0, angle: 0, health: 100, alive: true }],
      vehicles,
      playerVehicle: 0,
    });
    let next = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    for (let i = 0; i < 14 && !next.vehicles[0].wreck; i += 1) {
      next = stepMatch(next, 0.1, { forward: 0, turn: 0 });
    }
    expect(next.vehicles[0].wreck).toBe(true);
    expect(next.playerVehicle).toBe(-1);
    expect(next.explosions.length).toBeGreaterThan(0);
    expect(next.player.health).toBeLessThan(100);
  });
});

describe("first-person-feel combat systems", () => {
  it("completes a reload moving rounds from reserve into the magazine", () => {
    let state = withState({});
    state = shoot(state).state;
    expect(state.magazine.pistol).toBe(11);
    const started = reloadWeapon(state);
    expect(started.reloadTimer).toBe(RELOAD_TIME);
    let reloaded = started;
    for (let i = 0; i < 20; i += 1) {
      reloaded = stepMatch(reloaded, 0.1, { forward: 0, turn: 0 });
    }
    expect(reloaded.reloadTimer).toBe(0);
    expect(reloaded.magazine.pistol).toBe(fullMagazine("pistol"));
    expect(reloaded.ammo.pistol).toBe(24 - 1);
  });

  it("switches only between owned weapons", () => {
    let state = withState({
      loot: [{ x: 1, z: 0, weapon: "ar", ammo: 30, taken: false }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(state.owned).toContain("ar");
    const swapped = switchWeapon(state, "ar");
    expect(swapped.weapon).toBe("ar");
    expect(swapped.magazine.ar).toBe(fullMagazine("ar"));
    expect(switchWeapon(state, "dmr").weapon).toBe(state.weapon);
  });

  it("jumps and lands back on the terrain", () => {
    let state = stepMatch(withState({}), 0.1, { forward: 0, turn: 0, jump: true });
    expect(state.jumpAir).toBeGreaterThan(0);
    for (let i = 0; i < 40 && state.jumpAir > 0; i += 1) {
      state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    }
    expect(state.jumpAir).toBe(0);
    expect(state.jumpVy).toBe(0);
  });

  it("crouches to move slower and reduces recoil", () => {
    const standing = stepMatch(withState({}), 1, { forward: 1, turn: 0 });
    const crouched = stepMatch(withState({}), 1, { forward: 1, turn: 0, crouch: true });
    const standingDist = Math.hypot(standing.player.x, standing.player.z);
    const crouchedDist = Math.hypot(crouched.player.x, crouched.player.z);
    expect(crouchedDist).toBeLessThan(standingDist);
    expect(crouched.crouching).toBe(true);
    const recoilStanding = shoot(withState({})).state.player.angle;
    const recoilCrouched = shoot(withState({ crouching: true })).state.player.angle;
    expect(Math.abs(recoilCrouched)).toBeLessThan(Math.abs(recoilStanding));
  });

  it("lets nearby bots open fire on the player with tracers and damage", () => {
    let state = withState({
      bots: [{ x: 12, z: 0, angle: 0, health: 100, alive: true }],
    });
    let sawTracer = false;
    let damaged = false;
    for (let i = 0; i < 120 && !damaged; i += 1) {
      state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
      if (state.tracers.length > 0) {
        sawTracer = true;
      }
      if (state.player.health < 100) {
        damaged = true;
      }
    }
    expect(sawTracer).toBe(true);
    expect(damaged).toBe(true);
    expect(state.bots[0].fireTimer ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("picks up armor plates and absorbs damage before health", () => {
    let state = withState({
      loot: [{ x: 1, z: 0, weapon: "pistol", ammo: 5, taken: false, armor: true }],
    });
    state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    expect(state.loot[0].taken).toBe(true);
    expect(state.playerArmor).toBe(ARMOR_PICKUP_AMOUNT);
    const hit = damagePlayer(state.player, 30);
    expect(hit.armor).toBe(ARMOR_PICKUP_AMOUNT - 30);
    expect(hit.health).toBe(100);
    const drained = damagePlayer(hit, 40);
    expect(drained.armor).toBe(0);
    expect(drained.health).toBe(80);
  });

  it("routes bot fire through armor before health", () => {
    let state = withState({
      playerArmor: 100,
      bots: [{ x: 10, z: 0, angle: 0, health: 100, alive: true }],
    });
    for (let i = 0; i < 200 && state.playerArmor >= 100; i += 1) {
      state = stepMatch(state, 0.1, { forward: 0, turn: 0 });
    }
    expect(state.playerArmor).toBeLessThan(100);
    expect(state.player.health).toBe(100);
  });
});