import { describe, it, expect } from 'vitest';
import { withoutCombo } from './helpers.js';
import { createGame, update, drainEvents } from '../src/game.js';
import { emit } from '../src/events.js';
import { MISSIONS } from '../src/missions.js';

const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};
const fire = (g, type, n = 1) => {
  for (let i = 0; i < n; i++) emit(g, type);
};

describe('missions', () => {
  it('start with the first mission and no progress', () => {
    const g = createGame();
    expect(g.mission.def).toBe(MISSIONS[0]);
    expect(g.mission.progress).toBe(0);
  });

  it('count progress only for the events they care about', () => {
    const g = createGame();
    fire(g, MISSIONS[0].event, 2);
    fire(g, 'launch');
    expect(g.mission.progress).toBe(2);
  });

  it('pay a reward without the multiplier, announce it, and move to the next', () => {
    const g = withoutCombo(createGame());
    g.multiplier = 5;
    fire(g, MISSIONS[0].event, MISSIONS[0].goal);
    expect(g.score).toBe(MISSIONS[0].reward);
    expect(g.missionsCompleted).toBe(1);
    expect(g.mission.def).toBe(MISSIONS[1]);
    expect(g.mission.progress).toBe(0);
    expect(drainEvents(g).map((e) => e.type)).toContain('mission-complete');
  });

  it('show a banner for a few seconds', () => {
    const g = createGame();
    fire(g, MISSIONS[0].event, MISSIONS[0].goal);
    expect(g.banner.text).toMatch(MISSIONS[0].name);
    for (let i = 0; i < 120 * 4; i++) update(g, 1 / 120);
    expect(g.banner).toBeNull();
  });

  it('cycle back to the first mission after the last', () => {
    const g = createGame();
    for (const m of MISSIONS) fire(g, m.event, m.goal);
    expect(g.mission.def).toBe(MISSIONS[0]);
  });

  it('pay nothing while tilted', () => {
    const g = createGame();
    g.tilted = true;
    fire(g, MISSIONS[0].event, MISSIONS[0].goal);
    expect(g.score).toBe(0);
  });

  it('are completed by real play: five bumper hits', () => {
    const g = playing();
    const b = g.table.bumpers[0];
    for (let i = 0; i < MISSIONS[0].goal; i++) {
      Object.assign(g.ball, { x: b.x - b.r - g.ball.r + 1, y: b.y, vx: 100, vy: 0 });
      update(g, 1 / 120);
    }
    expect(g.missionsCompleted).toBe(1);
  });
});
