import { useState } from 'react';
import type { AbilityId } from '@dnd/shared';
import { ABILITIES, abilityMod } from '@dnd/shared';
import { useDiceContext } from '../../context/ActiveStatsContext';
import { useDiceRoller } from '../../hooks/useDiceRoller';
import { formatModifier } from '../../lib/formatters';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export function QuickDicePanel() {
  const { stats } = useDiceContext();
  const roller = useDiceRoller();
  const [count, setCount] = useState(1);
  const [flatMod, setFlatMod] = useState(0);
  const [ability, setAbility] = useState<AbilityId | ''>('');

  const abilityMods = ability ? abilityMod(stats.abilities[ability]) : 0;
  const totalMod = flatMod + abilityMods;

  function roll(sides: number) {
    const base = `${count}d${sides}`;
    const expr = totalMod === 0 ? base : `${base} ${totalMod > 0 ? '+' : '-'} ${Math.abs(totalMod)}`;
    roller.expression(expr);
  }

  return (
    <section className="dice-section">
      <h3 className="dice-section-title">Quick Dice</h3>
      <div className="quick-dice-row">
        {DICE.map((d) => (
          <button key={d} className="die-btn" onClick={() => roll(d)} type="button">d{d}</button>
        ))}
      </div>
      <div className="quick-dice-controls">
        <label className="stats-inline">
          Count
          <input type="number" value={count} min={1} max={100} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <label className="stats-inline">
          Modifier
          <input type="number" value={flatMod} onChange={(e) => setFlatMod(Number(e.target.value) || 0)} />
        </label>
        <label className="stats-inline">
          + Ability
          <select value={ability} onChange={(e) => setAbility((e.target.value || '') as AbilityId | '')}>
            <option value="">none</option>
            {ABILITIES.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
          </select>
        </label>
        <span className="quick-dice-preview">
          Rolling <strong>{count}d… {totalMod !== 0 ? formatModifier(totalMod) : ''}</strong>
        </span>
      </div>
    </section>
  );
}
