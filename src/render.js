import { classicTheme } from './theme.js';
import { flipperSegment, FLIPPER_THICKNESS } from './flipper.js';

export function render(ctx, game, theme = classicTheme) {
  const { table } = game;
  ctx.save();
  ctx.translate(game.shake.x, game.shake.y);
  ctx.clearRect(-20, -20, table.width + 40, table.height + 40);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, table.width, table.height);

  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  for (const w of table.walls) {
    ctx.strokeStyle = w.points ? theme.slingshot : theme.wall;
    line(ctx, w.ax, w.ay, w.bx, w.by);
  }

  drawPortals(ctx, game, theme);
  drawRollovers(ctx, game, theme);
  drawDropTargets(ctx, game, theme);
  drawLock(ctx, game, theme);

  for (const b of table.bumpers) {
    ctx.fillStyle = b.litFor > 0 ? theme.bumperLit : theme.bumper;
    ctx.strokeStyle = theme.bumperRim;
    ctx.lineWidth = 3;
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = theme.flipper;
  ctx.lineWidth = FLIPPER_THICKNESS * 2;
  for (const f of Object.values(game.flippers)) {
    const s = flipperSegment(f);
    line(ctx, s.ax, s.ay, s.bx, s.by);
  }

  drawPlunger(ctx, game, theme);

  ctx.fillStyle = theme.ball;
  for (const b of game.balls) {
    if (b.transit && !b.transit.visible) continue;
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
  }

  ctx.fillStyle = theme.text;
  ctx.font = '20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${game.score}`, 24, 30);
  if (game.balls.length > 1) {
    ctx.fillStyle = theme.banner;
    ctx.fillText('MULTIBALL', 24, 82);
    ctx.fillStyle = theme.text;
  }
  if (game.multiplier > 1) {
    ctx.fillStyle = theme.banner;
    ctx.fillText(`BONUS x${game.multiplier}`, 24, 56);
    ctx.fillStyle = theme.text;
  }
  ctx.textAlign = 'right';
  ctx.fillText(`BALLS ${game.ballsLeft}`, table.width - 24, 30);

  drawTilt(ctx, game, theme);
  drawMission(ctx, game, theme);
  ctx.restore();

  if (game.phase === 'gameover') {
    ctx.fillStyle = theme.overlay;
    ctx.fillRect(0, 300, table.width, 140);
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.font = '36px monospace';
    ctx.fillText('GAME OVER', table.width / 2, 360);
    ctx.font = '18px monospace';
    ctx.fillText(`Final score ${game.score} — press Enter`, table.width / 2, 400);
  }
}

function drawTilt(ctx, game, theme) {
  const { width } = game.table;
  ctx.textAlign = 'center';
  ctx.font = '28px monospace';
  if (game.tilted) {
    ctx.fillStyle = theme.danger;
    ctx.fillText('TILT', width / 2, 44);
  } else if (game.tiltWarning) {
    ctx.fillStyle = theme.warning;
    ctx.fillText('DANGER', width / 2, 44);
  }
}

function drawPortals(ctx, game, theme) {
  const spin = performance.now() / 600;
  ctx.lineWidth = 3;
  for (const p of game.table.portals) {
    if (p.kind === 'ramp') {
      ctx.strokeStyle = theme.ramp;
      ctx.setLineDash([10, 8]);
      line(ctx, p.x, p.y, p.exit.x, p.exit.y);
      ctx.setLineDash([]);
      circle(ctx, p.x, p.y, p.r);
      ctx.stroke();
      circle(ctx, p.exit.x, p.exit.y, 8);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = theme.wormholeCore;
    circle(ctx, p.x, p.y, p.r);
    ctx.fill();
    ctx.strokeStyle = theme.wormhole;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r - ring * 5, spin + ring, spin + ring + Math.PI * 1.5);
      ctx.stroke();
    }
  }
}

function drawRollovers(ctx, game, theme) {
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 2;
  for (const lane of game.table.rollovers) {
    ctx.strokeStyle = lane.lit ? theme.rolloverLit : theme.rollover;
    ctx.fillStyle = lane.lit ? theme.rolloverLit : 'transparent';
    circle(ctx, lane.x, lane.y, lane.r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lane.lit ? theme.background : theme.rollover;
    ctx.fillText(lane.letter, lane.x, lane.y + 5);
  }
}

function drawDropTargets(ctx, game, theme) {
  ctx.lineWidth = 7;
  for (const t of game.table.dropBank.targets) {
    ctx.strokeStyle = t.standing ? theme.dropTarget : theme.dropTargetDown;
    line(ctx, t.ax, t.ay, t.bx, t.by);
  }
}

function drawMission(ctx, game, theme) {
  const { width, height } = game.table;
  ctx.textAlign = 'center';
  if (game.banner) {
    ctx.font = '22px monospace';
    ctx.fillStyle = theme.banner;
    ctx.fillText(game.banner.text, width / 2, 130);
  }
  const { def, progress } = game.mission;
  ctx.font = '14px monospace';
  ctx.fillStyle = theme.textMuted;
  const count = def.goal > 1 ? ` (${progress}/${def.goal})` : '';
  ctx.fillText(`MISSION: ${def.text}${count}`, width / 2, height - 12);
}

function drawLock(ctx, game, theme) {
  const { lock } = game.table;
  ctx.strokeStyle = theme.lock;
  ctx.lineWidth = 3;
  circle(ctx, lock.x, lock.y, lock.r);
  ctx.stroke();
  ctx.fillStyle = theme.lock;
  for (let i = 0; i < lock.locked; i++) {
    circle(ctx, lock.x - 6 + i * 12, lock.y, 4);
    ctx.fill();
  }
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOCK', lock.x, lock.y + lock.r + 14);
}

function drawPlunger(ctx, game, theme) {
  const { plungerStart, height } = game.table;
  const top = plungerStart.y + game.ball.r + game.plungerCharge * 14;
  ctx.fillStyle = theme.plunger;
  ctx.fillRect(plungerStart.x - 8, top, 16, height - 25 - top);
}

function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
