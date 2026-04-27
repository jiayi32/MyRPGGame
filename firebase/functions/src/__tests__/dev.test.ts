import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { HttpsError } from 'firebase-functions/v2/https';

import { requireDevTools } from '../shared/guards.js';

/**
 * Dev-tooling test surface.
 *
 * The full transactional behavior of the four dev callables (devSkipStage,
 * devGrantAllClasses, devResetPlayer, devSetCurrencies) is exercised end-to-end
 * by the emulator smoke ([scripts/smokeRun.ts]). What we cover here is the pure
 * gate: `requireDevTools` is the only safety between production traffic and a
 * destructive callable, so it deserves explicit coverage independent of the
 * emulator runtime.
 */

const ENV_DEV_FLAG = 'ALLOW_DEV_TOOLS';
const ENV_EMULATOR = 'FUNCTIONS_EMULATOR';

interface EnvSnapshot {
  allow: string | undefined;
  emulator: string | undefined;
}

function captureEnv(): EnvSnapshot {
  return {
    allow: process.env[ENV_DEV_FLAG],
    emulator: process.env[ENV_EMULATOR],
  };
}

function restoreEnv(snapshot: EnvSnapshot): void {
  if (snapshot.allow === undefined) delete process.env[ENV_DEV_FLAG];
  else process.env[ENV_DEV_FLAG] = snapshot.allow;
  if (snapshot.emulator === undefined) delete process.env[ENV_EMULATOR];
  else process.env[ENV_EMULATOR] = snapshot.emulator;
}

describe('requireDevTools (gate)', () => {
  let original: EnvSnapshot;

  beforeEach(() => {
    original = captureEnv();
  });

  afterEach(() => {
    restoreEnv(original);
  });

  it('throws permission-denied when both flags are unset', () => {
    delete process.env[ENV_DEV_FLAG];
    delete process.env[ENV_EMULATOR];
    assert.throws(
      () => requireDevTools(),
      (err: unknown) => err instanceof HttpsError && err.code === 'permission-denied',
    );
  });

  it('throws permission-denied when ALLOW_DEV_TOOLS is set but not the literal "true"', () => {
    process.env[ENV_DEV_FLAG] = '1';
    delete process.env[ENV_EMULATOR];
    assert.throws(
      () => requireDevTools(),
      (err: unknown) => err instanceof HttpsError && err.code === 'permission-denied',
    );
  });

  it('allows when ALLOW_DEV_TOOLS === "true"', () => {
    process.env[ENV_DEV_FLAG] = 'true';
    delete process.env[ENV_EMULATOR];
    assert.doesNotThrow(() => requireDevTools());
  });

  it('allows when running under the Firebase emulator (FUNCTIONS_EMULATOR === "true")', () => {
    delete process.env[ENV_DEV_FLAG];
    process.env[ENV_EMULATOR] = 'true';
    assert.doesNotThrow(() => requireDevTools());
  });

  it('allows when both flags are set to "true"', () => {
    process.env[ENV_DEV_FLAG] = 'true';
    process.env[ENV_EMULATOR] = 'true';
    assert.doesNotThrow(() => requireDevTools());
  });

  it('throws permission-denied when emulator flag is set to a non-"true" value', () => {
    delete process.env[ENV_DEV_FLAG];
    process.env[ENV_EMULATOR] = 'TRUE'; // wrong case — strict equality
    assert.throws(
      () => requireDevTools(),
      (err: unknown) => err instanceof HttpsError && err.code === 'permission-denied',
    );
  });
});
