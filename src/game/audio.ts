import type { Dir } from './types';
import type { Tier } from './combos';

/** Minor pentatonic, so nothing you mash can sound wrong. */
const SCALE = [0, 3, 5, 7, 10];
const ROOT_HZ = 220;
const MAX_OCTAVE = 3;

const DIR_DEGREE: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

/** Created on first keypress — browsers refuse an AudioContext before a gesture. */
function ensureContext(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

function degreeToHz(degree: number): number {
  const octave = Math.min(Math.floor(degree / SCALE.length), MAX_OCTAVE);
  const semitones = SCALE[degree % SCALE.length] + octave * 12;
  return ROOT_HZ * Math.pow(2, semitones / 12);
}

function tone(
  ac: AudioContext,
  freq: number,
  when: number,
  duration: number,
  peak: number,
  type: OscillatorType,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  osc.connect(gain);
  gain.connect(master!);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

/** One blip per step. Pitch walks up the scale as the chain grows. */
export function playStep(dir: Dir, chain: number): void {
  const ac = ensureContext();
  if (!ac) return;
  const degree = DIR_DEGREE[dir] + chain;
  tone(ac, degreeToHz(degree), ac.currentTime, 0.14, 0.16, 'triangle');
}

const TIER_CHORD: Record<Tier, number[]> = {
  1: [0, 2],
  2: [0, 2, 4],
  3: [0, 2, 4, 5],
};

/** Chord stab on a named combo, fatter with tier. */
export function playCombo(tier: Tier, chain: number): void {
  const ac = ensureContext();
  if (!ac) return;
  const base = Math.min(chain, 10);
  const now = ac.currentTime;

  TIER_CHORD[tier].forEach((step, i) => {
    tone(ac, degreeToHz(base + step), now + i * 0.035, 0.55 + tier * 0.12, 0.13, 'sawtooth');
  });

  // Low thump underneath so the hit has weight.
  tone(ac, 55 + tier * 12, now, 0.3, 0.32, 'sine');
}

export function playChainBreak(): void {
  const ac = ensureContext();
  if (!ac) return;
  tone(ac, 110, ac.currentTime, 0.18, 0.06, 'sine');
}
