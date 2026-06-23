import { useState } from 'react';
import type { ClassDetail, ClassSummary } from '@dnd/shared';
import { useSrdQuery } from '../hooks/useSrdQuery';
import { EntityBrowser } from './EntityBrowser';

export function ClassesView() {
  const { data: classes, loading } = useSrdQuery(() => window.srdApi.getClasses(), null);
  const [selected, setSelected] = useState<ClassDetail | null>(null);

  async function select(index: string) {
    setSelected(await window.srdApi.getClass(index));
  }

  return (
    <EntityBrowser<ClassSummary>
      items={classes}
      loading={loading}
      emptyText="No classes found."
      placeholder="Select a class to view details."
      selectedIndex={selected?.index ?? null}
      onSelect={select}
      renderMeta={(c) => `d${c.hitDie} hit die`}
      detail={selected && (
        <article className="detail-card">
          <h2 className="detail-title">{selected.name}</h2>
          <p className="detail-subtitle">Hit Die: d{selected.hitDie}</p>
          <dl className="detail-props">
            <div><dt>Saving Throws</dt><dd>{selected.savingThrows.join(', ') || '—'}</dd></div>
            <div><dt>Subclasses</dt><dd>{selected.subclasses.join(', ') || '—'}</dd></div>
          </dl>
          <div className="detail-text">
            <h3>Proficiencies</h3>
            <p>{selected.proficiencies.join(', ') || '—'}</p>
            <h3>Starting Equipment</h3>
            <ul>
              {selected.startingEquipment.map((e, i) => (
                <li key={i}>{e.quantity > 1 ? `${e.name} (×${e.quantity})` : e.name}</li>
              ))}
            </ul>
          </div>
        </article>
      )}
    />
  );
}
