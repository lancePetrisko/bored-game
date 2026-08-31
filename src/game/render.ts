import { COMBOS, type Tier } from './combos';
import { cubePos } from './entity';
import { CELL, type Camera } from './grid';
import { clamp, easeOutBack, easeOutCubic, easeOutQuint, heatHue, hsl } from './juice';
import { POOL_SIZE } from './particles';
import { DIR_GLYPH } from './types';
import { heat, type GameState } from './state';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const BG = '#07080d';

function font(size: number, weight = 700): string {
  return `${weight} ${size}px ${MONO}`;
}

/** World pixels (grid units * CELL) -> screen pixels. */
function toScreen(wx: number, wy: number, cam: Camera, w: number, h: number): [number, number] {
  return [wx - cam.x * CELL + w / 2, wy - cam.y * CELL + h / 2];
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const hv = heat(state);
  const hue = heatHue(hv);
  const cam = state.camera;
  const pos = cubePos(state.cube);
  const [cx, cy] = toScreen(pos.x * CELL, pos.y * CELL, cam, w, h);

  drawBackground(ctx, w, h, hue, hv);

  ctx.save();
  ctx.translate(state.juice.shakeX, state.juice.shakeY);

  drawGrid(ctx, state, w, h, hue, hv, cx, cy);
  drawTrail(ctx, state, w, h);
  drawParticles(ctx, state, w, h);
  drawCube(ctx, state, cx, cy, hue, hv);

  ctx.restore();

  if (state.juice.flash > 0) {
    ctx.fillStyle = hsl(state.juice.flashHue, 90, 65, state.juice.flash);
    ctx.fillRect(0, 0, w, h);
  }

  drawHud(ctx, state, w, h, hue, hv);
  if (state.toast) drawToast(ctx, state, w, h);
  if (state.overlay > 0.002) drawCollection(ctx, state, w, h);
  if (state.title > 0.002) drawTitle(ctx, state, w, h, hue);
}

export type HudTarget = 'mute' | 'combos' | null;

/**
 * Tap targets for the right-hand HUD labels. Lives here because it has to agree
 * with where drawHud puts the text, and generous enough for a thumb.
 */
export function hudHitTest(x: number, y: number, w: number): HudTarget {
  if (x < w - 210 || x > w - 6) return null;
  if (y >= 8 && y < 44) return 'mute';
  if (y >= 44 && y < 78) return 'combos';
  return null;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number, hv: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const radius = Math.max(w, h) * 0.75;
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
  glow.addColorStop(0, hsl(hue, 80, 50, 0.05 + hv * 0.16));
  glow.addColorStop(1, hsl(hue, 80, 50, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  hue: number,
  hv: number,
  cx: number,
  cy: number,
): void {
  const cam = state.camera;
  const originX = w / 2 - cam.x * CELL;
  const originY = h / 2 - cam.y * CELL;
  const startX = originX - Math.ceil(originX / CELL) * CELL;
  const startY = originY - Math.ceil(originY / CELL) * CELL;

  ctx.lineWidth = 1;
  ctx.strokeStyle = hsl(hue, 45, 60, 0.085 + hv * 0.08);
  ctx.beginPath();
  for (let x = startX; x <= w + CELL; x += CELL) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
  }
  for (let y = startY; y <= h + CELL; y += CELL) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // Intersections light up near the cube, so the grid reads as reactive.
  const reach = 300 + hv * 180;
  const reach2 = reach * reach;
  ctx.fillStyle = hsl(hue, 90, 70, 1);
  for (let x = startX; x <= w + CELL; x += CELL) {
    for (let y = startY; y <= h + CELL; y += CELL) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > reach2) continue;
      const k = 1 - Math.sqrt(d2) / reach;
      ctx.globalAlpha = k * k * (0.38 + hv * 0.5);
      const s = 2 + k * 2.4;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function drawTrail(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const cam = state.camera;
  for (const seg of state.cube.trail) {
    const k = 1 - seg.age / seg.maxAge;
    if (k <= 0) continue;
    const [x, y] = toScreen(seg.x * CELL, seg.y * CELL, cam, w, h);
    const size = CELL * 0.58 * easeOutCubic(k);
    ctx.fillStyle = hsl(seg.hue, 85, 62, k * k * 0.4);
    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.28);
    ctx.fill();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const cam = state.camera;
  const items = state.particles.items;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < POOL_SIZE; i++) {
    const p = items[i];
    if (p.life <= 0) continue;
    const k = p.life / p.maxLife;
    const [x, y] = toScreen(p.x, p.y, cam, w, h);
    if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;
    const s = p.size * k;
    ctx.fillStyle = hsl(p.hue, 95, 66, k * 0.75);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawCube(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cx: number,
  cy: number,
  hue: number,
  hv: number,
): void {
  const cube = state.cube;
  // A slow idle breath so a resting cube still looks alive.
  const breathe = 1 + Math.sin(state.time * 2.1) * 0.02;
  const base = CELL * 0.62 * breathe;
  const along = 1 + cube.stretch * 0.5 - cube.land * 0.32;
  const perp = 1 - cube.stretch * 0.28 + cube.land * 0.24;
  const horizontal = cube.dir === 'left' || cube.dir === 'right';
  const sx = horizontal ? along : perp;
  const sy = horizontal ? perp : along;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(cube.spin);

  ctx.shadowColor = hsl(hue, 100, 60, 0.9);
  ctx.shadowBlur = 22 + hv * 40 + cube.land * 18 + Math.sin(state.time * 2.1) * 4;

  const wpx = base * sx;
  const hpx = base * sy;
  ctx.fillStyle = hsl(hue, 90, 62 + hv * 8);
  ctx.beginPath();
  ctx.roundRect(-wpx / 2, -hpx / 2, wpx, hpx, Math.min(wpx, hpx) * 0.26);
  ctx.fill();

  ctx.shadowBlur = 0;
  const iw = wpx * 0.44;
  const ih = hpx * 0.44;
  ctx.fillStyle = hsl(hue, 100, 92, 0.9);
  ctx.beginPath();
  ctx.roundRect(-iw / 2, -ih / 2, iw, ih, Math.min(iw, ih) * 0.3);
  ctx.fill();

  ctx.restore();
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  hue: number,
  hv: number,
): void {
  ctx.textBaseline = 'alphabetic';

  // Chain counter, centre top.
  if (state.chain > 1) {
    const pop = easeOutBack(clamp(1 - state.pressPulse, 0, 1));
    const size = 58 + hv * 46;
    ctx.save();
    ctx.translate(w / 2, 118);
    ctx.scale(0.92 + pop * 0.12, 0.92 + pop * 0.12);
    ctx.textAlign = 'center';
    ctx.shadowColor = hsl(hue, 100, 60, 0.8);
    ctx.shadowBlur = 18 + hv * 34;
    ctx.fillStyle = hsl(hue, 95, 72);
    ctx.font = font(size, 800);
    ctx.fillText(String(state.chain), 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = hsl(hue, 40, 70, 0.55);
    ctx.font = font(13, 600);
    ctx.fillText('CHAIN', 0, 26);
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.font = font(12, 600);
  ctx.fillStyle = 'hsl(220 20% 70% / 0.5)';
  const discovered = state.stats.discovered.size;
  ctx.fillText(`BEST ${state.stats.bestChain}`, 24, 34);
  ctx.fillText(`PRESSES ${state.stats.totalPresses}`, 24, 54);
  ctx.fillText(`COMBOS ${discovered}/${COMBOS.length}`, 24, 74);

  ctx.textAlign = 'right';
  const key = state.touch ? '' : '  M';
  ctx.fillText(state.stats.muted ? `SOUND OFF${key}` : `SOUND ON${key}`, w - 24, 34);
  ctx.fillText(state.touch ? 'COMBOS' : 'COMBOS  TAB', w - 24, 54);

  // The title card carries its own instructions, so the hint waits its turn.
  if (state.hint > 0.01 && state.title < 0.02) {
    ctx.textAlign = 'center';
    ctx.font = font(13, 600);
    ctx.fillStyle = `hsl(220 20% 75% / ${state.hint * 0.55})`;
    const move = state.touch ? 'swipe to move' : 'arrow keys to move';
    ctx.fillText(`${move} — find the named combos`, w / 2, h - 38);
  }
}

function drawToast(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const toast = state.toast!;
  const { combo, age, hue } = toast;
  const punch = easeOutBack(clamp(age / 0.22, 0, 1));
  const fade = age < 1.1 ? 1 : 1 - easeOutQuint(clamp((age - 1.1) / 0.4, 0, 1));
  const rise = (1 - easeOutCubic(clamp(age / 0.5, 0, 1))) * 14;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(w / 2, h * 0.72 + rise);
  ctx.scale(0.8 + punch * 0.2, 0.8 + punch * 0.2);
  ctx.textAlign = 'center';

  ctx.shadowColor = hsl(hue, 100, 60, 0.9);
  ctx.shadowBlur = 26;
  ctx.fillStyle = hsl(hue, 95, 74);
  ctx.font = font(42 + combo.tier * 6, 800);
  ctx.fillText(combo.name.toUpperCase(), 0, 0);

  ctx.shadowBlur = 0;
  ctx.fillStyle = hsl(hue, 60, 80, 0.72);
  ctx.font = font(20, 700);
  ctx.fillText(combo.seq.map((d) => DIR_GLYPH[d]).join(' '), 0, 32);

  ctx.fillStyle = hsl(hue, 30, 75, 0.45);
  ctx.font = font(11, 600);
  ctx.fillText(`TIER ${combo.tier}`, 0, 54);
  ctx.restore();
}

const TIER_LABEL: Record<Tier, string> = { 1: 'WARM UP', 2: 'PROPER MOVES', 3: 'SHOW OFF' };

function drawCollection(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const k = state.overlay;
  ctx.fillStyle = `hsl(230 40% 3% / ${0.94 * k})`;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(w / 2, h / 2);
  ctx.scale(0.96 + k * 0.04, 0.96 + k * 0.04);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'hsl(200 90% 78%)';
  ctx.font = font(26, 800);
  ctx.fillText('COMBO COLLECTION', 0, -h / 2 + 88);

  ctx.fillStyle = 'hsl(220 20% 70% / 0.45)';
  ctx.font = font(12, 600);
  ctx.fillText(
    state.touch
      ? `${state.stats.discovered.size} of ${COMBOS.length} found — tap to close`
      : `${state.stats.discovered.size} of ${COMBOS.length} found — TAB or ESC to close`,
    0,
    -h / 2 + 112,
  );

  const tiers: Tier[] = [1, 2, 3];
  if (w < 700) {
    drawCollectionList(ctx, state, w, h, tiers);
    ctx.restore();
    drawCheatButton(ctx, state, w, h);
    return;
  }

  const colWidth = Math.min(300, (w - 120) / 3);
  const totalWidth = colWidth * 3 - 40;
  const top = -h / 2 + 168;

  ctx.textAlign = 'left';
  tiers.forEach((tier, ci) => {
    const x = -totalWidth / 2 + ci * colWidth + 12;
    const hue = 195 + (tier - 1) * 60;

    ctx.fillStyle = hsl(hue, 70, 70, 0.8);
    ctx.font = font(12, 800);
    ctx.fillText(TIER_LABEL[tier], x, top);

    let y = top + 28;
    for (const combo of COMBOS) {
      if (combo.tier !== tier) continue;
      const found = state.stats.discovered.has(combo.id);
      const shown = found || state.stats.cheats;

      ctx.fillStyle = found
        ? hsl(hue, 80, 78, 0.95)
        : shown
          ? hsl(hue, 35, 70, 0.5)
          : 'hsl(220 15% 60% / 0.35)';
      ctx.font = font(15, 700);
      ctx.fillText(shown ? combo.name : '???', x, y);

      ctx.fillStyle = found
        ? hsl(hue, 60, 72, 0.6)
        : shown
          ? hsl(hue, 30, 70, 0.35)
          : 'hsl(220 15% 60% / 0.22)';
      ctx.font = font(14, 700);
      ctx.fillText(
        combo.seq.map((d) => (shown ? DIR_GLYPH[d] : '·')).join(' '),
        x,
        y + 18,
      );

      y += 44;
    }
  });

  ctx.restore();
  drawCheatButton(ctx, state, w, h);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Shared by the drawing and the tap test, so the two can never drift apart. */
export function cheatButtonRect(w: number, h: number): Rect {
  const bw = Math.min(300, w - 64);
  return { x: w / 2 - bw / 2, y: h - 84, w: bw, h: 42 };
}

/** Opt-in reveal for the combos you have not landed yet. Collection only. */
function drawCheatButton(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
): void {
  const k = state.overlay;
  const on = state.stats.cheats;
  const r = cheatButtonRect(w, h);
  const hue = on ? 45 : 200;

  ctx.save();
  ctx.globalAlpha = k;

  ctx.fillStyle = on ? hsl(hue, 80, 55, 0.16) : 'hsl(220 30% 70% / 0.05)';
  ctx.strokeStyle = on ? hsl(hue, 85, 65, 0.75) : 'hsl(220 25% 70% / 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = on ? hsl(hue, 90, 76, 0.95) : 'hsl(220 25% 78% / 0.55)';
  ctx.font = font(13, 800);
  ctx.fillText(on ? 'CHEATS ON — ALL COMBOS SHOWN' : 'SHOW ALL COMBOS (CHEAT)', r.x + r.w / 2, r.y + r.h / 2 - 5);

  ctx.fillStyle = on ? hsl(hue, 50, 78, 0.5) : 'hsl(220 20% 75% / 0.3)';
  ctx.font = font(10, 600);
  ctx.fillText(
    state.touch ? 'tap to toggle' : 'click, or press C',
    r.x + r.w / 2,
    r.y + r.h / 2 + 12,
  );

  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/**
 * Phone layout for the collection: three columns do not fit, so the tiers stack
 * as one list with the arrow sequence pushed to the right edge of the column.
 */
function drawCollectionList(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  tiers: Tier[],
): void {
  const colWidth = Math.min(340, w - 48);
  const left = -colWidth / 2;
  const right = colWidth / 2;
  const ROW = 26;
  const HEADER = 34;

  const needed = tiers.length * HEADER + COMBOS.length * ROW;
  const room = h - 190;
  // Shrink rather than run off the bottom of a short screen.
  const scale = Math.min(1, room / needed);

  ctx.save();
  ctx.scale(scale, scale);
  let y = (-h / 2 + 150) / scale;

  for (const tier of tiers) {
    const hue = 195 + (tier - 1) * 60;
    ctx.textAlign = 'left';
    ctx.fillStyle = hsl(hue, 70, 70, 0.8);
    ctx.font = font(11, 800);
    ctx.fillText(TIER_LABEL[tier], left, y);
    y += HEADER - 12;

    for (const combo of COMBOS) {
      if (combo.tier !== tier) continue;
      const found = state.stats.discovered.has(combo.id);
      const shown = found || state.stats.cheats;

      ctx.textAlign = 'left';
      ctx.fillStyle = found
        ? hsl(hue, 80, 78, 0.95)
        : shown
          ? hsl(hue, 35, 70, 0.5)
          : 'hsl(220 15% 60% / 0.35)';
      ctx.font = font(14, 700);
      ctx.fillText(shown ? combo.name : '???', left, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = found
        ? hsl(hue, 60, 72, 0.6)
        : shown
          ? hsl(hue, 30, 70, 0.35)
          : 'hsl(220 15% 60% / 0.22)';
      ctx.font = font(13, 700);
      ctx.fillText(combo.seq.map((d) => (shown ? DIR_GLYPH[d] : '·')).join(' '), right, y);

      y += ROW;
    }
    y += 12;
  }

  ctx.restore();
}

/** First-run card: the game's name, what it is, and how to start it. */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  hue: number,
): void {
  const k = state.title;

  ctx.fillStyle = `hsl(230 45% 3% / ${0.86 * k})`;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(w / 2, h / 2);
  // Dismissing pushes the card away rather than blinking it out.
  ctx.scale(1 + (1 - k) * 0.07, 1 + (1 - k) * 0.07);
  ctx.textAlign = 'center';

  const titleSize = Math.min(62, w / 8.5);
  ctx.shadowColor = hsl(hue, 100, 60, 0.85);
  ctx.shadowBlur = 30;
  ctx.fillStyle = hsl(hue, 92, 76);
  ctx.font = font(titleSize, 800);
  ctx.fillText('BORED CUBE', 0, -56);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'hsl(220 25% 78% / 0.7)';
  ctx.font = font(Math.min(15, w / 27), 600);
  ctx.fillText('a cube, a grid, and nothing to win', 0, -22);

  const move = state.touch ? 'SWIPE TO MOVE' : 'ARROW KEYS TO MOVE';
  ctx.fillStyle = hsl(hue, 60, 80, 0.85);
  ctx.font = font(Math.min(17, w / 24), 700);
  ctx.fillText(move, 0, 26);

  ctx.fillStyle = 'hsl(220 20% 72% / 0.55)';
  ctx.font = font(Math.min(13, w / 31), 600);
  ctx.fillText(`${COMBOS.length} named combos are hidden in the directions`, 0, 52);

  // A slow pulse on the call to action, so the card never reads as a dead screen.
  const pulse = 0.55 + Math.sin(state.time * 3.4) * 0.3;
  ctx.fillStyle = `hsl(220 25% 88% / ${pulse})`;
  ctx.font = font(Math.min(14, w / 29), 700);
  ctx.fillText(state.touch ? 'swipe anywhere to start' : 'press an arrow key to start', 0, 104);

  ctx.restore();
}
