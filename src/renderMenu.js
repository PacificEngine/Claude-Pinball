import { getHighScore } from './highScores.js';
import { selectedTable } from './menu.js';
import { createTable } from './table.js';

const WIDTH = 600;
const HEIGHT = 800;
const CARD_W = 170;
const CARD_H = 250;
const GAP = 20;
const THUMB_SCALE = 0.15;

// Building a table is cheap but not free, and the menu redraws every frame.
const thumbnails = new Map();
const tableFor = (layout) => {
  if (!thumbnails.has(layout)) thumbnails.set(layout, createTable(layout));
  return thumbnails.get(layout);
};

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

  drawThumbnail(ctx, tableFor(table.layout), t, x + (CARD_W - 600 * THUMB_SCALE) / 2, y + 14);

  ctx.textAlign = 'center';
  ctx.fillStyle = t.text;
  ctx.font = '17px monospace';
  ctx.fillText(table.name, x + CARD_W / 2, y + 168);
  ctx.fillStyle = t.textMuted;
  ctx.font = '13px monospace';
  ctx.fillText(table.blurb, x + CARD_W / 2, y + 192);
  ctx.fillText(best > 0 ? `best ${best}` : 'no score yet', x + CARD_W / 2, y + 230);
}

export function loadScores(storage, tables) {
  const scores = {};
  for (const table of tables) scores[table.id] = getHighScore(storage, table.id);
  return scores;
}

// A tiny schematic of the layout, so the tables can be told apart before choosing one.
function drawThumbnail(ctx, table, t, ox, oy) {
  const k = THUMB_SCALE;
  const px = (x) => ox + x * k;
  const py = (y) => oy + y * k;
  const seg = (ax, ay, bx, by) => {
    ctx.beginPath();
    ctx.moveTo(px(ax), py(ay));
    ctx.lineTo(px(bx), py(by));
    ctx.stroke();
  };
  const dot = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(r * k, 1.5), 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.lineWidth = 1;
  ctx.strokeStyle = t.wall;
  for (const w of table.walls) seg(w.ax, w.ay, w.bx, w.by);

  ctx.fillStyle = t.bumper;
  for (const b of table.bumpers) dot(b.x, b.y, b.r);
  ctx.fillStyle = t.wormhole;
  for (const p of table.portals) if (p.kind === 'wormhole') dot(p.x, p.y, p.r);
  ctx.fillStyle = t.lock;
  dot(table.lock.x, table.lock.y, table.lock.r);

  ctx.strokeStyle = t.dropTarget;
  ctx.lineWidth = 2;
  for (const bank of table.dropBanks) for (const s of bank.targets) seg(s.ax, s.ay, s.bx, s.by);

  const ramp = table.portals.find((p) => p.kind === 'ramp');
  ctx.strokeStyle = t.ramp;
  ctx.lineWidth = 3;
  seg(ramp.x, ramp.y, ramp.exit.x, ramp.exit.y);

  ctx.strokeStyle = t.flipper;
  ctx.lineWidth = 2;
  seg(170, 700, 260, 745);
  seg(390, 700, 300, 745);
  for (const f of table.flippers.slice(2)) seg(f.x, f.y, f.x + f.side * f.length, f.y + 30);
}
