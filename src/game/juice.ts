/** Easing curves, screen-level effects, and the shared heat palette. */

const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;

/** Overshoots past 1 before settling. This is the whole feel of a step. */
export function easeOutBack(t: number): number {
  const u = t - 1;
  return 1 + BACK_C3 * u * u * u + BACK_C1 * u * u;
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeOutQuint(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u * u * u;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential approach. `rate` is roughly
 * "how many e-folds per second" — higher is snappier.
 */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return lerp(target, current, Math.exp(-rate * dt));
}

/** 0..1 escalation value derived from the chain counter. */
export function heatOf(chain: number): number {
  return clamp(chain / 30, 0, 1);
}

/** Cyan -> violet -> pink -> gold as heat climbs. */
export function heatHue(heat: number): number {
  return (195 + heat * 210) % 360;
}

export function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsl(${h.toFixed(1)} ${s}% ${l}% / ${a})`;
}

export interface Juice {
  shake: number;
  shakeX: number;
  shakeY: number;
  flash: number;
  flashHue: number;
  /** <1 slows the simulation for a beat after a big combo. */
  timeScale: number;
}

export function createJuice(): Juice {
  return { shake: 0, shakeX: 0, shakeY: 0, flash: 0, flashHue: 195, timeScale: 1 };
}

export function addShake(juice: Juice, amount: number): void {
  juice.shake = Math.min(juice.shake + amount, 42);
}

export function addFlash(juice: Juice, amount: number, hue: number): void {
  juice.flash = Math.min(juice.flash + amount, 0.55);
  juice.flashHue = hue;
}

export function updateJuice(juice: Juice, dt: number): void {
  juice.shake = approach(juice.shake, 0, 11, dt);
  if (juice.shake < 0.05) juice.shake = 0;
  juice.shakeX = (Math.random() * 2 - 1) * juice.shake;
  juice.shakeY = (Math.random() * 2 - 1) * juice.shake;

  juice.flash = approach(juice.flash, 0, 9, dt);
  if (juice.flash < 0.002) juice.flash = 0;

  juice.timeScale = approach(juice.timeScale, 1, 6, dt);
  if (juice.timeScale > 0.995) juice.timeScale = 1;
}
