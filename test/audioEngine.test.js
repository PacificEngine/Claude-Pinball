import { describe, it, expect } from 'vitest';
import { createAudioEngine } from '../src/audio/engine.js';
import { TABLES } from '../src/tables/index.js';
import { createFakeContext, memoryStorage, fakeTimers } from './fakeAudio.js';

const setup = (overrides = {}) => {
  const fake = createFakeContext();
  const timers = fakeTimers();
  const storage = memoryStorage();
  const engine = createAudioEngine({ createContext: () => fake.ctx, storage, timers, ...overrides });
  return { ...fake, timers, storage, engine };
};
const unlocked = (overrides) => {
  const s = setup(overrides);
  s.engine.setTable(TABLES[0]);
  s.engine.unlock();
  return s;
};

describe('audio engine: starting up', () => {
  it('makes no sound and creates nothing before the player has pressed a key', () => {
    const s = setup();
    s.engine.setTable(TABLES[0]);
    s.engine.handleEvent({ type: 'bumper' });
    expect(s.created.oscillators).toHaveLength(0);
    expect(s.engine.state.unlocked).toBe(false);
  });

  it('unlocks once, resuming the suspended context', () => {
    const s = setup();
    expect(s.engine.unlock()).toBe(true);
    s.engine.unlock();
    expect(s.ctx.resumed).toBe(1);
    expect(s.engine.state.unlocked).toBe(true);
  });

  it('copes with no Web Audio at all', () => {
    for (const createContext of [() => null, () => { throw new Error('unsupported'); }]) {
      const engine = createAudioEngine({ createContext, storage: memoryStorage(), timers: fakeTimers() });
      engine.setTable(TABLES[0]);
      expect(engine.unlock()).toBe(false);
      expect(() => {
        engine.handleEvent({ type: 'bumper' });
        engine.startMusic();
        engine.stopMusic();
        engine.toggleMusic();
      }).not.toThrow();
    }
  });
});

describe('audio engine: sound effects', () => {
  it('plays an oscillator for a melodic event', () => {
    const s = unlocked();
    s.engine.handleEvent({ type: 'bumper' });
    expect(s.created.oscillators).toHaveLength(1);
    expect(s.created.oscillators[0].type).toBe(TABLES[0].sound.lead);
  });

  it('plays a noise burst for events that have one', () => {
    const s = unlocked();
    s.engine.handleEvent({ type: 'flipper' });
    expect(s.created.noise.length).toBeGreaterThan(0);
  });

  it('delays the later notes of a jingle', () => {
    const s = unlocked();
    s.ctx.currentTime = 10;
    s.engine.handleEvent({ type: 'multiball' });
    const starts = s.created.oscillators.map((o) => o.started[0]);
    expect(starts[0]).toBeCloseTo(10, 1);
    expect(starts[starts.length - 1]).toBeGreaterThan(starts[0] + 0.2);
  });

  it('is silent when sound effects are muted', () => {
    const s = unlocked();
    s.engine.toggleSfx();
    s.engine.handleEvent({ type: 'bumper' });
    expect(s.created.oscillators).toHaveLength(0);
    expect(s.engine.state.sfxOn).toBe(false);
  });

  it('uses the voice of whichever table is selected', () => {
    const s = unlocked();
    s.engine.setTable(TABLES[1]);
    s.engine.handleEvent({ type: 'bumper' });
    expect(s.created.oscillators[0].type).toBe(TABLES[1].sound.lead);
  });
});

describe('audio engine: music', () => {
  it('schedules a lookahead of notes when started, and ticks on a timer', () => {
    const s = unlocked();
    s.engine.startMusic();
    expect(s.created.oscillators.length).toBeGreaterThan(0);
    expect(s.timers.callback).toBeTypeOf('function');
  });

  it('keeps scheduling as the audio clock advances, without repeating steps', () => {
    const s = unlocked();
    s.engine.startMusic();
    const first = s.created.oscillators.length;
    s.engine.scheduleAhead();
    expect(s.created.oscillators.length).toBe(first);
    s.ctx.currentTime += 2;
    s.engine.scheduleAhead();
    expect(s.created.oscillators.length).toBeGreaterThan(first);
    const starts = s.created.oscillators.map((o) => o.started[0]);
    expect(starts.every((t) => t >= 0)).toBe(true);
  });

  it('stops scheduling when stopped', () => {
    const s = unlocked();
    s.engine.startMusic();
    s.engine.stopMusic();
    const count = s.created.oscillators.length;
    s.ctx.currentTime += 5;
    s.engine.scheduleAhead();
    expect(s.created.oscillators.length).toBe(count);
    expect(s.timers.callback).toBeNull();
  });

  it('makes no notes while music is muted, and picks up when unmuted', () => {
    const s = unlocked();
    s.engine.toggleMusic();
    s.engine.startMusic();
    expect(s.created.oscillators).toHaveLength(0);
    s.engine.toggleMusic();
    s.ctx.currentTime += 3;
    s.engine.scheduleAhead();
    expect(s.created.oscillators.length).toBeGreaterThan(0);
  });

  it('speeds up in multiball and goes quiet on tilt', () => {
    const count = (events) => {
      const s = unlocked();
      s.engine.startMusic();
      for (const type of events) s.engine.handleEvent({ type });
      const before = s.created.oscillators.length;
      s.ctx.currentTime += 4;
      s.engine.scheduleAhead();
      return s.created.oscillators.length - before;
    };
    const normal = count([]);
    expect(count(['multiball'])).toBeGreaterThan(normal);
    expect(count(['tilt'])).toBeLessThan(normal);
    expect(count(['multiball', 'multiball-end'])).toBe(normal);
  });

  it('changes tune when the table changes', () => {
    const s = unlocked();
    s.engine.startMusic();
    const classicFreqs = s.created.oscillators.map((o) => o.frequency.calls[0][1]);
    const s2 = unlocked();
    s2.engine.setTable(TABLES[1]);
    s2.engine.startMusic();
    const spaceFreqs = s2.created.oscillators.map((o) => o.frequency.calls[0][1]);
    expect(spaceFreqs).not.toEqual(classicFreqs);
  });
});

describe('audio engine: settings', () => {
  it('remember muting between visits', () => {
    const s = unlocked();
    s.engine.toggleMusic();
    s.engine.toggleSfx();
    const again = createAudioEngine({ createContext: () => s.ctx, storage: s.storage, timers: fakeTimers() });
    expect(again.state.musicOn).toBe(false);
    expect(again.state.sfxOn).toBe(false);
  });

  it('start with everything on, and tolerate corrupt or missing storage', () => {
    expect(setup().engine.state).toMatchObject({ musicOn: true, sfxOn: true });
    const bad = memoryStorage();
    bad.setItem('pinball.settings', '{nope');
    expect(createAudioEngine({ createContext: () => null, storage: bad, timers: fakeTimers() }).state.musicOn).toBe(true);
    expect(createAudioEngine({ createContext: () => null, storage: null, timers: fakeTimers() }).state.sfxOn).toBe(true);
  });
});
