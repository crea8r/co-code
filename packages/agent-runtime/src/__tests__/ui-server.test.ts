import { describe, expect, it } from 'vitest';
import { createRuntimeUiHandler } from '../ui/server.js';

describe('runtime ui server', () => {
  it('serves health and status endpoints', async () => {
    const handler = createRuntimeUiHandler(
      {
        getStatus: () => ({
          agentId: 'agent-1',
          connected: false,
          attention: 'idle',
          queueSize: 0,
          lastMentionChannel: null,
        }),
        getIdentitySummary: async () => ({
          name: 'Test Agent',
        }),
        getMessages: () => [],
        getQueuedMentions: () => [],
        connect: async () => undefined,
        disconnect: async () => undefined,
        setPresence: () => undefined,
        joinChannel: () => undefined,
        sendMessage: () => undefined,
      }
    );

    const run = async (url: string) => {
      const req = {
        url,
        method: 'GET',
        on: () => undefined,
      };
      const res: {
        statusCode?: number;
        headers?: Record<string, string>;
        body?: string;
        writeHead: (status: number, headers: Record<string, string>) => void;
        end: (body: string) => void;
      } = {
        writeHead: (status, headers) => {
          res.statusCode = status;
          res.headers = headers;
        },
        end: (body) => {
          res.body = body;
        },
      };

      await handler(req as never, res as never);
      return res;
    };

    const health = await run('/health');
    const status = await run('/status');

    expect(JSON.parse(health.body ?? '{}').ok).toBe(true);
    expect(JSON.parse(status.body ?? '{}').agentId).toBe('agent-1');
  });
});
