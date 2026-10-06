// Turns pointer events into table actions, independent of the DOM so it can be tested with
// synthetic timelines:
//   hold the left or right half   -> that side's flippers
//   slow swipe down               -> plunger (charge follows the drag, lifting releases)
//   fast swipe left, right or up  -> nudge the table
export const GESTURE = {
  fastSpeed: 0.8, // px per ms: faster than this is a swipe, slower is a drag
  speedWindowMs: 80,
  minSwipePx: 30,
  plungerStartPx: 24,
  plungerFullPx: 160,
};

export function createGestures({ getWidth, onFlipper, onPlungerCharge, onPlungerRelease, onNudge }) {
  const touches = new Map();

  function recentMotion(touch, now) {
    const { samples } = touch;
    const cur = samples[samples.length - 1];
    let i = samples.findIndex((s) => s.t >= now - GESTURE.speedWindowMs);
    if (i === samples.length - 1) i = samples.length - 2; // only the newest sample is recent
    const ref = samples[Math.max(i, 0)];
    const dx = cur.x - ref.x;
    const dy = cur.y - ref.y;
    return { dx, dy, speed: Math.hypot(dx, dy) / Math.max(cur.t - ref.t, 1) };
  }

  function releaseFlipper(touch) {
    if (touch.mode === 'flipper') onFlipper(touch.side, false);
  }

  function swipe(touch, motion) {
    releaseFlipper(touch);
    touch.mode = 'swiped';
    if (motion.dy > 0 && motion.dy >= Math.abs(motion.dx)) return; // a fast swipe down means nothing
    if (Math.abs(motion.dx) >= Math.abs(motion.dy)) onNudge(motion.dx < 0 ? 'left' : 'right');
    else onNudge('up');
  }

  return {
    down(id, x, y, t) {
      const side = x < getWidth() / 2 ? 'left' : 'right';
      touches.set(id, { side, mode: 'flipper', startX: x, startY: y, samples: [{ x, y, t }] });
      onFlipper(side, true);
    },

    move(id, x, y, t) {
      const touch = touches.get(id);
      if (!touch || touch.mode === 'swiped') return;
      touch.samples.push({ x, y, t });
      if (touch.samples.length > 12) touch.samples.shift();
      const dx = x - touch.startX;
      const dy = y - touch.startY;

      if (touch.mode === 'plunger') {
        onPlungerCharge(Math.max(0, Math.min(1, dy / GESTURE.plungerFullPx)));
        return;
      }

      const motion = recentMotion(touch, t);
      if (motion.speed >= GESTURE.fastSpeed && Math.hypot(dx, dy) >= GESTURE.minSwipePx) {
        swipe(touch, motion);
      } else if (dy >= GESTURE.plungerStartPx && dy > Math.abs(dx) && motion.speed < GESTURE.fastSpeed) {
        releaseFlipper(touch);
        touch.mode = 'plunger';
        onPlungerCharge(Math.max(0, Math.min(1, dy / GESTURE.plungerFullPx)));
      }
    },

    up(id) {
      const touch = touches.get(id);
      if (!touch) return;
      touches.delete(id);
      releaseFlipper(touch);
      if (touch.mode === 'plunger') onPlungerRelease();
    },

    // The browser took the touch away (e.g. a system gesture): never launch the plunger.
    cancel(id) {
      const touch = touches.get(id);
      if (!touch) return;
      touches.delete(id);
      releaseFlipper(touch);
      if (touch.mode === 'plunger') onPlungerCharge(0);
    },
  };
}
