import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface PublishRequest {
  name: string;
  sourcePath: string;
  description: string;
  tags: string[];
}

export interface PublishResult {
  success: boolean;
  toolId?: string;
  stages: {
    lint: { passed: boolean; errors?: string[] };
    test: { passed: boolean; results?: string };
    security: { passed: boolean; warnings?: string[] };
  };
}

type SecurityScanResult = {
  passed: boolean;
  warnings: string[];
  errors: string[];
};

const AUTO_FAIL_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\beval\s*\(/, message: 'eval() usage' },
  { pattern: /\bnew Function\s*\(/, message: 'new Function() usage' },
  { pattern: /\bvm\.runInContext\s*\(/, message: 'vm.runInContext() usage' },
  { pattern: /\bchild_process\.(exec|spawn)\s*\(/, message: 'child_process exec/spawn' },
  { pattern: /\bfs\.(rm|rmdir)\s*\([^)]*recursive\s*:\s*true/i, message: 'recursive fs.rm/rmdir' },
  { pattern: /\bprocess\.env\b/, message: 'process.env access' },
  { pattern: /import\s*\(\s*['"]http/, message: 'network import' },
];

const FLAG_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bfs\.writeFile\s*\(/, message: 'fs.writeFile usage' },
  { pattern: /\brequire\s*\(/, message: 'dynamic require() usage' },
  { pattern: /\bimport\s*\(/, message: 'dynamic import() usage' },
  { pattern: /__proto__|prototype\s*\[|constructor\s*\[/, message: 'possible prototype pollution' },
];

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git']);

async function listFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  };
  await walk(root);
  return results;
}

async function scanSecurity(sourcePath: string): Promise<SecurityScanResult> {
  const files = await listFiles(sourcePath);
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = path.extname(file);
    if (!['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) continue;
    const content = await fs.readFile(file, 'utf8');

    for (const rule of AUTO_FAIL_PATTERNS) {
      if (rule.pattern.test(content)) {
        errors.push(`${rule.message} in ${path.relative(sourcePath, file)}`);
      }
    }

    for (const rule of FLAG_PATTERNS) {
      if (rule.pattern.test(content)) {
        warnings.push(`${rule.message} in ${path.relative(sourcePath, file)}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
  };
}

async function runScript(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<{ passed: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    return {
      passed: true,
      output: [stdout, stderr].filter(Boolean).join('\n'),
    };
  } catch (error: any) {
    return {
      passed: false,
      output: error?.stdout || '',
      error: error?.stderr || error?.message || 'Command failed',
    };
  }
}

async function hasScript(sourcePath: string, script: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(sourcePath, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return Boolean(pkg.scripts?.[script]);
  } catch {
    return false;
  }
}

export async function runPublishPipeline(
  request: PublishRequest,
  options: { timeoutMs?: number } = {}
): Promise<PublishResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const lintErrors: string[] = [];
  const testErrors: string[] = [];

  const lintScriptExists = await hasScript(request.sourcePath, 'lint');
  const lintResult = lintScriptExists
    ? await runScript('npm run lint', request.sourcePath, timeoutMs)
    : { passed: false, output: '', error: 'lint script not found' };
  if (!lintResult.passed) lintErrors.push(lintResult.error ?? 'Lint failed');

  const testScriptExists = await hasScript(request.sourcePath, 'test');
  const testResult = testScriptExists
    ? await runScript('npm test -- --run', request.sourcePath, timeoutMs)
    : { passed: false, output: '', error: 'test script not found' };
  if (!testResult.passed) testErrors.push(testResult.error ?? 'Tests failed');

  const securityResult = await scanSecurity(request.sourcePath);

  const lintPassed = lintErrors.length === 0;
  const testPassed = testErrors.length === 0;
  const securityPassed = securityResult.passed && securityResult.warnings.length === 0;

  return {
    success: lintPassed && testPassed && securityPassed,
    stages: {
      lint: { passed: lintPassed, errors: lintErrors.length ? lintErrors : undefined },
      test: { passed: testPassed, results: testResult.output || undefined },
      security: {
        passed: securityResult.passed,
        warnings: [...securityResult.errors, ...securityResult.warnings].length
          ? [...securityResult.errors, ...securityResult.warnings]
          : undefined,
      },
    },
  };
}
