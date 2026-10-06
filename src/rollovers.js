import { emit } from './events.js';

export const MULTIPLIERS = [1, 2, 3, 5];

export function checkRollovers(game, ball, addScore) {
  const { rollovers } = game.table;
  for (const lane of rollovers) {
    const inside = Math.hypot(ball.x - lane.x, ball.y - lane.y) < lane.r;
    if (!inside) lane.armed = true; // a lane re-arms only once the ball has left it
    if (!inside || !lane.armed || lane.lit) continue;
    lane.armed = false;
    lane.lit = true;
    addScore(game, lane.points);
    emit(game, 'rollover', { letter: lane.letter, x: lane.x, y: lane.y });
  }
  if (rollovers.every((lane) => lane.lit)) raiseMultiplier(game, rollovers);
}

function raiseMultiplier(game, rollovers) {
  game.multiplierLevel = Math.min(game.multiplierLevel + 1, MULTIPLIERS.length - 1);
  game.multiplier = MULTIPLIERS[game.multiplierLevel];
  for (const lane of rollovers) lane.lit = false;
  emit(game, 'multiplier', { value: game.multiplier });
}

export function resetRollovers(game) {
  game.multiplierLevel = 0;
  game.multiplier = MULTIPLIERS[0];
  for (const lane of game.table.rollovers) lane.lit = false;
}
