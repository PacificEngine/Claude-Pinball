import { emit } from './events.js';

const MIN_BALL_SPEED = 60;
const TURNS_PER_SECOND_PER_SPEED = 0.02;
const MAX_TURNS_PER_SECOND = 14;
const FRICTION_PER_SECOND = 0.5;
const STOP_BELOW = 0.2;

export function checkSpinners(game, ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < MIN_BALL_SPEED) return;
  for (const s of game.table.spinners) {
    if (Math.hypot(ball.x - s.x, ball.y - s.y) >= s.r) continue;
    s.velocity = Math.max(s.velocity, Math.min(MAX_TURNS_PER_SECOND, speed * TURNS_PER_SECOND_PER_SPEED));
  }
}

export function tickSpinners(game, dt, addScore) {
  for (const s of game.table.spinners) {
    if (s.velocity === 0) continue;
    const before = Math.floor(s.turns);
    s.turns += s.velocity * dt;
    for (let i = before; i < Math.floor(s.turns); i++) {
      addScore(game, s.points);
      emit(game, 'spinner', { x: s.x, y: s.y });
    }
    s.velocity *= Math.pow(FRICTION_PER_SECOND, dt);
    if (s.velocity < STOP_BELOW) s.velocity = 0;
  }
}
