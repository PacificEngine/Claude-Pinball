import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';

const run = (g, seconds, dt = 1 / 120) => {
  for (let t = 0; t < seconds; t += dt) update(g, dt);
};
const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const lockBall = (g) => {
  const { lock } = g.table;
  g.phase = 'playing';
  Object.assign(g.ball, { x: lock.x, y: lock.y, vx: -50, vy: 0 });
  update(g, 1 / 120);
};
const types = (g) => drainEvents(g).map((e) => e.type);

describe('ball lock', () => {
  it('holds the first ball and serves a new one without costing a ball', () => {
    const g = playing();
    lockBall(g);
    expect(g.table.lock.locked).toBe(1);
    expect(g.ballsLeft).toBe(3);
    expect(g.phase).toBe('plunging');
    expect(g.balls).toHaveLength(1);
    expect(g.ball.x).toBe(g.table.plungerStart.x);
    expect(types(g)).toContain('ball-locked');
  });

  it('scores for locking', () => {
    const g = playing();
    lockBall(g);
    expect(g.score).toBe(g.table.lock.points);
  });
});

describe('multiball', () => {
  it('starts when the second ball is locked, putting two balls in play', () => {
    const g = playing();
    lockBall(g);
    lockBall(g);
    expect(g.balls).toHaveLength(2);
    expect(g.phase).toBe('playing');
    expect(g.table.lock.locked).toBe(0);
    expect(g.ballsLeft).toBe(3);
    expect(types(g)).toContain('multiball');
  });

  it('releases both balls from the saucer, apart from each other', () => {
    const g = playing();
    lockBall(g);
    lockBall(g);
    run(g, 0.15);
    expect(g.balls.every((b) => b.transit)).toBe(true);
    run(g, 0.95);
    expect(g.balls.every((b) => !b.transit)).toBe(true);
    const [a, b] = g.balls;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(5);
  });

  it('does not lock more balls while it is running', () => {
    const g = playing();
    lockBall(g);
    lockBall(g);
    run(g, 1.1);
    const { lock } = g.table;
    Object.assign(g.balls[0], { x: lock.x, y: lock.y, vx: 0, vy: 0, portalCooldown: 0 });
    update(g, 1 / 120);
    expect(lock.locked).toBe(0);
    expect(g.balls).toHaveLength(2);
  });

  it('lets a ball drain for free, and ends when one is left', () => {
    const g = playing();
    lockBall(g);
    lockBall(g);
    run(g, 1.1);
    drainEvents(g);
    g.balls[0].y = g.table.height + 50;
    update(g, 1 / 120);
    expect(g.balls).toHaveLength(1);
    expect(g.ballsLeft).toBe(3);
    expect(g.phase).toBe('playing');
    expect(types(g)).toContain('multiball-end');
  });

  it('costs a ball again once back to a single ball', () => {
    const g = playing();
    lockBall(g);
    lockBall(g);
    run(g, 1.1);
    g.balls[0].y = g.table.height + 50;
    update(g, 1 / 120);
    g.balls[0].y = g.table.height + 50;
    update(g, 1 / 120);
    expect(g.ballsLeft).toBe(2);
    expect(g.phase).toBe('plunging');
  });
});
