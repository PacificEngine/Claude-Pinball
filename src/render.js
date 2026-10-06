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
    ctx.strokeStyle = w.points ? theme.slingshot : w.oneWay ? theme.gate : theme.wall;
    line(ctx, w.ax, w.ay, w.bx, w.by);
  }

  drawPortals(ctx, game, theme);
  drawRollovers(ctx, game, theme);
  drawDropTargets(ctx, game, theme);
  drawLock(ctx, game, theme);
  drawSpinners(ctx, game, theme);
  drawKickback(ctx, game, theme);

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
  const onRamp = (b) => b.transit && b.transit.kind === 'ramp';
  for (const b of game.balls) {
    if (b.transit && !b.transit.visible) continue;
    if (onRamp(b)) continue;
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
  }
  drawRamp(ctx, game, theme);
  ctx.fillStyle = theme.ball;
  for (const b of game.balls.filter(onRamp)) {
    circle(ctx, b.x, b.y, b.r + 1);
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
  if (game.combo.count >= 2) {
    ctx.fillStyle = theme.banner;
    ctx.fillText(`COMBO x${game.combo.count}`, 24, 106);
    ctx.fillStyle = theme.text;
  }
  if (game.multiplier > 1) {
    ctx.fillStyle = theme.banner;
    ctx.fillText(`BONUS x${game.multiplier}`, 24, 56);
    ctx.fillStyle = theme.text;
  }
  ctx.textAlign = 'right';
  if (game.ballSave > 0) {
    ctx.fillStyle = theme.rolloverLit;
    ctx.fillText(`SAVE ${Math.ceil(game.ballSave)}`, table.width - 24, 56);
    ctx.fillStyle = theme.text;
  }
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
    if (p.kind === 'ramp') continue;
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

function drawKickback(ctx, game, theme) {
  const k = game.table.kickback;
  ctx.strokeStyle = k.armed ? theme.rolloverLit : theme.textMuted;
  ctx.lineWidth = 3;
  line(ctx, k.x - 8, k.y + 8, k.x, k.y - 8);
  line(ctx, k.x + 8, k.y + 8, k.x, k.y - 8);
}

function drawSpinners(ctx, game, theme) {
  ctx.strokeStyle = theme.spinner;
  ctx.lineWidth = 4;
  for (const s of game.table.spinners) {
    const half = Math.abs(Math.cos(s.turns * Math.PI * 2)) * s.r;
    line(ctx, s.x - half, s.y, s.x + half, s.y);
    ctx.lineWidth = 1;
    circle(ctx, s.x, s.y, s.r);
    ctx.stroke();
    ctx.lineWidth = 4;
  }
}

// The ramp is drawn over everything on the table, so whatever passes beneath it is hidden.
function drawRamp(ctx, game, theme) {
  const ramp = game.table.portals.find((p) => p.kind === 'ramp');
  const near = ramp.width / 2;
  const far = near * 0.7;
  const { x, y, exit } = ramp;

  ctx.fillStyle = theme.rampSurface;
  ctx.beginPath();
  ctx.moveTo(x - near, y);
  ctx.lineTo(exit.x - far, exit.y);
  ctx.lineTo(exit.x + far, exit.y);
  ctx.lineTo(x + near, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = theme.rampStripe;
  ctx.lineWidth = 2;
  for (let i = 1; i <= 6; i++) {
    const f = i / 7;
    const cy = y + (exit.y - y) * f;
    const w = (near + (far - near) * f) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - w, cy + w * 0.6);
    ctx.lineTo(x, cy);
    ctx.lineTo(x + w, cy + w * 0.6);
    ctx.stroke();
  }

  ctx.strokeStyle = theme.ramp;
  ctx.lineWidth = 3;
  line(ctx, x - near, y, exit.x - far, exit.y);
  line(ctx, x + near, y, exit.x + far, exit.y);
  line(ctx, x - near, y, x + near, y);
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
