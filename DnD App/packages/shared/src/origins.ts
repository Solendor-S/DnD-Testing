/**
 * Origin benefits (race / subrace / background / subclass). Each origin yields a
 * GrantBundle (fixed benefits) plus BenefitChoices ("choose N"). Pure data + merge
 * logic — scraped from wikidot at build time, applied to characters at runtime.
 */
import type { AbilityId } from './dice/types.js';

export type OriginKind = 'race' | 'subrace' | 'background' | 'subclass';
export type ChoiceType = 'ability' | 'skill' | 'language' | 'tool';

export interface BenefitChoice {
  id: string;                    // stable within a source, e.g. "asi", "skill", "lang"
  type: ChoiceType;
  choose: number;
  from: string[] | 'any';        // option ids, or 'any'
  bonus?: number;                // for ability picks (+1)
}

export interface GrantFeature { name: string; desc: string }

export interface GrantBundle {
  abilityBonuses: { ability: AbilityId; bonus: number }[];
  skillProficiencies: string[];
  expertise: string[];
  languages: string[];
  toolProficiencies: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];
  saveProficiencies: AbilityId[];
  speed?: number;
  size?: string;
  hpPerLevel?: number;
  features: GrantFeature[];
  choices: BenefitChoice[];
}

export interface OriginDef {
  index: string;
  name: string;
  kind: OriginKind;
  parent: string | null;         // subrace → race index; subclass → class index
  description: string;
  grant: GrantBundle;
}

export function emptyGrant(): GrantBundle {
  return {
    abilityBonuses: [], skillProficiencies: [], expertise: [], languages: [],
    toolProficiencies: [], weaponProficiencies: [], armorProficiencies: [],
    saveProficiencies: [], features: [], choices: [],
  };
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** Turn a resolved choice (picked option ids) into a partial grant. */
export function resolveChoice(choice: BenefitChoice, picks: string[]): GrantBundle {
  const g = emptyGrant();
  const chosen = picks.slice(0, choice.choose);
  switch (choice.type) {
    case 'ability':
      g.abilityBonuses = chosen.map((a) => ({ ability: a as AbilityId, bonus: choice.bonus ?? 1 }));
      break;
    case 'skill': g.skillProficiencies = chosen; break;
    case 'language': g.languages = chosen; break;
    case 'tool': g.toolProficiencies = chosen; break;
  }
  return g;
}

/** Merge grant bundles: union proficiency sets, sum ability bonuses + hpPerLevel. */
export function mergeGrants(bundles: GrantBundle[]): GrantBundle {
  const out = emptyGrant();
  const abilityMap = new Map<AbilityId, number>();
  for (const b of bundles) {
    for (const ab of b.abilityBonuses) abilityMap.set(ab.ability, (abilityMap.get(ab.ability) ?? 0) + ab.bonus);
    out.skillProficiencies.push(...b.skillProficiencies);
    out.expertise.push(...b.expertise);
    out.languages.push(...b.languages);
    out.toolProficiencies.push(...b.toolProficiencies);
    out.weaponProficiencies.push(...b.weaponProficiencies);
    out.armorProficiencies.push(...b.armorProficiencies);
    out.saveProficiencies.push(...b.saveProficiencies);
    out.features.push(...b.features);
    if (b.speed !== undefined) out.speed = b.speed;
    if (b.size !== undefined) out.size = b.size;
    if (b.hpPerLevel) out.hpPerLevel = (out.hpPerLevel ?? 0) + b.hpPerLevel;
  }
  out.abilityBonuses = [...abilityMap].map(([ability, bonus]) => ({ ability, bonus }));
  out.skillProficiencies = uniq(out.skillProficiencies);
  out.expertise = uniq(out.expertise);
  out.languages = uniq(out.languages);
  out.toolProficiencies = uniq(out.toolProficiencies);
  out.weaponProficiencies = uniq(out.weaponProficiencies);
  out.armorProficiencies = uniq(out.armorProficiencies);
  out.saveProficiencies = uniq(out.saveProficiencies);
  return out;
}
