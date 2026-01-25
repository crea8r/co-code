/**
 * Node.js Storage Adapter
 *
 * Stores agent data in the file system at ~/.co-code/agents/{agentId}/
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StorageAdapter } from './interface.js';

export class NodeStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(agentId: string, baseDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    const root = baseDir || path.join(home, '.co-code', 'agents');
    this.basePath = path.join(root, agentId);
  }

  private getFilePath(key: string): string {
    // Ensure key doesn't escape base path
    const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    return path.join(this.basePath, normalized + '.json');
  }

  async read(key: string): Promise<string | null> {
    const filePath = this.getFilePath(key);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(key: string, data: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write atomically (write to temp, then rename)
    const tempPath = filePath + '.tmp';
    await fs.writeFile(tempPath, data, 'utf-8');
    await fs.rename(tempPath, filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Ignore if file doesn't exist
    }
  }

  async list(prefix: string): Promise<string[]> {
    const prefixPath = path.join(this.basePath, prefix);
    const results: string[] = [];

    try {
      await this.listRecursive(prefixPath, prefix, results);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Return empty array if directory doesn't exist
    }

    return results;
  }

  private async listRecursive(
    dirPath: string,
    prefix: string,
    results: string[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const key = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        await this.listRecursive(entryPath, key, results);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Remove .json extension to get key
        results.push(key.slice(0, -5));
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async size(key: string): Promise<number> {
    const filePath = this.getFilePath(key);
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  async totalSize(): Promise<number> {
    let total = 0;

    const calculateSize = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            await calculateSize(entryPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(entryPath);
            total += stats.size;
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    };

    await calculateSize(this.basePath);
    return total;
  }
}
