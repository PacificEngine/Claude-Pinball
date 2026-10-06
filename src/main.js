import { createGame, update, chargePlunger, setPlungerCharge, releasePlunger, setFlipper, nudge, drainEvents } from './game.js';
import { render } from './render.js';
import { renderMenu, loadScores, cardAt } from './renderMenu.js';
import { createGestures } from './gestures.js';
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
let gameOverAt = 0;
let previewing = false; // menu music, which can only start after the first key press

function startGame() {
  table = selectedTable(menu);
  game = createGame(table.layout);
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
  if (event.type === 'game-over') {
    newBest = recordScore(storage, table.id, game.score);
    gameOverAt = performance.now();
  }
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

// Browsers only allow audio after a key press or tap, so menu music starts on the first one.
function startAudioPreview() {
  if (audio.unlock() && mode === 'select' && !previewing) {
    audio.setTable(selectedTable(menu));
    audio.startMusic();
    previewing = true;
  }
}

window.addEventListener('keydown', (e) => {
  startAudioPreview();
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

// Touch: the gesture recognizer decides what a finger means; this only connects it to the
// game. Mouse input is left to the keyboard so a click never acts as a flipper.
const canvas = document.getElementById('table');
const GAME_OVER_TAP_DELAY_MS = 800; // so the end of a swipe cannot skip the game over screen

const gestures = createGestures({
  getWidth: () => window.innerWidth,
  onFlipper: (name, pressed) => game && setFlipper(game, name, pressed),
  onPlungerCharge: (value) => game && setPlungerCharge(game, value),
  onPlungerRelease: () => game && releasePlunger(game),
  onNudge: (direction) => game && nudge(game, direction),
});

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: ((e.clientX - rect.left) * canvas.width) / rect.width, y: ((e.clientY - rect.top) * canvas.height) / rect.height };
}

function onMenuTap(e) {
  const { x, y } = canvasPoint(e);
  const index = cardAt(menu, x, y);
  if (index < 0) return;
  if (index === menu.index) return startGame();
  menu.index = index;
  audio.setTable(selectedTable(menu));
  audio.startMusic();
  previewing = true;
}

window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  startAudioPreview();
  if (mode === 'select') return onMenuTap(e);
  if (game.phase === 'gameover') {
    if (performance.now() - gameOverAt > GAME_OVER_TAP_DELAY_MS) openMenu();
    return;
  }
  gestures.down(e.pointerId, e.clientX, e.clientY, e.timeStamp);
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' || mode !== 'playing') return;
  e.preventDefault();
  gestures.move(e.pointerId, e.clientX, e.clientY, e.timeStamp);
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') gestures.up(e.pointerId, e.clientX, e.clientY, e.timeStamp);
});
window.addEventListener('pointercancel', (e) => gestures.cancel(e.pointerId));

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
