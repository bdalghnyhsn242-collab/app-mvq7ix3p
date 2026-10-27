import { describe, expect, it } from "vitest";
import {
  DAY_LENGTH,
  WEATHER_INTERVAL,
  createWeatherState,
  dayPhase,
  stepWeather,
  timeOfDay,
  weatherEffects,
} from "./weather";

describe("dynamic weather system", () => {
  it("cycles through dawn, day, dusk, and night", () => {
    expect(dayPhase(0)).toBe("dawn");
    expect(dayPhase(DAY_LENGTH * 0.3)).toBe("day");
    expect(dayPhase(DAY_LENGTH * 0.65)).toBe("dusk");
    expect(dayPhase(DAY_LENGTH * 0.8)).toBe("night");
    expect(timeOfDay(DAY_LENGTH * 1.5)).toBeCloseTo(0.5);
  });

  it("starts clear during daytime", () => {
    const state = createWeatherState();
    expect(state.kind).toBe("clear");
    expect(dayPhase(state.time)).toBe("day");
    expect(state.rain).toBe(0);
  });

  it("transitions to a different weather kind after the interval", () => {
    let state = createWeatherState();
    state = stepWeather(state, WEATHER_INTERVAL + 8);
    expect(state.kind).not.toBe("clear");
    expect(state.timer).toBeGreaterThan(0);
  });

  it("blends rain and fog smoothly during transitions", () => {
    let state = createWeatherState();
    state = stepWeather(state, WEATHER_INTERVAL + 0.1);
    expect(state.transition).toBeGreaterThan(0);
    const mid = stepWeather(state, 3);
    expect(mid.rain).toBeGreaterThanOrEqual(0);
    expect(mid.rain).toBeLessThanOrEqual(1);
  });

  it("slows movement in storms and reduces bot sight in fog and night", () => {
    const storm = weatherEffects({
      ...createWeatherState(),
      kind: "storm",
      rain: 1,
      fog: 0.42,
      time: DAY_LENGTH * 0.4,
    });
    expect(storm.speedFactor).toBeCloseTo(0.8);
    const fog = weatherEffects({
      ...createWeatherState(),
      kind: "fog",
      rain: 0,
      fog: 0.75,
      time: DAY_LENGTH * 0.4,
    });
    expect(fog.botSightFactor).toBeLessThan(0.7);
    const night = weatherEffects({
      ...createWeatherState(),
      rain: 0,
      fog: 0.08,
      time: DAY_LENGTH * 0.9,
    });
    expect(night.botSightFactor).toBeLessThan(fog.botSightFactor);
  });
});