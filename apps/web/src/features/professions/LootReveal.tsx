import { gradeRarity } from '@realms/game-core';
import type { JobResultDto } from '@realms/shared';
import { useEffect, useRef } from 'react';
import { playSfx, prefersReducedMotion } from '../../lib/audio';
import { DefIcon } from '../characters/sheet/ItemIcon';

const STAGGER_MS = 140;

/**
 * Request #87: what a job brought back, revealed like loot — each find pops
 * in after the other with the glow of its quality and a bell that climbs the
 * scale; nothing found gets a dull "thud". Replaces the "Got: …" sentence.
 */
export function LootReveal({ result }: { result: JobResultDto }) {
  const finds = result.produced;
  const ref = useRef<HTMLDivElement>(null);
  // Bring the reveal into view inside a scrolling panel.
  useEffect(() => {
    ref.current?.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [result]);
  useEffect(() => {
    if (!finds.length) {
      playSfx('error');
      return;
    }
    const timers = finds.map((_, i) =>
      window.setTimeout(
        () => playSfx('loot', i),
        prefersReducedMotion() ? 0 : 120 + i * STAGGER_MS,
      ),
    );
    const done = window.setTimeout(
      () => result.ranksGained > 0 && playSfx('success'),
      200 + finds.length * STAGGER_MS,
    );
    return () => [...timers, done].forEach(clearTimeout);
  }, [finds, result.ranksGained]);

  return (
    <div
      ref={ref}
      className="loot-reveal"
      data-testid="job-result"
      data-success={result.successes > 0}
    >
      <p className="loot-reveal-head">
        <strong>{result.message}</strong>
        <span className="loot-reveal-meta">
          +{result.pointsGained} Mastery
          {result.apSpent > 0 && <> · −{result.apSpent} AP</>}
        </span>
      </p>
      {finds.length > 0 ? (
        <ul className="loot-reveal-items" aria-label="Found">
          {finds.map((o, i) => (
            <li
              key={`${o.itemDefId ?? o.name}-${o.grade}`}
              className="loot-drop"
              style={{ animationDelay: `${120 + i * STAGGER_MS}ms` }}
              data-rarity={o.gradeIndex == null ? 'common' : gradeRarity(o.gradeIndex)}
              title={`${o.qty} × ${o.grade ? `${o.grade} ` : ''}${o.name}`}
            >
              <span className="loot-drop-art">
                {o.itemDefId ? (
                  <DefIcon
                    defId={o.itemDefId}
                    rarity={o.gradeIndex == null ? 'common' : gradeRarity(o.gradeIndex)}
                  />
                ) : null}
                <span className="loot-drop-qty">×{o.qty}</span>
              </span>
              <span className="loot-drop-name">
                {o.grade && <em>{o.grade}</em>}
                {o.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="loot-reveal-empty">Nothing this time.</p>
      )}
    </div>
  );
}
