import { useEffect, useRef } from 'react';
import { useCombatStore } from '@/stores/combatStore';
import type { BattleEvent } from '@/domain/combat';

/**
 * Subscribe to newly-appended combat-log events.
 *
 * The combat engine produces an append-only log on `engine.state.log`. This
 * hook tracks the last-seen log length per subscriber and invokes `handler`
 * with each new event since the previous render. Used by animation
 * components (damage popups, cast pulses) without any engine changes.
 *
 * The handler runs synchronously in a `useEffect` body — it should be cheap
 * (set state, schedule timing) and idempotent against re-renders.
 */
export function useCombatEventStream(
  handler: (event: BattleEvent, indexInLog: number) => void,
): void {
  const lastSeenLengthRef = useRef(0);

  useEffect(() => {
    // Subscribe to engine.state.log length changes via Zustand selector.
    return useCombatStore.subscribe((state, prev) => {
      const log = state.engine?.state.log ?? [];
      const prevLog = prev.engine?.state.log ?? [];

      // Engine reset / new battle: reset cursor to current length.
      if (log === prevLog) return;
      if (prev.engine !== state.engine && log.length === 0) {
        lastSeenLengthRef.current = 0;
        return;
      }
      // If the log shrank (battle restart) reset the cursor.
      if (log.length < lastSeenLengthRef.current) {
        lastSeenLengthRef.current = 0;
      }

      const start = lastSeenLengthRef.current;
      for (let i = start; i < log.length; i += 1) {
        const event = log[i];
        if (event !== undefined) handler(event, i);
      }
      lastSeenLengthRef.current = log.length;
    });
  }, [handler]);
}
