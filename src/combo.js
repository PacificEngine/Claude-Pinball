import { emit } from './events.js';
import { addScore } from './score.js';

export const COMBO = { windowSeconds: 2, bonusPerStep: 50 };
// Spinner turns are left out: a spinning spinner would keep the chain alive forever.
const HITS = ['bumper', 'slingshot', 'target', 'rollover', 'wormhole', 'ramp'];

export function comboListener(game, event) {
  if (!HITS.includes(event.type)) return;
  const c = game.combo;
  c.count = c.timer > 0 ? c.count + 1 : 1;
  c.timer = COMBO.windowSeconds;
  if (c.count < 2) return;
  addScore(game, (c.count - 1) * COMBO.bonusPerStep);
  emit(game, 'combo', { count: c.count });
}

export function tickCombo(game, dt) {
  game.combo.timer = Math.max(0, game.combo.timer - dt);
  if (game.combo.timer === 0) game.combo.count = 0;
}

export function resetCombo(game) {
  game.combo.count = 0;
  game.combo.timer = 0;
}
