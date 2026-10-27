import type { Obstacle } from "./battleRoyale";
import { ISLAND_RADIUS } from "./battleRoyale";

export const CAMP_POSITION = { x: -72, z: 84 };
export const AIRPORT_POSITION = { x: 84, z: -78 };

export const CAMP_LOOT_SPOTS = [
  { x: CAMP_POSITION.x - 6, z: CAMP_POSITION.z + 4 },
  { x: CAMP_POSITION.x + 5, z: CAMP_POSITION.z - 5 },
  { x: CAMP_POSITION.x + 2, z: CAMP_POSITION.z + 9 },
] as const;

export const AIRPORT_LOOT_SPOTS = [
  { x: AIRPORT_POSITION.x - 10, z: AIRPORT_POSITION.z + 2 },
  { x: AIRPORT_POSITION.x + 8, z: AIRPORT_POSITION.z - 8 },
  { x: AIRPORT_POSITION.x + 14, z: AIRPORT_POSITION.z + 6 },
] as const;

export function expansionObstacles(): Obstacle[] {
  const list: Obstacle[] = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    list.push({
      x: CAMP_POSITION.x + Math.cos(angle) * 9,
      z: CAMP_POSITION.z + Math.sin(angle) * 9,
      r: 3,
    });
  }
  list.push({ x: AIRPORT_POSITION.x, z: AIRPORT_POSITION.z, r: 10 });
  list.push({ x: AIRPORT_POSITION.x + 18, z: AIRPORT_POSITION.z + 12, r: 3 });
  return list;
}

export function expansionLootSpots(): { x: number; z: number }[] {
  return [...CAMP_LOOT_SPOTS, ...AIRPORT_LOOT_SPOTS];
}

export function expansionWithinIsland(): boolean {
  return (
    Math.hypot(CAMP_POSITION.x, CAMP_POSITION.z) < ISLAND_RADIUS - 10 &&
    Math.hypot(AIRPORT_POSITION.x, AIRPORT_POSITION.z) < ISLAND_RADIUS - 10
  );
}