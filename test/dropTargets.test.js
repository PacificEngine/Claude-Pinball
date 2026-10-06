import { describe, it, expect } from 'vitest';
import { withoutCombo } from './helpers.js';
import { createGame, update, drainEvents } from '../src/game.js';

const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const mid = (t) => ({ x: (t.ax + t.bx) / 2, y: (t.ay + t.by) / 2 });
// Fire the ball at the target from the open (right) side.
const hit = (g, t) => {
  const m = mid(t);
  Object.assign(g.ball, { x: m.x + 15, y: m.y, vx: -200, vy: 0 });
  for (let i = 0; i < 6; i++) update(g, 1 / 120);
};

describe('drop targets', () => {
  it('knock down and score when hit, bouncing the ball', () => {
    const g = playing();
    const [t] = g.table.dropBanks[0].targets;
    hit(g, t);
    expect(t.standing).toBe(false);
    expect(g.score).toBe(t.points);
    expect(g.ball.vx).toBeGreaterThan(0);
    expect(drainEvents(g).map((e) => e.type)).toContain('target');
  });

  it('let the ball pass once they are down', () => {
    const g = playing();
    const [t] = g.table.dropBanks[0].targets;
    hit(g, t);
    const score = g.score;
    Object.assign(g.ball, { x: mid(t).x + 15, y: mid(t).y, vx: -200, vy: 0 });
    update(g, 1 / 120);
    expect(g.ball.vx).toBeLessThan(0);
    expect(g.score).toBe(score);
  });

  it('pay a bonus for clearing the bank, then stand back up', () => {
    const g = withoutCombo(playing());
    const { targets } = g.table.dropBanks[0];
    targets.forEach((t) => hit(g, t));
    expect(g.score).toBe(targets.length * targets[0].points + g.table.dropBanks[0].bonus);
    expect(drainEvents(g).map((e) => e.type)).toContain('targets-complete');
    expect(targets.every((t) => !t.standing)).toBe(true);
    for (let i = 0; i < 150; i++) {
      Object.assign(g.ball, { x: 300, y: 600, vx: 0, vy: 0 });
      update(g, 1 / 120);
    }
    expect(targets.every((t) => t.standing)).toBe(true);
  });
});
