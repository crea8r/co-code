/**
 * MCP Toolsmith Server
 *
 * Tools: create_tool, test_tool, publish_tool, search_tools, install_tool, endorse_tool
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  copyDirectory,
  getRegistryStorageRoot,
  loadRegistry,
  removeDirectory,
  resolveVersion,
  saveRegistry,
  ToolDefinition,
} from './registry.js';

const execAsync = promisify(exec);

const toolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

const createToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tools: z.array(toolDefinitionSchema),
  path: z.string().optional(),
});

const testToolSchema = z.object({
  path: z.string(),
});

const publishToolSchema = z.object({
  path: z.string(),
  tags: z.array(z.string()).optional(),
  stake_amount: z.number().optional(),
});

const searchToolSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const installToolSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

const endorseToolSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  comment: z.string().optional(),
});

function getWorkspaceRoot(): string {
  return (
    process.env.TOOLSMITH_WORKSPACE ||
    process.env.WORKSPACE ||
    process.cwd()
  );
}

async function scaffoldToolProject(
  targetDir: string,
  name: string,
  description: string | undefined,
  tools: ToolDefinition[]
): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.join(targetDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(targetDir, 'src', '__tests__'), { recursive: true });

  const packageJson = {
    name,
    version: '0.1.0',
    type: 'module',
    description: description ?? '',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    bin: {
      [name]: './dist/index.js',
    },
    scripts: {
      build: 'tsc',
      test: 'vitest run --passWithNoTests',
      lint: 'eslint src',
    },
    dependencies: {
      '@modelcontextprotocol/sdk': '^1.25.3',
      zod: '^3.24.0',
    },
    devDependencies: {
      typescript: '^5.7.0',
      vitest: '^2.1.0',
      '@types/node': '^22.0.0',
    },
  };

  const tsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src'],
  };

  const toolsJson = JSON.stringify(tools, null, 2);

  const serverSource = `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const tools = ${toolsJson};

export async function createServer() {
  const server = new Server({ name: '${name}', version: '0.1.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const match = tools.find((tool) => tool.name === name);
    if (!match) {
      return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ tool: name, args }, null, 2) }] };
  });

  return {
    async connect() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
`;

  const indexSource = `import { createServer } from './server.js';

createServer()
  .then((server) => server.connect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  const readme = `# ${name}

${description ?? 'MCP tool server created by mcp-toolsmith.'}

## Tools
\n${tools.map((tool) => `- ${tool.name}: ${tool.description ?? 'No description'}`).join('\n')}\n`;

  await fs.writeFile(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  await fs.writeFile(path.join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  await fs.writeFile(path.join(targetDir, 'tools.json'), toolsJson);
  await fs.writeFile(path.join(targetDir, 'src', 'server.ts'), serverSource);
  await fs.writeFile(path.join(targetDir, 'src', 'index.ts'), indexSource);
  await fs.writeFile(path.join(targetDir, 'README.md'), readme);
}

export async function createServer() {
  const server = new Server(
    { name: 'mcp-toolsmith', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'create_tool',
        description: 'Scaffold a new MCP tool project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            tools: { type: 'array', items: { type: 'object' } },
            path: { type: 'string' },
          },
          required: ['name', 'tools'],
        },
      },
      {
        name: 'test_tool',
        description: 'Run tests on your tool before publishing',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
      {
        name: 'publish_tool',
        description: 'Publish tool to the registry',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            stake_amount: { type: 'number' },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_tools',
        description: 'Search the registry for tools',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        name: 'install_tool',
        description: 'Install a tool from the registry',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: 'endorse_tool',
        description: 'Endorse a tool you find useful',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            comment: { type: 'string' },
          },
          required: ['name'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_tool': {
          const parsed = createToolSchema.parse(args);
          const root = parsed.path || path.join(getWorkspaceRoot(), parsed.name);
          await scaffoldToolProject(root, parsed.name, parsed.description, parsed.tools);
          return { content: [{ type: 'text', text: JSON.stringify({ path: root }) }] };
        }
        case 'test_tool': {
          const parsed = testToolSchema.parse(args);
          const { stdout, stderr } = await execAsync('npm test', { cwd: parsed.path });
          return {
            content: [
              { type: 'text', text: stdout || 'Tests completed.' },
              ...(stderr ? [{ type: 'text', text: stderr }] : []),
            ],
          };
        }
        case 'publish_tool': {
          const parsed = publishToolSchema.parse(args);
          const pkgPath = path.join(parsed.path, 'package.json');
          const raw = await fs.readFile(pkgPath, 'utf8');
          const pkg = JSON.parse(raw) as { name?: string; version?: string; description?: string };
          if (!pkg.name || !pkg.version) {
            throw new Error('package.json must include name and version');
          }

          const toolsPath = path.join(parsed.path, 'tools.json');
          const toolsRaw = await fs.readFile(toolsPath, 'utf8').catch(() => '[]');
          const tools = JSON.parse(toolsRaw) as ToolDefinition[];
          const tags = parsed.tags ?? [];

          const registry = await loadRegistry();
          const storageRoot = getRegistryStorageRoot();
          const storagePath = path.join(storageRoot, 'tools', pkg.name, pkg.version);
          await removeDirectory(storagePath);
          await copyDirectory(parsed.path, storagePath);

          const existing = registry.tools.find(
            (entry) => entry.name === pkg.name && entry.version === pkg.version
          );
          if (existing) {
            existing.description = pkg.description ?? existing.description;
            existing.tags = tags;
            existing.tools = tools;
            existing.storagePath = storagePath;
          } else {
            registry.tools.push({
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              tags,
              tools,
              publishedAt: Date.now(),
              storagePath,
              installs: 0,
              endorsements: [],
            });
          }
          await saveRegistry(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ name: pkg.name, version: pkg.version, storagePath }, null, 2),
              },
            ],
          };
        }
        case 'search_tools': {
          const parsed = searchToolSchema.parse(args ?? {});
          const registry = await loadRegistry();
          const query = parsed.query?.toLowerCase();
          const tags = parsed.tags ?? [];
          const results = registry.tools.filter((entry) => {
            const matchesQuery = query
              ? entry.name.toLowerCase().includes(query) ||
                (entry.description ?? '').toLowerCase().includes(query)
              : true;
            const matchesTags = tags.length
              ? tags.every((tag) => entry.tags.includes(tag))
              : true;
            return matchesQuery && matchesTags;
          });
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        }
        case 'install_tool': {
          const parsed = installToolSchema.parse(args);
          const registry = await loadRegistry();
          const candidates = registry.tools.filter((entry) => entry.name === parsed.name);
          if (!candidates.length) {
            throw new Error(`Tool not found: ${parsed.name}`);
          }

          const version = resolveVersion(
            candidates.map((entry) => entry.version),
            parsed.version
          );
          if (!version) {
            throw new Error(`No version matches constraint: ${parsed.version ?? 'latest'}`);
          }

          const selected = candidates.find((entry) => entry.version === version);
          if (!selected) {
            throw new Error(`Registry entry not found for ${parsed.name}@${version}`);
          }

          const home = process.env.AGENT_HOME || process.env.HOME || '.';
          const agentId = process.env.AGENT_ID;
          const toolsRoot = agentId
            ? path.join(home, '.co-code', 'agents', agentId, 'tools')
            : path.join(home, '.co-code', 'tools');
          const installPath = path.join(toolsRoot, parsed.name);

          await removeDirectory(installPath);
          await copyDirectory(selected.storagePath, installPath);
          await fs.writeFile(path.join(installPath, 'installed_version'), version, 'utf8');
          await fs.writeFile(
            path.join(installPath, 'version_constraint'),
            parsed.version ?? 'latest',
            'utf8'
          );

          selected.installs += 1;
          await saveRegistry(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ name: parsed.name, version, installPath }, null, 2),
              },
            ],
          };
        }
        case 'endorse_tool': {
          const parsed = endorseToolSchema.parse(args);
          const registry = await loadRegistry();
          const entries = registry.tools.filter((entry) => entry.name === parsed.name);
          if (!entries.length) {
            throw new Error(`Tool not found: ${parsed.name}`);
          }
          const version = parsed.version ?? resolveVersion(entries.map((entry) => entry.version));
          const target = entries.find((entry) => entry.version === version);
          if (!target) {
            throw new Error(`Version not found for ${parsed.name}@${parsed.version}`);
          }
          target.endorsements.push({
            endorser: process.env.AGENT_ID || process.env.USER || 'anonymous',
            comment: parsed.comment,
            createdAt: Date.now(),
          });
          await saveRegistry(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ name: target.name, version: target.version }, null, 2),
              },
            ],
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return {
    async connect() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
