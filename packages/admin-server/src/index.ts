/**
 * Admin Server
 *
 * Agent creation, CT scan, and wellbeing dashboard.
 * The observation deck for your agents.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { initDatabase, closeDatabase } from './db/client.js';
import { registerRoutes } from './api/routes.js';
import { registerVitalsRoutes } from './api/vitals.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; type: 'user' | 'agent' };
    user: { sub: string; type: 'user' | 'agent' };
  }
}

export interface ServerConfig {
  port: number;
  host: string;
  jwtSecret: string;
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
  cors?: {
    origin: string | string[];
  };
  serveStatic?: boolean;
}

export async function createServer(config: ServerConfig) {
  // Initialize database
  initDatabase(config.database);

  // Create Fastify instance
  const app = Fastify({
    logger: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: config.cors?.origin || true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: '24h',
    },
  });

  // Serve static files (built web UI)
  if (config.serveStatic !== false) {
    const webDir = resolve(__dirname, '../web');
    try {
      await app.register(fastifyStatic, {
        root: webDir,
        prefix: '/',
        wildcard: false,
      });

      // SPA fallback - serve index.html for non-API routes
      app.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/') ||
            request.url.startsWith('/auth/') ||
            request.url.startsWith('/agents/') ||
            request.url.startsWith('/credits/') ||
            request.url.startsWith('/vitals/') ||
            request.url.startsWith('/health')) {
          reply.status(404).send({ error: 'Not found' });
        } else {
          reply.sendFile('index.html');
        }
      });
    } catch {
      // Web files not built yet, skip static serving
      console.log('Web UI not built, skipping static file serving');
    }
  }

  // Authentication decorator
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Register routes
  registerRoutes(app);
  registerVitalsRoutes(app);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await app.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return app;
}

// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '55000', 10),
      database: process.env.DB_NAME || 'cocode',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  };

  createServer(config)
    .then((app) => {
      return app.listen({ port: config.port, host: config.host });
    })
    .then((address) => {
      console.log(`Admin server listening at ${address}`);
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}
