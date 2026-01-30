import { describe, expect, it } from 'vitest';
import { runCommand } from '../shell.js';


describe('mcp-os shell helpers', () => {
  it('runs commands and captures stdout', async () => {
    const result = await runCommand('echo "hello"');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  });
});
