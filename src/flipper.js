import { collideSegment, closestPointOnSegment } from './physics.js';

export const REST_ANGLE = 0.5;
const ACTIVE_ANGLE = -0.5;
const SWING_SPEED = 18; // radians per second
export const FLIPPER_THICKNESS = 6;
const THICKNESS = FLIPPER_THICKNESS;

// side: 1 for a flipper pivoting on the left (points right), -1 for the mirror image.
export function createFlipper({ x, y, length, side }) {
  return { x, y, length, side, angle: REST_ANGLE, angularVelocity: 0 };
}

export function updateFlipper(f, dt, pressed) {
  const target = pressed ? ACTIVE_ANGLE : REST_ANGLE;
  const step = SWING_SPEED * dt;
  const diff = target - f.angle;
  if (Math.abs(diff) <= step) {
    f.angularVelocity = 0;
    f.angle = target;
    return;
  }
  const dir = Math.sign(diff);
  f.angle += dir * step;
  f.angularVelocity = dir * SWING_SPEED;
}

function direction(f) {
  return { dx: f.side * Math.cos(f.angle), dy: Math.sin(f.angle) };
}

export function flipperSegment(f) {
  const { dx, dy } = direction(f);
  return { ax: f.x, ay: f.y, bx: f.x + dx * f.length, by: f.y + dy * f.length };
}

export function collideFlipper(ball, f, restitution) {
  const seg = flipperSegment(f);
  const p = closestPointOnSegment(seg, ball.x, ball.y);
  const rx = p.x - f.x;
  const ry = p.y - f.y;
  // v = ω × r in screen coordinates (y down). Mirroring the flipper flips the
  // direction an increasing angle turns, hence the factor of `side`.
  const w = f.angularVelocity * f.side;
  const surface = { vx: -w * ry, vy: w * rx };
  return collideSegment(ball, seg, restitution, surface, THICKNESS);
}
