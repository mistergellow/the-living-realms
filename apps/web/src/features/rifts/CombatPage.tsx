import { StatusIcon } from '../../shared/ui/EffectIcon';
import {
  describeEffects,
  describeTargeting,
  getAbility,
  getEnemy,
  reservedBy,
  targetColumns,
  validTargets,
  type CombatState,
} from '@realms/game-core';
import {
  columnOfSlot,
  type CombatAction,
  type CombatantView,
  type CombatView,
  type RunDto,
} from '@realms/shared';
import { useCallback, useMemo, useState } from 'react';
import { FormError } from '../../shared/ui/FormError';
import { CharacterToken } from '../characters/CharacterToken';
import { AbilityBar } from './AbilityBar';
import { AbilityIcon, abilitySchool } from './AbilityIcon';
import { Rich } from '../../shared/ui/Rich';
import { CombatStage } from './CombatStage';
import { describeLog } from './combat-text';
import './combat.css';
import { EndOverlay } from './EndOverlay';
import type { useRunAction } from './api';

/**
 * Keeps the screen in step with the canvas replay. Computed during render
 * (not in an effect), so new results never flash up before they are played:
 * - `pending`: some log entries have not finished playing yet;
 * - `logUpTo`: the text log shows entries up to this seq;
 * - `resolving`: the replay includes the enemy phase (PvE) or the round's
 *   resolution (PvP); the controls wait for it. Your own PvE actions do not
 *   block the controls (Slay the Spire: act, act, act, end turn).
 */
function useReplayState(combat: CombatView | undefined) {
  const [played, setPlayed] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const onProgress = useCallback((seq: number) => setProgress(seq), []);
  const onCaughtUp = useCallback((seq: number) => {
    setPlayed((p) => (p === null ? seq : Math.max(p, seq)));
  }, []);

  const log = combat?.log ?? [];
  const maxSeq = log.length ? log[log.length - 1]!.seq : 0;
  const pending = played !== null && maxSeq > played;
  const logUpTo = pending ? Math.max(played, progress ?? played) : Infinity;
  const resolving = pending && log.some((e) => e.seq > played! && e.t === 'resolve');
  return { pending, logUpTo, resolving, onProgress, onCaughtUp };
}

type Mutation = ReturnType<typeof useRunAction>;

/**
 * Combat room (combat spec, request #31; layout of request #69 after Darkest
 * Dungeon): the battlefield takes the whole width; the round sits on top; the
 * HUD at the bottom has your hero (portrait, HP, Mana, Focus) on the left, the
 * skills with a read-out of the chosen one in the middle, and the unit you
 * point at (HP, statuses, intents, mechanic) with End turn on the right. The
 * log (and the PvP plan) is a drawer over the top-left of the battlefield.
 */
export function CombatScreen({
  run,
  characterId,
  action,
  secondsLeft,
}: {
  run: RunDto;
  characterId: string;
  action: Mutation;
  secondsLeft: number | null;
}) {
  const combat = run.combat!;
  const [selected, setSelected] = useState<string | null>(null);
  const [hoverAbility, setHoverAbility] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const replay = useReplayState(combat);
  const myId = `p:${characterId}`;
  const me = combat.combatants.find((c) => c.id === myId);
  const state = combat as unknown as CombatState;
  const reserved = me ? reservedBy(state, myId) : { focus: 0, mana: 0 };
  const isReady = combat.ready.includes(myId);
  const canPlan =
    !replay.resolving &&
    run.status === 'active' &&
    combat.phase === 'planning' &&
    !!me &&
    !me.downed &&
    !me.stunned &&
    !isReady;
  const ability = selected ? getAbility(selected) : undefined;

  const { targetIds, swapSlots } = useMemo(() => {
    const none = { targetIds: new Set<string>(), swapSlots: null as Set<number> | null };
    if (!me || !ability || !canPlan) return none;
    if (ability.effects.some((e) => e.kind === 'swap'))
      return {
        targetIds: new Set<string>(),
        swapSlots: new Set([0, 1, 2, 3, 4, 5].filter((s) => s !== me.slot)),
      };
    const t = validTargets(state, me, ability);
    return { targetIds: new Set(t.map((u) => u.id)), swapSlots: null };
  }, [state, me, ability, canPlan]);

  const send = (a: CombatAction) => {
    setSelected(null);
    action.mutate(a);
  };

  const pick = (abilityId: string) => {
    const a = getAbility(abilityId)!;
    if (!me) return;
    // Actions with nothing to choose are planned at once.
    if (a.targeting.area === 'all' || a.targeting.side === 'self')
      return send({ type: 'plan', abilityId });
    if (!a.effects.some((e) => e.kind === 'swap') && a.targeting.area === 'column') {
      const cols = targetColumns(state, me, a);
      if (cols.length === 1)
        return send({ type: 'plan', abilityId, targetColumn: cols[0]!.column });
    }
    setSelected(selected === abilityId ? null : abilityId);
  };

  // D41: attacks aim at a column (both units in it); support picks one ally.
  const columnMode = ability?.targeting.area === 'column';
  const targetAction = (abilityId: string, u: CombatantView): CombatAction =>
    getAbility(abilityId)?.targeting.area === 'column'
      ? { type: 'plan', abilityId, targetColumn: columnOfSlot(u.slot) }
      : { type: 'plan', abilityId, targetId: u.id };

  const byId = (id: string) => combat.combatants.find((c) => c.id === id);
  const lines = combat.log
    .filter((e) => e.seq <= replay.logUpTo)
    .map((e) => ({ seq: e.seq, text: describeLog(e, combat) }))
    .filter((l): l is { seq: number; text: string } => !!l.text)
    .slice(-40)
    .reverse();
  const boss = run.roomType === 'boss';
  const mySide = me?.side ?? 'party';
  const pvp = run.mode === 'pvp';
  const enemies = combat.combatants.filter((c) => c.side !== mySide);
  const initiative = combat.initiative;
  const waitingFor = combat.combatants.filter(
    (c) => c.side === 'party' && !c.downed && !c.stunned && !c.left && !combat.ready.includes(c.id),
  );

  const inspected =
    (inspectId && byId(inspectId)) || enemies.find((e) => !e.downed) || enemies[0] || null;
  const readoutId = hoverAbility ?? selected;

  return (
    <div className="combat">
      <header className="combat-top">
        <div className="combat-where">
          <span className="title">{run.riftName}</span>
          <span className="muted small">
            {run.worldBoss
              ? `World boss · your party has dealt ${run.worldBoss.damage.toLocaleString()} damage`
              : pvp
                ? `PvP · you are on team ${mySide === 'party' ? 'A (left)' : 'B (right)'}`
                : `${boss ? 'Boss' : run.roomType === 'elite' ? 'Elite room' : 'Combat'} · room ${run.roomsVisited}`}
            {boss && run.threat.tier
              ? ` · Threat ${run.threat.tier.name}: ${run.threat.tier.description}`
              : ''}
          </span>
        </div>
        <div className="combat-round">
          <span className="round-banner" data-testid="round">
            Round {combat.round}
          </span>
          {initiative && (
            <span className="initiative" title="Team initiative: best roll + Agility of each side">
              Initiative {initiative.party} vs {initiative.enemies} ·{' '}
              <strong>
                {initiative.first === mySide
                  ? 'Your team starts'
                  : pvp
                    ? 'The other team starts'
                    : 'Enemies start'}
              </strong>
            </span>
          )}
        </div>
        <div className="combat-tools">
          {secondsLeft !== null && combat.phase === 'planning' && (
            <span className="timer" data-low={secondsLeft <= 10}>
              {secondsLeft}s
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            aria-expanded={logOpen}
            aria-controls="combat-log-panel"
            onClick={() => setLogOpen((o) => !o)}
          >
            {pvp ? 'Plan & log' : 'Log'}
          </button>
          {run.status === 'active' && (
            <button
              className="btn btn-ghost btn-sm btn-danger"
              onClick={() => {
                if (
                  confirm(
                    'Leave the Rift? It counts as a defeat for you: your equipped items lose quality. Your group keeps going.',
                  )
                )
                  send({ type: 'abandon' });
              }}
            >
              Abandon
            </button>
          )}
        </div>
      </header>

      <div className="combat-field">
        <CombatStage
          onProgress={replay.onProgress}
          onCaughtUp={replay.onCaughtUp}
          combat={combat}
          boss={boss}
          targetIds={targetIds}
          swapSlots={swapSlots}
          columnMode={columnMode}
          onInspect={(id) => id && setInspectId(id)}
          onTarget={(u) => selected && send(targetAction(selected, u))}
          onSlot={(slot) =>
            selected && send({ type: 'plan', abilityId: selected, targetSlot: slot })
          }
        >
          {!replay.pending && run.status === 'active' && combat.phase === 'room_cleared' && (
            <div className="combat-overlay">
              <div className="panel stack end-card">
                <h2>Room cleared</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Your HP and Mana carry over. Fallen allies get back up with 1 HP. No drops here —
                  the main rewards wait at the boss.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => send({ type: 'continue' })}
                  disabled={action.isPending}
                >
                  Back to the map
                </button>
              </div>
            </div>
          )}
          {/* Victory/defeat wait for the replay; fleeing shows the result at once. */}
          {(!replay.pending || run.status === 'abandoned') && run.status !== 'active' && (
            <EndOverlay run={run} />
          )}
          {combat.round === 1 && combat.log.length <= 2 && run.status === 'active' && (
            <RoomReveal roomType={run.roomType} pvp={pvp} />
          )}
        </CombatStage>

        <aside
          id="combat-log-panel"
          className="combat-log-panel"
          data-open={logOpen || pvp}
          aria-label={pvp ? 'Planned actions and log' : 'Combat log'}
        >
          {pvp && (
            <ol className="plan-list" data-testid="plan">
              {combat.plan.map((p, i) => {
                const actor = byId(p.actorId);
                const a = getAbility(p.abilityId);
                const mine = p.actorId === myId;
                return (
                  <li key={p.id} data-mine={mine}>
                    {actor?.appearance ? (
                      <CharacterToken appearance={actor.appearance} size={30} title={actor.name} />
                    ) : null}
                    <AbilityIcon abilityId={p.abilityId} className="plan-icon" />
                    <span className="plan-text">
                      {a?.name}
                      {p.targetColumn ? ` → ${p.targetColumn}` : ''}
                      {p.targetId && p.targetId !== p.actorId
                        ? ` → ${byId(p.targetId)?.name ?? ''}`
                        : ''}
                      {p.targetSlot !== undefined ? ` → slot ${p.targetSlot + 1}` : ''}
                    </span>
                    <span className="plan-order">{i + 1}</span>
                    {mine && canPlan && (
                      <button
                        className="plan-remove"
                        aria-label={`Remove ${a?.name ?? 'action'}`}
                        onClick={() => send({ type: 'unplan', planId: p.id })}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
              {combat.plan.length === 0 && <li className="muted small">No actions planned yet.</li>}
            </ol>
          )}
          <ol className="combat-log" data-testid="combat-log">
            {lines.map((l) => (
              <li key={l.seq}>{l.text}</li>
            ))}
          </ol>
        </aside>
      </div>

      <footer className="combat-hud">
        <section className="hud-hero" aria-label="Your hero">
          {me && (
            <>
              <div className="hud-portrait">
                {me.appearance && <CharacterToken appearance={me.appearance} size={72} />}
              </div>
              <div className="me-bars">
                <strong className="hud-name">{me.name}</strong>
                <div className="bar hp">
                  <span style={{ width: `${(me.hp / Math.max(1, me.maxHp)) * 100}%` }} />
                  <em>
                    HP {me.hp} / {me.maxHp}
                  </em>
                </div>
                <div className="bar mana">
                  <span style={{ width: `${(me.mana / Math.max(1, me.maxMana)) * 100}%` }} />
                  <em>
                    Mana {me.mana} / {me.maxMana}
                  </em>
                </div>
                <div
                  className="focus-pips"
                  title={`+${me.focusPerRound} Focus every round (Precision)`}
                >
                  {Array.from({ length: Math.max(me.focus, 1) }, (_, i) => (
                    <i key={i} data-spent={i >= me.focus - reserved.focus} />
                  ))}
                  <em>
                    Focus <strong data-testid="my-focus">{me.focus - reserved.focus}</strong>/
                    {me.focus} · +{me.focusPerRound}/round
                  </em>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="hud-skills" aria-label="Actions">
          <FormError error={action.error} />
          {canPlan && me ? (
            <>
              <div className="hud-turn">
                <strong className="your-turn">{pvp ? 'Plan your actions' : 'Your turn'}</strong>
                {selected && (
                  <span className="muted">
                    {columnMode ? 'Choose a column…' : 'Choose a target…'}
                  </span>
                )}
              </div>
              <AbilityBar
                abilityIds={me.abilityIds}
                focus={me.focus - reserved.focus}
                mana={me.mana - reserved.mana}
                selected={selected}
                disabled={action.isPending}
                onPick={pick}
                onHover={setHoverAbility}
                onCancel={() => setSelected(null)}
              />
              <AbilityReadout abilityId={readoutId} />
            </>
          ) : (
            <span className="muted hud-waiting" data-testid="waiting">
              {run.status !== 'active'
                ? ''
                : replay.resolving
                  ? pvp
                    ? 'Resolving the round…'
                    : 'The enemies are acting…'
                  : combat.phase === 'room_cleared'
                    ? 'Room cleared.'
                    : me?.stunned
                      ? 'You are stunned this round.'
                      : waitingFor.length
                        ? `Waiting for ${waitingFor.map((w) => w.name).join(', ')}…`
                        : 'Waiting…'}
            </span>
          )}
        </section>

        <section className="hud-target" aria-label="Inspected unit">
          {inspected && <UnitCard unit={inspected} />}
          {canPlan && me && (
            <button
              className="btn btn-primary btn-lg end-turn"
              onClick={() => send({ type: 'ready' })}
              disabled={action.isPending}
            >
              {pvp ? 'Ready' : 'End turn'}
            </button>
          )}
        </section>
      </footer>
    </div>
  );
}

/** What the chosen (or hovered) skill does, in one line (Darkest Dungeon's HIT / DMG / CRIT). */
function AbilityReadout({ abilityId }: { abilityId: string | null }) {
  const a = abilityId ? getAbility(abilityId) : undefined;
  if (!a) return <p className="readout muted">Point at a skill to read it.</p>;
  return (
    <p className={`readout school-${abilitySchool(a.id)}`}>
      <strong>{a.name}</strong>
      <span className="readout-cost">
        {a.focusCost} Focus{a.manaCost ? ` · ${a.manaCost} Mana` : ''}
      </span>
      <span className="readout-target">{describeTargeting(a.targeting)}</span>
      <span className="readout-fx">
        <Rich text={describeEffects(a).join(' · ')} />
      </span>
    </p>
  );
}

/** The unit you point at: HP, Dodge, statuses, what it is about to do. */
function UnitCard({ unit }: { unit: CombatantView }) {
  const mechanic = unit.enemyDefId ? getEnemy(unit.enemyDefId)?.mechanic : undefined;
  return (
    <div className="unit-card" data-downed={unit.downed} data-side={unit.side}>
      <strong className="unit-card-name">{unit.name}</strong>
      <div className="bar hp small">
        <span style={{ width: `${(unit.hp / Math.max(1, unit.maxHp)) * 100}%` }} />
        <em>
          {unit.hp}/{unit.maxHp} HP{unit.block ? ` · ${unit.block} Dodge` : ''}
        </em>
      </div>
      {mechanic && (
        <span className="enemy-mechanic small" data-testid="enemy-mechanic">
          {mechanic}
        </span>
      )}
      {(unit.statuses.length > 0 || unit.intents.length > 0) && (
        <span className="fx-row">
          {unit.statuses.map((st) => (
            <StatusIcon key={st.id} id={st.id} value={st.value} turns={st.turns} />
          ))}
          {unit.intents.map((it, i) => (
            <span key={i} title={`Will use ${getAbility(it.abilityId)?.name ?? ''}`}>
              <AbilityIcon abilityId={it.abilityId} className="intent-icon" />
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** Request #69: the door opens on… (a banner that fades as the fight starts). */
function RoomReveal({ roomType, pvp }: { roomType: RunDto['roomType']; pvp: boolean }) {
  const text = pvp
    ? 'To arms!'
    : roomType === 'boss'
      ? 'The lair of the beast'
      : roomType === 'elite'
        ? 'A terrible foe!'
        : 'Ambush!';
  return (
    <div className="room-reveal" aria-live="polite">
      <span>{text}</span>
    </div>
  );
}
