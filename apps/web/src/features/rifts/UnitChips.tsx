import { CHAMPION_AFFIXES, describeEffects, getAbility } from '@realms/game-core';
import type { CombatantView, IntentView } from '@realms/shared';
import { EffectIcon, StatusIcon, type EffectKind } from '../../shared/ui/EffectIcon';

/*
 * Per-unit chips shown over the combat canvas (DOM, so they keep tooltips):
 * enemy intents (what they will do this round, D36) and Block/statuses.
 * Placed by CombatStage from the same layout as the canvas.
 */

export function IntentChips({
  unit,
  nameOf,
}: {
  unit: CombatantView;
  nameOf: (id: string) => string;
}) {
  if (unit.downed || unit.intents.length === 0) return null;
  // Group identical actions (same ability and targets), e.g. three claws → "×3".
  const groups: Array<IntentView & { count: number }> = [];
  for (const it of unit.intents) {
    const same = groups.find(
      (g) => g.abilityId === it.abilityId && g.targetIds.join() === it.targetIds.join(),
    );
    if (same) same.count++;
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
        const names = it.targetIds.map(nameOf).join(', ');
        const targets =
          a.targeting.area === 'all'
            ? 'everyone'
            : a.targeting.area === 'column'
              ? `${it.column ?? ''} (${names})`
              : names;
        // Slay-the-Spire intents (request #44): one icon for what it will do.
        const kind: EffectKind = dmg
          ? dmg.damageType === 'magic'
            ? 'magic'
            : dmg.damageType === 'ranged'
              ? 'ranged'
              : 'attack'
          : a.effects.some((e) => e.kind === 'summon')
            ? 'summon'
            : a.effects.some((e) => e.kind === 'heal')
              ? 'heal'
              : a.effects.some((e) => e.kind === 'block')
                ? 'dodge'
                : a.targeting.side === 'enemy'
                  ? 'debuff'
                  : 'buff';
        const extra = dmg && a.effects.some((e) => e.kind === 'status');
        return (
          <span
            key={i}
            className="intent"
            data-kind={kind}
            title={`${a.name}${it.count > 1 ? ` ×${it.count}` : ''}: ${describeEffects(a).join(', ')} → ${targets}`}
          >
            <EffectIcon
              kind={kind}
              value={
                dmg
                  ? `${value}${it.count > 1 ? `×${it.count}` : ''}`
                  : it.count > 1
                    ? `×${it.count}`
                    : null
              }
              title={`${a.name}: ${describeEffects(a).join(', ')}`}
            />
            {extra && <EffectIcon kind="debuff" size="sm" title="Also applies a status" />}
            <em>→ {a.targeting.area === 'all' ? 'all' : (it.column ?? names)}</em>
          </span>
        );
      })}
    </div>
  );
}

/** Request #71: a Champion's affixes, as small labelled plates with their effect. */
export function AffixChips({ unit }: { unit: CombatantView }) {
  if (unit.downed || !unit.affixes?.length) return null;
  return (
    <span className="affixes" data-testid="affixes">
      {unit.affixes.map((id) => {
        const a = (CHAMPION_AFFIXES as Record<string, { name: string; description: string }>)[id];
        return a ? (
          <span key={id} className="affix-chip" title={`${a.name}: ${a.description}`}>
            {a.name}
          </span>
        ) : null;
      })}
    </span>
  );
}

export function StatusChips({ unit }: { unit: CombatantView }) {
  if (unit.downed || (unit.statuses.length === 0 && unit.block === 0)) return null;
  return (
    <span className="statuses" data-testid="statuses">
      {unit.block > 0 && (
        <EffectIcon
          kind="dodge"
          value={unit.block}
          title={`Dodge ${unit.block}: avoids that much damage until this unit's next turn`}
        />
      )}
      {unit.statuses.map((st) => (
        <StatusIcon key={st.id} id={st.id} value={st.value} turns={st.turns} />
      ))}
    </span>
  );
}
