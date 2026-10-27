import { describe, expect, it } from "vitest";
import {
  LOBBY_COUNTDOWN,
  createLobbyState,
  lobbyDeployNow,
  lobbySelectWeapon,
  lobbyShoot,
  stepLobby,
} from "./lobby";

describe("lobby waiting room", () => {
  it("counts down and launches the transport plane", () => {
    let state = createLobbyState();
    expect(state.status).toBe("waiting");
    state = stepLobby(state, LOBBY_COUNTDOWN + 1);
    expect(state.status).toBe("launching");
    expect(state.countdown).toBe(0);
  });

  it("lets the operator test weapons on range targets", () => {
    let state = lobbySelectWeapon(createLobbyState(), "ar");
    expect(state.weapon).toBe("ar");
    expect(state.ammo).toBe(24);
    const result = lobbyShoot(state);
    expect(result.hit).toBe(true);
    expect(result.state.hits).toBe(1);
    expect(result.state.shots).toBe(1);
    expect(result.state.ammo).toBe(23);
  });

  it("respects fire cooldown and empty magazine", () => {
    let state = createLobbyState();
    state = { ...state, ammo: 0 };
    expect(lobbyShoot(state).hit).toBe(false);
    const loaded = lobbyShoot(createLobbyState()).state;
    expect(lobbyShoot(loaded).hit).toBe(false);
  });

  it("keeps the countdown running while testing", () => {
    const state = stepLobby(createLobbyState(), 5);
    expect(state.countdown).toBe(LOBBY_COUNTDOWN - 5);
    expect(state.status).toBe("waiting");
  });

  it("deploys immediately on demand", () => {
    const state = lobbyDeployNow(createLobbyState());
    expect(state.status).toBe("launching");
  });
});