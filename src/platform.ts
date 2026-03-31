import { platform } from 'node:os';

export function isMacOS(): boolean {
  return platform() === 'darwin';
}

export async function hasCommand(shell: { exec: (cmd: string, args: string[], opts?: { timeout?: number }) => Promise<{ stdout: string; stderr: string }> }, cmd: string): Promise<boolean> {
  try {
    await shell.exec(cmd, ['--version'], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
