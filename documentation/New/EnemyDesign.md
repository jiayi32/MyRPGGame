# Enemy Design — Generic Stage Enemies

**Status:** Authoritative for P1 content. Closes gap G2 from [INTEGRATION_REPORT.md §8](../INTEGRATION_REPORT.md).
**Scope:** Non-boss enemies that populate stages 1–4, 6–9, 11–29 (including stage 20 as procedural enemy pressure). Boss stages (5 / 10 / 30) are governed by [BossDesign.md](BossDesign.md).

---

## 1. Design Philosophy

Generic enemies are **parameterized archetype templates**, not bespoke units. Each stage's encounter pulls 1–3 enemies from the archetype pool and tunes their parameters (HP, damage, CT rate, mechanic intensity) to the stage's pressure band. This gives the Run Director variety without requiring ~300 bespoke enemy definitions.

**Rules:**

- Every non-boss stage uses 1–3 enemies drawn from the archetype pool.
- Each archetype maps to one of the **mini-boss roles** listed in [BossDesign.md §"10 MINI-BOSSES"](BossDesign.md) — the mini-boss at stage 5 is a *scaled-up* instance of the same archetype the player faced in stages 1–4.
- Mechanics are **readable from gameplay in 1–2 turns** — generic enemies teach the boss's mechanic rather than surprise the player at stage 5.
- Stats scale linearly with stage number via a per-tier multiplier (see §3). Mechanic intensity parameters (e.g., % damage cap) tune separately.
- Only 1 enemy per encounter may carry an exotic CT effect; stacking two CT-manipulation enemies is disallowed by the encounter builder.

---

## 2. Archetype Pool

Twelve archetypes total — ten core (paralleling BossDesign.md's stage-5 mini-boss pool) plus two reserves for Run Director variety.

| # | Archetype ID | Role | Signature mechanic | Counter build | CT effect |
|---|---|---|---|---|---|
| 1 | `stat_wall` | Stat wall | Caps damage taken per hit at `maxHitPct`% of max HP. | Multi-hit / DoT | none |
| 2 | `speed_pressure` | Speed pressure | Always acts first every `initiativeCycle` CT cycles. | Burst | slight enemy CT+ |
| 3 | `sustain_denial` | Sustain denial | Reduces incoming heals by `healReductionPct`%. | Shield / burst | heals self on player CT gain |
| 4 | `dps_race` | DPS race | Damage scales +`rampPerTurnPct`% per turn (uncapped until phase). | Control / stun | CT accelerates when low HP |
| 5 | `ct_manipulator` | CT manipulation | Every `manipulateIntervalCT` CT, rewinds one random target by `rewindCT`. | Stable rotations | direct CT interference |
| 6 | `summoner` | Summon pressure | Spawns a minion every `spawnIntervalTurns` turns; cap `minionCap`. | AoE | minions add CT clutter |
| 7 | `nullshield` | Defensive puzzle | Rotating damage-type immunity; rotates every `shieldRotateCT` CT. | Flexible skill loadout | shield rotates on CT threshold |
| 8 | `chaos_dps` | Chaos DPS | `doubleActionChance`% chance to double-act per turn. | Defensive | CT variance spikes |
| 9 | `oracle` | Prediction distortion | Telegraphs false skill outcomes `deceptionChance`% of the time. | Adaptive play | CT delay on player actions |
| 10 | `engineer` | Battlefield control | Field debuff: slows player CT gain by `ctSlowPct`% within the zone. | High CT-efficiency | global CT reduction zone |
| 11 | `harrier` *(reserve)* | Pressure + evasion | Grants self `evasionPct`% dodge while any ally is alive. | Execute / focus-fire | none |
| 12 | `resonator` *(reserve)* | Buff carrier | Buffs ally damage by `resonancePct`% per turn. | Priority-kill target | passive — prioritize tempo |

**Notes:**

- Archetypes 1–10 are 1:1 with the stage-5 mini-boss pool in BossDesign.md §"10 MINI-BOSSES." Mini-boss stage 5 uses the archetype with `bossScale: true` — boosted HP, extra phase, an added skill. This teaches-then-tests design is a deliberate pacing choice.
- Archetypes 11–12 are reserves for Run Director variety when the stage band has already shown the boss-preview archetype.

---

## 3. Stat Scaling

```
stageTierBand:
  1–4   → tier 1   (stages before first mini-boss)
  6–9   → tier 2   (stages before gate boss)
  11–19 → tier 3   (early mid-run)
  20    → tier 3.5 (procedural pressure checkpoint stage; not a guaranteed boss)
  21–29 → tier 4   (late-run pressure)
```

Base stats per tier (tuning placeholders — finalized in P6):

| Tier | HP base | ATK base | DEF base | CT per tick | Loot tier |
|---|---|---|---|---|---|
| 1 | 100 | 12 | 5 | 1.0 | T1 |
| 2 | 220 | 26 | 11 | 1.05 | T1–T2 |
| 3 | 480 | 56 | 24 | 1.1 | T2–T3 |
| 4 | 1050 | 120 | 52 | 1.15 | T3–T4 |

Within a tier, stage-to-stage variance: ±10% on HP/ATK rolls per encounter (seeded RNG).

---

## 4. Encounter Composition

Per non-boss stage:

- **Stages 1–4:** 1 enemy, archetype drawn from a seed pool skewed toward `stat_wall`, `speed_pressure`, `dps_race` (teachable fundamentals).
- **Stages 6–9:** 1–2 enemies, tier 2. Run Director begins mixing archetypes (e.g., `engineer` + `dps_race`).
- **Stages 11–19:** 2 enemies, tier 3. At most one CT-effect archetype (see Rules in §1).
- **Stages 21–29:** 2–3 enemies, tier 4. Archetypes include `resonator` + DPS pairings.

**Pre-boss foreshadowing (important):** The encounter in stage N-1 (before a boss stage) is always the **same archetype as the upcoming boss's role**. Example: if the stage-10 gate boss is `Vortex Colossus` (CT manipulation), stage 9's enemy is drawn from `ct_manipulator`. Teaches the fight.

---

## 5. TypeScript Schema (P1 target)

Add to `src/content/enemies.ts`:

```ts
export type EnemyArchetypeId =
  | 'stat_wall' | 'speed_pressure' | 'sustain_denial' | 'dps_race'
  | 'ct_manipulator' | 'summoner' | 'nullshield' | 'chaos_dps'
  | 'oracle' | 'engineer' | 'harrier' | 'resonator';

export interface EnemyArchetype {
  id: EnemyArchetypeId;
  name: string;
  role: string;                                      // "stat wall" | "DPS race" | ...
  mechanic: { id: string; params: Record<string, number> };
  counter: string;
  ctEffect: 'none' | 'enemy_ct_accel' | 'player_ct_drain' | 'global_ct_reduce' | 'ct_rewind' | 'ct_variance';
  bossScaleMultipliers: { hp: number; atk: number; phaseCount: number }; // applied when stage 5 uses this archetype
}

export interface EnemyInstance {
  archetypeId: EnemyArchetypeId;
  tier: 1 | 2 | 3 | 4;
  stats: { hp: number; atk: number; def: number; ctPerTick: number };
  mechanicParams: Record<string, number>;            // concrete values for this instance
  lootTier: 1 | 2 | 3 | 4;
}
```

The Run Director produces `EnemyInstance`s from `EnemyArchetype` + seed + stage.

---

## 6. Parameter Defaults (starting values, tune in P6)

| Archetype | Parameter | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|---|
| `stat_wall` | maxHitPct | 20 | 18 | 15 | 12 |
| `speed_pressure` | initiativeCycle | 3 | 3 | 2 | 2 |
| `sustain_denial` | healReductionPct | 40 | 50 | 60 | 70 |
| `dps_race` | rampPerTurnPct | 8 | 10 | 12 | 14 |
| `ct_manipulator` | manipulateIntervalCT / rewindCT | 60 / 10 | 50 / 15 | 40 / 20 | 30 / 25 |
| `summoner` | spawnIntervalTurns / minionCap | 4 / 1 | 4 / 2 | 3 / 2 | 3 / 3 |
| `nullshield` | shieldRotateCT | 80 | 70 | 60 | 50 |
| `chaos_dps` | doubleActionChance | 10 | 15 | 20 | 25 |
| `oracle` | deceptionChance | 15 | 20 | 25 | 30 |
| `engineer` | ctSlowPct | 8 | 10 | 12 | 15 |
| `harrier` | evasionPct | 20 | 25 | 30 | 35 |
| `resonator` | resonancePct | 10 | 12 | 15 | 18 |

Hard cap: `engineer.ctSlowPct` must respect the global CT-reduction cap (10%) per [INTEGRATION_REPORT.md §8 G5](../INTEGRATION_REPORT.md) — the tier-3 and tier-4 values above exceed it and must be clamped by the engine, or tiered values must drop to ≤10.

---

## 7. Verification

- P1 cross-ref validator: every encounter's `archetypeId` resolves to one of the 12 entries above.
- Balance harness (P6): no archetype has a >65% win rate on fixed-build controls across 10k seeded runs; no archetype drops below 20%.
- Encounter-builder rule: no stage has two enemies with `ctEffect !== 'none'` simultaneously active.
