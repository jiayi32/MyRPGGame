import {
  BRAND_ICONS,
  SOLID_ICONS,
  hasBrandIcon,
  hasSolidIcon,
  resolveBrandIcon,
  resolveSolidIcon,
} from '../registry';

// Under Jest (jest-expo preset) PNG requires are transformed via
// react-native/jest/assetFileTransformer.js, which returns `{ testUri: '...' }`.
// A `require()` that fails to resolve a file on disk throws at module load,
// so importing the registry above is itself a smoke test of filesystem presence.
// Under Metro (production bundle), the same requires return numeric asset IDs
// — the type annotation in the registry reflects that shape, not the Jest stub.

describe('icon registry', () => {
  test('SOLID_ICONS has exactly 190 entries', () => {
    expect(Object.keys(SOLID_ICONS)).toHaveLength(190);
  });

  test('BRAND_ICONS has exactly 45 entries', () => {
    expect(Object.keys(BRAND_ICONS)).toHaveLength(45);
  });

  test('every SOLID_ICONS entry resolves to a defined module', () => {
    const missing: string[] = [];
    for (const [slug, mod] of Object.entries(SOLID_ICONS)) {
      if (mod === undefined || mod === null) missing.push(slug);
    }
    expect(missing).toEqual([]);
  });

  test('every BRAND_ICONS entry resolves to a defined module', () => {
    const missing: string[] = [];
    for (const [slug, mod] of Object.entries(BRAND_ICONS)) {
      if (mod === undefined || mod === null) missing.push(slug);
    }
    expect(missing).toEqual([]);
  });

  test('resolveSolidIcon returns a defined value for a known slug', () => {
    expect(resolveSolidIcon('fire')).toBeDefined();
    expect(resolveSolidIcon('crown')).toBeDefined();
    expect(resolveSolidIcon('bolt')).toBeDefined();
  });

  test('resolveBrandIcon returns a defined value for a known slug', () => {
    expect(resolveBrandIcon('github')).toBeDefined();
    expect(resolveBrandIcon('hackernoon')).toBeDefined();
  });

  test('hasSolidIcon typeguard accepts known, rejects unknown', () => {
    expect(hasSolidIcon('fire')).toBe(true);
    expect(hasSolidIcon('not-a-real-icon')).toBe(false);
  });

  test('hasBrandIcon typeguard accepts known, rejects unknown', () => {
    expect(hasBrandIcon('github')).toBe(true);
    expect(hasBrandIcon('not-a-brand')).toBe(false);
  });

  test('SOLID and BRAND slug namespaces do not collide', () => {
    const solidKeys = new Set(Object.keys(SOLID_ICONS));
    const collisions = Object.keys(BRAND_ICONS).filter((k) => solidKeys.has(k));
    expect(collisions).toEqual([]);
  });
});
