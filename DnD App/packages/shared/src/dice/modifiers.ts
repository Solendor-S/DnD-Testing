/**
 * Derivation of D&D 5e modifiers from a ModifierContext. Single source of truth
 * for ability modifiers, skill/save bonuses, and spellcasting numbers — used by
 * the roll builders, the client UI, and (later) character sheets.
 */
import type { AbilityId, ModifierContext } from './types.js';

export interface SkillDef {
  id: string;       // SRD index, e.g. "sleight-of-hand"
  name: string;
  ability: AbilityId;
}

export const SKILLS: SkillDef[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
];

export const SKILL_ABILITY: Record<string, AbilityId> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.ability])
);

export const ABILITY_NAMES: Record<AbilityId, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

/** D&D ability modifier: floor((score - 10) / 2). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Proficiency-bonus multiplier for a skill: 0 none, 1 proficient, 2 expertise,
 *  and 1+mastery (mastery level adds further bonuses: lvl1=2, lvl2=3, lvl3=4). */
export function skillProficiencyMultiplier(ctx: ModifierContext, skillId: string): number {
  let mult = ctx.skillProficiencies.includes(skillId) ? 1 : 0;
  if (ctx.expertise?.includes(skillId)) mult = Math.max(mult, 2);
  const mastery = ctx.skillMastery?.[skillId] ?? 0;
  if (mastery > 0) mult = Math.max(mult, 1 + mastery);
  return mult;
}

export function skillModifier(ctx: ModifierContext, skillId: string): number {
  const base = abilityMod(ctx.abilities[SKILL_ABILITY[skillId]]);
  return base + ctx.proficiencyBonus * skillProficiencyMultiplier(ctx, skillId);
}

export function saveModifier(ctx: ModifierContext, ability: AbilityId): number {
  return abilityMod(ctx.abilities[ability])
    + (ctx.saveProficiencies.includes(ability) ? ctx.proficiencyBonus : 0)
    + (ctx.saveBonus?.[ability] ?? 0);
}

/** Passive Perception = 10 + Perception skill total (guide §5) + any passive bonus. */
export function passivePerception(ctx: ModifierContext): number {
  return 10 + skillModifier(ctx, 'perception') + (ctx.passivePerceptionBonus ?? 0);
}

export function initiativeModifier(ctx: ModifierContext): number {
  return abilityMod(ctx.abilities.dex) + (ctx.initiativeBonus ?? 0);
}

/** Modifier from the spellcasting ability (0 if none set). */
export function spellAbilityMod(ctx: ModifierContext): number {
  return ctx.spellcastingAbility ? abilityMod(ctx.abilities[ctx.spellcastingAbility]) : 0;
}

export function spellAttackBonus(ctx: ModifierContext): number {
  return ctx.proficiencyBonus + spellAbilityMod(ctx);
}

export function spellSaveDC(ctx: ModifierContext): number {
  return 8 + ctx.proficiencyBonus + spellAbilityMod(ctx);
}
