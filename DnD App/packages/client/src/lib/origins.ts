import type { BenefitChoice, Character, GrantBundle, OriginDef } from '@dnd/shared';
import { ABILITIES, ABILITY_NAMES, SKILLS, emptyGrant, mergeGrants, resolveChoice, effectsForKeys, isEffectActive, sumEffect } from '@dnd/shared';

/** Languages a "choose a language" pick can draw from (no SRD language table bundled). */
export const LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
];

export interface ActiveChoice {
  key: string;            // `${kind}:${index}:${choiceId}`
  sourceName: string;
  choice: BenefitChoice;
  options: { id: string; name: string }[];
}

function optionsFor(choice: BenefitChoice): { id: string; name: string }[] {
  if (choice.from !== 'any') {
    // ids from a fixed list (e.g. class skills) → label via SKILLS where possible
    return choice.from.map((id) => ({ id, name: SKILLS.find((s) => s.id === id)?.name ?? id }));
  }
  switch (choice.type) {
    case 'ability': return ABILITIES.map((id) => ({ id, name: ABILITY_NAMES[id] }));
    case 'skill': return SKILLS.map((s) => ({ id: s.id, name: s.name }));
    case 'language': return LANGUAGES.map((l) => ({ id: l, name: l }));
    case 'tool': return [];
  }
}

interface SourceRef { kind: string; def: OriginDef | null; choices: BenefitChoice[]; name: string }

async function gatherSources(c: Character): Promise<SourceRef[]> {
  const { origin } = c;
  const [race, subrace, background, subclass, classChoices] = await Promise.all([
    origin.raceIndex ? window.srdApi.getOrigin('race', origin.raceIndex) : null,
    origin.subraceIndex ? window.srdApi.getOrigin('subrace', origin.subraceIndex) : null,
    origin.backgroundIndex ? window.srdApi.getOrigin('background', origin.backgroundIndex) : null,
    origin.subclassIndex ? window.srdApi.getOrigin('subclass', origin.subclassIndex) : null,
    c.classIndex ? window.srdApi.getClassChoices(c.classIndex) : Promise.resolve([] as BenefitChoice[]),
  ]);
  return [
    { kind: 'race', def: race, choices: race?.grant.choices ?? [], name: race?.name ?? 'Race' },
    { kind: 'subrace', def: subrace, choices: subrace?.grant.choices ?? [], name: subrace?.name ?? 'Subrace' },
    { kind: 'background', def: background, choices: background?.grant.choices ?? [], name: background?.name ?? 'Background' },
    { kind: 'subclass', def: subclass, choices: subclass?.grant.choices ?? [], name: subclass?.name ?? 'Subclass' },
    { kind: 'class', def: null, choices: classChoices, name: 'Class' },
  ];
}

/**
 * Recompute the materialized origin grants from the character's selections +
 * resolved choices, and return the updated character plus the active choice list
 * for the UI. Rebuilt from scratch every call → clean swap, no stacking.
 */
export async function resolveOrigins(c: Character): Promise<{ character: Character; choices: ActiveChoice[] }> {
  const sources = await gatherSources(c);

  const bundles: GrantBundle[] = [];
  const choices: ActiveChoice[] = [];
  const fixedSkills = new Set<string>();          // skills granted directly (not via a choice)
  const choiceSkillCounts = new Map<string, number>(); // skill → # of choices that picked it
  for (const src of sources) {
    if (src.def) {
      bundles.push(src.def.grant);
      for (const s of src.def.grant.skillProficiencies) fixedSkills.add(s);
    }
    const idx = src.kind === 'race' ? c.origin.raceIndex
      : src.kind === 'subrace' ? c.origin.subraceIndex
      : src.kind === 'background' ? c.origin.backgroundIndex
      : src.kind === 'subclass' ? c.origin.subclassIndex
      : c.classIndex;
    for (const choice of src.choices) {
      const key = `${src.kind}:${idx}:${choice.id}`;
      choices.push({ key, sourceName: src.name, choice, options: optionsFor(choice) });
      const picks = c.choiceSelections[key] ?? [];
      if (picks.length) bundles.push(resolveChoice(choice, picks));
      if (choice.type === 'skill') {
        for (const s of picks) choiceSkillCounts.set(s, (choiceSkillCounts.get(s) ?? 0) + 1);
      }
    }
  }

  const merged = bundles.length ? mergeGrants(bundles) : emptyGrant();

  // Mastery: extra duplicate skill picks stack into mastery levels (1-3). A fixed
  // grant covers the base proficiency; otherwise the first choice pick does.
  const skillMastery: Record<string, number> = {};
  for (const skill of merged.skillProficiencies) {
    const picks = choiceSkillCounts.get(skill) ?? 0;
    const level = Math.min(picks - (fixedSkills.has(skill) ? 0 : 1), 3);
    if (level > 0) skillMastery[skill] = level;
  }

  // Curated passive effects from class/subclass/race, condition+level evaluated.
  const candidates = effectsForKeys([c.origin.raceIndex, c.origin.subraceIndex, c.origin.subclassIndex, c.classIndex]);
  const effectCtx = { level: c.level, unarmored: c.armorIndex == null, toggles: c.effectToggles };
  const effects = candidates.filter((e) => isEffectActive(e, effectCtx));

  const character: Character = {
    ...c,
    grantedAbilityBonuses: merged.abilityBonuses,
    granted: {
      skills: merged.skillProficiencies,
      expertise: merged.expertise,
      skillMastery,
      languages: merged.languages,
      toolProficiencies: merged.toolProficiencies,
      weaponProficiencies: merged.weaponProficiencies,
      armorProficiencies: merged.armorProficiencies,
      saveProficiencies: merged.saveProficiencies,
      hpPerLevel: merged.hpPerLevel ?? 0,
      features: merged.features,
      effects,
      speedBonus: sumEffect(effects, 'speed-bonus'),
      initiativeBonus: sumEffect(effects, 'initiative-bonus'),
      passivePerceptionBonus: sumEffect(effects, 'passive-perception-bonus'),
    },
    speed: merged.speed ?? c.speed,
  };
  return { character, choices };
}
