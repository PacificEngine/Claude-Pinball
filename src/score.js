// Bonus rewards (missions) skip the multiplier with `raw`. Nothing scores while tilted.
export function addScore(game, points, { raw = false } = {}) {
  if (!game.tilted) game.score += raw ? points : points * game.multiplier;
}
