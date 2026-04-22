# Class Design Document

> **⚠️ RECONCILIATION NOTE (2026-04-22):**
> This document is aligned to [INTEGRATION_REPORT.md](../INTEGRATION_REPORT.md) as primary authority.
> Locked constraints applied to this doc:
> - Tier direction is **T1 starter → T5 apex**.
> - Cross-lineage evolution in v1 is **identity replacement**, not simultaneous dual-lineage mixing.
> - Checkpoint pacing uses stage milestones **5, 10, 20, 30**; boss pacing remains **5/10/30**.
> - Thematic lineage IDs are canonical; Beast-era naming is superseded by **Spirit**.

## Mobile RPG Roguelite — 12 Lineages, 60 Classes, Tier Evolution, and Checkpoint Banking

This document defines the full class architecture for the game.

It covers:

* the 12 lineage system
* all 60 class forms across Tier 1 to Tier 5
* lineage upgrade bonuses
* tier evolution rules
* cross-lineage branching
* checkpoint banking
* run resources
* data architecture
* pseudocode for the core logic

The system is built around three rules:

1. **Tier 1 is the simplest; Tier 5 is the strongest and most advanced.**
2. **Classes are unique identities, not just rank labels.**
3. **Lineages are the long-term family structure that ties classes together.**

---

# 1) Design summary

The game is a **roguelite RPG** with permanent class unlocks, run-based evolution, and hub-based progression.

A player:

* starts a run with an equipped class setup,
* fights through stage nodes,
* may encounter class evolution events,
* reaches checkpoints at stages 5, 10, 20, and 30,
* chooses to continue or return home,
* banks run resources at checkpoints,
* upgrades classes and lineages at the hub.

The class system is designed so that the player can:

* collect all 60 classes,
* build around one lineage,
* branch into compatible lineages,
* and eventually unlock broader cross-lineage evolution options through prestige systems.

---

# 2) Data architecture

## 2.1 Core data types

```ts
type Tier = 1 | 2 | 3 | 4 | 5;

type LineageId =
  | 'drakehorn_forge'
  | 'bull_cathedral'
  | 'twin_mirror'
  | 'tide_shell'
  | 'sunfang_court'
  | 'thorn_ledger'
  | 'balance_reins'
  | 'black_nest'
  | 'arrow_creed'
  | 'iron_covenant'
  | 'star_circuit'
  | 'dream_ocean';

type UnlockType =
  | 'action'
  | 'item'
  | 'bossClear'
  | 'statThreshold'
  | 'challenge'
  | 'quest';

type ResourceType =
  | 'ascensionCells'
  | 'lineageSigils'
  | 'classSeals';

interface UnlockRequirement {
  type: UnlockType;
  value: string;
}

interface ClassDefinition {
  id: string;
  name: string;
  tier: Tier;
  lineageId: LineageId;
  themeTags: string[];
  roleTags: string[];
  unlockRequirement: UnlockRequirement;
  skillIds: string[];
  passiveIds: string[];
  ctProfile: {
    baseCtCostBias: number;
    ctRefundPotential: number;
    ctManipulationPotential: number;
  };
  evolutionTargets: string[];
}

interface LineageDefinition {
  id: LineageId;
  name: string;
  themeTags: string[];
  rank: number;
  upgradeBonuses: string[];
  branchAffinities: LineageId[];
  classIds: string[];
}

interface PlayerMetaProgression {
  ownedClassIds: string[];
  equippedClassSlots: number; // 1 / 2 / 3
  classRanks: Record<string, number>;
  lineageRanks: Record<LineageId, number>;
  unlockedGearIds: string[];
  unlockedWeapons: string[];
  // Controls breadth of allowed cross-lineage transitions in v1/v2 rulesets.
  hybridUnlockLevel: 'none' | 'partial' | 'full';
}

interface RunState {
  runId: string;
  stageIndex: number;
  checkpointIndex: number;
  activeClassId: string;
  equippedClassIds: string[];
  carriedResources: {
    ascensionCells: number;
    bonusVault: number;
  };
  currentLineageIds: LineageId[];
}
```

---

## 2.2 Why this architecture works

### `ClassDefinition`

Stores the identity of each class form.

Why:

* each class must be unique,
* each class must be unlockable,
* each class must support tier-based evolution.

### `LineageDefinition`

Stores the family identity of a class family.

Why:

* lineage upgrades affect all classes in the family,
* branch compatibility must be graph-based,
* cross-lineage evolution needs adjacency.

### `PlayerMetaProgression`

Stores permanent progression.

Why:

* classes and lineages persist across runs,
* equipped slots are permanent meta unlocks,
* hybrid unlocks are progression milestones.

### `RunState`

Stores current run-only state.

Why:

* run resources must be riskable,
* checkpoints need banking support,
* class evolution during run must be temporary-state aware.

---

# 3) The 12 lineages and all 60 classes

## 3.1 Compact class matrix

Each lineage has five tiers.
Tier 1 is the simplest.
Tier 5 is the strongest and most advanced.

| Lineage             | Core identity                                                     | Tier 1             | Tier 2            | Tier 3               | Tier 4            | Tier 5              |
| ------------------- | ----------------------------------------------------------------- | ------------------ | ----------------- | -------------------- | ----------------- | ------------------- |
| **Drakehorn Forge** | explosive charge, draconic burst, first-strike pressure           | Ashhorn Initiate   | Cinderbreaker     | Drakebound Vanguard  | Hornfire Reaver   | Ember Crown Warden  |
| **Bull Cathedral**  | sanctuary, defense, ritual endurance, unshakable presence         | Stone Oathbearer   | Sanctum Brute     | Cathedral Bastion    | Aegis Minotaur    | Hierophant Colossus |
| **Twin Mirror**     | duplication, misdirection, adaptive spellwork                     | Mirror Spark       | Splitblade Savant | Double Glyph Adept   | Refraction Oracle | Eclipse Paragon     |
| **Tide Shell**      | moonlit protection, evasive defense, flow and recoil              | Shellstep Warden   | Tidebound Scout   | Mooncurrent Defender | Reef Sentinel     | Leviathan Crest     |
| **Sunfang Court**   | royalty, radiance, predator authority, dominant burst             | Dawncub Duelist    | Fanglight Heir    | Solar Blade          | Lionheart Regent  | Solar Sovereign     |
| **Thorn Ledger**    | precision, punishment, rules, poison, measured cruelty            | Quill Cutter       | Venom Scribe      | Verdict Thorn        | Briar Arbiter     | Seraphic Inquisitor |
| **Balance Reins**   | control through symmetry, paired forces, equalization             | Reinbound Initiate | Twinbridle Rider  | Equilibrium Marshal  | Harmony Lancer    | Concord Tribunal    |
| **Black Nest**      | stealth, poison, death, inevitability                             | Nestling Shade     | Razor Roost       | Dusk Talon           | Vesper Reaper     | Night Eclipse       |
| **Arrow Creed**     | discipline, long-range pursuit, oath and focus                    | Pathshot Scout     | Oath Archer       | Creed Ranger         | Longwatch Paladin | Horizon Judge       |
| **Iron Covenant**   | oath, greed, corruption, sacrifice, heavy power                   | Forgebound Acolyte | Brass Revenant    | Oathbreaker          | Iron Devil        | Covenant Tyrant     |
| **Star Circuit**    | stars, logic, electricity, resource manipulation, pattern control | Spark Node         | Circuit Adept     | Star Tuner           | Flux Savant       | Astral Architect    |
| **Dream Ocean**     | moon, illusion, healing, waves, soft control                      | Tide Dreamer       | Moonwake Mystic   | Veil Shepherd        | Current Oracle    | Ocean Eclipse       |

---

## 3.2 How to read the matrix

Each class form is **not** just “the same class but stronger.”
Each tier should shift the combat identity:

* Tier 1: basic and readable
* Tier 2: adds one meaningful twist
* Tier 3: establishes the lineage’s signature
* Tier 4: advanced specialization
* Tier 5: apex form, strongest and most complex

This keeps every class distinct while preserving family identity.

---

# 4) Lineage upgrade bonuses

Lineage upgrades are **shared family bonuses**.
They apply to all classes in that lineage.

## 4.1 Generic lineage upgrade model

```ts
function upgradeLineage(lineageId: LineageId) {
  const lineage = getLineage(lineageId);
  const cost = calculateLineageUpgradeCost(lineage.rank);

  if (!hasResources(cost)) return false;

  spendResources(cost);
  lineage.rank += 1;
  applyLineageBonus(lineageId, lineage.rank);

  return true;
}
```

---

## 4.2 Suggested rank threshold structure

Each lineage rank should do three things:

* give a small baseline buff,
* unlock a lineage milestone perk,
* improve affinity with one or more adjacent lineages.

### Suggested thresholds

* **Rank 1–2:** baseline stat buff
* **Rank 3:** first lineage passive
* **Rank 5:** signature lineage effect
* **Rank 7:** branch support / synergy boost
* **Rank 10:** apex lineage passive

---

## 4.3 Lineage upgrade bonus table

| Lineage             | Upgrade bonuses                                                  |
| ------------------- | ---------------------------------------------------------------- |
| **Drakehorn Forge** | opening damage bonus; first-action CT refund; fire/burst synergy |
| **Bull Cathedral**  | shield strength; mitigation; anti-burst stability                |
| **Twin Mirror**     | duplicate-action value; echo casts; alternating-skill synergy    |
| **Tide Shell**      | reactive shielding; dodge support; recovery after being hit      |
| **Sunfang Court**   | crit power; finisher damage; first-strike authority              |
| **Thorn Ledger**    | debuff potency; mark/poison pressure; execution window bonus     |
| **Balance Reins**   | buff duration; shared effect strength; tempo equalization        |
| **Black Nest**      | DOT potency; bleed pressure; terminal execution damage           |
| **Arrow Creed**     | accuracy; cooldown discipline; ranged consistency                |
| **Iron Covenant**   | HP-cost efficiency; raw power; self-risk reward scaling          |
| **Star Circuit**    | CT manipulation; resource gain; skill cycling efficiency         |
| **Dream Ocean**     | healing strength; phase control; delayed effect stability        |

---

## 4.4 Why these bonuses work

Each lineage gets a distinct battle identity:

* some are burst lines,
* some are defense lines,
* some are control lines,
* some are resource lines,
* some are sustain lines.

That matters because lineage upgrades should **change how the family feels**, not just increase raw stats.

---

# 5) Tier evolution rules

Tier evolution is the rule system that turns one class into another during a run.

This is a key roguelite mechanic.

---

## 5.1 Tier evolution basics

* A class may evolve only to **Tier +1**
* Evolution can be **same lineage** or **cross-lineage**
* Cross-lineage evolution requires **compatibility**
* The player must receive a **class tier upgrade item** or equivalent event reward

---

## 5.2 Tier upgrade item

```ts
interface TierUpgradeItem {
  id: string;
  type: 'tierUpgrade';
  sourceTier: Tier;
  targetTier: Tier;
  currentClassId: string;
}
```

---

## 5.3 Tier upgrade flow

```ts
function applyTierUpgradeItem(currentClassId: string, upgradeItem: TierUpgradeItem) {
  const currentClass = getClass(currentClassId);
  if (currentClass.tier !== upgradeItem.sourceTier) return false;
  if (upgradeItem.targetTier !== currentClass.tier + 1) return false;

  const candidates = getEvolutionCandidates(currentClass);

  presentEvolutionChoice(candidates);
  return true;
}
```

---

## 5.4 Evolution candidate logic

A class can evolve into a candidate only if:

* candidate tier is current tier + 1
* candidate is in the same lineage, or
* candidate is in a compatible lineage branch

```ts
function getEvolutionCandidates(currentClass: ClassDefinition): ClassDefinition[] {
  const sameLineage = getClassesByLineageAndTier(
    currentClass.lineageId,
    currentClass.tier + 1
  );

  const crossLineage = getCrossLineageCandidates(
    currentClass,
    currentClass.tier + 1
  );

  return [...sameLineage, ...crossLineage];
}
```

---

## 5.5 Cross-lineage compatibility rule

Cross-lineage evolution is allowed if the theme affinity score is high enough.

### Affinity score inputs

* role match
* CT profile match
* resource profile match
* theme tag overlap
* combat pattern similarity

```ts
function calculateAffinityScore(a: ClassDefinition, b: ClassDefinition): number {
  let score = 0;

  if (shareRole(a, b)) score += 40;
  if (shareCtPattern(a, b)) score += 25;
  if (shareResourceProfile(a, b)) score += 20;
  score += overlapCount(a.themeTags, b.themeTags) * 5;

  return score;
}

function canCrossEvolve(a: ClassDefinition, b: ClassDefinition): boolean {
  return calculateAffinityScore(a, b) >= 70;
}
```

---

## 5.6 Tier evolution rules by tier

### Tier 1 → Tier 2

* mostly same-lineage
* cross-lineage only if clearly compatible

### Tier 2 → Tier 3

* same-lineage default
* cross-lineage becomes more likely if the build already leans that way

### Tier 3 → Tier 4

* cross-lineage branching becomes meaningful
* the run build starts to specialize

### Tier 4 → Tier 5

* strongest branch point
* cross-lineage options should feel elite, not random

---

## 5.7 Tier evolution behavior

When a class evolves:

* the player keeps the current run
* the current class is replaced by the new one (single active class identity)
* the new class is permanently unlocked if it is the first time obtained
* the source class remains permanently unlocked too

In v1, cross-lineage evolution is **identity replacement** only. The system does not support simultaneous dual-lineage class identity in one active form.

```ts
function evolveClass(currentClassId: string, targetClassId: string) {
  unlockClass(targetClassId);
  setActiveClass(targetClassId);
  return true;
}
```

---

# 6) Lineage graph and cross-lineage branches

Cross-lineage branching should be graph-based, not arbitrary.

## 6.1 Recommended adjacency groups

### Group A: aggression / burst

* Drakehorn Forge
* Sunfang Court
* Iron Covenant

### Group B: defense / stability

* Bull Cathedral
* Tide Shell
* Dream Ocean

### Group C: trickery / resource manipulation

* Twin Mirror
* Star Circuit
* Thorn Ledger

### Group D: tempo / balance / control

* Balance Reins
* Arrow Creed
* Dream Ocean

### Group E: attrition / stealth / execution

* Black Nest
* Thorn Ledger
* Iron Covenant

---

## 6.2 Example cross-lineage paths

* **Ashhorn Initiate → Sunfang Court**
* **Stone Oathbearer → Tide Shell**
* **Mirror Spark → Star Circuit**
* **Quill Cutter → Black Nest**
* **Tidebound Scout → Balance Reins**
* **Oath Archer → Arrow Creed**
* **Brass Revenant → Drakehorn Forge**

These are the kinds of branches that should feel natural.

---

# 7) Random mid-run encounters

The run should include occasional non-combat events.
These are where tier upgrade items can appear.

## 7.1 Encounter types

* two-chest choice
* card draw
* number guess
* shrine gamble
* merchant trade
* cursed bargain
* puzzle door

One of the possible rewards should be:

* a **Class Tier Upgrade Item**

---

## 7.2 Random encounter logic

```ts
function resolveRandomEncounter(stageIndex: number) {
  const encounter = weightedRandom([
    'twoChest',
    'cardDraw',
    'numberGuess',
    'shrine',
    'merchant',
    'cursedChoice'
  ]);

  return generateEncounterResult(encounter, stageIndex);
}
```

---

## 7.3 Reward table

Possible rewards:

* gear
* resources
* class upgrade item
* lineage sigils
* class seals
* buffs
* rare rerolls

---

# 8) Checkpoint banking system

The checkpoint system should feel like a roguelite banking point, similar in spirit to Dead Cells.

---

## 8.1 Core rule

Checkpoints trigger at **stages 5, 10, 20, and 30**.

* Stage 5 = mini-boss checkpoint
* Stage 10 = gate-boss checkpoint
* Stage 20 = procedural checkpoint (non-boss)
* Stage 30 = counter-boss checkpoint

At each checkpoint:

* the player gets a **guaranteed baseline reward**
* the player may choose to **Continue Run** or **Return Home**

---

## 8.2 Banking philosophy

The checkpoint only applies to **bonus rewards**.

Baseline rewards are always granted.

### Baseline reward

Guaranteed, immediate, safe progression reward.

### Bonus reward vault

Risky, bankable run currency and rare rewards that can be lost if the player continues and dies before extracting them.

---

## 8.3 Dead Cells-style interpretation

Think of the run reward as being split into two parts:

* **safe progress**
* **bankable vault**

If the player returns home:

* vault is banked
* run ends
* home upgrades become available

If the player continues:

* vault stays at risk
* future stages may yield more
* death before next checkpoint forfeits the vault

---

## 8.4 Checkpoint choice pseudocode

```ts
function onCheckpointReached(runState: RunState, checkpointReward: RewardBundle) {
  grantBaselineReward(runState.playerId, checkpointReward.baseline);

  runState.carriedResources.bonusVault += checkpointReward.bonusVault;
  presentChoice(['continueRun', 'returnHome']);
}

function chooseReturnHome(runState: RunState) {
  bankResources(runState.carriedResources.bonusVault);
  resetRunState(runState);
  endRun();
}

function chooseContinueRun(runState: RunState) {
  // Keep bonusVault unbanked and at risk.
  runState.checkpointIndex += 1;
}
```

---

## 8.5 Run failure rule

If the player dies before banking:

* they lose unbanked bonus vault
* they keep all already-banked meta resources
* they keep permanent unlocks

```ts
function onRunDeath(runState: RunState) {
  loseUnbankedVault(runState.carriedResources.bonusVault);
  preservePermanentMetaProgress();
  endRun();
}
```

---

# 9) Hub spending system

All permanent upgrades happen at the home hub.

## 9.1 What can be upgraded at hub

* class rank
* lineage rank
* gear level
* weapon unlocks
* equipped class slots
* hybrid unlocks

---

## 9.2 Suggested resource types

```ts
interface MetaResources {
  ascensionCells: number;
  lineageSigils: Record<LineageId, number>;
  classSeals: Record<string, number>;
}
```

### Suggested use

* `ascensionCells` = general banked run currency
* `lineageSigils` = lineage-specific progression currency
* `classSeals` = class-specific progression currency

This keeps progression readable and supports the family-based upgrade model.

---

## 9.3 Hub upgrade pseudocode

```ts
function upgradeClassAtHub(classId: string) {
  const cost = calculateClassRankCost(classId);

  if (!canAfford(cost)) return false;

  spend(cost);
  incrementClassRank(classId);
  return true;
}

function upgradeLineageAtHub(lineageId: LineageId) {
  const cost = calculateLineageRankCost(lineageId);

  if (!canAfford(cost)) return false;

  spend(cost);
  incrementLineageRank(lineageId);
  applyLineageBonus(lineageId, getLineageRank(lineageId));
  return true;
}
```

---

# 10) Class slot progression

Players can hold multiple classes but equip a limited number.

## Slot progression

* Start: 1 class equipped
* Special item: 2 classes equipped
* Prestige: 3 classes equipped

```ts
function unlockClassSlot(meta: PlayerMetaProgression, method: 'specialItem' | 'prestige') {
  if (method === 'specialItem' && meta.equippedClassSlots < 2) {
    meta.equippedClassSlots = 2;
  }

  if (method === 'prestige' && meta.equippedClassSlots < 3) {
    meta.equippedClassSlots = 3;
  }
}
```

---

# 11) Final structural rules

## Classes

* 60 total
* 12 lineages
* 5 tiers each
* unique identity per class

## Lineages

* family-wide upgrade tree
* shared passive bonuses
* branch compatibility graph

## Tier evolution

* one tier at a time
* same-lineage by default
* cross-lineage through affinity

## Checkpoint banking

* checkpoints at stages 5, 10, 20, 30
* bosses at checkpoints 5, 10, 30 (stage 20 is non-boss)
* baseline reward guaranteed
* bonus vault banked only when returning home

## Run resources

* riskable
* bankable
* lost if the run fails before extraction

---

# 12) Implementation pseudocode summary

## Full run flow

```ts
function runLoop() {
  while (!runEnded) {
    if ([5, 10, 20, 30].includes(stageIndex)) {
      const checkpointReward = generateCheckpointReward(stageIndex);
      onCheckpointReached(runState, checkpointReward);

      const choice = waitForPlayerChoice(['continueRun', 'returnHome']);

      if (choice === 'returnHome') {
        chooseReturnHome(runState);
        break;
      }
    }

    const encounter = generateStageEncounter(stageIndex);

    if (encounter.type === 'randomEvent') {
      resolveRandomEncounter(stageIndex);
    } else if (encounter.type === 'combat') {
      resolveCombatEncounter(encounter);
    }

    stageIndex += 1;
  }
}
```

---

## Class drop flow

```ts
function onEnemyDefeated(playerLevel: number, currentClass: ClassDefinition) {
  const tier = rollTierByLevel(playerLevel);
  const dropClass = rollClassDrop(tier);

  if (isFirstTimeUnlock(dropClass.id)) {
    unlockClass(dropClass.id);
  }

  presentPickupChoice(dropClass);
}
```

---

## Tier upgrade flow

```ts
function onClassTierUpgradeItemUsed(currentClass: ClassDefinition) {
  const candidates = getEvolutionCandidates(currentClass);
  const filtered = candidates.filter(candidate => candidate.tier === currentClass.tier + 1);

  presentChoice(filtered);
}
```

---

# 13) Final note on naming and identity

The renamed lineage set works because it preserves the fantasy of the family while letting each class form feel distinct.

The player should not feel like they are choosing:

* “the same thing with a higher number.”

They should feel like they are choosing:

* a different combat identity inside a lineage,
* and then evolving that identity through the run.

That is the right design for a roguelite class system.

---
Yes. The previous structure was **too feature-heavy and a bit duplicated**. The main issue was that it mixed **content**, **domain logic**, and **UI feature shells** in a way that would make the codebase harder to scale.

The optimized approach is to split the project into **three layers**:

1. **content** — static game data like classes, lineages, skills, gear, bosses
2. **domain** — pure game rules and engines
3. **features** — screens, UI components, hooks, state wiring

That separation is cleaner, easier to test, and easier for a developer to navigate.

---

# Revised optimized file structure

```text
src/
  app/
    App.tsx
    navigation/
      RootNavigator.tsx
      MainNavigator.tsx
      RunNavigator.tsx
      HubNavigator.tsx
      CombatNavigator.tsx
      types.ts
    providers/
      AppProviders.tsx
      MetaProgressionProvider.tsx
      RunProvider.tsx
      CombatProvider.tsx

  content/
    classes/
      classDefinitions.ts
      lineageDefinitions.ts
      tierTables.ts
      branchGraph.ts
      unlockRequirements.ts
      classMatrix.ts
    skills/
      skillDefinitions.ts
      passiveDefinitions.ts
      skillTags.ts
    gear/
      gearDefinitions.ts
      itemDefinitions.ts
      statSkewDefinitions.ts
    bosses/
      bossDefinitions.ts
      bossMechanics.ts
      raidPatterns.ts
    rewards/
      rewardTables.ts
      bankingRewards.ts

  domain/
    combat/
      combatEngine.ts
      combatReducer.ts
      combatQueue.ts
      combatResolution.ts
      combatAI.ts
      combatMath.ts
      damagePipeline.ts
      costPipeline.ts
      targetResolver.ts
      effectPipeline.ts
      ctRules.ts
      statRules.ts
    progression/
      classUnlockEngine.ts
      classEvolutionEngine.ts
      lineageUpgradeEngine.ts
      slotUnlockEngine.ts
      hybridUnlockEngine.ts
      metaProgressionEngine.ts
    run/
      runEngine.ts
      checkpointEngine.ts
      stageEngine.ts
      randomEncounterEngine.ts
      runStateMachine.ts
    rewards/
      rewardEngine.ts
      bankingEngine.ts
      lootEngine.ts
    gear/
      gearEngine.ts
      gearScalingEngine.ts
      statSkewEngine.ts
      ctReductionEngine.ts

  features/
    hub/
      screens/
        HomeHubScreen.tsx
        ClassUpgradeScreen.tsx
        LineageUpgradeScreen.tsx
        HybridUnlockScreen.tsx
      components/
        HubHeader.tsx
        MetaResourcePanel.tsx
        UnlockedClassGrid.tsx
        LineageCard.tsx
        UpgradeCard.tsx
      state/
        hubStore.ts
        hubSelectors.ts
      hooks/
        useHubActions.ts

    run/
      screens/
        RunMapScreen.tsx
        StageScreen.tsx
        RandomEncounterScreen.tsx
        CheckpointScreen.tsx
        RunRewardScreen.tsx
      components/
        StageNode.tsx
        CheckpointPanel.tsx
        RewardVaultPanel.tsx
        EncounterChoiceCard.tsx
        RunStatusBar.tsx
      state/
        runStore.ts
        runSelectors.ts
      hooks/
        useRunActions.ts

    combat/
      screens/
        BattleScreen.tsx
        BattlePrepScreen.tsx
        BattleRewardScreen.tsx
      components/
        WaterfallCommandMenu.tsx
        CommandButton.tsx
        SkillList.tsx
        TargetPicker.tsx
        QueueTimeline.tsx
        BattleLogPanel.tsx
        StatusPanel.tsx
        ResourceBars.tsx
        GearPanel.tsx
      state/
        combatStore.ts
        combatSelectors.ts
      hooks/
        useBattleActions.ts
        useAutoBattle.ts

    gear/
      screens/
        EquipmentScreen.tsx
        ItemDetailScreen.tsx
        GearEnhanceScreen.tsx
      components/
        GearCard.tsx
        GearStatBlock.tsx
        GearAbilityPanel.tsx
        StatSkewPreview.tsx
      state/
        gearStore.ts
        gearSelectors.ts
      hooks/
        useGearActions.ts

  shared/
    components/
      Button.tsx
      Card.tsx
      Modal.tsx
      Tabs.tsx
      Badge.tsx
      EmptyState.tsx
      LoadingState.tsx
    design/
      colors.ts
      spacing.ts
      typography.ts
      theme.ts
    hooks/
      useConfirm.ts
      useDebounce.ts
      useNetworkStatus.ts
    state/
      appStore.ts
      uiStore.ts
    types/
      common.ts
      ids.ts
    utils/
      clamp.ts
      safeMath.ts
      deepClone.ts
      formatNumber.ts

  data/
    persistence/
      database.ts
      repositoryFactory.ts
      migrations/
      syncQueue.ts
    seed/
      classSeed.ts
      lineageSeed.ts
      gearSeed.ts
      bossSeed.ts
      rewardSeed.ts

  services/
    api/
      client.ts
      endpoints.ts
    sync/
      syncEngine.ts
      conflictResolver.ts
    logging/
      logger.ts
    analytics/
      analytics.ts

  tests/
    unit/
    integration/
    fixtures/
```

---

# Why this structure is better

## 1) `content/` is now separated from logic

This is the biggest improvement.

### What belongs in `content/`

* class names
* lineage names
* skill lists
* passive lists
* boss definitions
* gear data
* reward tables

### Why

These are **not engine logic**. They are game content. Keeping them in one place makes balancing and editing much easier.

---

## 2) `domain/` is now the rules engine

This is where the actual game logic lives.

### What belongs in `domain/`

* combat calculations
* CT queue rules
* class evolution rules
* checkpoint logic
* reward banking
* gear stat skew
* lineage upgrades

### Why

The developer can unit test these modules without touching React Native screens.

This makes the project far easier to maintain.

---

## 3) `features/` is now UI only

This prevents the codebase from becoming tangled.

### What belongs in `features/`

* screens
* components
* hooks
* feature-specific local state wiring

### Why

This keeps React Native views separate from pure gameplay logic.

---

## 4) `run/` and `rewards/` are separated from `hub/`

Previously, these were drifting together too much.

### Why separation matters

* `run/` is temporary state
* `rewards/` is extraction and banking logic
* `hub/` is permanent progression spending

These are related, but they are not the same thing.

---

## 5) `gear/` is its own domain and feature

That is useful because gear affects both:

* combat formulas
* progression display
* equipment UI

It needs its own engine and its own UI.

---

# Module responsibility map

## `domain/combat/`

Pure battle rules.

### Handles

* CT queue
* D20 rolls
* damage pipeline
* skill costs
* status effects
* AI action choice
* combat state transitions

### Does not handle

* screen rendering
* persistence
* hub upgrades
* class unlocks

---

## `domain/progression/`

Permanent progression logic.

### Handles

* class unlocks
* class evolution
* lineage upgrades
* hybrid unlocks
* extra class slot unlocks

### Does not handle

* battle execution
* visual UI
* random encounter presentation

---

## `domain/run/`

Active run logic.

### Handles

* stage progression
* checkpoint timing
* random encounter resolution
* continue/return-home choice
* run failure behavior

### Does not handle

* permanent upgrades
* combat engine math
* screen rendering

---

## `domain/rewards/`

Reward and banking logic.

### Handles

* baseline rewards
* bonus vault rewards
* banking/unbanking
* loot conversion
* reward tables

### Why separate

Because rewards are not identical to progression. They become progression only after banking.

---

## `domain/gear/`

Gear math and gear effects.

### Handles

* flat stat bonuses
* multiplicative bonuses
* stat skew
* CT reduction cap
* active gear ability cost handling

### Why separate

Because gear is a rules layer, not just UI inventory data.

---

# What I removed from the previous structure

The previous version had too many overlapping concerns:

* `classSystem`
* `hub`
* `run`
* `rewards`
* `gear`

That was workable, but it caused duplication because:

* class definitions belonged partly in data and partly in engine
* reward banking was too close to run state
* lineage upgrades were mixed with general hub logic

The revised version fixes that by making:

* `content` = static definitions
* `domain` = rules
* `features` = UI

That is the cleanest split.

---

# Exact execution order for a developer

## Phase 1 — foundation

* `content/classes`
* `content/skills`
* `content/gear`
* `content/bosses`
* `domain/progression`
* `domain/combat`
* `domain/run`
* `domain/rewards`
* `domain/gear`

## Phase 2 — state wiring

* stores
* selectors
* provider setup
* repository/persistence support

## Phase 3 — UI shell

* hub screens
* run screens
* battle screens
* gear screens

## Phase 4 — polish

* animations
* effects
* balance tuning
* accessibility

---

# Recommended simplification rule

If a file answers **“what is this thing?”**, it belongs in `content/`.

If a file answers **“what happens when this thing is used?”**, it belongs in `domain/`.

If a file answers **“how does the player see or interact with it?”**, it belongs in `features/`.

That rule will keep the project clean.

---

# Final recommendation

This revised structure is much better because it:

* reduces duplication,
* separates data from logic,
* keeps combat engine testable,
* keeps UI shallow,
* and makes class/lineage growth easier to extend.

The previous structure was too broad. This one is the one I would hand to a developer.

