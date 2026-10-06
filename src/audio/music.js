// Pure, deterministic music: given a table's music definition, a step number and an
// intensity, say which notes start on that step. The engine schedules them on the audio
// clock. Tests can check the music without any audio hardware.
const freqAt = (root, semitones) => root * Math.pow(2, semitones / 12);

const QUIET_GAIN = 0.5;

export function stepSeconds(music, intensity) {
  const base = 60 / music.tempo / music.stepsPerBeat;
  return intensity === 'high' ? base / 1.2 : base;
}

export function notesForStep(music, step, intensity = 'normal') {
  const { stepsPerBar: bar } = music;
  const barIndex = Math.floor(step / bar) % music.progression.length;
  const pos = step % bar;
  const chordRoot = music.progression[barIndex];
  const quiet = intensity === 'quiet';
  const high = intensity === 'high';
  const level = quiet ? QUIET_GAIN : 1;
  const notes = [];

  if (music.bass[pos]) {
    notes.push({ kind: 'bass', wave: music.bassWave, freq: freqAt(music.root, chordRoot), steps: 2, gain: 0.5 * level });
  }

  if (music.padWave && pos === 0) {
    for (const interval of music.chord) {
      notes.push({ kind: 'pad', wave: music.padWave, freq: freqAt(music.root, chordRoot + interval + 12), steps: bar, gain: 0.07 * level });
    }
  }

  if (quiet) return notes;

  if (music.arp[pos]) {
    const hitsBefore = music.arp.slice(0, pos).filter(Boolean).length;
    const interval = music.chord[hitsBefore % music.chord.length];
    const semis = chordRoot + interval + 24;
    notes.push({ kind: 'arp', wave: music.arpWave, freq: freqAt(music.root, semis), steps: 1, gain: 0.16 });
    if (high) notes.push({ kind: 'arp', wave: music.arpWave, freq: freqAt(music.root, semis + 12), steps: 1, gain: 0.08 });
  }

  if (music.kick[pos]) notes.push({ kind: 'kick', steps: 1, gain: 0.5 });
  if (music.snare[pos]) notes.push({ kind: 'snare', steps: 1, gain: 0.25 });
  if (music.hat[pos] || (high && pos % 2 === 0)) notes.push({ kind: 'hat', steps: 1, gain: 0.1 });
  return notes;
}
