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
    new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.62, metalness: 0.18 }),
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
    new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7, metalness: 0.02 }),
  );
}

export function hairMaterial(): THREE.MeshStandardMaterial {
  return cachedMaterial("hair", () =>
    new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.55, metalness: 0.05 }),
  );
}