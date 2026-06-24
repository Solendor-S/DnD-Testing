import { useState } from 'react';
import { NavigationBar, type AppView } from './components/NavigationBar';
import { RulesBrowser } from './components/RulesBrowser';
import { DiceView } from './components/dice/DiceView';
import { CharactersView } from './components/characters/CharactersView';
import { ActiveStatsProvider } from './context/ActiveStatsContext';
import { CharacterProvider } from './context/CharacterContext';

export function App() {
  const [view, setView] = useState<AppView>('rules');

  return (
    <ActiveStatsProvider>
      <CharacterProvider>
        <div className="app-shell">
          <NavigationBar view={view} onChange={setView} />
          <main className="app-content">
            {view === 'rules' && <RulesBrowser />}
            {view === 'dice' && <DiceView />}
            {view === 'characters' && <CharactersView />}
            {view === 'combat' && (
              <div className="coming-soon">
                <h2>Combat Tracker</h2>
                <p>This feature is part of the multiplayer build — coming next.</p>
              </div>
            )}
          </main>
        </div>
      </CharacterProvider>
    </ActiveStatsProvider>
  );
}
