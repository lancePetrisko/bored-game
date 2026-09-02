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
  /** Escape: closes the collection if it is open, otherwise toggles pause. */
  onEscape(): void;
  onToggleCheats(): void;
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
      e.preventDefault();
      handlers.onEscape();
    } else if (e.key === 'm' || e.key === 'M') {
      handlers.onToggleMute();
    } else if (e.key === 'c' || e.key === 'C') {
      handlers.onToggleCheats();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

export interface TouchHandlers {
  onDir(dir: Dir): void;
  /** A press that never became a swipe, in CSS pixels. */
  onTap(x: number, y: number): void;
  /** Fires once, the first time a real finger is used. */
  onTouchDetected(): void;
}

/** Travel before a drag counts as one directional press. */
const SWIPE_DISTANCE = 26;

/**
 * Pointer input for phones. A drag fires a press every SWIPE_DISTANCE travelled
 * and then re-origins, so one continuous scribble can land a whole combo without
 * lifting off. Mouse pointers only tap — desktop already has the arrow keys, and
 * mouse-dragging a combo feels worse than typing it.
 */
export function attachPointer(target: HTMLElement, handlers: TouchHandlers): () => void {
  let activeId: number | null = null;
  let originX = 0;
  let originY = 0;
  let swiped = false;
  let announced = false;

  const onDown = (e: PointerEvent) => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    originX = e.clientX;
    originY = e.clientY;
    swiped = false;
    if (e.pointerType !== 'mouse' && !announced) {
      announced = true;
      handlers.onTouchDetected();
    }
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation; losing it only costs off-canvas drags.
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activeId || e.pointerType === 'mouse') return;
    const dx = e.clientX - originX;
    const dy = e.clientY - originY;
    if (Math.abs(dx) < SWIPE_DISTANCE && Math.abs(dy) < SWIPE_DISTANCE) return;

    const dir: Dir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    swiped = true;
    originX = e.clientX;
    originY = e.clientY;
    handlers.onDir(dir);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {
      // Already released, or never captured.
    }
    if (!swiped) handlers.onTap(e.clientX, e.clientY);
  };

  const onCancel = (e: PointerEvent) => {
    if (e.pointerId === activeId) activeId = null;
  };

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);

  return () => {
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onCancel);
  };
}
