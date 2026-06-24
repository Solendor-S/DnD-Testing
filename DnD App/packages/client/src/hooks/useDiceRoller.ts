import type { AbilityId, Advantage, SpellRollInput, CastOptions } from '@dnd/shared';
import {
  rollExpression, rollAbilityCheck, rollSkillCheck, rollSave, rollInitiative,
  rollAttack, rollDamage, rollDeathSave, castSpell,
} from '@dnd/shared';
import { useDiceContext } from '../context/ActiveStatsContext';

/**
 * Binds the pure roll builders to the current active stats and appends every
 * result to the shared roll log. The single entry point the UI uses to roll.
 */
export function useDiceRoller() {
  const { stats, pushRolls } = useDiceContext();

  return {
    expression: (expr: string, label?: string) => pushRolls(rollExpression(expr, undefined, label)),
    abilityCheck: (ability: AbilityId, adv: Advantage = 'normal') => pushRolls(rollAbilityCheck(stats, ability, adv)),
    skillCheck: (skillId: string, adv: Advantage = 'normal') => pushRolls(rollSkillCheck(stats, skillId, adv)),
    save: (ability: AbilityId, adv: Advantage = 'normal') => pushRolls(rollSave(stats, ability, adv)),
    initiative: (adv: Advantage = 'normal') => pushRolls(rollInitiative(stats, adv)),
    deathSave: () => pushRolls(rollDeathSave()),
    attack: (bonus: number, adv: Advantage = 'normal', label?: string) => pushRolls(rollAttack(bonus, adv, label)),
    damage: (expr: string, crit = false, label?: string) => pushRolls(rollDamage(expr, { crit }, undefined, label)),
    cast: (spell: SpellRollInput, opts?: CastOptions) => pushRolls(castSpell(spell, stats, opts)),
  };
}
