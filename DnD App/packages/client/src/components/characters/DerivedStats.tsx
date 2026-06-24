import type { Character } from '@dnd/shared';
import {
  ABILITIES, ABILITY_NAMES, SKILLS, SKILL_ABILITY,
  characterToModifierContext, proficiencyBonusForLevel,
  saveModifier, skillModifier, passivePerception, initiativeModifier,
  spellSaveDC, spellAttackBonus, effectiveAbilities, abilityMod,
} from '@dnd/shared';
import { formatModifier } from '../../lib/formatters';

/** Read-only panel showing every value computed from the character's stats. */
export function DerivedStats({ character }: { character: Character }) {
  const ctx = characterToModifierContext(character);
  const isCaster = !!character.spellcastingAbility;
  // Effective proficiency sets = manual ∪ origin-granted.
  const effSaves = new Set([...character.saveProficiencies, ...character.granted.saveProficiencies]);
  const effSkills = new Set([...character.skillProficiencies, ...character.granted.skills]);
  const effExpertise = new Set([...character.expertise, ...character.granted.expertise]);
  const eff = effectiveAbilities(character);
  const bonusFor = (id: typeof ABILITIES[number]) => eff[id] - character.abilities[id];

  return (
    <div className="derived-stats">
      <div className="derived-abilities">
        {ABILITIES.map((id) => (
          <div key={id} className={`eff-ability${bonusFor(id) ? ' eff-ability--boosted' : ''}`} title={bonusFor(id) ? `+${bonusFor(id)} from origin` : ''}>
            <span className="eff-ability-name">{id.toUpperCase()}</span>
            <span className="eff-ability-score">{eff[id]}</span>
            <span className="eff-ability-mod">{formatModifier(abilityMod(eff[id]))}</span>
          </div>
        ))}
      </div>
      <div className="derived-top">
        <Stat label="Prof. Bonus" value={formatModifier(proficiencyBonusForLevel(character.level))} />
        <Stat label="Initiative" value={formatModifier(initiativeModifier(ctx))} />
        <Stat label="AC" value={character.ac} />
        <Stat label="Speed" value={`${character.speed + character.granted.speedBonus} ft`} />
        <Stat label="Passive Per." value={passivePerception(ctx)} />
        {isCaster && <Stat label="Spell DC" value={spellSaveDC(ctx)} />}
        {isCaster && <Stat label="Spell Atk" value={formatModifier(spellAttackBonus(ctx))} />}
      </div>

      <div className="derived-cols">
        <div className="derived-block">
          <span className="derived-block-title">Saving Throws</span>
          {ABILITIES.map((id) => (
            <div key={id} className="derived-row">
              <span className={`prof-dot${effSaves.has(id) ? ' prof-dot--on' : ''}`} />
              <span className="derived-name">{ABILITY_NAMES[id]}</span>
              <span className="derived-val">{formatModifier(saveModifier(ctx, id))}</span>
            </div>
          ))}
        </div>

        <div className="derived-block derived-block--skills">
          <span className="derived-block-title">Skills</span>
          {SKILLS.map((s) => {
            const mastery = character.granted.skillMastery[s.id] ?? 0;
            const expert = effExpertise.has(s.id) || mastery > 0;
            const prof = effSkills.has(s.id);
            return (
              <div key={s.id} className="derived-row">
                <span className={`prof-dot${expert ? ' prof-dot--expert' : prof ? ' prof-dot--on' : ''}`} />
                <span className="derived-name">
                  {s.name} <em>({SKILL_ABILITY[s.id].toUpperCase()})</em>
                  {mastery > 0 && <span className="mastery-badge" title={`Mastery ${mastery}`}>{'◆'.repeat(mastery)}</span>}
                </span>
                <span className="derived-val">{formatModifier(skillModifier(ctx, s.id))}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="derived-stat">
      <span className="derived-stat-val">{value}</span>
      <span className="derived-stat-label">{label}</span>
    </div>
  );
}
