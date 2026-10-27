import { describe, expect, it } from "vitest";
import {
  DOME_DECAY_PER_SECOND,
  DOME_MAX_INTEGRITY,
  DOME_RADIUS,
  createShieldDomeState,
  deployShieldDome,
  domeAbsorb,
  drainDome,
  isInsideDome,
  stepShieldDome,
} from "./shieldDomeSystem";

describe("tactical shield dome", () => {
  it("deploys at full integrity and covers an 8m radius", () => {
    const dome = deployShieldDome(createShieldDomeState(), 5, 5);
    expect(dome.active).toBe(true);
    expect(dome.integrity).toBe(DOME_MAX_INTEGRITY);
    expect(isInsideDome(dome, 5, 5)).toBe(true);
    expect(isInsideDome(dome, 5 + DOME_RADIUS, 5)).toBe(true);
    expect(isInsideDome(dome, 5 + DOME_RADIUS + 1, 5)).toBe(false);
  });

  it("absorbs incoming damage and leaks only what exceeds integrity", () => {
    let dome = deployShieldDome(createShieldDomeState(), 0, 0);
    const first = domeAbsorb(dome, 1, 1, 30);
    expect(first.absorbed).toBe(30);
    expect(first.leaked).toBe(0);
    dome = drainDome(dome, first.absorbed);
    expect(dome.integrity).toBe(DOME_MAX_INTEGRITY - 30);
    const overflow = domeAbsorb(dome, 1, 1, 200);
    expect(overflow.absorbed).toBe(DOME_MAX_INTEGRITY - 30);
    expect(overflow.leaked).toBe(200 - (DOME_MAX_INTEGRITY - 30));
  });

  it("does not protect entities outside the dome", () => {
    const dome = deployShieldDome(createShieldDomeState(), 0, 0);
    const outside = domeAbsorb(dome, 50, 50, 20);
    expect(outside.absorbed).toBe(0);
    expect(outside.leaked).toBe(20);
  });

  it("decays over time and fades when depleted", () => {
    let dome = deployShieldDome(createShieldDomeState(), 0, 0);
    dome = stepShieldDome(dome, 10);
    expect(dome.integrity).toBeCloseTo(DOME_MAX_INTEGRITY - DOME_DECAY_PER_SECOND * 10);
    dome = stepShieldDome(dome, 1000);
    expect(dome.active).toBe(false);
    expect(dome.integrity).toBe(0);
  });
});