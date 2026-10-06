import { describe, it, expect } from 'vitest';
import { createGestures, GESTURE } from '../src/gestures.js';

const WIDTH = 400;
function setup() {
  const log = [];
  const g = createGestures({
    getWidth: () => WIDTH,
    onFlipper: (name, pressed) => log.push(['flipper', name, pressed]),
    onPlungerCharge: (value) => log.push(['charge', Number(value.toFixed(3))]),
    onPlungerRelease: () => log.push(['release']),
    onNudge: (direction) => log.push(['nudge', direction]),
  });
  return { g, log };
}
const kinds = (log, kind) => log.filter((e) => e[0] === kind);

// Drag a finger from (x, y) by (dx, dy) over `ms`, in `steps` moves.
function drag(g, id, x, y, dx, dy, ms, startT = 0, steps = 10) {
  g.down(id, x, y, startT);
  for (let i = 1; i <= steps; i++) g.move(id, x + (dx * i) / steps, y + (dy * i) / steps, startT + (ms * i) / steps);
}

describe('flipper zones', () => {
  it('holds the left flippers while a finger is down on the left half', () => {
    const { g, log } = setup();
    g.down(1, 100, 500, 0);
    expect(log).toEqual([['flipper', 'left', true]]);
    g.up(1, 100, 500, 200);
    expect(log.at(-1)).toEqual(['flipper', 'left', false]);
  });

  it('holds the right flippers on the right half', () => {
    const { g, log } = setup();
    g.down(1, 300, 500, 0);
    expect(log[0]).toEqual(['flipper', 'right', true]);
  });

  it('treats the exact middle as the right half', () => {
    const { g, log } = setup();
    g.down(1, WIDTH / 2, 500, 0);
    expect(log[0]).toEqual(['flipper', 'right', true]);
  });

  it('lets both thumbs flip at once, independently', () => {
    const { g, log } = setup();
    g.down(1, 100, 500, 0);
    g.down(2, 300, 500, 10);
    g.up(1, 100, 500, 100);
    expect(log).toEqual([
      ['flipper', 'left', true],
      ['flipper', 'right', true],
      ['flipper', 'left', false],
    ]);
  });

  it('keeps holding when the finger drifts slowly sideways or upwards', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 40, -40, 1000);
    expect(kinds(log, 'nudge')).toHaveLength(0);
    expect(kinds(log, 'charge')).toHaveLength(0);
    expect(log.filter((e) => e[0] === 'flipper' && e[2] === false)).toHaveLength(0);
    g.up(1, 140, 460, 1000);
    expect(log.at(-1)).toEqual(['flipper', 'left', false]);
  });
});

describe('plunger: slow swipe down', () => {
  it('charges in proportion to how far the finger has dragged', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 0, GESTURE.plungerFullPx / 2, 1500);
    const last = kinds(log, 'charge').at(-1)[1];
    expect(last).toBeCloseTo(0.5, 1);
  });

  it('drops the flipper the touch started on once it becomes a plunger pull', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 0, 80, 1500);
    expect(log).toContainEqual(['flipper', 'left', false]);
    expect(kinds(log, 'nudge')).toHaveLength(0);
  });

  it('launches when the finger lifts', () => {
    const { g, log } = setup();
    drag(g, 1, 300, 500, 0, GESTURE.plungerFullPx, 1500);
    g.up(1, 300, 500 + GESTURE.plungerFullPx, 1500);
    expect(log.at(-1)).toEqual(['release']);
  });

  it('caps the charge at full', () => {
    const { g, log } = setup();
    drag(g, 1, 300, 500, 0, GESTURE.plungerFullPx * 2, 3000);
    expect(Math.max(...kinds(log, 'charge').map((e) => e[1]))).toBe(1);
  });

  it('lowers the charge when the finger comes back up', () => {
    const { g, log } = setup();
    drag(g, 1, 300, 500, 0, 120, 1500);
    const peak = kinds(log, 'charge').at(-1)[1];
    g.move(1, 300, 560, 2500);
    expect(kinds(log, 'charge').at(-1)[1]).toBeLessThan(peak);
  });

  it('does not start before a deliberate downward drag', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 0, GESTURE.plungerStartPx - 6, 800);
    expect(kinds(log, 'charge')).toHaveLength(0);
  });

  it('does not treat a mostly sideways drag as a pull', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 120, 40, 2000);
    expect(kinds(log, 'charge')).toHaveLength(0);
  });

  it('ignores a quick flick back up while pulling, rather than nudging', () => {
    const { g, log } = setup();
    drag(g, 1, 300, 500, 0, 100, 1500, 0);
    g.move(1, 300, 440, 1520);
    g.move(1, 300, 380, 1540);
    expect(kinds(log, 'nudge')).toHaveLength(0);
  });
});

describe('fast swipe: nudge', () => {
  const swipe = (dx, dy, x = 100) => {
    const { g, log } = setup();
    drag(g, 1, x, 500, dx, dy, 120, 0, 6);
    g.up(1, x + dx, 500 + dy, 120);
    return log;
  };

  it('nudges left, right and up', () => {
    expect(kinds(swipe(-150, 0, 300), 'nudge')).toEqual([['nudge', 'left']]);
    expect(kinds(swipe(150, 0, 100), 'nudge')).toEqual([['nudge', 'right']]);
    expect(kinds(swipe(0, -150), 'nudge')).toEqual([['nudge', 'up']]);
  });

  it('picks the dominant direction of a diagonal swipe', () => {
    expect(kinds(swipe(-160, -60), 'nudge')).toEqual([['nudge', 'left']]);
    expect(kinds(swipe(40, -160), 'nudge')).toEqual([['nudge', 'up']]);
  });

  it('nudges once per swipe, as soon as it is clearly a swipe', () => {
    const { g, log } = setup();
    g.down(1, 100, 500, 0);
    g.move(1, 160, 500, 40);
    g.move(1, 220, 500, 80);
    expect(kinds(log, 'nudge')).toEqual([['nudge', 'right']]);
    g.move(1, 300, 500, 120);
    g.up(1, 300, 500, 130);
    expect(kinds(log, 'nudge')).toHaveLength(1);
  });

  it('cancels the flipper under the swiping finger', () => {
    const log = swipe(-150, 0, 300);
    expect(log).toContainEqual(['flipper', 'right', false]);
    expect(log.filter((e) => e[0] === 'flipper' && e[2] === false)).toHaveLength(1);
  });

  it('does not launch the plunger or count a fast swipe down as anything', () => {
    const log = swipe(0, 200);
    expect(kinds(log, 'nudge')).toHaveLength(0);
    expect(kinds(log, 'release')).toHaveLength(0);
    expect(kinds(log, 'charge').filter((e) => e[1] > 0)).toHaveLength(0);
  });

  it('is not triggered by a short flick that goes nowhere', () => {
    const log = swipe(GESTURE.minSwipePx - 10, 0);
    expect(kinds(log, 'nudge')).toHaveLength(0);
  });

  it('separates slow from fast: the same distance slowly is not a nudge', () => {
    const { g, log } = setup();
    drag(g, 1, 100, 500, 150, 0, 2000);
    expect(kinds(log, 'nudge')).toHaveLength(0);
  });

  it('can nudge with one finger while the other holds a flipper', () => {
    const { g, log } = setup();
    g.down(1, 300, 500, 0);
    drag(g, 2, 100, 500, 150, 0, 120, 10, 6);
    expect(kinds(log, 'nudge')).toEqual([['nudge', 'right']]);
    expect(log).not.toContainEqual(['flipper', 'right', false]);
  });
});

describe('cancelled touches', () => {
  it('lets go of a held flipper', () => {
    const { g, log } = setup();
    g.down(1, 100, 500, 0);
    g.cancel(1);
    expect(log.at(-1)).toEqual(['flipper', 'left', false]);
  });

  it('abandons a plunger pull without launching', () => {
    const { g, log } = setup();
    drag(g, 1, 300, 500, 0, 100, 1500);
    g.cancel(1);
    expect(kinds(log, 'release')).toHaveLength(0);
    expect(log.at(-1)).toEqual(['charge', 0]);
  });

  it('ignores events for fingers it never saw', () => {
    const { g, log } = setup();
    g.move(9, 1, 1, 0);
    g.up(9, 1, 1, 0);
    g.cancel(9);
    expect(log).toEqual([]);
  });
});
