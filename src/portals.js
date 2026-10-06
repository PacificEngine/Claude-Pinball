import { emit } from './events.js';

const CAPTURE_SECONDS = 0.6;
const RAMP_SECONDS = 1.0;
const MIN_EXIT_SPEED = 250;
const RAMP_MIN_UPWARD_SPEED = 150;
const RAMP_EXIT_SPEED = 150;
const COOLDOWN_SECONDS = 1.0;

// A ball in transit is "off the table": it ignores gravity, walls and bumpers.
// Wormholes hide it; the ramp shows it travelling along the ramp.
export function checkPortals(game, ball, addScore) {
  if (ball.transit || ball.portalCooldown > 0) return;
  for (const p of game.table.portals) {
    if (Math.hypot(ball.x - p.x, ball.y - p.y) >= p.r) continue;
    if (p.kind === 'wormhole') return enterWormhole(game, ball, p, addScore);
    if (p.kind === 'ramp' && ball.vy < -RAMP_MIN_UPWARD_SPEED) return enterRamp(game, ball, p, addScore);
  }
}

function enterWormhole(game, ball, p, addScore) {
  const dest = game.table.portals.find((q) => q.id === p.to);
  const speed = Math.hypot(ball.vx, ball.vy);
  const dir = speed > 0 ? { x: ball.vx / speed, y: ball.vy / speed } : { x: 0, y: 1 };
  const exitSpeed = Math.max(speed, MIN_EXIT_SPEED);
  ball.x = p.x;
  ball.y = p.y;
  ball.transit = {
    kind: 'wormhole',
    from: { x: p.x, y: p.y },
    to: { x: dest.x, y: dest.y },
    t: 0,
    duration: CAPTURE_SECONDS,
    visible: false,
    exit: { vx: dir.x * exitSpeed, vy: dir.y * exitSpeed },
  };
  addScore(game, p.points);
  emit(game, 'wormhole', { x: p.x, y: p.y, toX: dest.x, toY: dest.y });
}

function enterRamp(game, ball, p, addScore) {
  ball.transit = {
    kind: 'ramp',
    from: { x: p.x, y: p.y },
    to: { x: p.exit.x, y: p.exit.y },
    t: 0,
    duration: RAMP_SECONDS,
    visible: true,
    exit: { vx: 0, vy: RAMP_EXIT_SPEED },
  };
  addScore(game, p.points);
  emit(game, 'ramp', { x: p.x, y: p.y });
}

export function tickCooldown(ball, dt) {
  if (ball.portalCooldown > 0) ball.portalCooldown = Math.max(0, ball.portalCooldown - dt);
}

// Returns true while the ball is still travelling.
export function advanceTransit(ball, dt) {
  const tr = ball.transit;
  if (!tr) return false;
  tr.t += dt;
  const f = Math.min(1, tr.t / tr.duration);
  if (tr.visible) {
    ball.x = tr.from.x + (tr.to.x - tr.from.x) * f;
    ball.y = tr.from.y + (tr.to.y - tr.from.y) * f;
  }
  if (f < 1) return true;
  ball.x = tr.to.x;
  ball.y = tr.to.y;
  ball.vx = tr.exit.vx;
  ball.vy = tr.exit.vy;
  ball.portalCooldown = COOLDOWN_SECONDS;
  delete ball.transit;
  return false;
}
