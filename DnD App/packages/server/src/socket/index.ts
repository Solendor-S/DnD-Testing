/**
 * Socket.IO setup. Phase 1: registers typed handlers as stubs so the realtime
 * architecture (rooms-per-session) is in place. Real combat/dice/session logic
 * is built later against these same typed contracts.
 */
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '@dnd/shared';

export type GameSocketServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function attachSocket(httpServer: HttpServer): GameSocketServer {
  const io: GameSocketServer = new Server(httpServer, {
    cors: { origin: true },
  });

  io.on('connection', (socket) => {
    socket.data.sessionId = null;

    socket.on('session:join', ({ joinCode, userId }) => {
      // TODO: look up session by joinCode, validate, then join the room.
      socket.data.userId = userId;
      socket.join(`session:${joinCode}`);
      // socket.emit('session:joined', session) once persistence is wired.
    });

    socket.on('session:leave', ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('combat:updateHp', () => {
      // TODO: mutate combat state, broadcast 'combat:update' to the room.
    });

    socket.on('dice:roll', () => {
      // TODO: evaluate expression, broadcast 'dice:rolled' to the room.
    });

    socket.on('disconnect', () => {
      /* cleanup later */
    });
  });

  return io;
}
