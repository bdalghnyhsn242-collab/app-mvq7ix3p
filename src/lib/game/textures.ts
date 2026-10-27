import * as THREE from "three";

export type CamoVariant = "woodland" | "desert" | "ghillie";

const textureCache = new Map<string, THREE.Texture | null>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function createCanvas(size: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
} {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d") };
}

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function finalize(canvas: HTMLCanvasElement, repeat: number): THREE.Texture | null {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CAMO_PALETTES: Record<CamoVariant, string[]> = {
  woodland: ["#3d5a2a", "#2c3f1e", "#6b7a44", "#1f2b16", "#8a7a4a"],
  desert: ["#c2a36b", "#a8894f", "#d8c08a", "#8a6f3e", "#b59a6a"],
  ghillie: ["#2f4a1f", "#3d5a2a", "#24371a", "#556b2f", "#1c2b12"],
};

export function camoTexture(variant: CamoVariant): THREE.Texture | null {
  const key = `camo:${variant}`;
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(variant === "desert" ? 11 : variant === "ghillie" ? 23 : 7);
  const palette = CAMO_PALETTES[variant];
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = palette[1 + Math.floor(random() * (palette.length - 1))];
    const x = random() * 256;
    const y = random() * 256;
    const r = 6 + random() * 26;
    ctx.beginPath();
    const points = 5 + Math.floor(random() * 4);
    for (let p = 0; p < points; p += 1) {
      const angle = (p / points) * Math.PI * 2;
      const radius = r * (0.55 + random() * 0.7);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (p === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}

export function fabricRoughnessTexture(): THREE.Texture | null {
  const key = "fabric-rough";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(128);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(4242);
  const image = ctx.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const weave = 150 + Math.floor(random() * 80);
    image.data[i] = weave;
    image.data[i + 1] = weave;
    image.data[i + 2] = weave;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = finalize(canvas, 3);
  textureCache.set(key, texture);
  return texture;
}

/** Subtle skin base: warm tone with soft blotches and pores. */
export function skinTexture(): THREE.Texture | null {
  const key = "skin";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(128);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(5150);
  ctx.fillStyle = "#e2a878";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle =
      random() > 0.5 ? "rgba(214,154,110,0.5)" : "rgba(240,196,150,0.5)";
    ctx.beginPath();
    ctx.ellipse(
      random() * 128,
      random() * 128,
      3 + random() * 10,
      2 + random() * 7,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = "rgba(120,70,50,0.12)";
    ctx.fillRect(random() * 128, random() * 128, 1.5, 1.5);
  }
  const texture = finalize(canvas, 1);
  textureCache.set(key, texture);
  return texture;
}

/** Nylon webbing for tactical gear: dark base with stitch rows and wear. */
export function webbingTexture(): THREE.Texture | null {
  const key = "webbing";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(128);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(7717);
  ctx.fillStyle = "#26292d";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#34383d";
  ctx.lineWidth = 2;
  for (let y = 6; y < 128; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  for (let i = 0; i < 160; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(15,17,19,0.5)" : "rgba(61,66,72,0.5)";
    ctx.fillRect(random() * 128, random() * 128, 2, 2);
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}

export function mudTexture(): THREE.Texture | null {
  const key = "mud";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(128);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(909);
  ctx.fillStyle = "#2b2118";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "#4a3a26" : "#6b5a3e";
    ctx.beginPath();
    ctx.ellipse(
      random() * 128,
      random() * 128,
      2 + random() * 9,
      2 + random() * 6,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = finalize(canvas, 1);
  textureCache.set(key, texture);
  return texture;
}

function cachedMaterial(key: string, factory: () => THREE.MeshStandardMaterial) {
  const existing = materialCache.get(key);
  if (existing) {
    return existing;
  }
  const material = factory();
  materialCache.set(key, material);
  return material;
}

export function clothMaterial(variant: CamoVariant): THREE.MeshStandardMaterial {
  return cachedMaterial(`cloth:${variant}`, () => {
    const base =
      variant === "desert" ? 0xc2a36b : variant === "ghillie" ? 0x3d5a2a : 0x4d6b3a;
    return new THREE.MeshStandardMaterial({
      color: base,
      map: camoTexture(variant) ?? undefined,
      roughnessMap: fabricRoughnessTexture() ?? undefined,
      roughness: 0.92,
      metalness: 0.04,
    });
  });
}

export function gearMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("gear", () =>
    new THREE.MeshStandardMaterial({
      color: 0x2e3338,
      map: webbingTexture() ?? undefined,
      roughnessMap: fabricRoughnessTexture() ?? undefined,
      roughness: 0.7,
      metalness: 0.12,
    }),
  );
}

export function metalMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("metal", () =>
    new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.32, metalness: 0.82 }),
  );
}

export function lensMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("lens", () =>
    new THREE.MeshStandardMaterial({ color: 0x1d2f3a, roughness: 0.08, metalness: 1 }),
  );
}

export function bootMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("boot", () =>
    new THREE.MeshStandardMaterial({
      color: 0x241c12,
      map: mudTexture() ?? undefined,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );
}

export function skinMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("skin", () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: skinTexture() ?? undefined,
      roughness: 0.55,
      metalness: 0.02,
    }),
  );
}

export function hairMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("hair", () =>
    new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.55, metalness: 0.05 }),
  );
}

/** Grayscale mottling multiplied over the terrain's vertex colors. */
export function groundDetailTexture(): THREE.Texture | null {
  const key = "ground-detail";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(8123);
  ctx.fillStyle = "#b4b4b4";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i += 1) {
    const shade = 118 + Math.floor(random() * 110);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    const s = 1 + random() * 4;
    ctx.fillRect(random() * 256, random() * 256, s, s);
  }
  for (let i = 0; i < 70; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(70,70,70,0.22)" : "rgba(235,235,235,0.18)";
    ctx.beginPath();
    ctx.ellipse(
      random() * 256,
      random() * 256,
      6 + random() * 22,
      4 + random() * 14,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = finalize(canvas, 48);
  textureCache.set(key, texture);
  return texture;
}

/** Aged plaster with brick courses and stains for walls. */
export function plasterTexture(): THREE.Texture | null {
  const key = "plaster";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(3311);
  ctx.fillStyle = "#c9c2b2";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(96,86,70,0.5)";
  ctx.lineWidth = 2;
  for (let y = 10; y < 256; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    const offset = (y / 22) % 2 === 0 ? 0 : 24;
    for (let x = offset; x < 256; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(120,104,80,0.25)" : "rgba(240,236,224,0.3)";
    ctx.beginPath();
    ctx.ellipse(
      random() * 256,
      random() * 256,
      4 + random() * 18,
      3 + random() * 10,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}

/** Weathered roof tiles in staggered rows. */
export function roofTileTexture(): THREE.Texture | null {
  const key = "roof-tile";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(6411);
  ctx.fillStyle = "#7a4a30";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 18) {
    ctx.fillStyle = "rgba(40,22,12,0.55)";
    ctx.fillRect(0, y + 14, 256, 4);
    for (let x = ((y / 18) % 2) * 16; x < 256; x += 32) {
      ctx.fillStyle = "rgba(255,200,150,0.12)";
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 8, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = "rgba(30,18,10,0.3)";
    ctx.fillRect(random() * 256, random() * 256, 3 + random() * 8, 2 + random() * 5);
  }
  const texture = finalize(canvas, 3);
  textureCache.set(key, texture);
  return texture;
}

/** Rough wooden planks for crates and beams. */
export function woodPlankTexture(): THREE.Texture | null {
  const key = "wood-plank";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(9109);
  ctx.fillStyle = "#8a6b3e";
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 36) {
    ctx.fillStyle = "rgba(50,34,16,0.6)";
    ctx.fillRect(x, 0, 3, 256);
  }
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(60,42,20,0.35)" : "rgba(180,150,100,0.25)";
    ctx.fillRect(random() * 256, random() * 256, 2 + random() * 20, 1.5);
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}

/** Burlap sacking for sandbags and tent canvas. */
export function sandbagTexture(): THREE.Texture | null {
  const key = "sandbag";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(128);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(5171);
  ctx.fillStyle = "#9b8b5e";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(110,96,60,0.5)";
  ctx.lineWidth = 1.5;
  for (let y = 0; y < 128; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(70,60,36,0.3)" : "rgba(200,186,140,0.3)";
    ctx.fillRect(random() * 128, random() * 128, 2 + random() * 5, 1.5);
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}

/** Stained concrete with cracks for runways, pads, and ruins. */
export function concreteTexture(): THREE.Texture | null {
  const key = "concrete";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(2277);
  ctx.fillStyle = "#8d8d85";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i += 1) {
    const shade = 110 + Math.floor(random() * 80);
    ctx.fillStyle = `rgb(${shade},${shade},${shade - 6})`;
    ctx.fillRect(random() * 256, random() * 256, 2, 2);
  }
  ctx.strokeStyle = "rgba(50,50,46,0.5)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    let x = random() * 256;
    let y = random() * 256;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s += 1) {
      x += (random() - 0.5) * 60;
      y += (random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = finalize(canvas, 4);
  textureCache.set(key, texture);
  return texture;
}

/** Corrugated rusted metal for hangars, towers, and beams. */
export function rustTexture(): THREE.Texture | null {
  const key = "rust";
  if (textureCache.has(key)) {
    return textureCache.get(key) ?? null;
  }
  const { canvas, ctx } = createCanvas(256);
  if (!ctx) {
    textureCache.set(key, null);
    return null;
  }
  const random = seeded(7789);
  ctx.fillStyle = "#6e4a2f";
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 18) {
    ctx.fillStyle = "rgba(30,18,10,0.4)";
    ctx.fillRect(x, 0, 4, 256);
    ctx.fillStyle = "rgba(200,150,100,0.14)";
    ctx.fillRect(x + 6, 0, 6, 256);
  }
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(160,80,30,0.4)" : "rgba(40,24,12,0.4)";
    ctx.beginPath();
    ctx.ellipse(
      random() * 256,
      random() * 256,
      3 + random() * 14,
      2 + random() * 9,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = finalize(canvas, 2);
  textureCache.set(key, texture);
  return texture;
}