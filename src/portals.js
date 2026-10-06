import { emit } from './events.js';

const CAPTURE_SECONDS = 0.6;
const MIN_EXIT_SPEED = 250;
// The ramp is entered at the front, moving up the table. It keeps most of the ball's speed:
// a little extra is lost climbing, and a little is regained coming down the far side.
const RAMP_MIN_SPEED = 450;
const RAMP_MIN_ENTRY_COSINE = 0.819; // within about 35 degrees of the ramp's direction
const RAMP_CLIMB_LOSS = 0.15;
const RAMP_DESCENT_GAIN = 0.08;
const RAMP_MIN_SECONDS = 0.15;
const COOLDOWN_SECONDS = 1.0;

// A ball in transit is "off the table": it ignores gravity, walls and bumpers.
// Wormholes hide it; the ramp shows it travelling along the ramp.
export function checkPortals(game, ball, addScore) {
  if (ball.transit || ball.portalCooldown > 0) return;
  for (const p of game.table.portals) {
    if (Math.hypot(ball.x - p.x, ball.y - p.y) >= p.r) continue;
    if (p.kind === 'wormhole') return enterWormhole(game, ball, p, addScore);
    if (p.kind === 'ramp' && entersRampFromFront(ball, p)) return enterRamp(game, ball, p, addScore);
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

// Enter at the front: fast enough, and heading the way the ramp runs.
function entersRampFromFront(ball, ramp) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < RAMP_MIN_SPEED) return false;
  const length = Math.hypot(ramp.exit.x - ramp.x, ramp.exit.y - ramp.y);
  const along = (ball.vx * (ramp.exit.x - ramp.x) + ball.vy * (ramp.exit.y - ramp.y)) / length;
  return along / speed >= RAMP_MIN_ENTRY_COSINE;
}

function enterRamp(game, ball, p, addScore) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const exitSpeed = speed * (1 - RAMP_CLIMB_LOSS) * (1 + RAMP_DESCENT_GAIN);
  const length = Math.hypot(p.exit.x - p.x, p.exit.y - p.y);
  const dir = { x: (p.exit.x - p.x) / length, y: (p.exit.y - p.y) / length };
  ball.transit = {
    kind: 'ramp',
    from: { x: p.x, y: p.y },
    to: { x: p.exit.x, y: p.exit.y },
    t: 0,
    duration: Math.max(RAMP_MIN_SECONDS, length / ((speed + exitSpeed) / 2)),
    visible: true,
    exit: { vx: dir.x * exitSpeed, vy: dir.y * exitSpeed },
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
