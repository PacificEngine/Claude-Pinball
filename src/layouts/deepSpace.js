import { classicLayout } from './classic.js';

const ARCH_TOP = Math.PI;

// Open orbit: long rails, a diagonal ramp across the middle, wide-spread wormholes.
export const deepSpaceLayout = {
  id: 'deep-space',
  orbit: [
    { from: ARCH_TOP + 0.28, to: ARCH_TOP + 0.95, steps: 8 },
    { from: 2 * ARCH_TOP - 0.95, to: 2 * ARCH_TOP - 0.28, steps: 8 },
  ],
  bumpers: [
    { x: 300, y: 215, r: 24 },
    { x: 180, y: 290, r: 24 },
    { x: 390, y: 290, r: 24 },
    { x: 215, y: 400, r: 24 },
  ],
  portals: [
    { id: 'w1', kind: 'wormhole', x: 100, y: 260, to: 'w2' },
    { id: 'w2', kind: 'wormhole', x: 500, y: 450, to: 'w1' },
    { id: 'w3', kind: 'wormhole', x: 470, y: 255, to: 'w4' },
    { id: 'w4', kind: 'wormhole', x: 130, y: 445, to: 'w3' },
    { id: 'ramp', kind: 'ramp', x: 350, y: 470, exit: { x: 170, y: 170 }, width: 40, funnel: { offset: 25, length: 50, flare: 45 } },
  ],
  dropBanks: [{ x: 130, ys: [300, 335, 370] }],
  spinners: [{ x: 350, y: 140 }],
  lock: { x: 505, y: 330 },
  upperFlippers: classicLayout.upperFlippers,
};
