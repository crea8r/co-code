import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type ToolRegistryEntry = {
  name: string;
  version: string;
  description?: string;
  tags: string[];
  tools: Array<{ name: string; description?: string; parameters?: Record<string, unknown> }>;
  publishedAt: number;
  storagePath: string;
  installs: number;
  endorsements: Array<{ endorser: string; comment?: string; createdAt: number }>;
};

export type ToolRegistry = {
  tools: ToolRegistryEntry[];
};

export type InstallResult = {
  name: string;
  version: string;
  installPath: string;
};

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

export function resolveVersion(versions: string[], constraint?: string): string | null {
  if (versions.length === 0) return null;
  const sorted = [...versions].sort(compareSemver).reverse();
  if (!constraint || constraint === 'latest') return sorted[0];

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

async function copyDirectory(source: string, destination: string): Promise<void> {
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

async function removeDirectory(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
}

export function getRegistryPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return process.env.TOOL_REGISTRY_PATH || path.join(home, '.co-code', 'tool-registry.json');
}

export async function loadRegistry(): Promise<ToolRegistry> {
  const registryPath = getRegistryPath();
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as ToolRegistry;
    return { tools: parsed.tools ?? [] };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { tools: [] };
    }
    throw error;
  }
}

export async function saveRegistry(registry: ToolRegistry): Promise<void> {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

export function getAgentHome(agentId?: string, agentHome?: string): string {
  if (agentHome) return agentHome;
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const envHome = process.env.AGENT_HOME || process.env.CO_CODE_AGENT_HOME;
  if (envHome) return envHome;
  if (agentId) return path.join(home, '.co-code', 'agents', agentId);
  const envAgentId = process.env.AGENT_ID;
  if (envAgentId) return path.join(home, '.co-code', 'agents', envAgentId);
  return path.join(home, '.co-code', 'agents', 'default');
}

export async function installTool(params: {
  name: string;
  version?: string;
  agentId?: string;
  agentHome?: string;
}): Promise<InstallResult> {
  const registry = await loadRegistry();
  const candidates = registry.tools.filter((entry) => entry.name === params.name);
  if (!candidates.length) {
    throw new Error(`Tool not found: ${params.name}`);
  }

  const version = resolveVersion(
    candidates.map((entry) => entry.version),
    params.version
  );
  if (!version) {
    throw new Error(`No version matches constraint: ${params.version ?? 'latest'}`);
  }

  const selected = candidates.find((entry) => entry.version === version);
  if (!selected) {
    throw new Error(`Registry entry not found for ${params.name}@${version}`);
  }

  const agentHome = getAgentHome(params.agentId, params.agentHome);
  const toolsRoot = path.join(agentHome, 'tools');
  const installPath = path.join(toolsRoot, params.name);

  await removeDirectory(installPath);
  await copyDirectory(selected.storagePath, installPath);

  await fs.writeFile(path.join(installPath, 'installed_version'), version, 'utf8');
  await fs.writeFile(
    path.join(installPath, 'version_constraint'),
    params.version ?? 'latest',
    'utf8'
  );

  const registryFile = path.join(agentHome, 'tools', 'registry.json');
  const registryData = await fs
    .readFile(registryFile, 'utf8')
    .then((data) => JSON.parse(data) as { tools: Array<Record<string, unknown>> })
    .catch(() => ({ tools: [] }));

  const filtered = registryData.tools.filter((tool) => tool.name !== params.name);
  filtered.push({
    name: params.name,
    version,
    path: installPath,
    command: 'node',
    args: [path.join(installPath, 'dist', 'index.js')],
  });

  await fs.mkdir(path.dirname(registryFile), { recursive: true });
  await fs.writeFile(registryFile, JSON.stringify({ tools: filtered }, null, 2), 'utf8');

  selected.installs += 1;
  await saveRegistry(registry);

  return { name: params.name, version, installPath };
}

export async function updateTool(params: {
  name: string;
  version?: string;
  agentId?: string;
  agentHome?: string;
}): Promise<InstallResult> {
  return installTool(params);
}

export async function uninstallTool(params: {
  name: string;
  agentId?: string;
  agentHome?: string;
}): Promise<void> {
  const agentHome = getAgentHome(params.agentId, params.agentHome);
  const installPath = path.join(agentHome, 'tools', params.name);
  await removeDirectory(installPath);

  const registryFile = path.join(agentHome, 'tools', 'registry.json');
  const registryData = await fs
    .readFile(registryFile, 'utf8')
    .then((data) => JSON.parse(data) as { tools: Array<Record<string, unknown>> })
    .catch(() => ({ tools: [] }));
  const filtered = registryData.tools.filter((tool) => tool.name !== params.name);
  await fs.writeFile(registryFile, JSON.stringify({ tools: filtered }, null, 2), 'utf8');
}
