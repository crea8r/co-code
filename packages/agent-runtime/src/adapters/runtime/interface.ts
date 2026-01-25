/**
 * Runtime Adapter Interface
 *
 * PORTABILITY: This interface abstracts runtime lifecycle.
 * Core code uses this interface, platform-specific code implements it.
 *
 * Implementations:
 * - Node.js: Process lifecycle, setInterval for scheduling
 * - Android: Background service, WorkManager for scheduling
 */

export type Platform = 'node' | 'android' | 'ios' | 'web';

export interface RuntimeAdapter {
  /**
   * Get current platform
   */
  getPlatform(): Platform;

  /**
   * Get runtime version
   */
  getVersion(): string;

  /**
   * Register startup callback
   */
  onStartup(callback: () => void | Promise<void>): void;

  /**
   * Register shutdown callback
   */
  onShutdown(callback: () => void | Promise<void>): void;

  /**
   * Schedule recurring work
   * @param id Unique identifier for this scheduled work
   * @param intervalMs Interval in milliseconds
   * @param task The task to run
   */
  scheduleWork(
    id: string,
    intervalMs: number,
    task: () => Promise<void>
  ): void;

  /**
   * Cancel scheduled work
   */
  cancelWork(id: string): void;

  /**
   * Schedule one-time work
   * @param id Unique identifier
   * @param delayMs Delay before running
   * @param task The task to run
   */
  scheduleOnce(
    id: string,
    delayMs: number,
    task: () => Promise<void>
  ): void;

  /**
   * Get current time in milliseconds
   */
  now(): number;

  /**
   * Sleep for specified duration
   */
  sleep(ms: number): Promise<void>;

  /**
   * Log a message (platform-appropriate logging)
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void;
}
