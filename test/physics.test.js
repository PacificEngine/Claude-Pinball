import { describe, it, expect } from 'vitest';
import { stepBall, collideCircle, collideSegment } from '../src/physics.js';

const ball = (o = {}) => ({ x: 0, y: 0, vx: 0, vy: 0, r: 10, ...o });

describe('stepBall', () => {
  it('accelerates downhill under gravity', () => {
    const b = ball();
    stepBall(b, 0.5, 100);
    expect(b.vy).toBeCloseTo(50);
    expect(b.y).toBeCloseTo(25);
  });

  it('moves with its velocity', () => {
    const b = ball({ vx: 10 });
    stepBall(b, 1, 0);
    expect(b.x).toBeCloseTo(10);
  });
});

describe('collideCircle', () => {
  const bumper = { x: 100, y: 0, r: 20 };

  it('ignores a ball that is not touching', () => {
    const b = ball({ x: 0, vx: 50 });
    expect(collideCircle(b, bumper, 1)).toBeNull();
    expect(b.vx).toBe(50);
  });

  it('bounces a touching ball back and pushes it out of overlap', () => {
    const b = ball({ x: 75, vx: 50 }); // distance 25 < 30
    const hit = collideCircle(b, bumper, 1);
    expect(hit.speed).toBeCloseTo(50);
    expect(b.vx).toBeCloseTo(-50);
    expect(b.x).toBeCloseTo(70);
  });

  it('applies restitution', () => {
    const b = ball({ x: 75, vx: 100 });
    collideCircle(b, bumper, 0.5);
    expect(b.vx).toBeCloseTo(-50);
  });

  it('does not bounce a ball already moving away', () => {
    const b = ball({ x: 75, vx: -50 });
    collideCircle(b, bumper, 1);
    expect(b.vx).toBeCloseTo(-50);
  });
});

describe('collideSegment', () => {
  const floor = { ax: -100, ay: 20, bx: 100, by: 20 };

  it('bounces off the flat of a segment', () => {
    const b = ball({ y: 15, vy: 40 });
    expect(collideSegment(b, floor, 1)).not.toBeNull();
    expect(b.vy).toBeCloseTo(-40);
    expect(b.y).toBeCloseTo(10);
  });

  it('bounces off the end cap of a segment', () => {
    const b = ball({ x: 105, y: 20, vx: -30 });
    collideSegment(b, floor, 1);
    expect(b.vx).toBeCloseTo(30);
  });

  it('misses when far away', () => {
    const b = ball({ y: -50, vy: 40 });
    expect(collideSegment(b, floor, 1)).toBeNull();
  });

  it('kicks the ball with the velocity of a moving surface', () => {
    const b = ball({ y: 15 });
    collideSegment(b, floor, 1, { vx: 0, vy: -100 });
    expect(b.vy).toBeCloseTo(-200);
  });
});
