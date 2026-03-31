import { describe, it, expect } from 'vitest';
import { filterByLevel, filterBySource, trimLines, parseLastDuration } from '../../../src/logs/filter.js';

describe('parseLastDuration', () => {
  it('parses minutes', () => {
    expect(parseLastDuration('5m')).toBe(5 * 60);
  });

  it('parses seconds', () => {
    expect(parseLastDuration('30s')).toBe(30);
  });

  it('parses hours', () => {
    expect(parseLastDuration('1h')).toBe(3600);
  });

  it('defaults to minutes for bare number', () => {
    expect(parseLastDuration('10')).toBe(600);
  });
});

describe('filterByLevel', () => {
  const lines = [
    'V/MyApp: verbose message',
    'D/MyApp: debug message',
    'I/MyApp: info message',
    'W/MyApp: warning message',
    'E/MyApp: error message',
  ];

  it('returns all lines for verbose', () => {
    expect(filterByLevel(lines, 'verbose', 'android')).toHaveLength(5);
  });

  it('filters to warn and above', () => {
    const result = filterByLevel(lines, 'warn', 'android');
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('warning');
    expect(result[1]).toContain('error');
  });

  it('filters to error only', () => {
    const result = filterByLevel(lines, 'error', 'android');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('error');
  });
});

describe('filterBySource', () => {
  const lines = [
    'I/ReactNativeJS: console.log output',
    'I/flutter: Flutter engine log',
    'I/ActivityManager: native system log',
    'D/MyApp: app native log',
  ];

  it('returns all lines for source=all', () => {
    expect(filterBySource(lines, 'all', 'android')).toHaveLength(4);
  });

  it('filters framework lines for react-native', () => {
    const result = filterBySource(lines, 'framework', 'android', 'react-native');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('ReactNativeJS');
  });

  it('filters framework lines for flutter', () => {
    const result = filterBySource(lines, 'framework', 'android', 'flutter');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('flutter');
  });

  it('excludes framework lines for source=native', () => {
    const result = filterBySource(lines, 'native', 'android');
    expect(result).toHaveLength(2);
    expect(result.some(l => l.includes('ReactNativeJS'))).toBe(false);
    expect(result.some(l => l.includes('flutter'))).toBe(false);
  });
});

describe('trimLines', () => {
  it('trims to max lines', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line ${i}`);
    expect(trimLines(lines, 200)).toHaveLength(200);
  });

  it('keeps last N lines (most recent)', () => {
    const lines = ['old', 'middle', 'recent'];
    const result = trimLines(lines, 2);
    expect(result).toEqual(['middle', 'recent']);
  });
});
