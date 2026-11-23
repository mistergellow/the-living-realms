import { columnOfSlot, lineOfSlot, type CombatantView, type CombatView } from '@realms/shared';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { EnemyAvatar } from '../avatar/EnemyAvatar';
import { artFromAbilities } from '../avatar/weapon-art';
import { prefersReducedMotion, usePixiScene } from '../render/usePixiScene';
import { combatLayout, unitRect } from './combat-layout';
import type { CombatScene } from './combat-scene';
import { AffixChips, IntentChips, StatusChips } from './UnitChips';

interface CombatStageProps {
  combat: CombatView;
  boss: boolean;
  targetIds: ReadonlySet<string>;
  /** Party slots the player may move to (Swap Position), or null. */
  swapSlots: ReadonlySet<number> | null;
  onTarget: (unit: CombatantView) => void;
  onSlot: (slot: number) => void;
  /** A replay step started: log entries up to `seq` may now be shown. */
  onProgress?: (seq: number) => void;
  /** Every log entry up to `seq` has finished playing (or needs no animation). */
  onCaughtUp?: (seq: number) => void;
  /** The selected ability hits a whole column: hovering a unit highlights its column. */
  columnMode?: boolean;
  /** The unit under the pointer or keyboard focus (for the HUD's unit card). */
  onInspect?: (unitId: string | null) => void;
  /** Overlays drawn above the battlefield (room cleared, results). */
  children?: ReactNode;
}

/**
 * The battlefield: a PixiJS canvas (art and animation, combat-scene.ts) with
 * a layer of real buttons on top, one per unit, placed from the same layout.
 * The buttons carry the clicks, keyboard focus and accessible names; the
 * canvas only draws. If WebGL is unavailable the buttons show the SVG art.
 *
 * New log entries are replayed as animations; the page uses onProgress /
 * onCaughtUp (see useReplayState) so the text log and the controls do not run
 * ahead of what the player sees.
 */
export function CombatStage({
  combat,
  boss,
  targetIds,
  swapSlots,
  onTarget,
  onSlot,
  onProgress,
  onCaughtUp,
  columnMode = false,
  onInspect,
  children,
}: CombatStageProps) {
  const cbRef = useRef({ onProgress, onCaughtUp });
  /** Highest seq handed to the scene, and whether the scene is still playing. */
  const queued = useRef<{ seq: number | null; playing: boolean }>({ seq: null, playing: false });
  const safetyTimer = useRef<number | undefined>(undefined);

  const caughtUp = () => {
    clearTimeout(safetyTimer.current);
    queued.current.playing = false;
    if (queued.current.seq !== null) cbRef.current.onCaughtUp?.(queued.current.seq);
  };

  const { hostRef, scene, size, failed } = usePixiScene<CombatScene>(async (app, w, h) => {
    const { CombatScene } = await import('./combat-scene');
    return new CombatScene(app, w, h, {
      reducedMotion: prefersReducedMotion(),
      onProgress: (seq) => {
        if (queued.current.playing) cbRef.current.onProgress?.(seq);
      },
      onIdle: () => caughtUp(),
    });
  });
  const layout = useMemo(() => combatLayout(size.width, size.height), [size]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverIds = useMemo(() => {
    const h = combat.combatants.find((c) => c.id === hoverId);
    if (!h) return new Set<string>();
    if (!columnMode) return new Set([h.id]);
    return new Set(
      combat.combatants
        .filter((c) => c.side === h.side && columnOfSlot(c.slot) === columnOfSlot(h.slot))
        .map((c) => c.id),
    );
  }, [combat, hoverId, columnMode]);

  useEffect(() => {
    onInspect?.(hoverId);
  }, [hoverId, onInspect]);
  useEffect(() => {
    cbRef.current = { onProgress, onCaughtUp };
  }, [onProgress, onCaughtUp]);
  useEffect(() => () => clearTimeout(safetyTimer.current), []);

  // Hand new log entries to the scene (or, without a canvas, mark them as seen).
  useEffect(() => {
    const log = combat.log;
    const maxSeq = log.length ? log[log.length - 1]!.seq : 0;
    const q = queued.current;
    if (failed) {
      q.seq = maxSeq;
      cbRef.current.onCaughtUp?.(maxSeq);
      return;
    }
    if (!scene || size.width === 0) return;
    if (q.seq === null || maxSeq <= q.seq) {
      // First view: show the state as it is, do not replay history.
      if (q.seq === null) {
        q.seq = maxSeq;
        cbRef.current.onCaughtUp?.(maxSeq);
      }
      return;
    }
    const since = q.seq;
    q.seq = maxSeq;
    const ms = scene.play(log.filter((e) => e.seq > since));
    if (ms > 0) {
      q.playing = true;
      // The scene reports the end (onIdle). If its clock stalls (hidden tab), do not
      // hold the controls forever.
      clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(caughtUp, ms * 3 + 3000);
    } else if (!q.playing) {
      cbRef.current.onCaughtUp?.(maxSeq);
    }
  }, [scene, failed, combat.log, size.width]);

  useEffect(() => {
    if (scene && size.width > 0)
      scene.update({ combat, layout, boss, targetIds, swapSlots, hoverIds });
  }, [scene, combat, layout, boss, targetIds, swapSlots, hoverIds, size.width]);

  const party = combat.combatants.filter((c) => c.side === 'party');
  const emptySwapSlots = swapSlots
    ? [...swapSlots].filter((s) => !party.some((c) => c.slot === s))
    : [];

  return (
    <section className="stage" data-boss={boss} data-fallback={failed}>
      <div className="stage-canvas" ref={hostRef} aria-hidden />
      {size.width > 0 && (
        <div className="stage-hits">
          {combat.combatants.map((unit) => {
            const r = unitRect(layout, unit.side, unit.slot, unit.isBoss);
            const swappable = unit.side === 'party' && (swapSlots?.has(unit.slot) ?? false);
            const targetable = targetIds.has(unit.id) || swappable;
            return (
              <button
                key={unit.id}
                type="button"
                className="unit-hit"
                style={{
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                  // Nearer units are drawn on top; their buttons are too.
                  zIndex: 1 + lineOfSlot(unit.slot),
                }}
                disabled={!targetable}
                data-testid={`unit-${unit.side}`}
                data-downed={unit.downed}
                data-left={unit.left}
                aria-label={`${unit.name}${unit.left ? ' (left)' : ''}${targetable ? ' (target)' : ''}`}
                title={`${unit.name} — ${unit.hp}/${unit.maxHp} HP`}
                onClick={() => (swappable ? onSlot(unit.slot) : onTarget(unit))}
                onPointerEnter={() => setHoverId(unit.id)}
                onPointerLeave={() => setHoverId((h) => (h === unit.id ? null : h))}
                onFocus={() => setHoverId(unit.id)}
                onBlur={() => setHoverId((h) => (h === unit.id ? null : h))}
              >
                {failed ? (
                  <FallbackUnit unit={unit} height={r.height} />
                ) : (
                  // The canvas draws the name; this copy is for find-in-page and tests.
                  <span className="sr-only">
                    {unit.name}
                    {unit.left ? ' (left)' : ''}
                  </span>
                )}
              </button>
            );
          })}
          {combat.combatants.map((unit) => {
            const p = layout.place(unit.side, unit.slot);
            const r = unitRect(layout, unit.side, unit.slot, unit.isBoss);
            const nameOf = (id: string) => combat.combatants.find((c) => c.id === id)?.name ?? '';
            return (
              <Fragment key={`chips-${unit.id}`}>
                {unit.kind === 'enemy' && (
                  <div
                    className="unit-chips unit-chips-intents"
                    style={{ left: p.x, top: r.top - 4, zIndex: 8 + lineOfSlot(unit.slot) }}
                  >
                    <IntentChips unit={unit} nameOf={nameOf} />
                  </div>
                )}
                <div className="unit-chips unit-chips-below" style={{ left: p.x, top: p.y + 6 }}>
                  <StatusChips unit={unit} />
                  <AffixChips unit={unit} />
                </div>
              </Fragment>
            );
          })}
          {emptySwapSlots.map((slot) => {
            const p = layout.place('party', slot);
            return (
              <button
                key={`slot-${slot}`}
                type="button"
                className="empty-slot"
                style={{ left: p.x, top: p.y }}
                onClick={() => onSlot(slot)}
                aria-label={`Move to slot ${slot + 1}`}
              >
                Move here
              </button>
            );
          })}
        </div>
      )}
      {children}
    </section>
  );
}

/** DOM art used only when the canvas renderer cannot start. */
function FallbackUnit({ unit, height }: { unit: CombatantView; height: number }) {
  const art = Math.max(40, height - 30);
  return (
    <span className="fallback-unit" data-downed={unit.downed}>
      <span className="fallback-name">
        {unit.name}
        {unit.left ? ' (left)' : ''} · {unit.hp}/{unit.maxHp}
      </span>
      {unit.kind === 'player' ? (
        <CharacterAvatar
          appearance={unit.appearance}
          {...artFromAbilities(unit.abilityIds)}
          size={art}
        />
      ) : (
        <EnemyAvatar enemyDefId={unit.enemyDefId} size={art} />
      )}
    </span>
  );
}
