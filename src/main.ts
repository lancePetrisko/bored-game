import './style.css';
import { attachKeyboard, attachPointer } from './game/input';
import { cheatButtonRect, hudHitTest, render } from './game/render';
import { createState, handlePress, toggleCheats, toggleMute, togglePause, update } from './game/state';
import { flushStats } from './game/stats';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const state = createState();

let width = 0;
let height = 0;
let dpr = 1;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

resize();
window.addEventListener('resize', resize);

attachKeyboard({
  onDir: (dir) => handlePress(state, dir, performance.now()),
  onToggleMute: () => toggleMute(state),
  onToggleOverlay: () => {
    state.overlayOpen = !state.overlayOpen;
  },
  // Escape backs out of the collection first, and pauses the run otherwise.
  onEscape: () => {
    if (state.overlayOpen) state.overlayOpen = false;
    else togglePause(state, performance.now());
  },
  // The cheat toggle lives in the collection, so the shortcut does too.
  onToggleCheats: () => {
    if (state.overlayOpen) toggleCheats(state);
  },
});

attachPointer(canvas, {
  onDir: (dir) => handlePress(state, dir, performance.now()),
  onTouchDetected: () => {
    state.touch = true;
  },
  onTap: (x, y) => {
    // The collection sits above the pause card, so it is the first thing a tap
    // backs out of.
    if (state.overlayOpen) {
      const r = cheatButtonRect(width, height);
      const onButton = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      if (onButton) toggleCheats(state);
      else state.overlayOpen = false;
      return;
    }
    if (state.paused) {
      togglePause(state, performance.now());
      return;
    }
    const target = hudHitTest(x, y, width);
    if (target === 'mute') toggleMute(state);
    else if (target === 'combos') state.overlayOpen = true;
    else if (target === 'pause') togglePause(state, performance.now());
    else state.titleOpen = false;
  },
});

window.addEventListener('beforeunload', () => flushStats(state.stats));

/** Fixed simulation step keeps the feel identical on 60Hz and 144Hz displays. */
const STEP = 1 / 120;
const MAX_FRAME = 0.1;

let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);

  const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  accumulator += elapsed * state.juice.timeScale;

  let steps = 0;
  while (accumulator >= STEP && steps < 8) {
    update(state, STEP, now);
    accumulator -= STEP;
    steps++;
  }

  // The cursor is hidden while playing, but menus have things to aim at.
  const cursor = state.overlayOpen || state.paused ? 'default' : 'none';
  if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(ctx, state, width, height);
}

requestAnimationFrame(frame);
