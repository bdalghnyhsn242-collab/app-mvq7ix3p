export type WeatherKind = "clear" | "rain" | "fog" | "storm";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

export const DAY_LENGTH = 240;
export const WEATHER_INTERVAL = 40;
export const WEATHER_TRANSITION = 6;

export type WeatherState = {
  time: number;
  kind: WeatherKind;
  nextKind: WeatherKind;
  transition: number;
  timer: number;
  rain: number;
  fog: number;
};

const TARGETS: Record<WeatherKind, { rain: number; fog: number }> = {
  clear: { rain: 0, fog: 0.08 },
  rain: { rain: 0.7, fog: 0.28 },
  fog: { rain: 0, fog: 0.75 },
  storm: { rain: 1, fog: 0.42 },
};

export function timeOfDay(time: number): number {
  const t = ((time / DAY_LENGTH) % 1 + 1) % 1;
  return t;
}

export function dayPhase(time: number): DayPhase {
  const t = timeOfDay(time);
  if (t < 0.22) {
    return "dawn";
  }
  if (t < 0.58) {
    return "day";
  }
  if (t < 0.72) {
    return "dusk";
  }
  return "night";
}

export function createWeatherState(): WeatherState {
  return {
    time: DAY_LENGTH * 0.3,
    kind: "clear",
    nextKind: "clear",
    transition: 0,
    timer: WEATHER_INTERVAL,
    rain: 0,
    fog: 0.08,
  };
}

function pickNext(kind: WeatherKind): WeatherKind {
  const options: WeatherKind[] = ["clear", "rain", "fog", "storm"];
  const filtered = options.filter((option) => option !== kind);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function stepWeather(state: WeatherState, dt: number): WeatherState {
  const next = { ...state, time: state.time + dt };
  next.timer -= dt;
  if (next.timer <= 0 && next.transition <= 0) {
    next.nextKind = pickNext(next.kind);
    next.transition = 1;
  }
  if (next.transition > 0) {
    next.transition = Math.max(0, next.transition - dt / WEATHER_TRANSITION);
    const from = TARGETS[next.kind];
    const to = TARGETS[next.nextKind];
    const blend = 1 - next.transition;
    next.rain = from.rain + (to.rain - from.rain) * blend;
    next.fog = from.fog + (to.fog - from.fog) * blend;
    if (next.transition <= 0) {
      next.kind = next.nextKind;
      next.timer = WEATHER_INTERVAL;
    }
  }
  return next;
}

export function weatherEffects(state: WeatherState): {
  speedFactor: number;
  botSightFactor: number;
} {
  const phase = dayPhase(state.time);
  const nightFactor = phase === "night" ? 1 : phase === "dusk" || phase === "dawn" ? 0.5 : 0;
  return {
    speedFactor: 1 - state.rain * 0.2,
    botSightFactor: Math.max(0.25, 1 - state.fog * 0.5 - nightFactor * 0.3),
  };
}