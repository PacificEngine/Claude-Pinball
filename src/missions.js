import { emit } from './events.js';
import { addScore } from './score.js';

const BANNER_SECONDS = 3;

// Add a mission by listing the event it counts, how many it needs, and the reward.
export const MISSIONS = [
  { id: 'bumpers', name: 'Bumper blitz', text: 'Hit 5 bumpers', event: 'bumper', goal: 5, reward: 2000 },
  { id: 'wormholes', name: 'Wormhole hopper', text: 'Enter 2 wormholes', event: 'wormhole', goal: 2, reward: 3000 },
  { id: 'targets', name: 'Target sweep', text: 'Clear the drop targets', event: 'targets-complete', goal: 1, reward: 2500 },
  { id: 'ramp', name: 'Ramp shot', text: 'Shoot the ramp', event: 'ramp', goal: 1, reward: 3000 },
  { id: 'lanes', name: 'Lane master', text: 'Raise the bonus multiplier', event: 'multiplier', goal: 1, reward: 2000 },
];

export function startMissions(game) {
  game.missionIndex = 0;
  game.mission = { def: MISSIONS[0], progress: 0 };
  game.missionsCompleted = 0;
  game.banner = null;
  game.listeners.push(onEvent);
}

function onEvent(game, event) {
  if (event.type !== game.mission.def.event) return;
  game.mission.progress += 1;
  if (game.mission.progress >= game.mission.def.goal) completeMission(game);
}

function completeMission(game) {
  const { def } = game.mission;
  addScore(game, def.reward, { raw: true });
  game.missionsCompleted += 1;
  game.banner = { text: `${def.name} complete +${def.reward}`, remaining: BANNER_SECONDS };
  game.missionIndex = (game.missionIndex + 1) % MISSIONS.length;
  game.mission = { def: MISSIONS[game.missionIndex], progress: 0 };
  emit(game, 'mission-complete', { id: def.id, reward: def.reward });
}

export function tickBanner(game, dt) {
  if (!game.banner) return;
  game.banner.remaining -= dt;
  if (game.banner.remaining <= 0) game.banner = null;
}
