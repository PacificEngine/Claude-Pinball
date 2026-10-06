import { createGame, update, chargePlunger, releasePlunger, setFlipper, nudge, drainEvents } from './game.js';
import { render } from './render.js';
import { renderMenu, loadScores } from './renderMenu.js';
import { TABLES } from './tables/index.js';
import { createMenu, moveSelection, selectedTable } from './menu.js';
import { createAudioEngine } from './audio/engine.js';
import { getHighScore, recordScore } from './highScores.js';

const ctx = document.getElementById('table').getContext('2d');
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked storage: scores and settings simply aren't remembered
  }
})();
const audio = createAudioEngine({ storage });
window.__audio = audio; // handy for debugging in the console
const menu = createMenu(TABLES);
const CHARGE_PER_SECOND = 1;

let mode = 'select';
let game = null;
let table = TABLES[0];
let newBest = false;
let charging = false;
let previewing = false; // menu music, which can only start after the first key press

function startGame() {
  table = selectedTable(menu);
  game = createGame();
  newBest = false;
  charging = false;
  audio.setTable(table);
  audio.startMusic();
  mode = 'playing';
  previewing = false;
  window.__game = game; // handy for debugging in the console
}

function openMenu() {
  mode = 'select';
  charging = false;
  audio.setTable(selectedTable(menu));
  audio.startMusic();
  previewing = true;
}

function onGameEvent(event) {
  audio.handleEvent(event);
  if (event.type === 'game-over') newBest = recordScore(storage, table.id, game.score);
}

const FLIPPER_KEYS = {
  KeyZ: 'left', ArrowLeft: 'left',
  Slash: 'right', ArrowRight: 'right',
};
const NUDGE_KEYS = { KeyA: 'left', KeyD: 'right', KeyW: 'up', ArrowUp: 'up' };
const MENU_MOVES = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };

function onMenuKey(code) {
  if (code in MENU_MOVES) {
    moveSelection(menu, MENU_MOVES[code]);
    audio.setTable(selectedTable(menu));
    audio.startMusic();
    previewing = true;
  } else if (code === 'Enter') {
    startGame();
  } else {
    return false;
  }
  return true;
}

window.addEventListener('keydown', (e) => {
  if (audio.unlock() && mode === 'select' && !previewing) {
    audio.setTable(selectedTable(menu));
    audio.startMusic();
    previewing = true;
  }
  let handled = true;
  if (e.code === 'KeyM') audio.toggleMusic();
  else if (e.code === 'KeyN') audio.toggleSfx();
  else if (mode === 'select') handled = onMenuKey(e.code);
  else if (e.code === 'Escape') openMenu();
  else if (e.code in NUDGE_KEYS) {
    if (!e.repeat) nudge(game, NUDGE_KEYS[e.code]);
  } else if (e.code in FLIPPER_KEYS) setFlipper(game, FLIPPER_KEYS[e.code], true);
  else if (e.code === 'Space') charging = true;
  else if (e.code === 'Enter' && game.phase === 'gameover') openMenu();
  else handled = false;
  if (handled) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  if (mode !== 'playing') return;
  if (e.code in FLIPPER_KEYS) setFlipper(game, FLIPPER_KEYS[e.code], false);
  else if (e.code === 'Space') {
    charging = false;
    releasePlunger(game);
  } else return;
  e.preventDefault();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  if (mode === 'select') {
    renderMenu(ctx, menu, loadScores(storage, TABLES), audio.state);
  } else {
    if (charging) chargePlunger(game, CHARGE_PER_SECOND * dt);
    update(game, dt);
    for (const event of drainEvents(game)) onGameEvent(event);
    render(ctx, game, table.theme, { best: getHighScore(storage, table.id), newBest, audio: audio.state });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
