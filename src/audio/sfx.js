// Pure mapping from a game event to the tones that voice it. The audio engine plays the
// tones; keeping this free of Web Audio makes it testable and lets every table sound
// different through its sound set (voice, root pitch, scale, noise).
const semitones = (set, i) => set.scale[i % set.scale.length] + 12 * Math.floor(i / set.scale.length);
const note = (set, i) => set.root * Math.pow(2, semitones(set, i) / 12);

const ROLLOVER_STEP = { A: 3, B: 4, C: 5 };

export function soundFor(event, set) {
  const lead = (i, dur, gain, delay = 0, endIndex = null) => ({
    wave: set.lead,
    freq: note(set, i),
    endFreq: endIndex === null ? undefined : note(set, endIndex),
    dur,
    gain,
    delay,
  });
  const thump = (freq, endFreq, dur, gain, wave = 'triangle') => ({ wave, freq, endFreq, dur, gain });
  const noise = (dur, gain, delay = 0) => (set.noise ? [{ noise: true, dur, gain, delay }] : []);
  const run = (indexes, dur, gain, spacing) => indexes.map((i, n) => lead(i, dur, gain, n * spacing));

  switch (event.type) {
    case 'bumper': return [lead(4, 0.09, 0.3, 0, 2)];
    case 'slingshot': return [lead(5, 0.07, 0.25, 0, 7)];
    case 'flipper': return [thump(140, 70, 0.06, 0.35), ...noise(0.03, 0.15)];
    case 'launch': return [{ wave: set.lead, freq: set.root, endFreq: set.root * 6, dur: 0.4, gain: 0.3 }];
    case 'nudge': return [thump(80, 50, 0.1, 0.4, 'sine')];
    case 'tilt-warning': return [lead(3, 0.12, 0.35), lead(3, 0.12, 0.35, 0.18)];
    case 'tilt': return [{ wave: 'sawtooth', freq: 400, endFreq: 60, dur: 0.8, gain: 0.4 }, ...noise(0.5, 0.2)];
    case 'rollover': return [lead(ROLLOVER_STEP[event.letter] ?? 3, 0.12, 0.25)];
    case 'spinner': return [lead(6, 0.03, 0.12)];
    case 'target': return [lead(1, 0.07, 0.3), ...noise(0.04, 0.2)];
    case 'targets-complete': return run([2, 4, 6, 9], 0.1, 0.3, 0.07);
    case 'wormhole': return [lead(8, 0.5, 0.25, 0, 1), lead(1, 0.3, 0.2, 0.45, 5)];
    case 'ramp': return [lead(1, 0.5, 0.3, 0, 7)];
    case 'ball-locked': return run([4, 6], 0.14, 0.3, 0.12);
    case 'multiball': return run([2, 4, 6, 9, 11], 0.18, 0.35, 0.1);
    case 'mission-complete': return run([2, 4, 7], 0.16, 0.32, 0.12);
    case 'skill-shot': return run([4, 6, 7, 9], 0.14, 0.34, 0.09);
    case 'kickback': return [{ wave: 'sawtooth', freq: 120, endFreq: 40, dur: 0.3, gain: 0.4 }, ...noise(0.2, 0.25)];
    case 'kickback-armed': return [lead(5, 0.2, 0.28)];
    case 'combo': return [lead(2 + Math.min(event.count ?? 2, 8), 0.08, 0.22)];
    case 'multiplier': return run([3, 5, 8], 0.12, 0.3, 0.08);
    case 'drain': return [{ wave: 'sawtooth', freq: 300, endFreq: 80, dur: 0.6, gain: 0.35 }];
    case 'ball-saved': return run([3, 6], 0.14, 0.3, 0.1);
    case 'game-over': return run([7, 5, 3, 0], 0.3, 0.35, 0.25);
    default: return [];
  }
}
