import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Crosshair, Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BOT_COUNT,
  ZONE_START_RADIUS,
  createMatchState,
  shoot,
  stepMatch,
  type MatchState,
  type MatchStatus,
} from "@/lib/game/battleRoyale";

type Hud = { health: number; alive: number; zone: number; status: MatchStatus };

function makeSoldier(color: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.9;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshLambertMaterial({ color: 0xf1c27d }),
  );
  head.position.y = 1.7;
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 1),
    new THREE.MeshLambertMaterial({ color: 0x1f2937 }),
  );
  gun.position.set(0.3, 1.1, 0.5);
  group.add(body, head, gun);
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

export default function BattleRoyale3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<MatchState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const shootRef = useRef(false);
  const [hud, setHud] = useState<Hud>({
    health: 100,
    alive: BOT_COUNT,
    zone: ZONE_START_RADIUS,
    status: "idle",
  });

  const start = useCallback(() => {
    stateRef.current = createMatchState();
    setHud({ health: 100, alive: BOT_COUNT, zone: ZONE_START_RADIUS, status: "running" });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 70, 180);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a6b35, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(30, 50, 20);
    scene.add(sun);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshLambertMaterial({ color: 0x1d6fa5 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.6;
    scene.add(water);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(40, 46, 5, 48),
      new THREE.MeshLambertMaterial({ color: 0xd9b26f }),
    );
    island.position.y = -2.5;
    scene.add(island);
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(40, 48),
      new THREE.MeshLambertMaterial({ color: 0x4d8f4d }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.01;
    scene.add(grass);

    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2;
      const radius = 12 + (i % 4) * 7;
      const tree = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 4, 6),
        new THREE.MeshLambertMaterial({ color: 0x2f6b34 }),
      );
      tree.position.set(Math.cos(angle) * radius, 2, Math.sin(angle) * radius);
      scene.add(tree);
    }

    const zoneRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }),
    );
    zoneRing.rotation.x = -Math.PI / 2;
    scene.add(zoneRing);

    const playerMesh = makeSoldier(0x22c55e);
    scene.add(playerMesh);
    const botMeshes = Array.from({ length: BOT_COUNT }, () => {
      const bot = makeSoldier(0xef4444);
      scene.add(bot);
      return bot;
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
      const current = state;
      if (current) {
        playerMesh.position.set(current.player.x, 0, current.player.z);
        playerMesh.rotation.y = current.player.angle;
        playerMesh.visible = current.status !== "lost";
        botMeshes.forEach((mesh, index) => {
          const bot = current.bots[index];
          mesh.visible = Boolean(bot?.alive);
          if (bot) {
            mesh.position.set(bot.x, 0, bot.z);
            mesh.rotation.y = bot.angle;
          }
        });
        zoneRing.position.set(current.zone.x, 0.05, current.zone.z);
        zoneRing.scale.setScalar(current.zone.radius);
        camera.position.set(
          current.player.x - Math.sin(current.player.angle) * 13,
          8,
          current.player.z - Math.cos(current.player.angle) * 13,
        );
        camera.lookAt(current.player.x, 1, current.player.z);
      } else {
        const orbit = now / 5000;
        camera.position.set(Math.sin(orbit) * 55, 26, Math.cos(orbit) * 55);
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
      hudTimer += dt;
      if (current && hudTimer > 0.1) {
        hudTimer = 0;
        setHud({
          health: Math.max(0, Math.round(current.player.health)),
          alive: current.bots.filter((bot) => bot.alive).length,
          zone: Math.round(current.zone.radius),
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
      keysRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
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
          </div>
          <div className="flex gap-2">
            <Badge className="bg-slate-900/80 text-white">أحياء: {hud.alive}</Badge>
            <Badge className="bg-slate-900/80 text-white">المنطقة: {hud.zone}م</Badge>
          </div>
        </div>
        {hud.status !== "running" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/70 p-6 text-center backdrop-blur-sm">
            {hud.status === "idle" ? (
              <>
                <p className="text-2xl font-bold text-white">باتل رويال 3D 🏝️</p>
                <p className="max-w-sm text-sm text-slate-300">
                  انزل إلى الجزيرة، أقصِ كل الأعداء، وابقَ داخل المنطقة الآمنة قبل أن تنكمش!
                </p>
                <Button size="lg" onClick={start}>
                  <Play />
                  ابدأ المعركة
                </Button>
              </>
            ) : null}
            {hud.status === "won" ? (
              <>
                <p className="text-2xl font-bold text-white">الفوز! 🏆</p>
                <Button size="lg" onClick={start}>
                  <RotateCcw />
                  جولة جديدة
                </Button>
              </>
            ) : null}
            {hud.status === "lost" ? (
              <>
                <p className="text-2xl font-bold text-white">تمت إقصاؤك 💀</p>
                <Button size="lg" onClick={start}>
                  <RotateCcw />
                  حاول مرة أخرى
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button onClick={() => (shootRef.current = true)}>
          <Crosshair />
          إطلاق النار (مسافة)
        </Button>
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