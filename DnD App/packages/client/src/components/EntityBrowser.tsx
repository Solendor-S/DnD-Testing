import type { ReactNode } from 'react';

interface EntityRowItem {
  index: string;
  name: string;
}

interface Props<T extends EntityRowItem> {
  items: T[];
  loading?: boolean;
  emptyText: string;
  /** Right-hand placeholder shown when nothing is selected. */
  placeholder: string;
  selectedIndex: string | null;
  onSelect: (index: string) => void;
  /** Secondary line rendered under each row's name. */
  renderMeta: (item: T) => ReactNode;
  /** Optional search/filter controls rendered above the list+detail body. */
  controls?: ReactNode;
  /** The detail pane for the current selection (null shows the placeholder). */
  detail: ReactNode;
}

/**
 * Shared two-panel master/detail layout for every Rules Browser category.
 * Owns the list rendering, loading/empty states, and active-row selection;
 * each category supplies its own controls, row meta, and detail pane.
 */
export function EntityBrowser<T extends EntityRowItem>({
  items, loading, emptyText, placeholder, selectedIndex, onSelect, renderMeta, controls, detail,
}: Props<T>) {
  return (
    <div className="entity-view">
      {controls && <div className="entity-controls">{controls}</div>}
      <div className={`entity-body${controls ? '' : ' entity-body--nofilter'}`}>
        <ul className="entity-list">
          {loading && <li className="entity-empty">Loading…</li>}
          {!loading && items.length === 0 && <li className="entity-empty">{emptyText}</li>}
          {items.map((item) => (
            <li
              key={item.index}
              className={`entity-row${selectedIndex === item.index ? ' entity-row--active' : ''}`}
              onClick={() => onSelect(item.index)}
            >
              <span className="entity-row-name">{item.name}</span>
              <span className="entity-row-meta">{renderMeta(item)}</span>
            </li>
          ))}
        </ul>
        <div className="entity-detail">
          {detail ?? <div className="detail-placeholder">{placeholder}</div>}
        </div>
      </div>
    </div>
  );
}
