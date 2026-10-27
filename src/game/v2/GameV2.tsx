import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ENEMY_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  SPRINT_SPEED,
  WALK_SPEED,
  angleLerp,
  chaseStep,
  moveDirection,
  pushOutOfObstacles,
} from "./logic";
import { Actor, SoldierFactory, type SoldierLoadStatus } from "./actor";
import { PLAY_RADIUS, buildIsland } from "./world";

type Hud = {
  health: number;
  ammo: number;
  reserve: number;
  reloading: boolean;
  enemies: number;
  clip: string | null;
  posX: number;
  posZ: number;
  moving: boolean;
  status: "running" | "won" | "lost";
};

const INITIAL_HUD: Hud = {
  health: 100,
  ammo: 30,
  reserve: 90,
  reloading: false,
  enemies: 3,
  clip: null,
  posX: 0,
  posZ: 0,
  moving: false,
  status: "running",
};

const ENEMY_COUNT = 3;
const MAG_SIZE = 30;
const RELOAD_TIME = 1.2;
const FIRE_COOLDOWN = 0.22;
const ENEMY_DAMAGE_PER_SECOND = 12;
const ENEMY_HEALTH = 100;
const BULLET_DAMAGE = 34;

const CLIP_LABELS: Record<string, string> = {
  Idle: "وقوف",
  Walk: "مشي",
  Run: "جري",
};

type EnemyState = {
  root: THREE.Group;
  actor: Actor | null;
  x: number;
  z: number;
  health: number;
  alive: boolean;
};

export default function GameV2() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [assetStatus, setAssetStatus] = useState<SoldierLoadStatus>({
    state: "loading",
  });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc4e8);
    scene.fog = new THREE.Fog(0x9fc4e8, 60, 260);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a6b35, 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
    sun.position.set(30, 50, 20);
    scene.add(sun);

    const island = buildIsland();
    scene.add(island.group);

    // --- actors: real GLB soldier, skeleton-sharing clones ---
    const factory = new SoldierFactory();
    void factory.load().then((status) => {
      if (!disposed) {
        setAssetStatus(status);
      }
    });

    const playerRoot = new THREE.Group();
    scene.add(playerRoot);
    let playerActor: Actor | null = null;

    const enemyState: EnemyState[] = [];
    for (let i = 0; i < ENEMY_COUNT; i += 1) {
      const root = new THREE.Group();
      root.userData.enemyId = i;
      const a = (i / ENEMY_COUNT) * Math.PI * 2;
      const x = Math.cos(a) * 26;
      const z = Math.sin(a) * 26;
      root.position.set(x, 0, z);
      scene.add(root);
      enemyState.push({ root, actor: null, x, z, health: ENEMY_HEALTH, alive: true });
    }

    void factory.load().then((status) => {
      if (disposed || status.state !== "ready") {
        return;
      }
      playerActor = factory.create();
      if (playerActor) {
        playerRoot.add(playerActor.group);
      }
      for (const enemy of enemyState) {
        enemy.actor = factory.create();
        if (enemy.actor) {
          enemy.root.add(enemy.actor.group);
        }
      }
    });

    // --- input & mutable game state ---
    const keys = new Set<string>();
    const state = {
      px: 0,
      pz: 0,
      py: 0,
      vy: 0,
      grounded: true,
      yaw: 0,
      pitch: 0.35,
      modelYaw: 0,
      moving: false,
      health: 100,
      ammo: MAG_SIZE,
      reserve: 90,
      reloadTimer: 0,
      fireCooldown: 0,
      status: "running" as Hud["status"],
    };
    let pointerLocked = false;
    const tracers: { line: THREE.Line; life: number }[] = [];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
      }
      keys.add(event.code);
      if (event.code === "KeyR" && state.status === "running") {
        startReload();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!pointerLocked) {
        return;
      }
      state.yaw -= event.movementX * 0.0025;
      state.pitch = Math.max(0.05, Math.min(0.9, state.pitch + event.movementY * 0.002));
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0 && pointerLocked && state.status === "running") {
        shoot();
      }
    };
    const onCanvasClick = () => {
      if (!pointerLocked) {
        const request = renderer.domElement.requestPointerLock() as Promise<void> | undefined;
        if (request && typeof request.catch === "function") {
          request.catch(() => undefined);
        }
      }
    };
    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === renderer.domElement;
    };
    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    renderer.domElement.addEventListener("click", onCanvasClick);
    window.addEventListener("resize", onResize);

    function startReload(): void {
      if (state.reloadTimer <= 0 && state.reserve > 0 && state.ammo < MAG_SIZE) {
        state.reloadTimer = RELOAD_TIME;
      }
    }

    function spawnTracer(origin: THREE.Vector3, end: THREE.Vector3): void {
      const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
      const material = new THREE.LineBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.9,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      tracers.push({ line, life: 0.09 });
    }

    function shoot(): void {
      if (state.fireCooldown > 0 || state.reloadTimer > 0) {
        return;
      }
      if (state.ammo <= 0) {
        startReload();
        return;
      }
      state.ammo -= 1;
      state.fireCooldown = FIRE_COOLDOWN;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const targets = enemyState.filter((enemy) => enemy.alive).map((enemy) => enemy.root);
      const hits = raycaster.intersectObjects(targets, true);
      const origin = new THREE.Vector3(state.px, state.py + 1.4, state.pz);
      const end = origin
        .clone()
        .add(raycaster.ray.direction.clone().multiplyScalar(120));
      if (hits.length > 0) {
        end.copy(hits[0].point);
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && obj.userData.enemyId === undefined) {
          obj = obj.parent;
        }
        if (obj) {
          const enemy = enemyState[obj.userData.enemyId as number];
          enemy.health -= BULLET_DAMAGE;
          if (enemy.health <= 0) {
            enemy.alive = false;
            scene.remove(enemy.root);
          }
        }
      }
      spawnTracer(origin, end);
    }

    const clock = new THREE.Clock();
    let raf = 0;
    let hudTimer = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (state.status === "running") {
        const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
        const s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
        const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
        const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
        const dir = moveDirection(f, s, state.yaw);
        state.moving = f !== 0 || s !== 0;
        if (state.moving) {
          state.px += dir.x * speed * dt;
          state.pz += dir.z * speed * dt;
          state.modelYaw = angleLerp(
            state.modelYaw,
            Math.atan2(dir.x, dir.z),
            dt * 10,
          );
        }
        const dist = Math.hypot(state.px, state.pz);
        if (dist > PLAY_RADIUS) {
          state.px *= PLAY_RADIUS / dist;
          state.pz *= PLAY_RADIUS / dist;
        }
        const pushed = pushOutOfObstacles(state.px, state.pz, island.obstacles);
        state.px = pushed.x;
        state.pz = pushed.z;

        if (keys.has("Space") && state.grounded) {
          state.vy = JUMP_VELOCITY;
          state.grounded = false;
        }
        if (!state.grounded) {
          state.vy -= GRAVITY * dt;
          state.py += state.vy * dt;
          if (state.py <= 0) {
            state.py = 0;
            state.vy = 0;
            state.grounded = true;
          }
        }
        const speed01 = state.moving ? speed / SPRINT_SPEED : 0;

        if (state.reloadTimer > 0) {
          state.reloadTimer -= dt;
          if (state.reloadTimer <= 0) {
            const take = Math.min(MAG_SIZE - state.ammo, state.reserve);
            state.ammo += take;
            state.reserve -= take;
          }
        }
        if (state.fireCooldown > 0) {
          state.fireCooldown -= dt;
        }

        let aliveCount = 0;
        for (const enemy of enemyState) {
          if (!enemy.alive) {
            continue;
          }
          aliveCount += 1;
          const step = chaseStep(
            enemy.x,
            enemy.z,
            state.px,
            state.pz,
            ENEMY_SPEED,
            dt,
            1.4,
          );
          enemy.x = step.x;
          enemy.z = step.z;
          enemy.root.position.set(enemy.x, 0, enemy.z);
          enemy.root.rotation.y = Math.atan2(state.px - enemy.x, state.pz - enemy.z);
          enemy.actor?.updateTowards(
            { speed01: step.moving ? 0.5 : 0, grounded: true },
            dt,
          );
          if (step.dist < 1.7) {
            state.health -= ENEMY_DAMAGE_PER_SECOND * dt;
          }
        }
        if (state.health <= 0) {
          state.health = 0;
          state.status = "lost";
        } else if (aliveCount === 0) {
          state.status = "won";
        }

        playerRoot.position.set(state.px, state.py, state.pz);
        playerRoot.rotation.y = state.modelYaw;
        playerActor?.updateTowards({ speed01, grounded: state.grounded }, dt);

        if (state.status !== "running" && document.pointerLockElement) {
          document.exitPointerLock();
        }
      }

      const camDist = 5.5;
      const camHeight = 1.6 + state.pitch * 3.2;
      camera.position.set(
        state.px + Math.sin(state.yaw) * camDist,
        state.py + camHeight,
        state.pz + Math.cos(state.yaw) * camDist,
      );
      camera.lookAt(state.px, state.py + 1.4 - state.pitch * 1.2, state.pz);

      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        const tracer = tracers[i];
        tracer.life -= dt;
        const material = tracer.line.material as THREE.LineBasicMaterial;
        material.opacity = Math.max(0, tracer.life / 0.09);
        if (tracer.life <= 0) {
          scene.remove(tracer.line);
          tracer.line.geometry.dispose();
          material.dispose();
          tracers.splice(i, 1);
        }
      }

      renderer.render(scene, camera);

      hudTimer += dt;
      if (hudTimer > 0.15) {
        hudTimer = 0;
        setHud({
          health: Math.max(0, Math.round(state.health)),
          ammo: state.ammo,
          reserve: state.reserve,
          reloading: state.reloadTimer > 0,
          enemies: enemyState.filter((enemy) => enemy.alive).length,
          clip: playerActor?.currentClip ?? null,
          posX: Math.round(state.px * 10) / 10,
          posZ: Math.round(state.pz * 10) / 10,
          moving: state.moving,
          status: state.status,
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      window.removeEventListener("resize", onResize);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [runId]);

  return (
    <div className="space-y-3">
      <div
        ref={mountRef}
        className="relative h-[70vh] min-h-[420px] w-full cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
      >
        {/* crosshair */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="h-5 w-5 rounded-full border-2 border-white/70" />
        </div>
        {/* top HUD */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-slate-950/80 px-2 py-1 font-bold text-emerald-300">
            ❤️ {hud.health}
          </span>
          <span className="rounded bg-slate-950/80 px-2 py-1 text-amber-200">
            🔫 {hud.reloading ? "جارٍ التلقيم…" : `${hud.ammo} / ${hud.reserve}`}
          </span>
          <span className="rounded bg-slate-950/80 px-2 py-1 text-rose-200">
            👥 أعداء: {hud.enemies}
          </span>
          <span className="rounded bg-slate-950/80 px-2 py-1 text-sky-200">
            🎬 الحركة: {hud.clip ? CLIP_LABELS[hud.clip] ?? hud.clip : "—"}
          </span>
          <span className="rounded bg-slate-950/80 px-2 py-1 text-slate-200">
            📍 {hud.posX}، {hud.posZ} — يتحرك: {hud.moving ? "نعم" : "لا"}
          </span>
        </div>
        {/* model status badge — honest, never a fake success */}
        <div className="pointer-events-none absolute left-3 top-14 z-10 max-w-64 text-[10px]">
          {assetStatus.state === "loading" ? (
            <span className="rounded bg-slate-950/80 px-2 py-1 text-slate-300">
              ⏳ جارٍ تحميل نموذج الجندي GLB…
            </span>
          ) : assetStatus.state === "ready" ? (
            <span className="rounded bg-emerald-950/85 px-2 py-1 text-emerald-200">
              ✅ نموذج بشري حقيقي: {assetStatus.meshes} meshes، {assetStatus.bones} عظمة —
              المقاطع: {assetStatus.clips.join("، ")}
            </span>
          ) : (
            <span className="rounded bg-rose-950/90 px-2 py-1 leading-snug text-rose-100">
              ❌ فشل تحميل النموذج: {assetStatus.error} — تحقق من الشبكة وأعد تحميل الصفحة
            </span>
          )}
        </div>
        {/* end-of-round overlay */}
        {hud.status !== "running" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold text-white">
              {hud.status === "won" ? "فوز! أُقصي كل الأعداء 🏆" : "تمت إقصاؤك 💀"}
            </p>
            <Button size="lg" onClick={() => setRunId((value) => value + 1)}>
              <RotateCcw />
              جولة جديدة
            </Button>
          </div>
        ) : null}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        اضغط على المشهد لتفعيل الماوس — W/A/S/D للحركة، Shift للجري، مسافة للقفز، زر الماوس
        الأيسر للإطلاق، R للتلقيم.
      </p>
    </div>
  );
}