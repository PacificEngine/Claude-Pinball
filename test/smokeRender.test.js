import { describe, it, expect } from 'vitest';
import { render } from '../src/render.js';
import { renderMenu } from '../src/renderMenu.js';
import { createGame } from '../src/game.js';
import { createMenu } from '../src/menu.js';
import { TABLES } from '../src/tables/index.js';

// A canvas stand-in that accepts any call and records fillStyle/strokeStyle values.
function fakeCanvas() {
  const seen = new Set();
  const target = { measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }) };
  return {
    seen,
    ctx: new Proxy(target, {
      get: (t, k) => (k in t ? t[k] : () => {}),
      set: (t, k, v) => {
        if (k === 'fillStyle' || k === 'strokeStyle') seen.add(v);
        t[k] = v;
        return true;
      },
    }),
  };
}
const hud = { best: 1234, newBest: true, audio: { musicOn: true, sfxOn: false } };

describe('rendering', () => {
  it('draws the table in every theme without errors', () => {
    for (const table of TABLES) {
      const { ctx, seen } = fakeCanvas();
      expect(() => render(ctx, createGame(), table.theme, hud)).not.toThrow();
      expect(seen.has(table.theme.background), table.id).toBe(true);
    }
  });

  it('draws a game over screen with the best score', () => {
    const g = createGame();
    g.phase = 'gameover';
    const { ctx } = fakeCanvas();
    expect(() => render(ctx, g, TABLES[0].theme, hud)).not.toThrow();
  });

  it('draws the table with no hud at all', () => {
    const { ctx } = fakeCanvas();
    expect(() => render(ctx, createGame(), TABLES[0].theme)).not.toThrow();
  });

  it('draws the select screen for each choice', () => {
    for (let i = 0; i < TABLES.length; i++) {
      const menu = createMenu(TABLES);
      menu.index = i;
      const { ctx, seen } = fakeCanvas();
      expect(() => renderMenu(ctx, menu, { classic: 5, haunted: 0 }, { musicOn: true, sfxOn: true })).not.toThrow();
      expect(seen.has(TABLES[i].theme.background)).toBe(true);
    }
  });
});
