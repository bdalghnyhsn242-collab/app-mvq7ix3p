import { describe, expect, it } from "vitest";
import {
  BEACON_COUNTDOWN,
  createBeaconState,
  deployBeacon,
  stepBeacons,
} from "./beaconDropSystem";

describe("airdrop control beacon", () => {
  it("requires a held beacon to deploy", () => {
    const empty = deployBeacon(createBeaconState(), 5, 5, 0);
    expect(empty.drop).toBe(null);
  });

  it("spawns a cargo plane after the 10s countdown", () => {
    let state = deployBeacon({ ...createBeaconState(), held: 1 }, 10, 20, 0);
    expect(state.held).toBe(0);
    state = stepBeacons(state, BEACON_COUNTDOWN + 0.1);
    expect(state.drop?.plane).not.toBe(null);
    expect(state.drop?.crate).toBe(null);
  });

  it("flies the plane to the beacon and drops an armored crate", () => {
    let state = deployBeacon({ ...createBeaconState(), held: 1 }, 10, 20, 0);
    state = stepBeacons(state, BEACON_COUNTDOWN + 0.1);
    for (let i = 0; i < 60 && state.drop?.plane; i += 1) {
      state = stepBeacons(state, 0.5);
    }
    expect(state.drop?.plane).toBe(null);
    expect(state.drop?.crate?.landed).toBe(false);
    for (let i = 0; i < 20 && state.drop?.crate && !state.drop.crate.landed; i += 1) {
      state = stepBeacons(state, 1);
    }
    expect(state.drop?.crate?.landed).toBe(true);
  });

  it("blocks a second beacon while one is active", () => {
    let state = deployBeacon({ ...createBeaconState(), held: 2 }, 0, 0, 0);
    const again = deployBeacon(state, 5, 5, 1);
    expect(again.held).toBe(1);
    expect(again.drop?.x).toBe(0);
  });
});