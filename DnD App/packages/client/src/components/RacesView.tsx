import { useState } from 'react';
import type { RaceDetail, RaceSummary } from '@dnd/shared';
import { useSrdQuery } from '../hooks/useSrdQuery';
import { EntityBrowser } from './EntityBrowser';

export function RacesView() {
  const { data: races, loading } = useSrdQuery(() => window.srdApi.getRaces(), null);
  const [selected, setSelected] = useState<RaceDetail | null>(null);

  async function select(index: string) {
    setSelected(await window.srdApi.getRace(index));
  }

  return (
    <EntityBrowser<RaceSummary>
      items={races}
      loading={loading}
      emptyText="No races found."
      placeholder="Select a race to view details."
      selectedIndex={selected?.index ?? null}
      onSelect={select}
      renderMeta={(r) => `${r.size} · ${r.speed} ft`}
      detail={selected && (
        <article className="detail-card">
          <h2 className="detail-title">{selected.name}</h2>
          <p className="detail-subtitle">{selected.size} · Speed {selected.speed} ft</p>
          <dl className="detail-props">
            <div><dt>Ability Bonuses</dt><dd>{selected.abilityBonuses.map((b) => `${b.ability} +${b.bonus}`).join(', ') || '—'}</dd></div>
            <div><dt>Languages</dt><dd>{selected.languages.join(', ') || '—'}</dd></div>
            <div><dt>Traits</dt><dd>{selected.traits.join(', ') || '—'}</dd></div>
            <div><dt>Subraces</dt><dd>{selected.subraces.join(', ') || '—'}</dd></div>
          </dl>
          <div className="detail-text">
            <h3>Age</h3><p>{selected.age}</p>
            <h3>Size</h3><p>{selected.sizeDescription}</p>
            <h3>Languages</h3><p>{selected.languageDesc}</p>
          </div>
        </article>
      )}
    />
  );
}
