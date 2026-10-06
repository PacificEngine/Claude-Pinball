import { stepBall, collideCircle, collideSegment } from './physics.js';
import { createFlipper, updateFlipper, collideFlipper } from './flipper.js';
import { createTable } from './table.js';

const GRAVITY = 700;
const SUBSTEPS = 4;
const MAX_SPEED = 1800;
const BALLS_PER_GAME = 3;
const FLIPPER_RESTITUTION = 0.4;
const LIT_SECONDS = 0.15;

export function createGame() {
  const table = createTable();
  const flippers = {};
  for (const f of table.flippers) flippers[f.name] = createFlipper(f);
  const game = {
    table,
    flippers,
    held: { left: false, right: false },
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 9 },
    score: 0,
    ballsLeft: BALLS_PER_GAME,
    plungerCharge: 0,
    phase: 'plunging',
  };
  serveBall(game);
  return game;
}

function serveBall(game) {
  const { x, y } = game.table.plungerStart;
  Object.assign(game.ball, { x, y, vx: 0, vy: 0 });
  game.plungerCharge = 0;
  game.phase = 'plunging';
}

export function restart(game) {
  Object.assign(game, createGame());
}

export function chargePlunger(game, amount) {
  if (game.phase !== 'plunging') return;
  game.plungerCharge = Math.min(1, game.plungerCharge + amount);
}

export function releasePlunger(game) {
  if (game.phase !== 'plunging') return;
  game.ball.vy = -(300 + 900 * game.plungerCharge);
  game.plungerCharge = 0;
  game.phase = 'playing';
}

export function setFlipper(game, name, pressed) {
  game.held[name] = pressed;
}

export function update(game, dt) {
  for (const name of Object.keys(game.flippers)) {
    updateFlipper(game.flippers[name], dt, game.held[name]);
  }
  for (const b of game.table.bumpers) b.litFor = Math.max(0, b.litFor - dt);
  if (game.phase !== 'playing') return;

  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) stepPlayingBall(game, h);

  const { ball, table } = game;
  if (ball.y > table.height + 20) return drainBall(game);
  const restingInLane = ball.x > table.laneLeft && ball.y > table.plungerStart.y - 20 && Math.hypot(ball.vx, ball.vy) < 20;
  if (restingInLane) serveBall(game); // weak plunge: ball fell back, let the player try again
}

function stepPlayingBall(game, h) {
  const { ball, table } = game;
  stepBall(ball, h, GRAVITY);
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx *= MAX_SPEED / speed;
    ball.vy *= MAX_SPEED / speed;
  }

  for (const w of table.walls) {
    const hit = collideSegment(ball, w, w.restitution);
    if (hit && hit.speed > 0) game.score += w.points;
  }
  for (const b of table.bumpers) {
    const hit = collideCircle(ball, b, table.bumperRestitution);
    if (hit && hit.speed > 0) {
      game.score += b.points;
      b.litFor = LIT_SECONDS;
    }
  }
  for (const f of Object.values(game.flippers)) collideFlipper(ball, f, FLIPPER_RESTITUTION);
}

function drainBall(game) {
  game.ballsLeft -= 1;
  if (game.ballsLeft <= 0) {
    game.phase = 'gameover';
    return;
  }
  serveBall(game);
}
