// ─── Bestiary Domain ──────────────────────────────────────────────
// Types and logic for tracking enemy encounters and codex completion.
// Records per-archetype stats on victory.

export interface BestiaryEntry {
  readonly archetypeId: string;
  readonly displayName: string;
  readonly timesDefeated: number;
  readonly firstDefeatedAt: number;   // unix ms
  readonly lastDefeatedAt: number;    // unix ms
  readonly highestDamageDealt: number;
  readonly totalDamageDealt: number;
}

export interface BestiaryState {
  readonly entries: Record<string, BestiaryEntry>;
  readonly totalEnemiesDefeated: number;
  readonly uniqueArchetypesEncountered: number;
}

export const EMPTY_BESTIARY: BestiaryState = {
  entries: {},
  totalEnemiesDefeated: 0,
  uniqueArchetypesEncountered: 0,
};

/** Record a defeated enemy archetype. Upserts the bestiary entry. */
export function recordDefeat(
  state: BestiaryState,
  archetypeId: string,
  displayName: string,
  damageDealt: number,
): BestiaryState {
  const now = Date.now();
  const existing = state.entries[archetypeId];
  const isNew = existing === undefined;

  const updated: BestiaryEntry = existing
    ? {
        ...existing,
        timesDefeated: existing.timesDefeated + 1,
        lastDefeatedAt: now,
        highestDamageDealt: Math.max(existing.highestDamageDealt, damageDealt),
        totalDamageDealt: existing.totalDamageDealt + damageDealt,
      }
    : {
        archetypeId,
        displayName,
        timesDefeated: 1,
        firstDefeatedAt: now,
        lastDefeatedAt: now,
        highestDamageDealt: damageDealt,
        totalDamageDealt: damageDealt,
      };

  return {
    entries: { ...state.entries, [archetypeId]: updated },
    totalEnemiesDefeated: state.totalEnemiesDefeated + 1,
    uniqueArchetypesEncountered: state.uniqueArchetypesEncountered + (isNew ? 1 : 0),
  };
}
