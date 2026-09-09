import { DIR_VEC, type Dir } from './types';
import { createCube, cubePos, moveDuration, requestMove, trailLife, updateCube, type Cube, type StepStyle } from './entity';
import { createCamera, updateCamera, CELL, type Camera } from './grid';
import { createPool, emit, updateParticles, type ParticlePool } from './particles';
import { addFlash, addShake, createJuice, heatHue, heatOf, updateJuice, type Juice } from './juice';
import { pushPress, type Press } from './input';
import { createMatcher, matchCombo, type Combo, type ComboMatcher } from './combos';
import { loadStats, saveStats, type Stats } from './stats';
import * as audio from './audio';

/** A press this long after the previous one keeps the chain alive. */
export const CHAIN_WINDOW_MS = 900;

export interface Toast {
  combo: Combo;
  age: number;
  hue: number;
}

export interface GameState {
  cube: Cube;
  camera: Camera;
  buffer: Press[];
  matcher: ComboMatcher;
  chain: number;
  lastPressTime: number;
  particles: ParticlePool;
  juice: Juice;
  toast: Toast | null;
  stats: Stats;
  overlayOpen: boolean;
  /** 0..1 open amount, so the collection panel animates. */
  overlay: number;
  /** Seconds since boot, used by ambient animation. */
  time: number;
  /** Punches to 1 on every press; drives the HUD counter pop. */
  pressPulse: number;
  /** Fades the "arrows to move" hint out once you clearly get it. */
  hint: number;
  /** True once a finger is used, so prompts can say swipe instead of arrow keys. */
  touch: boolean;
  titleOpen: boolean;
  /** 1..0 fade of the title card, so dismissing it is not a hard cut. */
  title: number;
  /** Freezes the simulation without losing the chain. */
  paused: boolean;
  /** 0..1 open amount of the pause card. */
  pause: number;
  /** Timestamp the pause began, used to rewind the chain clock on resume. */
  pauseStart: number;
}

export function createState(): GameState {
  const stats = loadStats();
  audio.setMuted(stats.muted);
  return {
    cube: createCube(),
    camera: createCamera(),
    buffer: [],
    matcher: createMatcher(),
    chain: 0,
    lastPressTime: -Infinity,
    particles: createPool(),
    juice: createJuice(),
    toast: null,
    stats,
    overlayOpen: false,
    overlay: 0,
    time: 0,
    pressPulse: 0,
    hint: 1,
    touch: false,
    titleOpen: true,
    title: 1,
    paused: false,
    pause: 0,
    pauseStart: 0,
  };
}

export function heat(state: GameState): number {
  return heatOf(state.chain);
}

function stepStyle(state: GameState): StepStyle {
  const h = heat(state);
  return { duration: moveDuration(h), trailLife: trailLife(h), hue: heatHue(h) };
}

export function handlePress(state: GameState, dir: Dir, now: number): void {
  if (state.paused) return;
  // The first input is a real move as well as the thing that clears the title.
  state.titleOpen = false;
  pushPress(state.buffer, dir, now);

  state.chain = now - state.lastPressTime <= CHAIN_WINDOW_MS ? state.chain + 1 : 1;
  state.lastPressTime = now;
  state.stats.totalPresses++;
  if (state.chain > state.stats.bestChain) state.stats.bestChain = state.chain;
  state.pressPulse = 1;
  state.hint = Math.max(0, state.hint - 0.12);

  const h = heat(state);
  const hue = heatHue(h);
  requestMove(state.cube, dir, stepStyle(state));

  const pos = cubePos(state.cube);
  const v = DIR_VEC[dir];
  // Exhaust sprays backwards out of the cube, opposite to travel.
  emit(state.particles, {
    x: pos.x * CELL,
    y: pos.y * CELL,
    count: 4 + Math.round(h * 6),
    angle: Math.atan2(-v.y, -v.x),
    spread: 1.1,
    speed: 170 + h * 190,
    life: 0.36,
    size: 3.5 + h * 2,
    hue,
  });

  audio.playStep(dir, state.chain);

  const combo = matchCombo(state.matcher, state.buffer);
  if (combo) fireCombo(state, combo, hue);

  saveStats(state.stats);
}

function fireCombo(state: GameState, combo: Combo, hue: number): void {
  state.stats.discovered.add(combo.id);
  state.toast = { combo, age: 0, hue };

  addShake(state.juice, 4 + combo.tier * 6);
  addFlash(state.juice, 0.07 + combo.tier * 0.05, hue);
  state.cube.spin += (Math.PI / 2) * combo.tier;

  const pos = cubePos(state.cube);
  emit(state.particles, {
    x: pos.x * CELL,
    y: pos.y * CELL,
    count: 18 * combo.tier,
    speed: 240 + combo.tier * 120,
    life: 0.55 + combo.tier * 0.15,
    size: 4 + combo.tier,
    hue,
    hueVar: 40,
    drag: 2.2,
  });

  // Tier 3 earns a beat of slow motion to sell the landing.
  if (combo.tier === 3) state.juice.timeScale = 0.32;

  audio.playCombo(combo.tier, state.chain);
}

export function toggleMute(state: GameState): void {
  state.stats.muted = !state.stats.muted;
  audio.setMuted(state.stats.muted);
  saveStats(state.stats);
}

/**
 * A pause is a hard freeze: nothing simulates, and on resume the chain clock is
 * pushed forward by the paused duration so a chain never dies while you are away.
 */
export function togglePause(state: GameState, now: number): void {
  // The title card is already a pause; a second one on top just confuses.
  if (state.titleOpen) return;

  if (state.paused) {
    state.paused = false;
    state.lastPressTime += now - state.pauseStart;
  } else {
    state.paused = true;
    state.pauseStart = now;
  }
  audio.setSuspended(state.paused);
}

export function toggleCheats(state: GameState): void {
  state.stats.cheats = !state.stats.cheats;
  saveStats(state.stats);
}

export function update(state: GameState, dt: number, now: number): void {
  state.time += dt;
  state.pause += ((state.paused ? 1 : 0) - state.pause) * Math.min(1, dt * 14);

  if (state.paused) {
    // Everything else holds its exact position; only the cards keep animating.
    state.overlay += ((state.overlayOpen ? 1 : 0) - state.overlay) * Math.min(1, dt * 14);
    return;
  }

  if (state.chain > 0 && now - state.lastPressTime > CHAIN_WINDOW_MS) {
    state.chain = 0;
    audio.playChainBreak();
  }

  updateCube(state.cube, dt, stepStyle(state));
  const pos = cubePos(state.cube);
  updateCamera(state.camera, pos.x, pos.y, dt);
  updateParticles(state.particles, dt);
  updateJuice(state.juice, dt);

  if (state.toast) {
    state.toast.age += dt;
    if (state.toast.age > 1.5) state.toast = null;
  }

  state.pressPulse = Math.max(0, state.pressPulse - dt * 4);
  if (!state.titleOpen) state.title = Math.max(0, state.title - dt * 3.5);
  state.overlay += ((state.overlayOpen ? 1 : 0) - state.overlay) * Math.min(1, dt * 14);
}
