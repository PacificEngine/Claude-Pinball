import { describe, it, expect } from 'vitest';
import { createGame, update, setFlipper } from '../src/game.js';

const run = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) {
    g.ball.x = 300;
    g.ball.y = 400;
    g.ball.vx = 0;
    g.ball.vy = 0;
    update(g, 1 / 120);
  }
};

describe('upper flipper', () => {
  it('exists alongside the two main flippers', () => {
    const g = createGame();
    expect(Object.keys(g.flippers).sort()).toEqual(['left', 'right', 'upperLeft']);
  });

  it('is smaller than the main flippers', () => {
    const g = createGame();
    expect(g.flippers.upperLeft.length).toBeLessThan(g.flippers.left.length);
  });

  it('rises with the left button', () => {
    const g = createGame();
    g.phase = 'playing';
    const rest = g.flippers.upperLeft.angle;
    setFlipper(g, 'left', true);
    run(g, 0.2);
    expect(g.flippers.upperLeft.angle).toBeLessThan(rest);
    expect(g.flippers.left.angle).toBeLessThan(rest);
  });

  it('ignores the right button', () => {
    const g = createGame();
    g.phase = 'playing';
    const rest = g.flippers.upperLeft.angle;
    setFlipper(g, 'right', true);
    run(g, 0.2);
    expect(g.flippers.upperLeft.angle).toBe(rest);
  });

  it('drops with the others when the machine tilts', () => {
    const g = createGame();
    g.phase = 'playing';
    setFlipper(g, 'left', true);
    run(g, 0.2);
    g.tilted = true;
    run(g, 0.2);
    expect(g.flippers.upperLeft.angle).toBeGreaterThan(0);
  });
});
