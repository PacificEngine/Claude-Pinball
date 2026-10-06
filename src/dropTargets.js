import { collideSegment } from './physics.js';
import { emit } from './events.js';

const THICKNESS = 3;
const RESTITUTION = 0.5;

export function collideDropTargets(game, ball, addScore) {
  for (const bank of game.table.dropBanks) collideBank(game, bank, ball, addScore);
}

function collideBank(game, bank, ball, addScore) {
  for (const t of bank.targets) {
    if (!t.standing) continue;
    const hit = collideSegment(ball, t, RESTITUTION, null, THICKNESS);
    if (!hit || hit.speed <= 0) continue;
    t.standing = false;
    addScore(game, t.points);
    emit(game, 'target', { x: (t.ax + t.bx) / 2, y: (t.ay + t.by) / 2 });
    if (bank.targets.every((x) => !x.standing)) {
      addScore(game, bank.bonus);
      bank.resetIn = bank.resetSeconds;
      emit(game, 'targets-complete');
    }
  }
}

export function tickDropTargets(game, dt) {
  for (const bank of game.table.dropBanks) tickBank(bank, dt);
}

function tickBank(bank, dt) {
  if (bank.resetIn <= 0) return;
  bank.resetIn -= dt;
  if (bank.resetIn <= 0) for (const t of bank.targets) t.standing = true;
}
