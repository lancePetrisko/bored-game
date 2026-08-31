const KEY = 'bored-game.stats.v1';
const SAVE_DEBOUNCE_MS = 1000;

export interface Stats {
  bestChain: number;
  totalPresses: number;
  discovered: Set<string>;
  muted: boolean;
  /** Reveals undiscovered combos in the collection. Never marks them found. */
  cheats: boolean;
}

interface StoredStats {
  bestChain?: number;
  totalPresses?: number;
  discovered?: string[];
  muted?: boolean;
  cheats?: boolean;
}

export function loadStats(): Stats {
  const fallback: Stats = {
    bestChain: 0,
    totalPresses: 0,
    discovered: new Set(),
    muted: false,
    cheats: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredStats;
    return {
      bestChain: parsed.bestChain ?? 0,
      totalPresses: parsed.totalPresses ?? 0,
      discovered: new Set(parsed.discovered ?? []),
      muted: parsed.muted ?? false,
      cheats: parsed.cheats ?? false,
    };
  } catch {
    // Private mode, disabled storage, or corrupt data: play anyway.
    return fallback;
  }
}

let timer: number | undefined;

function write(stats: Stats): void {
  try {
    const stored: StoredStats = {
      bestChain: stats.bestChain,
      totalPresses: stats.totalPresses,
      discovered: [...stats.discovered],
      muted: stats.muted,
      cheats: stats.cheats,
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Nothing to do — persistence is a bonus, not a requirement.
  }
}

/** Coalesces the write storm from mashing into one write per second. */
export function saveStats(stats: Stats): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = undefined;
    write(stats);
  }, SAVE_DEBOUNCE_MS);
}

export function flushStats(stats: Stats): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  write(stats);
}
