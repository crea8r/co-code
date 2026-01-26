import { describe, expect, it } from 'vitest';
import type { StorageAdapter } from '../../adapters/storage/interface.js';
import type { AgentSelf, CoreMemory } from '@co-code/shared';
import { MemoryStore } from '../memory/store.js';
import {
  derivePublicKey,
  generateKeyPair,
  sign,
  verify,
} from '../identity/keys.js';

class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async read(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async write(key: string, data: string): Promise<void> {
    this.store.set(key, data);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.store.keys()).filter((key) =>
      key.startsWith(prefix)
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async size(key: string): Promise<number> {
    const value = this.store.get(key);
    return value ? Buffer.byteLength(value, 'utf8') : 0;
  }

  async totalSize(): Promise<number> {
    let total = 0;
    for (const value of this.store.values()) {
      total += Buffer.byteLength(value, 'utf8');
    }
    return total;
  }
}

const sampleSelf: AgentSelf = {
  identity: 'A test agent',
  values: 'Reliability and clarity',
  curiosity: {
    questions: [],
    recentFindings: [],
  },
  goals: {
    short: 'Help with tests',
    long: 'Be dependable',
  },
  style: {
    tone: 'Concise',
    emojiUsage: 'minimal',
    favoriteEmoji: [],
  },
  avatar: {
    colors: ['#000000'],
    expression: 'focused',
  },
};

describe('MemoryStore', () => {
  it('saves and retrieves self memory', async () => {
    const storage = new InMemoryStorageAdapter();
    const store = new MemoryStore(storage);

    await store.saveSelf(sampleSelf);
    const loaded = await store.getSelf();

    expect(loaded).toEqual(sampleSelf);
  });

  it('returns default core memory when none exists', async () => {
    const storage = new InMemoryStorageAdapter();
    const store = new MemoryStore(storage);

    const core = await store.getCore();

    expect(core).toEqual({ skills: [], patterns: [], visualPatterns: [] });
  });

  it('saves and retrieves core memory', async () => {
    const storage = new InMemoryStorageAdapter();
    const store = new MemoryStore(storage);

    const core: CoreMemory = {
      skills: [],
      patterns: [
        {
          id: 'pattern-1',
          content: 'Test pattern',
          createdAt: 1,
          lastAccessedAt: 1,
          accessCount: 0,
          confidence: 0.8,
          tags: ['test'],
        },
      ],
      visualPatterns: [],
    };

    await store.saveCore(core);
    const loaded = await store.getCore();

    expect(loaded).toEqual(core);
  });
});

describe('Identity keys', () => {
  it('generates a key pair with valid hex values', () => {
    const keyPair = generateKeyPair();

    expect(keyPair.id.length).toBeGreaterThan(0);
    expect(keyPair.privateKey).toMatch(/^[0-9a-f]+$/);
    expect(keyPair.publicKey).toMatch(/^[0-9a-f]+$/);
    expect(keyPair.privateKey).toHaveLength(64);
    expect(keyPair.publicKey).toHaveLength(64);
    expect(keyPair.createdAt).toBeGreaterThan(0);
  });

  it('derives the same public key from the private key', () => {
    const keyPair = generateKeyPair();

    expect(derivePublicKey(keyPair.privateKey)).toBe(keyPair.publicKey);
  });

  it('signs and verifies messages', async () => {
    const keyPair = generateKeyPair();
    const message = 'hello runtime';

    const signature = await sign(message, keyPair.privateKey);

    expect(signature).toMatch(/^[0-9a-f]+$/);
    expect(signature).toHaveLength(128);
    await expect(verify(message, signature, keyPair.publicKey)).resolves.toBe(
      true
    );
    await expect(
      verify('different message', signature, keyPair.publicKey)
    ).resolves.toBe(false);
  });
});
