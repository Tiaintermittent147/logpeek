import type { DeviceInfo, Shell } from '../types.js';
import { discoverAndroidDevices } from './android.js';
import { discoverIosDevices } from './ios.js';
import { getLogger } from '../logger.js';
import { isMacOS, hasCommand } from '../platform.js';

export class DeviceDiscovery {
  private shell: Shell;

  constructor(shell: Shell) {
    this.shell = shell;
  }

  async list(): Promise<DeviceInfo[]> {
    const results: DeviceInfo[] = [];
    const logger = getLogger();

    if (await hasCommand(this.shell, 'adb')) {
      try {
        const android = await discoverAndroidDevices(this.shell);
        results.push(...android);
      } catch (err) {
        logger.debug({ err }, 'Android discovery failed');
      }
    } else {
      logger.debug('adb not found, skipping Android discovery');
    }

    if (isMacOS() && await hasCommand(this.shell, 'xcrun')) {
      try {
        const ios = await discoverIosDevices(this.shell);
        results.push(...ios);
      } catch (err) {
        logger.debug({ err }, 'iOS discovery failed');
      }
    } else if (!isMacOS()) {
      logger.debug('Not macOS, skipping iOS simulator discovery');
    } else {
      logger.debug('xcrun not found, skipping iOS discovery');
    }

    return results;
  }
}
