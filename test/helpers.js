import { comboListener } from '../src/combo.js';

// Tests that assert exact scores from rapid-fire events switch the combo rule off.
export function withoutCombo(game) {
  game.listeners = game.listeners.filter((l) => l !== comboListener);
  return game;
}
