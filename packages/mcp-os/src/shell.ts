import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(
  command: string,
  options?: { cwd?: string; timeoutMs?: number }
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options?.cwd,
      timeout: options?.timeoutMs ?? 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || 'Command failed',
      exitCode: typeof error.code === 'number' ? error.code : 1,
    };
  }
}

export async function globPaths(pattern: string, cwd?: string): Promise<string[]> {
  const script = `bash -lc 'shopt -s nullglob; for f in ${pattern}; do printf "%s\\n" "$f"; done'`;
  const result = await runCommand(script, { cwd });
  if (result.exitCode !== 0) return [];
  return result.stdout.split('\n').filter(Boolean);
}

export async function grepText(
  pattern: string,
  targetPath: string,
  cwd?: string
): Promise<string[]> {
  const rg = `rg -n "${escapeShell(pattern)}" "${escapeShell(targetPath)}"`;
  let result = await runCommand(rg, { cwd });
  if (result.exitCode !== 0) {
    const grep = `grep -RIn "${escapeShell(pattern)}" "${escapeShell(targetPath)}"`;
    result = await runCommand(grep, { cwd });
  }
  if (result.exitCode !== 0) return [];
  return result.stdout.split('\n').filter(Boolean);
}

function escapeShell(value: string): string {
  return value.replace(/"/g, '\\"');
}
