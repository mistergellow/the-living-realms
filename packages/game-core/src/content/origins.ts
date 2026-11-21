/*
 * Country of origin (request #36). Chosen once, at character creation, like
 * the base attributes. It sets the character's native language; languages
 * affect communication in a later phase (nations, languages, diplomacy).
 * PROVISIONAL CONTENT: names are placeholders until the world lore exists.
 */

export interface OriginDef {
  id: string;
  name: string;
  description: string;
  /** Native language spoken by people from this country. */
  language: string;
}

const origin = (o: OriginDef) => o;

export const ORIGINS = {
  valdmark: origin({
    id: 'valdmark',
    name: 'Valdmark',
    description: 'A northern kingdom of fjords, iron mines and long winters.',
    language: 'Valdic',
  }),
  aurelian_league: origin({
    id: 'aurelian_league',
    name: 'Aurelian League',
    description: 'Wealthy merchant city-states along the warm southern coast.',
    language: 'Aurelian',
  }),
  sylvaran: origin({
    id: 'sylvaran',
    name: 'Sylvaran Wilds',
    description: 'Ancient forests ruled by druid circles and hunting clans.',
    language: 'Sylvan',
  }),
  khazdar: origin({
    id: 'khazdar',
    name: 'Khazdar Holds',
    description: 'Mountain holds of stonecutters, smiths and rune-carvers.',
    language: 'Khazdari',
  }),
  sareth: origin({
    id: 'sareth',
    name: 'Sareth Dominion',
    description: 'A desert empire of scholars, sun temples and old magic.',
    language: 'Sarethi',
  }),
} satisfies Record<string, OriginDef>;

export type OriginId = keyof typeof ORIGINS;
export const ORIGIN_IDS = Object.keys(ORIGINS) as OriginId[];

export function getOrigin(id: string | null | undefined): OriginDef | undefined {
  return id ? (ORIGINS as Record<string, OriginDef>)[id] : undefined;
}
