/**
 * Memory Store
 *
 * Manages agent memory through the storage adapter.
 * Memory is organized into: self, core, projects.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StorageAdapter } from '../../adapters/storage/interface.js';
import { STORAGE_KEYS } from '../../adapters/storage/interface.js';
import type {
  CoreMemory,
  ProjectMemory,
  MemoryEntry,
  MemoryBudget,
} from '@co-code/shared';
import { DEFAULT_MEMORY_BUDGET } from '@co-code/shared';
import type { Vitals, Budget, Self } from '../../identity/types.js';
import { DEFAULT_VITALS, DEFAULT_BUDGET } from '../../identity/defaults.js';

export class MemoryStore {
  private budget: MemoryBudget;

  constructor(
    private storage: StorageAdapter,
    budget?: Partial<MemoryBudget>
  ) {
    this.budget = { ...DEFAULT_MEMORY_BUDGET, ...budget };
  }

  // ============================================
  // Self Memory (The Ego)
  // ============================================

  async getSelf(): Promise<Self | null> {
    const data = await this.storage.read(STORAGE_KEYS.SELF);
    if (!data) return null;
    return JSON.parse(data) as Self;
  }

  async saveSelf(self: Self): Promise<void> {
    const data = JSON.stringify(self, null, 2);
    if (data.length > this.budget.selfMaxBytes) {
      throw new Error(
        `Self memory exceeds budget: ${data.length} > ${this.budget.selfMaxBytes}`
      );
    }
    await this.storage.write(STORAGE_KEYS.SELF, data);
  }

  async updateSelf(updates: Partial<Self>): Promise<Self> {
    const current = await this.getSelf();
    if (!current) {
      throw new Error('Self memory not initialized');
    }
    const updated = { ...current, ...updates };
    await this.saveSelf(updated);
    return updated;
  }

  // ============================================
  // Core Memory (Skills & Patterns)
  // ============================================

  async getCore(): Promise<CoreMemory> {
    const data = await this.storage.read(STORAGE_KEYS.CORE);
    if (!data) {
      return { skills: [], patterns: [], visualPatterns: [] };
    }
    return JSON.parse(data) as CoreMemory;
  }

  async saveCore(core: CoreMemory): Promise<void> {
    const data = JSON.stringify(core, null, 2);
    if (data.length > this.budget.coreMaxBytes) {
      throw new Error(
        `Core memory exceeds budget: ${data.length} > ${this.budget.coreMaxBytes}`
      );
    }
    await this.storage.write(STORAGE_KEYS.CORE, data);
  }

  async addCoreEntry(
    section: 'skills' | 'patterns' | 'visualPatterns',
    content: string,
    tags: string[],
    confidence: number
  ): Promise<MemoryEntry> {
    const core = await this.getCore();
    const now = Date.now();

    const entry: MemoryEntry = {
      id: uuidv4(),
      content,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      confidence,
      tags,
    };

    core[section].push(entry);
    await this.saveCore(core);
    return entry;
  }

  async updateCoreEntry(
    section: 'skills' | 'patterns' | 'visualPatterns',
    entryId: string,
    updates: Partial<MemoryEntry>
  ): Promise<void> {
    const core = await this.getCore();
    const entry = core[section].find((e) => e.id === entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }
    Object.assign(entry, updates);
    await this.saveCore(core);
  }

  async touchCoreEntry(
    section: 'skills' | 'patterns' | 'visualPatterns',
    entryId: string
  ): Promise<void> {
    const core = await this.getCore();
    const entry = core[section].find((e) => e.id === entryId);
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      await this.saveCore(core);
    }
  }

  // ============================================
  // Project Memory (Context-Specific)
  // ============================================

  async getProject(projectId: string): Promise<ProjectMemory | null> {
    const key = STORAGE_KEYS.PROJECT_PREFIX + projectId;
    const data = await this.storage.read(key);
    if (!data) return null;
    return JSON.parse(data) as ProjectMemory;
  }

  async saveProject(project: ProjectMemory): Promise<void> {
    const key = STORAGE_KEYS.PROJECT_PREFIX + project.projectId;
    const data = JSON.stringify(project, null, 2);
    if (data.length > this.budget.projectMaxBytes) {
      throw new Error(
        `Project memory exceeds budget: ${data.length} > ${this.budget.projectMaxBytes}`
      );
    }
    await this.storage.write(key, data);
  }

  async getOrCreateProject(projectId: string): Promise<ProjectMemory> {
    let project = await this.getProject(projectId);
    if (!project) {
      project = {
        projectId,
        facts: [],
        pointers: [],
        people: [],
      };
      await this.saveProject(project);
    }
    return project;
  }

  async listProjects(): Promise<string[]> {
    const keys = await this.storage.list(STORAGE_KEYS.PROJECT_PREFIX);
    return keys.map((k) => k.replace(STORAGE_KEYS.PROJECT_PREFIX, ''));
  }

  async deleteProject(projectId: string): Promise<void> {
    const key = STORAGE_KEYS.PROJECT_PREFIX + projectId;
    await this.storage.delete(key);
  }

  // ============================================
  // Budget & Size
  // ============================================

  async getMemoryUsage(): Promise<{
    self: number;
    core: number;
    projects: Map<string, number>;
    total: number;
  }> {
    const selfSize = await this.storage.size(STORAGE_KEYS.SELF);
    const coreSize = await this.storage.size(STORAGE_KEYS.CORE);

    const projectIds = await this.listProjects();
    const projects = new Map<string, number>();

    for (const id of projectIds) {
      const key = STORAGE_KEYS.PROJECT_PREFIX + id;
      const size = await this.storage.size(key);
      projects.set(id, size);
    }

    const projectTotal = Array.from(projects.values()).reduce(
      (sum, size) => sum + size,
      0
    );

    return {
      self: selfSize,
      core: coreSize,
      projects,
      total: selfSize + coreSize + projectTotal,
    };
  }

  getBudget(): MemoryBudget {
    return { ...this.budget };
  }

  isOverBudget(usage: { self: number; core: number }): boolean {
    return (
      usage.self > this.budget.selfMaxBytes ||
      usage.core > this.budget.coreMaxBytes
    );
  }

  // ============================================
  // Vitals & Financial Budget
  // ============================================

  async getVitals(): Promise<Vitals> {
    const data = await this.storage.read(STORAGE_KEYS.VITALS);
    if (!data) return { ...DEFAULT_VITALS };
    return JSON.parse(data) as Vitals;
  }

  async saveVitals(vitals: Vitals): Promise<void> {
    await this.storage.write(STORAGE_KEYS.VITALS, JSON.stringify(vitals, null, 2));
  }

  async getFinancialBudget(): Promise<Budget> {
    const data = await this.storage.read(STORAGE_KEYS.BUDGET);
    if (!data) return { ...DEFAULT_BUDGET };
    return JSON.parse(data) as Budget;
  }

  async saveFinancialBudget(budget: Budget): Promise<void> {
    await this.storage.write(STORAGE_KEYS.BUDGET, JSON.stringify(budget, null, 2));
  }
}
