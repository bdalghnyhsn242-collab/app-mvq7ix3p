import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Crosshair, Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { makeSoldier } from "@/components/game/soldierModel";
import {
  createCheckpoints,
  createBuildings,
  createForest,
  createRocks,
  createRuins,
  createTerrain,
} from "@/lib/game/environment";
import { createWater } from "@/lib/game/water";
import {
  BOT_COUNT,
  LOOT_COUNT,
  BUILDING_POSITIONS,
  ZONE_START_RADIUS,
  DEPLOY_PLANE_ALTITUDE,
  isSwimming,
  createMatchState,
  landedDeployment,
  lootWeaponForIndex,
  terrainHeight,
  WEAPONS,
  shoot,
  stepMatch,
  type DeployPhase,
  type MatchState,
  type MatchStatus,
  type WeaponId,
} from "@/lib/game/battleRoyale";
import { VEHICLE_SPECS, type VehicleKind } from "@/lib/game/vehicles";
import { SQUAD_SIZES, type SquadSize, type Teammate } from "@/lib/game/squad";

type Hud = {
  health: number;
  alive: number;
  zone: number;
  weapon: string;
  ammo: number;
  crates: number;
  vehicle: string | null;
  speed: number;
  airdrop: boolean;
  swimming: boolean;
  deployPhase: DeployPhase;
  altitude: number;
  squad: Teammate[];
  status: MatchStatus;
};

const LOOT_COLORS: Record<WeaponId, number> = {
  pistol: 0xfbbf24,
  smg: 0xa78bfa,
  ar: 0x38bdf8,
  dmr: 0xf43f5e,
  lmg: 0x22d3ee,
  shotgun: 0xf97316,
};

const VEHICLE_COLORS: Record<VehicleKind, number> = {
  uaz: 0x4d5d43,
  pickup: 0x6b5a3e,
  buggy: 0xb45309,
};

function makeVehicleMesh(kind: VehicleKind): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: VEHICLE_COLORS[kind] });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 3.6), bodyMat);
  body.position.y = 0.9;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.4), bodyMat);
  cabin.position.set(0, 1.6, -0.2);
  group.add(body, cabin);
  const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  wheelGeometry.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.2], [0.95, 1.2], [-0.95, -1.2], [0.95, -1.2]] as const) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMat);
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  if (kind === "pickup") {
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x2b2f33 }),
    );
    turret.rotation.x = Math.PI / 2;
    turret.position.set(0, 2, -1.1);
    group.add(turret);
  }
  return group;
}

function HoldButton({ label, onHold }: { label: string; onHold: (active: boolean) => void }) {
  return (
    <Button
      variant="outline"
      className="h-11 w-14 select-none"
      onPointerDown={(event) => {
        event.preventDefault();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </Button>
  );
}

function makePlaneMesh(): THREE.Group {
  const material = new THREE.MeshLambertMaterial({ color: 0x5b6b78 });
  const group = new THREE.Group();
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 12, 10), material);
  fuselage.rotation.x = Math.PI / 2;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 2.4), material);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1.2), material);
  tail.position.set(0, 1.2, 5.4);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 1.4), material);
  fin.position.set(0, 1.4, 5.4);
  group.add(fuselage, wing, tail, fin);
  return group;
}

export default function BattleRoyale3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<MatchState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const shootRef = useRef(false);
  const enterRef = useRef(false);
  const dropRef = useRef(false);
  const reviveRef = useRef(false);
  const [squadSize, setSquadSize] = useState<SquadSize>(1);
  const [hud, setHud] = useState<Hud>({
    health: 100,
    alive: BOT_COUNT,
    zone: ZONE_START_RADIUS,
    weapon: WEAPONS.pistol.name,
    ammo: 24,
    crates: LOOT_COUNT,
    vehicle: null,
    speed: 0,
    airdrop: false,
    swimming: false,
    deployPhase: "plane",
    altitude: DEPLOY_PLANE_ALTITUDE,
    squad: [],
    status: "idle",
  });

  const start = useCallback((size: SquadSize) => {
    stateRef.current = createMatchState(size);
    setHud({
      health: 100,
      alive: BOT_COUNT,
      zone: ZONE_START_RADIUS,
      weapon: WEAPONS.pistol.name,
      ammo: 24,
      crates: LOOT_COUNT,
      vehicle: null,
      speed: 0,
      airdrop: false,
      swimming: false,
      deployPhase: "plane",
      altitude: DEPLOY_PLANE_ALTITUDE,
      squad: [],
      status: "running",
    });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc4e8);
    scene.fog = new THREE.Fog(0x9fc4e8, 140, 700);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x3a6b35, 1.1));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.2);
    sun.position.set(30, 50, 20);
    scene.add(sun);

    const water = createWater();
    scene.add(water.mesh);
    scene.add(createTerrain());
    scene.add(createRocks());
    scene.add(createRuins());
    const forest = createForest();
    scene.add(forest.group);
    scene.add(createCheckpoints());
    scene.add(createBuildings());

    const dustCount = 500;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions[i * 3] = (Math.random() * 2 - 1) * 160;
      dustPositions[i * 3 + 1] = Math.random() * 14 + 1;
      dustPositions[i * 3 + 2] = (Math.random() * 2 - 1) * 160;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0xd8cbb0, size: 0.35, transparent: true, opacity: 0.5 }),
    );
    scene.add(dust);

    const zoneRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }),
    );
    zoneRing.rotation.x = -Math.PI / 2;
    scene.add(zoneRing);

    const playerMesh = makeSoldier(0x22c55e);
    scene.add(playerMesh);
    const botMeshes = Array.from({ length: BOT_COUNT }, (_, index) => {
      const variant = index % 3 === 0 ? "ghillie" : index % 3 === 1 ? "desert" : "woodland";
      const bot = makeSoldier(0xb4543b, variant);
      scene.add(bot);
      return bot;
    });
    const squadMeshes = Array.from({ length: 4 }, (_, index) => {
      const mate = makeSoldier(0x16a34a, index % 2 === 0 ? "woodland" : "desert");
      scene.add(mate);
      return mate;
    });
    const vehicleMeshes = Array.from({ length: 3 }, (_, index) => {
      const kinds: VehicleKind[] = ["uaz", "pickup", "buggy"];
      const mesh = makeVehicleMesh(kinds[index]);
      scene.add(mesh);
      return mesh;
    });

    const planeMesh = makePlaneMesh();
    scene.add(planeMesh);
    const deployPlane = makePlaneMesh();
    scene.add(deployPlane);

    const playerChute = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.6, 8, 1, true),
      new THREE.MeshLambertMaterial({ color: 0x22c55e, side: THREE.DoubleSide }),
    );
    scene.add(playerChute);

    const airdropCrate = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xf59e0b }),
    );
    const parachute = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 1.8, 8, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide }),
    );
    parachute.position.y = 3;
    const airdropGroup = new THREE.Group();
    airdropGroup.add(airdropCrate, parachute);
    scene.add(airdropGroup);
    const lootMeshes = Array.from({ length: LOOT_COUNT + BUILDING_POSITIONS.length }, (_, index) => {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshLambertMaterial({ color: LOOT_COLORS[lootWeaponForIndex(index)] }),
      );
      crate.position.y = 0.5;
      scene.add(crate);
      return crate;
    });

    const resize = () => {
      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 420;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let last = performance.now();
    let hudTimer = 0;
    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const keys = keysRef.current;
      const input = {
        forward:
          (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
        turn:
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0) -
          (keys.has("d") || keys.has("arrowright") ? 1 : 0),
        enter: enterRef.current,
        drop: dropRef.current,
        revive: reviveRef.current,
      };
      let state = stateRef.current;
      if (state && state.status === "running") {
        state = stepMatch(state, dt, input);
        if (shootRef.current) {
          state = shoot(state).state;
          shootRef.current = false;
        }
        stateRef.current = state;
      }
      enterRef.current = false;
      dropRef.current = false;
      const current = state;
      if (current) {
        const deployment = current.deployment;
        let playerY = terrainHeight(current.player.x, current.player.z);
        if (deployment.phase === "plane") {
          playerY = DEPLOY_PLANE_ALTITUDE;
        } else if (deployment.phase === "falling") {
          playerY = terrainHeight(current.player.x, current.player.z) + deployment.altitude;
        } else if (isSwimming(current.player.x, current.player.z)) {
          playerY = -0.5;
        }
        playerMesh.position.set(
          current.player.x,
          playerY,
          current.player.z,
        );
        playerMesh.rotation.y = current.player.angle;
        playerMesh.visible = current.status !== "lost" && deployment.phase !== "plane";
        playerChute.visible = deployment.phase === "falling" && deployment.chute;
        playerChute.position.set(current.player.x, playerY + 2.6, current.player.z);
        squadMeshes.forEach((mesh, index) => {
          const mate = current.squad[index];
          const showMate = Boolean(
            mate && mate.state !== "out" && current.deployment.phase === "landed",
          );
          mesh.visible = showMate;
          if (showMate && mate) {
            const mateY = isSwimming(mate.x, mate.z) ? -0.5 : terrainHeight(mate.x, mate.z);
            mesh.position.set(mate.x, mateY, mate.z);
            mesh.rotation.y = mate.angle;
            mesh.rotation.z = mate.state === "downed" ? Math.PI / 2.2 : 0;
          }
        });
        deployPlane.visible = deployment.phase === "plane";
        if (deployPlane.visible) {
          deployPlane.position.set(
            deployment.plane.x,
            DEPLOY_PLANE_ALTITUDE,
            deployment.plane.z,
          );
          deployPlane.rotation.y = deployment.plane.angle;
        }
        botMeshes.forEach((mesh, index) => {
          const bot = current.bots[index];
          mesh.visible = Boolean(bot?.alive);
          if (bot) {
            mesh.position.set(bot.x, terrainHeight(bot.x, bot.z), bot.z);
            mesh.rotation.y = bot.angle;
          }
        });
        lootMeshes.forEach((mesh, index) => {
          const crate = current.loot[index];
          mesh.visible = Boolean(crate && !crate.taken);
          if (crate && !crate.taken) {
            mesh.position.set(crate.x, terrainHeight(crate.x, crate.z) + 0.5, crate.z);
            mesh.rotation.y = now / 600;
          }
        });
        vehicleMeshes.forEach((mesh, index) => {
          const vehicle = current.vehicles[index];
          if (!vehicle) {
            return;
          }
          mesh.position.set(vehicle.x, terrainHeight(vehicle.x, vehicle.z), vehicle.z);
          mesh.rotation.y = vehicle.angle;
          mesh.rotation.x = Math.max(-0.08, Math.min(0.08, vehicle.speed * 0.004));
        });
        planeMesh.position.set(
          current.airdrop.plane.x,
          current.airdrop.plane.altitude,
          current.airdrop.plane.z,
        );
        planeMesh.rotation.y = current.airdrop.plane.angle;
        planeMesh.visible = true;
        const drop = current.airdrop.crate;
        airdropGroup.visible = Boolean(drop && !drop.taken);
        if (drop && !drop.taken) {
          airdropGroup.position.set(
            drop.x,
            terrainHeight(drop.x, drop.z) + drop.altitude + 0.7,
            drop.z,
          );
          parachute.visible = !drop.landed;
          airdropCrate.rotation.y = now / 800;
        }
        zoneRing.position.set(current.zone.x, 0.05, current.zone.z);
        zoneRing.scale.setScalar(current.zone.radius);
        camera.position.set(
          current.player.x - Math.sin(current.player.angle) * 22,
          playerY + (deployment.phase === "landed" ? 13 : 9),
          current.player.z - Math.cos(current.player.angle) * 22,
        );
        camera.lookAt(
          current.player.x,
          playerY + 1,
          current.player.z,
        );
      } else {
        const orbit = now / 5000;
        camera.position.set(Math.sin(orbit) * 190, 70, Math.cos(orbit) * 190);
        camera.lookAt(0, 0, 0);
        planeMesh.visible = false;
        airdropGroup.visible = false;
        deployPlane.visible = false;
        playerChute.visible = false;
        squadMeshes.forEach((mesh) => {
          mesh.visible = false;
        });
      }
      forest.update(now / 1000, camera);
      dust.rotation.y = now * 0.004;
      water.update(now / 1000);
      renderer.render(scene, camera);
      hudTimer += dt;
      if (current && hudTimer > 0.1) {
        hudTimer = 0;
        setHud({
          health: Math.max(0, Math.round(current.player.health)),
          alive: current.bots.filter((bot) => bot.alive).length,
          zone: Math.round(current.zone.radius),
          weapon: WEAPONS[current.weapon].name,
          ammo: current.ammo[current.weapon],
          crates: current.loot.filter((crate) => !crate.taken).length,
          vehicle:
            current.playerVehicle >= 0
              ? VEHICLE_SPECS[current.vehicles[current.playerVehicle].kind].name
              : null,
          speed:
            current.playerVehicle >= 0
              ? Math.round(Math.abs(current.vehicles[current.playerVehicle].speed))
              : 0,
          airdrop: Boolean(current.airdrop.crate && !current.airdrop.crate.taken),
          swimming: isSwimming(current.player.x, current.player.z),
          deployPhase: current.deployment.phase,
          altitude: Math.round(current.deployment.altitude),
          squad: current.squad.map((mate) => ({ ...mate })),
          status: current.status,
        });
      }
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const movementKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "];
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (movementKeys.includes(key)) {
        event.preventDefault();
      }
      if (key === " ") {
        shootRef.current = true;
      }
      if (key === "e") {
        enterRef.current = true;
      }
      if (key === "f") {
        dropRef.current = true;
      }
      if (key === "r") {
        reviveRef.current = true;
      }
      keysRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
      if (event.key.toLowerCase() === "r") {
        reviveRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const holdKey = (key: string) => (active: boolean) => {
    if (active) {
      keysRef.current.add(key);
    } else {
      keysRef.current.delete(key);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 shadow-soft">
        <div ref={mountRef} className="h-[320px] w-full sm:h-[440px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="w-36 space-y-1">
            <p className="text-xs font-medium text-white drop-shadow">الصحة: {hud.health}</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  "h-full transition-all",
                  hud.health > 40 ? "bg-emerald-500" : "bg-rose-500",
                )}
                style={{ width: `${hud.health}%` }}
              />
            </div>
            {hud.squad.map((mate, index) => (
              <div key={index} className="space-y-0.5">
                <p className="text-[10px] font-medium text-white drop-shadow">
                  رفيق {index + 1}:{" "}
                  {mate.state === "downed"
                    ? "ساقط 🩸"
                    : mate.state === "out"
                      ? "خارج القتال"
                      : `${Math.round(mate.health)}%`}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cn(
                      "h-full",
                      mate.state === "downed" ? "bg-amber-500" : "bg-emerald-500",
                    )}
                    style={{
                      width: `${Math.max(0, Math.min(100, mate.health))}%`,
                    }}
                  />
                </div>
                {mate.state === "downed" ? (
                  <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${(mate.reviveProgress / 5) * 100}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Badge className="bg-slate-900/80 text-white">أحياء: {hud.alive}</Badge>
            <Badge className="bg-slate-900/80 text-white">المنطقة: {hud.zone}م</Badge>
            {hud.airdrop ? (
              <Badge className="bg-amber-600/90 text-white">📦 إسقاط جوي!</Badge>
            ) : null}
            {hud.swimming ? (
              <Badge className="bg-cyan-700/90 text-white">🏊 سباحة</Badge>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
          <Badge className="bg-slate-900/80 text-white">
            {hud.weapon}: {hud.ammo} ذخيرة
          </Badge>
          <Badge className="mx-2 bg-slate-900/80 text-white">صناديق: {hud.crates}</Badge>
          {hud.vehicle ? (
            <Badge className="bg-emerald-900/80 text-white">
              🚙 {hud.vehicle} — {hud.speed} م/ث
            </Badge>
          ) : null}
        </div>
        {hud.status !== "running" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/70 p-6 text-center backdrop-blur-sm">
            {hud.status === "idle" ? (
              <>
                <p className="text-2xl font-bold text-white">باتل رويال 3D 🏝️</p>
                <p className="max-w-sm text-sm text-slate-300">
                  انزل إلى الجزيرة، أقصِ كل الأعداء، وابقَ داخل المنطقة الآمنة قبل أن تنكمش!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SQUAD_SIZES.map((size) => (
                    <Button
                      key={size}
                      variant={size === squadSize ? "default" : "outline"}
                      onClick={() => setSquadSize(size)}
                    >
                      {size === 1 ? "منفرد" : size === 2 ? "ثنائي" : size === 3 ? "ثلاثي" : "فرقة 5"}
                    </Button>
                  ))}
                </div>
                <Button size="lg" onClick={() => start(squadSize)}>
                  <Play />
                  ابدأ المعركة
                </Button>
              </>
            ) : null}
            {hud.status === "won" ? (
              <>
                <p className="text-2xl font-bold text-white">الفوز! 🏆</p>
                <Button size="lg" onClick={() => start(squadSize)}>
                  <RotateCcw />
                  جولة جديدة
                </Button>
              </>
            ) : null}
            {hud.status === "lost" ? (
              <>
                <p className="text-2xl font-bold text-white">تمت إقصاؤك 💀</p>
                <Button size="lg" onClick={() => start(squadSize)}>
                  <RotateCcw />
                  حاول مرة أخرى
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {hud.deployPhase !== "landed" ? (
          <Button onClick={() => (dropRef.current = true)}>
            🪂 القفز (F) — {hud.altitude}م
          </Button>
        ) : null}
        <Button onClick={() => (shootRef.current = true)}>
          <Crosshair />
          إطلاق النار (مسافة)
        </Button>
        <Button variant="outline" onClick={() => (enterRef.current = true)}>
          🚙 ركوب/نزول (E)
        </Button>
        {hud.squad.some((mate) => mate.state === "downed") ? (
          <HoldButton label="إسعاف (R)" onHold={(active) => (reviveRef.current = active)} />
        ) : null}
        <div dir="ltr" className="flex items-center gap-1.5">
          <HoldButton label="◀" onHold={holdKey("a")} />
          <div className="flex flex-col gap-1.5">
            <HoldButton label="▲" onHold={holdKey("w")} />
            <HoldButton label="▼" onHold={holdKey("s")} />
          </div>
          <HoldButton label="▶" onHold={holdKey("d")} />
        </div>
      </div>
    </div>
  );
}