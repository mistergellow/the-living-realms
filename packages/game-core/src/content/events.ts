import type { AttributeKey } from '@realms/shared';
import type { ConditionId } from './rooms.js';

/*
 * Random Events (request #31). Data only — no event is hard-coded in the
 * engine. Each approach may test one attribute: roll + BASE attribute
 * (never equipment or buffs) against its difficulty. PROVISIONAL CONTENT.
 *
 * Targets: 'tester' = the character who attempted the approach; 'party' =
 * everyone still in the run.
 */

export type EventTarget = 'tester' | 'party';

export type EventEffect =
  /** Percent of max HP: positive heals, negative hurts (never below 1 HP). */
  | { kind: 'hp'; target: EventTarget; percent: number }
  | { kind: 'mana'; target: EventTarget; percent: number }
  | { kind: 'condition'; target: EventTarget; condition: ConditionId }
  | { kind: 'removeDebuffs'; target: EventTarget }
  /** Items from the Rift's loot table ('loot') or secret table ('secret'). */
  | { kind: 'item'; target: EventTarget; table: 'loot' | 'secret' }
  /** Reveals a secret room next to this one (if the map has room for it). */
  | { kind: 'revealSecret' };

export interface EventOutcome {
  text: string;
  effects: EventEffect[];
}

export interface EventApproach {
  id: string;
  label: string;
  description: string;
  /** null = no test (always "succeeds"). */
  attribute: AttributeKey | null;
  difficulty: number | null;
  success: EventOutcome;
  failure?: EventOutcome;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  approaches: EventApproach[];
}

const event = (e: EventDef) => e;
const LEAVE: EventApproach = {
  id: 'leave',
  label: 'Move on',
  description: 'Leave it alone.',
  attribute: null,
  difficulty: null,
  success: { text: 'You leave it be and press on.', effects: [] },
};

export const EVENTS = {
  ancient_sealed_door: event({
    id: 'ancient_sealed_door',
    title: 'Ancient Sealed Door',
    text: 'A door of black stone, covered in faded runes, blocks a side passage.',
    approaches: [
      {
        id: 'force',
        label: 'Force it open',
        description: 'Throw your weight against the stone.',
        attribute: 'might',
        difficulty: 14,
        success: {
          text: 'The door grinds open, revealing a hidden chamber.',
          effects: [{ kind: 'revealSecret' }],
        },
        failure: {
          text: 'The door does not move, and your shoulder pays for it.',
          effects: [{ kind: 'hp', target: 'tester', percent: -15 }],
        },
      },
      {
        id: 'runes',
        label: 'Read the runes',
        description: 'Understand the magical seal.',
        attribute: 'intellect',
        difficulty: 13,
        success: {
          text: 'The runes fade one by one. The way is open.',
          effects: [{ kind: 'revealSecret' }],
        },
        failure: {
          text: 'A rune flares and burns its mark into you.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'cursed' }],
        },
      },
      {
        id: 'mechanism',
        label: 'Find the mechanism',
        description: 'Search the frame for a hidden lever.',
        attribute: 'precision',
        difficulty: 12,
        success: {
          text: 'A loose stone gives way: the door swings open.',
          effects: [{ kind: 'revealSecret' }],
        },
        failure: {
          text: 'Nothing but dust and wasted time.',
          effects: [{ kind: 'mana', target: 'tester', percent: -20 }],
        },
      },
      {
        id: 'around',
        label: 'Look for another way',
        description: 'Squeeze through a crack in the wall.',
        attribute: 'agility',
        difficulty: 13,
        success: {
          text: 'You slip through and find a small cache.',
          effects: [{ kind: 'item', target: 'tester', table: 'loot' }],
        },
        failure: {
          text: 'The crack narrows and scrapes you raw.',
          effects: [{ kind: 'hp', target: 'tester', percent: -10 }],
        },
      },
      LEAVE,
    ],
  }),
  whispering_idol: event({
    id: 'whispering_idol',
    title: 'Whispering Idol',
    text: 'A small idol whispers promises in a voice only you can hear.',
    approaches: [
      {
        id: 'resist',
        label: 'Resist its voice',
        description: 'Hold your mind steady and silence it.',
        attribute: 'will',
        difficulty: 13,
        success: {
          text: 'The whispers break. Your resolve hardens your companions too.',
          effects: [{ kind: 'condition', target: 'party', condition: 'inspired' }],
        },
        failure: {
          text: 'The voice gets under everyone’s skin.',
          effects: [{ kind: 'condition', target: 'party', condition: 'shaken' }],
        },
      },
      {
        id: 'study',
        label: 'Study the idol',
        description: 'Decipher the symbols carved on it.',
        attribute: 'intellect',
        difficulty: 14,
        success: {
          text: 'You unlock a hidden compartment.',
          effects: [{ kind: 'item', target: 'tester', table: 'secret' }],
        },
        failure: {
          text: 'The idol drinks your magic.',
          effects: [{ kind: 'mana', target: 'tester', percent: -40 }],
        },
      },
      LEAVE,
    ],
  }),
  collapsed_bridge: event({
    id: 'collapsed_bridge',
    title: 'Collapsed Bridge',
    text: 'The bridge ahead is broken. The gap is narrow, but the fall is long.',
    approaches: [
      {
        id: 'jump',
        label: 'Jump the gap',
        description: 'One quick leap.',
        attribute: 'agility',
        difficulty: 12,
        success: { text: 'A clean landing.', effects: [] },
        failure: {
          text: 'You catch the edge, but not before a nasty fall.',
          effects: [{ kind: 'hp', target: 'tester', percent: -20 }],
        },
      },
      {
        id: 'brace',
        label: 'Brace a beam across',
        description: 'Haul a fallen beam over the gap.',
        attribute: 'might',
        difficulty: 13,
        success: { text: 'The beam holds. Everyone crosses safely.', effects: [] },
        failure: {
          text: 'The beam slips; it takes everything you have to hold it.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'exhausted' }],
        },
      },
      {
        id: 'climb',
        label: 'Climb down and around',
        description: 'Slow and tiring, but safe.',
        attribute: null,
        difficulty: null,
        success: {
          text: 'The long climb wears everyone down.',
          effects: [{ kind: 'hp', target: 'party', percent: -8 }],
        },
      },
    ],
  }),
  toxic_mist: event({
    id: 'toxic_mist',
    title: 'Toxic Mist',
    text: 'A green mist fills the passage. Something glints on the floor inside.',
    approaches: [
      {
        id: 'push',
        label: 'Hold your breath and push through',
        description: 'Grab what glints and get out.',
        attribute: 'endurance',
        difficulty: 13,
        success: {
          text: 'You come out coughing, but with a prize.',
          effects: [{ kind: 'item', target: 'tester', table: 'loot' }],
        },
        failure: {
          text: 'The mist gets into your lungs.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'poisoned' }],
        },
      },
      {
        id: 'purge',
        label: 'Purge it with magic',
        description: 'Burn the mist away.',
        attribute: 'intellect',
        difficulty: 12,
        success: {
          text: 'The mist burns away, and its lingering ills with it.',
          effects: [{ kind: 'removeDebuffs', target: 'party' }],
        },
        failure: {
          text: 'The spell sputters and drains you.',
          effects: [{ kind: 'mana', target: 'tester', percent: -30 }],
        },
      },
      {
        id: 'wait',
        label: 'Wait for it to clear',
        description: 'Safe, but the waiting is draining.',
        attribute: null,
        difficulty: null,
        success: {
          text: 'The mist clears in time. Everyone feels drained.',
          effects: [{ kind: 'mana', target: 'party', percent: -15 }],
        },
      },
    ],
  }),
  trapped_corridor: event({
    id: 'trapped_corridor',
    title: 'Trapped Corridor',
    text: 'Pressure plates, dart holes and old bloodstains line the corridor.',
    approaches: [
      {
        id: 'dodge',
        label: 'Dash through',
        description: 'Avoid the traps by speed alone.',
        attribute: 'agility',
        difficulty: 13,
        success: { text: 'Darts whistle past, missing every time.', effects: [] },
        failure: {
          text: 'A dart finds its mark.',
          effects: [{ kind: 'hp', target: 'tester', percent: -15 }],
        },
      },
      {
        id: 'disarm',
        label: 'Disarm the traps',
        description: 'Spot the mechanisms and jam them.',
        attribute: 'precision',
        difficulty: 12,
        success: {
          text: 'Disarmed — and a hidden stash of trap parts and coin.',
          effects: [{ kind: 'item', target: 'tester', table: 'loot' }],
        },
        failure: {
          text: 'A plate clicks under your hand.',
          effects: [{ kind: 'hp', target: 'tester', percent: -10 }],
        },
      },
      {
        id: 'tank',
        label: 'Shield the others',
        description: 'Take the hits so the others pass unharmed.',
        attribute: 'endurance',
        difficulty: 14,
        success: {
          text: 'The darts bounce off. Your companions walk behind you, guarded.',
          effects: [{ kind: 'condition', target: 'party', condition: 'warded' }],
        },
        failure: {
          text: 'You take the volley. It hurts.',
          effects: [{ kind: 'hp', target: 'tester', percent: -25 }],
        },
      },
    ],
  }),
  echoing_glyphs: event({
    id: 'echoing_glyphs',
    title: 'Echoing Glyphs',
    text: 'Glyphs pulse on the walls, echoing a pattern that feels almost alive.',
    approaches: [
      {
        id: 'read',
        label: 'Decipher the pattern',
        description: 'The glyphs might point somewhere.',
        attribute: 'intellect',
        difficulty: 13,
        success: {
          text: 'The pattern resolves into directions to a hidden room.',
          effects: [{ kind: 'revealSecret' }],
        },
        failure: {
          text: 'The echo fills your head.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'shaken' }],
        },
      },
      {
        id: 'listen',
        label: 'Listen in silence',
        description: 'Let the echo wash over you.',
        attribute: 'will',
        difficulty: 12,
        success: {
          text: 'A calm settles over the group.',
          effects: [
            { kind: 'removeDebuffs', target: 'party' },
            { kind: 'mana', target: 'party', percent: 20 },
          ],
        },
        failure: {
          text: 'The echo turns into a scream.',
          effects: [{ kind: 'condition', target: 'party', condition: 'shaken' }],
        },
      },
      LEAVE,
    ],
  }),
  fallen_adventurer: event({
    id: 'fallen_adventurer',
    title: 'Fallen Adventurer',
    text: 'An adventurer lies still against the wall, their pack still on their back.',
    approaches: [
      {
        id: 'search',
        label: 'Search the pack',
        description: 'Carefully — it might be trapped.',
        attribute: 'precision',
        difficulty: 11,
        success: {
          text: 'You find something useful.',
          effects: [{ kind: 'item', target: 'tester', table: 'loot' }],
        },
        failure: {
          text: 'A needle trap pricks your finger.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'poisoned' }],
        },
      },
      {
        id: 'pray',
        label: 'Say a prayer',
        description: 'Honour the dead.',
        attribute: 'will',
        difficulty: 13,
        success: {
          text: 'A gentle warmth fills the group.',
          effects: [{ kind: 'hp', target: 'party', percent: 15 }],
        },
        failure: {
          text: 'Something answers the prayer, and it is not kind.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'cursed' }],
        },
      },
      LEAVE,
    ],
  }),
  rift_spring: event({
    id: 'rift_spring',
    title: 'Rift Spring',
    text: 'A pool of shimmering water. It might heal you — or it might not be water.',
    approaches: [
      {
        id: 'drink',
        label: 'Drink deeply',
        description: 'Trust your body to handle it.',
        attribute: 'endurance',
        difficulty: 12,
        success: {
          text: 'Strength floods back into you.',
          effects: [
            { kind: 'hp', target: 'tester', percent: 35 },
            { kind: 'mana', target: 'tester', percent: 35 },
          ],
        },
        failure: {
          text: 'Your stomach turns. The water was tainted.',
          effects: [{ kind: 'condition', target: 'tester', condition: 'exhausted' }],
        },
      },
      {
        id: 'analyse',
        label: 'Study the water first',
        description: 'Work out what it really is.',
        attribute: 'intellect',
        difficulty: 13,
        success: {
          text: 'It is safe: everyone drinks a little.',
          effects: [{ kind: 'hp', target: 'party', percent: 15 }],
        },
        failure: { text: 'You cannot tell. Better not risk it.', effects: [] },
      },
      LEAVE,
    ],
  }),
} satisfies Record<string, EventDef>;

export type EventId = keyof typeof EVENTS;

export function getEvent(id: string): EventDef | undefined {
  return (EVENTS as Record<string, EventDef>)[id];
}
