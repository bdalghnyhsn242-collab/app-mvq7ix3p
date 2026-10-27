import type { Weapon } from "./battleRoyale";

export type AttachmentId =
  | "scope-2x"
  | "scope-4x"
  | "scope-8x"
  | "suppressor"
  | "extended-mag"
  | "grip"
  | "laser";

export type Attachment = {
  id: AttachmentId;
  name: string;
  rangeMul: number;
  damageMul: number;
  cooldownMul: number;
  recoilMul: number;
  magMul: number;
};

export const ATTACHMENTS: Record<AttachmentId, Attachment> = {
  "scope-2x": {
    id: "scope-2x", name: "سكوب 2x", rangeMul: 1.25, damageMul: 1, cooldownMul: 1, recoilMul: 1, magMul: 1,
  },
  "scope-4x": {
    id: "scope-4x", name: "سكوب 4x", rangeMul: 1.6, damageMul: 1, cooldownMul: 1, recoilMul: 1.1, magMul: 1,
  },
  "scope-8x": {
    id: "scope-8x", name: "سكوب 8x", rangeMul: 2.2, damageMul: 1, cooldownMul: 1.15, recoilMul: 1.25, magMul: 1,
  },
  suppressor: {
    id: "suppressor", name: "كاتم صوت", rangeMul: 1, damageMul: 0.92, cooldownMul: 1, recoilMul: 0.85, magMul: 1,
  },
  "extended-mag": {
    id: "extended-mag", name: "مخزن ممتد", rangeMul: 1, damageMul: 1, cooldownMul: 1, recoilMul: 1, magMul: 1.5,
  },
  grip: {
    id: "grip", name: "مقبض أمامي", rangeMul: 1, damageMul: 1, cooldownMul: 1.05, recoilMul: 0.7, magMul: 1,
  },
  laser: {
    id: "laser", name: "مؤشر ليزر", rangeMul: 1, damageMul: 1, cooldownMul: 0.85, recoilMul: 1, magMul: 1,
  },
};

export const ATTACHMENT_IDS = Object.keys(ATTACHMENTS) as AttachmentId[];

export function attachmentForIndex(index: number): AttachmentId {
  return ATTACHMENT_IDS[((index % ATTACHMENT_IDS.length) + ATTACHMENT_IDS.length) % ATTACHMENT_IDS.length];
}

export function applyAttachment(weapon: Weapon, attachmentId?: AttachmentId | null): Weapon {
  if (!attachmentId) {
    return weapon;
  }
  const attachment = ATTACHMENTS[attachmentId];
  return {
    ...weapon,
    range: weapon.range * attachment.rangeMul,
    damage: weapon.damage * attachment.damageMul,
    cooldown: weapon.cooldown * attachment.cooldownMul,
    recoil: weapon.recoil * attachment.recoilMul,
    magazine: Math.round(weapon.magazine * attachment.magMul),
  };
}