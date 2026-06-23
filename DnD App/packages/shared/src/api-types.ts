/**
 * REST API request/response contracts between client and server.
 * Phase 1: only the health check is implemented server-side.
 */

import type { GameSession } from './game-types.js';

export interface HealthResponse {
  status: 'ok';
  version: string;
  uptime: number;
}

export interface CreateSessionRequest {
  name: string;
  dmUserId: string;
}

export interface CreateSessionResponse {
  session: GameSession;
}
