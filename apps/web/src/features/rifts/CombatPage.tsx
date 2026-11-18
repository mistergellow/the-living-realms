import { getAbility, validTargets, type CombatState } from '@realms/game-core';
import { columnOfSlot, type CombatantView, type CombatView, type RunDto } from '@realms/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { useActiveCharacter } from '../characters/active-character';
import { useRun, useRunAction } from './api';
import { describeLog } from './combat-text';
import './combat.css';
import { AbilityBar } from './AbilityBar';
import { CombatStage } from './CombatStage';

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
              <p key={i.id} style={{ margin: '0.25rem 0 0' }}>
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
                style={{ margin: '0.25rem 0 0', color: d.broken ? 'var(--danger)' : undefined }}
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
          <Link className="btn btn-primary" to="/home">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Keeps the screen in step with the canvas replay. Computed during render
 * (not in an effect), so new results never flash up before they are played:
 * - `pending`: some log entries have not finished playing yet;
 * - `logUpTo`: the text log shows entries up to this seq;
 * - `enemiesActing`: the replay includes enemy actions (controls wait).
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
  let enemiesActing = false;
  if (pending && combat) {
    const enemyIds = new Set(
      combat.combatants.filter((c) => c.side === 'enemies').map((c) => c.id),
    );
    enemiesActing = log.some((e) => e.seq > played && e.t === 'ability' && enemyIds.has(e.actorId));
  }
  return { pending, logUpTo, enemiesActing, onProgress, onCaughtUp };
}

export function CombatPage() {
  const { runId = '' } = useParams();
  const characterId = useActiveCharacter((s) => s.characterId);
  const run = useRun(runId, characterId);
  const action = useRunAction(runId, characterId);
  const [selected, setSelected] = useState<string | null>(null);
  // While the canvas replays the last actions (e.g. the enemy phase), hold the controls.
  const replay = useReplayState(run.data?.combat);
  const secondsLeft = useCountdown(run.data?.status === 'active' ? run.data.turnDeadline : null);

  // When the turn timer runs out, ask the server (it applies the timeout).
  useEffect(() => {
    if (secondsLeft === 0) void run.refetch();
  }, [secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const combat = run.data?.combat;
  const myId = characterId ? `p:${characterId}` : '';
  const me = combat?.combatants.find((c) => c.id === myId);
  const myTurn = !replay.enemiesActing && combat?.phase === 'party' && combat.activeId === myId;
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
    return <FullPageMessage spinner={false}>Rift run not found.</FullPageMessage>;
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
        a.targeting.area === 'column' &&
        t.length > 0 &&
        new Set(t.map((u) => Math.floor(u.slot / 2))).size === 1
      )
        return send({ type: 'ability', abilityId, targetId: t[0]!.id });
    }
    setSelected(selected === abilityId ? null : abilityId);
  };

  // D41: attacks aim at a column (both units in it); support picks one ally.
  const columnMode = ability?.targeting.area === 'column';
  const targetAction = (abilityId: string, u: CombatantView) =>
    getAbility(abilityId)?.targeting.area === 'column'
      ? ({ type: 'ability', abilityId, targetColumn: columnOfSlot(u.slot) } as const)
      : ({ type: 'ability', abilityId, targetId: u.id } as const);

  const room = data.rooms[data.roomIndex];
  const byName = (id: string) => combat.combatants.find((c) => c.id === id)?.name ?? '';
  const lines = combat.log
    .filter((e) => e.seq <= replay.logUpTo)
    .map((e) => ({ seq: e.seq, text: describeLog(e, combat) }))
    .filter((l): l is { seq: number; text: string } => !!l.text)
    .slice(-40)
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

      <CombatStage
        onProgress={replay.onProgress}
        onCaughtUp={replay.onCaughtUp}
        combat={combat}
        boss={room?.isBoss ?? false}
        targetIds={targetIds}
        swapSlots={swapSlots}
        columnMode={columnMode}
        onTarget={(u) => selected && send(targetAction(selected, u))}
        onSlot={(slot) =>
          selected && send({ type: 'ability', abilityId: selected, targetSlot: slot })
        }
      >
        {!replay.pending && data.status === 'active' && combat.phase === 'room_cleared' && (
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
        {/* Victory/defeat wait for the replay; fleeing shows the result at once. */}
        {(!replay.pending || data.status === 'abandoned') && data.status !== 'active' && (
          <EndOverlay run={data} />
        )}
      </CombatStage>

      <footer className="combat-bottom">
        <div className="action-bar">
          <FormError error={action.error} />
          {myTurn && me ? (
            <>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong className="your-turn">Your turn</strong>
                <span className="muted">
                  Focus <strong data-testid="my-focus">{me.focus}</strong> · Mana {me.mana}
                </span>
                {secondsLeft !== null && (
                  <span className="timer" data-low={secondsLeft <= 10}>
                    {secondsLeft}s
                  </span>
                )}
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
                  focus={me.focus}
                  mana={me.mana}
                  selected={selected}
                  disabled={action.isPending}
                  onPick={pick}
                  onCancel={() => setSelected(null)}
                />
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
                : combat.phase === 'enemies' || replay.enemiesActing
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
