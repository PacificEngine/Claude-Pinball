import { emit } from './events.js';
import { addScore } from './score.js';

export const SKILL_SHOT = { letter: 'B', points: 2500, seconds: 6 };
const SPOILERS = ['bumper', 'slingshot', 'target', 'wormhole', 'ramp', 'ball-locked'];

export function skillShotListener(game, event) {
  if (event.type === 'launch') {
    if (!event.fresh) return;
    game.skillShot = SKILL_SHOT.seconds;
  } else if (SPOILERS.includes(event.type)) {
    game.skillShot = 0;
  } else if (event.type === 'rollover' && event.letter === SKILL_SHOT.letter && game.skillShot > 0) {
    game.skillShot = 0;
    addScore(game, SKILL_SHOT.points);
    game.banner = { text: `SKILL SHOT +${SKILL_SHOT.points}`, remaining: 3 };
    emit(game, 'skill-shot');
  }
}

export function tickSkillShot(game, dt) {
  game.skillShot = Math.max(0, game.skillShot - dt);
}
