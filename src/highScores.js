// Storage is injected (localStorage in the browser) and may be missing or throw, e.g. in
// private browsing, so every access is guarded.
const key = (tableId) => `pinball.high.${tableId}`;

export function getHighScore(storage, tableId) {
  try {
    const value = Number(storage.getItem(key(tableId)));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

// Returns true when `score` is a new best for the table.
export function recordScore(storage, tableId, score) {
  if (score <= getHighScore(storage, tableId)) return false;
  try {
    storage.setItem(key(tableId), String(score));
  } catch {
    // Not being able to save a high score must never break the game.
  }
  return true;
}
