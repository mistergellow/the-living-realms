import { ATTRIBUTE_NAMES, MASTERY_RANK_NAMES, MASTERY_RANKS } from '@realms/game-core';
import type { ProfessionDto } from '@realms/shared';
import { Link } from 'react-router';
import { useProfessions } from './api';
import { PROFESSION_SECTIONS } from './ProfessionsPage';
import './professions.css';

/**
 * Request #81: the character's professions at a glance, like a survival game's
 * skills screen — one compact line each, with a row of squares (one per
 * Mastery rank) that fill up. Doing things happens elsewhere: gathering on the
 * hex you stand on, crafting in Crafts.
 */
export function SkillsPanel({ characterId }: { characterId: string }) {
  const list = useProfessions(characterId);
  const profs = list.data?.professions ?? [];
  return (
    <div className="skills" data-testid="skills-panel">
      {PROFESSION_SECTIONS.map((s) => (
        <section
          key={s.category}
          className="panel skills-col"
          data-testid={`section-${s.category}`}
        >
          <div className="panel-title">{s.title}</div>
          <ul>
            {profs
              .filter((p) => p.category === s.category)
              .map((p) => (
                <SkillRow key={p.id} p={p} />
              ))}
          </ul>
        </section>
      ))}
      <p className="muted small skills-foot">
        Gather on the hex you stand on (Here). Craft and repair in{' '}
        <Link to="/professions">Crafts</Link>.
      </p>
    </div>
  );
}

function SkillRow({ p }: { p: ProfessionDto }) {
  const part = p.pointsToNext ? Math.min(1, p.points / p.pointsToNext) : 0;
  const helped = p.attributes.map((a) => ATTRIBUTE_NAMES[a.attribute]).join(', ');
  return (
    <li>
      <Link
        className="skill-row"
        to={`/professions?p=${p.id}`}
        data-testid={`profession-${p.id}`}
        title={`${p.rankName} ${p.title}${
          p.pointsToNext ? ` · ${p.points}/${p.pointsToNext} Mastery` : ' · mastered'
        } · helped by ${helped} (+${p.attributeBonus}%)`}
      >
        <span className="skill-name">{p.name}</span>
        <span className="skill-pips" aria-label={`${p.rankName}, rank ${p.rank + 1} of 6`}>
          {MASTERY_RANKS.map((r, i) => (
            <i
              key={r}
              title={MASTERY_RANK_NAMES[r]}
              data-state={i < p.rank ? 'done' : i === p.rank ? 'current' : 'empty'}
              style={
                i === p.rank ? { ['--fill' as string]: `${Math.round(part * 100)}%` } : undefined
              }
            />
          ))}
        </span>
        <span className="skill-rank" data-rank={p.rank}>
          {p.rankName}
        </span>
        {p.attributeBonus > 0 && <span className="skill-boost">+{p.attributeBonus}%</span>}
      </Link>
    </li>
  );
}
