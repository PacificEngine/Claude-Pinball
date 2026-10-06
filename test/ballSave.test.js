import { describe, it, expect } from 'vitest';
import { createGame, update, chargePlunger, releasePlunger, drainEvents, BALL_SAVE_SECONDS } from '../src/game.js';

const launch = () => {
  const g = createGame();
  chargePlunger(g, 1);
  releasePlunger(g);
  drainEvents(g);
  return g;
};
const drain = (g) => {
  g.ball.y = g.table.height + 50;
  update(g, 1 / 120);
};

describe('ball save', () => {
  it('is off until the ball is launched', () => {
    expect(createGame().ballSave).toBe(0);
  });

  it('starts a countdown on launch and ticks down while playing', () => {
    const g = launch();
    expect(g.ballSave).toBe(BALL_SAVE_SECONDS);
    for (let i = 0; i < 120; i++) { g.ball.y = 400; g.ball.vy = 0; update(g, 1 / 120); }
    expect(g.ballSave).toBeCloseTo(BALL_SAVE_SECONDS - 1, 1);
  });

  it('returns a drained ball to the plunger for free', () => {
    const g = launch();
    drain(g);
    expect(g.ballsLeft).toBe(3);
    expect(g.phase).toBe('plunging');
    expect(drainEvents(g).map((e) => e.type)).toEqual(['ball-saved', 'ball-served']);
  });

  it('only saves once per launch', () => {
    const g = launch();
    drain(g);
    chargePlunger(g, 1);
    releasePlunger(g);
    g.ballSave = 0;
    drain(g);
    expect(g.ballsLeft).toBe(2);
  });

  it('runs out', () => {
    const g = launch();
    g.ballSave = 0;
    drain(g);
    expect(g.ballsLeft).toBe(2);
  });

  it('does not stop a drain costing a ball in multiball', () => {
    const g = launch();
    g.balls.push({ x: 300, y: 400, vx: 0, vy: 0, r: 9 });
    drain(g);
    expect(g.balls).toHaveLength(1);
    expect(g.phase).toBe('playing');
  });
});
