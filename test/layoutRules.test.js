import { describe, it, expect } from 'vitest';
import { LAYOUTS } from '../src/layouts/index.js';
import { createGame, update, chargePlunger, releasePlunger, setFlipper, drainEvents } from '../src/game.js';
import { closestPointOnSegment } from '../src/physics.js';

const BALL = 18; // ball diameter: a gap narrower than this is a trap
const arch = { cx: 300, cy: 300, r: 290 };

const distSeg = (seg, x, y) => {
  const p = closestPointOnSegment(seg, x, y);
  return Math.hypot(x - p.x, y - p.y);
};

// Everything on the table that occupies space, as circles or segments.
function furniture(t) {
  const circles = [
    ...t.bumpers.map((b, i) => ({ name: `bumper${i}`, x: b.x, y: b.y, r: b.r })),
    ...t.portals.filter((p) => p.kind !== 'ramp').map((p) => ({ name: p.id, x: p.x, y: p.y, r: p.r })),
    ...t.spinners.map((s, i) => ({ name: `spinner${i}`, x: s.x, y: s.y, r: s.r })),
    { name: 'lock', x: t.lock.x, y: t.lock.y, r: t.lock.r },
    ...t.rollovers.map((l) => ({ name: `rollover${l.letter}`, x: l.x, y: l.y, r: l.r })),
    { name: 'kickback', x: t.kickback.x, y: t.kickback.y, r: t.kickback.r },
  ];
  const targets = t.dropBanks.flatMap((b, bi) => b.targets.map((s, i) => ({ name: `bank${bi}.${i}`, ...s })));
  return { circles, targets };
}

// Walls that exist to shape the table, not the shared boundary the objects sit inside.
const isSolid = (w) => !w.oneWay;

describe.each(LAYOUTS)('layout $id', (layout) => {
  const game = createGame(layout);
  const t = game.table;
  const { circles, targets } = furniture(t);
  const ramp = t.portals.find((p) => p.kind === 'ramp');

  it('has exactly one ramp and wormholes that are paired both ways', () => {
    expect(t.portals.filter((p) => p.kind === 'ramp')).toHaveLength(1);
    expect(new Set(t.portals.map((p) => p.id)).size).toBe(t.portals.length);
    for (const p of t.portals.filter((q) => q.kind === 'wormhole')) {
      expect(t.portals.find((q) => q.id === p.to).to).toBe(p.id);
    }
  });

  it('keeps everything inside the playfield', () => {
    for (const c of circles.filter((x) => x.name !== 'kickback')) {
      const inArch = Math.hypot(c.x - arch.cx, c.y - arch.cy) <= arch.r - c.r || c.y >= arch.cy;
      expect(inArch, c.name).toBe(true);
      expect(c.x - c.r, c.name).toBeGreaterThanOrEqual(10);
      expect(c.x + c.r, c.name).toBeLessThanOrEqual(550);
    }
  });

  it('leaves a ball-sized gap between any two round objects', () => {
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
        expect(gap, `${a.name} / ${b.name}`).toBeGreaterThanOrEqual(BALL);
      }
    }
  });

  it('keeps round objects clear of walls, so a ball cannot be pinched', () => {
    for (const c of circles.filter((x) => !x.name.startsWith('rollover') && x.name !== 'kickback')) {
      for (const w of t.walls.filter(isSolid)) {
        expect(distSeg(w, c.x, c.y) - c.r, `${c.name} / wall ${Math.round(w.ax)},${Math.round(w.ay)}`).toBeGreaterThanOrEqual(BALL - 6);
      }
    }
  });

  it('keeps drop targets clear of everything round and of walls', () => {
    for (const s of targets) {
      for (const c of circles) {
        expect(distSeg(s, c.x, c.y) - c.r, `${s.name} / ${c.name}`).toBeGreaterThanOrEqual(BALL - 6);
      }
      for (const w of t.walls.filter(isSolid)) {
        const gap = Math.min(distSeg(w, s.ax, s.ay), distSeg(w, s.bx, s.by), distSeg(s, w.ax, w.ay), distSeg(s, w.bx, w.by));
        expect(gap, `${s.name} / wall ${Math.round(w.ax)},${Math.round(w.ay)}`).toBeGreaterThanOrEqual(BALL - 6);
      }
    }
  });

  it('keeps the ramp corridor clear, so nothing is hidden under it', () => {
    const half = ramp.width / 2;
    const seg = { ax: ramp.x, ay: ramp.y, bx: ramp.exit.x, by: ramp.exit.y };
    for (const c of circles.filter((x) => x.name !== 'kickback')) {
      expect(distSeg(seg, c.x, c.y) - c.r, c.name).toBeGreaterThanOrEqual(half);
    }
    for (const s of targets) {
      for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by], [(s.ax + s.bx) / 2, (s.ay + s.by) / 2]]) {
        expect(distSeg(seg, x, y), s.name).toBeGreaterThanOrEqual(half);
      }
    }
  });

  it('lets a full plunger launch out onto the playfield', () => {
    const g = createGame(layout);
    chargePlunger(g, 1);
    releasePlunger(g);
    for (let i = 0; i < 120 * 5; i++) update(g, 1 / 120);
    expect(g.balls[0].x).toBeLessThan(g.table.laneLeft);
  });

  it('can award the skill shot at some launch strength', () => {
    let found = false;
    for (let c = 0.5; c <= 1.0001 && !found; c += 0.01) {
      const g = createGame(layout);
      chargePlunger(g, c);
      releasePlunger(g);
      for (let i = 0; i < 120 * 5 && !found; i++) {
        update(g, 1 / 120);
        found = drainEvents(g).some((e) => e.type === 'skill-shot');
      }
    }
    expect(found).toBe(true);
  });

  it('has a ramp that a ball shot along its direction can enter and leave by the back', () => {
    const g = createGame(layout);
    g.phase = 'playing';
    const len = Math.hypot(ramp.exit.x - ramp.x, ramp.exit.y - ramp.y);
    const dir = { x: (ramp.exit.x - ramp.x) / len, y: (ramp.exit.y - ramp.y) / len };
    Object.assign(g.ball, { x: ramp.x - dir.x * 110, y: ramp.y - dir.y * 110, vx: dir.x * 1000, vy: dir.y * 1000 });
    let entered = false;
    for (let i = 0; i < 120 * 1.5; i++) {
      update(g, 1 / 120);
      if (drainEvents(g).some((e) => e.type === 'ramp')) entered = true;
    }
    expect(entered).toBe(true);
    expect(g.balls[0].transit).toBeFalsy();
  });

  it('ignores a ball arriving at the ramp from the wrong way', () => {
    const g = createGame(layout);
    g.phase = 'playing';
    const len = Math.hypot(ramp.exit.x - ramp.x, ramp.exit.y - ramp.y);
    const dir = { x: (ramp.exit.x - ramp.x) / len, y: (ramp.exit.y - ramp.y) / len };
    Object.assign(g.ball, { x: ramp.x, y: ramp.y, vx: -dir.x * 1000, vy: -dir.y * 1000 });
    update(g, 1 / 120);
    expect(g.ball.transit).toBeFalsy();
  });

  it('has upper flippers that follow the button they are wired to', () => {
    for (const f of layout.upperFlippers) {
      for (const button of ['left', 'right']) {
        const g = createGame(layout);
        g.phase = 'playing';
        const rest = g.flippers[f.name].angle;
        setFlipper(g, button, true);
        for (let i = 0; i < 30; i++) {
          Object.assign(g.ball, { x: 300, y: 600, vx: 0, vy: 0 });
          update(g, 1 / 120);
        }
        const moved = g.flippers[f.name].angle !== rest;
        expect(moved, `${f.name} with ${button}`).toBe(button === f.follows);
      }
    }
  });

  it('never leaves a ball stuck in 60 random games', () => {
    let seed = 99;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const stuck = [];
    for (let n = 0; n < 60; n++) {
      const g = createGame(layout);
      chargePlunger(g, 0.6 + rand() * 0.4);
      releasePlunger(g);
      let still = 0;
      for (let step = 0; step < 120 * 40 && g.phase === 'playing'; step++) {
        if (step % 15 === 0) {
          setFlipper(g, 'left', rand() < 0.5);
          setFlipper(g, 'right', rand() < 0.5);
        }
        update(g, 1 / 120);
        const b = g.balls[0];
        expect(b.x, 'ball x').toBeGreaterThan(0);
        expect(b.x, 'ball x').toBeLessThan(g.table.width);
        expect(b.y, 'ball y').toBeGreaterThan(0);
        still = !b.transit && Math.hypot(b.vx, b.vy) < 15 && b.x < g.table.laneLeft ? still + 1 : 0;
        if (still === 360) {
          stuck.push(`${Math.round(b.x)},${Math.round(b.y)}`);
          break;
        }
        drainEvents(g);
      }
    }
    expect(stuck).toEqual([]);
  });
});
