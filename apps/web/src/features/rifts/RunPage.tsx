import { ATTRIBUTE_NAMES, testChance } from '@realms/game-core';
import type { CombatAction, RunDto, TestRollView } from '@realms/shared';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { Modal } from '../../shared/ui/Modal';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
import { useRun, useRunAction } from './api';
import { CombatScreen } from './CombatPage';
import './combat.css';
import { LootList } from './LootList';
import { EndOverlay } from './EndOverlay';
import { RiftDoors } from './RiftDoors';
import './rift-doors.css';

/** Seconds left on the current decision or planning phase, refreshed every 250 ms. */
function useCountdown(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)) : null;
}

/**
 * A Rift run (request #31). Fights use the combat screen; everything else
 * (choosing the next door, events, campsites, loot and secret rooms) happens
 * on the exploration screen.
 */
export function RunPage() {
  const { runId = '' } = useParams();
  const characterId = useActiveCharacter((s) => s.characterId);
  const run = useRun(runId, characterId);
  const action = useRunAction(runId, characterId);
  const secondsLeft = useCountdown(run.data?.status === 'active' ? run.data.deadline : null);

  // When a timer runs out, ask the server (it applies the timeout).
  useEffect(() => {
    if (secondsLeft === 0) void run.refetch();
  }, [secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!characterId) return <Navigate to="/" replace />;
  if (run.isPending) return <FullPageMessage>Opening the Rift…</FullPageMessage>;
  if (run.isError || !run.data)
    return <FullPageMessage spinner={false}>Rift run not found.</FullPageMessage>;
  const data = run.data;
  if (data.combat && (data.phase === 'combat' || data.phase === 'ended'))
    return (
      <CombatScreen
        key={`${data.roomsVisited}`}
        run={data}
        characterId={characterId}
        action={action}
        secondsLeft={secondsLeft}
      />
    );
  return (
    <ExplorationScreen
      run={data}
      characterId={characterId}
      action={action}
      secondsLeft={secondsLeft}
    />
  );
}

function TestLine({ test }: { test: TestRollView }) {
  return (
    <p className="test-line" data-testid="test-roll" data-success={test.success}>
      {test.testerName}: {ATTRIBUTE_NAMES[test.attribute]} {test.base} (base) + roll {test.roll} ={' '}
      {test.total} vs {test.difficulty} — <strong>{test.success ? 'Success' : 'Failure'}</strong>
    </p>
  );
}

function ExplorationScreen({
  run,
  characterId,
  action,
  secondsLeft,
}: {
  run: RunDto;
  characterId: string;
  action: ReturnType<typeof useRunAction>;
  secondsLeft: number | null;
}) {
  const send = (a: CombatAction) => action.mutate(a);
  const me = run.party.find((m) => m.characterId === characterId);
  const myVote = run.votes.find((v) => v.characterId === characterId) ?? null;
  const active = run.party.filter((m) => !m.left);
  const nameOf = (id: string) => run.party.find((m) => m.characterId === id)?.name ?? '?';
  const [tester, setTester] = useState<string>(characterId);
  const testerMember = run.party.find((m) => m.characterId === tester) ?? me;
  const deciding =
    run.status === 'active' &&
    (run.phase === 'map' || (run.phase === 'event' && !run.event?.result));

  return (
    <div className="combat explore">
      <header className="combat-top">
        <div className="combat-where">
          <span className="title">{run.riftName}</span>
          <span className="muted small">
            Rooms explored {run.roomsVisited} · {active.length} in the party
          </span>
        </div>
        <div className="combat-round">
          <span
            className="threat"
            data-testid="threat"
            data-tier={run.threat.tier?.name ?? 'calm'}
            title={
              (run.threat.tier
                ? `${run.threat.tier.name}: ${run.threat.tier.description}`
                : 'Calm: no effect yet.') +
              (run.threat.next
                ? ` Next at ${run.threat.next.at}: ${run.threat.next.description}`
                : '') +
              ' Failed tests and timed-out votes raise it; clearing an Elite lowers it.'
            }
          >
            Threat {run.threat.value}
            {run.threat.tier ? ` · ${run.threat.tier.name}` : ''}
          </span>
        </div>
        <div className="combat-tools">
          {deciding && secondsLeft !== null && (
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
        </div>
      </header>

      <div className="explore-body">
        <aside className="party-panel" aria-label="Party">
          <h3>Party</h3>
          {run.party.map((m) => (
            <div key={m.characterId} className="party-member" data-left={m.left}>
              <CharacterToken appearance={m.appearance} size={40} title={m.name} />
              <div className="party-info">
                <strong>
                  {m.name}
                  {m.characterId === run.leaderId ? ' ★' : ''}
                  {m.left ? ' (left)' : ''}
                </strong>
                <div className="bar hp small">
                  <span style={{ width: `${(m.hp / Math.max(1, m.maxHp)) * 100}%` }} />
                  <em data-testid={m.characterId === characterId ? 'my-hp' : undefined}>
                    HP {m.hp}/{m.maxHp}
                  </em>
                </div>
                <div className="bar mana small">
                  <span style={{ width: `${(m.mana / Math.max(1, m.maxMana)) * 100}%` }} />
                  <em>
                    Mana {m.mana}/{m.maxMana}
                  </em>
                </div>
                {m.conditions.length > 0 && (
                  <div className="conditions">
                    {m.conditions.map((c) => (
                      <span
                        key={c.id}
                        className="condition"
                        data-kind={c.kind}
                        title={c.description}
                      >
                        {c.name}
                        {c.rooms !== null ? ` (${c.rooms})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </aside>

        <main className="map-area">
          {run.phase === 'map' && run.status === 'active' && (
            <h2 className="doors-title">Which way?</h2>
          )}
          <RiftDoors
            map={run.map}
            votes={run.votes}
            nameOf={nameOf}
            myVote={run.phase === 'map' ? (myVote?.optionId ?? null) : null}
            disabled={run.phase !== 'map' || run.status !== 'active' || action.isPending}
            onChoose={(id) => send({ type: 'vote', optionId: id })}
          />
          {run.phase === 'map' && run.status === 'active' && (
            <p className="map-hint muted">
              {myVote
                ? active.length > 1
                  ? 'Waiting for the others to vote…'
                  : ''
                : 'Pick a door. You will only know what waits behind it once you step through.'}
            </p>
          )}
          {run.phase === 'map' && (
            <p className="map-lore muted small">
              Fights cost HP and Mana and give no drops. The main rewards wait at the boss — arrive
              with as much strength as you can. Campsites heal part of your HP and Mana.
            </p>
          )}
        </main>

        <aside className="room-panel" aria-label="Room">
          <FormError error={action.error} />
          {run.outcome?.search && run.phase !== 'room' && <TestLine test={run.outcome.search} />}
          {/* Request #64: rooms (challenges, events, loot, campsites) open in front of everything. */}
          {run.phase === 'event' && run.event && (
            <Modal label={run.event.title}>
              <div className="panel stack" data-testid="event">
                <h2>{run.event.title}</h2>
                <p>{run.event.text}</p>
                {!run.event.result ? (
                  <>
                    {active.length > 1 && (
                      <label className="field">
                        Who attempts it?
                        <select value={tester} onChange={(e) => setTester(e.target.value)}>
                          {active.map((m) => (
                            <option key={m.characterId} value={m.characterId}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="approaches">
                      {run.event.approaches.map((a) => {
                        const voters = run.votes.filter((v) => v.optionId === a.id);
                        const base =
                          a.attribute && testerMember
                            ? testerMember.baseAttributes[a.attribute]
                            : null;
                        return (
                          <button
                            key={a.id}
                            className="btn approach"
                            data-mine={myVote?.optionId === a.id}
                            disabled={action.isPending}
                            onClick={() =>
                              send({
                                type: 'vote',
                                optionId: a.id,
                                ...(a.attribute ? { testerId: tester } : {}),
                              })
                            }
                          >
                            <strong>{a.label}</strong>
                            <span className="muted small">{a.description}</span>
                            {a.attribute && a.difficulty !== null && base !== null && (
                              <span className="small">
                                {ATTRIBUTE_NAMES[a.attribute]} {base} (base) vs {a.difficulty} ·{' '}
                                {Math.round(testChance(base, a.difficulty) * 100)}%
                              </span>
                            )}
                            {voters.length > 0 && (
                              <span className="small">
                                Votes: {voters.map((v) => nameOf(v.characterId)).join(', ')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="muted small">
                      Tests use BASE attributes only — equipment and buffs do not count.
                    </p>
                  </>
                ) : (
                  <>
                    {run.event.result.test && <TestLine test={run.event.result.test} />}
                    <p>{run.event.result.text}</p>
                    <ul className="effects">
                      {run.event.result.effects.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                    {run.status === 'active' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => send({ type: 'continue' })}
                      >
                        Continue
                      </button>
                    )}
                  </>
                )}
              </div>
            </Modal>
          )}
          {run.phase === 'room' && run.outcome && (
            // Request #50: what was found pops up, coloured by rarity.
            <Modal label={run.outcome.title}>
              <div className="panel stack" data-testid="room-outcome">
                <h2>{run.outcome.title}</h2>
                {run.outcome.search && <TestLine test={run.outcome.search} />}
                <p>{run.outcome.text}</p>
                {run.outcome.effects.length > 0 && (
                  <ul className="effects">
                    {run.outcome.effects.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {(run.outcome.items.length > 0 || !!run.outcome.gold) && (
                  <LootList
                    gold={run.outcome.gold}
                    items={run.outcome.items.map((it) => ({
                      name: it.name,
                      rarity: it.rarity,
                      who: nameOf(it.characterId),
                    }))}
                  />
                )}
                <button className="btn btn-primary" onClick={() => send({ type: 'continue' })}>
                  Continue
                </button>
              </div>
            </Modal>
          )}
        </aside>
      </div>
      {run.status !== 'active' && <EndOverlay run={run} />}
    </div>
  );
}
