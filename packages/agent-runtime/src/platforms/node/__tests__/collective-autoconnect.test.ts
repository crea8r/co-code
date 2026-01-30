import { afterAll, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createAgent } from '../index.js';
import { NodeStorageAdapter } from '../../../adapters/storage/node.js';
import { DEFAULT_SELF } from '../../../identity/defaults.js';
import { generateKeyPair } from '../../../core/identity/keys.js';

describe('createAgent', () => {
  let wss: WebSocketServer | null = null;

  afterAll(async () => {
    if (wss) {
      await new Promise<void>((resolve) => wss?.close(() => resolve()));
    }
  });

  it('auto-connects to collective when collectiveUrl is provided', async () => {
    wss = new WebSocketServer({ port: 0 });
    const address = wss.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to start WebSocket server');
    }

    let authenticated = false;
    wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'authenticate') {
          authenticated = true;
          socket.send(JSON.stringify({ type: 'authenticated', success: true }));
        }
      });
    });

    const agentId = 'agent-autoconnect-test';
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'co-code-agent-'));
    const storage = new NodeStorageAdapter(agentId, dataDir);
    const keyPair = generateKeyPair(agentId);
    await storage.write('identity/private_key', JSON.stringify(keyPair, null, 2));
    await storage.write('memory/self', JSON.stringify(DEFAULT_SELF, null, 2));
    await storage.write(
      'identity/config',
      JSON.stringify(
        {
          agentId,
          token: 'test-token',
          collectiveUrl: `ws://127.0.0.1:${address.port}`,
        },
        null,
        2
      )
    );

    const { agent, connection } = await createAgent({
      agentId,
      dataDir,
      collectiveUrl: `ws://127.0.0.1:${address.port}`,
      llm: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-5',
      },
    });

    // Allow the ws auth handshake to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(authenticated).toBe(true);
    expect(agent.getState().connected).toBe(true);

    connection?.disconnect();
    await agent.shutdown();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
});
