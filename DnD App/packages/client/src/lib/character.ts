import type { AbilityId, Character } from '@dnd/shared';
import { normalizeCharacter } from '@dnd/shared';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Spellcasting ability per SRD class (used for guided prefill). */
export const SPELLCASTING_ABILITY: Record<string, AbilityId> = {
  bard: 'cha', cleric: 'wis', druid: 'wis', paladin: 'cha', ranger: 'wis',
  sorcerer: 'cha', warlock: 'cha', wizard: 'int',
};

function newId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID ? g.crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function createBlankCharacter(): Character {
  return normalizeCharacter({ id: newId(), name: 'New Character' });
}

export function newItemId(): string {
  return newId();
}

/** "STR" | "Dexterity" → 'str' | 'dex'. SRD ability names come through as 3-letter codes. */
export function abilityNameToId(name: string): AbilityId | null {
  const id = name.trim().slice(0, 3).toLowerCase();
  return (['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).includes(id as AbilityId)
    ? (id as AbilityId)
    : null;
}

export function newWeaponId(): string {
  return newId();
}
