import type { Application } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';

/** What every canvas scene implements. */
export interface PixiScene {
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface PixiSceneHandle<S> {
  /** Attach to the element the canvas should fill. */
  hostRef: React.RefObject<HTMLDivElement | null>;
  /** The scene, once Pixi has started (null before, or if it failed). */
  scene: S | null;
  /** Current size of the host element in CSS pixels. */
  size: { width: number; height: number };
  /** Set when WebGL/Pixi could not start; callers show a DOM fallback. */
  failed: boolean;
}

/**
 * Mounts a Pixi canvas inside a React component and keeps it sized to its
 * host element. The scene factory is usually a dynamic import, so Pixi and
 * the scene code only load where they are used. Safe under StrictMode
 * (mount → unmount → mount): a start that finishes after unmount is undone.
 */
export function usePixiScene<S extends PixiScene>(
  create: (app: Application, width: number, height: number, host: HTMLElement) => Promise<S>,
): PixiSceneHandle<S> {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef(create);
  const [scene, setScene] = useState<S | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let app: Application | null = null;
    let current: S | null = null;
    const measure = () => {
      const r = host.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height) };
    };

    const ro = new ResizeObserver(() => {
      const s = measure();
      setSize(s);
      if (app && current) {
        app.renderer.resize(Math.max(1, s.width), Math.max(1, s.height));
        current.resize(s.width, s.height);
      }
    });
    ro.observe(host);
    setSize(measure());

    void (async () => {
      try {
        const { createPixiApp } = await import('./pixi-app');
        if (cancelled) return;
        const s = measure();
        const a = await createPixiApp(host, s.width, s.height);
        if (cancelled) {
          a.destroy(true, { children: true });
          return;
        }
        const sc = await createRef.current(a, s.width, s.height, host);
        if (cancelled) {
          sc.destroy();
          a.destroy(true, { children: true });
          return;
        }
        app = a;
        current = sc;
        // The host may have been resized while the scene was starting.
        const now = measure();
        if (now.width !== s.width || now.height !== s.height) {
          a.renderer.resize(Math.max(1, now.width), Math.max(1, now.height));
          sc.resize(now.width, now.height);
        }
        setScene(sc);
      } catch (err) {
        console.warn('Canvas renderer unavailable, using the fallback view.', err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      ro.disconnect();
      current?.destroy();
      app?.destroy(true, { children: true });
      app = null;
      current = null;
      setScene(null);
    };
  }, []);

  return { hostRef, scene, size, failed };
}

/** True when the player asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
