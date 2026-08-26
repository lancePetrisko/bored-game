import { approach } from './juice';

export const CELL = 58;

export interface Camera {
  x: number;
  y: number;
}

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

/**
 * The camera chases the cube instead of locking to it. That lag is what makes
 * a fast chain read as speed rather than as a cube standing still.
 */
export const CAMERA_RATE = 9;

export function updateCamera(cam: Camera, targetX: number, targetY: number, dt: number): void {
  cam.x = approach(cam.x, targetX, CAMERA_RATE, dt);
  cam.y = approach(cam.y, targetY, CAMERA_RATE, dt);
}

/** World (grid units, fractional) -> screen pixels, given viewport size. */
export function worldToScreen(
  wx: number,
  wy: number,
  cam: Camera,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: (wx - cam.x) * CELL + width / 2,
    y: (wy - cam.y) * CELL + height / 2,
  };
}
