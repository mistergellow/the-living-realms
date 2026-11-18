import {
  describeEffects,
  getAbility,
  STATUS_DESCRIPTIONS,
  STATUS_NAMES,
  validTargets,
  type CombatState,
} from '@realms/game-core';
import type { CombatantView, RunDto } from '@realms/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { EnemyAvatar } from '../avatar/EnemyAvatar';
import { artFromAbilities } from '../avatar/weapon-art';
import { useActiveCharacter } from '../characters/active-character';
import { useRun, useRunAction } from './api';
import { describeLog } from './combat-text';
import './combat.css';
import { useCombatFx, type CombatFx } from './useCombatFx';

/** Seconds left on the current turn, refreshed every 250 ms. */
function useCountdown(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)) : null;
}

function Bar({ value, max, kind }: { value: number; max: number; kind: 'hp' | 'mana' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`bar bar-${kind}`} title={`${value} / ${max}`}>
      <span style={{ width: `${pct}%` }} />
      <em>
        {value}/{max}
      </em>
    </div>
  );
}

function IntentChips({ unit, nameOf }: { unit: CombatantView; nameOf: (id: string) => string }) {
  if (unit.downed || unit.intents.length === 0) return null;
  // Group repeated actions (e.g. three claws at the same target → "×3").
  const groups: Array<{ abilityId: string; targetIds: string[]; count: number }> = [];
  for (const it of unit.intents) {
    const last = groups[groups.length - 1];
    if (last && last.abilityId === it.abilityId && last.targetIds.join() === it.targetIds.join())
      last.count++;
    else groups.push({ ...it, count: 1 });
  }
  return (
    <div className="intents" data-testid="intent">
      {groups.map((it, i) => {
        const a = getAbility(it.abilityId);
        if (!a) return null;
        const dmg = a.effects.find((e) => e.kind === 'damage');
        const value =
          dmg && dmg.kind === 'damage'
            ? `${Math.round(dmg.min * unit.power)}–${Math.round(dmg.max * unit.power)}`
            : (describeEffects(a)[0] ?? '');
        const targets =
          a.targeting.area === 'all'
            ? 'everyone'
            : it.targetIds.map(nameOf).join(', ') + (a.targeting.area === 'row' ? ' (row)' : '');
        const extra = a.effects.some((e) => e.kind === 'status') ? ' +' : '';
        return (
          <span
            key={i}
            className="intent"
            title={`${a.name}${it.count > 1 ? ` ×${it.count}` : ''}: ${describeEffects(a).join(', ')} → ${targets}`}
          >
            <i>{dmg ? '⚔' : '✦'}</i>
            {value}
            {it.count > 1 ? ` ×${it.count}` : ''}
            {extra} <em>→ {targets}</em>
          </span>
        );
      })}
    </div>
  );
}

function StatusChips({ unit }: { unit: CombatantView }) {
  if (unit.downed || (unit.statuses.length === 0 && unit.block === 0)) return null;
  return (
    <span className="statuses">
      {unit.block > 0 && (
        <span
          className="status status-block"
          title="Block: absorbs damage until this unit's next turn"
        >
          ⛨ {unit.block}
        </span>
      )}
      {unit.statuses.map((st) => (
        <span key={st.id} className={`status status-${st.id}`} title={STATUS_DESCRIPTIONS[st.id]}>
          {STATUS_NAMES[st.id]}
          {st.value ? ` ${st.value}` : ''} · {st.turns}
        </span>
      ))}
    </span>
  );
}

function Unit(props: {
  nameOf: (id: string) => string;
  unit: CombatantView;
  active: boolean;
  targetable: boolean;
  fx: CombatFx;
  onClick?: () => void;
}) {
  const { unit, fx } = props;
  const cls = [
    'unit',
    `unit-${unit.side}`,
    unit.downed ? 'is-downed' : '',
    props.active ? 'is-active' : '',
    props.targetable ? 'is-targetable' : '',
    fx.actingId === unit.id ? 'is-acting' : '',
    fx.hitIds.has(unit.id) ? 'is-hit' : '',
    unit.isBoss ? 'is-boss' : '',
  ].join(' ');
  const size = unit.isBoss ? 150 : 118;
  return (
    <button
      type="button"
      className={cls}
      disabled={!props.targetable}
      onClick={props.onClick}
      data-testid={`unit-${unit.side}`}
      aria-label={`${unit.name}${props.targetable ? ' (target)' : ''}`}
    >
      <div className="unit-floats">
        {(fx.floats[unit.id] ?? []).map((f) => (
          <span key={f.key} className={`float float-${f.kind}`}>
            {f.text}
          </span>
        ))}
      </div>
      {unit.kind === 'enemy' && <IntentChips unit={unit} nameOf={props.nameOf} />}
      <div className="unit-art">
        {unit.kind === 'player' ? (
          <CharacterAvatar
            appearance={unit.appearance}
            {...artFromAbilities(unit.abilityIds)}
            size={size}
          />
        ) : (
          <EnemyAvatar enemyDefId={unit.enemyDefId} size={size} />
        )}
      </div>
      <div className="unit-info">
        <span className="unit-name">{unit.name}</span>
        <Bar value={unit.hp} max={unit.maxHp} kind="hp" />
        <StatusChips unit={unit} />
        {unit.kind === 'player' && unit.maxMana > 0 && (
          <Bar value={unit.mana} max={unit.maxMana} kind="mana" />
        )}
        {unit.kind === 'player' && (
          <span className="focus-pips" aria-label={`${unit.focus} Focus`}>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} data-on={i < unit.focus} />
            ))}
          </span>
        )}
      </div>
    </button>
  );
}

function Formation(props: {
  nameOf: (id: string) => string;
  side: 'party' | 'enemies';
  units: CombatantView[];
  activeId: string | null;
  targetIds: Set<string>;
  swapSlots: Set<number> | null;
  fx: CombatFx;
  onTarget: (u: CombatantView) => void;
  onSlot: (slot: number) => void;
}) {
  // Party: back row on the far left, front row near the centre. Enemies mirrored.
  const rows =
    props.side === 'party'
      ? [
          [3, 4, 5],
          [0, 1, 2],
        ]
      : [
          [0, 1, 2],
          [3, 4, 5],
        ];
  return (
    <div className={`formation formation-${props.side}`}>
      {rows.map((slots, ri) => (
        <div className="formation-row" key={ri}>
          {slots.map((slot) => {
            const unit = props.units.find((u) => u.slot === slot);
            const swappable = props.swapSlots?.has(slot) ?? false;
            return (
              <div className={`cell cell-${slot % 3}`} key={slot} data-slot={slot}>
                {unit ? (
                  <Unit
                    nameOf={props.nameOf}
                    unit={unit}
                    active={unit.id === props.activeId}
                    targetable={props.targetIds.has(unit.id) || swappable}
                    fx={props.fx}
                    onClick={() => (swappable ? props.onSlot(slot) : props.onTarget(unit))}
                  />
                ) : swappable ? (
                  <button
                    type="button"
                    className="empty-slot"
                    onClick={() => props.onSlot(slot)}
                    aria-label={`Move to slot ${slot + 1}`}
                  >
                    Move here
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EndOverlay({ run }: { run: RunDto }) {
  const victory = run.status === 'victory';
  return (
    <div className="combat-overlay">
      <div className="panel stack end-card" data-testid="run-result">
        <h2 style={{ color: victory ? 'var(--accent)' : 'var(--danger)' }}>
          {victory ? 'Victory' : run.status === 'abandoned' ? 'You fled the Rift' : 'Defeat'}
        </h2>
        {run.rewards && (
          <div>
            <p style={{ margin: 0 }}>
              Reputation <strong>+{run.rewards.reputation}</strong>
            </p>
            {run.rewards.items.map((i) => (
              <p key={i.id} style={{ margin: '4px 0 0' }}>
                Loot: <strong>{i.name}</strong>
              </p>
            ))}
          </div>
        )}
        {run.penalty && (
          <div>
            <p className="muted" style={{ margin: 0 }}>
              Your equipment was damaged:
            </p>
            {run.penalty.damaged.map((d) => (
              <p
                key={d.id}
                style={{ margin: '4px 0 0', color: d.broken ? 'var(--danger)' : undefined }}
              >
                {d.name}: quality {d.quality}
                {d.broken ? ' — broken!' : ''}
              </p>
            ))}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/rifts">
            Back to Rifts
          </Link>
          <Link className="btn btn-primary" to="/world">
            Return to the world
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CombatPage() {
  const { runId = '' } = useParams();
  const characterId = useActiveCharacter((s) => s.characterId);
  const run = useRun(runId, characterId);
  const action = useRunAction(runId, characterId);
  const [selected, setSelected] = useState<string | null>(null);
  const fx = useCombatFx(run.data?.combat.log);
  const secondsLeft = useCountdown(run.data?.status === 'active' ? run.data.turnDeadline : null);

  // When the turn timer runs out, ask the server (it applies the timeout).
  useEffect(() => {
    if (secondsLeft === 0) void run.refetch();
  }, [secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const combat = run.data?.combat;
  const myId = characterId ? `p:${characterId}` : '';
  const me = combat?.combatants.find((c) => c.id === myId);
  const myTurn = combat?.phase === 'party' && combat.activeId === myId;
  const ability = selected ? getAbility(selected) : undefined;

  const { targetIds, swapSlots } = useMemo(() => {
    const none = { targetIds: new Set<string>(), swapSlots: null as Set<number> | null };
    if (!combat || !me || !ability || !myTurn) return none;
    if (ability.effects.some((e) => e.kind === 'swap'))
      return {
        targetIds: new Set<string>(),
        swapSlots: new Set([0, 1, 2, 3, 4, 5].filter((s) => s !== me.slot)),
      };
    const t = validTargets(combat as unknown as CombatState, me, ability);
    return { targetIds: new Set(t.map((u) => u.id)), swapSlots: null };
  }, [combat, me, ability, myTurn]);

  if (!characterId) return <Navigate to="/characters" replace />;
  if (run.isPending) return <FullPageMessage>Opening the Rift…</FullPageMessage>;
  if (run.isError || !run.data || !combat)
    return <FullPageMessage>Rift run not found.</FullPageMessage>;
  const data = run.data;

  const send = (a: Parameters<typeof action.mutate>[0]) => {
    setSelected(null);
    action.mutate(a);
  };

  const pick = (abilityId: string) => {
    const a = getAbility(abilityId)!;
    if (!me) return;
    // Abilities with nothing to choose fire immediately.
    if (a.targeting.area === 'all' || a.targeting.side === 'self')
      return send({ type: 'ability', abilityId });
    if (!a.effects.some((e) => e.kind === 'swap')) {
      const t = validTargets(combat as unknown as CombatState, me, a);
      if (
        a.targeting.area === 'row' &&
        t.length > 0 &&
        new Set(t.map((u) => u.slot < 3)).size === 1
      )
        return send({ type: 'ability', abilityId, targetId: t[0]!.id });
    }
    setSelected(selected === abilityId ? null : abilityId);
  };

  const room = data.rooms[data.roomIndex];
  const byName = (id: string) => combat.combatants.find((c) => c.id === id)?.name ?? '';
  const lines = combat.log
    .map((e) => ({ seq: e.seq, text: describeLog(e, combat) }))
    .filter((l): l is { seq: number; text: string } => !!l.text)
    .slice(-14)
    .reverse();

  return (
    <div className="combat">
      <header className="combat-top">
        <span className="title">{data.riftName}</span>
        <span className="muted">
          Room {data.roomIndex + 1}/{data.rooms.length} · {room?.name}
          {room?.isBoss ? ' · Boss' : ''}
        </span>
        <span className="mono muted">Round {combat.round}</span>
        <span className="turn-order">
          {combat.turnOrder.map((id) => (
            <span key={id} data-active={id === combat.activeId}>
              {byName(id)}
            </span>
          ))}
          <span data-active={combat.phase === 'enemies'}>Enemies</span>
        </span>
        <span className="spacer" />
        {data.status === 'active' && (
          <button
            className="btn btn-ghost btn-sm btn-danger"
            onClick={() => {
              if (
                confirm(
                  'Leave the Rift? It counts as a defeat for you: your equipped items lose quality. Your group keeps fighting.',
                )
              )
                send({ type: 'abandon' });
            }}
          >
            Abandon
          </button>
        )}
      </header>

      <section className="stage" data-boss={room?.isBoss ?? false}>
        <Formation
          nameOf={byName}
          side="party"
          units={combat.combatants.filter((c) => c.side === 'party')}
          activeId={combat.activeId}
          targetIds={targetIds}
          swapSlots={swapSlots}
          fx={fx}
          onTarget={(u) =>
            selected && send({ type: 'ability', abilityId: selected, targetId: u.id })
          }
          onSlot={(slot) =>
            selected && send({ type: 'ability', abilityId: selected, targetSlot: slot })
          }
        />
        <div className="stage-gap" aria-hidden />
        <Formation
          nameOf={byName}
          side="enemies"
          units={combat.combatants.filter((c) => c.side === 'enemies')}
          activeId={combat.activeId}
          targetIds={targetIds}
          swapSlots={null}
          fx={fx}
          onTarget={(u) =>
            selected && send({ type: 'ability', abilityId: selected, targetId: u.id })
          }
          onSlot={() => {}}
        />
        {data.status === 'active' && combat.phase === 'room_cleared' && (
          <div className="combat-overlay">
            <div className="panel stack end-card">
              <h2>Room cleared</h2>
              <p className="muted" style={{ margin: 0 }}>
                Your HP and Mana carry over. Fallen allies get back up with 1 HP.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => send({ type: 'advance' })}
                disabled={action.isPending}
              >
                Continue to {data.rooms[data.roomIndex + 1]?.name ?? 'the next room'}
              </button>
            </div>
          </div>
        )}
        {data.status !== 'active' && <EndOverlay run={data} />}
      </section>

      <footer className="combat-bottom">
        <div className="action-bar">
          <FormError error={action.error} />
          {myTurn && me ? (
            <>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <strong>Your turn</strong>
                <span className="muted">
                  Focus <strong data-testid="my-focus">{me.focus}</strong> · Mana {me.mana}
                </span>
                {secondsLeft !== null && (
                  <span className="timer" data-low={secondsLeft <= 10}>
                    {secondsLeft}s
                  </span>
                )}
                <span className="spacer" />
                {selected && <span className="muted">Choose a target…</span>}
              </div>
              <div className="abilities">
                {me.abilityIds.map((id) => {
                  const a = getAbility(id)!;
                  const affordable = a.focusCost <= me.focus && a.manaCost <= me.mana;
                  return (
                    <button
                      key={id}
                      className="ability-btn"
                      aria-pressed={selected === id}
                      disabled={!affordable || action.isPending}
                      onClick={() => pick(id)}
                      title={`${a.description}\n${describeEffects(a).join(' · ')}`}
                    >
                      <strong>{a.name}</strong>
                      <small className="ability-effects">{describeEffects(a).join(' · ')}</small>
                      <span>
                        <i className="cost">{a.focusCost} Focus</i>
                        {a.manaCost > 0 && <i className="cost mana">{a.manaCost} Mana</i>}
                      </span>
                    </button>
                  );
                })}
                <button
                  className="btn btn-primary end-turn"
                  onClick={() => send({ type: 'end_turn' })}
                  disabled={action.isPending}
                >
                  End turn
                </button>
              </div>
            </>
          ) : (
            <span className="muted" data-testid="waiting">
              {data.status !== 'active'
                ? ''
                : combat.phase === 'enemies'
                  ? 'The enemies are acting…'
                  : combat.phase === 'room_cleared'
                    ? 'Room cleared.'
                    : combat.activeId
                      ? `Waiting for ${byName(combat.activeId)}…`
                      : 'Waiting…'}
            </span>
          )}
        </div>
        <ol className="combat-log" data-testid="combat-log">
          {lines.map((l) => (
            <li key={l.seq}>{l.text}</li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
