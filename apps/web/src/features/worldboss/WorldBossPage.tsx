import { WORLD_BOSS_ID } from '@realms/game-core';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useActiveRun } from '../rifts/api';
import { useLobbyActions, useLobbyOverview } from '../rifts/lobby-api';
import { useWorldBoss, useWorldBossFight } from '../world/api';
import { useWorldStore } from '../world/world-store';

/**
 * World boss (request #43): the season's boss roams the Riftlands with a huge
 * shared HP pool. Fight it (alone or with a lobby) where it stands; the damage
 * your party deals goes on the leaderboard.
 */
export function WorldBossPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const boss = useWorldBoss(characterId);
  const fight = useWorldBossFight(characterId);
  const active = useActiveRun(characterId);
  const overview = useLobbyOverview(characterId);
  const lobby = useLobbyActions(characterId);
  const self = useWorldStore((s) => s.self);
  const navigate = useNavigate();
  if (!characterId) return <Navigate to="/" replace />;
  const b = boss.data;
  const busy = !!active.data || !!overview.data?.mine;
  const pct = b ? Math.max(0, (b.hp / b.maxHp) * 100) : 100;
  const canFight = !!b?.you?.here && (b.you.attemptsLeft ?? 0) > 0 && !b.defeatedAt && !busy;

  return (
    <div className="screen-body">
      <div className="contain stack" style={{ maxWidth: '56rem' }}>
        <FormError error={boss.error ?? fight.error ?? lobby.create.error} />
        {b && (
          <>
            <section className="panel stack boss-card" data-testid="world-boss">
              <span className="muted">{b.theme}</span>
              <h1 className="page-title" style={{ margin: 0 }}>
                {b.name}
              </h1>
              <p className="muted" style={{ margin: 0 }}>
                {b.description}
              </p>
              <div className="boss-hp" aria-label="World boss health">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong data-testid="boss-hp">
                  {b.hp.toLocaleString()} / {b.maxHp.toLocaleString()} HP
                </strong>
                <span className="muted">
                  Now at hex ({b.position.q}, {b.position.r}) · moves{' '}
                  {new Date(b.nextMoveAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {b.seasonOver ? (
                <p>{b.defeatedAt ? 'It has fallen this season.' : 'This season is over.'}</p>
              ) : b.you?.here ? (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    disabled={!canFight || fight.isPending}
                    onClick={() =>
                      fight.mutate(undefined, {
                        onSuccess: (run) => navigate(`/rifts/runs/${run.id}`),
                      })
                    }
                  >
                    Fight alone
                  </button>
                  <button
                    className="btn"
                    disabled={!canFight || lobby.create.isPending}
                    onClick={() =>
                      lobby.create.mutate(
                        { riftId: WORLD_BOSS_ID, visibility: 'public' },
                        { onSuccess: (l) => navigate(`/rifts/lobbies/${l.id}`) },
                      )
                    }
                  >
                    Gather a party
                  </button>
                  <span className="muted">
                    {b.you.attemptsLeft} of {b.attemptsPerDay} fight
                    {b.attemptsPerDay > 1 ? 's' : ''} left today
                  </span>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  You are at ({self?.position.q}, {self?.position.r}). Travel to the boss on the{' '}
                  <Link to="/world">world map</Link> to fight it.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel-title">
                <span>Leaderboard · damage by party</span>
              </div>
              <p className="muted" style={{ marginTop: 0 }} data-testid="season-reward">
                {b.rewardedAt
                  ? 'The season is over: the top party received its reward.'
                  : `When the season ends (${new Date(b.endsAt).toLocaleDateString()} or when the boss falls), every member of the top party receives ${b.reward.item} and ${b.reward.reputation} reputation.`}
              </p>
              {b.leaderboard.length ? (
                <ol className="leaderboard" data-testid="leaderboard">
                  {b.leaderboard.map((r) => (
                    <li key={r.rank}>
                      <span className="rank">#{r.rank}</span>
                      <span className="who">{r.members.join(', ')}</span>
                      <span className="muted">
                        {r.attempts} fight{r.attempts > 1 ? 's' : ''}
                      </span>
                      <strong>{r.damage.toLocaleString()}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Nobody has fought it yet this season.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
