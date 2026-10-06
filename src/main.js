import { createGame, update, chargePlunger, releasePlunger, setFlipper, restart } from './game.js';
import { render } from './render.js';

const ctx = document.getElementById('table').getContext('2d');
const game = createGame();
const CHARGE_PER_SECOND = 1;
let charging = false;

const FLIPPER_KEYS = {
  KeyZ: 'left', ArrowLeft: 'left',
  Slash: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.code in FLIPPER_KEYS) setFlipper(game, FLIPPER_KEYS[e.code], true);
  else if (e.code === 'Space') charging = true;
  else if (e.code === 'Enter' && game.phase === 'gameover') restart(game);
  else return;
  e.preventDefault();
});

window.addEventListener('keyup', (e) => {
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
  if (charging) chargePlunger(game, CHARGE_PER_SECOND * dt);
  update(game, dt);
  render(ctx, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__game = game; // handy for debugging in the console
