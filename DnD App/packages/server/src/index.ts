/**
 * D&D multiplayer backend entry point (skeleton).
 * Fastify HTTP server + Socket.IO realtime, sharing one HTTP listener.
 */
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { attachSocket } from './socket/index.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(healthRoutes);

  // Bind Socket.IO to Fastify's underlying HTTP server.
  await app.ready();
  attachSocket(app.server);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`D&D server listening on http://localhost:${PORT} (REST + Socket.IO)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
