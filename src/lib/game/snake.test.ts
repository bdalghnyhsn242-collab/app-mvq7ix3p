import { describe, expect, it } from "vitest";
import {
  GRID_SIZE,
  createInitialState,
  intervalForScore,
  spawnFood,
  step,
  turn,
  type SnakeState,
} from "./snake";

describe("snake game logic", () => {
  it("starts with a three-segment snake moving right", () => {
    const state = createInitialState();
    expect(state.snake).toHaveLength(3);
    expect(state.direction).toBe("right");
    expect(state.score).toBe(0);
  });

  it("ignores reversal turns", () => {
    const state = createInitialState();
    expect(turn(state, "left")).toBe(state);
  });

  it("accepts a perpendicular turn", () => {
    const state = createInitialState();
    expect(turn(state, "up").nextDirection).toBe("up");
  });

  it("grows and scores when eating food", () => {
    const state = createInitialState();
    const forced: SnakeState = { ...state, food: { x: 9, y: 8 } };
    const result = step(forced);
    expect(result.ate).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(result.state.snake).toHaveLength(4);
    expect(result.state.score).toBe(10);
  });

  it("ends the round when the snake reaches the wall", () => {
    let result = step(createInitialState());
    let guard = 0;
    while (!result.gameOver && guard < GRID_SIZE * 2) {
      result = step(result.state);
      guard += 1;
    }
    expect(result.gameOver).toBe(true);
  });

  it("ends the round when the snake hits its own body", () => {
    const state: SnakeState = {
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 5, y: 7 },
        { x: 6, y: 7 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ],
      food: { x: 0, y: 0 },
      direction: "up",
      nextDirection: "right",
      score: 0,
    };
    expect(step(state).gameOver).toBe(true);
  });

  it("allows moving into the cell the tail is leaving", () => {
    const state: SnakeState = {
      snake: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      food: { x: 0, y: 0 },
      direction: "up",
      nextDirection: "down",
      score: 0,
    };
    const result = step(state);
    expect(result.gameOver).toBe(false);
    expect(result.state.snake[0]).toEqual({ x: 5, y: 6 });
    expect(result.state.snake).toHaveLength(4);
  });

  it("spawns food inside the grid and outside the snake", () => {
    const state = createInitialState();
    expect(state.food.x).toBeGreaterThanOrEqual(0);
    expect(state.food.x).toBeLessThan(GRID_SIZE);
    expect(state.food.y).toBeGreaterThanOrEqual(0);
    expect(state.food.y).toBeLessThan(GRID_SIZE);
    expect(
      state.snake.some((point) => point.x === state.food.x && point.y === state.food.y),
    ).toBe(false);
    expect(spawnFood(state.snake)).toBeDefined();
  });

  it("speeds up as the score grows", () => {
    expect(intervalForScore(0, "medium")).toBe(125);
    expect(intervalForScore(300, "medium")).toBeLessThan(intervalForScore(0, "medium"));
    expect(intervalForScore(100000, "hard")).toBe(60);
  });
});