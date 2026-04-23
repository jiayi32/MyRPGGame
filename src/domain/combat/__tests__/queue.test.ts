import { advance, nextReadyDelta, pickReady, shiftCT, sortedTurnOrder, spendCT } from '../queue';
import { toInstanceId, type StatusInstance } from '../types';
import { buildBattle } from './fixtures';

describe('queue', () => {
  test('pickReady returns the only ready unit', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 10 },
    ]);
    expect(pickReady(state)?.id).toBe(toInstanceId('p'));
  });

  test('pickReady uses speed tiebreaker when two units tied at ct=0', () => {
    const state = buildBattle(1, [
      { id: 'slow', team: 'player', ct: 0, stats: { speed: 40 } },
      { id: 'fast', team: 'enemy', ct: 0, stats: { speed: 80 } },
    ]);
    expect(pickReady(state)?.id).toBe(toInstanceId('fast'));
  });

  test('pickReady uses insertionIndex as final tiebreaker', () => {
    const state = buildBattle(1, [
      { id: 'a', team: 'player', ct: 0, insertionIndex: 2 },
      { id: 'b', team: 'enemy', ct: 0, insertionIndex: 0 },
    ]);
    expect(pickReady(state)?.id).toBe(toInstanceId('b'));
  });

  test('pickReady skips stunned ready units', () => {
    const state = buildBattle(1, [
      { id: 'a', team: 'player', ct: 0 },
      { id: 'b', team: 'enemy', ct: 0 },
    ]);
    const stun: StatusInstance = {
      id: toInstanceId('stun'),
      kind: 'stun',
      sourceUnitId: toInstanceId('b'),
      skillId: 's',
      snapshot: {
        magnitude: 0,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
      },
      remainingSec: 5,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };
    const withStun = {
      ...state,
      units: {
        ...state.units,
        [toInstanceId('a')]: {
          ...state.units[toInstanceId('a')]!,
          statuses: [stun],
        },
      },
    };
    expect(pickReady(withStun)?.id).toBe(toInstanceId('b'));
  });

  test('advance moves all units forward by smallest ct delta', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 20 },
      { id: 'e', team: 'enemy', ct: 35 },
    ]);
    const after = advance(state);
    expect(after.units[toInstanceId('p')]!.ct).toBe(0);
    expect(after.units[toInstanceId('e')]!.ct).toBe(15);
    expect(after.elapsedSec).toBe(20);
    expect(after.tick).toBe(1);
  });

  test('advance is a no-op when battle has ended', () => {
    const state = { ...buildBattle(1, [{ id: 'p', team: 'player', ct: 10 }]), result: 'won' as const };
    const after = advance(state);
    expect(after).toBe(state);
  });

  test('nextReadyDelta returns zero when someone is already ready', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 20 },
    ]);
    expect(nextReadyDelta(state)).toBe(0);
  });

  test('spendCT increments unit ct and resorts order', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 20 },
    ]);
    const after = spendCT(state, toInstanceId('p'), 40);
    expect(after.units[toInstanceId('p')]!.ct).toBe(40);
    expect(after.turnOrder[0]).toBe(toInstanceId('e'));
  });

  test('shiftCT can accelerate or delay a unit', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 30 },
      { id: 'e', team: 'enemy', ct: 20 },
    ]);
    const after = shiftCT(state, toInstanceId('p'), -25);
    expect(after.units[toInstanceId('p')]!.ct).toBe(5);
    expect(after.turnOrder[0]).toBe(toInstanceId('p'));
  });

  test('sortedTurnOrder excludes dead units', () => {
    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 10 },
    ]);
    const dead = {
      ...state.units,
      [toInstanceId('p')]: { ...state.units[toInstanceId('p')]!, isDead: true, hp: 0 },
    };
    const order = sortedTurnOrder(dead);
    expect(order).toEqual([toInstanceId('e')]);
  });

  // Regression: when ALL alive ct≤0 units are stunned, nextReadyDelta must return
  // a positive delta (the soonest stun expiry) so advance() can progress past
  // the stun instead of returning dt=0 and soft-locking the combat loop.
  test('nextReadyDelta returns stun remaining when all ready units are stunned', () => {
    const stun = (remainingSec: number): StatusInstance => ({
      id: toInstanceId(`stun_${remainingSec}`),
      kind: 'stun',
      sourceUnitId: toInstanceId('e'),
      skillId: 'stun.skill',
      snapshot: {
        magnitude: 0,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
      },
      remainingSec,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    });

    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 15 },
    ]);

    // Stun the player (only ct=0 unit) — enemy still has positive ct
    const withStun = {
      ...state,
      units: {
        ...state.units,
        [toInstanceId('p')]: {
          ...state.units[toInstanceId('p')]!,
          statuses: [stun(3)],
        },
      },
    };

    // Should return min(enemy_ct=15, stun_remaining=3) = 3, NOT 0 (soft-lock) and NOT 15
    // — advancing by 3 expires the stun; the enemy ticks from 15→12
    expect(nextReadyDelta(withStun)).toBe(3);

    // Stun both units at ct=0 — should use shortest stun remaining
    const bothState = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 0 },
    ]);
    const bothStunned = {
      ...bothState,
      units: {
        ...bothState.units,
        [toInstanceId('p')]: {
          ...bothState.units[toInstanceId('p')]!,
          statuses: [stun(2)],
        },
        [toInstanceId('e')]: {
          ...bothState.units[toInstanceId('e')]!,
          statuses: [stun(5)],
        },
      },
    };

    // Returns shortest stun remaining (2) so time can advance and the stun expires
    expect(nextReadyDelta(bothStunned)).toBe(2);
  });

  test('advance progresses time when all ready units are stunned, allowing stun to expire', () => {
    const stun: StatusInstance = {
      id: toInstanceId('stun_short'),
      kind: 'stun',
      sourceUnitId: toInstanceId('e'),
      skillId: 'stun.skill',
      snapshot: {
        magnitude: 0,
        magnitudeUnit: 'flat',
        sourceStrength: 0,
        sourceIntellect: 0,
        sourceAgility: 0,
      },
      remainingSec: 5,
      stacks: 1,
      tickIntervalSec: 1,
      secSinceLastTick: 0,
      tags: [],
    };

    const state = buildBattle(1, [
      { id: 'p', team: 'player', ct: 0 },
      { id: 'e', team: 'enemy', ct: 10 },
    ]);
    const withStun = {
      ...state,
      units: {
        ...state.units,
        [toInstanceId('p')]: {
          ...state.units[toInstanceId('p')]!,
          statuses: [stun],
        },
      },
    };

    // advance() must not return the same state (soft-lock check)
    const after = advance(withStun);
    expect(after).not.toBe(withStun);
    // advance by min(enemy_ct=10, stun_remaining=5) = 5; enemy advances 10→5
    expect(after.units[toInstanceId('e')]!.ct).toBe(5);
    // Player stun ticks down by 5 (from 5 remaining), should be expired
    expect(after.units[toInstanceId('p')]!.statuses.some((s) => s.kind === 'stun')).toBe(false);
  });
});
