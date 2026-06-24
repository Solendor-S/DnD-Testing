/**
 * Pure D&D 5e rule tables & calculators (from the character sheet guide).
 * No I/O, no framework — used by the sheet, derived-stats panel, and dice.
 */
import type { AbilityId } from './dice/types.js';
import type { ArmorDef } from './srd-types.js';
import { abilityMod } from './dice/modifiers.js';
import type { Effect } from './effects.js';
import { bestUnarmoredAc, sumEffect } from './effects.js';

// ---------- XP thresholds (guide §1) ----------

/** Minimum XP to BE at each level (index 0 unused; [1..20]). */
export const XP_THRESHOLDS: number[] = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

/** XP required to reach the NEXT level above `level` (null at 20). */
export function xpThresholdForLevel(level: number): number | null {
  if (level >= 20) return null;
  return XP_THRESHOLDS[level + 1];
}

/** Highest level whose threshold is met by `xp`. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let l = 1; l <= 20; l++) if (xp >= XP_THRESHOLDS[l]) level = l;
  return level;
}

// ---------- Spell slots (guide §17, full casters) ----------

/** [level] → [1st..9th] slot counts. Index 0 unused. Full-caster progression. */
export const FULL_CASTER_SLOTS: number[][] = [
  [], // 0
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function spellSlotsForLevel(level: number): number[] {
  return FULL_CASTER_SLOTS[Math.max(1, Math.min(20, level))];
}

// ---------- Armour Class (guide §7) ----------

export type UnarmoredDefense = 'none' | 'barbarian' | 'monk';

export interface AcInput {
  armor: ArmorDef | null;
  dexMod: number;
  conMod: number;
  wisMod: number;
  shield: boolean;
  unarmored: UnarmoredDefense;
  /** Active passive effects (unarmored-ac formulas + ac bonuses). */
  effects?: Effect[];
  abilities?: Record<AbilityId, number>;
}

export function computeAc({ armor, dexMod, conMod, wisMod, shield, unarmored, effects, abilities }: AcInput): number {
  let ac: number;
  if (!armor || armor.category === 'Shield') {
    // Unarmored: 10 + DEX (+CON barbarian, +WIS monk), or a better formula from effects.
    ac = 10 + dexMod + (unarmored === 'barbarian' ? conMod : unarmored === 'monk' ? wisMod : 0);
    if (effects && abilities) {
      const best = bestUnarmoredAc(effects, abilities);
      if (best && best.ac > ac) ac = best.ac;
    }
  } else if (armor.category === 'Light') {
    ac = armor.base + dexMod;
  } else if (armor.category === 'Medium') {
    ac = armor.base + Math.min(dexMod, armor.maxBonus ?? 2);
  } else {
    ac = armor.base; // Heavy — no DEX
  }
  if (shield || armor?.category === 'Shield') ac += 2;
  if (effects) ac += sumEffect(effects, 'ac-bonus');
  return ac;
}

// ---------- Carrying capacity (guide §15) ----------

export function carryingCapacity(str: number): number {
  return str * 15;
}
export function encumberedAt(str: number): number {
  return str * 5;
}
export function heavilyEncumberedAt(str: number): number {
  return str * 10;
}

// ---------- Hit dice (guide §8) ----------

export const HIT_DIE_AVG: Record<number, number> = { 6: 4, 8: 5, 10: 6, 12: 7 };

/** Suggested max HP: max die at L1 + CON mod, average + CON each level after. */
export function suggestMaxHp(hitDie: number, level: number, conScore: number): number {
  const conMod = abilityMod(conScore);
  const avg = HIT_DIE_AVG[hitDie] ?? Math.floor(hitDie / 2) + 1;
  return Math.max(1, hitDie + conMod + (level - 1) * (avg + conMod));
}

// ---------- Coins (guide §16) ----------

export interface Coins { cp: number; sp: number; ep: number; gp: number; pp: number }

/** Total wealth expressed in gp. */
export function coinsToGp(c: Coins): number {
  return c.cp * 0.01 + c.sp * 0.1 + c.ep * 0.5 + c.gp + c.pp * 10;
}

export const ALIGNMENTS: string[] = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

export type { AbilityId };
