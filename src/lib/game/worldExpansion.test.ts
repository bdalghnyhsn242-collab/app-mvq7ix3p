import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS } from "./battleRoyale";
import {
  AIRPORT_POSITION,
  CAMP_POSITION,
  expansionLootSpots,
  expansionObstacles,
  expansionWithinIsland,
} from "./worldExpansion";

describe("map expansion: military camp and abandoned airport", () => {
  it("places both landmarks inside the island", () => {
    expect(expansionWithinIsland()).toBe(true);
    expect(Math.hypot(CAMP_POSITION.x, CAMP_POSITION.z)).toBeLessThan(ISLAND_RADIUS);
    expect(Math.hypot(AIRPORT_POSITION.x, AIRPORT_POSITION.z)).toBeLessThan(ISLAND_RADIUS);
  });

  it("adds camp and airport obstacles for AI steering", () => {
    const obstacles = expansionObstacles();
    expect(obstacles.length).toBe(7);
    expect(obstacles.some((o) => Math.hypot(o.x - AIRPORT_POSITION.x, o.z - AIRPORT_POSITION.z) < 1)).toBe(true);
  });

  it("provides loot spots at both landmarks", () => {
    const spots = expansionLootSpots();
    expect(spots).toHaveLength(6);
    expect(spots.every((s) => Math.hypot(s.x, s.z) < ISLAND_RADIUS)).toBe(true);
  });
});