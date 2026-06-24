import { useState } from 'react';
import type { AbilityId, ModifierContext } from '@dnd/shared';
import { ABILITIES, ABILITY_NAMES, SKILLS, abilityMod } from '@dnd/shared';
import { useDiceContext } from '../../context/ActiveStatsContext';
import { formatModifier } from '../../lib/formatters';

export function ActiveStatsPanel() {
  const { stats, setStats } = useDiceContext();
  const [showSkills, setShowSkills] = useState(false);

  function patch(p: Partial<ModifierContext>) {
    setStats({ ...stats, ...p });
  }
  function setAbility(id: AbilityId, value: number) {
    patch({ abilities: { ...stats.abilities, [id]: value } });
  }
  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  return (
    <aside className="stats-panel">
      <h2 className="panel-title">Active Stats</h2>
      <p className="panel-hint">The modifier source for structured rolls. A character will fill this automatically later.</p>

      <div className="stats-abilities">
        {ABILITIES.map((id) => (
          <label key={id} className="ability-field">
            <span className="ability-field-label">{id.toUpperCase()}</span>
            <input
              type="number"
              value={stats.abilities[id]}
              min={1}
              max={30}
              onChange={(e) => setAbility(id, Number(e.target.value) || 0)}
            />
            <span className="ability-field-mod">{formatModifier(abilityMod(stats.abilities[id]))}</span>
          </label>
        ))}
      </div>

      <div className="stats-row">
        <label className="stats-inline">
          Proficiency
          <input type="number" value={stats.proficiencyBonus} min={0} max={10}
            onChange={(e) => patch({ proficiencyBonus: Number(e.target.value) || 0 })} />
        </label>
        <label className="stats-inline">
          Level
          <input type="number" value={stats.level ?? 1} min={1} max={20}
            onChange={(e) => patch({ level: Number(e.target.value) || 1 })} />
        </label>
      </div>

      <label className="stats-inline stats-inline--full">
        Spellcasting ability
        <select
          value={stats.spellcastingAbility ?? ''}
          onChange={(e) => patch({ spellcastingAbility: (e.target.value || null) as AbilityId | null })}
        >
          <option value="">None</option>
          {ABILITIES.map((id) => <option key={id} value={id}>{ABILITY_NAMES[id]}</option>)}
        </select>
      </label>

      <div className="stats-group">
        <span className="stats-group-title">Saving throw proficiencies</span>
        <div className="chip-row">
          {ABILITIES.map((id) => (
            <button
              key={id}
              type="button"
              className={`pill${stats.saveProficiencies.includes(id) ? ' pill--on' : ''}`}
              onClick={() => patch({ saveProficiencies: toggle(stats.saveProficiencies, id) })}
            >
              {id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-group">
        <button type="button" className="stats-group-toggle" onClick={() => setShowSkills((s) => !s)}>
          {showSkills ? '▾' : '▸'} Skill proficiencies ({stats.skillProficiencies.length})
        </button>
        {showSkills && (
          <div className="chip-row chip-row--wrap">
            {SKILLS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pill${stats.skillProficiencies.includes(s.id) ? ' pill--on' : ''}`}
                onClick={() => patch({ skillProficiencies: toggle(stats.skillProficiencies, s.id) })}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
