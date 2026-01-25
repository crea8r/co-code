/**
 * Node.js Runtime Adapter
 *
 * Handles lifecycle and scheduling for Node.js environment.
 */

import type { RuntimeAdapter, Platform } from './interface.js';

export class NodeRuntimeAdapter implements RuntimeAdapter {
  private scheduledWork = new Map<string, NodeJS.Timeout>();
  private startupCallbacks: Array<() => void | Promise<void>> = [];
  private shutdownCallbacks: Array<() => void | Promise<void>> = [];
  private isShuttingDown = false;

  constructor() {
    // Register signal handlers for graceful shutdown
    process.on('SIGINT', () => this.handleShutdown());
    process.on('SIGTERM', () => this.handleShutdown());
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception', error);
      this.handleShutdown();
    });
  }

  private async handleShutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.log('info', 'Shutting down...');

    // Cancel all scheduled work
    for (const [id, timeout] of this.scheduledWork) {
      clearTimeout(timeout);
      clearInterval(timeout);
      this.log('debug', `Cancelled scheduled work: ${id}`);
    }
    this.scheduledWork.clear();

    // Run shutdown callbacks
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        this.log('error', 'Error in shutdown callback', error);
      }
    }

    this.log('info', 'Shutdown complete');
    process.exit(0);
  }

  getPlatform(): Platform {
    return 'node';
  }

  getVersion(): string {
    return process.version;
  }

  onStartup(callback: () => void | Promise<void>): void {
    this.startupCallbacks.push(callback);
  }

  onShutdown(callback: () => void | Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  async runStartup(): Promise<void> {
    for (const callback of this.startupCallbacks) {
      await callback();
    }
  }

  scheduleWork(
    id: string,
    intervalMs: number,
    task: () => Promise<void>
  ): void {
    // Cancel existing work with same id
    this.cancelWork(id);

    const interval = setInterval(async () => {
      try {
        await task();
      } catch (error) {
        this.log('error', `Error in scheduled work ${id}`, error);
      }
    }, intervalMs);

    this.scheduledWork.set(id, interval);
    this.log('debug', `Scheduled work: ${id} every ${intervalMs}ms`);
  }

  cancelWork(id: string): void {
    const existing = this.scheduledWork.get(id);
    if (existing) {
      clearInterval(existing);
      clearTimeout(existing);
      this.scheduledWork.delete(id);
      this.log('debug', `Cancelled work: ${id}`);
    }
  }

  scheduleOnce(
    id: string,
    delayMs: number,
    task: () => Promise<void>
  ): void {
    // Cancel existing work with same id
    this.cancelWork(id);

    const timeout = setTimeout(async () => {
      this.scheduledWork.delete(id);
      try {
        await task();
      } catch (error) {
        this.log('error', `Error in one-time work ${id}`, error);
      }
    }, delayMs);

    this.scheduledWork.set(id, timeout);
    this.log('debug', `Scheduled one-time work: ${id} in ${delayMs}ms`);
  }

  now(): number {
    return Date.now();
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        if (process.env.DEBUG) {
          console.debug(prefix, message, data ?? '');
        }
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }
  }
}
