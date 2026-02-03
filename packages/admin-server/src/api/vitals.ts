import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as vitalsService from '../vitals/service.js';
import * as authService from '../auth/service.js';
import type { EntityType } from '@co-code/shared';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    type: EntityType;
  };
}

export function registerVitalsRoutes(app: FastifyInstance): void {
  app.get(
    '/agents/:id/vitals/cycles',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const { limit } = request.query as { limit?: string };

      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const cycles = await vitalsService.listCycles(id, limit ? parseInt(limit, 10) : 30);
      return { cycles };
    }
  );

  app.post(
    '/agents/:id/vitals/cycles',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const body = z
        .object({
          wakeAt: z.string(),
          sleepAt: z.string(),
          beforeSleep: z.record(z.unknown()),
          afterSleep: z.record(z.unknown()),
          modelsUsed: z.record(z.number()).default({}),
          budget: z.record(z.number()).default({}),
        })
        .parse(request.body);

      const cycle = await vitalsService.insertCycle(id, body);
      return { cycle };
    }
  );

  app.get(
    '/agents/:id/vitals/current',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const current = await vitalsService.getCurrent(id);
      return { current };
    }
  );

  app.post(
    '/agents/:id/vitals/current',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const body = z
        .object({
          state: z.record(z.unknown()),
        })
        .parse(request.body);

      const current = await vitalsService.upsertCurrent(id, body.state);
      return { current };
    }
  );
}
