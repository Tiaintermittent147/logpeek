import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceDiscovery } from '../../../src/devices/discovery.js';
import type { Shell } from '../../../src/types.js';

vi.mock('../../../src/platform.js', () => ({
  isMacOS: vi.fn(() => true),
  hasCommand: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../../src/logger.js', () => ({
  getLogger: () => ({ debug: vi.fn() }),
}));

import { isMacOS, hasCommand } from '../../../src/platform.js';

const mockedIsMacOS = vi.mocked(isMacOS);
const mockedHasCommand = vi.mocked(hasCommand);

describe('DeviceDiscovery', () => {
  let shell: Shell;

  beforeEach(() => {
    vi.clearAllMocks();
    shell = {
      exec: vi.fn()
        .mockResolvedValueOnce({ stdout: 'List of devices attached\nemulator-5554          device model:Pixel transport_id:1\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: JSON.stringify({ devices: {} }), stderr: '' }),
    };
  });

  it('discovers both platforms on macOS', async () => {
    mockedIsMacOS.mockReturnValue(true);
    mockedHasCommand.mockResolvedValue(true);

    const discovery = new DeviceDiscovery(shell);
    const devices = await discovery.list();

    expect(devices.length).toBe(1);
    expect(devices[0].platform).toBe('android');
  });

  it('skips iOS on non-macOS', async () => {
    mockedIsMacOS.mockReturnValue(false);
    mockedHasCommand.mockResolvedValue(true);

    const discovery = new DeviceDiscovery(shell);
    const devices = await discovery.list();

    expect(devices.length).toBe(1);
    expect(devices[0].platform).toBe('android');
    expect(shell.exec).toHaveBeenCalledTimes(1);
  });

  it('skips Android when adb is missing', async () => {
    mockedIsMacOS.mockReturnValue(true);
    mockedHasCommand.mockImplementation(async (_shell, cmd) => cmd !== 'adb');

    shell = {
      exec: vi.fn().mockResolvedValue({ stdout: JSON.stringify({ devices: {} }), stderr: '' }),
    };

    const discovery = new DeviceDiscovery(shell);
    const devices = await discovery.list();

    expect(devices.length).toBe(0);
    expect(shell.exec).toHaveBeenCalledTimes(1);
  });

  it('returns empty when no tools available', async () => {
    mockedIsMacOS.mockReturnValue(false);
    mockedHasCommand.mockResolvedValue(false);

    const discovery = new DeviceDiscovery(shell);
    const devices = await discovery.list();

    expect(devices.length).toBe(0);
    expect(shell.exec).not.toHaveBeenCalled();
  });
});
