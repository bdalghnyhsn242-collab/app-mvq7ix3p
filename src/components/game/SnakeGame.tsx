import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  Apple,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GRID_SIZE,
  createInitialState,
  intervalForScore,
  step,
  turn,
  type Difficulty,
  type Direction,
  type GameStatus,
  type SnakeState,
} from "@/lib/game/snake";

const CELL = 26;
const BOARD_PX = GRID_SIZE * CELL;

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

const BEST_SCORE_KEY = "snake-best-score";
const SOUND_ENABLED_KEY = "snake-sound-enabled";

type SoundKind = "eat" | "over";

function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled) {
    return;
  }
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    const audio = new AudioContextCtor();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = kind === "eat" ? 660 : 160;
    gain.gain.setValueAtTime(0.05, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + (kind === "eat" ? 0.12 : 0.45),
    );
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + (kind === "eat" ? 0.12 : 0.45));
    oscillator.onended = () => void audio.close();
  } catch {
    return;
  }
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

type DirectionButtonProps = {
  direction: Direction;
  onPress: (direction: Direction) => void;
  children: ReactNode;
};

function DirectionButton({ direction, onPress, children }: DirectionButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-11 w-11"
      onClick={() => onPress(direction)}
      aria-label={`تحريك ${direction}`}
    >
      {children}
    </Button>
  );
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SnakeState>(createInitialState());
  const statusRef = useRef<GameStatus>("idle");
  const soundRef = useRef(false);
  const bestScoreRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const difficultyRef = useRef<Difficulty>("medium");

  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [bestScore, setBestScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  useEffect(() => {
    const storedBest = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? "0");
    if (Number.isFinite(storedBest) && storedBest > 0) {
      setBestScore(storedBest);
    }
    setSoundEnabled(window.localStorage.getItem(SOUND_ENABLED_KEY) === "true");
  }, []);

  const applyStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const targetSize = BOARD_PX * dpr;
    if (canvas.width !== targetSize) {
      canvas.width = targetSize;
      canvas.height = targetSize;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, BOARD_PX, BOARD_PX);

    context.fillStyle = "rgba(148, 163, 184, 0.08)";
    for (let x = 0; x < GRID_SIZE; x += 1) {
      for (let y = 0; y < GRID_SIZE; y += 1) {
        if ((x + y) % 2 === 0) {
          context.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    const state = stateRef.current;
    const foodCenterX = state.food.x * CELL + CELL / 2;
    const foodCenterY = state.food.y * CELL + CELL / 2;
    const pulse = 1 + Math.sin(time / 180) * 0.08;
    const glow = context.createRadialGradient(
      foodCenterX,
      foodCenterY,
      2,
      foodCenterX,
      foodCenterY,
      CELL * 1.4,
    );
    glow.addColorStop(0, "rgba(248, 113, 113, 0.45)");
    glow.addColorStop(1, "rgba(248, 113, 113, 0)");
    context.fillStyle = glow;
    context.fillRect(state.food.x * CELL - CELL, state.food.y * CELL - CELL, CELL * 3, CELL * 3);
    context.fillStyle = "#f87171";
    context.beginPath();
    context.arc(foodCenterX, foodCenterY, (CELL / 2 - 4) * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 255, 255, 0.55)";
    context.beginPath();
    context.arc(foodCenterX - 3, foodCenterY - 4, 2.2, 0, Math.PI * 2);
    context.fill();

    state.snake.forEach((segment, index) => {
      const tailRatio = index / Math.max(state.snake.length - 1, 1);
      const red = Math.round(56 + tailRatio * 26);
      const green = Math.round(189 - tailRatio * 84);
      const blue = Math.round(148 - tailRatio * 63);
      context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      const padding = index === 0 ? 1.5 : 2.5;
      drawRoundRect(
        context,
        segment.x * CELL + padding,
        segment.y * CELL + padding,
        CELL - padding * 2,
        CELL - padding * 2,
        7,
      );
      context.fill();
    });

    const head = state.snake[0];
    const headCenterX = head.x * CELL + CELL / 2;
    const headCenterY = head.y * CELL + CELL / 2;
    const forwardX = state.direction === "left" ? -1 : state.direction === "right" ? 1 : 0;
    const forwardY = state.direction === "up" ? -1 : state.direction === "down" ? 1 : 0;
    const sideX = -forwardY;
    const sideY = forwardX;
    context.fillStyle = "#052e16";
    for (const sign of [-1, 1]) {
      context.beginPath();
      context.arc(
        headCenterX + forwardX * CELL * 0.16 + sideX * CELL * 0.2 * sign,
        headCenterY + forwardY * CELL * 0.16 + sideY * CELL * 0.2 * sign,
        2.4,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      applyStatus("gameover");
      playSound("over", soundRef.current);
      const previousBest = bestScoreRef.current;
      if (finalScore > previousBest) {
        window.localStorage.setItem(BEST_SCORE_KEY, String(finalScore));
        setBestScore(finalScore);
        setIsNewRecord(previousBest > 0);
      }
    },
    [applyStatus],
  );

  const startGame = useCallback(() => {
    stateRef.current = createInitialState();
    setScore(0);
    setIsNewRecord(false);
    applyStatus("running");
  }, [applyStatus]);

  const togglePause = useCallback(() => {
    if (statusRef.current === "running") {
      applyStatus("paused");
    } else if (statusRef.current === "paused") {
      applyStatus("running");
    }
  }, [applyStatus]);

  const handleTurn = useCallback(
    (direction: Direction) => {
      if (statusRef.current === "idle" || statusRef.current === "gameover") {
        startGame();
      }
      if (statusRef.current !== "running") {
        return;
      }
      stateRef.current = turn(stateRef.current, direction);
    },
    [startGame],
  );

  useEffect(() => {
    if (status !== "running") {
      draw(performance.now());
      return;
    }
    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop);
      accumulator += now - last;
      last = now;
      for (let ticks = 0; ticks < 4; ticks += 1) {
        const interval = intervalForScore(stateRef.current.score, difficultyRef.current);
        if (accumulator < interval) {
          break;
        }
        accumulator -= interval;
        const result = step(stateRef.current);
        stateRef.current = result.state;
        if (result.ate) {
          setScore(result.state.score);
          playSound("eat", soundRef.current);
        }
        if (result.gameOver) {
          window.cancelAnimationFrame(frame);
          handleGameOver(result.state.score);
          return;
        }
      }
      draw(now);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [status, draw, handleGameOver]);

  useEffect(() => {
    const directionByKey: Record<string, Direction> = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key in directionByKey) {
        event.preventDefault();
        handleTurn(directionByKey[key]);
        return;
      }
      if (key === " ") {
        event.preventDefault();
        if (statusRef.current === "idle" || statusRef.current === "gameover") {
          startGame();
        } else {
          togglePause();
        }
        return;
      }
      if (key === "enter" && statusRef.current === "gameover") {
        event.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTurn, startGame, togglePause]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && statusRef.current === "running") {
        applyStatus("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [applyStatus]);

  const toggleSound = () => {
    setSoundEnabled((previous) => {
      const next = !previous;
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    });
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) {
      return;
    }
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    touchStartRef.current = null;
    if (Math.abs(deltaX) < 24 && Math.abs(deltaY) < 24) {
      return;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      handleTurn(deltaX > 0 ? "right" : "left");
    } else {
      handleTurn(deltaY > 0 ? "down" : "up");
    }
  };

  const isRunning = status === "running";

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
            <Apple className="h-3.5 w-3.5 text-rose-500" />
            النقاط: {score}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            الأفضل: {bestScore}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                disabled={status === "running" || status === "paused"}
                onClick={() => setDifficulty(level)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
                  difficulty === level
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {DIFFICULTY_LABELS[level]}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            aria-label={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={togglePause}
            disabled={!isRunning && status !== "paused"}
            aria-label={isRunning ? "إيقاف مؤقت" : "متابعة"}
          >
            {isRunning ? <Pause /> : <Play />}
          </Button>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 shadow-soft"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto w-full touch-none select-none"
          style={{ maxWidth: BOARD_PX }}
        />
        {status !== "running" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/75 p-6 text-center backdrop-blur-sm">
            {status === "idle" ? (
              <>
                <p className="text-2xl font-bold text-white">لعبة الثعبان 🐍</p>
                <p className="max-w-xs text-sm text-slate-300">
                  اجمع التفاحات الحمراء وتجنّب الجدران وجسم الثعبان. كل تفاحة تمنحك 10 نقاط!
                </p>
                <Button size="lg" onClick={startGame}>
                  <Play />
                  ابدأ اللعب
                </Button>
                <p className="text-xs text-slate-400">أو اضغط أحد الأسهم للبدء مباشرة</p>
              </>
            ) : null}
            {status === "paused" ? (
              <>
                <p className="text-2xl font-bold text-white">اللعبة متوقفة مؤقتًا</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="lg" onClick={togglePause}>
                    <Play />
                    متابعة
                  </Button>
                  <Button size="lg" variant="secondary" onClick={startGame}>
                    <RotateCcw />
                    إعادة من البداية
                  </Button>
                </div>
              </>
            ) : null}
            {status === "gameover" ? (
              <>
                <p className="text-2xl font-bold text-white">انتهت الجولة!</p>
                <p className="text-sm text-slate-300">نتيجتك: {score}</p>
                {isNewRecord ? (
                  <Badge className="bg-amber-500 text-slate-950">رقم قياسي جديد! 🎉</Badge>
                ) : null}
                <Button size="lg" onClick={startGame}>
                  <RotateCcw />
                  العب مرة أخرى
                </Button>
                <p className="text-xs text-slate-400">أو اضغط Enter للبدء من جديد</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={startGame}>
          <RotateCcw />
          جولة جديدة
        </Button>
        <div dir="ltr" className="grid grid-cols-3 gap-1.5">
          <div />
          <DirectionButton direction="up" onPress={handleTurn}>
            <ChevronUp />
          </DirectionButton>
          <div />
          <DirectionButton direction="left" onPress={handleTurn}>
            <ChevronLeft />
          </DirectionButton>
          <div className="flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          </div>
          <DirectionButton direction="right" onPress={handleTurn}>
            <ChevronRight />
          </DirectionButton>
          <div />
          <DirectionButton direction="down" onPress={handleTurn}>
            <ChevronDown />
          </DirectionButton>
          <div />
        </div>
      </div>
    </div>
  );
}