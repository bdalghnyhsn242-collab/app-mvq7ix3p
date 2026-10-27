import * as THREE from "three";
import { dayPhase, timeOfDay, type WeatherState } from "@/lib/game/weather";

export function createRain(count = 900): {
  points: THREE.Points;
  update: (dt: number, intensity: number, centerX: number, centerZ: number) => void;
} {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() * 2 - 1) * 60;
    positions[i * 3 + 1] = Math.random() * 40;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 60;
    speeds[i] = 22 + Math.random() * 14;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x9fc8e8,
    size: 0.14,
    transparent: true,
    opacity: 0.7,
  });
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;
  return {
    points,
    update: (dt, intensity, centerX, centerZ) => {
      points.visible = intensity > 0.02;
      material.opacity = 0.35 + intensity * 0.45;
      const attr = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i += 1) {
        const y = attr.getY(i) - speeds[i] * dt * (0.6 + intensity);
        if (y < 0) {
          attr.setY(i, 38 + Math.random() * 6);
          attr.setX(i, centerX + (Math.random() * 2 - 1) * 60);
          attr.setZ(i, centerZ + (Math.random() * 2 - 1) * 60);
        } else {
          attr.setY(i, y);
        }
      }
      attr.needsUpdate = true;
    },
  };
}

const DAY_SKY = new THREE.Color(0x9fc4e8);
const NIGHT_SKY = new THREE.Color(0x0d1626);
const DUSK_SKY = new THREE.Color(0xd98a4e);
const FOG_SKY = new THREE.Color(0x6b7683);

export function updateWeatherVisuals(opts: {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  weather: WeatherState;
}): void {
  const { scene, sun, hemi, weather } = opts;
  const t = timeOfDay(weather.time);
  const phase = dayPhase(weather.time);
  const sky = new THREE.Color();
  if (phase === "night") {
    sky.copy(NIGHT_SKY);
  } else if (phase === "dusk") {
    sky.copy(DUSK_SKY).lerp(NIGHT_SKY, (t - 0.58) / 0.14);
  } else if (phase === "dawn") {
    sky.copy(NIGHT_SKY).lerp(DAY_SKY, t / 0.22);
  } else {
    sky.copy(DAY_SKY);
  }
  sky.lerp(FOG_SKY, weather.fog * 0.7);
  if (scene.background instanceof THREE.Color) {
    scene.background.copy(sky);
  }
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(sky);
    scene.fog.near = 140 - weather.fog * 110;
    scene.fog.far = 700 - weather.fog * 480;
  }
  const daylight = phase === "day" ? 1 : phase === "night" ? 0.12 : 0.55;
  sun.intensity = 1.2 * daylight * (1 - weather.fog * 0.4);
  hemi.intensity = 0.35 + daylight * 0.75;
}