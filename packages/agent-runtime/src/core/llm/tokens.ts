/**
 * Token counting utilities
 */

import { getEncoding } from 'js-tiktoken';

const cl100k_base = getEncoding('cl100k_base');

/**
 * Estimate token count for a piece of text.
 * Uses cl100k_base (OpenAI) as a general approximation for most modern LLMs.
 */
export function countTokens(text: string): number {
  try {
    return cl100k_base.encode(text).length;
  } catch (error) {
    // Fallback to simple word/char count approximation
    return Math.ceil(text.length / 4);
  }
}

/**
 * Estimate tokens for a completion request
 */
export function estimateRequestTokens(systemPrompt: string, messages: any[]): number {
  let total = countTokens(systemPrompt);
  
  for (const m of messages) {
    if (typeof m.content === 'string') {
      total += countTokens(m.content);
    } else {
      total += countTokens(JSON.stringify(m.content));
    }
    // Add overhead for roles/formatting
    total += 4;
  }
  
  return total;
}
