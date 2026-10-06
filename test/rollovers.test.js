import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';

const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const roll = (g, lane) => {
  Object.assign(g.ball, { x: lane.x, y: lane.y, vx: 0, vy: 0 });
  update(g, 1 / 120);
};

describe('rollover lanes', () => {
  it('light up and score when the ball rolls over them', () => {
    const g = playing();
    const [a] = g.table.rollovers;
    roll(g, a);
    expect(a.lit).toBe(true);
    expect(g.score).toBe(a.points);
    expect(drainEvents(g).map((e) => e.type)).toContain('rollover');
  });

  it('only score once while lit', () => {
    const g = playing();
    const [a] = g.table.rollovers;
    roll(g, a);
    roll(g, a);
    expect(g.score).toBe(a.points);
  });

  it('raise the multiplier and reset when all three are lit', () => {
    const g = playing();
    expect(g.multiplier).toBe(1);
    g.table.rollovers.forEach((lane) => roll(g, lane));
    expect(g.multiplier).toBe(2);
    expect(g.table.rollovers.every((r) => !r.lit)).toBe(true);
    expect(drainEvents(g).map((e) => e.type)).toContain('multiplier');
  });

  it('step the multiplier 1, 2, 3, 5 and stop there', () => {
    const g = playing();
    const seen = [];
    for (let round = 0; round < 5; round++) {
      g.table.rollovers.forEach((lane) => roll(g, lane));
      seen.push(g.multiplier);
    }
    expect(seen).toEqual([2, 3, 5, 5, 5]);
  });

  it('multiply the points scored while it is raised', () => {
    const g = playing();
    g.table.rollovers.forEach((lane) => roll(g, lane));
    const before = g.score;
    const bumper = g.table.bumpers[0];
    Object.assign(g.ball, { x: bumper.x - bumper.r - g.ball.r + 1, y: bumper.y, vx: 100, vy: 0 });
    update(g, 1 / 120);
    expect(g.score - before).toBe(bumper.points * 2);
  });

  it('go back to x1 and unlit when the ball drains', () => {
    const g = playing();
    g.table.rollovers.forEach((lane) => roll(g, lane));
    roll(g, g.table.rollovers[0]);
    g.ball.y = g.table.height + 50;
    update(g, 1 / 120);
    expect(g.multiplier).toBe(1);
    expect(g.table.rollovers.every((r) => !r.lit)).toBe(true);
  });
});
