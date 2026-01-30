/**
 * Agentic Loop
 *
 * Think → Act → Observe cycle with negotiation, frustration, and rest modes.
 */

import type {
  CompletionRequest,
  LLMProvider,
  Message,
  Tool,
  ToolCall,
  ToolResult,
} from '../llm/provider.js';
import type { Budget, Vitals } from '../../identity/types.js';
import type { SleepManager } from '../sleep.js';

export type AgenticLoopPhase = 'negotiate' | 'think' | 'act' | 'observe' | 'rest' | 'done';

export interface AgenticLoopEvent {
  phase: AgenticLoopPhase;
  step: number;
  detail?: string;
}

export type AgenticLoopStatus =
  | 'completed'
  | 'fatigued'
  | 'budget_exhausted'
  | 'frustrated'
  | 'rest';

export interface AgenticLoopResult {
  status: AgenticLoopStatus;
  responseText: string;
  iterations: number;
  frustration: number;
  cost: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AgenticLoopOptions {
  llm: LLMProvider;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tools?: Tool[];
  toolExecutor?: (call: ToolCall) => Promise<string>;
  maxSteps?: number;
  maxFrustration?: number;
  budget?: Budget;
  vitals?: Vitals;
  sleepManager?: SleepManager;
  onEvent?: (event: AgenticLoopEvent) => void;
}

const SUBMIT_RESPONSE_TOOL: Tool = {
  name: 'submit_response',
  description: 'Finalize the response for the user.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Final response to return to user.' },
    },
    required: ['text'],
  },
};

export async function runAgenticLoop(options: AgenticLoopOptions): Promise<AgenticLoopResult> {
  const {
    llm,
    model,
    systemPrompt,
    userMessage,
    tools = [],
    toolExecutor,
    maxSteps = 6,
    maxFrustration = 3,
    budget,
    vitals,
    sleepManager,
    onEvent,
  } = options;

  const messages: Message[] = [{ role: 'user', content: userMessage }];
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let frustration = 0;

  // Negotiation phase: capacity + budget check before starting
  onEvent?.({ phase: 'negotiate', step: 0 });
  if (sleepManager?.shouldSleep()) {
    onEvent?.({ phase: 'rest', step: 0, detail: 'fatigue' });
    return {
      status: 'fatigued',
      responseText:
        "I'm feeling very tired and need to rest before I can respond clearly.",
      iterations: 0,
      frustration,
      cost: 0,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const negotiationRequest: CompletionRequest = {
    model,
    systemPrompt,
    messages,
    tools: [...tools, SUBMIT_RESPONSE_TOOL],
    maxTokens: 512,
  };

  if (budget) {
    const estimate = llm.estimateCost(negotiationRequest);
    const remaining = budget.totalBalance - budget.spentThisMonth;
    const dailyRemaining = budget.dailyLimit - budget.spentToday;

    if (remaining <= 0 || dailyRemaining <= 0) {
      onEvent?.({ phase: 'rest', step: 0, detail: 'budget_exhausted' });
      return {
        status: 'budget_exhausted',
        responseText:
          "I'm out of budget for now. I'll need to pause and resume later.",
        iterations: 0,
        frustration,
        cost: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    if (estimate.estimatedCost > remaining || estimate.estimatedCost > dailyRemaining) {
      onEvent?.({ phase: 'rest', step: 0, detail: 'budget_too_low' });
      return {
        status: 'budget_exhausted',
        responseText:
          "I don't have enough budget to take this on right now. Please try again later.",
        iterations: 0,
        frustration,
        cost: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }
  }

  for (let step = 0; step < maxSteps; step += 1) {
    onEvent?.({ phase: 'think', step });

    const response = await llm.complete({
      model,
      systemPrompt,
      messages,
      tools: [...tools, SUBMIT_RESPONSE_TOOL],
      maxTokens: 1024,
    });

    totalCost += response.cost || 0;
    totalInput += response.usage.inputTokens;
    totalOutput += response.usage.outputTokens;

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const call of response.toolCalls) {
        onEvent?.({ phase: 'act', step, detail: call.name });
        if (call.name === 'submit_response') {
          const text =
            typeof call.arguments?.text === 'string'
              ? call.arguments.text
              : response.text;
          onEvent?.({ phase: 'done', step });
          return {
            status: 'completed',
            responseText: text,
            iterations: step + 1,
            frustration,
            cost: totalCost,
            usage: { inputTokens: totalInput, outputTokens: totalOutput },
          };
        }

        const result = await executeTool(call, toolExecutor);
        const toolResult: ToolResult = {
          toolCallId: call.id,
          result,
        };
        onEvent?.({ phase: 'observe', step, detail: call.name });
        messages.push({ role: 'tool', content: [toolResult] });
      }
      continue;
    }

    frustration += 1;
    messages.push({ role: 'assistant', content: response.text });
    messages.push({
      role: 'user',
      content:
        'Please finalize by calling submit_response with the text to send.',
    });

    if (frustration >= maxFrustration) {
      if (vitals) {
        vitals.emotional.stress = Math.min(1, vitals.emotional.stress + 0.2);
      }
      onEvent?.({ phase: 'rest', step, detail: 'frustrated' });
      return {
        status: 'frustrated',
        responseText:
          "I'm getting stuck and need to rest before trying again.",
        iterations: step + 1,
        frustration,
        cost: totalCost,
        usage: { inputTokens: totalInput, outputTokens: totalOutput },
      };
    }
  }

  onEvent?.({ phase: 'rest', step: maxSteps, detail: 'max_steps' });
  return {
    status: 'rest',
    responseText:
      "I'm pausing to rest before continuing. Please check back soon.",
    iterations: maxSteps,
    frustration,
    cost: totalCost,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  };
}

async function executeTool(
  call: ToolCall,
  toolExecutor?: (call: ToolCall) => Promise<string>
): Promise<string> {
  if (!toolExecutor) {
    return `Tool ${call.name} unavailable.`;
  }
  try {
    return await toolExecutor(call);
  } catch (error) {
    return `Tool ${call.name} failed: ${(error as Error).message}`;
  }
}

export { SUBMIT_RESPONSE_TOOL };
