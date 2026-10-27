import { describe, expect, it } from "vitest";
import {
  MEDEVAC_DRONE_ALTITUDE,
  MEDEVAC_HEAL_AMOUNT,
  MEDEVAC_HEAL_DURATION,
  MEDEVAC_SMOKE_TIME,
  createMedEvacState,
  deployMedEvac,
  medEvacHealPerSecond,
  stepMedEvac,
} from "./medEvacDroneSystem";

describe("emergency medical evac drone", () => {
  it("deploys a drone at high altitude toward the beacon", () => {
    const state = deployMedEvac(createMedEvacState(), 10, 10, 0);
    expect(state.active).toBe(true);
    expect(state.drone?.altitude).toBe(MEDEVAC_DRONE_ALTITUDE);
    expect(state.mateIndex).toBe(0);
  });

  it("blocks a second deployment while active", () => {
    const first = deployMedEvac(createMedEvacState(), 10, 10, 0);
    const second = deployMedEvac(first, 50, 50, 1);
    expect(second.beacon?.x).toBe(10);
  });

  it("flies to the beacon and starts the nano-field heal", () => {
    let state = deployMedEvac(createMedEvacState(), 0, 0, 0);
    for (let i = 0; i < 40 && !state.onStation; i += 1) {
      state = stepMedEvac(state, 0.5);
    }
    expect(state.onStation).toBe(true);
    expect(state.smokeTimer).toBe(MEDEVAC_SMOKE_TIME);
    expect(medEvacHealPerSecond() * MEDEVAC_HEAL_DURATION).toBe(MEDEVAC_HEAL_AMOUNT);
  });

  it("completes the 50 HP heal over 5 seconds then resets after smoke", () => {
    let state = deployMedEvac(createMedEvacState(), 0, 0, 0);
    for (let i = 0; i < 40 && !state.onStation; i += 1) {
      state = stepMedEvac(state, 0.5);
    }
    state = stepMedEvac(state, MEDEVAC_HEAL_DURATION + 0.1);
    expect(state.healed).toBe(true);
    state = stepMedEvac(state, MEDEVAC_SMOKE_TIME + 0.1);
    expect(state.active).toBe(false);
  });
});