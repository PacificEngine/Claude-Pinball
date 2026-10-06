import { describe, it, expect } from 'vitest';
import { createGame, update, chargePlunger, releasePlunger, setPlungerCharge, drainEvents } from '../src/game.js';

const run = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 120) update(g, 1 / 120);
};
const inLane = (g) => ({ x: g.table.plungerStart.x, y: 766, vx: 0, vy: 0 });
const playing = () => {
  const g = createGame();
  g.phase = 'playing';
  return g;
};

describe('plunger during play', () => {
  it('launches a ball resting in the lane at any time', () => {
    const g = playing();
    Object.assign(g.ball, inLane(g));
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(g.ball.vy).toBeLessThan(-1000);
    expect(drainEvents(g).map((e) => e.type)).toContain('launch');
  });

  it('keeps a weak launch in play instead of re-serving it', () => {
    const g = createGame();
    chargePlunger(g, 0.2);
    releasePlunger(g);
    run(g, 4);
    expect(g.phase).toBe('playing');
    expect(g.ballsLeft).toBe(3);
    expect(g.ball.x).toBeGreaterThan(g.table.laneLeft);
    chargePlunger(g, 1);
    releasePlunger(g);
    run(g, 3);
    expect(g.ball.x).toBeLessThan(g.table.laneLeft);
  });

  it('launches only the balls that are in the lane, leaving the rest alone', () => {
    const g = playing();
    Object.assign(g.ball, inLane(g));
    g.balls.push({ x: 300, y: 400, vx: 5, vy: 7, r: 9 });
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(g.balls[0].vy).toBeLessThan(-1000);
    expect(g.balls[1]).toMatchObject({ vx: 5, vy: 7 });
  });

  it('does nothing but spend the charge when no ball is in the lane', () => {
    const g = playing();
    Object.assign(g.ball, { x: 300, y: 400, vx: 1, vy: 2 });
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(g.plungerCharge).toBe(0);
    expect(g.ball).toMatchObject({ vx: 1, vy: 2 });
    expect(drainEvents(g).map((e) => e.type)).not.toContain('launch');
  });

  it('does not restart the ball save or skill shot when relaunching', () => {
    const g = playing();
    g.ballSave = 3;
    g.skillShot = 0;
    Object.assign(g.ball, inLane(g));
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(g.ballSave).toBe(3);
    expect(g.skillShot).toBe(0);
  });

  it('still starts both on a fresh serve', () => {
    const g = createGame();
    chargePlunger(g, 1);
    releasePlunger(g);
    expect(g.ballSave).toBeGreaterThan(0);
    expect(g.skillShot).toBeGreaterThan(0);
  });

  it('cannot be charged once the game is over', () => {
    const g = playing();
    g.phase = 'gameover';
    chargePlunger(g, 1);
    expect(g.plungerCharge).toBe(0);
  });
});

describe('setting the plunger charge exactly (touch drag)', () => {
  it('sets the charge to the given value, clamped to 0..1', () => {
    const g = createGame();
    setPlungerCharge(g, 0.4);
    expect(g.plungerCharge).toBe(0.4);
    setPlungerCharge(g, 7);
    expect(g.plungerCharge).toBe(1);
    setPlungerCharge(g, -3);
    expect(g.plungerCharge).toBe(0);
  });

  it('can lower a charge as well as raise it, and launches at what it was left at', () => {
    const weak = createGame();
    setPlungerCharge(weak, 1);
    setPlungerCharge(weak, 0.2);
    releasePlunger(weak);
    const strong = createGame();
    setPlungerCharge(strong, 1);
    releasePlunger(strong);
    expect(weak.ball.vy).toBeGreaterThan(strong.ball.vy);
  });

  it('is ignored once the game is over', () => {
    const g = createGame();
    g.phase = 'gameover';
    setPlungerCharge(g, 1);
    expect(g.plungerCharge).toBe(0);
  });
});
