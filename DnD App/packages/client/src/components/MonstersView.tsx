import { useState } from 'react';
import type { MonsterDetail, MonsterQuery, MonsterSummary } from '@dnd/shared';
import { useDebounce } from '../hooks/useDebounce';
import { useSrdQuery } from '../hooks/useSrdQuery';
import { SearchBar } from './SearchBar';
import { EntityBrowser } from './EntityBrowser';
import { StatBlock } from './StatBlock';
import { formatCr, titleCase } from '../lib/formatters';

const TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const CR_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Any CR', min: null, max: null },
  { label: 'CR 0–1', min: 0, max: 1 },
  { label: 'CR 2–4', min: 2, max: 4 },
  { label: 'CR 5–10', min: 5, max: 10 },
  { label: 'CR 11–16', min: 11, max: 16 },
  { label: 'CR 17+', min: 17, max: null },
];

export function MonstersView() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [crBand, setCrBand] = useState(0);
  const [selected, setSelected] = useState<MonsterDetail | null>(null);

  const debounced = useDebounce(search, 300);
  const band = CR_BANDS[crBand];
  const query: MonsterQuery = { query: debounced, type, size, crMin: band.min, crMax: band.max };
  const { data: monsters, loading } = useSrdQuery(window.srdApi.queryMonsters, query);

  async function select(index: string) {
    setSelected(await window.srdApi.getMonster(index));
  }

  const controls = (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Search monsters..." />
      <div className="filter-row">
        <select value={type ?? ''} onChange={(e) => setType(e.target.value || null)}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
        </select>
        <select value={size ?? ''} onChange={(e) => setSize(e.target.value || null)}>
          <option value="">All sizes</option>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={crBand} onChange={(e) => setCrBand(Number(e.target.value))}>
          {CR_BANDS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <EntityBrowser<MonsterSummary>
      items={monsters}
      loading={loading}
      emptyText="No monsters found."
      placeholder="Select a monster to view its stat block."
      selectedIndex={selected?.index ?? null}
      onSelect={select}
      renderMeta={(m) => `CR ${formatCr(m.cr)} · ${titleCase(m.type)}`}
      controls={controls}
      detail={selected && <StatBlock monster={selected} />}
    />
  );
}
