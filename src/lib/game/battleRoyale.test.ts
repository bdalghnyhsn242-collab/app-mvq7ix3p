import { describe, expect, it } from "vitest";
import {
  BOT_COUNT,
  ZONE_START_RADIUS,
  createMatchState,
  shoot,
  stepMatch,
  type MatchState,
} from "./battleRoyale";

function withState(overrides: Partial<MatchState>): MatchState {
  return { ...createMatchState(), ...overrides };
}

describe("battle royale core logic", () => {
  it("starts the player at the island center with bots around", () => {
    const state = createMatchState();
    expect(state.player).toMatchObject({ x: 0, z: 0, health: 100 });
    expect(state.bots).toHaveLength(BOT_COUNT);
    expect(state.zone.radius).toBe(ZONE_START_RADIUS);
    expect(state.status).toBe("running");
  });

  it("moves the player forward along its facing direction", () => {
    const state = stepMatch(createMatchState(), 1, { forward: 1, turn: 0 });
    expect(state.player.z).toBeGreaterThan(0);
    expect(state.player.x).toBeCloseTo(0);
  });

  it("turns the player", () => {
    const state = stepMatch(createMatchState(), 1, { forward: 0, turn: 1 });
    expect(state.player.angle).toBeGreaterThan(0);
  });

  it("shrinks the safe zone over time", () => {
    const state = stepMatch(createMatchState(), 10, { forward: 0, turn: 0 });
    expect(state.zone.radius).toBeLessThan(ZONE_START_RADIUS);
  });

  it("damages the player outside the safe zone", () => {
    const state = withState({ player: { x: 39, z: 0, angle: 0, health: 100, alive: true } });
    const next = stepMatch(state, 1, { forward: 0, turn: 0 });
    expect(next.player.health).toBeLessThan(100);
  });

  it("eliminates a bot directly in front when shooting", () => {
    const state = withState({ bots: [{ x: 0, z: 10, angle: 0, health: 100, alive: true }] });
    const result = shoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.bots[0].alive).toBe(false);
    expect(result.state.status).toBe("won");
  });

  it("misses bots behind the player", () => {
    const state = withState({ bots: [{ x: 0, z: -10, angle: 0, health: 100, alive: true }] });
    expect(shoot(state).hit).toBe(false);
  });

  it("ends the match as lost when health is depleted", () => {
    const state = withState({ player: { x: 39, z: 0, angle: 0, health: 1, alive: true } });
    expect(stepMatch(state, 1, { forward: 0, turn: 0 }).status).toBe("lost");
  });
});