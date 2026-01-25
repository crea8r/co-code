/**
 * @co-code/agent-runtime
 *
 * The portable agent runtime - the soul of an agent.
 *
 * Architecture:
 * - core/: Pure TypeScript, no platform dependencies
 * - adapters/: Platform-specific implementations
 * - connections/: Service connectors
 * - platforms/: Entry points for different environments
 */

// Core (portable)
export * from './core/index.js';

// Adapters (interfaces)
export * from './adapters/index.js';

// Connections
export * from './connections/index.js';

// Note: Platform-specific code should be imported directly:
// import { createAgent } from '@co-code/agent-runtime/platforms/node';
