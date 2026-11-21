import {
  getAbility,
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
import { AbilityIcon } from './AbilityIcon';
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
 * Combat room (combat spec, request #31). Layout follows the owner's
 * reference: planned actions on the left (portrait → action → order), round
 * and initiative on top, enemy intents on the right, the battlefield in the
 * middle, the character panel (HP, Mana, Focus) bottom-left and the action
 * bar bottom-right.
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

  return (
    <div className="combat">
      <header className="combat-top">
        <span className="title">{run.riftName}</span>
        <span className="muted">
          {pvp
            ? `PvP · you are on team ${mySide === 'party' ? 'A (left)' : 'B (right)'}`
            : `${boss ? 'Boss' : run.roomType === 'elite' ? 'Elite room' : 'Combat'} · room ${run.roomsVisited}`}
          {boss && run.threat.tier
            ? ` · Threat ${run.threat.tier.name}: ${run.threat.tier.description}`
            : ''}
        </span>
        <span className="spacer" />
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
        <span className="spacer" />
        {secondsLeft !== null && combat.phase === 'planning' && (
          <span className="timer" data-low={secondsLeft <= 10}>
            {secondsLeft}s
          </span>
        )}
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
      </header>

      <div className="combat-middle">
        <aside className="plan-queue" aria-label="Planned actions">
          <h3>{pvp ? 'Plan' : 'Log'}</h3>
          {pvp && (
            <ol data-testid="plan">
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
            </ol>
          )}
          {pvp && combat.plan.length === 0 && (
            <p className="muted small">No actions planned yet.</p>
          )}
          <ol className="combat-log" data-testid="combat-log">
            {lines.map((l) => (
              <li key={l.seq}>{l.text}</li>
            ))}
          </ol>
        </aside>

        <CombatStage
          onProgress={replay.onProgress}
          onCaughtUp={replay.onCaughtUp}
          combat={combat}
          boss={boss}
          targetIds={targetIds}
          swapSlots={swapSlots}
          columnMode={columnMode}
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
        </CombatStage>

        <aside className="enemy-intents" aria-label="Enemy intents">
          <h3>{pvp ? 'Other team' : 'Enemies'}</h3>
          {enemies.map((e) => (
            <div key={e.id} className="intent-row" data-downed={e.downed}>
              <strong>{e.name}</strong>
              <span className="muted small">
                {e.hp}/{e.maxHp} HP{e.block ? ` · ${e.block} Block` : ''}
              </span>
              <span className="intent-icons">
                {e.intents.map((it, i) => (
                  <span key={i} title={getAbility(it.abilityId)?.name}>
                    <AbilityIcon abilityId={it.abilityId} className="intent-icon" />
                  </span>
                ))}
              </span>
            </div>
          ))}
        </aside>
      </div>

      <footer className="combat-bottom">
        {me && (
          <div className="me-panel">
            {me.appearance && <CharacterToken appearance={me.appearance} size={64} />}
            <div className="me-bars">
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
          </div>
        )}
        <div className="action-bar">
          <FormError error={action.error} />
          {canPlan && me ? (
            <>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong className="your-turn">{pvp ? 'Plan your actions' : 'Your turn'}</strong>
                <span className="spacer" />
                {selected && (
                  <span className="muted">
                    {columnMode ? 'Choose a column…' : 'Choose a target…'}
                  </span>
                )}
              </div>
              <div className="abilities">
                <AbilityBar
                  abilityIds={me.abilityIds}
                  focus={me.focus - reserved.focus}
                  mana={me.mana - reserved.mana}
                  selected={selected}
                  disabled={action.isPending}
                  onPick={pick}
                  onCancel={() => setSelected(null)}
                />
                <button
                  className="btn btn-primary end-turn"
                  onClick={() => send({ type: 'ready' })}
                  disabled={action.isPending}
                >
                  {pvp ? 'Ready' : 'End turn'}
                </button>
              </div>
            </>
          ) : (
            <span className="muted" data-testid="waiting">
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
        </div>
      </footer>
    </div>
  );
}
