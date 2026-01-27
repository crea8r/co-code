import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as keys from '../../core/identity/keys.js';
import { IdentityLoader } from '../loader.js';
import { generateBirthTraits } from '../defaults.js';

vi.mock('node:fs/promises');
vi.mock('../../core/identity/keys.js');

describe('IdentityLoader', () => {
  const mockAgentPath = '/mock/agent';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadAgent', () => {
    it('should load agent with defaults when files are missing', async () => {
      // Mock fs.readFile to throw (simulate missing files)
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
      
      // Mock readdir for memories
      vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

      const loader = new IdentityLoader(mockAgentPath);
      const state = await loader.loadAgent();

      expect(state.agentPath).toBe(mockAgentPath);
      expect(state.self.identity.name).toBe('Unnamed Agent'); // Default
      expect(state.soul.integritySignature).toBe('');
      
      const issues = loader.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].usedDefault).toBe(true);
    });

    it('should load self components correctly', async () => {
      // Mock stat to avoid errors
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      // Setup mock file content
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const p = filePath as string;
        if (p.endsWith('identity.yaml')) return 'name: Test Agent\norigin: Test Lab';
        if (p.endsWith('values.yaml')) return 'principles: [truth]';
        // Return empty object for others to avoid ENOENT flow in this specific test
        return '{}';
      });
      
      vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

      const loader = new IdentityLoader(mockAgentPath);
      const state = await loader.loadAgent();

      expect(state.self.identity.name).toBe('Test Agent');
      expect(state.self.values.principles).toContain('truth');
    });
  });

  describe('Soul Integrity', () => {
    it('should verify valid soul signature', async () => {
      const mockPublicKey = 'pubkey';
      const mockPrivateKey = 'privkey';
      
      // key loading mock
      vi.mocked(keys.loadPrivateKey).mockResolvedValue(mockPrivateKey);
      vi.mocked(keys.sign).mockResolvedValue('valid_sig');

      // file mock
      vi.mocked(fs.readFile).mockResolvedValue(`
        birthTraits: {}
        integritySignature: valid_sig
      `);

      const loader = new IdentityLoader(mockAgentPath);
      const isValid = await loader.verifySoulIntegrity();

      expect(isValid).toBe(true);
      expect(keys.sign).toHaveBeenCalled();
    });

    it('should fail on invalid signature', async () => {
      // file mock
      vi.mocked(fs.readFile).mockResolvedValue(`
        birthTraits: {}
        integritySignature: bad_sig
      `);
      
      vi.mocked(keys.loadPrivateKey).mockResolvedValue('privkey');
      vi.mocked(keys.sign).mockResolvedValue('valid_sig'); // Sign produces X, file has Y

      const loader = new IdentityLoader(mockAgentPath);
      const isValid = await loader.verifySoulIntegrity();

      expect(isValid).toBe(false);
    });
  });
});
