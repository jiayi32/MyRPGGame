# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Class framework (lineage × combat archetype)

- Schema additions to extract the structural insight from [documentation/New/ClassDesignBrainstorm.md](documentation/New/ClassDesignBrainstorm.md) without adopting its specific skill names, reversed tier direction, or new primary resources.
- [src/content/types/class.ts](src/content/types/class.ts): new `CombatArchetype` type (`'burst_dps' | 'sustain_dps' | 'tank' | 'support' | 'trickster'`); required `combatArchetype` field on `ClassData`; optional `coreLoop`, `damageIdentity`, `survivalIdentity` identity one-liners.
- [src/content/types/lineage.ts](src/content/types/lineage.ts): new `LineageUniqueMechanic` interface (`{ id, name, shortDescription, evolutionByTier: Record<ClassTier, string> }`) and required `uniqueMechanic: UnspecifiedOr<...>` field on `Lineage`.
- [src/content/classes/drakehornForge.ts](src/content/classes/drakehornForge.ts): retrofitted all 5 Drakehorn classes with `combatArchetype` + identity one-liners (T5 burst_dps, T4 sustain_dps, T3 support, T2 burst_dps, T1 trickster). No passive/skill behavior changed.
- [src/content/lineages.ts](src/content/lineages.ts): Drakehorn Forge `uniqueMechanic` filled with Heat spec + T5 → T1 evolution; other 11 lineages `uniqueMechanic: UNSPECIFIED`.
- [src/content/classes/stubs.ts](src/content/classes/stubs.ts): stub factory defaults `combatArchetype: 'burst_dps'` (to be re-evaluated when each lineage is authored in P1.5).

### Documentation

- [documentation/New/LineageMechanicCatalog.md](documentation/New/LineageMechanicCatalog.md): new authoritative per-lineage spec (12 entries). Each lineage lists its unique mechanic, encoding (stack-based via `StatusInstance.stacks`, not a new `primaryResource`), archetype-per-tier assignments, and T5 → T1 mechanic evolution. 1 lineage authored (Drakehorn/Heat); 11 seeded for P1.5.
- [documentation/New/LineageSystem.md](documentation/New/LineageSystem.md): pointer added to the new catalog near the top; cross-evolution graph content unchanged.
- [documentation/BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): new "Lineage unique mechanics" section tracks `uniqueMechanic` sentinel status alongside `upgradeBonuses`.

### Notes

- No combat engine changes. Heat and the 11 seeded mechanics are intended to ride on existing `StatusInstance.stacks` + `statTag` — no new `primaryResource` enum entries, no new effect kinds.
- Brainstorm's reversed tier direction (T1=simple, T5=apex in its second 60-class breakdown) is explicitly rejected; codebase convention remains **T5 = starter, T1 = apex**.

## [0.4.0] — 2026-04-21

### Added — P2 CombatEngine (client-authoritative domain core)

- [src/domain/combat/](src/domain/combat/): deterministic, pure-function combat engine sized for the locked 0.3.0 architecture (runs identically on client and in a Cloud Function for replay audit).
- [types.ts](src/domain/combat/types.ts): `Unit`, `BattleState`, `StatusInstance` (snapshot-based), `BattleEvent` discriminated union (10 variants), `Action`, `StepResult`, branded `InstanceId`.
- [prng.ts](src/domain/combat/prng.ts): Mulberry32 (seed, cursor) → u32 / `[0,1)` / range-int / chance. 32-bit seeds match the server-issued-seed contract.
- [d20.ts](src/domain/combat/d20.ts): 4-tier hit system (fail `1–9`, normal `10–17`, strong `18–19`, critical `20`) + d12 severity on crit (`1.25–4.0`). Mitigation `100 / (100 + 2 × DEF)`. Linear resistance clamped to `[0, 1]`.
- [stats.ts](src/domain/combat/stats.ts): base → effective pipeline; buff/debuff deltas via `statTag` aliasing; `CT_REDUCTION_CAP = 0.10` clamped at both base and effective layers.
- [queue.ts](src/domain/combat/queue.ts): CT queue (`ct asc`, `speed desc`, `insertionIndex asc`); event-driven `advance` ticks `dt = nextReadyDelta`, decrements cooldowns, ticks DoT/HoT with snapshot math, expires statuses, resolves win/loss/draw.
- [defaults.ts](src/domain/combat/defaults.ts): placeholder magnitude/duration/stacks/chance table for `UNSPECIFIED` sentinels; see [BALANCE_TUNING.md](documentation/BALANCE_TUNING.md) "Engine defaults".
- [factory.ts](src/domain/combat/factory.ts): `buildPlayerUnit` (tier baseline + passive stat overlays, HP from stamina, MP from intellect), `buildEnemyUnit` (archetype scaling row → unit stats), `buildBattleState`, `SYNTHETIC_BASIC_ATTACK` fallback for units without an authored basic attack.
- [validate.ts](src/domain/combat/validate.ts): `canCast` returns `{ ok, mpCost, hpCost, ctCost } | { ok: false, reason }` — enumerated `StepError` codes (`battle_ended`, `unit_dead`, `not_ready`, `unit_stunned`, `skill_not_owned`, `skill_on_cooldown`, `insufficient_resource`, `invalid_target`).
- [effects.ts](src/domain/combat/effects.ts): discriminated-union registry over all 15 `SkillEffectKind` values — damage, dot, heal, hot, buff, debuff, shield (with absorb logic), counter, ct_shift, execute, cleanse, lifesteal, status (generic), summon/utility (stub events for balance audit).
- [step.ts](src/domain/combat/step.ts): single-action reducer. Rolls d20 once per cast, deducts resources, charges CT, sets cooldown, resolves targets, applies all effects, re-sorts turn order, seals `battle_ended`.
- [index.ts](src/domain/combat/index.ts): barrel + `createEngine({ seed, units, skillLookup })` returning a `CombatEngine` façade (`ready`, `timeUntilReady`, `advance`, `step`, `withState`).
- Tests ([src/domain/combat/__tests__/](src/domain/combat/__tests__/)): `prng`, `d20`, `stats`, `queue`, `effects`, `determinism` (same seed → byte-identical log + state), `integration` (full-cycle battle, cooldown gating, MP deduction, DoT persistence across `advance`). 46 tests, all green.

### Fixed

- `advance` DoT/HoT tick accounting now clamps `effectiveDt = min(dt, remainingSec)` before computing `ticksFired`, so a status whose remaining duration is shorter than `dt` still fires the expected number of ticks before expiring (previously fired zero).
- Initial `turnOrder` in `buildBattleState` / test fixtures is now sorted through `sortedTurnOrder` so `pickReady` respects the speed and `insertionIndex` tiebreakers from turn zero.

### Documentation

- [BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): new "Engine defaults (P2 CombatEngine)" section captures the prototype placeholder magnitudes, CT cap, D20 severity curve, and synthetic basic attack — each flagged as a P6 tuning candidate.

## [0.3.0] — 2026-04-21

### Changed — Documentation

- [INTEGRATION_REPORT.md §4](documentation/INTEGRATION_REPORT.md) rewritten to reflect the locked **client-authoritative combat with server-issued seeds** architecture (runtime topology, combat authority model, security & anti-cheat subsections). Supersedes the earlier hybrid client-prediction + per-action reconciliation model.
- Aligned edits in the same file: §2 bullet 2 reworded; §5 data model updated (`Run.state` removed, `PlayerAction` removed, `BattleState` moved to client-side P2 spec with a pointer note, `StageOutcome` added); §5 Firestore rules drop `runs/{runId}/actions/{actionId}` and add `runs/{runId}/checkpoints/{stageIndex}`; §6 Networking row; §9 P3 Cloud Function list (`processAction` → `submitStageOutcome` + `bankCheckpoint` + `rollAnomaly`) and P4 wiring; §10 P3 and P4 done-criteria; Appendix B elevator pitch.

### Notes

- No code changed. Any future P3 (Firebase backend) plan must cite the updated §5 schema, not the pre-0.3.0 shape.

## [0.2.0] — 2026-04-20

### Added — P1 content (vertical slice)

- Typed content schema under [src/content/types/](src/content/types/): `sentinel`, `ids`, `lineage`, `class`, `skill`, `gear`, `boss`, `enemy`, `anomaly`, `encounter`.
- `UNSPECIFIED` sentinel + `UnspecifiedOr<T>` helpers for tuning placeholders.
- [src/content/lineages.ts](src/content/lineages.ts): all 12 lineages encoded with adjacency graph; Drakehorn Forge has a full 10-rank upgrade table (magnitudes sentinel).
- [src/content/classes/drakehornForge.ts](src/content/classes/drakehornForge.ts): 5 Drakehorn classes (T1–T5) with full passives + cross-lineage evolution edges into Thorn Ledger and Tide Shell.
- [src/content/skills/drakehornForge.ts](src/content/skills/drakehornForge.ts): 25 Drakehorn skills.
- [src/content/classes/stubs.ts](src/content/classes/stubs.ts): 55 stub classes (11 lineages × 5 tiers) to resolve cross-lineage evolution edges.
- [src/content/gear.ts](src/content/gear.ts): Dragon T5 set (Worldbreaker Fang, Molten Sovereign Plate, Ashfire Sigil) + 60 T1–T4 procedural templates keyed by `{role, tier, slot}`.
- [src/content/enemies.ts](src/content/enemies.ts): 12 enemy archetypes with 4-tier scaling tables.
- [src/content/anomalies.ts](src/content/anomalies.ts): 4 anomaly categories (class_infusion, gear_mutation, lineage_shift, rule_break) with shared charge trigger.
- [src/content/bosses.ts](src/content/bosses.ts): 3 authored bosses (Pyre Warden mini, Vortex Colossus gate, Rimefang Hydra Drakehorn counter) + 24 boss stubs.
- [src/content/encounters.ts](src/content/encounters.ts): Run Director default weights + encounter registry.
- [src/content/__tests__/integrity.test.ts](src/content/__tests__/integrity.test.ts): cross-ref validator (id uniqueness, skill/class/lineage resolution, Drakehorn evolution chain walk, adjacency resolution, sentinel audit snapshot).
- [documentation/BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): P6 tuning work index keyed off the sentinel audit.

### Notes

- `ClassPassive.magnitudeUnit` widened to include `'max_hp_percent'` for the Lava Heart rank-10 passive.
- Adjacency graph warns (not asserts) on asymmetric edges so typos surface without blocking the vertical slice.

### Added — P0 scaffold

- React Native + TypeScript + Expo SDK 55 project shape with strict `tsconfig` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`) and `@/*` path alias.
- Firebase client wiring via `@react-native-firebase/*` (app, auth, firestore, functions, app-check). App Check: debug provider in `__DEV__`, Play Integrity in production Android; iOS deferred.
- `src/` skeleton: `components/`, `content/`, `domain/`, `features/`, `hooks/`, `navigation/`, `screens/`, `services/`, `stores/`.
- Navigation stub: [App.tsx](App.tsx) → [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx) → [src/screens/PlaceholderScreen.tsx](src/screens/PlaceholderScreen.tsx) (anon sign-in + `helloWorld` callable smoke test).
- Cloud Functions project at [firebase/functions/](firebase/functions/) with `helloWorld` HTTPS callable (v2).
- Firebase root config: [firebase.json](firebase.json), [.firebaserc](.firebaserc), minimal deny-all [firebase/firestore.rules](firebase/firestore.rules), empty [firebase/firestore.indexes.json](firebase/firestore.indexes.json).
- Tooling: Jest (`jest-expo` preset), ESLint 9 flat config via `eslint-config-universe/flat/*`, Prettier, Reanimated babel plugin, Metro config.
- `.env.example` with `EXPO_PUBLIC_FIREBASE_*` placeholders + emulator host override.
- Smoke test [src/__tests__/smoke.test.ts](src/__tests__/smoke.test.ts).
- Operations runbook [documentation/OPERATIONS.md](documentation/OPERATIONS.md).

### Changed — Documentation

- Renamed Dream Ocean archetype "Beast" → "Spirit" across [INTEGRATION_REPORT.md](documentation/INTEGRATION_REPORT.md), [ClassDesignDeepResearch.md](documentation/New/ClassDesignDeepResearch.md), [DeepResearch2.md](documentation/New/DeepResearch2.md), [DeepResearch3.md](documentation/New/DeepResearch3.md). In-world names (Beast Bite, Beast's Instinct, etc.) preserved.
- §3 lineage mapping locked: Tide Shell → Rift, Arrow Creed → Tempest, Dream Ocean → Spirit. G1 marked Resolved.
- Architecture revised to **client-authoritative combat with server-issued seeds**; Firebase stores outcomes only, no battle logs. Supersedes [INTEGRATION_REPORT.md §4](documentation/INTEGRATION_REPORT.md) (rewrite tracked as follow-up).

### Added — Content docs

- [documentation/New/EnemyDesign.md](documentation/New/EnemyDesign.md): 12 parameterized enemy archetypes (stat_wall, speed_pressure, sustain_denial, dps_race, ct_manipulator, summoner, nullshield, chaos_dps, oracle, engineer, harrier, resonator) with 4-tier scaling tables and TypeScript schema. Closes G2.

### Notes

- `App.js` removed; [App.tsx](App.tsx) is the sole root (resolved via [index.js](index.js)).
- ESLint bumped 8 → 9 to satisfy `eslint-config-universe@14` peer requirement.
- `ignoreDeprecations` removed from both tsconfigs — TS 5.9 rejects the value.
