# Integration Report — New Design → Implementation

**Status:** Draft. Requires developer sign-off on §3 (Lineage Mapping) and §8 (Unresolved Gaps) before coding begins.
**Scope:** Consolidates the target direction from `documentation/New/`, maps it against what is implemented today (documented in `documentation/Old/` and visible in `src/`), and defines the migration path.
**Authority:** `documentation/New/` governs. `documentation/Old/` is historical reference only. Where New docs conflict internally, this report states which wins.

---

## 1. Purpose & Authority

The project was lifted from an expense-splitting app (commit `5971a17 RPG lifted from expense`). The Old docs describe a Firebase-backed hybrid that tied RPG campaigns to expense settlements — settlements generated bosses, expense categories mapped to boss traits, group membership drove campaign parties. The New docs describe a **standalone CT-queue roguelite RPG**: 12 lineages × 5 tiers = 60 classes, tiered gear (T1–T5), Run Director, Boss Director, 10-stage checkpoint banking.

**Direction locked with developer:**

- The finance integration is **dropped entirely**. No expense→boss pipeline, no settlement triggers, no group-as-party linkage.
- `documentation/New/` is the sole design authority going forward.
- The Old docs remain as historical reference in `documentation/Old/` until quarantined (§7).

### Authority hierarchy among New docs

Several New docs overlap and at points conflict. For this report:

| Doc | Role | Precedence |
|-----|------|-----------|
| [Architecture.md](New/Architecture.md) | Overall layering (content/domain/features), CT system, banking | Baseline |
| [CombatEngine.md](New/CombatEngine.md) | Combat resolution pipeline, CT queue loop, D20 | Combat authority |
| [ClassDesign.md](New/ClassDesign.md) | 12 thematic lineage names, tier evolution rules | **Lineage naming authority** |
| [ClassDesignDeepResearch.md](New/ClassDesignDeepResearch.md) | Full 60-class detail (1417 lines) | **Class content authority** |
| [WeaponDesign.md](New/WeaponDesign.md) | Gear tiers, 12 zodiac T5 sets | Gear authority |
| [BossDesign.md](New/BossDesign.md) | Stage 5 / 10 / 30 boss pacing | Boss authority |
| [LineageSystem.md](New/LineageSystem.md) | Cross-lineage evolution graph | Evolution authority |
| [EnemyDesign.md](New/EnemyDesign.md) | — (empty) | Gap, see §8 |
| [DeepResearch.md](New/DeepResearch.md) | Generic Node+PostgreSQL stack | **Superseded** (see below) |
| [DeepResearch2.md](New/DeepResearch2.md) | Firebase Rev 2 architecture | Reference only |
| [DeepResearch3.md](New/DeepResearch3.md) | Firebase Rev 3 architecture, TypeScript interfaces | **Architecture authority** |

DeepResearch.md's Node+PostgreSQL+WebSocket stack is superseded by the developer's decision to stay on Firebase. DeepResearch3.md supersedes DeepResearch2.md as the latest revision and matches the chosen stack.

---

## 2. Locked Decisions

1. **Pure RPG pivot.** Expense→boss pipeline, campaign-to-group linkage, and settlement triggers are removed. `CampaignService.generateBossFromSettlement()` and the expense-trait mapping become dead code.
2. **Firebase, client-authoritative (with Cloud Functions for validation).** Stay on Expo + Firestore + Cloud Functions. No separate Node.js server. Client runs the full CombatEngine for prediction; Cloud Functions validate action intents and write authoritative state back to Firestore. This matches DeepResearch3.md.
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

Consolidated from DeepResearch3.md and Architecture.md.

### Runtime topology

```
Client (Expo/React Native, TypeScript)
├── CombatEngine.ts (shared, deterministic, seeded RNG)
├── Zustand stores (playerProfile, run, combat)
├── UI screens (BattleScreen, RunMapScreen, HubScreen, EquipmentScreen)
└── Firebase SDK (Firestore onSnapshot listeners, Auth, App Check)

Firebase
├── Firestore (persistent + real-time)
│   ├── players/{playerId}           (profile, unlocked lineages, meta resources)
│   ├── runs/{runId}                 (active run state)
│   │   ├── actions/{actionId}       (client-written action intents)
│   │   └── snapshots/{tick}         (optional rollback checkpoints)
│   ├── lineages/{lineageId}         (static, 12 docs)
│   ├── skills/{skillId}             (static, ~240 docs = 60 classes × ~4 skills)
│   ├── gearItems/{gearId}           (static, unified item table)
│   ├── players/{playerId}/gear/{instanceId} (owned instances)
│   ├── encounters/{encId}           (stage encounter templates)
│   ├── bosses/{bossId}              (mini / standard / counter)
│   ├── anomalies/{anomId}           (Run Director event cards)
│   └── telemetry/{eventId}          (analytics, balance tuning)
│
├── Cloud Functions (TypeScript, authoritative logic)
│   ├── processAction (Firestore trigger on runs/{runId}/actions)
│   ├── startRun      (HTTP; seeds run, creates initial BattleState)
│   ├── endRun        (HTTP; finalizes rewards, updates meta progression)
│   └── selectEncounter (HTTP; Run Director picks next stage)
│
└── Firebase App Check (blocks non-app clients)
```

### Core rules

- **Client is never trusted for state.** Security rules deny all client writes to `runs/{runId}.state`, `players/{playerId}.credits`, and any derived-reward fields. Clients can only create `runs/{runId}/actions/{actionId}` docs; Cloud Functions validate and commit state.
- **Deterministic RNG.** A seeded PRNG (e.g., Mulberry32 or seeded Mersenne Twister) is stored in `runs/{runId}.seed`. Client uses it for prediction; Cloud Function uses the same seed + tick number for authoritative resolution. This allows rollback without desync.
- **Client prediction → server reconcile.** Client applies actions immediately via local CombatEngine for zero-latency UX. Cloud Function resolves the same action authoritatively. When the authoritative state arrives via `onSnapshot`, client soft-corrects (smooth interpolation), not a hard reset.
- **Tick rate.** 20–30 ticks/sec simulated; Firestore updates are per-action, not per-tick, to stay within quota. Each tick writes a delta (changed fields only) rather than the full BattleState.
- **Snapshot budget.** BattleState <50KB; delta <5KB per tick. Firestore doc limit is 1MB — well within range for 2–5 player raids.

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

// Run — active session
interface Run {
  playerId: string;
  seed: number;
  stage: number;                                     // 1..30
  turn: number;
  activeClassId: string;
  state: BattleState;
  bankedRewards: RewardBundle;                       // baseline, always granted
  vaultedRewards: RewardBundle;                      // at-risk, banked only on return-home
  result?: "ongoing" | "won" | "lost";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// PlayerAction — client-written intent
interface PlayerAction {
  playerId: string;
  unitId: string;
  skillId: string;
  targets: string[];
  clientTick: number;
  timestamp: Timestamp;
}

// BattleState — current combat state
interface BattleState {
  tick: number;
  units: { [unitId: string]: { hp: number; ct: number; buffs: Buff[]; cooldowns: { [skillId: string]: number } } };
  pendingActions: PlayerAction[];
  tickDelta: number;                                 // CT drain per tick
  rngCursor: number;                                 // seeded PRNG offset
}

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
  match /actions/{actionId} {
    allow create: if request.auth.uid == request.resource.data.playerId;
    allow read: if true;
    allow update, delete: if false;
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
| **Lineages** | 12 lineages with adjacency graph, hub ranks, cross-evolution | No lineage concept in code; `src/content/lineages.ts` and `src/domain/lineageSystem.ts` are stubs | Entire layer missing | Build `src/content/lineages.ts` data + `src/domain/progression/lineages.ts` logic |
| **Classes** | 60 classes, 5 tiers × 12 lineages, fresh design | 12 implemented classes (Vanguard/…/Harbinger) with rank 1–10 skill trees. Different shape entirely. | 60 - 0 = 60 new classes; 12 existing are archived | Quarantine `CampaignDefinitions.ts`; build new `src/content/classes.ts` from ClassDesignDeepResearch.md |
| **Skills** | ~240+ skill defs with CT_cost, cooldown, resource, target, tags, effects | Skills are inline on each class definition; taxonomy is different (no `tags`, different resource model) | Full rewrite | Build `src/content/skills.ts` with flat catalog |
| **Gear** | Unified `gearItems` table, T1–T4 generic + 12 lineage-locked T5 sets, 10% CT-reduction cap | `GearDefinitions.ts` exists with stat bonuses + abilities, but tiers and lineage sets don't align | Re-model | Quarantine current; build per WeaponDesign.md |
| **Combat engine** | Deterministic, seeded RNG, CT queue tick loop, D20 hit/crit, stat pipeline (base → flat → mult → tradeoff → passive → buff) | `CombatEngine.ts` (~1200 LOC) has CT queue, 4-tier D20 (fail/normal/strong/crit), defense ratio, status effects, auto-battle AI — **substantial and mostly salvageable in shape**, but not structured to run identically on client + Cloud Function | Core behaviors map; determinism + shared-code packaging is the gap | Either (a) refactor current engine into a pure, deterministic module shared between client and Cloud Functions, or (b) rewrite fresh per CombatEngine.md. See §9 P2. |
| **Run structure** | Roguelite "run" entity; 30-stage progression; mini-boss @5, gate boss @10, counter boss @30; checkpoint banking every 10 stages | Campaign entity tied to groups and settlements; no stage progression, no checkpoint banking | Replace campaign with run | Build `src/domain/run/` engines; write new `runs/*` Firestore schema |
| **Run Director** | Weighted encounter selection, anomaly injection, pressure scaling | `src/domain/runDirector.ts` exists but is minimal | Flesh out or rewrite | New Cloud Function `selectEncounter` + local preview |
| **Boss Director / AI** | Adaptive boss AI inside combat tick (CT lock, burst shield, etc.) | Auto-battle AI exists on player side; no adaptive boss AI | Build | `src/domain/combat/BossAI.ts` per BossDesign.md + CombatEngine.md |
| **Progression** | Class unlock on first obtain, same-lineage default evolution, cross-lineage adjacency-based, tier-down on lineage swap, lineage ranks at hub, 1/2/3 class slots | Account XP + campaign XP + class-rank XP exist but serve a different progression model | Quarantine current; build progression per ClassDesign.md | New `src/domain/progression/` |
| **Hub / meta-progression** | Hub upgrades (class rank, lineage rank, gear level, class slot, hybrid unlock) fueled by banked resources | Town-building exists but is a gold sink, not tied to class/lineage ranks | Legacy; build new hub | §7 quarantines Town; new HubScreen wires to meta resources |
| **Networking** | Firestore listeners + Cloud Functions; seeded RNG; soft rollback | Firestore listeners in place (`onSnapshot`); no Cloud Functions; no rollback; combat is client-only | Biggest architectural delta | Provision `firebase/functions/`; move validation to Cloud Functions |
| **Persistence** | Schema per §5 (`players/*`, `runs/*`, static content cols) | Schema is `campaigns/*`, `userGameProfiles/*` + RPG subcollections under `campaigns/{id}/*` | Schema rewrite | Draft new rules in `firebase/firestore.rules.v2.txt`; do not delete current until migration verified |
| **Security** | App Check on; strict rules denying direct state writes | App Check presence unknown; current rules allow authenticated writes to campaign subdocs | Tighten | Add App Check init; rewrite rules per §5 |
| **Enemies (non-boss)** | Archetypes for stages 1–4, 6–9, 11–29 | Not implemented (no enemy concept beyond bosses) | `EnemyDesign.md` is empty — see §8 | Flag to developer; define archetypes before P1 |
| **Telemetry** | Event log (RunStart/SkillUsed/BossPhaseChange/Death/…) | Event bus (`appEvents`) exists but no persistent telemetry log | Add | Cloud Function `logTelemetry` + `telemetry/*` collection |

---

## 7. Legacy Quarantine Plan

Move — **do not delete** — the following to a root-level `redundant/` folder, preserving relative paths so they can be referenced later. Deletion is a separate decision after migration is proven.

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

## 8. Unresolved New-Doc Gaps

These are issues within `documentation/New/` itself. Each should be resolved before the phase in which it bites.

| # | Gap | Blocks phase | Proposed resolution | Needs developer decision? |
|---|---|---|---|---|
| G1 | ~~Lineage mapping table ambiguity~~ **Resolved.** All 12 rows locked: Tide Shell → Rift, Arrow Creed → Tempest, Dream Ocean → Spirit (archetype renamed from "Beast"). See §3. | P1 | Locked | Done |
| G2 | `EnemyDesign.md` is empty. No generic enemy archetypes exist for stages 1–4, 6–9, 11–29. | P1 | Define 8–12 generic archetypes per BossDesign.md's template (stat-wall, speed-pressure, sustain-denial, DPS-race, CT-manipulator, summoner, nullshield, frenzy, oracle, engineer — the stage-5 mini-boss pool is a reusable blueprint). | **Yes** |
| G3 | Cross-lineage evolution schema inconsistency. `ClassDesignDeepResearch.md` uses `evolutionTo` (single target) but lists up to two options in prose. `LineageSystem.md` describes a richer graph with tier-down mandatory. `ClassDesign.md` allows same-tier cross-evolution if affinity ≥70. | P1 | Adopt `evolutionTargetClassIds: string[]` (see §5). Lock the tier-down rule: **always drops 1 tier on cross-lineage transition**, per LineageSystem.md. Affinity ≥70 is the *filter* for which cross-lineage targets appear, not a tier-preservation override. | **Yes** |
| G4 | Checkpoint reward split between baseline and bonus vault is not quantified. | P2 | Propose 65% baseline / 35% vault by default; tune via Monte Carlo. | Recommendation only |
| G5 | D20 hit/crit formula is undefined in New docs. | P2 | Adopt the Old combat engine's 4-tier system as baseline: fail (1–9) / normal (10–17) / strong (18–19) / critical (20) with d12 severity multiplier. Keep defense ratio `100/(100+2·DEF)` as mitigation. | **Yes** (explicit carry-over) |
| G6 | Tier 5 "rule-breaker" gear sets have narrative identities but no numerics (e.g., "steals CT" — how much?). | P2 | Leave `unspecified` sentinel in gear data; fill during balance tuning (P6). | Tracked, no block |
| G7 | Lineage rank thresholds (Rank 1–10 bonuses) are described only for a few lineages in ClassDesign.md. | P1 | Require one `upgradeBonuses[]` row per rank per lineage. Placeholder entries with `TODO` until tuning. | No immediate decision needed |
| G8 | Hybrid unlock progression (`hybridUnlockLevel: none/partial/full`) has no defined milestones. | P5 | Defer — this is a post-launch progression feature, not a P1–P5 blocker. | No |
| G9 | Anomaly frequency / Run Director "pressure" formula is narrative only. | P2 | Start with anomaly every 5 stages; pressure = `(avgSkillsPerTurn × avgDamagePerTurn × (1 + gearTierBonus))`, tune in P6. | Recommendation only |

---

## 9. Phased Implementation Order

High-level sequencing. Each phase is a separate planning task with its own todo breakdown.

- **P0 — Doc finalization** (no code): resolve §8 gaps requiring developer decisions (G1, G2, G3, G5). Confirm lineage mapping in §3.
- **P1 — Content data** (TypeScript only, no network): write `src/content/{lineages,classes,skills,gear,bosses,encounters,anomalies}.ts` as typed data modules. Every class/skill/gear item from ClassDesignDeepResearch.md / WeaponDesign.md / BossDesign.md is represented.
- **P2 — Domain engines** (TypeScript, pure functions): deterministic CombatEngine (seeded PRNG, CT queue, skill resolution pipeline, stat pipeline, status effects), Run Director, Boss AI Director, progression engine (class unlock, evolution, lineage rank).
- **P3 — Firebase backend**: new Firestore schema, security rules, indexes, and Cloud Functions (`processAction`, `startRun`, `endRun`, `selectEncounter`, `logTelemetry`). Provision `firebase/functions/` directory and wire to emulator.
- **P4 — Client state wiring**: Zustand stores (`playerStore`, `runStore`, `combatStore`), FirebaseService wrappers, prediction + reconciliation logic.
- **P5 — UI screens**: BattleScreen, RunMapScreen, HubScreen, EquipmentScreen, ClassSelectScreen, RewardResolutionScreen. New tab navigator replacing `CompanionTabNavigator`.
- **P6 — Telemetry + balance harness**: event logging, Monte Carlo simulation harness (headless Node), tuning pass on skill numbers, gear numerics, reward splits, anomaly frequency.

---

## 10. Verification Checklist

For each phase, "done" means:

- **P0 done:** §3 table has no "or" rows. §8 rows G1, G2, G3, G5 show locked resolutions. `EnemyDesign.md` has populated archetype list.
- **P1 done:** TypeScript strict compile passes on `src/content/*.ts`. Every `lineageId`/`classId`/`skillId`/`gearId`/`bossId`/`encounterId` is reachable via a typed discriminated union. Cross-refs resolve (every `evolutionTargetClassIds` entry exists; every `skillId` on a class exists in `skills.ts`).
- **P2 done:** Unit tests (Jest) cover: CT queue ordering, damage pipeline (base→flat→mult→tradeoff→passive→buff), D20 tier resolution, CT-reduction 10% cap, status effect tick, cross-lineage evolution graph traversal. Same seed + same inputs → same outputs (determinism test).
- **P3 done:** Firestore emulator accepts an authenticated client write to `runs/{id}/actions/{aid}` and rejects a direct write to `runs/{id}.state`. `processAction` Cloud Function triggers, validates, writes new state. End-to-end emulator test passes.
- **P4 done:** Client predicts a skill use within one animation frame; Firestore-driven reconciliation updates UI within 200ms of server commit; desync injection test produces a smooth correction (not a snap).
- **P5 done:** Playthrough of stage 1 → 5 (mini-boss) → 10 (gate boss) → 30 (counter boss) is complete on device. Checkpoint banking visibly awards baseline rewards and vaults bonus rewards. Return-home action banks the vault.
- **P6 done:** 10k-run Monte Carlo simulation shows no single lineage >60% run-completion rate, no gear set >55% pick rate, counter boss win rate per-counter 40–60%.

---

## Appendix A — File inventory cross-reference

Every file in `documentation/New/` is accounted for:

| File | Role in this report |
|---|---|
| Architecture.md | §1 (hierarchy), §4 (baseline) |
| BossDesign.md | §6 (Bosses row), §8 (G2 template), §9 (P1/P2) |
| ClassDesign.md | §1 (hierarchy), §2 (decision 3), §3 (thematic names), §8 (G3) |
| ClassDesignDeepResearch.md | §1 (hierarchy), §2 (decision 4), §5 (schema), §9 (P1) |
| CombatEngine.md | §1 (hierarchy), §4 (core rules), §8 (G5), §9 (P2) |
| DeepResearch.md | §1 (marked superseded) |
| DeepResearch2.md | §1 (reference) |
| DeepResearch3.md | §1 (architecture authority), §4, §5 |
| EnemyDesign.md | §8 (G2) |
| LineageSystem.md | §1 (hierarchy), §3 (adjacency graph), §8 (G3) |
| WeaponDesign.md | §1 (hierarchy), §3 (zodiac names), §5 (GearItem), §6 (Gear row), §8 (G6) |

## Appendix B — Summary for a new reader

> We are building a CT-queue roguelite RPG on Expo + Firebase. Twelve lineages (thematic names), sixty classes (five tiers each), cross-lineage evolution that drops one tier. Runs are 30 stages with mini-boss at 5, gate boss at 10, counter boss at 30. Checkpoints bank partial rewards at each 10-stage mark. Combat is a deterministic tick loop with seeded RNG, run identically on client (for prediction) and in Cloud Functions (for authority). The product was originally lifted from an expense-splitting app; every trace of that finance layer is being removed, and the retention systems from the old app (Companion, Town, Expedition, Gamification) are quarantined to `redundant/` for possible future reuse but are not part of the new design.
