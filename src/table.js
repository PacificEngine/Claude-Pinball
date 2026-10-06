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

  wall(10, 300, 10, 610); // left wall
  wall(590, 300, 590, 775); // right wall (outside the plunger lane)
  wall(550, 340, 550, 775); // plunger lane divider
  wall(550, 775, 590, 775); // plunger lane floor

  // Slingshots kick the ball back out and score a little.
  wall(45, 500, 125, 590, { restitution: 1.3, points: 10 });
  wall(515, 500, 435, 590, { restitution: 1.3, points: 10 });

  const bumpers = [
    { x: 200, y: 230, r: 28, points: 100, litFor: 0 },
    { x: 380, y: 230, r: 28, points: 100, litFor: 0 },
    { x: 290, y: 340, r: 28, points: 100, litFor: 0 },
  ];

  const flippers = [
    { name: 'left', x: 170, y: 700, length: 90, side: 1 },
    { name: 'right', x: 390, y: 700, length: 90, side: -1 },
  ];
  const guides = [inlaneGuide(flippers[0], 10), inlaneGuide(flippers[1], 550)];
  for (const g of guides) wall(g.ax, g.ay, g.bx, g.by);

  return {
    width,
    height,
    laneLeft: 550,
    plungerStart: { x: 570, y: 755 },
    walls,
    bumpers,
    bumperRestitution: 1.4,
    flippers,
  };
}
