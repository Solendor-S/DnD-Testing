/**
 * Typed Socket.IO event contracts shared by client and server. This is the
 * single source of truth that makes the multiplayer wire typesafe on both ends.
 * Phase 1: contracts defined; handlers are stubs on the server.
 */

import type { CombatState, DiceRollEvent, GameSession } from './game-types.js';

export interface ServerToClientEvents {
  'session:joined': (session: GameSession) => void;
  'session:error': (message: string) => void;
  'combat:update': (state: CombatState) => void;
  'dice:rolled': (roll: DiceRollEvent) => void;
}

export interface ClientToServerEvents {
  'session:join': (payload: { joinCode: string; userId: string }) => void;
  'session:leave': (payload: { sessionId: string }) => void;
  'combat:updateHp': (payload: { combatantId: string; hp: number }) => void;
  'dice:roll': (payload: { sessionId: string; userId: string; label: string; expression: string }) => void;
}

export interface SocketData {
  userId: string;
  sessionId: string | null;
}
