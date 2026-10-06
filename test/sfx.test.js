import { describe, it, expect } from 'vitest';
import { soundFor } from '../src/audio/sfx.js';
import { TABLES } from '../src/tables/index.js';

const EVENTS = [
  'bumper', 'slingshot', 'flipper', 'launch', 'nudge', 'tilt-warning', 'tilt', 'rollover',
  'spinner', 'target', 'targets-complete', 'wormhole', 'ramp', 'ball-locked', 'multiball',
  'mission-complete', 'skill-shot', 'kickback', 'kickback-armed', 'combo', 'multiplier',
  'drain', 'ball-saved', 'game-over',
];
const classic = TABLES[0].sound;

describe('sound effects', () => {
  it('have a sound for every event worth hearing, in every table', () => {
    for (const table of TABLES) {
      for (const type of EVENTS) {
        expect(soundFor({ type }, table.sound).length, `${table.id}/${type}`).toBeGreaterThan(0);
      }
    }
  });

  it('make no sound for events with nothing to hear', () => {
    expect(soundFor({ type: 'ball-served' }, classic)).toEqual([]);
    expect(soundFor({ type: 'no-such-event' }, classic)).toEqual([]);
  });

  it('only ever produce valid tones', () => {
    for (const table of TABLES) {
      for (const type of EVENTS) {
        for (const tone of soundFor({ type, count: 3, letter: 'B' }, table.sound)) {
          expect(tone.dur, `${table.id}/${type}`).toBeGreaterThan(0);
          expect(tone.dur).toBeLessThan(2);
          expect(tone.gain).toBeGreaterThan(0);
          expect(tone.gain).toBeLessThanOrEqual(1);
          expect(tone.delay ?? 0).toBeGreaterThanOrEqual(0);
          if (!tone.noise) {
            expect(['sine', 'square', 'sawtooth', 'triangle']).toContain(tone.wave);
            expect(tone.freq).toBeGreaterThan(20);
            expect(tone.freq).toBeLessThan(12000);
            if (tone.endFreq !== undefined) expect(tone.endFreq).toBeGreaterThan(20);
          }
        }
      }
    }
  });

  it('sound different on each table', () => {
    const [a, b, c] = TABLES.map((t) => JSON.stringify(soundFor({ type: 'bumper' }, t.sound)));
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('use the table\'s own voice for melodic sounds', () => {
    for (const table of TABLES) {
      expect(soundFor({ type: 'bumper' }, table.sound)[0].wave).toBe(table.sound.lead);
    }
  });

  it('skip noise on tables that do not use it', () => {
    const noiseless = { ...classic, noise: false };
    expect(soundFor({ type: 'flipper' }, noiseless).some((t) => t.noise)).toBe(false);
    expect(soundFor({ type: 'flipper' }, classic).some((t) => t.noise)).toBe(true);
  });

  it('rise in pitch as a combo grows', () => {
    const low = soundFor({ type: 'combo', count: 2 }, classic)[0].freq;
    const high = soundFor({ type: 'combo', count: 6 }, classic)[0].freq;
    expect(high).toBeGreaterThan(low);
  });

  it('give each rollover letter its own note', () => {
    const f = (letter) => soundFor({ type: 'rollover', letter }, classic)[0].freq;
    expect(new Set([f('A'), f('B'), f('C')]).size).toBe(3);
  });

  it('play multi-note jingles in sequence', () => {
    const delays = soundFor({ type: 'multiball' }, classic).map((t) => t.delay ?? 0);
    expect(delays).toEqual([...delays].sort((x, y) => x - y));
    expect(new Set(delays).size).toBeGreaterThan(2);
  });

  it('are quieter for background ticks than for big moments', () => {
    const maxGain = (type) => Math.max(...soundFor({ type }, classic).map((t) => t.gain));
    expect(maxGain('spinner')).toBeLessThan(maxGain('multiball'));
  });
});
