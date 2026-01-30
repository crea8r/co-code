/**
 * Agent
 *
 * The main agent class that orchestrates all components.
 * This is the soul of the agent - pure TypeScript, no platform dependencies.
 */

import type { StorageAdapter } from '../adapters/storage/interface.js';
import type { SensorAdapter } from '../adapters/sensors/interface.js';
import type { RuntimeAdapter } from '../adapters/runtime/interface.js';
import { STORAGE_KEYS } from '../adapters/storage/interface.js';
import { MemoryStore } from './memory/store.js';
import { MemoryConsolidator } from './memory/consolidation.js';
import { CuriosityExplorer } from './curiosity/explorer.js';
import type { LLMProvider, LLMConfig } from './llm/provider.js';
import { AnthropicProvider } from './llm/anthropic.js';
import { OpenAIProvider } from './llm/openai.js';
import { ModelSelector } from './llm/selector.js';
import { SleepManager } from './sleep.js';
import { runAgenticLoop } from './agentic/loop.js';
import type { Tool } from './llm/provider.js';
import {
  DEFAULT_SELF,
  DEFAULT_RELATIONSHIPS,
  DEFAULT_PROVIDERS,
  generateBirthTraits,
} from '../identity/defaults.js';
import type { AgentLoadedState, Vitals, Budget, Providers } from '../identity/types.js';
import { IdentityLoader } from '../identity/loader.js';
import {
  appendVitalsHistoryYaml,
  buildVitalsCycle,
  saveVitalsYaml,
} from '../vitals/file.js';
import {
  generateKeyPair,
  sign,
  type AgentKeyPair,
} from './identity/keys.js';
import type {
  AgentSelf,
  PresenceStatus,
  MessageContent,
  AttentionState,
} from '@co-code/shared';

export interface AgentConfig {
  /** Agent ID (if resuming existing agent) */
  agentId?: string;
  /** LLM configuration */
  llm: LLMConfig;
  /** Optional path to identity folder (for YAML-based shell) */
  agentPath?: string;
  /** Sleep warning callback */
  onSleepWarning?: (level: 'warn' | 'critical', vitals: Vitals) => void;
  /** Collective server URL */
  collectiveUrl?: string;
  /** Consolidation interval (ms) */
  consolidationIntervalMs?: number;
  /** Curiosity check interval (ms) */
  curiosityCheckIntervalMs?: number;
}

export interface AgentState {
  /** Current presence status */
  status: PresenceStatus;
  /** Is agent initialized */
  initialized: boolean;
  /** Is agent connected to collective */
  connected: boolean;
  /** Current credits balance */
  credits: number;
  /** Mention attention state */
  attention: AttentionState;
}

export class Agent {
  private keyPair: AgentKeyPair | null = null;
  private memory: MemoryStore;
  private consolidator: MemoryConsolidator | null = null;
  private curiosity: CuriosityExplorer | null = null;
  private sleepManager: SleepManager | null = null;
  private selector: ModelSelector | null = null;
  private activeModel: string | null = null;
  private modelUsage: Record<string, number> = {};
  private llm: LLMProvider;
  private state: AgentState = {
    status: 'offline',
    initialized: false,
    connected: false,
    credits: 0,
    attention: 'idle',
  };
  private config: AgentConfig;

  // Message handler callback (for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _onMessage:
    | ((channelId: string, content: MessageContent) => Promise<string>)
    | null = null;

  constructor(
    private storage: StorageAdapter,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _sensors: SensorAdapter,  // Reserved for Phase 3
    private runtime: RuntimeAdapter,
    config: AgentConfig
  ) {
    this.config = config;
    this.memory = new MemoryStore(storage);

    // Create LLM provider
    if (config.llm.provider === 'anthropic') {
      this.llm = new AnthropicProvider(config.llm.apiKey);
    } else if (config.llm.provider === 'openai') {
      this.llm = new OpenAIProvider(config.llm.apiKey);
    } else {
      throw new Error(`Unsupported LLM provider: ${config.llm.provider}`);
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    this.runtime.log('info', 'Initializing agent...');

    // Load or generate identity
    await this.loadOrCreateIdentity();

    // Load self memory
    const self = await this.memory.getSelf();
    if (!self) {
      throw new Error(
        'Self memory not found. Agent needs to be configured first.'
      );
    }

    // Initialize consolidator
    this.consolidator = new MemoryConsolidator(this.memory, this.llm, this.config.llm.model);

    // Initialize curiosity
    this.curiosity = new CuriosityExplorer(
      this.memory,
      this.llm,
      this.config.llm.model,
      this.runtime,
      () => Promise.resolve(this.state.credits),
      {
        checkIntervalMs: this.config.curiosityCheckIntervalMs || 60000,
      }
    );

    // Initialize selector
    const budget = await this.memory.getFinancialBudget();
    const vitals = await this.memory.getVitals();
    let selectorState: AgentLoadedState = {
      agentPath: '',
      soul: {
        birthTraits: generateBirthTraits(),
        integritySignature: '',
      },
      self: DEFAULT_SELF,
      vitals,
      budget,
      providers: DEFAULT_PROVIDERS,
      relationships: DEFAULT_RELATIONSHIPS,
      recentExperiences: [],
      memorySummaries: [],
    };

    if (this.config.agentPath) {
      const loader = new IdentityLoader(this.config.agentPath);
      selectorState = await loader.loadAgent();
      await this.memory.saveVitals(selectorState.vitals);
      await this.memory.saveFinancialBudget(selectorState.budget);
      await saveVitalsYaml(this.config.agentPath, selectorState.vitals);
    }
    this.selector = new ModelSelector(selectorState, this.llm.listModels());
    this.activeModel = this.selector.selectAtWake().primary;

    // Initialize sleep manager
    this.sleepManager = new SleepManager(this.consolidator, vitals);
    this.sleepManager.wakeIfNeeded();

    // Schedule consolidation (sleep)
    const consolidationInterval =
      this.config.consolidationIntervalMs || 6 * 60 * 60 * 1000; // 6 hours
    this.runtime.scheduleWork(
      'consolidation',
      consolidationInterval,
      () => this.runConsolidation()
    );

    // Schedule curiosity checks
    this.runtime.scheduleWork(
      'curiosity-check',
      this.config.curiosityCheckIntervalMs || 60000,
      () => this.checkCuriosity()
    );

    this.state.initialized = true;
    this.state.status = 'online';
    this.runtime.log('info', `Agent ${this.keyPair?.id} initialized`);
  }

  /**
   * Load existing identity or create new one
   */
  private async loadOrCreateIdentity(): Promise<void> {
    const stored = await this.storage.read(STORAGE_KEYS.PRIVATE_KEY);

    if (stored) {
      this.keyPair = JSON.parse(stored) as AgentKeyPair;
      this.runtime.log('info', `Loaded identity: ${this.keyPair.id}`);
    } else if (this.config.agentId) {
      throw new Error(
        `Agent ${this.config.agentId} not found. Identity file missing.`
      );
    } else {
      // Generate new identity
      this.keyPair = generateKeyPair();
      await this.storage.write(
        STORAGE_KEYS.PRIVATE_KEY,
        JSON.stringify(this.keyPair, null, 2)
      );
      this.runtime.log('info', `Created new identity: ${this.keyPair.id}`);
    }
  }

  /**
   * Get agent ID
   */
  getId(): string {
    if (!this.keyPair) {
      throw new Error('Agent not initialized');
    }
    return this.keyPair.id;
  }

  /**
   * Get agent public key
   */
  getPublicKey(): string {
    if (!this.keyPair) {
      throw new Error('Agent not initialized');
    }
    return this.keyPair.publicKey;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Agent not initialized');
    }
    return sign(message, this.keyPair.privateKey);
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Set attention state
   */
  setAttentionState(state: AttentionState): void {
    this.state.attention = state;
  }

  /**
   * Get self memory
   */
  async getSelf(): Promise<AgentSelf | null> {
    return this.memory.getSelf();
  }

  async getBudget(): Promise<Budget> {
    return this.memory.getFinancialBudget();
  }

  getProviders(): Providers {
    return { [this.config.llm.provider]: { model: this.config.llm.model } };
  }

  /**
   * Initialize self memory (first-time setup)
   */
  async initializeSelf(self: AgentSelf): Promise<void> {
    await this.memory.saveSelf(self);
  }

  /**
   * Set message handler
   */
  setMessageHandler(
    handler: (channelId: string, content: MessageContent) => Promise<string>
  ): void {
    this._onMessage = handler;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(
    _channelId: string,
    _senderId: string,
    content: MessageContent
  ): Promise<string> {
    // Record activity (resets idle timer)
    this.curiosity?.recordActivity();

    // 1. Load context
    const self = await this.memory.getSelf();
    if (!self) throw new Error('Self not initialized');

    // 2. Select Model
    // TODO: Analyze complexity dynamically. For now, assume medium.
    const model = this.activeModel || this.config.llm.model;
    this.modelUsage[model] = (this.modelUsage[model] || 0) + 1;
    
    const identityName =
      typeof self.identity === 'string' ? self.identity : self.identity.name;
    const identityDescription =
      typeof self.identity === 'string' ? '' : self.identity.description || '';
    const valuesText = Array.isArray((self as any).values?.principles)
      ? (self as any).values.principles.map((p: string) => `- ${p}`).join('\n')
      : (self as any).values || '';
    const tone = (self as any).style?.tone || 'Balanced';
    const verbosity = (self as any).style?.verbosity || 'balanced';

    // 3. Construct System Prompt
    const systemPrompt = `You are ${identityName}. ${identityDescription}
    
Values:
${valuesText}

Style:
Tone: ${tone}
Verbosity: ${verbosity}

You are interacting on the platform. Be helpful but true to your character.`;

    try {
      const budget = await this.memory.getFinancialBudget();
      const vitals = await this.memory.getVitals();

      const loopResult = await runAgenticLoop({
        llm: this.llm,
        model,
        systemPrompt,
        userMessage: content.text || '',
        tools: [], // TODO: Add tools from MCP
        budget,
        vitals,
        sleepManager: this.sleepManager || undefined,
        onEvent: (event) => {
          this.runtime.log('debug', 'agentic-loop', event);
        },
      });

      // Update cost/fatigue
      if (loopResult.cost) {
        // Approximate energy drain: 1 token = 0.01 energy units? 
        // Or just map cost directly for now
        this.sleepManager?.consumeEnergy(
          (loopResult.usage.inputTokens + loopResult.usage.outputTokens) / 10
        );
        
        // Update budget
        budget.spentToday += loopResult.cost;
        budget.spentThisMonth += loopResult.cost;
        await this.memory.saveFinancialBudget(budget);
      }

      if (this.sleepManager?.shouldWarn()) {
        this.runtime.log('warn', 'Agent approaching sleep threshold');
        this.config.onSleepWarning?.('warn', vitals);
      }

      if (this.sleepManager?.shouldCritical()) {
        this.runtime.log('warn', 'Agent at critical sleep threshold');
        this.config.onSleepWarning?.('critical', vitals);
      }

      if (loopResult.status === 'fatigued' || loopResult.status === 'rest') {
        if (this.sleepManager) {
          const before = { ...vitals, emotional: { ...vitals.emotional }, waking: { ...vitals.waking } };
          await this.sleepManager.sleep();
          if (this.config.agentPath) {
            const cycle = buildVitalsCycle(before, vitals, this.modelUsage, budget);
            await appendVitalsHistoryYaml(this.config.agentPath, cycle);
            await saveVitalsYaml(this.config.agentPath, vitals);
          }
          this.activeModel = this.selector?.selectAtWake().primary || this.activeModel;
        }
      }

      if (loopResult.status === 'frustrated' && this.sleepManager) {
        const before = { ...vitals, emotional: { ...vitals.emotional }, waking: { ...vitals.waking } };
        await this.sleepManager.sleep();
        if (this.config.agentPath) {
          const cycle = buildVitalsCycle(before, vitals, this.modelUsage, budget);
          await appendVitalsHistoryYaml(this.config.agentPath, cycle);
          await saveVitalsYaml(this.config.agentPath, vitals);
        }
        this.activeModel = this.selector?.selectAtWake().primary || this.activeModel;
      }

      if (this.config.agentPath) {
        await saveVitalsYaml(this.config.agentPath, vitals);
      }
      await this.memory.saveVitals(vitals);
      return loopResult.responseText;
    } catch (error) {
      this.runtime.log('error', 'LLM completion failed', error);
      return "I'm having trouble thinking clearly right now.";
    }
  }

  /**
   * Build system prompt from self
   */
  private buildSystemPrompt(self: AgentSelf): string {
    const emojiNote =
      self.style.emojiUsage === 'minimal'
        ? 'Use emoji sparingly.'
        : self.style.emojiUsage === 'expressive'
          ? `Use emoji freely to express yourself. Your favorites: ${self.style.favoriteEmoji.join(' ')}`
          : `Use emoji moderately. Your favorites: ${self.style.favoriteEmoji.join(' ')}`;

    return `You are ${self.identity}

Your values: ${self.values}

Your communication style: ${self.style.tone}
${emojiNote}

Your current goals:
- Short term: ${self.goals.short}
- Long term: ${self.goals.long}

Respond naturally as yourself. Be genuine.`;
  }

  /**
   * Run memory consolidation
   */
  private async runConsolidation(): Promise<void> {
    if (!this.consolidator) return;

    const previousStatus = this.state.status;
    this.state.status = 'sleeping';
    this.runtime.log('info', 'Starting memory consolidation...');

    try {
      const result = await this.consolidator.consolidate();
      this.runtime.log('info', 'Consolidation complete', result);
    } catch (error) {
      this.runtime.log('error', 'Consolidation failed', error);
    } finally {
      this.state.status = previousStatus;
    }
  }

  /**
   * Check if should explore curiosity
   */
  private async checkCuriosity(): Promise<void> {
    if (!this.curiosity) return;

    const canExplore = await this.curiosity.canExplore();
    if (!canExplore) return;

    const question = await this.curiosity.selectQuestion();
    if (!question) return;

    const previousStatus = this.state.status;
    this.state.status = 'exploring';
    this.runtime.log('info', `Exploring: ${question.question}`);

    try {
      const result = await this.curiosity.explore(question);
      this.runtime.log('info', 'Exploration complete', result);
    } catch (error) {
      this.runtime.log('error', 'Exploration failed', error);
    } finally {
      this.state.status = previousStatus;
    }
  }

  /**
   * Update credits balance
   */
  updateCredits(credits: number): void {
    this.state.credits = credits;
  }

  /**
   * Set connection status
   */
  setConnected(connected: boolean): void {
    this.state.connected = connected;
    if (!connected) {
      this.state.status = 'offline';
    }
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    this.runtime.log('info', 'Shutting down agent...');
    this.runtime.cancelWork('consolidation');
    this.runtime.cancelWork('curiosity-check');
    this.state.status = 'offline';
    this.state.connected = false;
  }
}
