import { classicTheme } from '../theme.js';
import { classicLayout } from '../layouts/classic.js';

// Bright arcade chiptune in a major key.
export const classic = {
  id: 'classic',
  name: 'Classic',
  blurb: 'Arcade chiptune',
  layout: classicLayout,
  theme: classicTheme,
  sound: {
    lead: 'square',
    root: 220,
    scale: [0, 2, 4, 7, 9],
    noise: true,
  },
  music: {
    tempo: 132,
    root: 110,
    stepsPerBar: 16,
    stepsPerBeat: 4,
    chord: [0, 4, 7],
    progression: [0, 5, 7, 5],
    bassWave: 'triangle',
    arpWave: 'square',
    padWave: null,
    bass: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    arp: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  },
};
