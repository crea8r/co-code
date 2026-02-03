/**
 * REST API Routes
 *
 * Admin server routes for agent creation, management, and credits.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { schemas } from '@co-code/shared';
import * as authService from '../auth/service.js';
import * as creditsService from '../credits/service.js';
import * as destinationsService from '../destinations/service.js';
import type { EntityType } from '@co-code/shared';
import { z } from 'zod';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    type: EntityType;
  };
}

export function registerRoutes(app: FastifyInstance): void {
  // ============================================
  // AUTH ROUTES
  // ============================================

  // Register
  app.post('/auth/register', async (request, reply) => {
    const body = schemas.RegisterRequestSchema.parse(request.body);

    try {
      const user = await authService.registerUser(
        body.email,
        body.password,
        body.name
      );

      const token = app.jwt.sign({
        sub: user.id,
        type: 'user' as EntityType,
      });

      return { user, token };
    } catch (error) {
      if ((error as Error).message === 'Email already registered') {
        return reply.status(400).send({ error: 'Email already registered' });
      }
      throw error;
    }
  });

  // Login
  app.post('/auth/login', async (request, reply) => {
    const body = schemas.LoginRequestSchema.parse(request.body);

    const user = await authService.authenticateUser(body.email, body.password);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({
      sub: user.id,
      type: 'user' as EntityType,
    });

    return { user, token };
  });

  // Get current user
  app.get(
    '/auth/me',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;

      if (req.user.type === 'user') {
        const user = await authService.getUserById(req.user.sub);
        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }
        return { user };
      } else {
        const agent = await authService.getAgentById(req.user.sub);
        if (!agent) {
          return reply.status(404).send({ error: 'Agent not found' });
        }
        return { agent };
      }
    }
  );

  // ============================================
  // AGENT ROUTES
  // ============================================

  // Create agent
  app.post(
    '/agents',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;
      if (req.user.type !== 'user') {
        return reply.status(403).send({ error: 'Only users can create agents' });
      }

      const body = schemas.CreateAgentRequestSchema.parse(request.body);

      // Generate temporary ID (will be replaced by agent runtime)
      const { v4: uuidv4 } = await import('uuid');
      const agentId = uuidv4();

      // Generate placeholder public key (agent will replace with real one)
      const publicKey = 'placeholder-' + agentId;

      const agent = await authService.registerAgent(
        agentId,
        body.name,
        publicKey,
        req.user.sub,
        {
          selfIdentity: body.selfIdentity,
          selfValues: body.selfValues,
          selfCuriosity: body.selfCuriosity,
          styleTone: body.styleTone,
          styleEmojiUsage: body.styleEmojiUsage,
          styleFavoriteEmoji: body.styleFavoriteEmoji,
          avatarColors: body.avatarColors,
          avatarExpression: body.avatarExpression,
        }
      );

      // Generate agent token (long-lived)
      const token = app.jwt.sign(
        {
          sub: agent.id,
          type: 'agent' as EntityType,
        },
        { expiresIn: '7d' }
      );

      return { agent, token };
    }
  );

  // Get agent
  app.get('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await authService.getAgentById(id);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return { agent };
  });

  // Get agent config (for runtime)
  app.get(
    '/agents/:id/config',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      // Only agent itself or creator can get config
      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const config = await authService.getAgentConfig(id);
      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      return { config };
    }
  );

  // List my agents
  app.get(
    '/agents',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;
      if (req.user.type !== 'user') {
        return reply.status(403).send({ error: 'Only users can list agents' });
      }

      const agents = await authService.getAgentsByCreator(req.user.sub);
      return { agents };
    }
  );

  // List destination configs for agent (creator or agent)
  app.get(
    '/agents/:id/destinations',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (req.user.sub !== id) {
        const agent = await authService.getAgentById(id);
        if (!agent || agent.creatorId !== req.user.sub) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const destinations = await destinationsService.listDestinationConfigs(id);
      return { destinations };
    }
  );

  // Upsert destination config
  app.post(
    '/agents/:id/destinations',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
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
          destination: z.string().min(1),
          policy: z.record(z.unknown()).default({}),
          config: z.record(z.unknown()).default({}),
        })
        .parse(request.body);

      const destination = await destinationsService.upsertDestinationConfig(
        id,
        body.destination,
        body.policy,
        body.config
      );

      return { destination };
    }
  );

  // ============================================
  // CREDIT ROUTES
  // ============================================

  // Get my balance
  app.get(
    '/credits/balance',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const req = request as AuthenticatedRequest;
      const balance = await creditsService.getBalance(req.user.sub, req.user.type);
      return { balance };
    }
  );

  // Transfer credits
  app.post(
    '/credits/transfer',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const req = request as AuthenticatedRequest;
      const body = schemas.TransferCreditsRequestSchema.parse(request.body);

      try {
        const transaction = await creditsService.transferCredits(
          req.user.sub,
          req.user.type,
          body.toId,
          body.toType,
          body.amount,
          body.memo
        );

        const newBalance = await creditsService.getBalance(req.user.sub, req.user.type);

        return { transaction, newBalance };
      } catch (error) {
        if ((error as Error).message === 'Insufficient balance') {
          return reply.status(400).send({ error: 'Insufficient balance' });
        }
        throw error;
      }
    }
  );

  // Mint credits (simplified - would need payment integration)
  app.post(
    '/credits/mint',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const req = request as AuthenticatedRequest;
      const body = schemas.MintCreditsRequestSchema.parse(request.body);

      // In production, this would process payment first
      const transaction = await creditsService.mintCredits(
        req.user.sub,
        req.user.type,
        body.amount
      );

      const newBalance = await creditsService.getBalance(req.user.sub, req.user.type);

      return { transaction, newBalance };
    }
  );

  // Get transaction history
  app.get(
    '/credits/history',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const req = request as AuthenticatedRequest;
      const { limit, offset } = request.query as { limit?: string; offset?: string };

      const transactions = await creditsService.getTransactionHistory(
        req.user.sub,
        req.user.type,
        limit ? parseInt(limit, 10) : 50,
        offset ? parseInt(offset, 10) : 0
      );

      return { transactions };
    }
  );

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });
}
