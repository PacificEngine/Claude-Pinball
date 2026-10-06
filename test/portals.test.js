import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';

const run = (g, seconds, dt = 1 / 120) => {
  for (let t = 0; t < seconds; t += dt) update(g, dt);
};
const portal = (g, id) => g.table.portals.find((p) => p.id === id);
const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const place = (g, x, y, vx = 0, vy = 0) => Object.assign(g.ball, { x, y, vx, vy });

describe('wormholes', () => {
  it('capture a ball that rolls into them, and score', () => {
    const g = playing();
    const a = portal(g, 'w1');
    place(g, a.x, a.y, 100, 0);
    update(g, 1 / 120);
    expect(g.ball.transit).toBeTruthy();
    expect(g.score).toBe(a.points);
    expect(drainEvents(g).map((e) => e.type)).toContain('wormhole');
  });

  it('hold the ball still and hidden while it travels', () => {
    const g = playing();
    const a = portal(g, 'w1');
    place(g, a.x, a.y, 100, 0);
    update(g, 1 / 120);
    const { x, y } = g.ball;
    run(g, 0.3);
    expect(g.ball.x).toBe(x);
    expect(g.ball.y).toBe(y);
    expect(g.ball.transit.visible).toBe(false);
  });

  it('release the ball from the partner wormhole, keeping its direction', () => {
    const g = playing();
    const a = portal(g, 'w1');
    const b = portal(g, a.to);
    place(g, a.x, a.y, 300, 0);
    run(g, 0.65);
    expect(g.ball.transit).toBeFalsy();
    expect(Math.hypot(g.ball.x - b.x, g.ball.y - b.y)).toBeLessThan(40);
    expect(g.ball.vx).toBeGreaterThan(100);
  });

  it('do not immediately swallow the ball they just released', () => {
    const g = playing();
    const a = portal(g, 'w1');
    const b = portal(g, a.to);
    place(g, a.x, a.y, 0, 0);
    run(g, 0.7);
    expect(g.ball.portalCooldown).toBeGreaterThan(0);
    expect(g.ball.transit).toBeFalsy();
    place(g, b.x, b.y);
    update(g, 1 / 120);
    expect(g.ball.transit).toBeFalsy();
  });

  it('are paired both ways', () => {
    const g = createGame();
    for (const p of g.table.portals.filter((q) => q.kind === 'wormhole')) {
      expect(portal(g, p.to).to).toBe(p.id);
    }
  });

  it('do not count a ball in transit as drained', () => {
    const g = playing();
    const a = portal(g, 'w1');
    place(g, a.x, a.y);
    run(g, 0.3);
    expect(g.ballsLeft).toBe(3);
  });
});

describe('ramp', () => {
  const ramp = (g) => portal(g, 'ramp');

  it('ignores a ball that is slow or falling', () => {
    const g = playing();
    place(g, ramp(g).x, ramp(g).y, 0, -50);
    update(g, 1 / 120);
    expect(g.ball.transit).toBeFalsy();
    place(g, ramp(g).x, ramp(g).y, 0, 400);
    update(g, 1 / 120);
    expect(g.ball.transit).toBeFalsy();
  });

  it('carries a fast upward ball to the top, visibly, and scores', () => {
    const g = playing();
    place(g, ramp(g).x, ramp(g).y, 0, -600);
    update(g, 1 / 120);
    expect(g.ball.transit.visible).toBe(true);
    expect(g.score).toBe(ramp(g).points);
    run(g, 0.5);
    expect(g.ball.y).toBeLessThan(ramp(g).y);
    expect(g.ball.y).toBeGreaterThan(ramp(g).exit.y);
    run(g, 0.53);
    expect(g.ball.transit).toBeFalsy();
    expect(g.ball.vy).toBeGreaterThan(0);
    expect(drainEvents(g).map((e) => e.type)).toContain('ramp');
  });
});
