import { describe, it, expect } from 'vitest';
import { createGame } from '../src/game.js';

describe('ramp corridor', () => {
  const corridor = () => {
    const t = createGame().table;
    const ramp = t.portals.find((p) => p.kind === 'ramp');
    return { t, ramp, half: ramp.width / 2, top: ramp.exit.y, bottom: ramp.y };
  };
  const clear = (c, obj, r = 0) => Math.abs(obj.x - c.ramp.x) - r >= c.half || obj.y + r < c.top || obj.y - r > c.bottom;

  it('has nothing the player needs hidden underneath it', () => {
    const c = corridor();
    const objects = [
      ...c.t.bumpers.map((b) => [b, b.r]),
      ...c.t.portals.filter((p) => p.kind !== 'ramp').map((p) => [p, p.r]),
      ...c.t.spinners.map((s) => [s, s.r]),
      ...c.t.rollovers.map((l) => [l, l.r]),
      [c.t.lock, c.t.lock.r],
    ];
    for (const [obj, r] of objects) expect(clear(c, obj, r), JSON.stringify(obj)).toBe(true);
  });

  it('keeps drop targets and solid walls out of the corridor too', () => {
    const c = corridor();
    for (const t of c.t.dropBanks.flatMap((b) => b.targets)) expect(clear(c, { x: t.ax, y: (t.ay + t.by) / 2 })).toBe(true);
  });
});
