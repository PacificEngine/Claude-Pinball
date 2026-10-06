import { describe, it, expect } from 'vitest';
import { createGame, update } from '../src/game.js';

const run = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) update(g, 1 / 120);
};
const playing = (ball) => {
  const g = createGame();
  g.phase = 'playing';
  Object.assign(g.ball, ball);
  return g;
};

describe('plunger lane gate', () => {
  it('lets a launched ball up through from below', () => {
    const g = playing({ x: 570, y: 500, vx: 0, vy: -1100 });
    run(g, 0.4);
    expect(g.ball.y).toBeLessThan(320);
  });

  it('turns back a ball that falls down onto it from the playfield', () => {
    const g = playing({ x: 575, y: 230, vx: 0, vy: 50 });
    run(g, 2);
    expect(g.ball.x).toBeLessThan(g.table.laneLeft);
  });

  it('lets a weak launch fall back to the plunger from beneath it', () => {
    const g = playing({ x: 570, y: 600, vx: 0, vy: -150 });
    run(g, 3);
    expect(g.ball.x).toBeGreaterThan(g.table.laneLeft);
    expect(g.ball.y).toBeGreaterThan(700);
  });

  it('still lets a full launch out onto the playfield', () => {
    const g = playing({ x: 570, y: 755, vx: 0, vy: -1200 });
    run(g, 4);
    expect(g.ball.x).toBeLessThan(g.table.laneLeft);
  });
});
