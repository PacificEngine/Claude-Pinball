import { describe, it, expect } from 'vitest';
import { createGame, update, chargePlunger, releasePlunger, setFlipper, nudge, TILT, drainEvents } from '../src/game.js';

const types = (g) => drainEvents(g).map((e) => e.type);
const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  Object.assign(g.ball, { x: 300, y: 400, vx: 0, vy: 0 });
  return g;
};

describe('game events (the seam for sound and music)', () => {
  it('hands over events in order and clears them', () => {
    const g = createGame();
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(types(g)).toEqual(['launch']);
    expect(drainEvents(g)).toEqual([]);
  });

  it('announces a bumper hit with the bumper position', () => {
    const g = playing();
    const b = g.table.bumpers[0];
    Object.assign(g.ball, { x: b.x - b.r - g.ball.r + 1, y: b.y, vx: 100, vy: 0 });
    update(g, 1 / 120);
    const e = drainEvents(g).find((ev) => ev.type === 'bumper');
    expect(e).toMatchObject({ type: 'bumper', x: b.x, y: b.y });
  });

  it('announces a slingshot hit', () => {
    const g = playing();
    const w = g.table.walls.find((s) => s.points > 0);
    Object.assign(g.ball, { x: (w.ax + w.bx) / 2 - 12, y: (w.ay + w.by) / 2 - 12, vx: 60, vy: 60 });
    for (let i = 0; i < 20; i++) update(g, 1 / 120);
    expect(types(g)).toContain('slingshot');
  });

  it('announces flipper presses, not repeats', () => {
    const g = createGame();
    setFlipper(g, 'left', true);
    setFlipper(g, 'left', true);
    expect(types(g)).toEqual(['flipper']);
  });

  it('announces nudges, the tilt warning, and the tilt', () => {
    const g = playing();
    for (let i = 0; i < TILT.limit; i++) nudge(g, 'left');
    const t = types(g);
    expect(t.filter((x) => x === 'nudge')).toHaveLength(TILT.limit);
    expect(t).toContain('tilt-warning');
    expect(t.filter((x) => x === 'tilt')).toHaveLength(1);
  });

  it('announces a drain, the next ball, and game over', () => {
    const g = playing();
    g.ball.y = g.table.height + 50;
    update(g, 1 / 120);
    expect(types(g)).toEqual(['drain', 'ball-served']);
    g.ballsLeft = 1;
    g.phase = 'playing';
    g.ball.y = g.table.height + 50;
    update(g, 1 / 120);
    expect(types(g)).toEqual(['drain', 'game-over']);
  });
});
