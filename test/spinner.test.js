import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';

const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const pass = (g, speed) => {
  const s = g.table.spinners[0];
  Object.assign(g.ball, { x: s.x, y: s.y, vx: speed, vy: 0 });
  update(g, 1 / 120);
};
const idle = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) {
    Object.assign(g.ball, { x: 300, y: 600, vx: 0, vy: 0 });
    update(g, 1 / 120);
  }
};

describe('spinner', () => {
  it('spins when the ball passes through', () => {
    const g = playing();
    pass(g, 400);
    expect(g.table.spinners[0].velocity).toBeGreaterThan(0);
  });

  it('spins faster for a faster ball', () => {
    const slow = playing();
    pass(slow, 150);
    const fast = playing();
    pass(fast, 600);
    expect(fast.table.spinners[0].velocity).toBeGreaterThan(slow.table.spinners[0].velocity);
  });

  it('scores for each full turn and announces it', () => {
    const g = playing();
    pass(g, 600);
    idle(g, 2);
    const s = g.table.spinners[0];
    expect(g.score).toBeGreaterThan(0);
    expect(g.score % s.points).toBe(0);
    expect(drainEvents(g).filter((e) => e.type === 'spinner').length).toBe(g.score / s.points);
  });

  it('slows to a stop by itself', () => {
    const g = playing();
    pass(g, 600);
    idle(g, 10);
    expect(g.table.spinners[0].velocity).toBe(0);
  });

  it('ignores a ball that is barely moving', () => {
    const g = playing();
    pass(g, 5);
    expect(g.table.spinners[0].velocity).toBe(0);
  });
});
