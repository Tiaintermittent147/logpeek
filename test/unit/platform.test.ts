import { describe, it, expect, vi } from 'vitest';
import { hasCommand } from '../../src/platform.js';
import type { Shell } from '../../src/types.js';

describe('hasCommand', () => {
  it('returns true when command exists', async () => {
    const shell: Shell = {
      exec: vi.fn().mockResolvedValue({ stdout: '1.0.0', stderr: '' }),
    };
    expect(await hasCommand(shell, 'adb')).toBe(true);
  });

  it('returns false when command is not found', async () => {
    const shell: Shell = {
      exec: vi.fn().mockRejectedValue(new Error('ENOENT')),
    };
    expect(await hasCommand(shell, 'adb')).toBe(false);
  });
});
