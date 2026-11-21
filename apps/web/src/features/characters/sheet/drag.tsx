import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/*
 * Pointer-based drag and drop (request #39). Works with mouse, pen and touch
 * (HTML5 drag events do not fire on touch screens). Drop targets are marked
 * with `data-drop="<key>"`; the key under the pointer on release is passed to
 * `onDrop`. A short move (> 5 px) starts the drag, so clicks still work.
 */

const DRAG_THRESHOLD = 5;

interface DragState<T> {
  payload: T;
  x: number;
  y: number;
  over: string | null;
}

export function useDragAndDrop<T>(onDrop: (payload: T, target: string | null) => void) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });
  /** True right after a drag ended: the click that follows must be ignored. */
  const suppressClick = useRef(false);

  const bind = useCallback(
    (payload: T, enabled = true) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (!enabled || e.button !== 0) return;
        const startX = e.clientX;
        const startY = e.clientY;
        let started = false;
        const targetAt = (x: number, y: number) =>
          (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset
            .drop ?? null;
        const move = (ev: PointerEvent) => {
          if (!started) {
            if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
            started = true;
          }
          ev.preventDefault();
          setDrag({
            payload,
            x: ev.clientX,
            y: ev.clientY,
            over: targetAt(ev.clientX, ev.clientY),
          });
        };
        const end = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', cancel);
          if (!started) return;
          suppressClick.current = true;
          window.setTimeout(() => (suppressClick.current = false), 0);
          setDrag(null);
          dropRef.current(payload, targetAt(ev.clientX, ev.clientY));
        };
        const cancel = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', cancel);
          setDrag(null);
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', cancel);
      },
    }),
    [],
  );

  /** Wrap a click handler so it does not fire at the end of a drag. */
  const click = useCallback(
    (fn: () => void) => () => {
      if (!suppressClick.current) fn();
    },
    [],
  );

  return { drag, bind, click };
}

/** The dragged thing, following the pointer. */
export function DragGhost({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return createPortal(
    <div className="drag-ghost" style={{ left: x, top: y }} aria-hidden>
      {children}
    </div>,
    document.body,
  );
}

/**
 * Floating tooltip next to an anchor rectangle: to the right if it fits,
 * otherwise to the left; clamped to the viewport.
 */
export function Tooltip({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.right + gap;
    if (left + width > vw - 8) left = anchor.left - gap - width;
    if (left < 8) left = Math.max(8, Math.min(vw - width - 8, anchor.left));
    let top = anchor.top;
    if (top + height > vh - 8) top = vh - height - 8;
    setPos({ left, top: Math.max(8, top) });
  }, [anchor]);
  return createPortal(
    <div
      ref={ref}
      className="game-tooltip"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Hover/focus state for tooltips: which thing, anchored where. Hidden while dragging. */
export function useHover<T>() {
  const [hover, setHover] = useState<{ value: T; rect: DOMRect } | null>(null);
  const props = useCallback(
    (value: T) => ({
      onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
        if (e.pointerType === 'mouse')
          setHover({ value, rect: e.currentTarget.getBoundingClientRect() });
      },
      onPointerLeave: () => setHover(null),
      onFocus: (e: ReactFocusEvent<HTMLElement>) =>
        setHover({ value, rect: e.currentTarget.getBoundingClientRect() }),
      onBlur: () => setHover(null),
    }),
    [],
  );
  // Scrolling moves the anchor: hide.
  useEffect(() => {
    if (!hover) return;
    const hide = () => setHover(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [hover]);
  return { hover, props, clear: () => setHover(null) };
}
