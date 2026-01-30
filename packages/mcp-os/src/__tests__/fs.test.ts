import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { editFile, readFile, writeFile } from '../fs.js';

const tmpDir = path.join(process.cwd(), 'tmp-test');
const filePath = path.join(tmpDir, 'sample.txt');

describe('mcp-os fs helpers', () => {
  it('writes, reads, and edits files', async () => {
    await writeFile(filePath, 'hello world');
    const content = await readFile(filePath);
    expect(content).toBe('hello world');

    const result = await editFile(filePath, 'world', 'agent');
    expect(result.replaced).toBe(1);

    const updated = await readFile(filePath);
    expect(updated).toBe('hello agent');

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
