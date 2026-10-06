export function stepBall(ball, dt, gravity) {
  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

// Collide the ball with a point-like obstacle of radius `radius` (0 for a segment's
// closest point). `surface` is the obstacle's own velocity at the contact point.
function collideAt(ball, px, py, radius, restitution, surface) {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const minDist = ball.r + radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist) return null;

  const dist = Math.sqrt(distSq);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : -1;
  ball.x = px + nx * minDist;
  ball.y = py + ny * minDist;

  const sv = surface || { vx: 0, vy: 0 };
  const approach = (ball.vx - sv.vx) * nx + (ball.vy - sv.vy) * ny;
  if (approach >= 0) return { nx, ny, speed: 0 };

  const impulse = -(1 + restitution) * approach;
  ball.vx += impulse * nx;
  ball.vy += impulse * ny;
  return { nx, ny, speed: -approach };
}

export function collideCircle(ball, circle, restitution, surface) {
  return collideAt(ball, circle.x, circle.y, circle.r, restitution, surface);
}

export function closestPointOnSegment(seg, x, y) {
  const ex = seg.bx - seg.ax;
  const ey = seg.by - seg.ay;
  const lenSq = ex * ex + ey * ey;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - seg.ax) * ex + (y - seg.ay) * ey) / lenSq));
  return { x: seg.ax + t * ex, y: seg.ay + t * ey };
}

// `thickness` is the half-width of the wall, making the segment a capsule.
export function collideSegment(ball, seg, restitution, surface, thickness = 0) {
  const p = closestPointOnSegment(seg, ball.x, ball.y);
  return collideAt(ball, p.x, p.y, thickness, restitution, surface);
}

// A one-way wall only blocks a ball on the side its normal points to. A ball whose centre
// is on the other side passes straight through (used by the plunger lane gate).
export function isBehindOneWay(ball, wall) {
  if (!wall.oneWay) return false;
  return (ball.x - wall.ax) * wall.oneWay.nx + (ball.y - wall.ay) * wall.oneWay.ny < 0;
}
