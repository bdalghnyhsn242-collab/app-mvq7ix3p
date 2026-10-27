export const GRID_SIZE = 17;
export const SCORE_PER_FOOD = 10;

export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "idle" | "running" | "paused" | "gameover";
export type Difficulty = "easy" | "medium" | "hard";

export type SnakeState = {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction;
  score: number;
};

export type StepResult = {
  state: SnakeState;
  ate: boolean;
  gameOver: boolean;
};

const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const DIFFICULTY_BASE_MS: Record<Difficulty, number> = {
  easy: 170,
  medium: 125,
  hard: 90,
};

const MIN_INTERVAL_MS = 60;
const SPEED_STEP_SCORE = 30;
const SPEED_STEP_MS = 8;

export function intervalForScore(score: number, difficulty: Difficulty): number {
  const steps = Math.floor(score / SPEED_STEP_SCORE);
  return Math.max(MIN_INTERVAL_MS, DIFFICULTY_BASE_MS[difficulty] - steps * SPEED_STEP_MS);
}

export function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((point) => `${point.x}:${point.y}`));
  const free: Point[] = [];
  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) {
    return snake[0];
  }
  return free[Math.floor(Math.random() * free.length)];
}

export function createInitialState(): SnakeState {
  const centerY = Math.floor(GRID_SIZE / 2);
  const snake: Point[] = [
    { x: 8, y: centerY },
    { x: 7, y: centerY },
    { x: 6, y: centerY },
  ];
  return {
    snake,
    food: spawnFood(snake),
    direction: "right",
    nextDirection: "right",
    score: 0,
  };
}

export function turn(state: SnakeState, direction: Direction): SnakeState {
  if (direction === state.direction || direction === OPPOSITE[state.direction]) {
    return state;
  }
  if (direction === state.nextDirection) {
    return state;
  }
  return { ...state, nextDirection: direction };
}

export function step(state: SnakeState): StepResult {
  const direction = state.nextDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

  const ate = nextHead.x === state.food.x && nextHead.y === state.food.y;
  const hitsWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y >= GRID_SIZE;
  const body = ate ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = body.some((point) => point.x === nextHead.x && point.y === nextHead.y);

  if (hitsWall || hitsSelf) {
    return { state: { ...state, direction }, ate: false, gameOver: true };
  }

  const snake = [nextHead, ...state.snake];
  if (!ate) {
    snake.pop();
  }

  return {
    state: {
      snake,
      food: ate ? spawnFood(snake) : state.food,
      direction,
      nextDirection: direction,
      score: state.score + (ate ? SCORE_PER_FOOD : 0),
    },
    ate,
    gameOver: false,
  };
}