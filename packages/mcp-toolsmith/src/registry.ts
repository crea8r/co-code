import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type ToolDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export type ToolEndorsement = {
  endorser: string;
  comment?: string;
  createdAt: number;
};

export type ToolRegistryEntry = {
  name: string;
  version: string;
  description?: string;
  tags: string[];
  tools: ToolDefinition[];
  publishedAt: number;
  storagePath: string;
  installs: number;
  endorsements: ToolEndorsement[];
};

export type ToolRegistry = {
  tools: ToolRegistryEntry[];
};

const DEFAULT_REGISTRY: ToolRegistry = { tools: [] };

export function getRegistryPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return process.env.TOOL_REGISTRY_PATH || path.join(home, '.co-code', 'tool-registry.json');
}

export function getRegistryStorageRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return process.env.TOOL_REGISTRY_STORAGE || path.join(home, '.co-code', 'tool-registry');
}

export async function loadRegistry(): Promise<ToolRegistry> {
  const registryPath = getRegistryPath();
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as ToolRegistry;
    return { tools: parsed.tools ?? [] };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { ...DEFAULT_REGISTRY };
    }
    throw error;
  }
}

export async function saveRegistry(registry: ToolRegistry): Promise<void> {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

export function parseSemver(version: string): [number, number, number] | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a: string, b: string): number {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) return 0;
  if (av[0] !== bv[0]) return av[0] - bv[0];
  if (av[1] !== bv[1]) return av[1] - bv[1];
  return av[2] - bv[2];
}

export function resolveVersion(
  versions: string[],
  constraint?: string
): string | null {
  if (versions.length === 0) return null;
  const sorted = [...versions].sort(compareSemver).reverse();
  if (!constraint || constraint === 'latest') {
    return sorted[0];
  }

  const trimmed = constraint.trim();
  if (parseSemver(trimmed)) {
    return versions.includes(trimmed) ? trimmed : null;
  }

  const op = trimmed[0];
  const base = trimmed.slice(1);
  const baseSemver = parseSemver(base);
  if (!baseSemver) return null;

  if (op === '^') {
    return (
      sorted.find((version) => {
        const parsed = parseSemver(version);
        if (!parsed) return false;
        return parsed[0] === baseSemver[0] && compareSemver(version, base) >= 0;
      }) ?? null
    );
  }

  if (op === '~') {
    return (
      sorted.find((version) => {
        const parsed = parseSemver(version);
        if (!parsed) return false;
        return (
          parsed[0] === baseSemver[0] &&
          parsed[1] === baseSemver[1] &&
          compareSemver(version, base) >= 0
        );
      }) ?? null
    );
  }

  return null;
}

export async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function removeDirectory(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
}
