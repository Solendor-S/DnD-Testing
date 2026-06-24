import { useEffect, useState } from 'react';
import type { ArmorDef, Character, UnarmoredDefense } from '@dnd/shared';
import { abilityMod, computeAc, effectiveAbilities } from '@dnd/shared';
import { useDiceRoller } from '../../hooks/useDiceRoller';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

export function CombatSection({ character: c, onChange }: Props) {
  const roller = useDiceRoller();
  const [armorList, setArmorList] = useState<ArmorDef[]>([]);

  useEffect(() => { window.srdApi.getArmor().then(setArmorList); }, []);

  function suggestAc() {
    const armor = armorList.find((a) => a.index === c.armorIndex) ?? null;
    const eff = effectiveAbilities(c);
    const ac = computeAc({
      armor,
      dexMod: abilityMod(eff.dex),
      conMod: abilityMod(eff.con),
      wisMod: abilityMod(eff.wis),
      shield: c.shieldEquipped,
      unarmored: c.unarmoredDefense,
      effects: c.granted.effects,
      abilities: eff,
    });
    onChange({ ac });
  }

  function rollHitDie() {
    if (c.hitDiceRemaining <= 0) return;
    const conMod = abilityMod(c.abilities.con);
    roller.expression(`1d${c.hitDie}${conMod ? ` + ${conMod}` : ''}`, 'Hit Die (short rest)');
    onChange({ hitDiceRemaining: c.hitDiceRemaining - 1 });
  }

  function setSaves(kind: 'successes' | 'failures', n: number) {
    onChange({ deathSaves: { ...c.deathSaves, [kind]: c.deathSaves[kind] === n ? n - 1 : n } });
  }

  return (
    <div className="combat-section">
      <div className="field-row">
        <label className="stats-inline">Max HP
          <input type="number" value={c.maxHp} onChange={(e) => onChange({ maxHp: Number(e.target.value) || 0 })} />
        </label>
        <label className="stats-inline">Current HP
          <input type="number" value={c.currentHp} onChange={(e) => onChange({ currentHp: Number(e.target.value) || 0 })} />
        </label>
        <label className="stats-inline">Temp HP
          <input type="number" value={c.tempHp} onChange={(e) => onChange({ tempHp: Number(e.target.value) || 0 })} />
        </label>
        <label className="stats-inline">Speed
          <input type="number" value={c.speed} onChange={(e) => onChange({ speed: Number(e.target.value) || 0 })} />
        </label>
      </div>

      <div className="field-row">
        <label className="stats-inline">Armour
          <select value={c.armorIndex ?? ''} onChange={(e) => onChange({ armorIndex: e.target.value || null })}>
            <option value="">None</option>
            {armorList.filter((a) => a.category !== 'Shield').map((a) => <option key={a.index} value={a.index}>{a.name}</option>)}
          </select>
        </label>
        <label className="crit-check">
          <input type="checkbox" checked={c.shieldEquipped} onChange={(e) => onChange({ shieldEquipped: e.target.checked })} /> Shield
        </label>
        <label className="stats-inline">Unarmored def.
          <select value={c.unarmoredDefense} onChange={(e) => onChange({ unarmoredDefense: e.target.value as UnarmoredDefense })}>
            <option value="none">None</option>
            <option value="barbarian">Barbarian (+CON)</option>
            <option value="monk">Monk (+WIS)</option>
          </select>
        </label>
        <label className="stats-inline">AC
          <input type="number" value={c.ac} onChange={(e) => onChange({ ac: Number(e.target.value) || 0 })} />
        </label>
        <button type="button" className="text-btn" onClick={suggestAc}>Suggest AC</button>
      </div>

      <div className="field-row">
        <div className="hit-dice">
          <span className="field-label">Hit Dice: {c.hitDiceRemaining}/{c.level} (d{c.hitDie})</span>
          <button type="button" className="text-btn" onClick={rollHitDie} disabled={c.hitDiceRemaining <= 0}>Roll hit die</button>
          <button type="button" className="text-btn" onClick={() => onChange({ hitDiceRemaining: c.level })}>Long rest</button>
        </div>
        <div className="death-saves">
          <span className="field-label">Death Saves</span>
          <span className="death-row">
            <span className="death-label">Successes</span>
            {[1, 2, 3].map((n) => <span key={n} className={`death-dot${c.deathSaves.successes >= n ? ' death-dot--success' : ''}`} onClick={() => setSaves('successes', n)} />)}
          </span>
          <span className="death-row">
            <span className="death-label">Failures</span>
            {[1, 2, 3].map((n) => <span key={n} className={`death-dot${c.deathSaves.failures >= n ? ' death-dot--fail' : ''}`} onClick={() => setSaves('failures', n)} />)}
          </span>
          <button type="button" className="text-btn" onClick={() => { roller.deathSave(); }}>Roll death save</button>
          <button type="button" className="text-btn" onClick={() => onChange({ deathSaves: { successes: 0, failures: 0 } })}>Reset</button>
        </div>
      </div>
    </div>
  );
}
