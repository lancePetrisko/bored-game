export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/** Grid-space unit vector per direction. +y is down, matching canvas space. */
export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DIR_GLYPH: Record<Dir, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
