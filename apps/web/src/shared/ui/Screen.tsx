import type { CSSProperties, ReactNode } from 'react';

/** Fixed pseudo-random spread so embers look natural but render identically every time. */
const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${-((i * 1.7) % 14).toFixed(1)}s`,
  duration: `${10 + ((i * 3) % 8)}s`,
  scale: 0.6 + ((i * 7) % 5) / 6,
}));

/** Atmospheric backdrop: gradient sky, drifting mist, rising embers, vignette. */
export function SceneBackground({ embers = true }: { embers?: boolean }) {
  return (
    <div className="scene-bg" aria-hidden>
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
  embers = true,
}: {
  children: ReactNode;
  className?: string;
  embers?: boolean;
}) {
  return (
    <div className={['screen', className].filter(Boolean).join(' ')}>
      <SceneBackground embers={embers} />
      {children}
    </div>
  );
}
