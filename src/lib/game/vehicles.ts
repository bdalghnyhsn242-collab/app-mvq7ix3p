export type VehicleKind = "uaz" | "pickup" | "buggy";

export type Vehicle = {
  kind: VehicleKind;
  x: number;
  z: number;
  angle: number;
  speed: number;
  health: number;
  tires: boolean[];
  occupied: boolean;
  driverBot: number;
  turretCooldown: number;
  turretFlash: number;
  wreck: boolean;
};

export const TURRET_RANGE = 42;
export const TURRET_DAMAGE = 14;
export const TURRET_INTERVAL = 0.9;
export const PLAYER_TURRET_RANGE = 48;
export const PLAYER_TURRET_DAMAGE = 65;
export const PLAYER_TURRET_COOLDOWN = 0.7;

export const VEHICLE_SPECS: Record<
  VehicleKind,
  { name: string; maxSpeed: number; accel: number; turnRate: number; armor: number }
> = {
  uaz: { name: "UAZ مدرعة", maxSpeed: 26, accel: 9, turnRate: 1.6, armor: 220 },
  pickup: { name: "شاحنة تكتيكية", maxSpeed: 24, accel: 8, turnRate: 1.4, armor: 180 },
  buggy: { name: "باجي سريع", maxSpeed: 32, accel: 12, turnRate: 2.2, armor: 120 },
};

export function createVehicles(): Vehicle[] {
  const kinds: VehicleKind[] = ["uaz", "pickup", "buggy"];
  return kinds.map((kind, i) => {
    const angle = (i / kinds.length) * Math.PI * 2 + 0.9;
    return {
      kind,
      x: Math.cos(angle) * 26,
      z: Math.sin(angle) * 26,
      angle: angle + Math.PI,
      speed: 0,
      health: VEHICLE_SPECS[kind].armor,
      tires: [true, true, true, true],
      occupied: false,
      driverBot: -1,
      turretCooldown: 0,
      turretFlash: 0,
      wreck: false,
    };
  });
}

export function hasTurret(kind: VehicleKind): boolean {
  return kind === "pickup";
}

export function coolTurret(vehicle: Vehicle, dt: number): Vehicle {
  return {
    ...vehicle,
    turretCooldown: Math.max(0, vehicle.turretCooldown - dt),
    turretFlash: Math.max(0, vehicle.turretFlash - dt),
  };
}

export function destroyVehicle(vehicle: Vehicle): Vehicle {
  return { ...vehicle, health: 0, speed: 0, wreck: true, driverBot: -1, occupied: false };
}

export function tireGrip(vehicle: Vehicle): number {
  return vehicle.tires.filter(Boolean).length / vehicle.tires.length;
}

export function stepVehicle(
  vehicle: Vehicle,
  dt: number,
  input: { forward: number; turn: number },
): Vehicle {
  const spec = VEHICLE_SPECS[vehicle.kind];
  const grip = tireGrip(vehicle);
  const maxSpeed = spec.maxSpeed * (0.35 + 0.65 * grip);
  let speed = vehicle.speed + input.forward * spec.accel * dt;
  speed = Math.max(-maxSpeed * 0.4, Math.min(maxSpeed, speed));
  if (input.forward === 0) {
    speed *= Math.max(0, 1 - 1.2 * dt);
  }
  const speedFactor = Math.min(1, Math.abs(speed) / 8);
  const angle =
    vehicle.angle + input.turn * spec.turnRate * dt * speedFactor * (0.5 + 0.5 * grip);
  return {
    ...vehicle,
    speed,
    angle,
    x: vehicle.x + Math.sin(angle) * speed * dt,
    z: vehicle.z + Math.cos(angle) * speed * dt,
  };
}

export function blowTire(vehicle: Vehicle, index: number): Vehicle {
  const tires = vehicle.tires.map((tire, i) => (i === index ? false : tire));
  return { ...vehicle, tires };
}

export function damageVehicle(vehicle: Vehicle, amount: number): Vehicle {
  return { ...vehicle, health: vehicle.health - amount };
}