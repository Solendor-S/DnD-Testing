/**
 * Character model + pure helpers. A Character produces the ModifierContext the
 * dice engine consumes, and resolves weapon attack/damage — the cross-reference
 * that ties characters to dice rolls.
 */
import type { AbilityId, ModifierContext } from './dice/types.js';
import { abilityMod } from './dice/modifiers.js';
import type { WeaponDef } from './srd-types.js';
import type { Coins, UnarmoredDefense } from './rules.js';
import type { GrantFeature } from './origins.js';
import type { Effect } from './effects.js';
import { saveBonusFromEffects } from './effects.js';

/** Selected origins (which race/subrace/background/subclass the character has). */
export interface OriginSelection {
  raceIndex: string | null;
  subraceIndex: string | null;
  backgroundIndex: string | null;
  subclassIndex: string | null;
}

/** Materialized benefits granted by the selected origins + resolved choices. */
export interface GrantedSnapshot {
  skills: string[];
  expertise: string[];
  /** Skill id → mastery level (1-3) from stacking duplicate skill picks. */
  skillMastery: Record<string, number>;
  languages: string[];
  toolProficiencies: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];
  saveProficiencies: AbilityId[];
  hpPerLevel: number;
  features: GrantFeature[];
  /** Active passive effects (already condition/level-evaluated). */
  effects: Effect[];
  speedBonus: number;
  initiativeBonus: number;
  passivePerceptionBonus: number;
}

export interface CharacterWeapon {
  id: string;
  name: string;
  source: 'srd' | 'custom';
  srdIndex?: string;
  ability: AbilityId;        // resolved attack/damage ability
  proficient: boolean;
  damageDice: string;        // e.g. "1d8"
  damageType?: string;
  versatileDice?: string;    // two-handed alt damage, if any
  properties?: string[];
}

/** A light reference to a known spell; the full SRD record is fetched on cast. */
export interface CharacterSpellRef {
  index: string;
  name: string;
  level: number;
}

export interface InventoryItem {
  id: string;
  qty: number;
  name: string;
  cost: string;   // free-form, e.g. "15 gp"
  weight: number; // lb
}

export interface Character {
  id: string;
  name: string;
  // Identity
  raceIndex: string | null;
  classIndex: string | null;
  level: number;
  background: string;
  alignment: string;
  xp: number;
  // Origins (auto-applied benefits) + the user's resolved choices
  origin: OriginSelection;
  choiceSelections: Record<string, string[]>; // key `${kind}:${index}:${choiceId}` → picked ids
  effectToggles: Record<string, boolean>;      // situational effect id → active
  grantedAbilityBonuses: { ability: AbilityId; bonus: number }[]; // materialized from origins
  granted: GrantedSnapshot;                                       // materialized from origins
  // Abilities & proficiencies (the MANUAL layer; effective = base/manual ∪ granted)
  abilities: Record<AbilityId, number>;
  skillProficiencies: string[];
  expertise: string[];
  saveProficiencies: AbilityId[];
  spellcastingAbility: AbilityId | null;
  languages: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  inspiration: boolean;
  // Combat stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  ac: number;
  armorIndex: string | null;
  shieldEquipped: boolean;
  unarmoredDefense: UnarmoredDefense;
  speed: number;
  hitDie: number;
  hitDiceRemaining: number;
  deathSaves: { successes: number; failures: number };
  // Content
  weapons: CharacterWeapon[];
  knownSpells: CharacterSpellRef[];
  spellSlotsUsed: number[]; // per spell level 1..9 (index 0 = 1st)
  inventory: InventoryItem[];
  coins: Coins;
  features: string[];
  // Flavor
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  allies: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CharacterSummary = Pick<Character, 'id' | 'name' | 'classIndex' | 'raceIndex' | 'level'>;

const EMPTY_COINS: Coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

const EMPTY_ORIGIN: OriginSelection = { raceIndex: null, subraceIndex: null, backgroundIndex: null, subclassIndex: null };

export function emptyGrantedSnapshot(): GrantedSnapshot {
  return {
    skills: [], expertise: [], skillMastery: {}, languages: [], toolProficiencies: [],
    weaponProficiencies: [], armorProficiencies: [], saveProficiencies: [],
    hpPerLevel: 0, features: [],
    effects: [], speedBonus: 0, initiativeBonus: 0, passivePerceptionBonus: 0,
  };
}

/**
 * Fill defaults for any missing field so older stored records (pre-expansion)
 * load cleanly. Applied when reading from user.db.
 */
export function normalizeCharacter(raw: Partial<Character> & { id: string; name: string }): Character {
  return {
    id: raw.id,
    name: raw.name,
    raceIndex: raw.raceIndex ?? null,
    classIndex: raw.classIndex ?? null,
    level: raw.level ?? 1,
    background: raw.background ?? '',
    alignment: raw.alignment ?? '',
    xp: raw.xp ?? 0,
    origin: raw.origin ?? { ...EMPTY_ORIGIN, raceIndex: raw.raceIndex ?? null },
    choiceSelections: raw.choiceSelections ?? {},
    effectToggles: raw.effectToggles ?? {},
    grantedAbilityBonuses: raw.grantedAbilityBonuses ?? [],
    granted: { ...emptyGrantedSnapshot(), ...raw.granted },
    abilities: raw.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: raw.skillProficiencies ?? [],
    expertise: raw.expertise ?? [],
    saveProficiencies: raw.saveProficiencies ?? [],
    spellcastingAbility: raw.spellcastingAbility ?? null,
    languages: raw.languages ?? [],
    armorProficiencies: raw.armorProficiencies ?? [],
    weaponProficiencies: raw.weaponProficiencies ?? [],
    toolProficiencies: raw.toolProficiencies ?? [],
    inspiration: raw.inspiration ?? false,
    maxHp: raw.maxHp ?? 1,
    currentHp: raw.currentHp ?? raw.maxHp ?? 1,
    tempHp: raw.tempHp ?? 0,
    ac: raw.ac ?? 10,
    armorIndex: raw.armorIndex ?? null,
    shieldEquipped: raw.shieldEquipped ?? false,
    unarmoredDefense: raw.unarmoredDefense ?? 'none',
    speed: raw.speed ?? 30,
    hitDie: raw.hitDie ?? 8,
    hitDiceRemaining: raw.hitDiceRemaining ?? (raw.level ?? 1),
    deathSaves: raw.deathSaves ?? { successes: 0, failures: 0 },
    weapons: raw.weapons ?? [],
    knownSpells: raw.knownSpells ?? [],
    spellSlotsUsed: raw.spellSlotsUsed ?? [0, 0, 0, 0, 0, 0, 0, 0, 0],
    inventory: normalizeInventory(raw.inventory),
    coins: raw.coins ?? { ...EMPTY_COINS },
    features: raw.features ?? [],
    personality: raw.personality ?? '',
    ideals: raw.ideals ?? '',
    bonds: raw.bonds ?? '',
    flaws: raw.flaws ?? '',
    backstory: raw.backstory ?? '',
    allies: raw.allies ?? '',
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

/** Old saves stored inventory as string[]; upgrade to InventoryItem[]. */
function normalizeInventory(inv: unknown): InventoryItem[] {
  if (!Array.isArray(inv)) return [];
  return inv.map((item, i) =>
    typeof item === 'string'
      ? { id: `legacy-${i}`, qty: 1, name: item, cost: '', weight: 0 }
      : (item as InventoryItem)
  );
}

/** D&D proficiency bonus by level: +2 at 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20. */
export function proficiencyBonusForLevel(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** Effective ability scores = base (assigned) + bonuses granted by origins. */
export function effectiveAbilities(c: Character): Record<AbilityId, number> {
  const out = { ...c.abilities };
  for (const { ability, bonus } of c.grantedAbilityBonuses) out[ability] += bonus;
  return out;
}

/** The character → dice modifier-context mapping. This is the integration seam.
 *  Uses effective abilities and unions the manual + origin-granted proficiencies. */
export function characterToModifierContext(c: Character): ModifierContext {
  const eff = effectiveAbilities(c);
  return {
    name: c.name,
    abilities: eff,
    proficiencyBonus: proficiencyBonusForLevel(c.level),
    skillProficiencies: uniq([...c.skillProficiencies, ...c.granted.skills]),
    expertise: uniq([...c.expertise, ...c.granted.expertise]),
    skillMastery: c.granted.skillMastery,
    saveProficiencies: uniq([...c.saveProficiencies, ...c.granted.saveProficiencies]),
    spellcastingAbility: c.spellcastingAbility,
    level: c.level,
    saveBonus: saveBonusFromEffects(c.granted.effects, eff),
    initiativeBonus: c.granted.initiativeBonus,
    passivePerceptionBonus: c.granted.passivePerceptionBonus,
  };
}

export function weaponAttackBonus(c: Character, w: CharacterWeapon): number {
  return abilityMod(effectiveAbilities(c)[w.ability]) + (w.proficient ? proficiencyBonusForLevel(c.level) : 0);
}

/** Damage expression for a weapon: dice + ability modifier (e.g. "1d8 + 3"). */
export function weaponDamageExpr(c: Character, w: CharacterWeapon, twoHanded = false): string {
  const dice = twoHanded && w.versatileDice ? w.versatileDice : w.damageDice;
  const mod = abilityMod(effectiveAbilities(c)[w.ability]);
  if (mod === 0) return dice;
  return `${dice} ${mod > 0 ? '+' : '-'} ${Math.abs(mod)}`;
}

/** Which ability a weapon attacks with: ranged → DEX; finesse → better of STR/DEX; else STR. */
export function resolveWeaponAbility(w: WeaponDef, abilities: Record<AbilityId, number>): AbilityId {
  if (w.range === 'Ranged') return 'dex';
  const finesse = w.properties?.includes('finesse');
  if (finesse) return abilities.dex >= abilities.str ? 'dex' : 'str';
  return 'str';
}

/** Build a CharacterWeapon from an SRD weapon definition + the character's abilities. */
export function weaponFromSrd(w: WeaponDef, abilities: Record<AbilityId, number>): Omit<CharacterWeapon, 'id'> {
  return {
    name: w.name,
    source: 'srd',
    srdIndex: w.index,
    ability: resolveWeaponAbility(w, abilities),
    proficient: true,
    damageDice: w.damageDice,
    damageType: w.damageType,
    versatileDice: w.versatileDice ?? undefined,
    properties: w.properties,
  };
}
