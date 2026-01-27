/**
 * Identity Loader
 *
 * Loads agent identity from disk. Never fails - uses defaults when needed.
 *
 * PHILOSOPHY:
 * - Important info loaded immediately (soul, self, budget, providers)
 * - Summaries as direction for the day
 * - Fetch details on demand
 * - Recent N experiences (short-term memory)
 * - Hot reload with debounce
 * - Never fail - use defaults, ask for help
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  Soul,
  Self,
  Vitals,
  Budget,
  Providers,
  Relationships,
  AgentLoadedState,
  Experience,
  MemorySummary,
  BirthTraits,
} from './types.js';
import {
  DEFAULT_SELF,
  DEFAULT_VITALS,
  DEFAULT_BUDGET,
  DEFAULT_PROVIDERS,
  DEFAULT_RELATIONSHIPS,
  withNestedDefaults,
  generateBirthTraits,
} from './defaults.js';
import { sign, loadPrivateKey } from '../core/identity/keys.js';

// ============================================================================
// TYPES
// ============================================================================

interface LoaderOptions {
  /** Number of recent experiences to load */
  recentExperiencesLimit?: number;
  /** Enable hot reload watching */
  enableHotReload?: boolean;
  /** Debounce time for hot reload (ms) */
  hotReloadDebounceMs?: number;
}

interface LoadIssue {
  file: string;
  error: string;
  usedDefault: boolean;
  timestamp: string;
}

// ============================================================================
// IDENTITY LOADER CLASS
// ============================================================================

export class IdentityLoader {
  private agentPath: string;
  private options: Required<LoaderOptions>;
  private lastModified: Map<string, number> = new Map();
  private issues: LoadIssue[] = [];

  constructor(agentPath: string, options: LoaderOptions = {}) {
    this.agentPath = agentPath;
    this.options = {
      recentExperiencesLimit: options.recentExperiencesLimit ?? 20,
      enableHotReload: options.enableHotReload ?? false,
      hotReloadDebounceMs: options.hotReloadDebounceMs ?? 1000,
    };
  }

  // ==========================================================================
  // MAIN LOAD METHOD
  // ==========================================================================

  /**
   * Load full agent state from disk.
   * Never throws - returns state with defaults for missing/invalid data.
   */
  async loadAgent(): Promise<AgentLoadedState> {
    this.issues = []; // Reset issues for this load

    const [soul, self, vitals, budget, providers, relationships] =
      await Promise.all([
        this.loadSoul(),
        this.loadSelf(),
        this.loadVitals(),
        this.loadBudget(),
        this.loadProviders(),
        this.loadRelationships(),
      ]);

    const [recentExperiences, memorySummaries] = await Promise.all([
      this.loadRecentExperiences(this.options.recentExperiencesLimit),
      this.loadMemorySummaries(),
    ]);

    return {
      agentPath: this.agentPath,
      soul,
      self,
      vitals,
      budget,
      providers,
      relationships,
      recentExperiences,
      memorySummaries,
    };
  }

  /**
   * Get issues encountered during loading.
   */
  getIssues(): LoadIssue[] {
    return [...this.issues];
  }

  // ==========================================================================
  // INDIVIDUAL LOADERS
  // ==========================================================================

  private async loadSoul(): Promise<Soul> {
    const birthPath = path.join(this.agentPath, 'soul', 'birth.yaml');

    try {
      const birthYaml = await fs.readFile(birthPath, 'utf-8');
      const birth = parseYaml(birthYaml) as {
        birthTraits?: BirthTraits;
        integritySignature?: string;
      };

      return {
        birthTraits: birth.birthTraits ?? generateBirthTraits(),
        integritySignature: birth.integritySignature ?? '',
      };
    } catch (error) {
      this.logIssue(birthPath, error, true);

      // Soul missing is serious but we can create defaults
      return {
        birthTraits: generateBirthTraits(),
        integritySignature: '',
      };
    }
  }

  private async loadSelf(): Promise<Self> {
    const selfDir = path.join(this.agentPath, 'self');

    try {
      const [identity, values, curiosity, style, goals] = await Promise.all([
        this.loadYamlWithDefaults(
          path.join(selfDir, 'identity.yaml'),
          DEFAULT_SELF.identity
        ),
        this.loadYamlWithDefaults(
          path.join(selfDir, 'values.yaml'),
          DEFAULT_SELF.values
        ),
        this.loadYamlWithDefaults(
          path.join(selfDir, 'curiosity.yaml'),
          DEFAULT_SELF.curiosity
        ),
        this.loadYamlWithDefaults(
          path.join(selfDir, 'style.yaml'),
          DEFAULT_SELF.style
        ),
        this.loadYamlWithDefaults(
          path.join(selfDir, 'goals.yaml'),
          DEFAULT_SELF.goals
        ),
      ]);

      return { identity, values, curiosity, style, goals };
    } catch (error) {
      this.logIssue(selfDir, error, true);
      return DEFAULT_SELF;
    }
  }

  private async loadVitals(): Promise<Vitals> {
    const vitalsPath = path.join(this.agentPath, 'vitals.yaml');
    return this.loadYamlWithDefaults(vitalsPath, DEFAULT_VITALS);
  }

  private async loadBudget(): Promise<Budget> {
    const budgetPath = path.join(this.agentPath, 'budget.yaml');
    return this.loadYamlWithDefaults(budgetPath, DEFAULT_BUDGET);
  }

  private async loadProviders(): Promise<Providers> {
    const providersPath = path.join(this.agentPath, 'providers.yaml');
    return this.loadYamlWithDefaults(providersPath, DEFAULT_PROVIDERS);
  }

  private async loadRelationships(): Promise<Relationships> {
    const relationshipsDir = path.join(this.agentPath, 'relationships');

    try {
      const [humans, agents] = await Promise.all([
        this.loadYamlWithDefaults(
          path.join(relationshipsDir, 'humans.yaml'),
          DEFAULT_RELATIONSHIPS.humans
        ),
        this.loadYamlWithDefaults(
          path.join(relationshipsDir, 'agents.yaml'),
          DEFAULT_RELATIONSHIPS.agents
        ),
      ]);

      return { humans, agents };
    } catch {
      return DEFAULT_RELATIONSHIPS;
    }
  }

  private async loadRecentExperiences(limit: number): Promise<Experience[]> {
    const experiencesDir = path.join(this.agentPath, 'memories', 'experiences');

    try {
      const files = await fs.readdir(experiencesDir);
      const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort().reverse();
      const recentFiles = yamlFiles.slice(0, limit);

      const experiences: Experience[] = [];
      for (const file of recentFiles) {
        try {
          const content = await fs.readFile(
            path.join(experiencesDir, file),
            'utf-8'
          );
          const exp = parseYaml(content) as Experience;
          if (exp && exp.id) {
            experiences.push(exp);
          }
        } catch {
          // Skip invalid experience files
        }
      }

      return experiences;
    } catch {
      return [];
    }
  }

  private async loadMemorySummaries(): Promise<MemorySummary[]> {
    const summariesPath = path.join(
      this.agentPath,
      'memories',
      'summaries.yaml'
    );

    try {
      const content = await fs.readFile(summariesPath, 'utf-8');
      const summaries = parseYaml(content) as MemorySummary[];
      return Array.isArray(summaries) ? summaries : [];
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async loadYamlWithDefaults<T>(
    filePath: string,
    defaults: T
  ): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseYaml(content) as Partial<T>;
      this.trackModified(filePath);

      if (typeof defaults === 'object' && defaults !== null && !Array.isArray(defaults)) {
        return withNestedDefaults(parsed, defaults as T & object) as T;
      }
      return (parsed ?? defaults) as T;
    } catch (error) {
      this.logIssue(filePath, error, true);
      return defaults;
    }
  }

  private trackModified(filePath: string): void {
    // Track file modification time for hot reload
    fs.stat(filePath)
      .then((stats) => {
        this.lastModified.set(filePath, stats.mtimeMs);
      })
      .catch(() => {
        // Ignore stat errors
      });
  }

  private logIssue(file: string, error: unknown, usedDefault: boolean): void {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    this.issues.push({
      file,
      error: errorMessage,
      usedDefault,
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // HOT RELOAD
  // ==========================================================================

  /**
   * Check for file changes since last load.
   * Returns list of changed file paths.
   */
  async checkForChanges(): Promise<string[]> {
    const changed: string[] = [];

    for (const [filePath, lastMtime] of this.lastModified) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs > lastMtime) {
          changed.push(filePath);
        }
      } catch {
        // File deleted or inaccessible
      }
    }

    return changed;
  }

  /**
   * Reload specific files that have changed.
   * Returns the reloaded data components.
   */
  async reloadChanged(
    files: string[]
  ): Promise<Partial<AgentLoadedState>> {
    const result: Partial<AgentLoadedState> = {};

    for (const file of files) {
      if (file.includes('/self/')) {
        result.self = await this.loadSelf();
      } else if (file.includes('vitals.yaml')) {
        result.vitals = await this.loadVitals();
      } else if (file.includes('budget.yaml')) {
        result.budget = await this.loadBudget();
      } else if (file.includes('providers.yaml')) {
        result.providers = await this.loadProviders();
      }
      // Note: Soul is immutable, never reloaded
    }

    return result;
  }

  // ==========================================================================
  // SOUL INTEGRITY
  // ==========================================================================

  /**
   * Verify soul integrity using private key signature.
   * Returns true if soul is intact, false if corrupted.
   */
  async verifySoulIntegrity(): Promise<boolean> {
    try {
      const birthPath = path.join(this.agentPath, 'soul', 'birth.yaml');
      const keyPath = path.join(this.agentPath, 'soul', 'private.pem');

      const birthYaml = await fs.readFile(birthPath, 'utf-8');
      const birth = parseYaml(birthYaml) as {
        birthTraits?: BirthTraits;
        integritySignature?: string;
      };

      if (!birth.integritySignature) {
        return false; // No signature to verify
      }

      // Load private key
      const privateKey = await loadPrivateKey(keyPath);
      if (!privateKey) {
        return false;
      }

      // Create data to sign (birth without signature)
      const birthData = {
        birthTraits: birth.birthTraits,
      };
      const dataString = JSON.stringify(birthData);

      // Sign and compare
      const actualSignature = await sign(dataString, privateKey);
      return actualSignature === birth.integritySignature;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Load agent identity from path. Convenience wrapper around IdentityLoader.
 */
export async function loadAgentIdentity(
  agentPath: string,
  options?: LoaderOptions
): Promise<AgentLoadedState> {
  const loader = new IdentityLoader(agentPath, options);
  return loader.loadAgent();
}
