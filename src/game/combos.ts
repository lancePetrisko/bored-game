import type { Dir } from './types';
import type { Press } from './input';

export type Tier = 1 | 2 | 3;

export interface Combo {
  id: string;
  name: string;
  seq: Dir[];
  /** Max gap allowed between consecutive presses of the sequence. */
  windowMs: number;
  tier: Tier;
}

/**
 * The content of the game. Longer + tighter windows earn a higher tier,
 * and tier drives how loud the reward is.
 */
export const COMBOS: Combo[] = [
  { id: 'shimmy', name: 'Shimmy', seq: ['left', 'right', 'left', 'right'], windowMs: 400, tier: 1 },
  { id: 'bounce', name: 'Bounce', seq: ['up', 'down', 'up', 'down'], windowMs: 400, tier: 1 },
  { id: 'yo-yo', name: 'Yo-Yo', seq: ['left', 'left', 'right', 'right'], windowMs: 420, tier: 1 },
  { id: 'pogo', name: 'Pogo', seq: ['up', 'up', 'up', 'up'], windowMs: 380, tier: 1 },
  { id: 'burrow', name: 'Burrow', seq: ['down', 'down', 'down', 'down'], windowMs: 380, tier: 1 },
  { id: 'crab-walk', name: 'Crab Walk', seq: ['left', 'left', 'left', 'left'], windowMs: 380, tier: 1 },
  { id: 'heartbeat', name: 'Heartbeat', seq: ['up', 'down', 'down', 'up'], windowMs: 450, tier: 1 },

  { id: 'dinkie-lance', name: 'Dinkie Lance', seq: ['right', 'up', 'left', 'down'], windowMs: 600, tier: 2 },
  { id: 'the-spin', name: 'The Spin', seq: ['up', 'right', 'down', 'left'], windowMs: 500, tier: 2 },
  { id: 'reverse-spin', name: 'Reverse Spin', seq: ['up', 'left', 'down', 'right'], windowMs: 500, tier: 2 },
  { id: 'sidewinder', name: 'Sidewinder', seq: ['right', 'right', 'left', 'left', 'right', 'right'], windowMs: 420, tier: 2 },
  { id: 'zigzag', name: 'Zigzag', seq: ['right', 'down', 'right', 'down', 'right', 'down'], windowMs: 430, tier: 2 },
  { id: 'left-zigzag', name: 'Left Zigzag', seq: ['up', 'left', 'up', 'left', 'up', 'left'], windowMs: 430, tier: 2 },

  { id: 'ladder', name: 'Ladder', seq: ['up', 'right', 'up', 'right', 'up', 'right'], windowMs: 450, tier: 3 },
  { id: 'staircase', name: 'Staircase', seq: ['down', 'left', 'down', 'left', 'down', 'left'], windowMs: 450, tier: 3 },
  { id: 'the-old-code', name: 'The Old Code', seq: ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'], windowMs: 500, tier: 3 },
  { id: 'windmill', name: 'Windmill', seq: ['up', 'right', 'down', 'left', 'up', 'right', 'down', 'left'], windowMs: 480, tier: 3 },
  { id: 'lasso', name: 'Lasso', seq: ['right', 'down', 'left', 'up', 'right', 'down', 'left', 'up'], windowMs: 480, tier: 3 },
  { id: 'the-scribble', name: 'The Scribble', seq: ['left', 'right', 'up', 'down', 'left', 'right', 'up', 'down'], windowMs: 450, tier: 3 },
];

/** Longest first, so the first hit while scanning is also the best hit. */
const BY_LENGTH = [...COMBOS].sort((a, b) => b.seq.length - a.seq.length);

export const LONGEST_COMBO = BY_LENGTH[0].seq.length;

/**
 * Re-firing the same combo requires at least this many fresh presses, so a
 * rolling `L R L R L R` re-triggers Shimmy on every other press instead of
 * every press. Different combos never block each other — that is how a long
 * combo whose prefix is a short one (Windmill over The Spin) still pays out.
 */
const REFIRE_GAP = 2;

export interface ComboMatcher {
  pressCount: number;
  lastFire: Map<string, number>;
}

export function createMatcher(): ComboMatcher {
  return { pressCount: 0, lastFire: new Map() };
}

function tailMatches(buffer: Press[], combo: Combo): boolean {
  const n = combo.seq.length;
  if (buffer.length < n) return false;
  const start = buffer.length - n;
  for (let i = 0; i < n; i++) {
    if (buffer[start + i].dir !== combo.seq[i]) return false;
    if (i > 0 && buffer[start + i].time - buffer[start + i - 1].time > combo.windowMs) return false;
  }
  return true;
}

/**
 * Call once per press, after the press is in the buffer. Returns the longest
 * combo whose sequence ends on that press, or null.
 */
export function matchCombo(matcher: ComboMatcher, buffer: Press[]): Combo | null {
  matcher.pressCount++;
  for (const combo of BY_LENGTH) {
    if (!tailMatches(buffer, combo)) continue;
    const last = matcher.lastFire.get(combo.id);
    if (last !== undefined && matcher.pressCount - last < REFIRE_GAP) continue;
    matcher.lastFire.set(combo.id, matcher.pressCount);
    return combo;
  }
  return null;
}
