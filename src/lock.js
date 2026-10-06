import { emit } from './events.js';

const EJECT_SECONDS = 0.5;
const EJECT_STAGGER_SECONDS = 0.5;
const EJECT_SPEEDS = [
  { vx: -260, vy: 120 },
  { vx: -180, vy: -60 },
];

export function checkLock(game, ball, addScore, serveBall) {
  const { lock } = game.table;
  const alone = game.balls.length === 1;
  if (!alone || ball.transit || ball.portalCooldown > 0) return;
  if (Math.hypot(ball.x - lock.x, ball.y - lock.y) >= lock.r) return;

  lock.locked += 1;
  addScore(game, lock.points);
  emit(game, 'ball-locked', { count: lock.locked, x: lock.x, y: lock.y });
  if (lock.locked < lock.needed) return serveBall(game);
  startMultiball(game, ball, addScore);
}

function startMultiball(game, ball, addScore) {
  const { lock } = game.table;
  lock.locked = 0;
  game.balls.push({ x: lock.x, y: lock.y, vx: 0, vy: 0, r: ball.r });
  game.balls.forEach((b, i) => eject(b, lock, i));
  addScore(game, lock.multiballPoints);
  emit(game, 'multiball', { x: lock.x, y: lock.y });
}

function eject(ball, lock, index) {
  const v = EJECT_SPEEDS[index % EJECT_SPEEDS.length];
  ball.x = lock.x;
  ball.y = lock.y;
  ball.transit = {
    kind: 'lock',
    from: { x: lock.x, y: lock.y },
    to: { x: lock.x, y: lock.y },
    t: 0,
    duration: EJECT_SECONDS + index * EJECT_STAGGER_SECONDS,
    visible: false,
    exit: v,
  };
}
