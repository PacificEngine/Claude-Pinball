import { describe, it, expect } from 'vitest';
import { createGame, update, chargePlunger, releasePlunger, setFlipper, restart } from '../src/game.js';

const run = (g, seconds, dt = 1 / 120) => {
  for (let t = 0; t < seconds; t += dt) update(g, dt);
};

describe('new game', () => {
  it('starts with three balls, no score, ball waiting at the plunger', () => {
    const g = createGame();
    expect(g.ballsLeft).toBe(3);
    expect(g.score).toBe(0);
    expect(g.phase).toBe('plunging');
  });

  it('holds the ball still until the plunger is released', () => {
    const g = createGame();
    const { x, y } = g.ball;
    run(g, 1);
    expect(g.ball.x).toBe(x);
    expect(g.ball.y).toBe(y);
  });
});

describe('plunger', () => {
  it('launches the ball upward, harder with more charge', () => {
    const weak = createGame();
    chargePlunger(weak, 0.2);
    releasePlunger(weak);
    const strong = createGame();
    chargePlunger(strong, 1);
    releasePlunger(strong);
    expect(weak.ball.vy).toBeLessThan(0);
    expect(strong.ball.vy).toBeLessThan(weak.ball.vy);
    expect(strong.phase).toBe('playing');
  });

  it('a full plunge carries the ball out of the lane onto the playfield', () => {
    const g = createGame();
    chargePlunger(g, 1);
    releasePlunger(g);
    run(g, 3);
    expect(g.ball.x).toBeLessThan(g.table.laneLeft);
  });
});

describe('scoring', () => {
  it('awards points and kicks the ball when it hits a bumper', () => {
    const g = createGame();
    const bumper = g.table.bumpers[0];
    g.phase = 'playing';
    Object.assign(g.ball, { x: bumper.x - bumper.r - g.ball.r + 1, y: bumper.y, vx: 100, vy: 0 });
    update(g, 1 / 120);
    expect(g.score).toBe(bumper.points);
    expect(g.ball.vx).toBeLessThan(0);
  });
});

describe('draining', () => {
  const drain = (g) => {
    g.phase = 'playing';
    Object.assign(g.ball, { x: g.table.width / 2, y: g.table.height + 50, vx: 0, vy: 0 });
    update(g, 1 / 120);
  };

  it('costs a ball and serves a new one', () => {
    const g = createGame();
    drain(g);
    expect(g.ballsLeft).toBe(2);
    expect(g.phase).toBe('plunging');
  });

  it('ends the game on the last ball, and restart starts fresh', () => {
    const g = createGame();
    g.score = 500;
    drain(g);
    drain(g);
    drain(g);
    expect(g.phase).toBe('gameover');
    restart(g);
    expect(g.phase).toBe('plunging');
    expect(g.ballsLeft).toBe(3);
    expect(g.score).toBe(0);
  });
});

describe('flippers', () => {
  it('rise when their button is held', () => {
    const g = createGame();
    const rest = g.flippers.left.angle;
    setFlipper(g, 'left', true);
    run(g, 0.2);
    expect(g.flippers.left.angle).toBeLessThan(rest);
  });
});

describe('table integrity', () => {
  it('never lets the ball leave through the walls over a long random game', () => {
    let seed = 12345;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let game = 0; game < 5; game++) {
      const g = createGame();
      chargePlunger(g, 0.7 + rand() * 0.3);
      releasePlunger(g);
      for (let step = 0; step < 120 * 30 && g.phase === 'playing'; step++) {
        if (step % 20 === 0) {
          setFlipper(g, 'left', rand() < 0.5);
          setFlipper(g, 'right', rand() < 0.5);
        }
        update(g, 1 / 120);
        expect(g.ball.x).toBeGreaterThan(0);
        expect(g.ball.x).toBeLessThan(g.table.width);
        expect(g.ball.y).toBeGreaterThan(0);
      }
    }
  });
});

describe('inlane guides', () => {
  // Captured from a real stuck game: the ball wedged between the right guide and the
  // flipper's pivot cap. Once the guide meets the flipper's top surface flush, a ball
  // anywhere along the inlane must roll down the flipper and drain.
  const stuckSpots = [
    ['right', 396, 686.3],
    ['left', 164, 686.3],
  ];
  for (const [side, x, y] of stuckSpots) {
    it(`does not wedge a ball between the ${side} guide and flipper pivot`, () => {
      const g = createGame();
      g.phase = 'playing';
      Object.assign(g.ball, { x, y, vx: 0, vy: 0 });
      run(g, 6);
      expect(g.ballsLeft).toBe(2);
    });
  }

  it('lets a ball roll down either guide, onto the flipper, and drain', () => {
    for (const x of [30, 60, 120, 500, 520, 540]) {
      const g = createGame();
      g.phase = 'playing';
      Object.assign(g.ball, { x, y: 590, vx: 0, vy: 0 });
      run(g, 8);
      expect(g.ballsLeft, `ball released at x=${x}`).toBe(2);
    }
  });
});
