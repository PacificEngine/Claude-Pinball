// Everything that happens on the table is announced as an event. Sound, music and
// missions listen to these instead of reaching into game rules.
export function emit(game, type, data = {}) {
  const event = { type, ...data };
  game.events.push(event);
  for (const listener of game.listeners) listener(game, event);
}

export function drainEvents(game) {
  return game.events.splice(0);
}
