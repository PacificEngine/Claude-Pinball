import { describe, it, expect } from 'vitest';
import { createGame, update, drainEvents } from '../src/game.js';
import { emit } from '../src/events.js';
import { COMBO } from '../src/combo.js';

const idle = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) {
    Object.assign(g.ball, { x: 300, y: 600, vx: 0, vy: 0 });
    update(g, 1 / 120);
  }
};
const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};

describe('combo chain', () => {
  it('pays nothing extra for a lone hit', () => {
    const g = playing();
    emit(g, 'bumper');
    expect(g.combo.count).toBe(1);
    expect(g.score).toBe(0);
  });

  it('pays a growing bonus for hits that follow quickly', () => {
    const g = playing();
    emit(g, 'bumper');
    emit(g, 'target');
    emit(g, 'rollover');
    expect(g.combo.count).toBe(3);
    expect(g.score).toBe(COMBO.bonusPerStep * 1 + COMBO.bonusPerStep * 2);
    const combos = drainEvents(g).filter((e) => e.type === 'combo');
    expect(combos.map((e) => e.count)).toEqual([2, 3]);
  });

  it('starts over after a pause', () => {
    const g = playing();
    emit(g, 'bumper');
    idle(g, COMBO.windowSeconds + 0.5);
    emit(g, 'bumper');
    expect(g.combo.count).toBe(1);
  });

  it('ignores events that are not table hits', () => {
    const g = playing();
    emit(g, 'flipper');
    emit(g, 'nudge');
    expect(g.combo.count).toBe(0);
  });

  it('resets when the ball drains', () => {
    const g = playing();
    emit(g, 'bumper');
    emit(g, 'bumper');
    g.ball.y = g.table.height + 50;
    update(g, 1 / 120);
    expect(g.combo.count).toBe(0);
  });
});
