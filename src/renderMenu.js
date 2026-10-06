import { getHighScore } from './highScores.js';
import { selectedTable } from './menu.js';

const WIDTH = 600;
const HEIGHT = 800;
const CARD_W = 170;
const CARD_H = 250;
const GAP = 20;

// `scores` maps table id to best score. The screen takes the selected table's theme, so
// moving the selection previews the look.
export function renderMenu(ctx, menu, scores, audio) {
  const theme = selectedTable(menu).theme;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.banner;
  ctx.font = '44px monospace';
  ctx.fillText('PINBALL', WIDTH / 2, 130);
  ctx.fillStyle = theme.textMuted;
  ctx.font = '16px monospace';
  ctx.fillText('choose a table', WIDTH / 2, 165);

  const total = menu.tables.length * CARD_W + (menu.tables.length - 1) * GAP;
  menu.tables.forEach((table, i) => {
    const x = (WIDTH - total) / 2 + i * (CARD_W + GAP);
    drawCard(ctx, table, x, 230, i === menu.index, scores[table.id] ?? 0, theme);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.text;
  ctx.font = '16px monospace';
  ctx.fillText('← → choose     Enter start', WIDTH / 2, 560);
  ctx.fillStyle = theme.textMuted;
  ctx.font = '13px monospace';
  ctx.fillText(`M music ${audio.musicOn ? 'on' : 'off'}     N sound ${audio.sfxOn ? 'on' : 'off'}`, WIDTH / 2, 590);
}

function drawCard(ctx, table, x, y, selected, best, menuTheme) {
  const t = table.theme;
  ctx.fillStyle = t.background;
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.lineWidth = selected ? 4 : 1;
  ctx.strokeStyle = selected ? menuTheme.banner : menuTheme.textMuted;
  ctx.strokeRect(x, y, CARD_W, CARD_H);

  const swatches = [t.bumper, t.wall, t.ramp, t.flipper];
  swatches.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 30 + i * 37, y + 50, 14, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = t.text;
  ctx.font = '20px monospace';
  ctx.fillText(table.name, x + CARD_W / 2, y + 120);
  ctx.fillStyle = t.textMuted;
  ctx.font = '13px monospace';
  ctx.fillText(table.blurb, x + CARD_W / 2, y + 145);
  ctx.fillText(best > 0 ? `best ${best}` : 'no score yet', x + CARD_W / 2, y + 215);
}

export function loadScores(storage, tables) {
  const scores = {};
  for (const table of tables) scores[table.id] = getHighScore(storage, table.id);
  return scores;
}
