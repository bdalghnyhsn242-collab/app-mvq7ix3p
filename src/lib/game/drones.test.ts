import { describe, expect, it } from "vitest";
import {
  DRONE_SPOT_RADIUS,
  DRONE_SPOTTED_TIME,
  createDroneState,
  droneSpotBonus,
  stepDrone,
} from "./drones";

describe("recon drones", () => {
  it("orbits the island at a constant radius", () => {
    let drone = createDroneState();
    const startRadius = Math.hypot(drone.x, drone.z);
    for (let i = 0; i < 30; i += 1) {
      drone = stepDrone(drone, 0.1, { x: 0, z: 0 });
    }
    expect(Math.hypot(drone.x, drone.z)).toBeCloseTo(startRadius, 1);
    expect(drone.orbitAngle).toBeGreaterThan(0);
  });

  it("spots the player when they pass underneath", () => {
    let drone = createDroneState();
    const near = { x: drone.x + 2, z: drone.z };
    drone = stepDrone(drone, 0.1, near);
    expect(Math.hypot(near.x - drone.x, near.z - drone.z)).toBeLessThan(DRONE_SPOT_RADIUS);
    expect(drone.spottedTimer).toBe(DRONE_SPOTTED_TIME);
    expect(drone.cooldown).toBeGreaterThan(0);
  });

  it("respects the cooldown between spotting passes", () => {
    let drone = createDroneState();
    drone = stepDrone(drone, 0.1, { x: drone.x + 2, z: drone.z });
    const spotted = drone.spottedTimer;
    drone = stepDrone(drone, 0.1, { x: drone.x + 2, z: drone.z });
    expect(drone.spottedTimer).toBeLessThan(spotted);
  });

  it("boosts bot pursuit while the player is spotted", () => {
    expect(droneSpotBonus(true)).toBeGreaterThan(1);
    expect(droneSpotBonus(false)).toBe(1);
  });
});