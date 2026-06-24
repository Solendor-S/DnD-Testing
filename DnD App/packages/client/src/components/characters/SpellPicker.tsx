import { useState } from 'react';
import type { CharacterSpellRef, SpellSummary } from '@dnd/shared';
import { useDebounce } from '../../hooks/useDebounce';
import { useSrdQuery } from '../../hooks/useSrdQuery';
import { SearchBar } from '../SearchBar';
import { formatSpellLevel } from '../../lib/formatters';

interface Props {
  knownSpells: CharacterSpellRef[];
  onChange: (spells: CharacterSpellRef[]) => void;
}

export function SpellPicker({ knownSpells, onChange }: Props) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: results } = useSrdQuery(
    window.srdApi.querySpells,
    { query: debounced, level: null, school: null, className: null },
  );
  const known = new Set(knownSpells.map((s) => s.index));

  function add(s: SpellSummary) {
    if (known.has(s.index)) return;
    onChange([...knownSpells, { index: s.index, name: s.name, level: s.level }]);
  }
  function remove(index: string) {
    onChange(knownSpells.filter((s) => s.index !== index));
  }

  return (
    <div className="spell-picker">
      <div className="known-spells">
        {knownSpells.length === 0 && <p className="muted-hint">No spells known yet.</p>}
        {knownSpells.map((s) => (
          <span key={s.index} className="known-spell-chip">
            {s.name}
            <button type="button" className="chip-remove" onClick={() => remove(s.index)}>✕</button>
          </span>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search spells to add…" />
      {debounced.trim() && (
        <ul className="spell-results">
          {results.slice(0, 12).map((s) => (
            <li key={s.index}>
              <button type="button" className="spell-result" disabled={known.has(s.index)} onClick={() => add(s)}>
                <span>{s.name}</span>
                <span className="spell-result-meta">{formatSpellLevel(s.level)}{known.has(s.index) ? ' · added' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
