/**
 * Curated passive-stat effects, keyed by class index, subclass index, or
 * race/subrace index. High-value PHB seed — extending is one entry. Active/
 * situational abilities are intentionally NOT here (shown as text instead).
 */
import type { Effect } from './effects.js';

export const EFFECTS: Record<string, Effect[]> = {
  // ----- Subclasses -----
  'sorcerer:draconic-bloodline': [
    {
      id: 'draconic-resilience-ac', source: 'Draconic Resilience',
      desc: 'While not wearing armor, your AC equals 13 + your Dexterity modifier.',
      kind: 'unarmored-ac', condition: 'unarmored', acBase: 13, acAdds: ['dex'],
    },
  ],

  // ----- Classes -----
  barbarian: [
    {
      id: 'barbarian-unarmored-defense', source: 'Unarmored Defense',
      desc: 'While not wearing armor, your AC equals 10 + DEX + CON.',
      kind: 'unarmored-ac', condition: 'unarmored', acBase: 10, acAdds: ['dex', 'con'],
    },
    {
      id: 'barbarian-fast-movement', source: 'Fast Movement',
      desc: '+10 ft speed while not wearing heavy armor (10th level: applies in all armor).',
      kind: 'speed-bonus', condition: 'toggle', minLevel: 5, value: 10,
    },
  ],
  monk: [
    {
      id: 'monk-unarmored-defense', source: 'Unarmored Defense',
      desc: 'While not wearing armor or a shield, your AC equals 10 + DEX + WIS.',
      kind: 'unarmored-ac', condition: 'unarmored', acBase: 10, acAdds: ['dex', 'wis'],
    },
    {
      id: 'monk-unarmored-movement', source: 'Unarmored Movement',
      desc: '+10 ft speed while not wearing armor or a shield (scales with level).',
      kind: 'speed-bonus', condition: 'unarmored', minLevel: 2, value: 10,
    },
  ],
  paladin: [
    {
      id: 'paladin-aura-of-protection', source: 'Aura of Protection',
      desc: 'You and friendly creatures within 10 ft gain a bonus to saving throws equal to your CHA modifier.',
      kind: 'save-bonus', condition: 'always', minLevel: 6, fromAbility: 'cha', saves: 'all',
    },
  ],
};

export function effectsForKeys(keys: (string | null | undefined)[]): Effect[] {
  const out: Effect[] = [];
  for (const k of keys) if (k && EFFECTS[k]) out.push(...EFFECTS[k]);
  return out;
}
