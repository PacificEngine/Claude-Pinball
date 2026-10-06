import { describe, it, expect } from 'vitest';
import { notesForStep, stepSeconds } from '../src/audio/music.js';
import { TABLES } from '../src/tables/index.js';

const bar = (music, intensity, barIndex = 0) => {
  const out = [];
  for (let s = 0; s < music.stepsPerBar; s++) out.push(...notesForStep(music, barIndex * music.stepsPerBar + s, intensity));
  return out;
};
const classic = TABLES[0].music;

describe('music', () => {
  it('is deterministic', () => {
    expect(notesForStep(classic, 5, 'normal')).toEqual(notesForStep(classic, 5, 'normal'));
  });

  it('plays something every bar on every table, with valid notes', () => {
    for (const table of TABLES) {
      for (const intensity of ['quiet', 'normal', 'high']) {
        const notes = bar(table.music, intensity);
        expect(notes.length, `${table.id}/${intensity}`).toBeGreaterThan(0);
        for (const n of notes) {
          expect(n.gain).toBeGreaterThan(0);
          expect(n.steps).toBeGreaterThan(0);
          if (!['kick', 'snare', 'hat'].includes(n.kind)) {
            expect(n.freq).toBeGreaterThan(20);
            expect(n.freq).toBeLessThan(8000);
            expect(['sine', 'square', 'sawtooth', 'triangle']).toContain(n.wave);
          }
        }
      }
    }
  });

  it('follows the chord progression, bar by bar', () => {
    const rootOf = (b) => bar(classic, 'normal', b).find((n) => n.kind === 'bass').freq;
    expect(rootOf(1)).toBeGreaterThan(rootOf(0));
    expect(rootOf(4)).toBe(rootOf(0));
  });

  it('loops after the whole progression', () => {
    const total = classic.progression.length * classic.stepsPerBar;
    expect(notesForStep(classic, 3, 'normal')).toEqual(notesForStep(classic, 3 + total, 'normal'));
  });

  it('drops the drums and arpeggio when quiet', () => {
    const kinds = new Set(bar(classic, 'quiet').map((n) => n.kind));
    expect(kinds.has('kick')).toBe(false);
    expect(kinds.has('snare')).toBe(false);
    expect(kinds.has('hat')).toBe(false);
    expect(kinds.has('arp')).toBe(false);
    expect(kinds.has('bass')).toBe(true);
  });

  it('plays the full band when normal', () => {
    const kinds = new Set(bar(classic, 'normal').map((n) => n.kind));
    for (const k of ['bass', 'arp', 'kick', 'snare', 'hat']) expect(kinds.has(k), k).toBe(true);
  });

  it('adds more when high, and plays faster', () => {
    expect(bar(classic, 'high').length).toBeGreaterThan(bar(classic, 'normal').length);
    expect(stepSeconds(classic, 'high')).toBeLessThan(stepSeconds(classic, 'normal'));
  });

  it('is quieter in quiet mode', () => {
    const bassGain = (i) => bar(classic, i).find((n) => n.kind === 'bass').gain;
    expect(bassGain('quiet')).toBeLessThan(bassGain('normal'));
  });

  it('lays pads under the chord only on tables that have them', () => {
    const deepSpace = TABLES[1].music;
    expect(bar(deepSpace, 'normal').filter((n) => n.kind === 'pad')).toHaveLength(deepSpace.chord.length);
    expect(bar(classic, 'normal').some((n) => n.kind === 'pad')).toBe(false);
  });

  it('keeps each table\'s own bar length and tempo', () => {
    const haunted = TABLES[2].music;
    expect(haunted.stepsPerBar).toBe(12);
    expect(bar(haunted, 'normal', 1).every((n) => n.freq === undefined || n.freq > 0)).toBe(true);
    expect(stepSeconds(TABLES[1].music, 'normal')).toBeGreaterThan(stepSeconds(classic, 'normal'));
  });
});
