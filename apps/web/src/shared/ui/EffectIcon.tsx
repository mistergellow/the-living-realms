import { getAbility, STATUS_DESCRIPTIONS, STATUS_NAMES, type AbilityDef } from '@realms/game-core';
import type { StatusId } from '@realms/shared';
import './effect-icons.css';

/*
 * Effect icons (request #44), Slay-the-Spire style: every status, intent and
 * ability effect has a small coloured icon with its number in a corner and a
 * tooltip. PLACEHOLDER art drawn in code (24×24 SVG paths).
 */

export type EffectKind =
  | StatusId
  | 'attack'
  | 'ranged'
  | 'magic'
  | 'dodge'
  | 'heal'
  | 'summon'
  | 'swap'
  | 'buff'
  | 'debuff';

const ICONS: Record<EffectKind, { color: string; path: string; label: string }> = {
  attack: {
    color: '#e8e2d0',
    label: 'Attack',
    path: 'M14.5 3H21v6.5L9 21.5 2.5 15 14.5 3ZM5 13l6 6M3 21l3-3',
  },
  ranged: {
    color: '#b5e08a',
    label: 'Ranged attack',
    path: 'M3 21 19 5M14 5h5v5M3 21l2-6 4 4-6 2Z',
  },
  magic: {
    color: '#c7a6ff',
    label: 'Magic attack',
    path: 'M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z',
  },
  dodge: {
    color: '#7fb2ff',
    label: 'Dodge',
    path: 'M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5l8-3Z',
  },
  heal: {
    color: '#6fe0a2',
    label: 'Heal',
    path: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11ZM12 9v6M9 12h6',
  },
  summon: {
    color: '#f0c674',
    label: 'Summon',
    path: 'M12 3c4 0 7 5 7 10a7 7 0 0 1-14 0c0-5 3-10 7-10Zm-3 9 2 2 4-4',
  },
  swap: { color: '#cfd6e0', label: 'Move', path: 'M4 8h13l-3-3M20 16H7l3 3' },
  buff: { color: '#ffd166', label: 'Buff', path: 'M12 3l7 8h-4v9H9v-9H5l7-8Z' },
  debuff: { color: '#ff8fa3', label: 'Debuff', path: 'M12 21l-7-8h4V4h6v9h4l-7 8Z' },
  bleed: {
    color: '#ff5d73',
    label: 'Bleed',
    path: 'M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z',
  },
  burn: {
    color: '#ff9b3d',
    label: 'Burn',
    path: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 4 3 4-1-3 0-7 0-10Z',
  },
  mark: {
    color: '#ffd166',
    label: 'Marked',
    path: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
  },
  weaken: {
    color: '#a891e6',
    label: 'Weakened',
    path: 'M14.5 3H21v6.5l-4 4M11 13l-2 2 3.5 3.5M9 21.5 2.5 15M4 20l16-16',
  },
  stun: {
    color: '#fff1a8',
    label: 'Stunned',
    path: 'M12 4l1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4L7 7.5l3.5-.5L12 4ZM4 18c3-3 13-3 16 0',
  },
  strength: {
    color: '#ff6b4a',
    label: 'Strength',
    path: 'M7 20V11l-3 2V8l6-4h3v6h4a3 3 0 0 1 0 6h-4v4H7Z',
  },
  thorns: {
    color: '#8fd16a',
    label: 'Thorns',
    path: 'M3 20 12 4l9 16H3Zm4-3 1-3M12 17v-4M17 17l-1-3',
  },
  intangible: {
    color: '#bfe8ff',
    label: 'Intangible',
    path: 'M12 3a7 7 0 0 1 7 7v11l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2L5 21V10a7 7 0 0 1 7-7Zm-3 7h.01M15 10h.01',
  },
  ritual: {
    color: '#d06bff',
    label: 'Ritual',
    path: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 3-4.5 11h9L12 6Zm0 0v15',
  },
  regen: {
    color: '#6fe0a2',
    label: 'Regeneration',
    path: 'M12 3c4 4 7 7 7 11a7 7 0 0 1-14 0c0-4 3-7 7-11Zm0 7v7M8.5 13.5h7',
  },
  fuse: {
    color: '#ff5d5d',
    label: 'Fuse',
    path: 'M10 8a7 7 0 1 1-1 .1M14 7l3-3M17 4l2 1M18 2v2',
  },
};

export function EffectIcon({
  kind,
  value,
  turns,
  title,
  size = 'md',
}: {
  kind: EffectKind;
  /** Big number (amount, damage…), bottom-right. */
  value?: number | string | null;
  /** Rounds left, top-right (statuses). */
  turns?: number | null;
  title?: string;
  size?: 'sm' | 'md';
}) {
  const icon = ICONS[kind];
  const label = title ?? icon.label;
  return (
    <span
      className={`fx-icon fx-${size}`}
      style={{ ['--fx' as string]: icon.color }}
      title={label}
      aria-label={label}
      role="img"
      data-effect={kind}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d={icon.path} />
      </svg>
      {value !== undefined && value !== null && value !== 0 && value !== '' && (
        <b className="fx-value">{value}</b>
      )}
      {turns !== undefined && turns !== null && turns < 99 && turns > 0 && (
        <i className="fx-turns">{turns}</i>
      )}
    </span>
  );
}

/** A unit's status as an icon with its value and rounds left. */
export function StatusIcon({ id, value, turns }: { id: StatusId; value: number; turns: number }) {
  const lasting = turns >= 99 ? '' : ` · ${turns} round${turns > 1 ? 's' : ''} left`;
  return (
    <EffectIcon
      kind={id}
      value={value || null}
      turns={turns}
      title={`${STATUS_NAMES[id]}${value ? ` ${value}` : ''}: ${STATUS_DESCRIPTIONS[id]}${lasting}`}
    />
  );
}

/** Icons for everything an ability does (damage, Dodge, heal, statuses, summons). */
export function abilityEffectIcons(a: AbilityDef, power = 1) {
  return a.effects.flatMap((e, i) => {
    const key = `${a.id}-${i}`;
    switch (e.kind) {
      case 'damage': {
        const kind =
          e.damageType === 'magic' ? 'magic' : e.damageType === 'ranged' ? 'ranged' : 'attack';
        const v = `${Math.round(e.min * power)}–${Math.round(e.max * power)}`;
        return [
          <EffectIcon
            key={key}
            kind={kind}
            value={v}
            title={`${v} ${e.damageType} damage${e.drain ? ', heals for the damage dealt' : ''}`}
          />,
        ];
      }
      case 'block':
        return [
          <EffectIcon key={key} kind="dodge" value={e.min} title={`Dodge ${e.min}–${e.max}`} />,
        ];
      case 'heal':
        return [
          <EffectIcon key={key} kind="heal" value={e.min} title={`Heal ${e.min}–${e.max}`} />,
        ];
      case 'status':
        return [
          <EffectIcon
            key={key}
            kind={e.status}
            value={e.value ?? null}
            turns={e.turns}
            title={`${STATUS_NAMES[e.status]}${e.value ? ` ${e.value}` : ''}${e.turns < 99 ? ` for ${e.turns} round${e.turns > 1 ? 's' : ''}` : ''}: ${STATUS_DESCRIPTIONS[e.status]}`}
          />,
        ];
      case 'summon':
        return [
          <EffectIcon key={key} kind="summon" title={`Summons ${e.enemy.replace(/_/g, ' ')}`} />,
        ];
      case 'swap':
        return [<EffectIcon key={key} kind="swap" />];
      case 'cleanse':
        return [
          <EffectIcon
            key={key}
            kind="buff"
            title={
              e.statuses
                ? `Removes ${e.statuses.map((x) => STATUS_NAMES[x]).join(', ')}`
                : 'Removes harmful statuses'
            }
          />,
        ];
    }
  });
}

/** The row of effect icons for an ability id (used on powers and tooltips). */
export function AbilityEffects({ abilityId, power = 1 }: { abilityId: string; power?: number }) {
  const a = getAbility(abilityId);
  if (!a) return null;
  return <span className="fx-row">{abilityEffectIcons(a, power)}</span>;
}
