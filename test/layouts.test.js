import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createTable } from '../src/table.js';
import { classicLayout } from '../src/layouts/classic.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/classicTable.json', import.meta.url)));
const r = (n) => Math.round(n * 1000) / 1000;
// A wall is the same wall whichever end is listed first.
const wallKey = (w) => {
  const a = [r(w.ax), r(w.ay)];
  const b = [r(w.bx), r(w.by)];
  const [p, q] = [a, b].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const gate = w.oneWay ? [r(w.oneWay.nx), r(w.oneWay.ny)] : null;
  return JSON.stringify([p, q, w.restitution, w.points, gate]);
};
const round = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'number' ? r(x) : x)));

describe('classic layout', () => {
  const t = createTable(classicLayout);

  it('builds exactly the table the game shipped with', () => {
    expect(t.walls.map(wallKey).sort()).toEqual(golden.walls.map(wallKey).sort());
    expect(round(t.bumpers)).toEqual(golden.bumpers);
    expect(round(t.flippers)).toEqual(golden.flippers);
    expect(round(t.spinners)).toEqual(golden.spinners);
    expect(round(t.lock)).toEqual(golden.lock);
    expect(round(t.kickback)).toEqual(golden.kickback);
    expect(round(t.rollovers)).toEqual(golden.rollovers);
    expect(round(t.dropBanks[0].targets)).toEqual(golden.dropTargets);
    expect(t.dropBanks[0].bonus).toBe(golden.dropBonus);
  });

  it('keeps the same portals (apart from the funnel the layout now describes)', () => {
    const strip = ({ funnel, ...p }) => p;
    expect(round(t.portals.map(strip))).toEqual(golden.portals);
  });

  it('is what createTable builds by default', () => {
    expect(createTable().walls.map(wallKey).sort()).toEqual(t.walls.map(wallKey).sort());
  });
});
