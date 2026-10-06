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
  wall(10, 610, 170, 700); // left inlane guide
  wall(550, 610, 390, 700); // right inlane guide

  // Slingshots kick the ball back out and score a little.
  wall(45, 500, 125, 590, { restitution: 1.3, points: 10 });
  wall(515, 500, 435, 590, { restitution: 1.3, points: 10 });

  const bumpers = [
    { x: 200, y: 230, r: 28, points: 100, litFor: 0 },
    { x: 380, y: 230, r: 28, points: 100, litFor: 0 },
    { x: 290, y: 340, r: 28, points: 100, litFor: 0 },
  ];

  return {
    width,
    height,
    laneLeft: 550,
    plungerStart: { x: 570, y: 755 },
    walls,
    bumpers,
    bumperRestitution: 1.4,
    flippers: [
      { name: 'left', x: 170, y: 700, length: 90, side: 1 },
      { name: 'right', x: 390, y: 700, length: 90, side: -1 },
    ],
  };
}
