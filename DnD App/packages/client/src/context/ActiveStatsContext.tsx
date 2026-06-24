import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ModifierContext, RollResult } from '@dnd/shared';

/**
 * Holds the "active stats" (the modifier source for structured rolls) and the
 * roll history/dispatcher. Lives high in the tree so any screen — including the
 * Rules Browser spell detail — can roll into the same shared log.
 *
 * Active stats persist to localStorage (small config). Roll history is ephemeral
 * by default; the user can opt into persistence.
 */

const STATS_KEY = 'dnd.activeStats';
const PERSIST_KEY = 'dnd.persistHistory';
const HISTORY_KEY = 'dnd.rollHistory';
const HISTORY_LIMIT = 100;

export const DEFAULT_STATS: ModifierContext = {
  name: 'Active stats',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencyBonus: 2,
  skillProficiencies: [],
  saveProficiencies: [],
  spellcastingAbility: null,
  level: 1,
};

interface DiceContextValue {
  stats: ModifierContext;
  setStats: (s: ModifierContext) => void;
  history: RollResult[];
  pushRolls: (rolls: RollResult | RollResult[]) => void;
  clearHistory: () => void;
  persist: boolean;
  setPersist: (p: boolean) => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ActiveStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<ModifierContext>(() => load(STATS_KEY, DEFAULT_STATS));
  const [persist, setPersistState] = useState<boolean>(() => load(PERSIST_KEY, false));
  const [history, setHistory] = useState<RollResult[]>(() => (load(PERSIST_KEY, false) ? load(HISTORY_KEY, []) : []));

  // Persist active stats whenever they change (always — it's config, not a log).
  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  // Mirror history to storage only while persistence is enabled.
  useEffect(() => {
    if (persist) localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, persist]);

  function setPersist(p: boolean) {
    setPersistState(p);
    localStorage.setItem(PERSIST_KEY, JSON.stringify(p));
    if (p) localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    else localStorage.removeItem(HISTORY_KEY);
  }

  function pushRolls(rolls: RollResult | RollResult[]) {
    const incoming = Array.isArray(rolls) ? rolls : [rolls];
    if (incoming.length === 0) return;
    setHistory((prev) => [...incoming, ...prev].slice(0, HISTORY_LIMIT));
  }

  function clearHistory() {
    setHistory([]);
    if (persist) localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <DiceContext.Provider value={{ stats, setStats, history, pushRolls, clearHistory, persist, setPersist }}>
      {children}
    </DiceContext.Provider>
  );
}

export function useDiceContext(): DiceContextValue {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error('useDiceContext must be used within <ActiveStatsProvider>');
  return ctx;
}
