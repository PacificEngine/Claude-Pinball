import { emit } from './events.js';

const KICK_SPEED = 1100;

// Armed by a completed mission; saves one ball that rolls down the left outlane.
export function armKickbackOnMission(game, event) {
  if (event.type !== 'mission-complete' || game.table.kickback.armed) return;
  game.table.kickback.armed = true;
  emit(game, 'kickback-armed');
}

export function checkKickback(game, ball) {
  const k = game.table.kickback;
  if (!k.armed || Math.hypot(ball.x - k.x, ball.y - k.y) >= k.r) return;
  k.armed = false;
  ball.vx = 0;
  ball.vy = -KICK_SPEED;
  emit(game, 'kickback', { x: k.x, y: k.y });
}
