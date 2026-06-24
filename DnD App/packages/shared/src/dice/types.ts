/**
 * Core dice types, shared by the client (local rolling now) and the server
 * (authoritative rolling later). Pure data — no framework, no I/O.
 */

export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type Advantage = 'normal' | 'advantage' | 'disadvantage';

export type RollType =
  | 'raw'
  | 'check'
  | 'save'
  | 'attack'
  | 'damage'
  | 'spell-attack'
  | 'spell-save'
  | 'spell-damage'
  | 'heal'
  | 'initiative'
  | 'death-save';

/** A pluggable random source: returns a float in [0, 1). Injectable for tests/server seeding. */
export type Rng = () => number;

/** The modifier source for structured rolls. Supplied by the Active Stats panel now,
 *  by a selected character later — the engine doesn't care which. */
export interface ModifierContext {
  name?: string;
  abilities: Record<AbilityId, number>;
  proficiencyBonus: number;
  /** Skill ids (kebab-case, e.g. "stealth") the subject is proficient in. */
  skillProficiencies: string[];
  /** Skill ids with Expertise (double proficiency bonus). Subset of skillProficiencies. */
  expertise?: string[];
  /** Skill id → mastery level (1-3). Each level adds another proficiency bonus
   *  (level 1 == Expertise). Stacks beyond expertise; capped at 3 by the UI. */
  skillMastery?: Record<string, number>;
  saveProficiencies: AbilityId[];
  spellcastingAbility: AbilityId | null;
  /** Character level — used for cantrip damage scaling. Defaults to 1. */
  level?: number;
  /** Flat bonuses from passive effects (e.g. Paladin aura → all saves). */
  saveBonus?: Partial<Record<AbilityId, number>>;
  initiativeBonus?: number;
  passivePerceptionBonus?: number;
}

/** One group of like-sided dice within an expression (e.g. the "8d6" of a fireball). */
export interface DieGroup {
  sides: number;
  count: number;
  rolls: number[];
  /** Parallel to `rolls`: whether each die counts toward the total (false = dropped). */
  kept: boolean[];
}

/** The result of evaluating an expression or a structured roll. */
export interface RollResult {
  id: string;
  label: string;
  rollType: RollType;
  /** Normalized expression actually rolled, e.g. "2d20kh1 + 5". */
  expression: string;
  groups: DieGroup[];
  /** Sum of flat numeric modifiers/constants. */
  modifier: number;
  total: number;
  /** Natural 20 on a single d20 roll (attack/check). */
  crit?: boolean;
  /** Natural 1 on a single d20 roll. */
  fumble?: boolean;
  /** For save-based effects: the DC the target must beat, and what success means. */
  saveDc?: { ability: AbilityId; dc: number; onSuccess: string };
  rolledAt: string;
}
