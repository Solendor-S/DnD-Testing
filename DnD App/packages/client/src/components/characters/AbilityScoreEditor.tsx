import { useState } from 'react';
import type { AbilityId } from '@dnd/shared';
import { ABILITIES, ABILITY_NAMES, abilityMod, evaluate } from '@dnd/shared';
import { STANDARD_ARRAY } from '../../lib/character';
import { formatModifier } from '../../lib/formatters';

interface Props {
  abilities: Record<AbilityId, number>;
  onChange: (abilities: Record<AbilityId, number>) => void;
}

// Point-buy cost table (guide §2): 8–13 cost 1 each, 14–15 cost 2 each.
const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUY_BUDGET = 27;

export function AbilityScoreEditor({ abilities, onChange }: Props) {
  const [pointBuy, setPointBuy] = useState(false);

  function set(id: AbilityId, value: number) {
    onChange({ ...abilities, [id]: value });
  }
  function fillStandardArray() {
    const next = {} as Record<AbilityId, number>;
    ABILITIES.forEach((id, i) => { next[id] = STANDARD_ARRAY[i]; });
    onChange(next);
    setPointBuy(false);
  }
  function roll() {
    const next = {} as Record<AbilityId, number>;
    ABILITIES.forEach((id) => { next[id] = evaluate('4d6dl1').total; });
    onChange(next);
    setPointBuy(false);
  }
  function startPointBuy() {
    const next = {} as Record<AbilityId, number>;
    ABILITIES.forEach((id) => { next[id] = 8; });
    onChange(next);
    setPointBuy(true);
  }

  const spent = pointBuy ? ABILITIES.reduce((sum, id) => sum + (POINT_BUY_COST[abilities[id]] ?? 0), 0) : 0;
  const remaining = POINT_BUY_BUDGET - spent;

  return (
    <div>
      <div className="ability-method-row">
        <span className="method-hint">Method:</span>
        <button type="button" className="text-btn" onClick={fillStandardArray}>Standard array</button>
        <button type="button" className="text-btn" onClick={roll}>Roll 4d6dl1</button>
        <button type="button" className={`text-btn${pointBuy ? ' text-btn--active' : ''}`} onClick={startPointBuy}>Point buy</button>
        {pointBuy
          ? <span className={`method-hint${remaining < 0 ? ' over-budget' : ''}`}>{remaining} points left</span>
          : <span className="method-hint">— or type manually</span>}
      </div>
      <div className="ability-grid">
        {ABILITIES.map((id) => (
          <label key={id} className="ability-field">
            <span className="ability-field-label">{ABILITY_NAMES[id].slice(0, 3).toUpperCase()}</span>
            {pointBuy ? (
              <div className="point-buy-control">
                <button type="button" disabled={abilities[id] <= 8} onClick={() => set(id, abilities[id] - 1)}>−</button>
                <span className="point-buy-score">{abilities[id]}</span>
                <button type="button" disabled={abilities[id] >= 15 || remaining <= (POINT_BUY_COST[abilities[id] + 1] - POINT_BUY_COST[abilities[id]])} onClick={() => set(id, abilities[id] + 1)}>+</button>
              </div>
            ) : (
              <input type="number" min={1} max={30} value={abilities[id]} onChange={(e) => set(id, Number(e.target.value) || 0)} />
            )}
            <span className="ability-field-mod">{formatModifier(abilityMod(abilities[id]))}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
