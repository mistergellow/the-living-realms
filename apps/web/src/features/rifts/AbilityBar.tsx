import { describeEffects, describeScaling, describeTargeting, getAbility } from '@realms/game-core';
import { AbilityEffects } from '../../shared/ui/EffectIcon';
import { useEffect, useId, useRef } from 'react';
import { AbilityIcon, abilitySchool } from './AbilityIcon';

interface AbilityBarProps {
  abilityIds: string[];
  focus: number;
  mana: number;
  selected: string | null;
  disabled: boolean;
  onPick: (abilityId: string) => void;
  onCancel: () => void;
}

/**
 * Classic MMO action bar (request #30): one square icon per ability with its
 * name underneath, cost badges and a hotkey (1–9). Hovering or focusing a slot
 * shows a tooltip with everything the ability does. Esc cancels a selection.
 */
export function AbilityBar(props: AbilityBarProps) {
  const ref = useRef(props);
  useEffect(() => {
    ref.current = props;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const p = ref.current;
      if (e.key === 'Escape' && p.selected) {
        p.onCancel();
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const id = p.abilityIds[n - 1];
      const a = id ? getAbility(id) : undefined;
      if (!id || !a || p.disabled) return;
      if (a.focusCost > p.focus || a.manaCost > p.mana) return;
      e.preventDefault();
      p.onPick(id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="action-slots" role="toolbar" aria-label="Abilities">
      {props.abilityIds.map((id, i) => (
        <AbilitySlot
          key={id}
          abilityId={id}
          hotkey={i < 9 ? String(i + 1) : null}
          affordable={
            (getAbility(id)?.focusCost ?? 99) <= props.focus &&
            (getAbility(id)?.manaCost ?? 99) <= props.mana
          }
          selected={props.selected === id}
          disabled={props.disabled}
          onPick={() => props.onPick(id)}
        />
      ))}
    </div>
  );
}

function AbilitySlot(props: {
  abilityId: string;
  hotkey: string | null;
  affordable: boolean;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const a = getAbility(props.abilityId)!;
  const tipId = useId();
  const cost = `${a.focusCost} Focus${a.manaCost ? ` + ${a.manaCost} Mana` : ''}`;
  return (
    <div className="slot-wrap">
      <button
        type="button"
        className={`ability-slot school-${abilitySchool(a.id)}`}
        aria-pressed={props.selected}
        aria-label={`${a.name}, ${cost}`}
        aria-describedby={tipId}
        disabled={!props.affordable || props.disabled}
        onClick={props.onPick}
      >
        <span className="slot-frame">
          <AbilityIcon abilityId={a.id} />
          {props.hotkey && <kbd className="slot-key">{props.hotkey}</kbd>}
          <span className="slot-focus" aria-hidden>
            {a.focusCost}
          </span>
          {a.manaCost > 0 && (
            <span className="slot-mana" aria-hidden>
              {a.manaCost}
            </span>
          )}
        </span>
        <span className="slot-name">{a.name}</span>
        <span className="slot-fx">
          <AbilityEffects abilityId={a.id} />
        </span>
      </button>
      <div className="ability-tooltip" role="tooltip" id={tipId}>
        <div className={`tip-name school-${abilitySchool(a.id)}`}>{a.name}</div>
        <div className="tip-cost">
          <span className="tip-focus">{a.focusCost} Focus</span>
          {a.manaCost > 0 && <span className="tip-mana">{a.manaCost} Mana</span>}
          <span className="tip-target">{describeTargeting(a.targeting)}</span>
        </div>
        <AbilityEffects abilityId={a.id} />
        <ul className="tip-effects">
          {describeEffects(a).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="tip-desc">{a.description}</p>
        {Object.keys(a.scaling).length > 0 && (
          <div className="tip-scaling">Scales with {describeScaling(a.scaling)}</div>
        )}
        {!props.affordable && <div className="tip-warn">Not enough Focus or Mana</div>}
      </div>
    </div>
  );
}
