import { MAX_PREPARED_SKILLS, type AbilityDto, type CharacterSheetDto } from '@realms/shared';
import { Rich } from '../../../shared/ui/Rich';
import { useMemo, useState } from 'react';
import { FormError } from '../../../shared/ui/FormError';
import { AbilityIcon, abilitySchool, type AbilitySchool } from '../../rifts/AbilityIcon';
import { useLoadout } from '../api';
import { DragGhost, Tooltip, useDragAndDrop, useHover } from './drag';
import { AbilityEffects } from '../../../shared/ui/EffectIcon';

/*
 * Abilities tab (request #39). Weapon abilities, Block and Swap are always
 * there; skills come from books and up to MAX_PREPARED_SKILLS are prepared
 * for combat. Prepare by dragging a skill onto a slot or by clicking it.
 */

const SCHOOLS: Array<{ id: AbilitySchool | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'physical', label: 'Physical' },
  { id: 'ranged', label: 'Ranged' },
  { id: 'magic', label: 'Magic' },
  { id: 'heal', label: 'Healing' },
  { id: 'block', label: 'Defense' },
  { id: 'status', label: 'Status' },
  { id: 'utility', label: 'Utility' },
];

/** Drag payload: a skill, from the library or from a loadout slot. */
type Drag = { id: string; from: number | 'library' };

function Costs({ a }: { a: AbilityDto }) {
  return (
    <>
      <span className="cost">{a.focusCost} Focus</span>
      {a.manaCost > 0 && <span className="cost mana">{a.manaCost} Mana</span>}
    </>
  );
}

export function AbilityTooltipBody({ a }: { a: AbilityDto }) {
  return (
    <div className="item-tip">
      <header>
        <strong className="tip-name">{a.name}</strong>
        <span className="tip-sub">{a.targeting}</span>
      </header>
      <div className="row" style={{ gap: '0.35rem' }}>
        <Costs a={a} />
      </div>
      {a.effects.length > 0 && (
        <ul className="tip-stats">
          {a.effects.map((e) => (
            <li key={e}>
              <Rich text={e} />
            </li>
          ))}
        </ul>
      )}
      {a.scaling && (
        <div className="tip-row">
          <span className="muted">Scales with</span>
          <b>
            <Rich text={a.scaling} />
          </b>
        </div>
      )}
      <p className="tip-desc">
        <Rich text={a.description} />
      </p>
    </div>
  );
}

function AbilityCard(props: { a: AbilityDto; note?: string; prepared?: boolean; testId?: string }) {
  const { a } = props;
  return (
    <div className="ability-card" data-prepared={props.prepared} data-testid={props.testId}>
      <span className="ability-card-icon">
        <AbilityIcon abilityId={a.id} />
      </span>
      <div className="ability-card-body">
        <div className="row" style={{ gap: '0.4rem' }}>
          <strong>
            {a.name}
            {a.level ? (
              <span className="skill-level" data-testid="skill-level" data-level={a.level}>
                {' '}
                Lv {a.levelLabel ?? a.level}
              </span>
            ) : null}
          </strong>
          <Costs a={a} />
          <span className="spacer" />
          {props.note && <span className="field-hint">{props.note}</span>}
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          <AbilityEffects abilityId={a.id} />
          <span className="field-hint">{a.targeting}</span>
        </div>
        <div className="field-hint">{a.effects.join(' · ')}</div>
      </div>
    </div>
  );
}

export function AbilitiesTab({
  sheet: s,
  characterId,
}: {
  sheet: CharacterSheetDto;
  characterId: string;
}) {
  const loadout = useLoadout(characterId);
  const [query, setQuery] = useState('');
  const [school, setSchool] = useState<AbilitySchool | 'all'>('all');
  const tip = useHover<AbilityDto>();
  const byId = useMemo(() => new Map(s.learnedSkills.map((a) => [a.id, a])), [s.learnedSkills]);
  const slots = s.loadout;
  const preparedCount = slots.filter(Boolean).length;
  const busy = loadout.isPending;

  const save = (next: Array<string | null>) => !busy && loadout.mutate({ slots: next });
  const prepare = (id: string, at?: number) => {
    const next = slots.map((x) => (x === id ? null : x));
    const slot = at ?? next.findIndex((x) => x === null);
    if (slot < 0) return;
    const prev = slots.indexOf(id);
    // Dropping onto an occupied slot swaps with where the skill came from.
    if (at !== undefined && prev >= 0) next[prev] = slots[at] ?? null;
    next[slot] = id;
    save(next);
  };
  const unprepare = (id: string) => save(slots.map((x) => (x === id ? null : x)));

  const dnd = useDragAndDrop<Drag>((d, target) => {
    tip.clear();
    if (!target) return;
    if (target === 'library') {
      if (d.from !== 'library') unprepare(d.id);
      return;
    }
    const at = Number(target.replace('loadout-', ''));
    if (Number.isInteger(at)) prepare(d.id, at);
  });

  // Prepared skills are also in `abilities` (usable in combat): list them only once.
  // Everything your gear grants (including admin-made abilities on a weapon).
  const weapon = s.abilities.filter(
    (a) => (a.source === 'weapon' || a.grantedBy !== null) && !slots.includes(a.id),
  );
  const universal = s.abilities.filter((a) => a.source === 'universal');
  const q = query.trim().toLowerCase();
  const library = s.learnedSkills.filter(
    (a) =>
      (school === 'all' || abilitySchool(a.id) === school) &&
      (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)),
  );

  return (
    <div className="abilities-tab">
      <FormError error={loadout.error} />

      <section className="panel">
        <div className="panel-title">
          <span>
            Prepared skills ({preparedCount}/{MAX_PREPARED_SKILLS})
          </span>
        </div>
        <div className="loadout" data-testid="loadout">
          {slots.map((id, n) => {
            const a = id ? byId.get(id) : undefined;
            return (
              <div
                key={n}
                className="loadout-slot"
                data-drop={`loadout-${n}`}
                data-accept={dnd.drag ? true : undefined}
                data-over={dnd.drag?.over === `loadout-${n}` ? true : undefined}
              >
                {a ? (
                  <button
                    className="loadout-skill"
                    aria-label={`Prepared: ${a.name}. Click to remove.`}
                    {...dnd.bind({ id: a.id, from: n }, !busy)}
                    {...tip.props(a)}
                    onClick={dnd.click(() => unprepare(a.id))}
                  >
                    <AbilityIcon abilityId={a.id} />
                  </button>
                ) : (
                  <span className="loadout-empty">{n + 1}</span>
                )}
                <span className="loadout-name">{a?.name ?? 'Empty'}</span>
              </div>
            );
          })}
        </div>
        <p className="doll-hint">
          Drag a skill from your library onto a slot, or click it to prepare it. In combat you also
          have your weapon abilities, Dodge and Swap Position.
        </p>
      </section>

      <div className="abilities-cols">
        <section
          className="panel library"
          data-drop="library"
          data-accept={dnd.drag && dnd.drag.payload.from !== 'library' ? true : undefined}
          data-over={
            dnd.drag?.over === 'library' && dnd.drag.payload.from !== 'library' ? true : undefined
          }
        >
          <div className="panel-title">
            <span>Skill library ({s.learnedSkills.length})</span>
          </div>
          <div className="library-tools">
            <input
              className="input"
              type="search"
              placeholder="Search skills…"
              aria-label="Search skills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="bag-filters" role="tablist" aria-label="Skill type">
              {SCHOOLS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={school === f.id}
                  className="chip-btn"
                  onClick={() => setSchool(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {s.learnedSkills.length === 0 ? (
            <p className="muted library-empty" data-testid="library-empty">
              No skills learned yet. Skills are learned from books found in the world.
            </p>
          ) : library.length === 0 ? (
            <p className="muted library-empty">No skill matches.</p>
          ) : (
            <ul className="library-list" data-testid="library">
              {library.map((a) => {
                const prepared = slots.includes(a.id);
                return (
                  <li key={a.id}>
                    <button
                      className="library-item"
                      aria-label={`${prepared ? 'Unprepare' : 'Prepare'} ${a.name}`}
                      {...dnd.bind({ id: a.id, from: 'library' }, !busy)}
                      onClick={dnd.click(() => (prepared ? unprepare(a.id) : prepare(a.id)))}
                    >
                      <AbilityCard
                        a={a}
                        prepared={prepared}
                        note={prepared ? `Slot ${slots.indexOf(a.id) + 1}` : undefined}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel always">
          <div className="panel-title">
            <span>Always available</span>
          </div>
          <h3 className="sub-title">From your weapons</h3>
          <ul className="always-list" data-testid="abilities">
            {weapon.map((a) => (
              <li key={a.id}>
                <AbilityCard a={a} note={a.grantedBy ?? 'Unarmed'} />
              </li>
            ))}
          </ul>
          <h3 className="sub-title">Basic actions</h3>
          <ul className="always-list" data-testid="basic-actions">
            {universal.map((a) => (
              <li key={a.id}>
                <AbilityCard a={a} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {tip.hover && !dnd.drag && (
        <Tooltip anchor={tip.hover.rect}>
          <AbilityTooltipBody a={tip.hover.value} />
        </Tooltip>
      )}
      {dnd.drag && (
        <DragGhost x={dnd.drag.x} y={dnd.drag.y}>
          <span className="ghost-skill">
            <AbilityIcon abilityId={dnd.drag.payload.id} />
          </span>
        </DragGhost>
      )}
    </div>
  );
}
