import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@dnd/shared';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      version: '0.1.0',
      uptime: process.uptime(),
    };
  });
}
