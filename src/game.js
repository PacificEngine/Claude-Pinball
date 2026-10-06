import { stepBall, collideCircle, collideSegment, isBehindOneWay } from './physics.js';
import { createFlipper, updateFlipper, collideFlipper } from './flipper.js';
import { createTable } from './table.js';
import { emit, drainEvents } from './events.js';
import { addScore } from './score.js';
import { startMissions, tickBanner } from './missions.js';
import { checkRollovers, resetRollovers, MULTIPLIERS } from './rollovers.js';
import { collideDropTargets, tickDropTargets } from './dropTargets.js';
import { skillShotListener, tickSkillShot } from './skillShot.js';
import { comboListener, tickCombo, resetCombo } from './combo.js';
import { checkSpinners, tickSpinners } from './spinner.js';
import { checkKickback, armKickbackOnMission } from './kickback.js';
import { checkLock } from './lock.js';
import { checkPortals, advanceTransit, tickCooldown } from './portals.js';

export { drainEvents };

const GRAVITY = 700;
const SUBSTEPS = 4;
const MAX_SPEED = 1800;
const BALLS_PER_GAME = 3;
const FLIPPER_RESTITUTION = 0.4;
const LIT_SECONDS = 0.15;

export const BALL_SAVE_SECONDS = 10;

export const TILT = { limit: 5, warnAt: 3, drainPerSecond: 1, nudgeSpeed: 120 };
const NUDGES = {
  left: { vx: -1, vy: 0 },
  right: { vx: 1, vy: 0 },
  up: { vx: 0, vy: -1 },
};
const SHAKE_PIXELS = 6;
const SHAKE_DECAY_PER_SECOND = 30;

export function createGame(layout) {
  const table = createTable(layout);
  const flippers = {};
  for (const f of table.flippers) flippers[f.name] = createFlipper(f);
  const game = {
    layout,
    table,
    flippers,
    held: { left: false, right: false },
    balls: [{ x: 0, y: 0, vx: 0, vy: 0, r: 9 }],
    get ball() {
      return this.balls[0];
    },
    events: [],
    listeners: [],
    score: 0,
    ballsLeft: BALLS_PER_GAME,
    plungerCharge: 0,
    phase: 'plunging',
    ballSave: 0,
    skillShot: 0,
    combo: { count: 0, timer: 0 },
    multiplier: MULTIPLIERS[0],
    multiplierLevel: 0,
    tilt: 0,
    tiltWarning: false,
    tilted: false,
    shake: { x: 0, y: 0 }, // purely visual
  };
  startMissions(game);
  game.listeners.push(armKickbackOnMission, skillShotListener, comboListener);
  serveBall(game);
  game.events.length = 0;
  return game;
}

function serveBall(game) {
  const { x, y } = game.table.plungerStart;
  game.balls.length = 1;
  Object.assign(game.ball, { x, y, vx: 0, vy: 0, portalCooldown: 0 });
  delete game.ball.transit;
  game.plungerCharge = 0;
  game.phase = 'plunging';
  game.tilt = 0;
  game.tiltWarning = false;
  game.tilted = false;
  resetRollovers(game);
  resetCombo(game);
  game.skillShot = 0;
  emit(game, 'ball-served');
}

export function restart(game) {
  Object.defineProperties(game, Object.getOwnPropertyDescriptors(createGame(game.layout)));
}

export function chargePlunger(game, amount) {
  if (game.phase === 'gameover') return;
  game.plungerCharge = Math.min(1, game.plungerCharge + amount);
}

// Touch dragging sets the charge directly, so it can go down as well as up.
export function setPlungerCharge(game, value) {
  if (game.phase === 'gameover') return;
  game.plungerCharge = Math.max(0, Math.min(1, value));
}

// The plunger can be pulled at any time and launches whatever is resting in its lane.
// Only a fresh serve starts the ball save and the skill shot.
export function releasePlunger(game) {
  if (game.phase === 'gameover') return;
  const speed = 300 + 900 * game.plungerCharge;
  game.plungerCharge = 0;

  if (game.phase === 'plunging') {
    game.ball.vy = -speed;
    game.phase = 'playing';
    game.ballSave = BALL_SAVE_SECONDS;
    emit(game, 'launch', { fresh: true });
    return;
  }

  const { laneLeft, plungerStart } = game.table;
  const inLane = game.balls.filter((b) => !b.transit && b.x > laneLeft && b.y > plungerStart.y - 25);
  if (inLane.length === 0) return;
  for (const b of inLane) {
    b.vx = 0;
    b.vy = -speed;
  }
  emit(game, 'launch', { fresh: false });
}

export function setFlipper(game, name, pressed) {
  if (game.held[name] === pressed) return;
  game.held[name] = pressed;
  if (pressed) emit(game, 'flipper', { name });
}

export function nudge(game, direction) {
  if (game.phase !== 'playing' || game.tilted) return;
  const { vx, vy } = NUDGES[direction];
  game.ball.vx += vx * TILT.nudgeSpeed;
  game.ball.vy += vy * TILT.nudgeSpeed;
  game.shake.x = vx * SHAKE_PIXELS;
  game.shake.y = vy * SHAKE_PIXELS;
  game.tilt += 1;
  emit(game, 'nudge', { direction });
  if (game.tilt >= TILT.warnAt && !game.tiltWarning) emit(game, 'tilt-warning');
  game.tiltWarning = game.tilt >= TILT.warnAt;
  if (game.tilt >= TILT.limit) {
    game.tilted = true;
    emit(game, 'tilt');
  }
}

function decayShake(shake, dt) {
  const keep = Math.max(0, 1 - SHAKE_DECAY_PER_SECOND * dt);
  shake.x *= keep;
  shake.y *= keep;
}

export function update(game, dt) {
  for (const f of game.table.flippers) {
    const button = f.follows || f.name;
    updateFlipper(game.flippers[f.name], dt, game.held[button] && !game.tilted);
  }
  if (game.phase === 'playing') game.ballSave = Math.max(0, game.ballSave - dt);
  game.tilt = Math.max(0, game.tilt - TILT.drainPerSecond * dt);
  game.tiltWarning = game.tilt >= TILT.warnAt;
  decayShake(game.shake, dt);
  tickDropTargets(game, dt);
  tickBanner(game, dt);
  tickSpinners(game, dt, addScore);
  tickSkillShot(game, dt);
  tickCombo(game, dt);
  for (const b of game.table.bumpers) b.litFor = Math.max(0, b.litFor - dt);
  if (game.phase !== 'playing') return;

  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    for (const ball of game.balls) stepPlayingBall(game, ball, h);
  }

  const { table } = game;
  for (const ball of [...game.balls]) {
    if (!ball.transit && ball.y > table.height + 20) drainBall(game, ball);
  }
}

function stepPlayingBall(game, ball, h) {
  const { table } = game;
  tickCooldown(ball, h);
  if (advanceTransit(ball, h)) return;
  stepBall(ball, h, GRAVITY);
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx *= MAX_SPEED / speed;
    ball.vy *= MAX_SPEED / speed;
  }

  for (const w of table.walls) {
    if (isBehindOneWay(ball, w)) continue;
    const hit = collideSegment(ball, w, w.restitution);
    if (hit && hit.speed > 0 && w.points) {
      addScore(game, w.points);
      emit(game, 'slingshot', { x: ball.x, y: ball.y });
    }
  }
  for (const b of table.bumpers) {
    const hit = collideCircle(ball, b, table.bumperRestitution);
    if (hit && hit.speed > 0) {
      addScore(game, b.points);
      b.litFor = LIT_SECONDS;
      emit(game, 'bumper', { x: b.x, y: b.y });
    }
  }
  for (const f of Object.values(game.flippers)) collideFlipper(ball, f, FLIPPER_RESTITUTION);
  collideDropTargets(game, ball, addScore);
  checkSpinners(game, ball);
  checkKickback(game, ball);
  checkLock(game, ball, addScore, serveBall);
  checkPortals(game, ball, addScore);
  checkRollovers(game, ball, addScore);
}

function drainBall(game, ball) {
  if (game.balls.length > 1) {
    game.balls.splice(game.balls.indexOf(ball), 1);
    emit(game, 'drain', { multiball: true });
    if (game.balls.length === 1) emit(game, 'multiball-end');
    return;
  }
  if (game.ballSave > 0) {
    game.ballSave = 0;
    emit(game, 'ball-saved');
    return serveBall(game);
  }
  game.ballsLeft -= 1;
  emit(game, 'drain');
  if (game.ballsLeft <= 0) {
    game.phase = 'gameover';
    emit(game, 'game-over');
    return;
  }
  serveBall(game);
}
