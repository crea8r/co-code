import { describe, expect, it } from 'vitest';
import { resolveVersion } from '../registry.js';

describe('registry semver', () => {
  it('resolves latest when no constraint', () => {
    const version = resolveVersion(['1.0.0', '1.2.0', '2.0.0']);
    expect(version).toBe('2.0.0');
  });

  it('resolves caret ranges', () => {
    const version = resolveVersion(['1.0.0', '1.2.0', '2.0.0'], '^1.0.0');
    expect(version).toBe('1.2.0');
  });

  it('resolves tilde ranges', () => {
    const version = resolveVersion(['1.2.0', '1.2.5', '1.3.0'], '~1.2.0');
    expect(version).toBe('1.2.5');
  });

  it('resolves exact versions', () => {
    const version = resolveVersion(['1.0.0', '1.2.0'], '1.2.0');
    expect(version).toBe('1.2.0');
  });
});
