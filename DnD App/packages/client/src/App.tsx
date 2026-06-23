import { useState } from 'react';
import { NavigationBar, type AppView } from './components/NavigationBar';
import { RulesBrowser } from './components/RulesBrowser';

export function App() {
  const [view, setView] = useState<AppView>('rules');

  return (
    <div className="app-shell">
      <NavigationBar view={view} onChange={setView} />
      <main className="app-content">
        {view === 'rules' ? (
          <RulesBrowser />
        ) : (
          <div className="coming-soon">
            <h2>{labelFor(view)}</h2>
            <p>This feature is part of the multiplayer build — coming next.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function labelFor(view: AppView): string {
  switch (view) {
    case 'characters': return 'Characters';
    case 'combat': return 'Combat Tracker';
    case 'dice': return 'Dice Roller';
    default: return '';
  }
}
