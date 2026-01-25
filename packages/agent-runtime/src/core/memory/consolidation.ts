/**
 * Memory Consolidation ("Sleep")
 *
 * Agent periodically consolidates memory:
 * 1. Summarize verbose memories
 * 2. Merge redundant patterns
 * 3. Promote/demote based on access
 * 4. Evict if over budget
 *
 * This is working on himself, not downtime.
 */

import type { MemoryStore } from './store.js';
import type { LLMProvider } from '../llm/provider.js';
import type { CoreMemory, MemoryEntry } from '@co-code/shared';

export interface ConsolidationResult {
  /** Number of entries summarized */
  summarized: number;
  /** Number of patterns merged */
  merged: number;
  /** Number of entries evicted */
  evicted: number;
  /** Bytes used after consolidation */
  bytesAfter: number;
  /** Time taken in ms */
  durationMs: number;
}

export interface ConsolidationConfig {
  /** Minimum age before an entry can be evicted (ms) */
  minAgeForEviction: number;
  /** Access count below which entry is considered cold */
  coldAccessThreshold: number;
  /** Maximum entries per section before forced consolidation */
  maxEntriesPerSection: number;
  /** Similarity threshold for merging (0-1) */
  mergeSimilarityThreshold: number;
}

const DEFAULT_CONFIG: ConsolidationConfig = {
  minAgeForEviction: 7 * 24 * 60 * 60 * 1000, // 7 days
  coldAccessThreshold: 2,
  maxEntriesPerSection: 100,
  mergeSimilarityThreshold: 0.8,
};

export class MemoryConsolidator {
  private config: ConsolidationConfig;

  constructor(
    private memory: MemoryStore,
    private llm: LLMProvider,
    config?: Partial<ConsolidationConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run full consolidation cycle
   */
  async consolidate(): Promise<ConsolidationResult> {
    const startTime = Date.now();
    let summarized = 0;
    let merged = 0;
    let evicted = 0;

    // 1. Get current state
    const core = await this.memory.getCore();
    const budget = this.memory.getBudget();

    // 2. Summarize verbose entries
    summarized += await this.summarizeSection(core, 'patterns');
    summarized += await this.summarizeSection(core, 'skills');

    // 3. Merge similar entries
    merged += await this.mergeSection(core, 'patterns');
    merged += await this.mergeSection(core, 'skills');

    // 4. Sort by hotness (access count * recency)
    this.sortByHotness(core.patterns);
    this.sortByHotness(core.skills);
    this.sortByHotness(core.visualPatterns);

    // 5. Evict if over budget
    const dataSize = JSON.stringify(core).length;
    if (dataSize > budget.coreMaxBytes) {
      evicted += await this.evictColdEntries(
        core,
        budget.coreMaxBytes
      );
    }

    // 6. Save consolidated memory
    await this.memory.saveCore(core);

    // 7. Calculate final size
    const bytesAfter = JSON.stringify(core).length;

    return {
      summarized,
      merged,
      evicted,
      bytesAfter,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Summarize verbose entries in a section
   */
  private async summarizeSection(
    core: CoreMemory,
    section: 'patterns' | 'skills'
  ): Promise<number> {
    const entries = core[section];
    let summarized = 0;

    for (const entry of entries) {
      // Skip if already short
      if (entry.content.length < 500) continue;

      // Summarize using LLM
      const summary = await this.llm.complete({
        systemPrompt:
          'You are a memory summarizer. Compress the following memory into a concise form while preserving key insights. Output only the summary, nothing else.',
        userMessage: entry.content,
        maxTokens: 200,
      });

      if (summary.length < entry.content.length * 0.7) {
        entry.content = summary;
        summarized++;
      }
    }

    return summarized;
  }

  /**
   * Merge similar entries in a section
   */
  private async mergeSection(
    core: CoreMemory,
    section: 'patterns' | 'skills'
  ): Promise<number> {
    const entries = core[section];
    if (entries.length < 2) return 0;

    let merged = 0;
    const toRemove: Set<string> = new Set();

    // Compare pairs and find similar ones
    for (let i = 0; i < entries.length; i++) {
      if (toRemove.has(entries[i].id)) continue;

      for (let j = i + 1; j < entries.length; j++) {
        if (toRemove.has(entries[j].id)) continue;

        const similarity = await this.calculateSimilarity(
          entries[i],
          entries[j]
        );

        if (similarity > this.config.mergeSimilarityThreshold) {
          // Merge j into i
          const mergedContent = await this.mergeEntries(
            entries[i],
            entries[j]
          );
          entries[i].content = mergedContent;
          entries[i].accessCount += entries[j].accessCount;
          entries[i].tags = [
            ...new Set([...entries[i].tags, ...entries[j].tags]),
          ];
          toRemove.add(entries[j].id);
          merged++;
        }
      }
    }

    // Remove merged entries
    core[section] = entries.filter((e) => !toRemove.has(e.id));
    return merged;
  }

  /**
   * Calculate similarity between two entries
   */
  private async calculateSimilarity(
    a: MemoryEntry,
    b: MemoryEntry
  ): Promise<number> {
    // Simple tag overlap + LLM similarity check
    const tagOverlap =
      a.tags.filter((t) => b.tags.includes(t)).length /
      Math.max(a.tags.length, b.tags.length, 1);

    if (tagOverlap < 0.3) return tagOverlap;

    // Use LLM for semantic similarity
    const response = await this.llm.complete({
      systemPrompt:
        'Compare these two memories and output a similarity score from 0.0 to 1.0. Output only the number.',
      userMessage: `Memory A: ${a.content}\n\nMemory B: ${b.content}`,
      maxTokens: 10,
    });

    const score = parseFloat(response);
    return isNaN(score) ? tagOverlap : (tagOverlap + score) / 2;
  }

  /**
   * Merge two entries into one
   */
  private async mergeEntries(
    a: MemoryEntry,
    b: MemoryEntry
  ): Promise<string> {
    const merged = await this.llm.complete({
      systemPrompt:
        'Merge these two related memories into a single, concise memory that captures the essence of both. Output only the merged memory.',
      userMessage: `Memory A: ${a.content}\n\nMemory B: ${b.content}`,
      maxTokens: 300,
    });
    return merged;
  }

  /**
   * Sort entries by hotness (most accessed + recent first)
   */
  private sortByHotness(entries: MemoryEntry[]): void {
    const now = Date.now();
    entries.sort((a, b) => {
      const ageA = now - a.lastAccessedAt;
      const ageB = now - b.lastAccessedAt;
      // Score = accessCount / (age in days + 1)
      const scoreA = a.accessCount / (ageA / 86400000 + 1);
      const scoreB = b.accessCount / (ageB / 86400000 + 1);
      return scoreB - scoreA; // Descending
    });
  }

  /**
   * Evict cold entries until under budget
   */
  private async evictColdEntries(
    core: CoreMemory,
    maxBytes: number
  ): Promise<number> {
    let evicted = 0;
    const now = Date.now();

    // Evict from each section, starting with coldest
    for (const section of ['patterns', 'skills', 'visualPatterns'] as const) {
      while (JSON.stringify(core).length > maxBytes && core[section].length > 0) {
        // Find coldest entry that's old enough
        const coldest = core[section].find(
          (e) =>
            e.accessCount < this.config.coldAccessThreshold &&
            now - e.createdAt > this.config.minAgeForEviction
        );

        if (coldest) {
          core[section] = core[section].filter((e) => e.id !== coldest.id);
          evicted++;
        } else {
          // No more evictable entries in this section
          break;
        }
      }
    }

    return evicted;
  }
}
