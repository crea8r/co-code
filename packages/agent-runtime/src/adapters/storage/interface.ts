/**
 * Storage Adapter Interface
 *
 * PORTABILITY: This interface abstracts storage.
 * Core code uses this interface, platform-specific code implements it.
 *
 * Implementations:
 * - Node.js: File system (~/.co-code/agents/{id}/)
 * - Android: SQLite or AsyncStorage
 */

export interface StorageAdapter {
  /**
   * Read data by key
   * @returns The data as string, or null if not found
   */
  read(key: string): Promise<string | null>;

  /**
   * Write data to key
   */
  write(key: string, data: string): Promise<void>;

  /**
   * Delete data by key
   */
  delete(key: string): Promise<void>;

  /**
   * List all keys with given prefix
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get size of stored data in bytes
   */
  size(key: string): Promise<number>;

  /**
   * Get total storage used in bytes
   */
  totalSize(): Promise<number>;
}

/**
 * Keys used for agent storage
 */
export const STORAGE_KEYS = {
  /** Private key - NEVER leaves agent */
  PRIVATE_KEY: 'identity/private_key',
  /** Agent configuration from server */
  CONFIG: 'identity/config',
  /** Self memory (identity, values, curiosity, style) */
  SELF: 'memory/self',
  /** Core memory (skills, patterns) */
  CORE: 'memory/core',
  /** Project memory prefix */
  PROJECT_PREFIX: 'memory/projects/',
  /** Relationships memory */
  RELATIONSHIPS: 'memory/relationships',
} as const;
