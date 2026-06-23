import { useState } from 'react';
import type { SpellDetail, SpellQuery, SpellSummary } from '@dnd/shared';
import { useDebounce } from '../hooks/useDebounce';
import { useSrdQuery } from '../hooks/useSrdQuery';
import { SearchBar } from './SearchBar';
import { EntityBrowser } from './EntityBrowser';
import { formatSpellLevel } from '../lib/formatters';

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];

export function SpellsView() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpellDetail | null>(null);

  const debounced = useDebounce(search, 300);
  const query: SpellQuery = { query: debounced, level, school, className };
  const { data: spells, loading } = useSrdQuery(window.srdApi.querySpells, query);

  async function select(index: string) {
    setSelected(await window.srdApi.getSpell(index));
  }

  const controls = (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search spells..." />
      <div className="filter-row">
        <select value={level ?? ''} onChange={(e) => setLevel(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">All levels</option>
          <option value="0">Cantrip</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => <option key={l} value={l}>Level {l}</option>)}
        </select>
        <select value={school ?? ''} onChange={(e) => setSchool(e.target.value || null)}>
          <option value="">All schools</option>
          {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={className ?? ''} onChange={(e) => setClassName(e.target.value || null)}>
          <option value="">All classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <EntityBrowser<SpellSummary>
      items={spells}
      loading={loading}
      emptyText="No spells found."
      placeholder="Select a spell to view details."
      selectedIndex={selected?.index ?? null}
      onSelect={select}
      renderMeta={(s) => `${formatSpellLevel(s.level)} · ${s.school}`}
      controls={controls}
      detail={selected && <SpellDetailView spell={selected} />}
    />
  );
}

function SpellDetailView({ spell }: { spell: SpellDetail }) {
  return (
    <article className="detail-card">
      <h2 className="detail-title">{spell.name}</h2>
      <p className="detail-subtitle">
        {formatSpellLevel(spell.level)} {spell.school.toLowerCase()}
        {spell.ritual ? ' (ritual)' : ''}
      </p>
      <dl className="detail-props">
        <div><dt>Casting Time</dt><dd>{spell.castingTime}</dd></div>
        <div><dt>Range</dt><dd>{spell.range}</dd></div>
        <div><dt>Components</dt><dd>{spell.components.join(', ')}{spell.material ? ` (${spell.material})` : ''}</dd></div>
        <div><dt>Duration</dt><dd>{spell.concentration ? 'Concentration, ' : ''}{spell.duration}</dd></div>
        <div><dt>Classes</dt><dd>{spell.classes.join(', ')}</dd></div>
      </dl>
      <div className="detail-text">
        {spell.desc.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        {spell.higherLevel && (
          <p><strong>At Higher Levels.</strong> {spell.higherLevel}</p>
        )}
      </div>
    </article>
  );
}
