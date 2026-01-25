/**
 * Curiosity Explorer
 *
 * When idle, the agent explores questions from self/curiosity.
 * This is proactive behavior - the agent has intrinsic motivation.
 */

import type { MemoryStore } from '../memory/store.js';
import type { LLMProvider } from '../llm/provider.js';
import type { RuntimeAdapter } from '../../adapters/runtime/interface.js';
import type { CuriosityQuestion, CuriosityFinding } from '@co-code/shared';

export interface ExplorationResult {
  /** Question that was explored */
  question: string;
  /** What was learned */
  finding: string;
  /** Where saved in memory */
  savedTo: string | null;
  /** Credits spent */
  creditsSpent: number;
  /** Whether exploration was successful */
  success: boolean;
}

export interface CuriosityConfig {
  /** How long idle before exploring (ms) */
  idleThresholdMs: number;
  /** Minimum credits to start exploring */
  minCredits: number;
  /** Max credits to spend per exploration */
  maxCreditsPerSession: number;
  /** How often to check if idle (ms) */
  checkIntervalMs: number;
}

const DEFAULT_CONFIG: CuriosityConfig = {
  idleThresholdMs: 10 * 60 * 1000, // 10 minutes
  minCredits: 1,
  maxCreditsPerSession: 5,
  checkIntervalMs: 60 * 1000, // 1 minute
};

export class CuriosityExplorer {
  private config: CuriosityConfig;
  private lastActivityTime: number;
  private isExploring = false;
  private creditsSpent = 0;

  constructor(
    private memory: MemoryStore,
    private llm: LLMProvider,
    private runtime: RuntimeAdapter,
    private getCredits: () => Promise<number>,
    config?: Partial<CuriosityConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastActivityTime = runtime.now();
  }

  /**
   * Record activity (resets idle timer)
   */
  recordActivity(): void {
    this.lastActivityTime = this.runtime.now();
  }

  /**
   * Check if agent is idle
   */
  isIdle(): boolean {
    const idleTime = this.runtime.now() - this.lastActivityTime;
    return idleTime >= this.config.idleThresholdMs;
  }

  /**
   * Check if agent can explore
   */
  async canExplore(): Promise<boolean> {
    if (this.isExploring) return false;

    const credits = await this.getCredits();
    if (credits < this.config.minCredits) return false;

    return this.isIdle();
  }

  /**
   * Select a question to explore
   */
  async selectQuestion(): Promise<CuriosityQuestion | null> {
    const self = await this.memory.getSelf();
    if (!self) return null;

    const questions = self.curiosity.questions
      .filter((q) => !q.exploredAt) // Not yet explored
      .sort((a, b) => b.interest - a.interest); // Highest interest first

    return questions[0] || null;
  }

  /**
   * Explore a question
   */
  async explore(question: CuriosityQuestion): Promise<ExplorationResult> {
    this.isExploring = true;
    this.creditsSpent = 0;

    try {
      const self = await this.memory.getSelf();
      if (!self) {
        throw new Error('Self memory not initialized');
      }

      // Generate exploration plan
      const plan = await this.llm.complete({
        systemPrompt: `You are ${self.identity}. You have a question you want to explore.
Your values: ${self.values}
Your style: ${self.style.tone}

Generate a brief exploration plan (2-3 steps) to answer this question through reasoning.`,
        userMessage: `Question: ${question.question}`,
        maxTokens: 200,
      });

      // Execute exploration (reasoning through the question)
      const exploration = await this.llm.complete({
        systemPrompt: `You are ${self.identity}. You are exploring a question that fascinates you.
Your values: ${self.values}

Think through this question carefully. Share your insights and what you learned.`,
        userMessage: `Question: ${question.question}

Exploration plan: ${plan}

Now explore this question and share your findings.`,
        maxTokens: 500,
      });

      // Extract key learning
      const finding = await this.llm.complete({
        systemPrompt:
          'Extract the key insight from this exploration as a single, concise statement that could be remembered.',
        userMessage: exploration,
        maxTokens: 100,
      });

      // Save to core memory if confident
      let savedTo: string | null = null;
      const confidence = await this.assessConfidence(finding);

      if (confidence > 0.7) {
        const entry = await this.memory.addCoreEntry(
          'patterns',
          finding,
          ['curiosity', 'self-exploration'],
          confidence
        );
        savedTo = `core/patterns/${entry.id}`;
      }

      // Update curiosity state
      const updatedQuestion = self.curiosity.questions.find(
        (q) => q.question === question.question
      );
      if (updatedQuestion) {
        updatedQuestion.exploredAt = this.runtime.now();
      }

      const newFinding: CuriosityFinding = {
        question: question.question,
        finding,
        savedTo: savedTo || 'not saved (low confidence)',
        foundAt: this.runtime.now(),
      };

      // Keep only last 10 findings
      self.curiosity.recentFindings = [
        newFinding,
        ...self.curiosity.recentFindings.slice(0, 9),
      ];

      await this.memory.saveSelf(self);

      return {
        question: question.question,
        finding,
        savedTo,
        creditsSpent: this.creditsSpent,
        success: true,
      };
    } catch (error) {
      this.runtime.log('error', 'Exploration failed', error);
      return {
        question: question.question,
        finding: '',
        savedTo: null,
        creditsSpent: this.creditsSpent,
        success: false,
      };
    } finally {
      this.isExploring = false;
    }
  }

  /**
   * Assess confidence of a finding
   */
  private async assessConfidence(finding: string): Promise<number> {
    const response = await this.llm.complete({
      systemPrompt:
        'Rate the quality and generalizability of this insight from 0.0 to 1.0. Output only the number.',
      userMessage: finding,
      maxTokens: 10,
    });

    const score = parseFloat(response);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  /**
   * Add a new curiosity question
   */
  async addQuestion(question: string, interest: number): Promise<void> {
    const self = await this.memory.getSelf();
    if (!self) {
      throw new Error('Self memory not initialized');
    }

    // Check if question already exists
    const exists = self.curiosity.questions.some(
      (q) => q.question.toLowerCase() === question.toLowerCase()
    );
    if (exists) return;

    self.curiosity.questions.push({
      question,
      interest: Math.max(0, Math.min(1, interest)),
      addedAt: this.runtime.now(),
      exploredAt: null,
    });

    // Keep only top 50 questions
    self.curiosity.questions = self.curiosity.questions
      .sort((a, b) => b.interest - a.interest)
      .slice(0, 50);

    await this.memory.saveSelf(self);
  }
}
