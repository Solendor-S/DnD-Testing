import { useState } from 'react';
import type { RulesCategory } from '@dnd/shared';
import { SpellsView } from './SpellsView';
import { MonstersView } from './MonstersView';
import { ClassesView } from './ClassesView';
import { RacesView } from './RacesView';

const TABS: { id: RulesCategory; label: string }[] = [
  { id: 'spells', label: 'Spells' },
  { id: 'monsters', label: 'Monsters' },
  { id: 'classes', label: 'Classes' },
  { id: 'races', label: 'Races' },
];

export function RulesBrowser() {
  const [tab, setTab] = useState<RulesCategory>('spells');

  return (
    <div className="rules-browser">
      <div className="rules-tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`rules-tab${tab === t.id ? ' rules-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rules-panel">
        {tab === 'spells' && <SpellsView />}
        {tab === 'monsters' && <MonstersView />}
        {tab === 'classes' && <ClassesView />}
        {tab === 'races' && <RacesView />}
      </div>
    </div>
  );
}
