const ARCH_TOP = Math.PI;

// Twin towers: a shorter orbit, a drop-target bank on each side, an upper flipper for each
// hand, the lock on the left, and a diagonal ramp the other way round.
export const hauntedLayout = {
  id: 'haunted',
  orbit: [
    { from: ARCH_TOP + 0.45, to: ARCH_TOP + 0.85, steps: 5 },
    { from: 2 * ARCH_TOP - 0.85, to: 2 * ARCH_TOP - 0.45, steps: 5 },
  ],
  bumpers: [
    { x: 200, y: 240, r: 24 },
    { x: 190, y: 340, r: 24 },
    { x: 400, y: 260, r: 24 },
    { x: 360, y: 380, r: 24 },
  ],
  portals: [
    { id: 'w1', kind: 'wormhole', x: 230, y: 130, to: 'w2' },
    { id: 'w2', kind: 'wormhole', x: 290, y: 440, to: 'w1' },
    { id: 'w3', kind: 'wormhole', x: 440, y: 190, to: 'w4' },
    { id: 'w4', kind: 'wormhole', x: 270, y: 300, to: 'w3' },
    { id: 'ramp', kind: 'ramp', x: 210, y: 470, exit: { x: 390, y: 170 }, width: 40, funnel: { offset: 25, length: 50, flare: 45 } },
  ],
  dropBanks: [
    { x: 110, ys: [290, 325, 360] },
    { x: 470, ys: [290, 325, 360] },
  ],
  spinners: [{ x: 150, y: 200 }],
  lock: { x: 75, y: 240 },
  upperFlippers: [
    { name: 'upperLeft', follows: 'left', x: 30, y: 420, length: 55, side: 1, guideWallX: 10 },
    { name: 'upperRight', follows: 'right', x: 530, y: 420, length: 55, side: -1, guideWallX: 550 },
  ],
};
