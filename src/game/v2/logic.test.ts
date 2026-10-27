import { describe, expect, it } from "vitest";
import {
  ENEMY_SPEED,
  angleLerp,
  chaseStep,
  moveDirection,
  pushOutOfObstacles,
  selectClip,
} from "./logic";

describe("v2 core logic", () => {
  it("selects Idle/Walk/Run tiers from motion speed", () => {
    expect(selectClip(0, true)).toBe("Idle");
    expect(selectClip(0.05, true)).toBe("Idle");
    expect(selectClip(0.55, true)).toBe("Walk");
    expect(selectClip(1, true)).toBe("Run");
    expect(selectClip(0, false)).toBe("Run");
  });

  it("moves forward along -Z when the camera yaw is 0", () => {
    const dir = moveDirection(1, 0, 0);
    expect(dir.x).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(-1);
  });

  it("strafes right along +X when the camera yaw is 0", () => {
    const dir = moveDirection(0, 1, 0);
    expect(dir.x).toBeCloseTo(1);
    expect(dir.z).toBeCloseTo(0);
  });

  it("diagonal input stays normalized", () => {
    const dir = moveDirection(1, 1, 0.7);
    expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(1);
  });

  it("chases the player and stops at the stop distance", () => {
    const far = chaseStep(0, 0, 10, 0, ENEMY_SPEED, 0.5, 1.4);
    expect(far.moving).toBe(true);
    expect(far.dist).toBeGreaterThan(8);
    const near = chaseStep(9, 0, 10, 0, ENEMY_SPEED, 0.5, 1.4);
    expect(near.moving).toBe(false);
    expect(near.x).toBe(9);
  });

  it("never steps past the stop distance in one frame", () => {
    const step = chaseStep(0, 0, 1.0, 0, 100, 1, 1.4);
    expect(step.dist).toBeCloseTo(1.0);
  });

  it("pushes actors out of obstacle radii", () => {
    const pushed = pushOutOfObstacles(0.2, 0, [{ x: 0, z: 0, r: 0.8 }], 0.45);
    expect(Math.hypot(pushed.x, pushed.z)).toBeCloseTo(1.25);
  });

  it("interpolates angles along the shortest arc", () => {
    expect(angleLerp(0.1, 0.2, 0.5)).toBeCloseTo(0.15);
    expect(angleLerp(3.1, -3.1, 0.5)).toBeCloseTo(Math.PI, 2);
  });
});