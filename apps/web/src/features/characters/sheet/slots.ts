import type { EquipSlot } from '@realms/shared';

export const SLOT_LABELS: Record<EquipSlot, string> = {
  mainHand: 'Main hand',
  offHand: 'Off hand',
  head: 'Head',
  body: 'Body',
  feet: 'Boots',
  ring1: 'Ring',
  ring2: 'Ring',
  pendant: 'Pendant',
};

/** Paper-doll layout: left and right of the character. */
export const LEFT_SLOTS: EquipSlot[] = ['head', 'pendant', 'body', 'feet'];
export const RIGHT_SLOTS: EquipSlot[] = ['mainHand', 'offHand', 'ring1', 'ring2'];
