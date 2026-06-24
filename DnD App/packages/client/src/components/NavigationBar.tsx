import { useCharacters } from '../context/CharacterContext';

export type AppView = 'rules' | 'characters' | 'combat' | 'dice';

interface NavItem {
  id: AppView;
  label: string;
  enabled: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'rules', label: 'Rules Browser', enabled: true },
  { id: 'characters', label: 'Characters', enabled: true },
  { id: 'dice', label: 'Dice', enabled: true },
  { id: 'combat', label: 'Combat', enabled: false },
];

interface Props {
  view: AppView;
  onChange: (view: AppView) => void;
}

export function NavigationBar({ view, onChange }: Props) {
  const { characters, activeId, setActive } = useCharacters();

  return (
    <header className="nav-bar">
      <div className="nav-brand">
        <span className="nav-brand-mark">&#9670;</span>
        <span className="nav-brand-text">D&amp;D Companion</span>
      </div>
      <nav className="nav-tabs">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-tab${view === item.id ? ' nav-tab--active' : ''}`}
            disabled={!item.enabled}
            title={item.enabled ? undefined : 'Coming soon'}
            onClick={() => item.enabled && onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="nav-active-character">
        <span className="nav-active-label">Active</span>
        <select
          className="nav-character-select"
          value={activeId ?? ''}
          onChange={(e) => setActive(e.target.value || null)}
        >
          <option value="">Custom (no character)</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
