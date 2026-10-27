import { describe, expect, it } from "vitest";
import {
  RADAR_JAM_COOLDOWN,
  RADAR_JAM_DURATION,
  TOWER_CAPTURE_TIME,
  TOWER_TERMINAL,
  createRadioTowerState,
  radarRevealActive,
  stepRadioTower,
  towerDistance,
} from "./radioTowerSystem";

describe("tactical radio tower and radar jamming", () => {
  it("captures after 8 continuous seconds at the terminal", () => {
    let tower = createRadioTowerState();
    const atTerminal = [{ x: TOWER_TERMINAL.x + 1, z: TOWER_TERMINAL.z }];
    for (let i = 0; i < TOWER_CAPTURE_TIME * 10; i += 1) {
      tower = stepRadioTower(tower, 0.1, atTerminal);
    }
    expect(tower.captured).toBe(true);
    expect(tower.jamTimer).toBe(RADAR_JAM_DURATION);
  });

  it("decays capture progress when the squad leaves", () => {
    let tower = createRadioTowerState();
    tower = stepRadioTower(tower, 4, [{ x: TOWER_TERMINAL.x, z: TOWER_TERMINAL.z }]);
    tower = stepRadioTower(tower, 1, [{ x: 100, z: 100 }]);
    expect(tower.captureProgress).toBeLessThan(4);
  });

  it("runs a 90s cooldown after the 60s jam ends", () => {
    let tower = createRadioTowerState();
    tower = stepRadioTower(tower, TOWER_CAPTURE_TIME, [{ x: TOWER_TERMINAL.x, z: TOWER_TERMINAL.z }]);
    tower = stepRadioTower(tower, RADAR_JAM_DURATION, []);
    expect(tower.cooldown).toBe(RADAR_JAM_COOLDOWN);
    expect(radarRevealActive(tower)).toBe(false);
    const blocked = stepRadioTower(tower, 1, [{ x: TOWER_TERMINAL.x, z: TOWER_TERMINAL.z }]);
    expect(blocked.captureProgress).toBe(0);
  });

  it("measures distance to the central terminal", () => {
    expect(towerDistance(TOWER_TERMINAL)).toBe(0);
    expect(towerDistance({ x: TOWER_TERMINAL.x + 3, z: TOWER_TERMINAL.z })).toBe(3);
  });
});