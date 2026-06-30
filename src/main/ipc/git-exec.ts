import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Run a git command and return stdout with trailing whitespace trimmed.
 */
export async function gitExec(args: string[], cwd: string): Promise<string> {
  return (await gitExecRaw(args, cwd)).trimEnd();
}

/**
 * Run a git command and return stdout as-is (untrimmed).
 */
export async function gitExecRaw(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}
