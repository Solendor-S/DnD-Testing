/**
 * Passive-stat "effects" — the curated mechanics layer that turns feature text
 * (Draconic Resilience, Paladin's aura, …) into numbers on the sheet. Only
 * passive sheet stats are modelled (AC, saves, speed, initiative, passive
 * perception); active/situational abilities stay as descriptive text.
 */
import type { AbilityId } from './dice/types.js';
import { abilityMod } from './dice/modifiers.js';

export type EffectCondition = 'always' | 'unarmored' | 'toggle';
export type EffectKind =
  | 'unarmored-ac'
  | 'ac-bonus'
  | 'speed-bonus'
  | 'save-bonus'
  | 'initiative-bonus'
  | 'passive-perception-bonus';

export interface Effect {
  id: string;            // unique, e.g. 'draconic-resilience-ac'
  source: string;        // feature name shown to the user
  desc: string;          // short human description
  kind: EffectKind;
  condition: EffectCondition;
  minLevel?: number;     // class-level gate (e.g. Paladin aura = 6)
  // params (by kind):
  acBase?: number;
  acAdds?: AbilityId[];
  value?: number;                 // ac-bonus / speed / initiative / passive
  fromAbility?: AbilityId;        // save-bonus driven by an ability mod (aura)
  saves?: AbilityId[] | 'all';    // which saves a save-bonus covers
}

export interface EffectContext {
  level: number;
  unarmored: boolean;
  toggles: Record<string, boolean>;
}

export function isEffectActive(e: Effect, ctx: EffectContext): boolean {
  if (e.minLevel && ctx.level < e.minLevel) return false;
  switch (e.condition) {
    case 'always': return true;
    case 'unarmored': return ctx.unarmored;
    case 'toggle': return !!ctx.toggles[e.id];
  }
}

/** Sum the `value` of all effects of a given kind. */
export function sumEffect(effects: Effect[], kind: EffectKind): number {
  return effects.reduce((acc, e) => (e.kind === kind ? acc + (e.value ?? 0) : acc), 0);
}

/** Best unarmored-AC formula among the effects (or null if none). */
export function bestUnarmoredAc(effects: Effect[], abilities: Record<AbilityId, number>): { ac: number; source: string } | null {
  let best: { ac: number; source: string } | null = null;
  for (const e of effects) {
    if (e.kind !== 'unarmored-ac') continue;
    const ac = (e.acBase ?? 10) + (e.acAdds ?? []).reduce((s, a) => s + abilityMod(abilities[a]), 0);
    if (!best || ac > best.ac) best = { ac, source: e.source };
  }
  return best;
}

/** Per-ability save bonuses contributed by `save-bonus` effects. */
export function saveBonusFromEffects(effects: Effect[], abilities: Record<AbilityId, number>): Partial<Record<AbilityId, number>> {
  const ALL: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const out: Partial<Record<AbilityId, number>> = {};
  for (const e of effects) {
    if (e.kind !== 'save-bonus') continue;
    const amount = e.fromAbility ? abilityMod(abilities[e.fromAbility]) : (e.value ?? 0);
    const targets = e.saves === 'all' || !e.saves ? ALL : e.saves;
    for (const ab of targets) out[ab] = (out[ab] ?? 0) + amount;
  }
  return out;
}
