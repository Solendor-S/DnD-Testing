/**
 * Types for the static SRD reference data, as stored in the bundled `srd.db`
 * and returned across the Electron IPC bridge (`window.srdApi`).
 *
 * NOTE: the `*Summary` types are the lightweight list-row shapes (what the seed
 * script materialises into dedicated columns for fast filtering/search). The
 * full detail types carry the complete record, parsed from the `data` JSON blob.
 */

export type RulesCategory = 'spells' | 'monsters' | 'classes' | 'races';

export type MagicSchool =
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation';

// ---------- Spells ----------

export interface SpellSummary {
  index: string;
  name: string;
  level: number; // 0 = cantrip
  school: string;
  concentration: boolean;
  ritual: boolean;
}

export interface SpellDetail extends SpellSummary {
  classes: string[]; // only needed in the detail view, not the list
  castingTime: string;
  range: string;
  components: string[]; // ["V","S","M"]
  material: string | null;
  duration: string;
  desc: string; // joined paragraphs
  higherLevel: string | null;
  damageType: string | null;
  // Rollable fields — consumed by the dice engine's castSpell().
  attackType: 'ranged' | 'melee' | null;
  dc: { ability: string; success: string } | null;
  damageBySlot: Record<string, string> | null;
  damageByCharLevel: Record<string, string> | null;
  healBySlot: Record<string, string> | null;
}

export interface SpellQuery {
  query?: string;
  level?: number | null;
  school?: string | null;
  className?: string | null;
  concentration?: boolean | null;
  ritual?: boolean | null;
}

// ---------- Monsters ----------

export interface MonsterSummary {
  index: string;
  name: string;
  type: string;
  size: string;
  cr: number;
  hp: number;
  ac: number;
  alignment: string;
}

export interface MonsterDetail extends MonsterSummary {
  subtype: string | null;
  speed: Record<string, string>;
  abilityScores: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  proficiencyBonus: number;
  xp: number;
  senses: Record<string, unknown>;
  languages: string;
  damageVulnerabilities: string[];
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  specialAbilities: NamedDescription[];
  actions: NamedDescription[];
  legendaryActions: NamedDescription[];
}

export interface NamedDescription {
  name: string;
  desc: string;
  [key: string]: unknown;
}

export interface MonsterQuery {
  query?: string;
  type?: string | null;
  size?: string | null;
  crMin?: number | null;
  crMax?: number | null;
}

// ---------- Classes ----------

export interface ClassSummary {
  index: string;
  name: string;
  hitDie: number;
}

export interface StartingEquipmentEntry {
  name: string;
  quantity: number;
}

export interface ClassDetail extends ClassSummary {
  savingThrows: string[];
  proficiencies: string[];
  subclasses: string[];
  startingEquipment: StartingEquipmentEntry[];
}

// ---------- Races ----------

export interface RaceSummary {
  index: string;
  name: string;
  size: string;
  speed: number;
}

export interface RaceDetail extends RaceSummary {
  abilityBonuses: { ability: string; bonus: number }[];
  alignment: string;
  age: string;
  sizeDescription: string;
  languageDesc: string;
  languages: string[];
  traits: string[];
  subraces: string[];
}

// ---------- Weapons (SRD equipment subset, for character attacks) ----------

export interface WeaponDef {
  index: string;
  name: string;
  category: string; // "Simple" | "Martial"
  range: string;    // "Melee" | "Ranged"
  damageDice: string;
  damageType: string;
  versatileDice: string | null;
  properties: string[];
  normalRange: number | null;
  longRange: number | null;
}

export interface ArmorDef {
  index: string;
  name: string;
  category: string; // "Light" | "Medium" | "Heavy" | "Shield"
  base: number;
  dexBonus: boolean;
  maxBonus: number | null;
  strMinimum: number;
  stealthDisadvantage: boolean;
}
