import { KEY_TO_DIR, type Dir } from './types';
import { LONGEST_COMBO } from './combos';

export interface Press {
  dir: Dir;
  time: number;
}

export const BUFFER_SIZE = LONGEST_COMBO;

export function pushPress(buffer: Press[], dir: Dir, time: number): void {
  buffer.push({ dir, time });
  if (buffer.length > BUFFER_SIZE) buffer.shift();
}

export interface InputHandlers {
  onDir(dir: Dir): void;
  onToggleMute(): void;
  onToggleOverlay(): void;
  onCloseOverlay(): void;
}

export function attachKeyboard(handlers: InputHandlers): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const dir = KEY_TO_DIR[e.key];
    if (dir) {
      e.preventDefault();
      // Ignore OS key-repeat: holding an arrow should not machine-gun.
      if (!e.repeat) handlers.onDir(dir);
      return;
    }
    if (e.key === 'Tab' || e.key === '?') {
      e.preventDefault();
      handlers.onToggleOverlay();
    } else if (e.key === 'Escape') {
      handlers.onCloseOverlay();
    } else if (e.key === 'm' || e.key === 'M') {
      handlers.onToggleMute();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
