import { useState } from 'react';
import type { Character } from '@dnd/shared';
import { ABILITIES, SKILLS, SKILL_ABILITY } from '@dnd/shared';

interface Props {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
}

export function ProficiencyEditor({ character, onChange }: Props) {
  function toggleSave(id: (typeof ABILITIES)[number]) {
    onChange({
      saveProficiencies: character.saveProficiencies.includes(id)
        ? character.saveProficiencies.filter((x) => x !== id)
        : [...character.saveProficiencies, id],
    });
  }

  // Skill cycle: none → proficient → expertise → none.
  function cycleSkill(id: string) {
    const prof = character.skillProficiencies.includes(id);
    const expert = character.expertise.includes(id);
    if (!prof && !expert) {
      onChange({ skillProficiencies: [...character.skillProficiencies, id] });
    } else if (prof && !expert) {
      onChange({ expertise: [...character.expertise, id] });
    } else {
      onChange({
        skillProficiencies: character.skillProficiencies.filter((x) => x !== id),
        expertise: character.expertise.filter((x) => x !== id),
      });
    }
  }

  const g = character.granted;
  const grantedSkillNames = g.skills.map((id) => SKILLS.find((s) => s.id === id)?.name ?? id);
  const hasGranted = g.skills.length || g.languages.length || g.toolProficiencies.length || g.features.length;

  return (
    <div className="prof-editor">
      {hasGranted ? (
        <div className="granted-summary">
          <span className="field-label">Granted by your origins (auto-applied)</span>
          {grantedSkillNames.length > 0 && <div className="granted-line"><b>Skills:</b> {grantedSkillNames.join(', ')}</div>}
          {g.languages.length > 0 && <div className="granted-line"><b>Languages:</b> {g.languages.join(', ')}</div>}
          {g.toolProficiencies.length > 0 && <div className="granted-line"><b>Tools:</b> {g.toolProficiencies.join(', ')}</div>}
          {g.features.length > 0 && <div className="granted-line"><b>Traits:</b> {g.features.map((f) => f.name).join(', ')}</div>}
        </div>
      ) : null}

      <span className="field-label">Saving throws <em>(manual)</em></span>
      <div className="chip-row">
        {ABILITIES.map((id) => (
          <button key={id} type="button"
            className={`pill${character.saveProficiencies.includes(id) ? ' pill--on' : ''}`}
            onClick={() => toggleSave(id)}>
            {id.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="field-label">Skills <em>(click to cycle: none → proficient → expertise)</em></span>
      <div className="chip-row chip-row--wrap">
        {SKILLS.map((s) => {
          const expert = character.expertise.includes(s.id);
          const prof = character.skillProficiencies.includes(s.id);
          return (
            <button key={s.id} type="button"
              className={`pill${expert ? ' pill--expert' : prof ? ' pill--on' : ''}`}
              onClick={() => cycleSkill(s.id)}>
              {s.name} <span className="pill-ability">{SKILL_ABILITY[s.id].toUpperCase()}</span>
              {expert && ' ◆◆'}{prof && !expert && ' ◆'}
            </button>
          );
        })}
      </div>

      <div className="chip-list-grid">
        <ChipList label="Languages" items={character.languages} onChange={(languages) => onChange({ languages })} />
        <ChipList label="Armor proficiencies" items={character.armorProficiencies} onChange={(armorProficiencies) => onChange({ armorProficiencies })} />
        <ChipList label="Weapon proficiencies" items={character.weaponProficiencies} onChange={(weaponProficiencies) => onChange({ weaponProficiencies })} />
        <ChipList label="Tool proficiencies" items={character.toolProficiencies} onChange={(toolProficiencies) => onChange({ toolProficiencies })} />
      </div>
    </div>
  );
}

function ChipList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [val, setVal] = useState('');
  function add() {
    const v = val.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setVal('');
  }
  return (
    <div className="chip-list">
      <span className="field-label">{label}</span>
      <div className="chip-row chip-row--wrap">
        {items.map((it) => (
          <span key={it} className="known-spell-chip">{it}
            <button type="button" className="chip-remove" onClick={() => onChange(items.filter((x) => x !== it))}>✕</button>
          </span>
        ))}
      </div>
      <div className="chip-add">
        <input value={val} placeholder={`Add…`} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" className="text-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}
