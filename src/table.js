import { REST_ANGLE, FLIPPER_THICKNESS } from './flipper.js';

// An inlane guide runs flush with the top surface of its flipper at rest. Ending it at
// the pivot's centre line instead leaves a lip that can wedge the ball.
function inlaneGuide(flipper, wallX) {
  const dx = flipper.side * Math.cos(REST_ANGLE); // flipper direction at rest
  const dy = Math.sin(REST_ANGLE);
  const ax = flipper.x - flipper.side * Math.sin(REST_ANGLE) * FLIPPER_THICKNESS;
  const ay = flipper.y - Math.cos(REST_ANGLE) * FLIPPER_THICKNESS;
  const t = (wallX - ax) / -dx; // walk back up the flipper's line until the wall
  return { ax: wallX, ay: ay - dy * t, bx: ax, by: ay };
}

import { classicLayout } from './layouts/classic.js';

const ORBIT_RADIUS = 250;
const FUNNEL = { restitution: 0.5 };

// Walls flaring out below a ramp entrance make it easier to hit. Everything is derived from
// the ramp's own direction, so the ramp may run at any angle.
function rampDirection(ramp) {
  const length = Math.hypot(ramp.exit.x - ramp.x, ramp.exit.y - ramp.y);
  return { dx: (ramp.exit.x - ramp.x) / length, dy: (ramp.exit.y - ramp.y) / length, length };
}

function funnelWalls(ramp) {
  const { dx, dy } = rampDirection(ramp);
  const nx = -dy;
  const ny = dx;
  const { offset, length, flare } = ramp.funnel;
  const half = ramp.width / 2;
  return [-1, 1].map((side) => {
    const top = { x: ramp.x - dx * offset + nx * side * half, y: ramp.y - dy * offset + ny * side * half };
    const bottom = {
      x: ramp.x - dx * (offset + length) + nx * side * (half + flare),
      y: ramp.y - dy * (offset + length) + ny * side * (half + flare),
    };
    return { ax: top.x, ay: top.y, bx: bottom.x, by: bottom.y, ...FUNNEL };
  });
}

// Table as plain data, built from the shared base plus a layout. New features can be added
// here without touching the physics.
export function createTable(layout = classicLayout) {
  const width = 600;
  const height = 800;
  const walls = [];
  const wall = (ax, ay, bx, by, extra = {}) => walls.push({ ax, ay, bx, by, restitution: 0.5, points: 0, ...extra });

  // Top arch: a semicircle from the left wall over to the right wall.
  const arch = { cx: 300, cy: 300, r: 290, segments: 28 };
  for (let i = 0; i < arch.segments; i++) {
    const a0 = Math.PI + (Math.PI * i) / arch.segments;
    const a1 = Math.PI + (Math.PI * (i + 1)) / arch.segments;
    wall(
      arch.cx + arch.r * Math.cos(a0), arch.cy + arch.r * Math.sin(a0),
      arch.cx + arch.r * Math.cos(a1), arch.cy + arch.r * Math.sin(a1),
    );
  }

  for (const rail of layout.orbit) {
    for (let i = 0; i < rail.steps; i++) {
      const a0 = rail.from + ((rail.to - rail.from) * i) / rail.steps;
      const a1 = rail.from + ((rail.to - rail.from) * (i + 1)) / rail.steps;
      wall(
        arch.cx + ORBIT_RADIUS * Math.cos(a0), arch.cy + ORBIT_RADIUS * Math.sin(a0),
        arch.cx + ORBIT_RADIUS * Math.cos(a1), arch.cy + ORBIT_RADIUS * Math.sin(a1),
      );
    }
  }

  wall(10, 300, 10, 800); // left wall, running down past the outlane to the drain
  wall(590, 300, 590, 775); // right wall (outside the plunger lane)
  wall(550, 340, 550, 775); // plunger lane divider
  wall(550, 775, 590, 775); // plunger lane floor
  // Gate across the top of the lane: a launched ball passes up through it, but a ball coming
  // back down from the playfield rolls off it instead of dropping into the plunger lane.
  const gateNormal = { nx: -Math.SQRT1_2, ny: -Math.SQRT1_2 };
  wall(550, 340, 590, 300, { oneWay: gateNormal });

  // Outlane dividers: the lane between wall and divider drains (the left one can kick back).
  wall(45, 525, 45, 625);
  wall(515, 525, 515, 625);

  // Slingshots kick the ball back out and score a little.
  wall(68, 490, 128, 592, { restitution: 1.3, points: 10 });
  wall(492, 490, 432, 592, { restitution: 1.3, points: 10 });

  const portals = layout.portals.map((p) => ({
    r: p.kind === 'ramp' ? 20 : 16,
    points: p.kind === 'ramp' ? 500 : 250,
    ...p,
  }));
  for (const ramp of portals.filter((p) => p.kind === 'ramp')) {
    for (const f of funnelWalls(ramp)) wall(f.ax, f.ay, f.bx, f.by, { restitution: f.restitution });
  }

  const bumpers = layout.bumpers.map((b) => ({ points: 100, litFor: 0, ...b }));

  const flippers = [
    { name: 'left', x: 170, y: 700, length: 90, side: 1 },
    { name: 'right', x: 390, y: 700, length: 90, side: -1 },
    // Controlled by a main button, so one press works both flippers on that side.
    ...layout.upperFlippers.map(({ guideWallX, ...f }) => f),
  ];
  const guides = [inlaneGuide(flippers[0], 45), inlaneGuide(flippers[1], 515)];
  layout.upperFlippers.forEach((f, i) => guides.push(inlaneGuide(flippers[2 + i], f.guideWallX)));
  for (const g of guides) wall(g.ax, g.ay, g.bx, g.by);

  const rollovers = ['A', 'B', 'C'].map((letter, i) => ({
    letter, x: 210 + i * 70, y: 70, r: 12, points: 100, lit: false, armed: true,
  }));

  const dropBanks = layout.dropBanks.map((bank) => ({
    bonus: 1000,
    resetSeconds: 1,
    resetIn: 0,
    targets: bank.ys.map((y) => ({ ax: bank.x, ay: y, bx: bank.x, by: y + 28, points: 50, standing: true })),
  }));

  const lock = { r: 16, locked: 0, needed: 2, points: 1000, multiballPoints: 5000, ...layout.lock };
  const kickback = { x: 27.5, y: 700, r: 14, armed: false };
  const spinners = layout.spinners.map((s) => ({ r: 14, points: 10, turns: 0, velocity: 0, ...s }));

  return {
    layoutId: layout.id,
    width,
    height,
    spinners,
    kickback,
    lock,
    dropBanks,
    portals,
    rollovers,
    laneLeft: 550,
    plungerStart: { x: 570, y: 755 },
    walls,
    bumpers,
    bumperRestitution: 1.4,
    flippers,
  };
}
