import { useEffect, useState } from 'react';
import type { AbilityId, Character, CharacterWeapon, WeaponDef } from '@dnd/shared';
import { ABILITIES, weaponFromSrd } from '@dnd/shared';
import { newWeaponId } from '../../lib/character';

interface Props {
  character: Character;
  weapons: CharacterWeapon[];
  onChange: (weapons: CharacterWeapon[]) => void;
}

export function WeaponPicker({ character, weapons, onChange }: Props) {
  const [srdWeapons, setSrdWeapons] = useState<WeaponDef[]>([]);
  const [pick, setPick] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => { window.srdApi.getWeapons().then(setSrdWeapons); }, []);

  function addSrd(index: string) {
    const def = srdWeapons.find((w) => w.index === index);
    if (!def) return;
    onChange([...weapons, { id: newWeaponId(), ...weaponFromSrd(def, character.abilities) }]);
    setPick('');
  }
  function addCustom(w: Omit<CharacterWeapon, 'id'>) {
    onChange([...weapons, { id: newWeaponId(), ...w }]);
    setShowCustom(false);
  }
  function update(id: string, p: Partial<CharacterWeapon>) {
    onChange(weapons.map((w) => (w.id === id ? { ...w, ...p } : w)));
  }
  function remove(id: string) {
    onChange(weapons.filter((w) => w.id !== id));
  }

  return (
    <div className="weapon-picker">
      {weapons.length === 0 && <p className="muted-hint">No weapons yet.</p>}
      {weapons.map((w) => (
        <div key={w.id} className="weapon-row">
          <span className="weapon-name">{w.name}</span>
          <select value={w.ability} onChange={(e) => update(w.id, { ability: e.target.value as AbilityId })}>
            {ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
          </select>
          <span className="weapon-dmg">{w.damageDice}{w.damageType ? ` ${w.damageType.toLowerCase()}` : ''}</span>
          <label className="weapon-prof">
            <input type="checkbox" checked={w.proficient} onChange={(e) => update(w.id, { proficient: e.target.checked })} />
            prof
          </label>
          <button type="button" className="text-btn" onClick={() => remove(w.id)}>✕</button>
        </div>
      ))}

      <div className="weapon-add-row">
        <select value={pick} onChange={(e) => { setPick(e.target.value); if (e.target.value) addSrd(e.target.value); }}>
          <option value="">Add from SRD…</option>
          {srdWeapons.map((w) => <option key={w.index} value={w.index}>{w.name} ({w.damageDice})</option>)}
        </select>
        <button type="button" className="text-btn" onClick={() => setShowCustom((s) => !s)}>
          {showCustom ? 'Cancel' : '+ Custom'}
        </button>
      </div>

      {showCustom && <CustomWeaponForm onAdd={addCustom} />}
    </div>
  );
}

function CustomWeaponForm({ onAdd }: { onAdd: (w: Omit<CharacterWeapon, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [ability, setAbility] = useState<AbilityId>('str');
  const [damageDice, setDamageDice] = useState('1d6');
  const [damageType, setDamageType] = useState('');

  return (
    <div className="custom-weapon">
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={ability} onChange={(e) => setAbility(e.target.value as AbilityId)}>
        {ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
      </select>
      <input placeholder="Damage (e.g. 1d6)" value={damageDice} onChange={(e) => setDamageDice(e.target.value)} />
      <input placeholder="Type" value={damageType} onChange={(e) => setDamageType(e.target.value)} />
      <button
        type="button"
        className="roll-btn"
        disabled={!name.trim() || !damageDice.trim()}
        onClick={() => onAdd({ name: name.trim(), source: 'custom', ability, proficient: true, damageDice: damageDice.trim(), damageType: damageType.trim() || undefined })}
      >
        Add
      </button>
    </div>
  );
}
