import { describe, it, expect } from 'vitest';
import { withoutCombo } from './helpers.js';
import { createGame, update, chargePlunger, releasePlunger, drainEvents } from '../src/game.js';
import { emit } from '../src/events.js';
import { SKILL_SHOT } from '../src/skillShot.js';

const launched = () => {
  const g = withoutCombo(createGame());
  chargePlunger(g, 1);
  releasePlunger(g);
  drainEvents(g);
  return g;
};
const rollOver = (g, letter) => emit(g, 'rollover', { letter });
const types = (g) => drainEvents(g).map((e) => e.type);

describe('skill shot', () => {
  it('pays a bonus for reaching the skill lane first after a launch', () => {
    const g = launched();
    rollOver(g, SKILL_SHOT.letter);
    expect(g.score).toBe(SKILL_SHOT.points);
    expect(types(g)).toContain('skill-shot');
    expect(g.banner.text).toMatch(/SKILL SHOT/);
  });

  it('is lost if something else is hit first', () => {
    for (const hit of ['bumper', 'slingshot', 'target', 'wormhole', 'ramp', 'ball-locked']) {
      const g = launched();
      emit(g, hit);
      rollOver(g, SKILL_SHOT.letter);
      expect(g.score).toBe(0);
    }
  });

  it('allows the other top lanes on the way', () => {
    const g = launched();
    rollOver(g, 'A');
    rollOver(g, SKILL_SHOT.letter);
    expect(g.score).toBe(SKILL_SHOT.points);
  });

  it('only pays once per launch', () => {
    const g = launched();
    rollOver(g, SKILL_SHOT.letter);
    rollOver(g, SKILL_SHOT.letter);
    expect(g.score).toBe(SKILL_SHOT.points);
  });

  it('times out', () => {
    const g = launched();
    for (let i = 0; i < 120 * (SKILL_SHOT.seconds + 1); i++) { g.ball.y = 400; g.ball.vy = 0; update(g, 1 / 120); }
    rollOver(g, SKILL_SHOT.letter);
    expect(g.score).toBe(0);
  });

  it('is not available before launching', () => {
    const g = createGame();
    rollOver(g, SKILL_SHOT.letter);
    expect(g.score).toBe(0);
  });
});
