import { flipperSegment, FLIPPER_THICKNESS } from './flipper.js';

export function render(ctx, game) {
  const { table, ball } = game;
  ctx.clearRect(0, 0, table.width, table.height);
  ctx.fillStyle = '#10103a';
  ctx.fillRect(0, 0, table.width, table.height);

  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  for (const w of table.walls) {
    ctx.strokeStyle = w.points ? '#ff6ec7' : '#6ea8ff';
    line(ctx, w.ax, w.ay, w.bx, w.by);
  }

  for (const b of table.bumpers) {
    ctx.fillStyle = b.litFor > 0 ? '#fff176' : '#ff9800';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = FLIPPER_THICKNESS * 2;
  for (const f of Object.values(game.flippers)) {
    const s = flipperSegment(f);
    line(ctx, s.ax, s.ay, s.bx, s.by);
  }

  drawPlunger(ctx, game);

  ctx.fillStyle = '#e8e8e8';
  circle(ctx, ball.x, ball.y, ball.r);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${game.score}`, 24, 30);
  ctx.textAlign = 'right';
  ctx.fillText(`BALLS ${game.ballsLeft}`, table.width - 24, 30);

  if (game.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 300, table.width, 140);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '36px monospace';
    ctx.fillText('GAME OVER', table.width / 2, 360);
    ctx.font = '18px monospace';
    ctx.fillText(`Final score ${game.score} — press Enter`, table.width / 2, 400);
  }
}

function drawPlunger(ctx, game) {
  const { plungerStart, height } = game.table;
  const top = plungerStart.y + game.ball.r + game.plungerCharge * 14;
  ctx.fillStyle = '#bbb';
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
