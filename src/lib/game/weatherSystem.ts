import type { WeatherState } from "./weather";

export const DUST_STORM_MIN_DURATION = 45;
export const DUST_STORM_MAX_DURATION = 70;
export const DUST_STORM_CLEAR_INTERVAL = 75;
export const DUST_STORM_FOG_DISTANCE = 15;
export const DUST_STORM_AUDIO_DAMP = 0.6;

export type DustStormState = {
  active: boolean;
  timer: number;
  duration: number;
};

export function createDustStormState(): DustStormState {
  return { active: false, timer: DUST_STORM_CLEAR_INTERVAL, duration: 0 };
}

export function stepDustStorm(state: DustStormState, dt: number): DustStormState {
  const next = { ...state, timer: state.timer - dt };
  if (next.active) {
    if (next.timer <= 0) {
      next.active = false;
      next.duration = 0;
      next.timer = DUST_STORM_CLEAR_INTERVAL;
    }
    return next;
  }
  if (next.timer <= 0) {
    next.active = true;
    next.duration =
      DUST_STORM_MIN_DURATION +
      Math.random() * (DUST_STORM_MAX_DURATION - DUST_STORM_MIN_DURATION);
    next.timer = next.duration;
  }
  return next;
}

/** Forces the amber dust-storm weather while the event is active. */
export function withDustStorm(
  weather: WeatherState,
  storm: DustStormState,
): WeatherState {
  if (!storm.active) {
    return weather;
  }
  return {
    ...weather,
    kind: "dust",
    rain: 0,
    fog: Math.max(weather.fog, 0.95),
  };
}

/** Footstep/vehicle audio radius dampening during the storm. */
export function stormAudioRadius(radius: number, storm: DustStormState): number {
  return storm.active ? radius * (1 - DUST_STORM_AUDIO_DAMP) : radius;
}