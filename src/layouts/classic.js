// A layout lists only what differs between tables. The arch, plunger lane and gate, lower
// flippers, inlane guides, outlanes, slingshots, rollover row and kickback are shared, so
// every table plays the same where the ball physics matters most.
const ARCH_TOP = Math.PI;

export const classicLayout = {
  id: 'classic',

  // Arcs just inside the top arch. A hard-hit ball rides the channel between rail and arch.
  orbit: [
    { from: ARCH_TOP + 0.35, to: ARCH_TOP + 0.9, steps: 6 },
    { from: 2 * ARCH_TOP - 0.9, to: 2 * ARCH_TOP - 0.35, steps: 6 },
  ],

  bumpers: [
    { x: 225, y: 215, r: 26 },
    { x: 335, y: 215, r: 26 },
    { x: 200, y: 345, r: 26 },
    { x: 360, y: 345, r: 26 },
  ],

  portals: [
    { id: 'w1', kind: 'wormhole', x: 90, y: 250, to: 'w2' },
    { id: 'w2', kind: 'wormhole', x: 500, y: 440, to: 'w1' },
    { id: 'w3', kind: 'wormhole', x: 485, y: 250, to: 'w4' },
    { id: 'w4', kind: 'wormhole', x: 170, y: 440, to: 'w3' },
    // The funnel is built from the ramp: walls flaring out below the entrance.
    { id: 'ramp', kind: 'ramp', x: 280, y: 470, exit: { x: 280, y: 120 }, width: 40, funnel: { offset: 25, length: 50, flare: 45 } },
  ],

  // Vertical banks of drop targets.
  dropBanks: [{ x: 130, ys: [300, 335, 370] }],

  spinners: [{ x: 160, y: 150 }],
  lock: { x: 505, y: 330 },

  // Extra flippers driven by a main button. guideWallX is the wall their guide runs back to.
  upperFlippers: [{ name: 'upperLeft', follows: 'left', x: 30, y: 410, length: 60, side: 1, guideWallX: 10 }],
};
