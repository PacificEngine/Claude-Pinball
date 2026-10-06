import { soundFor } from './sfx.js';
import { notesForStep, stepSeconds } from './music.js';

const SETTINGS_KEY = 'pinball.settings';
const SFX_VOLUME = 0.6;
const MUSIC_VOLUME = 0.35;
const LOOKAHEAD_SECONDS = 0.15;
const TICK_MS = 50;
const NOISE_SECONDS = 0.5;

// Events that change how intense the music is.
const INTENSITY = {
  multiball: 'high',
  'multiball-end': 'normal',
  tilt: 'quiet',
  'game-over': 'quiet',
  'ball-served': 'normal',
};

const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null);
const defaultContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)();
const defaultTimers = () => ({ setInterval: (f, ms) => setInterval(f, ms), clearInterval: (id) => clearInterval(id) });

// The only module that touches Web Audio. Everything it plays comes from the pure
// `soundFor` and `notesForStep`, and every failure degrades to silence.
export function createAudioEngine({ createContext = defaultContext, storage = defaultStorage(), timers = defaultTimers() } = {}) {
  let ctx = null;
  let sfxOut = null;
  let musicOut = null;
  let noiseBuffer = null;
  let table = null;
  let intensity = 'normal';
  let playing = false;
  let step = 0;
  let nextTime = 0;
  let timerId = null;
  const settings = loadSettings(storage);

  function envelope(out, start, dur, gain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(out);
    return g;
  }

  function oscillator(out, { wave, freq, endFreq, dur, gain }, start) {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    osc.connect(envelope(out, start, dur, gain));
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(out, { dur, gain }, start) {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.connect(envelope(out, start, dur, gain));
    src.start(start);
    src.stop(start + dur);
  }

  function playMusicNote(note, start, stepDur) {
    const dur = note.steps * stepDur;
    switch (note.kind) {
      case 'kick': return oscillator(musicOut, { wave: 'sine', freq: 150, endFreq: 40, dur: 0.12, gain: note.gain }, start);
      case 'snare':
        noise(musicOut, { dur: 0.1, gain: note.gain }, start);
        return oscillator(musicOut, { wave: 'triangle', freq: 220, endFreq: 110, dur: 0.08, gain: note.gain }, start);
      case 'hat': return noise(musicOut, { dur: 0.04, gain: note.gain }, start);
      default: return oscillator(musicOut, { wave: note.wave, freq: note.freq, dur: Math.max(dur, 0.05), gain: note.gain }, start);
    }
  }

  function scheduleAhead() {
    if (!ctx || !playing || !table) return;
    if (nextTime < ctx.currentTime - 0.5) nextTime = ctx.currentTime; // e.g. the tab was in the background
    while (nextTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      const stepDur = stepSeconds(table.music, intensity);
      if (settings.music) {
        for (const note of notesForStep(table.music, step, intensity)) playMusicNote(note, nextTime, stepDur);
      }
      nextTime += stepDur;
      step += 1;
    }
  }

  function applySettings() {
    if (!ctx) return;
    sfxOut.gain.value = settings.sfx ? SFX_VOLUME : 0;
    musicOut.gain.value = settings.music ? MUSIC_VOLUME : 0;
  }

  return {
    get state() {
      return { unlocked: ctx !== null, musicOn: settings.music, sfxOn: settings.sfx, intensity };
    },

    // Browsers only allow audio after a user gesture, so this is called from a key press.
    unlock() {
      if (ctx) return true;
      try {
        ctx = createContext();
      } catch {
        ctx = null;
      }
      if (!ctx) return false;
      sfxOut = ctx.createGain();
      musicOut = ctx.createGain();
      sfxOut.connect(ctx.destination);
      musicOut.connect(ctx.destination);
      applySettings();
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    },

    setTable(next) {
      table = next;
      step = 0;
      if (ctx) nextTime = ctx.currentTime + 0.05;
    },

    handleEvent(event) {
      if (INTENSITY[event.type]) intensity = INTENSITY[event.type];
      if (!ctx || !table || !settings.sfx) return;
      const now = ctx.currentTime;
      for (const tone of soundFor(event, table.sound)) {
        const start = now + (tone.delay ?? 0);
        if (tone.noise) noise(sfxOut, tone, start);
        else oscillator(sfxOut, tone, start);
      }
    },

    startMusic() {
      if (!ctx || !table) return;
      this.stopMusic();
      playing = true;
      intensity = 'normal';
      step = 0;
      nextTime = ctx.currentTime + 0.05;
      scheduleAhead();
      timerId = timers.setInterval(scheduleAhead, TICK_MS);
    },

    stopMusic() {
      playing = false;
      if (timerId !== null) timers.clearInterval(timerId);
      timerId = null;
    },

    scheduleAhead,

    toggleMusic() {
      settings.music = !settings.music;
      if (ctx && settings.music) nextTime = ctx.currentTime + 0.05;
      applySettings();
      saveSettings(storage, settings);
    },

    toggleSfx() {
      settings.sfx = !settings.sfx;
      applySettings();
      saveSettings(storage, settings);
    },
  };
}

function loadSettings(storage) {
  const defaults = { music: true, sfx: true };
  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY));
    return { music: saved.music !== false, sfx: saved.sfx !== false };
  } catch {
    return defaults;
  }
}

function saveSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Losing a preference must never break the game.
  }
}
