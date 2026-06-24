import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Character, CharacterSummary } from '@dnd/shared';
import { characterToModifierContext } from '@dnd/shared';
import { useDiceContext, DEFAULT_STATS } from './ActiveStatsContext';

/**
 * Character store + active-character selection. The active character bridges
 * into the dice ActiveStatsContext: selecting one prefills the Active Stats
 * (which then stays editable as transient overrides). Must be mounted INSIDE
 * ActiveStatsProvider so it can call setStats.
 */

const ACTIVE_KEY = 'dnd.activeCharacterId';

interface CharacterContextValue {
  characters: CharacterSummary[];
  activeId: string | null;
  active: Character | null;
  refresh: () => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
  save: (c: Character) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { setStats } = useDiceContext();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY));
  const [active, setActiveCharacter] = useState<Character | null>(null);

  async function refresh() {
    setCharacters(await window.charApi.list());
  }

  async function setActive(id: string | null) {
    if (id === null) {
      setActiveId(null);
      setActiveCharacter(null);
      localStorage.removeItem(ACTIVE_KEY);
      return;
    }
    const c = await window.charApi.get(id);
    setActiveId(id);
    setActiveCharacter(c);
    localStorage.setItem(ACTIVE_KEY, id);
  }

  async function save(c: Character) {
    await window.charApi.save(c);
    await refresh();
    if (c.id === activeId) setActiveCharacter(c);
  }

  async function remove(id: string) {
    await window.charApi.remove(id);
    if (id === activeId) await setActive(null);
    await refresh();
  }

  // Load list + restore last active character on mount.
  useEffect(() => {
    (async () => {
      await refresh();
      const stored = localStorage.getItem(ACTIVE_KEY);
      if (stored) {
        const c = await window.charApi.get(stored);
        if (c) setActiveCharacter(c);
        else { setActiveId(null); localStorage.removeItem(ACTIVE_KEY); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bridge: active character drives the dice modifier context (then editable).
  useEffect(() => {
    setStats(active ? characterToModifierContext(active) : DEFAULT_STATS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <CharacterContext.Provider value={{ characters, activeId, active, refresh, setActive, save, remove }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacters(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error('useCharacters must be used within <CharacterProvider>');
  return ctx;
}
