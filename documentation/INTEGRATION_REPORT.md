# Integration Report — New Design → Implementation

**Status:** Reconciliation baseline. Coding is already in progress; this report governs major documentation conflict resolution.
**Scope:** Consolidates the target direction from `documentation/New/`, maps it against what is implemented today (documented in `documentation/Old/` and visible in `src/`), and defines the migration path.
**Authority:** **This report is the primary authority.** `documentation/New/` and `documentation/Old/` are source inputs and reference context. Where any docs conflict, this report's decisions win unless the developer explicitly overrides them.

---

## 1. Purpose & Authority

The project was lifted from an expense-splitting app (commit `5971a17 RPG lifted from expense`). The Old docs describe a Firebase-backed hybrid that tied RPG campaigns to expense settlements — settlements generated bosses, expense categories mapped to boss traits, group membership drove campaign parties. The New docs describe a **standalone CT-queue roguelite RPG**: 12 lineages × 5 tiers = 60 classes, tiered gear (T1–T5), Run Director, Boss Director, 10-stage checkpoint banking.

**Direction locked with developer:**

- The finance integration is **dropped entirely**. No expense→boss pipeline, no settlement triggers, no group-as-party linkage.
- `documentation/INTEGRATION_REPORT.md` is the canonical reconciliation source of truth going forward.
- The Old docs remain as historical reference in `documentation/Old/` until quarantined (§7).

### Authority hierarchy among supporting docs

Several supporting docs overlap and at points conflict. Their role is advisory unless this report explicitly delegates authority for a subsection.

| Doc | Role | Precedence |
|-----|------|-----------|
| [Architecture.md](New/Architecture.md) | Overall layering direction and module intent | Reference (must conform to this report) |
| [CombatEngine.md](New/CombatEngine.md) | Combat loop mechanics and terminology | Reference (must conform to §4) |
| [ClassDesign.md](New/ClassDesign.md) | Thematic lineage framing and progression concepts | Reference (must conform to §§2–3, §8) |
| [ClassDesignDeepResearch.md](New/ClassDesignDeepResearch.md) | Full 60-class detail (1417 lines) | **Class content authority** |
| [WeaponDesign.md](New/WeaponDesign.md) | Gear tiers and T5 set themes | Gear reference |
| [BossDesign.md](New/BossDesign.md) | Stage 5 / 10 / 30 pacing and boss role design | Boss reference |
| [LineageSystem.md](New/LineageSystem.md) | Cross-lineage graph candidates and evolution notes | Evolution reference |
| [EnemyDesign.md](New/EnemyDesign.md) | Non-boss enemy archetypes and scaling | Enemy reference |
| [DeepResearch.md](New/DeepResearch.md) | Generic Node+PostgreSQL stack | **Superseded** (see below) |
| [DeepResearch2.md](New/DeepResearch2.md) | Firebase Rev 2 architecture | Reference only |
| [DeepResearch3.md](New/DeepResearch3.md) | Firebase Rev 3 architecture and interface ideas | Reference only (must conform to §4) |

DeepResearch.md's Node+PostgreSQL+WebSocket stack is superseded by the developer's decision to stay on Firebase. DeepResearch3.md remains useful as a reference for Firebase interface ideas, but where it conflicts with this report's outcome-only model, this report wins.

### Major conflict confirmation workflow

For every **major** doc conflict (architecture, persistence, progression graph, canonical IDs, pacing spine, or module boundaries):

1. Default to this report's decision.
2. Ask the developer for explicit confirmation before treating any override as locked.
3. In that question, label whether the proposed choice is:
  - **In line with this report**, or
  - **A deviation from this report**.
4. Always state consequences on schema, runtime topology, balance surface area, and migration cost.

---

## 2. Locked Decisions

1. **Pure RPG pivot.** Expense→boss pipeline, campaign-to-group linkage, and settlement triggers are removed. `CampaignService.generateBossFromSettlement()` and the expense-trait mapping become dead code.
2. **Client-authoritative combat with server-issued seeds; Firebase stores outcomes only, no battle logs.** Stay on Expo + Firestore + Cloud Functions. Server issues a per-run seed and the encounter sequence; client runs the full deterministic CombatEngine locally with no round-trips during combat; outcomes are submitted at stage boundaries where Cloud Functions validate plausibility and commit meta-progression. Supersedes the earlier hybrid prediction + per-action reconciliation model. Matches [CHANGELOG.md](../CHANGELOG.md) 0.1.0 and DeepResearch3.md §4.2.
3. **Thematic lineage names are canonical** — Drakehorn Forge, Bull Cathedral, Twin Mirror, Tide Shell, Sunfang Court, Thorn Ledger, Balance Reins, Black Nest, Arrow Creed, Iron Covenant, Star Circuit, Dream Ocean. ClassDesignDeepResearch.md's 60 class definitions are re-homed under these thematic lineages via the mapping table in §3. (Decision flagged for re-confirmation once the mapping is visible — see §8.)
4. **Fresh 60-class design** per ClassDesignDeepResearch.md. Existing 12 classes (Vanguard, Arcanist, Ranger, Cleric, Rogue, Warden, Tactician, Alchemist, Duelist, Enchanter, Sentinel, Harbinger) are archived.
5. **Legacy retention systems move to `redundant/`.** Companion, Town Building, Expedition, and Gamification (XP/streaks/achievements/daily quests) are *moved, not deleted* — see §7.

---

## 3. Canonical Lineage Mapping

Three naming schemes appear in New docs and must be reconciled to one canonical set. The proposal below maps each thematic lineage (canonical) to its archetype counterpart (used by ClassDesignDeepResearch.md) and its zodiac totem (used by WeaponDesign.md).

Matching criterion: **mechanical identity** (role, CT profile, resource economy, signature mechanic).

| # | Thematic (canonical) | Archetype | Zodiac | Signature mechanic |
|---|---|---|---|---|
| 1 | **Drakehorn Forge** | Ignis | Dragon | Burst DPS, fire, damage ramp |
| 2 | **Bull Cathedral** | Aegis | Ox | Defense, sanctuary, retaliation |
| 3 | **Twin Mirror** | Arcana | Monkey | Duplication, misdirection, adaptive spells |
| 4 | **Tide Shell** | Rift | Rabbit | Evasion, phase drift, CT-skipping |
| 5 | **Sunfang Court** | Solaris | Rooster | Radiance, royal burst, precision crit |
| 6 | **Thorn Ledger** | Nox | Snake | Precision, DoT, venom stacking |
| 7 | **Balance Reins** | Seraph | Goat | Control via symmetry, equalization, team support |
| 8 | **Black Nest** | Umbra | Rat | Stealth, death, CT theft |
| 9 | **Arrow Creed** | Tempest | Horse | Discipline, long-range, momentum |
| 10 | **Iron Covenant** | Terra | Pig | Oath, heavy power, endurance |
| 11 | **Star Circuit** | Chrono | Tiger | CT manipulation, resource cycling |
| 12 | **Dream Ocean** | Spirit | Dog | Moon, illusion, healing, spirit-summon, reactive |

**Notes (mapping is locked):**

- All 12 rows are locked. Previously ambiguous rows resolved: Tide Shell → **Rift** (phase drift / CT-skip better fit "moonlit evasion" than Tempest); Arrow Creed → **Tempest** (discipline / momentum / long-range; frees Spirit for Dream Ocean); Dream Ocean → **Spirit** (archetype renamed from "Beast" — rationale below).
- **Archetype rename: "Beast" → "Spirit".** The former "Beast" archetype in ClassDesignDeepResearch.md is renamed to **Spirit** across the design corpus. Dream Ocean's identity ("moon + illusion + healing + spirit-summon + reactive") reads more naturally as a Spirit lineage that can summon spirit-beasts, rather than a Beast lineage that happens to heal. The rename also disambiguates from Arrow Creed's animal-companion flavor.
- WeaponDesign.md assigned Tier 5 gear set identities to zodiac totems (e.g., Rat = "Temporal Hijacker" = CT theft). Under this mapping, that gear set is the **Black Nest** T5 set. Gear set identities already match the lineage mechanical identity under the locked mapping.
- ClassDesignDeepResearch.md's adjacency graph is expressed in archetype names: `Solaris ⇄ Seraph ⇄ Arcana ⇄ Chrono ⇄ Rift ⇄ Ignis ⇄ Nox ⇄ Spirit ⇄ Terra ⇄ Aegis ⇄ Tempest ⇄ Solaris`, with Umbra branching from Arcana. Under the mapping: `Sunfang Court ⇄ Balance Reins ⇄ Twin Mirror ⇄ Star Circuit ⇄ Tide Shell ⇄ Drakehorn Forge ⇄ Thorn Ledger ⇄ Dream Ocean ⇄ Iron Covenant ⇄ Bull Cathedral ⇄ Arrow Creed ⇄ Sunfang Court`, with Black Nest branching from Twin Mirror.

---

## 4. Target Architecture (Firebase)

Consolidated from DeepResearch3.md §4.2 and Architecture.md, with the locked [CHANGELOG.md](../CHANGELOG.md) 0.1.0 revision: **client-authoritative combat with server-issued seeds; Firebase stores outcomes only, no battle logs.**

> **Authority hierarchy footnote.** CHANGELOG entries marked "supersedes" are canonical. Any edit to this section that contradicts a live CHANGELOG supersedes-note is a bug. Where [Architecture.md](New/Architecture.md) or [CombatEngine.md](New/CombatEngine.md) use looser "server-authoritative" phrasing, this section is stricter: the server is authoritative over **outcomes**, not over the tick loop.

### Runtime topology

```
Client (Expo/React Native, TypeScript)
├── CombatEngine.ts (pure, deterministic, seeded RNG — authoritative for in-combat state)
├── Zustand stores (playerProfile, run, combat — hold local BattleState)
├── UI screens (BattleScreen, RunMapScreen, HubScreen, EquipmentScreen)
└── Firebase SDK (Firestore onSnapshot on static + run metadata, Auth, App Check)

Firebase
├── Firestore (persistent only — never battle state)
│   ├── players/{playerId}                      (profile, unlocked lineages, meta resources)
│   ├── runs/{runId}                            (seed, stage, activeClassId, banked/vaulted rewards, result)
│   │   └── checkpoints/{stageIndex}            (server-committed StageOutcome, immutable after write)
│   ├── lineages/{lineageId}                    (static, 12 docs)
│   ├── skills/{skillId}                        (static, ~240 docs = 60 classes × ~4 skills)
│   ├── gearItems/{gearId}                      (static, unified item table)
│   ├── players/{playerId}/gear/{instanceId}    (owned instances)
│   ├── encounters/{encId}                      (stage encounter templates)
│   ├── bosses/{bossId}                         (mini / standard / counter)
│   ├── anomalies/{anomId}                      (Run Director event cards)
│   └── telemetry/{eventId}                     (aggregate events only, not a replay log)
│
├── Cloud Functions (TypeScript, authoritative over outcomes + meta-progression)
│   ├── startRun             (HTTP; issues seed, writes initial run doc)
│   ├── selectEncounter      (HTTP; Run Director picks next stage)
│   ├── rollAnomaly          (HTTP; issues anomaly events during a run)
│   ├── submitStageOutcome   (HTTP; validates stage result, writes checkpoints/{stageIndex})
│   ├── bankCheckpoint       (HTTP; banks/vaults rewards at 10-stage marks)
│   ├── endRun               (HTTP; finalizes rewards, updates meta progression)
│   └── logTelemetry         (HTTP; writes aggregate event to telemetry/*)
│
└── Firebase App Check (blocks non-app clients)
```

### Combat authority model

- **Server issues a seed per run.** `startRun` writes `runs/{runId}.seed` once at run start. The seed, combined with the player's authored build and the server-selected encounter sequence, determines every PRNG roll in the run.
- **Client runs the full CombatEngine locally.** CombatEngine is a pure, deterministic module; same seed + same inputs → same outputs. Battle state lives in Zustand + device memory. No round-trips during combat. No per-tick Firestore writes. No action-intent subcollection.
- **Server issues encounter selection and anomaly events.** `selectEncounter` and `rollAnomaly` gate what fight the player enters next — the seed alone does not determine what the player faces. This keeps the Run Director server-side and prevents seed-shop scumming.
- **Client writes outcomes at stage boundaries.** On stage / mini-boss / gate / counter-boss completion, checkpoint banking, or run end, the client calls `submitStageOutcome` / `bankCheckpoint` / `endRun` with an outcome payload (see §5 `StageOutcome`). Server validates plausibility (bounds checks, content-table lookup, seed + encounter consistency) and commits meta-progression writes.
- **Firestore stores outcomes, not logs.** `runs/{runId}` holds run-level fields only; `checkpoints/{stageIndex}` holds server-committed stage outcomes. Firestore never sees `BattleState`, per-tick snapshots, or per-action intents. `telemetry/*` captures aggregate signals (stage completion time, skill-use counts) for balance, not a replayable log.
- **Seed determinism is the audit hook, not the hot path.** Because the engine is deterministic, a server-side headless replay can reproduce any claimed outcome from seed + encounter + build. Replay is optional (see below); the live path never requires it.

### Security & anti-cheat

Three-line defense-in-depth:

1. **Transport + identity.** App Check (Play Integrity in production Android, debug provider in `__DEV__`; iOS deferred) + Firebase Auth + Firestore rules deny direct client writes to every meta-progression doc (`players/{id}`, `runs/{id}`, `runs/{id}/checkpoints/*`). Cloud Functions are the only write path.
2. **Outcome plausibility bounds.** `submitStageOutcome` and `bankCheckpoint` validate the payload against the server-selected encounter and content tables: max rewards per stage, HP/resource sanity, elapsed time floor, drop-pool membership. Payloads outside bounds are rejected.
3. **Deterministic replay audit (optional, P6+).** A Cloud Function — invoked by `endRun` or a nightly Cloud Scheduler job — re-runs the same seed + encounter sequence + build through a headless CombatEngine and compares claimed outcomes. Because CombatEngine is pure and deterministic, divergence is a cheat signal. Not required on the hot path.

**Explicit trade-off (locked, not a TODO).** Cheating the *in-run experience* is possible: the client owns `BattleState` and can modify it locally. Cheating *rewards or meta-progression* is not: the server gates every write that persists. This is the deliberate asymmetry that buys zero-latency combat without exposing account-level progression to the client.

---

## 5. Target Data Model

Consolidated from DeepResearch3.md §2 and ClassDesignDeepResearch.md schema.

```ts
// Player — root collection, one per user
interface Player {
  username: string;
  email: string;
  createdAt: Timestamp;
  lineageRanks: { [lineageId: string]: number };     // hub upgrade ranks
  ownedClassIds: string[];                            // permanent unlocks
  equippedClassSlots: 1 | 2 | 3;
  meta: {
    ascensionCells: number;
    lineageSigils: { [lineageId: string]: number };
    classSeals: { [classId: string]: number };
  };
}

// Lineage — static, 12 docs
interface Lineage {
  id: string;                                        // "drakehorn_forge"
  name: string;                                      // "Drakehorn Forge"
  archetype: string;                                 // "ignis" (mapping label)
  zodiac: string;                                    // "dragon" (mapping label)
  themeTags: string[];
  adjacentLineageIds: string[];                      // cross-evolution targets
  upgradeBonuses: { rank: number; effect: string }[];
}

// Class — static, 60 docs (schema per ClassDesignDeepResearch.md)
interface ClassData {
  id: string;                                        // "drakehorn_forge_t5_ember_initiate"
  name: string;
  lineageId: string;
  tier: 1 | 2 | 3 | 4 | 5;
  role: "DPS" | "Tank" | "Support" | "Control" | "Hybrid";
  ctProfile: "Fast" | "Medium" | "Slow";
  primaryResource: "HP" | "MP" | "None";
  basicAttackSkillId: string;
  skillIds: string[];                                // 3–5 actives
  passives: { rank: number; effect: string }[];     // ranks 1–10
  evolutionTargetClassIds: string[];                 // can be same-lineage next tier OR cross-lineage adjacent (tier-1)
  description: string;
}

// Skill — static, ~240+ docs
interface Skill {
  id: string;
  name: string;
  description: string;
  ctCost: number;
  cooldown: number;
  resource: { type: "HP" | "MP" | "none"; cost: number };
  target: "self" | "single" | "area" | "global";
  effects: SkillEffect[];                            // damage/heal/buff/debuff/summon/ct_shift
  tags: string[];                                    // "burst" | "sustain" | "control" | "ct_manipulation" | "defense_break" | "summon" | "execute" | ...
}

// GearItem — static, unified table
interface GearItem {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "accessory";
  tier: 1 | 2 | 3 | 4 | 5;
  lineageId?: string;                                // T5 sets are lineage-locked; T1–T4 generic
  rarity: "common" | "rare" | "epic" | "legendary";
  baseStats: { [stat: string]: number };
  multStats: { [stat: string]: number };
  passives: { category: string; effect: string }[];
  triggers: { trigger: string; effect: string }[];
  tradeoffs: { [stat: string]: number };
  ctReductionPct?: number;                           // capped at 10% by engine
  upgradeLevels: { level: number; cost: number; addStats: any; addMults?: any }[];
}

// PlayerGear — owned instances, subcollection under player
interface PlayerGear {
  gearId: string;
  equippedSlot: "weapon" | "armor" | "accessory1" | "accessory2" | null;
  level: number;
}

// Run — active session (run-level metadata only; BattleState lives client-side)
interface Run {
  playerId: string;
  seed: number;                                      // server-issued at startRun; drives all PRNG rolls
  stage: number;                                     // 1..30
  turn: number;
  activeClassId: string;
  bankedRewards: RewardBundle;                       // baseline, always granted
  vaultedRewards: RewardBundle;                      // at-risk, banked only on return-home
  result?: "ongoing" | "won" | "lost";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// StageOutcome — client-submitted, server-committed outcome at each stage boundary
// Stored at runs/{runId}/checkpoints/{stageIndex} after server validation.
interface StageOutcome {
  playerId: string;
  runId: string;
  stageIndex: number;                                // 1..30
  result: "won" | "lost" | "fled";
  rewards: RewardBundle;                             // claimed drops; bounded-checked against encounter tables
  hpRemaining: number;
  elapsedSeconds: number;
  clientSubmittedAt: Timestamp;
  serverCommittedAt: Timestamp;
}

// Note: `BattleState` is a client-side type only — it lives in Zustand + device
// memory and is never written to Firestore. Its shape is specified in the P2
// CombatEngine module spec, not in the persistence schema.

// BossDef — static
interface BossDef {
  id: string;
  name: string;
  bossType: "mini" | "standard" | "counter";
  lineageCounter?: string;                           // for 1/12 counter roll at stage 10/30
  hp: number;
  phases: { hpThreshold: number; changes: any }[];
  mechanics: any;                                    // e.g. { ctLock: true, burstShield: true }
}

// Encounter — stage template
interface Encounter {
  id: string;
  name: string;
  stageMin: number;
  stageMax: number;
  enemies: { type: string; count: number; attributes?: any }[];
  drops: { gear?: [string, number][]; items?: [string, number][] };
}

// Anomaly — Run Director event card
interface Anomaly {
  id: string;
  name: string;
  description: string;
  effect: any;
  conditions?: any;
}
```

### Firestore security rules (target shape)

```
match /players/{playerId} {
  allow read: if request.auth.uid == playerId;
  allow write: if false;                             // Cloud Functions only
  match /gear/{instanceId} {
    allow read, write: if request.auth.uid == playerId;
  }
}

match /runs/{runId} {
  allow read: if resource.data.playerId == request.auth.uid;
  allow write: if false;                             // Cloud Functions only
  match /checkpoints/{stageIndex} {
    allow read: if get(/databases/$(database)/documents/runs/$(runId)).data.playerId == request.auth.uid;
    allow write: if false;                           // Cloud Functions only; immutable after commit
  }
}

match /{staticCol}/{id}
  where staticCol in ["lineages", "skills", "gearItems", "bosses", "encounters", "anomalies"] {
  allow read: if true;
  allow write: if false;
}

match /telemetry/{id} {
  allow create: if request.auth.uid != null;
  allow read, update, delete: if false;
}
```

---

## 6. Gap Analysis — New vs. Current Code

| System | New requirement | Current state | Delta | Action |
|---|---|---|---|---|
| **Lineages** | 12 lineages with adjacency graph, hub ranks, cross-evolution | `src/content/lineages.ts` exists with all 12 thematic lineage IDs and adjacency links; Drakehorn is authored while the other 11 of 12 lineages remain mostly seeded (`UNSPECIFIED` payloads). | Structural layer present; authoring depth and final graph alignment remain | Keep current module; finish authored non-Drakehorn lineage payloads and align to §3/§8 decisions. |
| **Classes** | 60 classes, 5 tiers × 12 lineages, fresh design | `src/content/classes.ts` + `src/content/classes/stubs.ts` provide a 60-class scaffold; Drakehorn is most-authored while the remaining lineage classes are mostly stubs. | Shape exists; content depth and naming/tier consistency work remain | Continue from current scaffold; do not restart from legacy campaign classes. |
| **Skills** | ~240+ skill defs with CT_cost, cooldown, resource, target, tags, effects | Flat skill catalog structure exists; authored depth is partial and skewed toward Drakehorn. | Structure is in place; breadth and tuning remain | Preserve schema; expand authored coverage lineage-by-lineage (skills can be renamed later without schema churn). |
| **Gear** | Unified `gearItems` table, T1–T4 generic + 12 lineage-locked T5 sets, 10% CT-reduction cap | `src/content/gear.ts` exists with Dragon set + template scaffolding; many values are intentionally sentinel/placeholder pending P6. | Data model exists; full set authoring and numeric tuning remain | Keep current model; expand sets and retain sentinel audit discipline. |
| **Combat engine** | Deterministic, seeded RNG, CT queue tick loop, D20 hit/crit, stat pipeline (base → flat → mult → tradeoff → passive → buff) | `src/domain/combat/` is already a decomposed deterministic module with tests (including determinism). | Core engine mostly complete for target architecture | Build surrounding run/progression/backend contracts around this engine; no fresh combat rewrite. |
| **Run structure** | Roguelite "run" entity; 30-stage progression; mini-boss @5, gate boss @10, counter boss @30; checkpoint banking every 10 stages | Campaign entity tied to groups and settlements; no stage progression, no checkpoint banking | Replace campaign with run | Build `src/domain/run/` engines; write new `runs/*` Firestore schema |
| **Run Director** | Weighted encounter selection, anomaly injection, pressure scaling | `src/domain/runDirector.ts` exists but is minimal | Flesh out or rewrite | New Cloud Function `selectEncounter` + local preview |
| **Boss Director / AI** | Adaptive boss AI inside combat tick (CT lock, burst shield, etc.) | Auto-battle AI exists on player side; no adaptive boss AI | Build | `src/domain/combat/BossAI.ts` per BossDesign.md + CombatEngine.md |
| **Progression** | Class unlock on first obtain, same-lineage default evolution, cross-lineage adjacency-based, tier-down on lineage swap, lineage ranks at hub, 1/2/3 class slots | Account XP + campaign XP + class-rank XP exist but serve a different progression model | Quarantine current; build progression per ClassDesign.md | New `src/domain/progression/` |
| **Hub / meta-progression** | Hub upgrades (class rank, lineage rank, gear level, class slot, hybrid unlock) fueled by banked resources | Town-building exists but is a gold sink, not tied to class/lineage ranks | Legacy; build new hub | §7 quarantines Town; new HubScreen wires to meta resources |
| **Networking** | Outcomes-only writes + seeded RNG; no per-tick state; Firestore listeners for static content + run metadata only | Firebase Functions scaffold exists, but production run-lifecycle endpoints are not fully implemented yet. | Backend contract layer is incomplete | Implement `startRun`, `selectEncounter`, `rollAnomaly`, `submitStageOutcome`, `bankCheckpoint`, `endRun`, `logTelemetry` with outcome-only validation. |
| **Persistence** | Schema per §5 (`players/*`, `runs/*`, static content cols) | Schema is `campaigns/*`, `userGameProfiles/*` + RPG subcollections under `campaigns/{id}/*` | Schema rewrite | Draft new rules in `firebase/firestore.rules.v2.txt`; do not delete current until migration verified |
| **Security** | App Check on; strict rules denying direct state writes | App Check presence unknown; current rules allow authenticated writes to campaign subdocs | Tighten | Add App Check init; rewrite rules per §5 |
| **Enemies (non-boss)** | Archetypes for stages 1–4, 6–9, 11–29 | `documentation/New/EnemyDesign.md` is populated and `src/content/enemies.ts` exists with archetype scaffolding. | Design and baseline content now exist; pacing alignment still needed | Align any stage-20 assumptions to the §4/§8 pacing spine, then continue tuning. |
| **Telemetry** | Event log (RunStart/SkillUsed/BossPhaseChange/Death/…) | Event bus (`appEvents`) exists but no persistent telemetry log | Add | Cloud Function `logTelemetry` + `telemetry/*` collection |

---

## 7. Legacy Quarantine Plan

Move — **do not delete** — the following to a root-level `redundant/` folder, preserving relative paths so they can be referenced later. Deletion is a separate   decision after migration is proven.

### Finance/expense legacy (entirely remove)
- `src/contexts/CampaignContext.tsx`
- `src/services/gamification/CampaignService.ts`
- `src/services/gamification/CampaignTypes.ts`
- `src/services/gamification/CampaignDefinitions.ts`
- `src/services/gamification/CampaignUnitBuilder.ts`
- `src/services/gamification/CombatEngine.ts` (reconsider — see §6 Combat row)
- `src/screens/campaign/*` (all 11 screens + components)
- `src/components/campaign/*`

### Retention systems (quarantine for possible future reuse)
- `src/services/gamification/ExpeditionService.ts`
- `src/services/gamification/ExpeditionTypes.ts`
- `src/services/gamification/TownService.ts`
- `src/services/gamification/GamificationService.ts`
- `src/services/gamification/GearDefinitions.ts`
- `src/services/gamification/GearAbilityDefinitions.ts`
- `src/services/gamification/GearMath.ts`
- `src/services/gamification/awardKeyHelpers.ts`
- `src/contexts/GamificationContext.tsx`
- `src/screens/companion/*` (CompanionScreen, ExpeditionScreen, AdventureMapScreen, TownScreen, ShopScreen)
- `src/screens/settings/CompanionSelectScreen.tsx`
- `src/components/companion/*`
- `src/components/town/*`

### Domain stubs (replace wholesale)
- `src/domain/combatEngine.ts`
- `src/domain/ctSystem.ts`
- `src/domain/lineageSystem.ts`
- `src/domain/runDirector.ts`
- `src/content/bosses.ts`
- `src/content/classes.ts`
- `src/content/gear.ts`
- `src/content/lineages.ts`
- `src/content/skills.ts`

### Navigation (rebuild)
- `src/navigation/CompanionTabNavigator.tsx`

### Firebase (rewrite against new schema)
- `firebase/firestore.rules.rpg.txt`
- `firebase/firestore.indexes.rpg.json`

### Documentation
- `documentation/Old/*` — move to `redundant/documentation/Old/`

**Note on scope:** moves happen in a separate task after this report is approved. This list is the shopping list for that task; no files are moved by producing this report.

---

## 8. Unresolved New-Doc Conflicts (Developer Confirmation Queue)

These are major conflicts across docs. Default resolution follows this report. If an option deviates from this report, developer confirmation is required before lock-in.

| # | Conflict | Default (this report) | In line with this report? | Developer confirmation needed? |
|---|---|---|---|---|
| C1 | Combat authority split: outcome-only local simulation vs server-authoritative tick processing. | Outcome-only local deterministic simulation + server outcome validation (§4). | Yes | **Confirmed in line with this report (2026-04-22).** |
| C2 | Persistence split: outcome-only run docs vs action-intent/sub-tick state persistence. | Outcome-only run metadata + checkpoints; no battle logs (§4–§5). | Yes | **Confirmed in line with this report (2026-04-22).** |
| C3 | Canonical lineage namespace and Beast→Spirit rename drift across docs. | Thematic lineage IDs are canonical; Beast is renamed Spirit (§3). | Yes | **Confirmed in line with this report (2026-04-22).** |
| C4 | Cross-lineage evolution rules differ (replacement vs hybrid stacking semantics). | Identity replacement on transition; no simultaneous dual-lineage identity in v1. | Yes | **Confirmed in line with this report (2026-04-22).** |
| C5 | Adjacency graph candidates differ (ring+branch vs denser alternatives). | Keep §3 mapped graph as current canonical baseline unless explicitly overridden. | Yes | **Confirmed in line with this report (2026-04-22).** |
| C6 | Boss pacing conflicts (5/10/30 vs 5/10/20/30). | 5/10/30 pacing spine from §4 and BossDesign references. | Yes | **Confirmed in line with this report (2026-04-22).** |
| C7 | Static-content source conflicts (TS-authored modules vs Firestore-first static docs). | TS-authored `src/content/*` is canonical authoring source; optional export/sync to Firestore is permitted. | Yes | **Confirmed in line with this report (2026-04-22).** |
| C8 | Module layout conflicts (aspirational folder map vs current implementation seams). | Current implementation seams are canonical for now; future refactors are explicit follow-up work. | Yes | **Confirmed in line with this report (2026-04-22).** |
| C9 | EnemyDesign status drift (previously marked empty, now populated). | Treat EnemyDesign as implemented baseline input, not a missing prerequisite. | Yes | Done; no further decision required. |

**Developer confirmation status:** C1–C8 confirmed in line with this report on 2026-04-22.

### C1–C8 Conflict-Resolution Impact Summary

| Conflict | Locked decision | Primary impacted docs | Current status | Migration debt marker |
|---|---|---|---|---|
| C1 Combat authority | Outcome-only local deterministic simulation; server validates outcomes only | New/CombatEngine.md, New/DeepResearch3.md, New/Architecture.md | Reconciled to reference-vs-canonical split | `src/domain/combat/*` is current; keep no per-tick server ownership assumptions |
| C2 Persistence model | Outcome-only run metadata + checkpoints; no action-intent subcollections; no per-tick state logs | New/DeepResearch3.md, §4/§5 of this report | Reconciled in docs; backend implementation pending | Implement Cloud Functions contract (`submitStageOutcome`, `bankCheckpoint`, `endRun`) |
| C3 Canonical lineage IDs + Beast→Spirit | Thematic IDs are canonical; archetype alias is Spirit | New/ClassDesign.md, New/ClassDesignDeepResearch.md, New/LineageSystem.md, New/Architecture.md | Reconciled headers/notes; deep catalog remains alias-heavy by design | Rename stale Beast-era code/content references in `src/content/classes/stubs.ts` |
| C4 Cross-lineage semantics | v1 uses identity replacement, not simultaneous dual-lineage hybrid stacking | New/ClassDesign.md, New/LineageSystem.md | Reconciled | Keep hybridization as explicit future expansion only |
| C5 Adjacency graph | Constrained three-neighbor directed adjacency baseline | New/LineageSystem.md, New/ClassDesign.md | Reconciled at rule level | Align `src/content/lineages.ts` graph representation if still using older assumption |
| C6 Boss pacing | Boss stages are 5/10/30 only; stage 20 is procedural (checkpoint, non-boss) | New/EnemyDesign.md, New/Architecture.md, New/BossDesign.md | Reconciled in Enemy/Architecture docs | Audit any remaining stage-20 boss assumptions in runtime selectors |
| C7 Content source | TS-authored `src/content/*` is canonical; Firestore export optional | New/Architecture.md, New/DeepResearch3.md | Reconciled | Preserve code-first authoring and avoid Firestore-first drift |
| C8 Module layout | Current implementation seams are canonical; nested reorg is aspirational | New/Architecture.md, §6 Gap Analysis in this report | Reconciled | Treat content-folder reorg as explicit future refactor task |

---

## 9. Phased Implementation Order

High-level sequencing. Each phase is a separate planning task with its own todo breakdown.

- **P0 — Doc finalization** (no code): walk the §8 conflict queue (C1–C8), confirm defaults or record approved overrides, then reconcile supporting docs to match this report.
- **P1 — Content data** (TypeScript only, no network): write `src/content/{lineages,classes,skills,gear,bosses,encounters,anomalies}.ts` as typed data modules. Every class/skill/gear item from ClassDesignDeepResearch.md / WeaponDesign.md / BossDesign.md is represented.
- **P2 — Domain engines** (TypeScript, pure functions): deterministic CombatEngine (seeded PRNG, CT queue, skill resolution pipeline, stat pipeline, status effects), Run Director, Boss AI Director, progression engine (class unlock, evolution, lineage rank).
- **P3 — Firebase backend**: new Firestore schema, security rules, indexes, and Cloud Functions (`startRun`, `selectEncounter`, `rollAnomaly`, `submitStageOutcome`, `bankCheckpoint`, `endRun`, `logTelemetry`). Provision `firebase/functions/` directory and wire to emulator. Rules deny direct client writes to `runs/{id}` and `runs/{id}/checkpoints/*` per §5.
- **P4 — Client state wiring**: Zustand stores (`playerStore`, `runStore`, `combatStore`) drive local `BattleState`; Firebase wrappers sync run metadata on stage boundaries only; no per-tick listeners on run docs during combat.
- **P5 — UI screens**: BattleScreen, RunMapScreen, HubScreen, EquipmentScreen, ClassSelectScreen, RewardResolutionScreen. New tab navigator replacing `CompanionTabNavigator`.
- **P6 — Telemetry + balance harness**: event logging, Monte Carlo simulation harness (headless Node), tuning pass on skill numbers, gear numerics, reward splits, anomaly frequency.

---

## 10. Verification Checklist

For each phase, "done" means:

- **P0 done:** §3 mapping is unchanged or explicitly overridden by developer note; §8 conflicts C1–C8 each show either "confirmed" or "overridden with rationale"; stale statements like "EnemyDesign is empty" are removed.
- **P1 done:** TypeScript strict compile passes on `src/content/*.ts`. Every `lineageId`/`classId`/`skillId`/`gearId`/`bossId`/`encounterId` is reachable via a typed discriminated union. Cross-refs resolve (every `evolutionTargetClassIds` entry exists; every `skillId` on a class exists in `skills.ts`).
- **P2 done:** Unit tests (Jest) cover: CT queue ordering, damage pipeline (base→flat→mult→tradeoff→passive→buff), D20 tier resolution, CT-reduction 10% cap, status effect tick, cross-lineage evolution graph traversal. Same seed + same inputs → same outputs (determinism test).
- **P3 done:** Firestore emulator accepts an authenticated `startRun` callable invocation (writes seed + initial run doc) and rejects direct client writes to `runs/{id}` and `runs/{id}/checkpoints/*`. `submitStageOutcome` validates an outcome payload against the server-selected encounter and commits a `checkpoints/{stageIndex}` doc. Deterministic replay audit (optional but recommended) passes on a golden-path playthrough.
- **P4 done:** Client starts a run, plays stage 1 → 5 in a single device session with no Firestore writes during combat, and commits one `checkpoints/{stageIndex}` doc on stage-5 completion. Network disconnect mid-combat does not corrupt run state (offline-safe).
- **P5 done:** Playthrough of stage 1 → 5 (mini-boss) → 10 (gate boss) → 30 (counter boss) is complete on device. Checkpoint banking visibly awards baseline rewards and vaults bonus rewards. Return-home action banks the vault.
- **P6 done:** 10k-run Monte Carlo simulation shows no single lineage >60% run-completion rate, no gear set >55% pick rate, counter boss win rate per-counter 40–60%.

---

## Appendix A — File inventory cross-reference

Every file in `documentation/New/` is accounted for:

| File | Role in this report |
|---|---|
| Architecture.md | §1 (hierarchy), §4 (baseline) |
| BossDesign.md | §6 (Bosses row), §8 (C6), §9 (P1/P2) |
| ClassDesign.md | §1 (hierarchy), §2 (decision 3), §3 (thematic names), §8 (C4) |
| ClassDesignDeepResearch.md | §1 (hierarchy), §2 (decision 4), §5 (schema), §9 (P1) |
| CombatEngine.md | §1 (hierarchy), §4 (core rules), §8 (C1), §9 (P2) |
| DeepResearch.md | §1 (marked superseded) |
| DeepResearch2.md | §1 (reference) |
| DeepResearch3.md | §1 (reference), §4, §5, §8 (C1/C2/C7) |
| EnemyDesign.md | §6 (Enemies row), §8 (C6/C9) |
| LineageSystem.md | §1 (hierarchy), §3 (adjacency graph), §8 (C4/C5) |
| WeaponDesign.md | §1 (hierarchy), §3 (zodiac names), §5 (GearItem), §6 (Gear row) |

## Appendix B — Summary for a new reader

> We are building a CT-queue roguelite RPG on Expo + Firebase. Twelve lineages (thematic names), sixty classes (five tiers each), cross-lineage evolution that drops one tier. Runs are 30 stages with mini-boss at 5, gate boss at 10, counter boss at 30. Checkpoints bank partial rewards at each 10-stage mark. Combat is a deterministic tick loop with seeded RNG, run locally on the client with a server-issued seed; outcomes are validated by Cloud Functions at stage boundaries (no per-tick round-trips, no battle logs in Firestore). The product was originally lifted from an expense-splitting app; every trace of that finance layer is being removed, and the retention systems from the old app (Companion, Town, Expedition, Gamification) are quarantined to `redundant/` for possible future reuse but are not part of the new design.
