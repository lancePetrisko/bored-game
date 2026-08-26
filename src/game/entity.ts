import { DIR_VEC, type Dir } from './types';
import { approach, easeOutBack } from './juice';

export interface TrailSegment {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  hue: number;
}

export interface Cube {
  /** Grid cell being moved into. */
  gx: number;
  gy: number;
  /** Grid cell being moved from. */
  fromX: number;
  fromY: number;
  progress: number;
  duration: number;
  moving: boolean;
  dir: Dir;
  /** One buffered press, so mashing mid-step is never swallowed. */
  queued: Dir | null;
  /** Stretch along the travel axis, set on departure. */
  stretch: number;
  /** Squash against the travel axis, set on arrival. */
  land: number;
  /** Radians of leftover rotation, spent on combo payoffs. */
  spin: number;
  trail: TrailSegment[];
}

export const TRAIL_MAX = 28;

/** Everything a step needs to know about the current escalation level. */
export interface StepStyle {
  duration: number;
  trailLife: number;
  hue: number;
}

export function createCube(): Cube {
  return {
    gx: 0,
    gy: 0,
    fromX: 0,
    fromY: 0,
    progress: 1,
    duration: 0.1,
    moving: false,
    dir: 'right',
    queued: null,
    stretch: 0,
    land: 0,
    spin: 0,
    trail: [],
  };
}

/** Step duration tightens as the chain climbs, so fast mashing keeps up. */
export function moveDuration(heat: number): number {
  return 0.105 - heat * 0.035;
}

export function trailLife(heat: number): number {
  return 0.26 + heat * 0.5;
}

export function startMove(cube: Cube, dir: Dir, style: StepStyle): void {
  const v = DIR_VEC[dir];
  cube.fromX = cube.gx;
  cube.fromY = cube.gy;
  cube.gx += v.x;
  cube.gy += v.y;
  cube.dir = dir;
  cube.progress = 0;
  cube.duration = style.duration;
  cube.moving = true;
  cube.stretch = 1;

  cube.trail.push({ x: cube.fromX, y: cube.fromY, age: 0, maxAge: style.trailLife, hue: style.hue });
  if (cube.trail.length > TRAIL_MAX) cube.trail.shift();
}

export function requestMove(cube: Cube, dir: Dir, style: StepStyle): void {
  if (cube.moving) cube.queued = dir;
  else startMove(cube, dir, style);
}

export function updateCube(cube: Cube, dt: number, style: StepStyle): void {
  if (cube.moving) {
    cube.progress += dt / cube.duration;
    if (cube.progress >= 1) {
      cube.progress = 1;
      cube.moving = false;
      cube.land = 1;
      const next = cube.queued;
      cube.queued = null;
      if (next) startMove(cube, next, style);
    }
  }

  cube.stretch = approach(cube.stretch, 0, 13, dt);
  cube.land = approach(cube.land, 0, 15, dt);
  cube.spin = approach(cube.spin, 0, 6, dt);

  for (let i = cube.trail.length - 1; i >= 0; i--) {
    const t = cube.trail[i];
    t.age += dt;
    if (t.age >= t.maxAge) cube.trail.splice(i, 1);
  }
}

/** Fractional grid position, overshooting slightly before it settles. */
export function cubePos(cube: Cube): { x: number; y: number } {
  const t = easeOutBack(cube.progress);
  return {
    x: cube.fromX + (cube.gx - cube.fromX) * t,
    y: cube.fromY + (cube.gy - cube.fromY) * t,
  };
}
