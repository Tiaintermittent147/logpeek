import { Command } from 'commander';
import { createRequire } from 'module';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { RealShell } from './shell.js';
import { createLogger, setLogger } from './logger.js';
import { runLogs } from './commands/logs.js';
import { runDevices } from './commands/devices.js';
import { runDoctor } from './commands/doctor.js';
import type { LogLevel, LogSource, Framework } from './types.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export function createProgram(): Command {
  const program = new Command();
  program
    .name('logpipe')
    .description('Pipe mobile device logs to AI coding agents')
    .version(pkg.version)
    .option('--verbose', 'enable debug logging')
    .option('--quiet', 'suppress all output except errors')
    .option('--app <id>', 'bundle ID / package name of the app')
    .option('--source <type>', 'log source: all, native, framework', 'all')
    .option('--framework <type>', 'framework: react-native, flutter')
    .option('-d, --device <id>', 'device ID or name')
    .option('--platform <type>', 'platform: android, ios')
    .option('--lines <n>', 'max lines to output', '200')
    .option('--level <level>', 'minimum log level: verbose, debug, info, warn, error', 'verbose')
    .option('--last <duration>', 'time window (e.g., 1m, 5m, 1h)', '5m');

  program.hook('preAction', (_thisCommand, actionCommand) => {
    const opts = actionCommand.optsWithGlobals();
    const level = opts.verbose ? 'debug' : opts.quiet ? 'silent' : 'info';
    setLogger(createLogger(level));
  });

  program
    .command('logs', { isDefault: true })
    .description('Collect and display device logs')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals();
      if (!opts.app) {
        throw new Error('--app is required. Pass the bundle ID or package name (e.g., --app com.example.myapp)');
      }
      const shell = new RealShell();
      await runLogs(shell, {
        app: opts.app as string,
        device: opts.device as string | undefined,
        platform: opts.platform as 'android' | 'ios' | undefined,
        source: opts.source as LogSource,
        framework: opts.framework as Framework | undefined,
        level: opts.level as LogLevel,
        lines: parseInt(opts.lines as string, 10),
        last: opts.last as string,
      });
    });

  program
    .command('devices')
    .description('List connected devices and simulators')
    .action(async () => {
      const shell = new RealShell();
      await runDevices(shell);
    });

  program
    .command('doctor')
    .description('Check system prerequisites')
    .action(async () => {
      const shell = new RealShell();
      await runDoctor(shell);
    });

  program
    .command('init')
    .description('Register logpipe with AI coding tools')
    .action(() => {
      const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
      const pluginSource = join(packageRoot, 'logpipe-plugin');

      if (!existsSync(pluginSource)) {
        console.error(`logpipe-plugin directory not found at ${pluginSource}`);
        process.exitCode = 1;
        return;
      }

      const pluginsDir = join(homedir(), '.claude', 'plugins');
      const logpipePluginDir = join(pluginsDir, 'logpipe');
      const registryPath = join(pluginsDir, 'installed_plugins.json');

      mkdirSync(pluginsDir, { recursive: true });

      if (existsSync(logpipePluginDir)) {
        try { unlinkSync(logpipePluginDir); } catch {
          console.error(`Could not remove existing ${logpipePluginDir}. Remove it manually and retry.`);
          process.exitCode = 1;
          return;
        }
      }
      symlinkSync(pluginSource, logpipePluginDir);

      const cacheDir = join(pluginsDir, 'cache', 'local', 'logpipe');
      if (existsSync(cacheDir)) {
        rmSync(cacheDir, { recursive: true, force: true });
      }

      let registry: { version: number; plugins: Record<string, unknown[]> } = { version: 2, plugins: {} };
      try {
        registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
      } catch {}

      registry.plugins['logpipe@local'] = [{
        scope: 'user',
        installPath: logpipePluginDir,
        version: pkg.version,
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }];

      writeFileSync(registryPath, JSON.stringify(registry, null, 2));
      console.log('\u2713 Claude Code: logpipe registered as plugin. Restart Claude Code to pick it up.');
    });

  return program;
}

export function run(argv: string[]): void {
  const program = createProgram();
  program.parseAsync(argv);
}
