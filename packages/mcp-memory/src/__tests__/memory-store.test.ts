import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { FileMemoryStore } from '../memory-store.js';

const tmpDir = path.join(process.cwd(), 'tmp-test');
const filePath = path.join(tmpDir, 'memory.json');

describe('FileMemoryStore', () => {
  it('adds and searches entries', async () => {
    const store = new FileMemoryStore(filePath);

    await store.addEntry({
      id: '1',
      content: 'Agent learned about memory retention',
      tags: ['memory', 'learning'],
      createdAt: Date.now(),
    });

    await store.addEntry({
      id: '2',
      content: 'Curiosity prompt about systems',
      tags: ['curiosity'],
      createdAt: Date.now(),
    });

    const results = await store.search('memory', 10);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');

    const listAll = await store.list(10);
    expect(listAll).toHaveLength(2);

    const listFiltered = await store.list(10, 'learning');
    expect(listFiltered).toHaveLength(1);
    expect(listFiltered[0].id).toBe('1');

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
