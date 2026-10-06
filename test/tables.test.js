import { describe, it, expect } from 'vitest';
import { TABLES } from '../src/tables/index.js';
import { classicTheme } from '../src/theme.js';
import { createMenu, moveSelection, selectedTable } from '../src/menu.js';
import { getHighScore, recordScore } from '../src/highScores.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

describe('tables', () => {
  it('ships three tables with unique ids', () => {
    expect(TABLES).toHaveLength(3);
    expect(new Set(TABLES.map((t) => t.id)).size).toBe(3);
  });

  it('each defines a name, a theme, a sound set and music', () => {
    for (const t of TABLES) {
      expect(t.name, t.id).toBeTruthy();
      expect(t.theme, t.id).toBeTruthy();
      expect(t.sound, t.id).toBeTruthy();
      expect(t.music, t.id).toBeTruthy();
    }
  });

  it('every theme has exactly the same keys as the classic theme', () => {
    for (const t of TABLES) {
      expect(Object.keys(t.theme).sort(), t.id).toEqual(Object.keys(classicTheme).sort());
    }
  });

  it('every color is a usable canvas color string', () => {
    for (const t of TABLES) {
      for (const [key, value] of Object.entries(t.theme)) {
        if (key === 'name') continue;
        expect(value, `${t.id}.${key}`).toMatch(/^(#[0-9a-f]{6}|rgba\(.+\))$/i);
      }
    }
  });

  it('look different from each other', () => {
    const backgrounds = TABLES.map((t) => t.theme.background);
    expect(new Set(backgrounds).size).toBe(3);
  });
});

describe('menu', () => {
  it('starts on the first table', () => {
    const m = createMenu(TABLES);
    expect(selectedTable(m)).toBe(TABLES[0]);
  });

  it('moves left and right, wrapping around', () => {
    const m = createMenu(TABLES);
    moveSelection(m, -1);
    expect(selectedTable(m)).toBe(TABLES[2]);
    moveSelection(m, 1);
    expect(selectedTable(m)).toBe(TABLES[0]);
    moveSelection(m, 1);
    expect(selectedTable(m)).toBe(TABLES[1]);
  });
});

describe('high scores', () => {
  it('start at zero for each table', () => {
    expect(getHighScore(memoryStorage(), 'classic')).toBe(0);
  });

  it('record a new best and report it', () => {
    const s = memoryStorage();
    expect(recordScore(s, 'classic', 1200)).toBe(true);
    expect(getHighScore(s, 'classic')).toBe(1200);
  });

  it('ignore lower scores', () => {
    const s = memoryStorage();
    recordScore(s, 'classic', 1200);
    expect(recordScore(s, 'classic', 800)).toBe(false);
    expect(getHighScore(s, 'classic')).toBe(1200);
  });

  it('are kept per table', () => {
    const s = memoryStorage();
    recordScore(s, 'classic', 1200);
    expect(getHighScore(s, 'deep-space')).toBe(0);
  });

  it('survive unavailable or broken storage', () => {
    expect(getHighScore(null, 'classic')).toBe(0);
    expect(recordScore(null, 'classic', 5)).toBe(true);
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(getHighScore(broken, 'classic')).toBe(0);
    expect(() => recordScore(broken, 'classic', 5)).not.toThrow();
  });

  it('ignore corrupt stored values', () => {
    const s = memoryStorage();
    s.setItem('pinball.high.classic', 'not a number');
    expect(getHighScore(s, 'classic')).toBe(0);
  });
});
