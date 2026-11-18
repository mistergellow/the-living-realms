import { describeEffects, getAbility, STATUS_DESCRIPTIONS, STATUS_NAMES } from '@realms/game-core';
import type { CombatantView, IntentView } from '@realms/shared';

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
              ? `${it.column ?? ''} column (${names})`
              : names;
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

export function StatusChips({ unit }: { unit: CombatantView }) {
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
