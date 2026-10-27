import { describe, expect, it } from "vitest";
import { createWeatherState } from "./weather";
import {
  DUST_STORM_CLEAR_INTERVAL,
  DUST_STORM_FOG_DISTANCE,
  createDustStormState,
  stepDustStorm,
  stormAudioRadius,
  withDustStorm,
} from "./weatherSystem";

describe("dynamic dust storms", () => {
  it("triggers after the clear interval and lasts 45-70s", () => {
    let storm = createDustStormState();
    storm = stepDustStorm(storm, DUST_STORM_CLEAR_INTERVAL + 0.1);
    expect(storm.active).toBe(true);
    expect(storm.duration).toBeGreaterThanOrEqual(45);
    expect(storm.duration).toBeLessThanOrEqual(70);
  });

  it("returns to clear skies after the storm duration", () => {
    let storm = createDustStormState();
    storm = stepDustStorm(storm, DUST_STORM_CLEAR_INTERVAL + 0.1);
    storm = stepDustStorm(storm, storm.duration + 0.1);
    expect(storm.active).toBe(false);
  });

  it("forces amber dust weather with 15m visibility while active", () => {
    const weather = createWeatherState();
    const storm = { active: true, timer: 30, duration: 50 };
    const dusted = withDustStorm(weather, storm);
    expect(dusted.kind).toBe("dust");
    expect(dusted.fog).toBeGreaterThanOrEqual(0.95);
    expect(DUST_STORM_FOG_DISTANCE).toBe(15);
    const untouched = withDustStorm(weather, { active: false, timer: 0, duration: 0 });
    expect(untouched.kind).toBe("clear");
  });

  it("dampens audio radius by 60% during the storm", () => {
    const storm = { active: true, timer: 10, duration: 50 };
    expect(stormAudioRadius(100, storm)).toBeCloseTo(40);
    expect(stormAudioRadius(100, { active: false, timer: 0, duration: 0 })).toBe(100);
  });
});