import { useState } from 'react';
import type { Character } from '@dnd/shared';
import { useCharacters } from '../../context/CharacterContext';
import { CharacterSheet } from './CharacterSheet';
import { createBlankCharacter } from '../../lib/character';
import { titleCase } from '../../lib/formatters';

export function CharactersView() {
  const { characters, activeId, setActive, save, remove } = useCharacters();
  const [editing, setEditing] = useState<Character | null>(null);

  async function openEdit(id: string) {
    const c = await window.charApi.get(id);
    if (c) setEditing(c);
  }
  async function handleSave(c: Character) {
    await save(c);
    setEditing(null);
  }
  async function handleDelete(id: string) {
    await remove(id);
    setEditing(null);
  }

  if (editing) {
    const exists = characters.some((c) => c.id === editing.id);
    return (
      <CharacterSheet
        character={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        onDelete={exists ? () => handleDelete(editing.id) : undefined}
      />
    );
  }

  return (
    <div className="characters-view">
      <div className="characters-head">
        <h2 className="panel-title">Characters</h2>
        <button type="button" className="roll-btn" onClick={() => setEditing(createBlankCharacter())}>
          + New Character
        </button>
      </div>

      {characters.length === 0 ? (
        <p className="muted-hint">No characters yet. Create one — it becomes selectable as the active character that drives your dice rolls.</p>
      ) : (
        <div className="character-cards">
          {characters.map((c) => (
            <div key={c.id} className={`character-card${activeId === c.id ? ' character-card--active' : ''}`}>
              <div className="character-card-main">
                <span className="character-card-name">{c.name}</span>
                <span className="character-card-sub">
                  {c.raceIndex ? titleCase(c.raceIndex) + ' ' : ''}{c.classIndex ? titleCase(c.classIndex) : 'No class'} · Lv {c.level}
                </span>
              </div>
              <div className="character-card-actions">
                {activeId === c.id
                  ? <span className="active-badge">Active</span>
                  : <button type="button" className="text-btn" onClick={() => setActive(c.id)}>Set active</button>}
                <button type="button" className="text-btn" onClick={() => openEdit(c.id)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
