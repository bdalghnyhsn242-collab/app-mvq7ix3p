import { describe, expect, it } from "vitest";
import { WEAPONS } from "./battleRoyale";
import {
  ATTACHMENTS,
  applyAttachment,
  attachmentForIndex,
} from "./arsenal";

describe("advanced arsenal attachments", () => {
  it("cycles attachment ids deterministically", () => {
    expect(attachmentForIndex(0)).toBe(attachmentForIndex(7));
    expect(attachmentForIndex(1)).not.toBe(attachmentForIndex(0));
  });

  it("multiplies weapon stats by attachment multipliers", () => {
    const scoped = applyAttachment(WEAPONS.ar, "scope-8x");
    expect(scoped.range).toBeCloseTo(WEAPONS.ar.range * 2.2);
    expect(scoped.recoil).toBeCloseTo(WEAPONS.ar.recoil * 1.25);
    const extended = applyAttachment(WEAPONS.smg, "extended-mag");
    expect(extended.magazine).toBe(Math.round(WEAPONS.smg.magazine * 1.5));
    const gripped = applyAttachment(WEAPONS.lmg, "grip");
    expect(gripped.recoil).toBeCloseTo(WEAPONS.lmg.recoil * 0.7);
  });

  it("returns the weapon unchanged without an attachment", () => {
    const weapon = applyAttachment(WEAPONS.pistol, undefined);
    expect(weapon).toBe(WEAPONS.pistol);
    expect(applyAttachment(WEAPONS.pistol, null)).toBe(WEAPONS.pistol);
  });

  it("defines a name for every attachment", () => {
    for (const attachment of Object.values(ATTACHMENTS)) {
      expect(attachment.name.length).toBeGreaterThan(0);
    }
  });
});