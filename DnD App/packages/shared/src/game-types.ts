/**
 * Dynamic multiplayer game state — the data that lives on the backend server
 * and is synced between the DM and players. Phase 1 only defines the shapes;
 * the realtime features that use them are built later.
 */

export interface GameSession {
  id: string;
  name: string;
  dmUserId: string;
  joinCode: string;
  createdAt: string;
}

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: string[];
  isPlayer: boolean;
}

export interface CombatState {
  sessionId: string;
  round: number;
  activeCombatantId: string | null;
  combatants: Combatant[];
}

export interface DiceRollEvent {
  id: string;
  sessionId: string;
  userId: string;
  label: string;
  expression: string; // e.g. "2d6+3"
  rolls: number[];
  total: number;
  rolledAt: string;
}
