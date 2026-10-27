import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS } from "./battleRoyale";
import { terrainSurfaceColor } from "./environment";

describe("island terrain surface colors", () => {
  it("paints the shoreline band sandy (r > g > b)", () => {
    const sand = terrainSurfaceColor(ISLAND_RADIUS - 10, 0, 0.5);
    expect(sand.r).toBeGreaterThan(sand.g);
    expect(sand.g).toBeGreaterThan(sand.b);
  });

  it("paints inland lowlands grass green instead of the old all-yellow", () => {
    const grass = terrainSurfaceColor(0, 0, 6);
    expect(grass.g).toBeGreaterThan(grass.r);
    expect(grass.g).toBeGreaterThan(grass.b);
  });

  it("keeps inland riverbeds and hollows mud-brown", () => {
    const mud = terrainSurfaceColor(0, 0, 0.1);
    expect(mud.r).toBeGreaterThan(mud.g);
    expect(mud.g).toBeGreaterThan(mud.b);
  });

  it("darkens the seabed with depth so water never glows yellow", () => {
    const shallow = terrainSurfaceColor(ISLAND_RADIUS - 5, 0, -0.6);
    const deep = terrainSurfaceColor(ISLAND_RADIUS + 20, 0, -3);
    expect(deep.r).toBeLessThan(shallow.r);
    expect(deep.g).toBeLessThan(shallow.g);
  });

  it("caps high mountains with rock brightening into snow", () => {
    const rock = terrainSurfaceColor(0, 0, 20);
    const snow = terrainSurfaceColor(0, 0, 32);
    expect(snow.r).toBeGreaterThan(rock.r);
    expect(snow.g).toBeGreaterThan(rock.g);
  });

  it("is deterministic for identical inputs", () => {
    const a = terrainSurfaceColor(12, -7, 4);
    const b = terrainSurfaceColor(12, -7, 4);
    expect(a.equals(b)).toBe(true);
  });
});