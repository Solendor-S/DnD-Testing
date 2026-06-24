/**
 * Structured roll builders. Each combines a request (and optionally a
 * ModifierContext) into a fully-populated RollResult. Advantage/disadvantage
 * reuse the keep mechanism (2d20kh1 / 2d20kl1). Crits double damage dice only.
 */
import type { AbilityId, Advantage, ModifierContext, RollResult, RollType, Rng } from './types.js';
import { evaluate, doubleDiceExpression } from './notation.js';
import {
  ABILITY_NAMES, SKILLS, abilityMod, skillModifier, saveModifier, initiativeModifier,
} from './modifiers.js';

function makeId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID ? g.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function withMod(base: string, mod: number): string {
  if (mod === 0) return base;
  return mod > 0 ? `${base} + ${mod}` : `${base} - ${Math.abs(mod)}`;
}

function d20Expr(adv: Advantage): string {
  if (adv === 'advantage') return '2d20kh1';
  if (adv === 'disadvantage') return '2d20kl1';
  return '1d20';
}

/** A d20-based roll (check/save/attack/initiative) with crit/fumble on the kept die. */
function d20Roll(rollType: RollType, label: string, modifier: number, adv: Advantage, rng: Rng): RollResult {
  const ev = evaluate(withMod(d20Expr(adv), modifier), rng);
  const d20 = ev.groups.find((g) => g.sides === 20)!;
  const keptVal = d20.rolls.find((_, i) => d20.kept[i])!;
  return {
    id: makeId(), label, rollType,
    expression: ev.expression, groups: ev.groups, modifier: ev.modifier, total: ev.total,
    crit: keptVal === 20, fumble: keptVal === 1,
    rolledAt: new Date().toISOString(),
  };
}

export function rollExpression(expression: string, rng: Rng = Math.random, label?: string): RollResult {
  const ev = evaluate(expression, rng);
  return {
    id: makeId(), label: label ?? ev.expression, rollType: 'raw',
    expression: ev.expression, groups: ev.groups, modifier: ev.modifier, total: ev.total,
    rolledAt: new Date().toISOString(),
  };
}

export function rollAbilityCheck(ctx: ModifierContext, ability: AbilityId, adv: Advantage = 'normal', rng: Rng = Math.random): RollResult {
  return d20Roll('check', `${ABILITY_NAMES[ability]} check`, abilityMod(ctx.abilities[ability]), adv, rng);
}

export function rollSkillCheck(ctx: ModifierContext, skillId: string, adv: Advantage = 'normal', rng: Rng = Math.random): RollResult {
  const skill = SKILLS.find((s) => s.id === skillId);
  return d20Roll('check', `${skill?.name ?? skillId} check`, skillModifier(ctx, skillId), adv, rng);
}

export function rollSave(ctx: ModifierContext, ability: AbilityId, adv: Advantage = 'normal', rng: Rng = Math.random): RollResult {
  return d20Roll('save', `${ABILITY_NAMES[ability]} save`, saveModifier(ctx, ability), adv, rng);
}

export function rollInitiative(ctx: ModifierContext, adv: Advantage = 'normal', rng: Rng = Math.random): RollResult {
  return d20Roll('initiative', 'Initiative', initiativeModifier(ctx), adv, rng);
}

export function rollAttack(attackBonus: number, adv: Advantage = 'normal', label = 'Attack', rng: Rng = Math.random): RollResult {
  return d20Roll('attack', label, attackBonus, adv, rng);
}

/** Death saving throw: d20, no modifiers. ≥10 success; nat 20 → conscious; nat 1 → 2 failures. */
export function rollDeathSave(rng: Rng = Math.random): RollResult {
  const ev = evaluate('1d20', rng);
  const roll = ev.groups[0].rolls[0];
  let label: string;
  if (roll === 20) label = 'Death Save — Natural 20! Regain 1 HP';
  else if (roll === 1) label = 'Death Save — Natural 1 (2 failures)';
  else label = `Death Save — ${roll >= 10 ? 'Success' : 'Failure'}`;
  return {
    id: makeId(), label, rollType: 'death-save',
    expression: ev.expression, groups: ev.groups, modifier: 0, total: ev.total,
    crit: roll === 20, fumble: roll === 1,
    rolledAt: new Date().toISOString(),
  };
}

export function rollDamage(expression: string, opts: { crit?: boolean } = {}, rng: Rng = Math.random, label = 'Damage'): RollResult {
  const expr = opts.crit ? doubleDiceExpression(expression) : expression;
  const ev = evaluate(expr, rng);
  return {
    id: makeId(), label: opts.crit ? `${label} (crit)` : label, rollType: 'damage',
    expression: ev.expression, groups: ev.groups, modifier: ev.modifier, total: ev.total,
    rolledAt: new Date().toISOString(),
  };
}
