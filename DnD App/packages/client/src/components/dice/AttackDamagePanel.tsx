import { useState } from 'react';
import type { Advantage, CharacterWeapon } from '@dnd/shared';
import { weaponAttackBonus, weaponDamageExpr } from '@dnd/shared';
import { useDiceRoller } from '../../hooks/useDiceRoller';
import { useCharacters } from '../../context/CharacterContext';
import { AdvantageToggle } from './AdvantageToggle';

export function AttackDamagePanel() {
  const roller = useDiceRoller();
  const { active } = useCharacters();
  const [attackBonus, setAttackBonus] = useState(5);
  const [adv, setAdv] = useState<Advantage>('normal');
  const [damageExpr, setDamageExpr] = useState('1d8 + 3');
  const [crit, setCrit] = useState(false);

  function rollWeapon(w: CharacterWeapon, twoHanded = false) {
    if (!active) return;
    const label = `${w.name}${twoHanded ? ' (2H)' : ''}`;
    roller.attack(weaponAttackBonus(active, w), adv, `${label} attack`);
    roller.damage(weaponDamageExpr(active, w, twoHanded), crit, `${label} damage`);
  }

  return (
    <section className="dice-section">
      <h3 className="dice-section-title">Attack &amp; Damage</h3>

      {active && active.weapons.length > 0 && (
        <div className="weapon-quick-row">
          <span className="structured-label">{active.name}'s weapons</span>
          <div className="btn-grid">
            {active.weapons.map((w) => (
              <span key={w.id} className="weapon-quick-item">
                <button type="button" className="mod-btn" onClick={() => rollWeapon(w)}>
                  {w.name} <em>{weaponDamageExpr(active, w)}</em>
                </button>
                {w.versatileDice && (
                  <button type="button" className="mod-btn mod-btn--2h" title="Two-handed" onClick={() => rollWeapon(w, true)}>2H</button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="attack-row">
        <label className="stats-inline">
          Attack bonus
          <input type="number" value={attackBonus} onChange={(e) => setAttackBonus(Number(e.target.value) || 0)} />
        </label>
        <AdvantageToggle value={adv} onChange={setAdv} />
        <button className="roll-btn" type="button" onClick={() => roller.attack(attackBonus, adv)}>Roll Attack</button>
      </div>

      <div className="attack-row">
        <label className="stats-inline stats-inline--grow">
          Damage
          <input
            type="text"
            value={damageExpr}
            placeholder="e.g. 1d8 + 3"
            onChange={(e) => setDamageExpr(e.target.value)}
          />
        </label>
        <label className="crit-check">
          <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />
          Crit
        </label>
        <button className="roll-btn" type="button" onClick={() => roller.damage(damageExpr, crit)}>Roll Damage</button>
      </div>
    </section>
  );
}
