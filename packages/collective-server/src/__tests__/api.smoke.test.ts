import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../index.js';

const dbEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const hasDbEnv = dbEnv.every((key) => process.env[key] && process.env[key] !== '');

let canConnect = false;
if (hasDbEnv) {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 500,
    });
    await client.connect();
    await client.end();
    canConnect = true;
  } catch {
    canConnect = false;
  }
}

const maybeDescribe = canConnect ? describe : describe.skip;

maybeDescribe('API smoke', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer({
      port: 0,
      host: '127.0.0.1',
      jwtSecret: process.env.JWT_SECRET || 'dev-secret',
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'cocode',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DB_SSL === 'true',
      },
      cors: {
        origin: '*',
      },
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and creates an invite-only channel', async () => {
    const ts = Date.now();
    const emailA = `smoke-a-${ts}@test.local`;
    const emailB = `smoke-b-${ts}@test.local`;

    const registerA = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: emailA, password: 'password123', name: 'Smoke A' },
    });

    expect(registerA.statusCode).toBe(200);
    const bodyA = registerA.json() as { token: string };
    expect(bodyA.token).toBeTruthy();

    const registerB = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: emailB, password: 'password123', name: 'Smoke B' },
    });
    expect(registerB.statusCode).toBe(200);
    const bodyB = registerB.json() as { token: string };

    const createChannel = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { Authorization: `Bearer ${bodyA.token}` },
      payload: {
        name: `invite-only-${ts}`,
        description: 'Smoke invite-only',
        visibility: 'invite-only',
      },
    });

    expect(createChannel.statusCode).toBe(200);
    const channel = createChannel.json() as {
      channel: { id: string; visibility?: string };
    };
    expect(channel.channel.visibility).toBe('invite-only');

    const joinAttempt = await app.inject({
      method: 'POST',
      url: `/channels/${channel.channel.id}/join`,
      headers: { Authorization: `Bearer ${bodyB.token}` },
      payload: {},
    });

    expect(joinAttempt.statusCode).toBe(403);
  });
});
