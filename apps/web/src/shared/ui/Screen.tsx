import type { CSSProperties, ReactNode } from 'react';
import { Landscape } from './Landscape';

/** Fixed pseudo-random spread so embers look natural but render identically every time. */
const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${-((i * 1.7) % 14).toFixed(1)}s`,
  duration: `${10 + ((i * 3) % 8)}s`,
  scale: 0.6 + ((i * 7) % 5) / 6,
}));

/**
 * Backdrop of every screen: the painted landscape (placeholder art), darkened
 * by `dim` (0 = as painted, for the hub; ~0.6 for menus with a lot of text),
 * optional rising embers and a vignette.
 */
export function SceneBackground({ embers = false, dim = 0.6 }: { embers?: boolean; dim?: number }) {
  return (
    <div className="scene-bg" aria-hidden>
      <Landscape />
      <div className="scene-dim" style={{ opacity: dim }} />
      {embers && (
        <div className="embers">
          {EMBERS.map((e, i) => (
            <i
              key={i}
              style={
                {
                  left: e.left,
                  animationDelay: e.delay,
                  animationDuration: e.duration,
                  scale: String(e.scale),
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="vignette" />
    </div>
  );
}

/**
 * Full-viewport game screen. The page never scrolls: children lay themselves
 * out inside (top bar + a scrolling body, a HUD, …).
 */
export function Screen({
  children,
  className,
  embers = false,
  dim,
}: {
  children: ReactNode;
  className?: string;
  embers?: boolean;
  dim?: number;
}) {
  return (
    <div className={['screen', className].filter(Boolean).join(' ')}>
      <SceneBackground embers={embers} dim={dim} />
      {children}
    </div>
  );
}
