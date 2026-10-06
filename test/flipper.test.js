import { describe, it, expect } from 'vitest';
import { createFlipper, updateFlipper, flipperSegment, collideFlipper } from '../src/flipper.js';

const left = () => createFlipper({ x: 100, y: 500, length: 80, side: 1 });
const right = () => createFlipper({ x: 300, y: 500, length: 80, side: -1 });

describe('flipper geometry', () => {
  it('rests pointing down and toward the center', () => {
    const s = flipperSegment(left());
    expect(s.bx).toBeGreaterThan(s.ax);
    expect(s.by).toBeGreaterThan(s.ay);
    const r = flipperSegment(right());
    expect(r.bx).toBeLessThan(r.ax);
    expect(r.by).toBeGreaterThan(r.ay);
  });

  it('keeps its length at any angle', () => {
    const f = left();
    for (let i = 0; i < 20; i++) {
      updateFlipper(f, 0.01, true);
      const s = flipperSegment(f);
      expect(Math.hypot(s.bx - s.ax, s.by - s.ay)).toBeCloseTo(80);
    }
  });
});

describe('updateFlipper', () => {
  it('swings up when pressed and stops at the limit', () => {
    const f = left();
    for (let i = 0; i < 100; i++) updateFlipper(f, 0.01, true);
    expect(flipperSegment(f).by).toBeLessThan(500);
    expect(f.angularVelocity).toBe(0);
  });

  it('drops back when released', () => {
    const f = left();
    for (let i = 0; i < 100; i++) updateFlipper(f, 0.01, true);
    for (let i = 0; i < 100; i++) updateFlipper(f, 0.01, false);
    expect(flipperSegment(f).by).toBeGreaterThan(500);
  });

  it('mirrors for the right flipper', () => {
    const f = right();
    for (let i = 0; i < 100; i++) updateFlipper(f, 0.01, true);
    const s = flipperSegment(f);
    expect(s.by).toBeLessThan(500);
    expect(s.bx).toBeLessThan(s.ax);
  });
});

describe('collideFlipper', () => {
  it('launches a ball resting on a rising flipper upward', () => {
    const f = left();
    const b = { x: 160, y: 500, vx: 0, vy: 0, r: 8 };
    // sit the ball just above the resting flipper surface
    const s = flipperSegment(f);
    const t = 0.75;
    b.x = s.ax + (s.bx - s.ax) * t;
    b.y = s.ay + (s.by - s.ay) * t - 16;
    updateFlipper(f, 0.01, true);
    collideFlipper(b, f, 0.5);
    expect(b.vy).toBeLessThan(-50);
  });

  it('does not add energy for a resting flipper', () => {
    const f = left();
    const s = flipperSegment(f);
    const b = { x: (s.ax + s.bx) / 2, y: (s.ay + s.by) / 2 - 8, vx: 0, vy: 0, r: 8 };
    collideFlipper(b, f, 0.5);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThan(1);
  });
});
