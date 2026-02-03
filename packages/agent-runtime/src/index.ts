/**
 * @co-code/agent-runtime
 *
 * The portable agent runtime - the self layer for autonomous agents.
 *
 * Architecture:
 * - core/: Pure TypeScript, no platform dependencies
 * - adapters/: Platform-specific implementations
 * - platforms/: Entry points for different environments
 */

// Core (portable)
export * from './core/index.js';

// Adapters (interfaces)
export * from './adapters/index.js';

// Tooling helpers
export * from './tools/installer.js';
export * from './tools/pipeline.js';

// Note: Platform-specific code should be imported directly:
// import { createAgent } from '@co-code/agent-runtime/platforms/node';
