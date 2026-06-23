export type AppView = 'rules' | 'characters' | 'combat' | 'dice';

interface NavItem {
  id: AppView;
  label: string;
  enabled: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'rules', label: 'Rules Browser', enabled: true },
  { id: 'characters', label: 'Characters', enabled: false },
  { id: 'combat', label: 'Combat', enabled: false },
  { id: 'dice', label: 'Dice', enabled: false },
];

interface Props {
  view: AppView;
  onChange: (view: AppView) => void;
}

export function NavigationBar({ view, onChange }: Props) {
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
    </header>
  );
}
