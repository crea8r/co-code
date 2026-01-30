import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export interface MemoryRecord {
  entries: MemoryEntry[];
}

const DEFAULT_RECORD: MemoryRecord = { entries: [] };

export class FileMemoryStore {
  constructor(private filePath: string) {}

  async load(): Promise<MemoryRecord> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data) as MemoryRecord;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return { ...DEFAULT_RECORD };
      }
      throw error;
    }
  }

  async save(record: MemoryRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(record, null, 2), 'utf8');
  }

  async addEntry(entry: MemoryEntry): Promise<void> {
    const record = await this.load();
    record.entries.unshift(entry);
    await this.save(record);
  }

  async search(query: string, limit: number): Promise<MemoryEntry[]> {
    const record = await this.load();
    const q = query.toLowerCase();
    return record.entries
      .filter((entry) =>
        entry.content.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      )
      .slice(0, limit);
  }

  async list(limit: number, tag?: string): Promise<MemoryEntry[]> {
    const record = await this.load();
    const filtered = tag
      ? record.entries.filter((entry) =>
          entry.tags.some((item) => item.toLowerCase() === tag.toLowerCase())
        )
      : record.entries;
    return filtered.slice(0, limit);
  }
}
