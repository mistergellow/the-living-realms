import { ATTRIBUTE_NAMES, STATUS_NAMES } from '@realms/game-core';
import type { ReactNode } from 'react';

/*
 * Request #59: tooltips colour what matters — values (numbers, ranges,
 * percentages) and keywords (attributes, statuses, damage types, resources)
 * — so a player can read them at a glance. Use <Rich text="…" /> for any
 * game text shown in a tooltip.
 */

type Kind = 'attr' | 'status' | 'physical' | 'magic' | 'ranged' | 'focus' | 'mana' | 'hp' | 'res';

const KEYWORDS: Array<[string, Kind]> = [
  ...Object.values(ATTRIBUTE_NAMES).map((n) => [n, 'attr'] as [string, Kind]),
  ...Object.values(STATUS_NAMES).map((n) => [n, 'status'] as [string, Kind]),
  ['physical', 'physical'],
  ['magic', 'magic'],
  ['magical', 'magic'],
  ['Focus', 'focus'],
  ['Mana', 'mana'],
  ['HP', 'hp'],
  ['health', 'hp'],
  ['Health', 'hp'],
  ['Dodge', 'res'],
  ['Armor', 'res'],
  ['AP', 'res'],
  ['Mastery', 'res'],
];
const kindOf = new Map(KEYWORDS.map(([w, k]) => [w.toLowerCase(), k]));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const words = [...new Set(KEYWORDS.map(([w]) => w))].sort((a, b) => b.length - a.length);
/** Numbers (with sign, range, decimals, %, ×) or a keyword as a whole word. */
const TOKEN = new RegExp(
  `([+−\\-×]?\\d+(?:[.,]\\d+)?(?:\\s?[–-]\\s?\\d+(?:[.,]\\d+)?)?\\s?%?)|\\b(${words.map(escape).join('|')})\\b`,
  'g',
);

export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[1])
      out.push(
        <b key={n++} className="v">
          {m[1]}
        </b>,
      );
    else
      out.push(
        <span key={n++} className={`kw kw-${kindOf.get(m[2]!.toLowerCase()) ?? 'res'}`}>
          {m[2]}
        </span>,
      );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
