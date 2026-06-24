/**
 * Spell → roll mapping. Turns an SRD spell's rollable fields + a caster's
 * ModifierContext into the appropriate rolls: a spell attack roll (and crit-aware
 * damage), or a save line (DC + damage), or auto-hit damage, or healing.
 */
import type { Advantage, AbilityId, ModifierContext, RollResult, RollType, Rng } from './types.js';
import { evaluate, doubleDiceExpression } from './notation.js';
import { spellAttackBonus, spellSaveDC, spellAbilityMod } from './modifiers.js';
import { rollAttack } from './rolls.js';

/** The rollable subset of a spell (structurally compatible with SpellDetail). */
export interface SpellRollInput {
  name: string;
  level: number; // 0 = cantrip
  attackType: 'ranged' | 'melee' | null;
  dc: { ability: string; success: string } | null;
  damageBySlot: Record<string, string> | null;
  damageByCharLevel: Record<string, string> | null;
  healBySlot: Record<string, string> | null;
}

export interface CastOptions {
  /** Slot level the spell is cast at (>= spell.level). Ignored for cantrips. */
  castLevel?: number;
  advantage?: Advantage;
  rng?: Rng;
}

export function isRollableSpell(s: SpellRollInput): boolean {
  return !!(s.attackType || s.dc || s.damageBySlot || s.damageByCharLevel || s.healBySlot);
}

function pickByCharLevel(map: Record<string, string>, level: number): string {
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  let chosen = keys[0];
  for (const k of keys) if (level >= k) chosen = k;
  return map[String(chosen)];
}

/** Resolve the damage/heal dice expression for a given cast, substituting the "MOD" token. */
function resolveDice(s: SpellRollInput, ctx: ModifierContext, castLevel: number): string | null {
  const charLevel = ctx.level ?? 1;
  let expr: string | null = null;
  if (s.healBySlot) expr = s.healBySlot[String(castLevel)] ?? null;
  else if (s.damageBySlot) expr = s.damageBySlot[String(castLevel)] ?? null;
  else if (s.damageByCharLevel) expr = pickByCharLevel(s.damageByCharLevel, charLevel);
  if (!expr) return null;
  // "Nd8 + MOD" → strip the token and re-add the numeric spellcasting modifier.
  if (/MOD/i.test(expr)) {
    const base = expr.replace(/\s*\+\s*MOD/i, '').trim();
    const mod = spellAbilityMod(ctx);
    return mod === 0 ? base : `${base} ${mod > 0 ? '+' : '-'} ${Math.abs(mod)}`;
  }
  return expr;
}

function makeId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID ? g.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function diceResult(expr: string, rollType: RollType, label: string, rng: Rng, saveDc?: RollResult['saveDc']): RollResult {
  const ev = evaluate(expr, rng);
  return {
    id: makeId(), label, rollType,
    expression: ev.expression, groups: ev.groups, modifier: ev.modifier, total: ev.total,
    saveDc, rolledAt: new Date().toISOString(),
  };
}

/**
 * Produce the rolls for casting a spell. Order: attack roll first (if any), then
 * damage/heal. A crit on the attack roll doubles the damage dice.
 */
export function castSpell(s: SpellRollInput, ctx: ModifierContext, opts: CastOptions = {}): RollResult[] {
  const rng = opts.rng ?? Math.random;
  const castLevel = opts.castLevel ?? Math.max(s.level, 1);
  const results: RollResult[] = [];

  let crit = false;
  if (s.attackType) {
    const atk = rollAttack(spellAttackBonus(ctx), opts.advantage ?? 'normal', `${s.name} attack (${s.attackType})`, rng);
    atk.rollType = 'spell-attack';
    crit = !!atk.crit;
    results.push(atk);
  }

  const dice = resolveDice(s, ctx, castLevel);
  const isHeal = !!s.healBySlot;
  const saveDc = s.dc
    ? { ability: s.dc.ability.toLowerCase() as AbilityId, dc: spellSaveDC(ctx), onSuccess: s.dc.success }
    : undefined;

  if (dice) {
    const expr = crit ? doubleDiceExpression(dice) : dice;
    const label = isHeal ? `${s.name} healing` : `${s.name} damage${crit ? ' (crit)' : ''}`;
    const rollType: RollType = isHeal ? 'heal' : 'spell-damage';
    results.push(diceResult(expr, rollType, label, rng, saveDc));
  } else if (saveDc) {
    // Save spell with no dice (e.g. a pure save-or-suffer effect): surface the DC line.
    results.push({
      id: makeId(), label: `${s.name} save`, rollType: 'spell-save',
      expression: '—', groups: [], modifier: 0, total: 0, saveDc,
      rolledAt: new Date().toISOString(),
    });
  }

  return results;
}
