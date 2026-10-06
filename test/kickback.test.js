import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';
import { emit } from '../src/events.js';

const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const enter = (g) => {
  const k = g.table.kickback;
  Object.assign(g.ball, { x: k.x, y: k.y, vx: 0, vy: 50 });
  update(g, 1 / 120);
};

describe('kickback', () => {
  it('starts disarmed and lets the ball through', () => {
    const g = playing();
    expect(g.table.kickback.armed).toBe(false);
    enter(g);
    expect(g.ball.vy).toBeGreaterThan(0);
  });

  it('is armed by completing a mission', () => {
    const g = playing();
    emit(g, 'mission-complete', { id: 'bumpers', reward: 0 });
    expect(g.table.kickback.armed).toBe(true);
    expect(drainEvents(g).map((e) => e.type)).toContain('kickback-armed');
  });

  it('fires an armed ball back up the lane, once', () => {
    const g = playing();
    g.table.kickback.armed = true;
    enter(g);
    expect(g.ball.vy).toBeLessThan(-800);
    expect(g.table.kickback.armed).toBe(false);
    expect(drainEvents(g).map((e) => e.type)).toContain('kickback');
    enter(g);
    expect(g.ball.vy).toBeGreaterThan(0);
  });
});
