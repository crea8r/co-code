/**
 * Identity Module
 *
 * Handles agent identity loading, validation, and management.
 * This is the new identity system based on the Soul/Self/Vitals architecture.
 */

// Types for agent identity structure
export * from './types.js';

// Default values for graceful fallback
export * from './defaults.js';

// Identity loader for reading from disk
export { IdentityLoader, loadAgentIdentity } from './loader.js';

// Re-export key utilities from core (for convenience)
export {
  generateKeyPair,
  sign,
  verify,
  derivePublicKey,
  loadPrivateKey,
  type AgentKeyPair,
} from '../core/identity/keys.js';
