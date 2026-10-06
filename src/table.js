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

// Table layout as plain data. New features (ramps, targets, missions) can be added
// here without touching the physics.
export function createTable() {
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

  // Orbit rails: arcs just inside the arch, with a wide gap at the top. A hard-hit ball
  // rides the channel between rail and arch; a soft one drops into the gap.
  const orbit = (from, to, steps) => {
    for (let i = 0; i < steps; i++) {
      const a0 = from + ((to - from) * i) / steps;
      const a1 = from + ((to - from) * (i + 1)) / steps;
      const r = 250;
      wall(arch.cx + r * Math.cos(a0), arch.cy + r * Math.sin(a0), arch.cx + r * Math.cos(a1), arch.cy + r * Math.sin(a1));
    }
  };
  orbit(Math.PI + 0.35, Math.PI + 0.9, 6);
  orbit(2 * Math.PI - 0.9, 2 * Math.PI - 0.35, 6);

  wall(10, 300, 10, 800); // left wall, running down past the outlane to the drain
  wall(590, 300, 590, 775); // right wall (outside the plunger lane)
  wall(550, 340, 550, 775); // plunger lane divider
  wall(550, 775, 590, 775); // plunger lane floor

  // Outlane dividers: the lane between wall and divider drains (the left one can kick back).
  wall(45, 525, 45, 625);
  wall(515, 525, 515, 625);

  // Slingshots kick the ball back out and score a little.
  wall(68, 490, 128, 592, { restitution: 1.3, points: 10 });
  wall(492, 490, 432, 592, { restitution: 1.3, points: 10 });

  // A funnel in front of the ramp makes its entrance easier to hit.
  wall(215, 545, 260, 495);
  wall(345, 545, 300, 495);

  const bumpers = [
    { x: 225, y: 215, r: 26, points: 100, litFor: 0 },
    { x: 335, y: 215, r: 26, points: 100, litFor: 0 },
    { x: 280, y: 290, r: 26, points: 100, litFor: 0 },
  ];

  const flippers = [
    { name: 'left', x: 170, y: 700, length: 90, side: 1 },
    { name: 'right', x: 390, y: 700, length: 90, side: -1 },
    // Controlled by the left button, so one press works both left flippers.
    { name: 'upperLeft', follows: 'left', x: 30, y: 410, length: 60, side: 1 },
  ];
  const guides = [inlaneGuide(flippers[0], 45), inlaneGuide(flippers[1], 515), inlaneGuide(flippers[2], 10)];
  for (const g of guides) wall(g.ax, g.ay, g.bx, g.by);

  const portals = [
    { id: 'w1', kind: 'wormhole', x: 90, y: 250, r: 16, to: 'w2', points: 250 },
    { id: 'w2', kind: 'wormhole', x: 500, y: 440, r: 16, to: 'w1', points: 250 },
    { id: 'w3', kind: 'wormhole', x: 485, y: 250, r: 16, to: 'w4', points: 250 },
    { id: 'w4', kind: 'wormhole', x: 170, y: 440, r: 16, to: 'w3', points: 250 },
    { id: 'ramp', kind: 'ramp', x: 280, y: 470, r: 20, exit: { x: 280, y: 120 }, points: 500 },
  ];

  const rollovers = ['A', 'B', 'C'].map((letter, i) => ({
    letter, x: 210 + i * 70, y: 70, r: 12, points: 100, lit: false, armed: true,
  }));

  const dropBank = {
    bonus: 1000,
    resetSeconds: 1,
    resetIn: 0,
    targets: [300, 335, 370].map((y) => ({ ax: 130, ay: y, bx: 130, by: y + 28, points: 50, standing: true })),
  };

  const lock = { x: 505, y: 330, r: 16, locked: 0, needed: 2, points: 1000, multiballPoints: 5000 };
  const kickback = { x: 27.5, y: 700, r: 14, armed: false };
  const spinners = [{ x: 160, y: 150, r: 14, points: 10, turns: 0, velocity: 0 }];

  return {
    width,
    spinners,
    kickback,
    lock,
    dropBank,
    portals,
    rollovers,
    height,
    laneLeft: 550,
    plungerStart: { x: 570, y: 755 },
    walls,
    bumpers,
    bumperRestitution: 1.4,
    flippers,
  };
}
