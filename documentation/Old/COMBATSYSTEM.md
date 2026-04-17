# Integrated System Plan

## Co-op / Solo Expense RPG with AQ-inspired gear logic and CT raid-ready combat

This plan consolidates the current design into one coherent implementation target.

The system is built around five pillars:

1. **Finance-first ledger** — balances, settlements, and itemisation remain the source of truth.
2. **Fantasy-first presentation** — the app feels like a pixel-art RPG campaign.
3. **Campaign-local progression** — each solo campaign or group campaign is its own progression space.
4. **CT-based combat** — future-proof for single-boss raid encounters and later multi-player scaling.
5. **AQ-style gear identity** — gear matters, but skills remain the main tactical layer.

---

# 0) Documentation authority and conflict resolution

This document is the canonical source for combat and campaign development direction.

## Precedence

1. **COMBATSYSTEM.md** — authoritative for current design direction and implementation targets.
2. **CHANGELOG.md** — authoritative for what is currently shipped.
3. **EXPENSERPG.md** — roadmap context and planning support.

## Conflict protocol

If these documents clash:

1. Apply shipped truth from CHANGELOG to implementation assumptions.
2. Keep COMBATSYSTEM as the direction owner for next iterations.
3. If the clash changes development direction, stop and request explicit confirmation before coding.

## Status labels used in this document

* **SHIPPED** — implemented and validated against CHANGELOG.
* **PLANNED** — approved direction not yet implemented.
* **DEPRECATED** — superseded by newer shipped behavior.
* **NEEDS-CONFIRMATION** — unresolved conflict; do not implement until clarified.

## Known high-priority reconciliations

* **SHIPPED**: damage is guaranteed baseline plus rank-based damage dice (d4/d6/d8/d10/d12).
* **SHIPPED**: defense mitigation uses ratio scaling: `100 / (100 + 2*DEF)`.
* **SHIPPED**: crit resolution is layered (D20 success tier, then d12 severity inside critical outcomes).
* **SHIPPED**: precision is part of the active stat model and drives hit accuracy modifier.
* **SHIPPED**: solo campaign mode is available.
* **SHIPPED**: secondary class switching is allowed mid-campaign.
* **PLANNED**: cover action remains planned in this canonical direction until explicitly moved to shipped status.

## Known Documentation Mismatches

| Topic | Canonical (COMBATSYSTEM) | Legacy source | Required action |
|---|---|---|---|
| Damage variance | SHIPPED: guaranteed baseline + rank-based dice (d4-d12) | Older EXPENSERPG sections that describe d20-only damage variance | Treat d20-only wording as deprecated and align to base+dice in future edits |
| Defense mitigation | SHIPPED: ratio model `100 / (100 + 2*DEF)` | Legacy flat-subtraction examples in older docs | Keep ratio model as canonical unless explicitly superseded |
| Crit behavior | SHIPPED: layered model (D20 success tier + d12 severity within critical) | Prior single-layer crit descriptions | Keep layered model as source-of-truth |
| Precision stat | SHIPPED: precision drives hit modifier; speed governs CT/timing | Legacy text where speed handles both hit and queue | Prefer precision+speed split in all new edits |
| Solo mode status | SHIPPED and available | Legacy matrix cells that marked solo as planned | Keep solo marked shipped unless rollout status changes |
| Secondary class switching | SHIPPED: switching allowed mid-campaign | Legacy text saying secondary class is locked for campaign duration | Keep switching-allowed wording in active docs |
| Cover action | PLANNED in canonical direction | Legacy statements that mark cover as shipped | Keep cover labeled planned until explicit rollout confirmation |
| Document authority | COMBATSYSTEM direction, CHANGELOG shipped truth, EXPENSERPG roadmap context | Older EXPENSERPG header claiming source-of-truth authority | Preserve precedence chain in all future reconciliations |

---

# 1) Product objective and design logic

The product must solve a real practical problem: expense tracking and settlement. The RPG layer exists to make that socially and emotionally engaging enough to sustain use.

That means the design cannot drift into a “full RPG for its own sake.” Every game layer must support one of three outcomes:

* faster participation,
* clearer understanding,
* stronger engagement.

The chosen design supports that by splitting the app into:

* **ledger truth**
* **campaign progression**
* **combat encounters**
* **gear identity**
* **visual town/home feedback**

This separation keeps the finance side trustworthy and the RPG side expandable.

---

# 2) Campaign structure

## 2.1 Solo mode

Solo mode is a valid complete mode.

It exists for users who only want to track their own spending and still get the RPG progression loop.

Why this decision matters:

* It lowers onboarding friction.
* It prevents co-op from being a requirement.
* It gives the engine a non-networked baseline for testing and balance.

## 2.2 Co-op mode

Co-op mode supports group campaigns.

Each group has:

* a shared campaign,
* a shared campaign archive,
* a shared boss progression track,
* individual avatars and class setups,
* ledger records tied to group expense events.

Why this matters:

* It makes the app feel social.
* It turns shared expenses into shared content.
* It supports future raid-style fights.

## 2.3 Single-boss raid encounters only

The initial combat topology is **single boss only**.

This is a deliberate choice.

Why:

* It keeps the UI readable.
* It matches the current waterfall menu better.
* It supports future multi-player raid scaling without cluttering the first implementation.
* It avoids early complexity from multi-enemy targeting and layered AI.

The engine should still be topology-agnostic internally so multi-enemy raids can be added later without rewriting the queue system.

---

# 3) Core gameplay loops

## 3.1 Finance loop

1. User creates an expense.
2. Itemisation is added if needed.
3. The expense is split.
4. Balances update.
5. Settlement is confirmed manually.
6. The ledger closes the expense.
7. The campaign can later convert that record into boss content.

Why this matters:

* This is the utility layer.
* It must be fast and auditable.
* Fantasy must not interfere with ledger correctness.

## 3.2 Campaign loop

1. User opens the hub.
2. Sees current quest board, town state, and campaign progress.
3. Chooses a quest or boss encounter.
4. Prepares loadout, gear, and target strategy.
5. Battles the boss.
6. Gains rewards, XP, gear, and progression.
7. Returns to the hub.

Why this matters:

* This is the retention loop.
* It mirrors the campaign rhythm that makes hub-based RPGs feel satisfying.

## 3.3 Progression loop

1. User gains account XP from real-world interactions and app activity.
2. User gains campaign XP from campaign play.
3. Account XP grants universal stat points.
4. Campaign XP grants campaign-local stat points.
5. Campaign avatars can spend both, with explicit allocation tracking.

Why this matters:

* User growth stays meaningful across campaigns.
* Campaigns remain self-contained and replayable.

---

# 4) Combat system overview

Combat is designed to be:

* turn-based,
* CT-driven,
* manual-targeted,
* skill-cost based,
* transparent,
* raid-ready.

## 4.1 Why CT exists

CT is not just a turn-order gimmick. It is the resource layer that allows stronger actions to feel heavier.

Cost types in the engine:

* **CT cost**
* **MP cost**
* **HP cost**

This gives the game a tactical rhythm where stronger actions feel more expensive in one dimension or another.

### Design impact

* Players must weigh action strength against turn delay.
* Speed is meaningful.
* Future raid encounters can rely on a stable timing model.

---

# 5) Battle menu structure

The battle command menu uses the waterfall/AQ-inspired structure.

## Mother buttons

* Attack
* Skills
* Items
* Tactics/Other
* Flee

## Why this structure works

* It is readable.
* It gives the player a stable mental model.
* It supports quick decision-making.
* It maps cleanly to the chosen combat engine.

## Menu behavior

* SOLO mode uses the waterfall menu first.
* Skills shown are only equipped loadout skills.
* Manual targeting is required whenever the action is not unambiguous.
* Auto-targeting is avoided except where the action is inherently self-targeted or fixed-target.

### Design impact

This preserves strategy. Auto-targeting would flatten the decision layer and make gear/class differences less meaningful.

---

# 6) Class and skill system

## 6.1 Primary classes

Primary classes are campaign progression classes.

They:

* define the combat identity,
* define the basic attack,
* define primary stat bias,
* unlock active skills by rank,
* unlock passives by rank.

## 6.2 Secondary classes

Secondary classes are tactical overlays.

They:

* are selected before a campaign starts,
* can be switched mid-campaign,
* are fully unlocked,
* can be chosen by the user or assigned by an admin,
* are group-bound rather than account-bound.

## 6.3 Loadout rules

The combat loadout is:

* 1 basic attack
* 4 active skills
* passive slots determined by primary rank

The 4 active skills are chosen from the equipped primary and secondary class skills.

Why this matters:

* It keeps combat readable.
* It prevents skill bloat.
* It allows hybrid builds without overcomplicating the menu.

## 6.4 Passive rules

Passives:

* are always on once unlocked,
* are class-bound,
* stack multiplicatively,
* apply only to the owning character.

Why this matters:

* Passives become a build identity layer.
* Multiplicative stacking keeps them powerful without affecting other players.

---

# 7) Stat system

## Core stats

Use the AQ-style stat model and translate it cleanly into your system:

* Strength / ATK
* Defense
* Speed
* Precision
* Health
* Mana
* CDR

Precision handles hit reliability and attack-roll bonus, while speed remains the primary CT and turn-order stat.

## Stat layers

Each campaign avatar has four stat layers:

1. **Baseline stats**

   * primary class bias
   * starting allocation

2. **Campaign-earned stats**

   * gained within the campaign only

3. **Equipment stats**

   * flat bonuses and multipliers from gear

4. **Battle buffs**

   * temporary, battle-only effects

## Why this structure works

It keeps long-term growth, campaign identity, gear identity, and moment-to-moment battle state separated.

That separation is what makes the rest of the engine predictable.

---

# 8) Gear and item system

This is one of the most important integrations.

## 8.1 Gear is meaningful, but not central

Gear should matter like AQ gear matters:

* it changes damage feel,
* it changes survivability,
* it can skew stat distribution,
* it can modify CT slightly,
* it should support build identity.

But gear should not replace class and skill identity.

## 8.2 Item categories

There are two item categories:

### A. Equipped items

Permanent until:

* sold,
* discarded,
* replaced.

These are the core gear items.

They may provide:

* flat stat bonuses,
* multiplicative stat bonuses,
* lean-like stat skew,
* active item abilities with resource cost,
* passive effects,
* small CT reduction.

### B. Consumables

Deferred to a later phase.

These are not part of the first implementation.

This keeps v1 simpler and avoids economy clutter.

## 8.3 Equipment slots

Recommended slots:

* Weapon
* Armour
* Accessory

You can expand later if needed, but these three are enough to create meaningful build variety.

## 8.4 Gear effect types

Gear can provide:

* additive stat boosts,
* multiplicative stat boosts,
* DoT / HoT style passive effects,
* stat skew effects similar to AQ lean,
* small CT reduction.

### CT reduction rule

* Equipment-based CT reduction is capped at **10%** total.
* CT remains primarily skill-driven.

### Why this matters

This prevents speed gear from becoming the dominant build path.

---

# 9) Stat and multiplier order

The order must be fixed and deterministic.

## Resolution order

1. Flat gear bonuses
2. Gear multipliers
3. Passive multipliers
4. Battle buffs

For item-driven stat skew:

* apply the gear’s own multiplier in its fixed slot order.

## Fixed gear multiplier order

Use:

**base stat × weapon bonus × armour bonus × accessory bonus × passive**

This means:

* the weapon influences the stat first,
* passives apply after gear,
* battle buffs apply last.

### Example

If base ATK is 100:

* weapon multiplier = 1.2x
* passive = +10%

Final:
`(100 * 1.2) * 1.1 = 132`

If the weapon instead gives +10 ATK:
`(100 + 10) * 1.1 = 121`

### Why this matters

This gives you a deterministic and explainable combat math chain.

---

# 10) Item abilities

## Permanent equipped items with active abilities

An equipped item can have an active ability.

That active ability:

* remains with the player until the item is sold/discarded,
* has a resource cost,
* is not limited by consumable count.

This is now the v1 rule.

## Cost types for item abilities

An item ability may cost:

* HP
* MP
* CT
* or another defined battle resource

### Why this matters

It makes gear tactically relevant while keeping items separate from future consumable design.

---

# 11) Combat math and resolution pipeline

## 11.1 Turn resolution

The general turn order is:

1. Build CT queue from battle start.
2. Current unit reaches action.
3. Player or AI selects an equipped skill.
4. Target is manually selected if needed.
5. Resource cost is paid.
6. Hit roll and effect roll occur.
7. Damage, shields, and statuses resolve.
8. CT updates.
9. Next unit acts.

## 11.2 Damage pipeline

Use a clear layered pipeline.

### Recommended pseudocode

```ts
function resolveAttack(attacker, defender, skill) {
  const roll = rollD20(attacker.stats.precision);
  const successTier = getSuccessTier(roll); // fail | normal | strong | critical

  if (successTier === 'fail') {
    return { type: 'miss' };
  }

  let value = skill.baseValue + rollDamageDice(attacker.rank, skill);
  value += attacker.stats.strength * skill.strengthScale;
  value += attacker.stats.speed * skill.speedScale;

  value *= getTierMultiplier(successTier); // normal 1.0, strong 1.15, critical base 1.5
  if (successTier === 'critical') {
    value *= getCritSeverityMultiplier(rollCritSeverityD12());
  }

  value = applyGearFlatBonuses(attacker, value);
  value = applyGearMultipliers(attacker, value);
  value = applyPassiveMultipliers(attacker, value);
  value = applyBattleBuffs(attacker, value);

  value = applyDefenderShield(defender, value);
  value = applyDefenseRatio(defender, value); // value * (100 / (100 + 2 * DEF))
  value = applyElementResistance(defender, skill.element, value);

  value = Math.max(1, Math.floor(value));

  defender.hp = Math.max(0, defender.hp - value);

  return { type: 'damage', amount: value };
}
```

### Why this works

It is explicit, debuggable, and easy to extend.

---

# 12) CT system

CT is the action economy.

## Rules

* Speed determines queue position.
* Every action has a CT cost.
* Stronger skills can have higher CT cost, HP cost, or MP cost.
* Gear can modify CT slightly, but gear-based CT reduction is capped at 10%.

## Why this matters

This allows future raid balancing while preserving tactical tradeoffs.

### CT pseudocode

```ts
function buildQueue(units) {
  return units
    .map(unit => ({
      unitId: unit.id,
      ct: unit.stats.speedToCtStart,
      tieOrder: unit.joinOrder
    }))
    .sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}

function applyActionCost(queue, actingUnitId, ctCost) {
  return queue.map(unit => {
    if (unit.unitId !== actingUnitId) return unit;
    return { ...unit, ct: ctCost };
  }).sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}
```

### Why this matters

The queue becomes the backbone of every future combat mode.

---

# 13) Manual targeting

Manual targeting is required for multi-target-ready architecture, even though v1 is single-boss only.

## Targeting rules

* Basic attack may auto-suggest the boss, but the player must still confirm if the action is target-dependent.
* Damage skills require explicit target selection.
* Support and debuff actions require explicit target selection.
* Self-targeted and fixed-target actions can resolve automatically.

### Why this matters

Manual targeting preserves strategy and prevents the combat system from feeling abstracted away.

---

# 14) Auto-battle AI

Auto-battle should be simple and execute only at turn time.

## AI rules

* Heal if HP is below threshold.
* Prioritise high-value damage if safe.
* Use resource-efficient skills when CT is high.
* Use simple minimax-like scoring only if the computation remains lightweight.
* Do not precompute long sequences.

### Why this matters

The AI must remain cheap to run and easy to debug.

## Simple AI pseudocode

```ts
function chooseAutoAction(unit, battleState) {
  const options = getAvailableSkills(unit);

  const scored = options.map(skill => ({
    skill,
    score: scoreSkill(skill, unit, battleState)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].skill;
}
```

---

# 15) Battle menu integration

The waterfall battle menu should expose the equipped loadout in a fast, readable way.

## Menu structure

### Attack

* Basic Attack
* Class Basic Skill Shortcut
* Target Weakest

### Skills

* Only equipped skills
* grouped by damage/support/utility if useful
* short one-line descriptions
* manual targeting where needed

### Items

* equipped item abilities
* permanent item actions with resource cost
* no consumable counter in v1

### Tactics/Other

* defend (cover is planned)
* inspect enemy
* battle log
* auto-battle toggle
* future formation stub

### Flee

* immediate escape command if allowed by engine rules

### Why this matters

The menu becomes the player-facing control layer of the CT combat engine.

---

# 16) Data structures

Below is a practical TypeScript-oriented model.

```ts
type CampaignMode = 'solo' | 'group';

type StatBlock = {
  strength: number;
  defense: number;
  speed: number;
  precision: number;
  health: number;
  mana: number;
  cdr: number;
};

type ResourceCostType = 'ct' | 'mp' | 'hp' | 'none';

type ItemSlot = 'weapon' | 'armour' | 'accessory';

type SkillType = 'basic' | 'active' | 'passive';

type Element = 'neutral' | 'fire' | 'water' | 'earth' | 'wind' | 'ice' | 'energy' | 'light' | 'dark' | 'void' | 'harm';

interface Campaign {
  id: string;
  mode: CampaignMode;
  ownerUserId?: string;
  groupId?: string;
  status: 'active' | 'archived';
  level: number;
  xp: number;
  currentBossId?: string;
}

interface Avatar {
  id: string;
  userId: string;
  campaignId: string;
  primaryClassId: string;
  secondaryClassId?: string;
  baselineStats: StatBlock;
  campaignStats: StatBlock;
  universalStatsUsed: number;
  campaignStatsUsed: number;
  equippedLoadoutId: string;
}

interface ClassDefinition {
  id: string;
  name: string;
  classType: 'primary' | 'secondary';
  primaryScalingStat: keyof StatBlock;
  secondaryScalingStat?: keyof StatBlock;
  costBias: ResourceCostType;
}

interface Skill {
  id: string;
  classId: string;
  name: string;
  type: SkillType;
  costType: ResourceCostType;
  costValue: number;
  cooldownTurns: number;
  baseValue: number;
  primaryScalingStat: keyof StatBlock;
  secondaryScalingStat?: keyof StatBlock;
  targetType: 'self' | 'single' | 'group' | 'boss';
}

interface Equipment {
  id: string;
  ownerAvatarId: string;
  slot: ItemSlot;
  name: string;
  flatStatBonuses: Partial<StatBlock>;
  multiplicativeBonuses: Partial<Record<keyof StatBlock, number>>;
  ctReductionPercent?: number; // capped globally at 10%
  activeAbilitySkillId?: string;
  passiveTags?: string[];
  statSkewProfile?: {
    strength?: number;
    defense?: number;
    speed?: number;
    health?: number;
    mana?: number;
    cdr?: number;
  };
}

interface BattleState {
  id: string;
  campaignId: string;
  bossId: string;
  phase: 'preparation' | 'queueing' | 'turn' | 'resolving' | 'reward' | 'finished';
  queue: QueueEntry[];
  units: BattleUnit[];
  log: string[];
  result?: 'win' | 'lose' | 'flee';
}

interface BattleUnit {
  id: string;
  type: 'avatar' | 'boss';
  stats: StatBlock;
  hp: number;
  mp: number;
  shield: number;
  equipmentIds: string[];
  skillIds: string[];
  passiveIds: string[];
  autoBattle: boolean;
}

interface QueueEntry {
  unitId: string;
  ct: number;
  tieOrder: number;
}
```

---

# 17) Core helper pseudocode

## 17.1 Stat resolution

```ts
function calculateFinalStat(base: number, flatBonus: number, gearMultiplier: number, passiveMultiplier: number, battleMultiplier: number) {
  return (((base + flatBonus) * gearMultiplier) * passiveMultiplier) * battleMultiplier;
}
```

## 17.2 Equipment CT reduction

```ts
function calculateEquipmentCtReduction(equipmentList: Equipment[]): number {
  const total = equipmentList.reduce((sum, item) => sum + (item.ctReductionPercent ?? 0), 0);
  return Math.min(total, 0.10);
}
```

## 17.3 Item ability use

```ts
function useItemAbility(unit: BattleUnit, equipment: Equipment, battle: BattleState) {
  if (!equipment.activeAbilitySkillId) return battle;

  const cost = getResourceCost(equipment.activeAbilitySkillId);
  payCost(unit, cost);

  return resolveSkillEffect(unit, equipment.activeAbilitySkillId, battle);
}
```

## 17.4 Queue advancement

```ts
function advanceQueueAfterAction(queue: QueueEntry[], actingUnitId: string, ctCost: number) {
  return queue.map(entry =>
    entry.unitId === actingUnitId
      ? { ...entry, ct: ctCost }
      : { ...entry, ct: Math.max(0, entry.ct - ctCost) }
  ).sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}
```

---

# 18) Screen map

The UI should be small but explicit.

## Core screens

* Onboarding
* Mode select
* Hub / town
* Campaign dashboard
* Quest board
* Quest detail
* Battle prep
* Battle screen
* Reward screen
* Settlement screen
* Gear / item screen
* Class / loadout screen
* Archive
* Settings

### Why this matters

This mirrors the campaign rhythm:
hub → choose → prepare → fight → reward → return.

---

# 19) Implementation phases

## Phase 1 — ledger and campaign foundation

Deliver:

* solo mode
* group mode
* expense entry
* split logic
* settlement confirmation
* campaign persistence

## Phase 2 — campaign hub and quest structure

Deliver:

* town hub
* quest board
* campaign dashboard
* quest detail

## Phase 3 — class and loadout system

Deliver:

* primary classes
* secondary classes
* ranks
* passives
* 5-skill loadout
* class-specific menu rendering

## Phase 4 — combat engine

Deliver:

* CT queue
* manual targeting
* D20 resolution
* cost system
* battle logs
* auto-battle rules

## Phase 5 — gear and item layer

Deliver:

* equipment slots
* flat bonuses
* multiplicative bonuses
* stat skew
* active item abilities
* CT reduction cap

## Phase 6 — boss/rival layer

Deliver:

* single-boss raid encounters
* rival boss learning
* reward stealing/recovery
* side quest fallback

## Phase 7 — polish and future-proofing

Deliver:

* item consumable scaffolding
* future multi-enemy encounter support
* raid scaling hooks
* animation and UI refinement

---

# 20) Why these decisions hold together

The design is coherent because each layer has a clear job:

* **Ledger**: truth and settlement.
* **Campaign**: progression and persistence.
* **Classes**: identity and tactical direction.
* **Skills**: active decision-making.
* **Gear**: build shaping and stat skew.
* **CT**: action economy.
* **Menu**: fast human input.
* **Boss raid**: encounter focus.

Nothing is doing two jobs at once, which is what keeps systems like this from collapsing into noise.

---

# 21) Final integration summary

The system now supports:

* SOLO and co-op modes
* campaign-local progression
* account-wide universal stat growth
* CT-based single-boss raid encounters
* manual targeting
* AQ-inspired waterfall command menus
* skill-driven combat
* gear-driven stat identity
* equipped items with active abilities
* future consumables as a separate item layer
* gear multipliers, passive multipliers, and battle buffs in a deterministic order
* gear CT reduction capped at 10%

This is the correct shape for a buildable first version.

Next step: I can convert this into a **developer handoff document with implementation checklist, file structure, and exact module responsibilities**.


# Combat System Developer Handoff

## Combat-only version

Everything below is limited to the **combat system**. All campaign, ledger, auth, settlement, and non-combat systems are excluded.

---

## 1) Combat scope

The combat system must support:

* CT-based turn order
* single-boss raid-style encounters
* manual targeting
* D20 resolution
* skill costs: CT, MP, HP
* equipped gear with stat bonuses, lean/stat skew, and small CT reduction
* permanent equipped item abilities with resource cost
* passive stacking
* simple auto-battle AI
* AQ-inspired waterfall command menu in SOLO mode
* future raid scalability

---

## 2) Combat-only file structure

```text
src/
  features/
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

      engine/
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

      state/
        combatStore.ts
        combatSelectors.ts

      hooks/
        useBattleActions.ts
        useAutoBattle.ts

      types/
        combatTypes.ts
        battleTypes.ts
        actionTypes.ts

      utils/
        d20.ts
        ctMath.ts
        effectOrder.ts
        statOrder.ts
        gearScaling.ts
```

---

## 3) Module responsibilities

### `screens/BattleScreen.tsx`

Main combat UI. Renders:

* queue
* status bars
* waterfall command menu
* target picker
* battle log
* gear/item ability panel

Must not contain core combat logic.

### `screens/BattlePrepScreen.tsx`

Pre-battle loadout and gear selection.

* choose equipped skills
* inspect gear bonuses
* preview stats and CT behavior
* confirm battle start

### `screens/BattleRewardScreen.tsx`

End-of-battle summary.

* XP gain
* drops
* boss result
* return/continue action

---

### `components/WaterfallCommandMenu.tsx`

AQ-style command menu.

* Attack
* Skills
* Items
* Tactics/Other
* Flee

### `components/SkillList.tsx`

Renders equipped skills only.

* one-line descriptions
* cost/cooldown status
* disabled states

### `components/TargetPicker.tsx`

Manual target selection.

* required for target-dependent skills
* supports future raid-safe targeting

### `components/QueueTimeline.tsx`

Visualizes CT queue.

* current CT values
* turn order
* tie order

### `components/GearPanel.tsx`

Displays equipment effects relevant to combat.

* flat stats
* multipliers
* stat skew
* CT reduction contribution
* active gear abilities

### `components/StatusPanel.tsx`

Shows unit status.

* HP
* MP
* shield
* buffs/debuffs
* CT

---

### `engine/combatEngine.ts`

Main battle orchestrator.

* start battle
* apply action
* advance queue
* end battle
* emit battle state

### `engine/combatReducer.ts`

Pure state transitions.

* apply damage
* apply healing
* apply buffs/debuffs
* update CT
* update logs

### `engine/combatQueue.ts`

CT queue logic.

* build initial queue
* handle tie order
* advance CT
* apply CT modifiers
* cap gear-based CT reduction at 10%

### `engine/combatResolution.ts`

High-level action resolution.

* attack
* skill
* item ability
* defend (cover planned)
* flee

### `engine/combatAI.ts`

Auto-battle decision logic.

* choose action at turn time
* simple scoring
* low-resource heuristics

### `engine/combatMath.ts`

Shared math helpers.

* D20 roll
* hit chance
* crit chance
* mitigation
* scaling helpers

### `engine/damagePipeline.ts`

Damage calculation order.

* base damage
* flat gear bonuses
* gear multipliers
* passive multipliers
* battle buffs
* defense/shield/resistance
* clamp

### `engine/costPipeline.ts`

Resource cost handling.

* CT cost
* MP cost
* HP cost
* pay-first-then-resolve behavior

### `engine/targetResolver.ts`

Target validation and resolution.

* self
* single target
* boss target
* future raid-safe support

### `engine/effectPipeline.ts`

Status and ongoing effect handling.

* buff application
* debuff application
* damage over time
* heal over time
* duration decrement

---

### `state/combatStore.ts`

Battle state storage.

* current battle
* queue
* unit state
* selected target
* selected action
* logs

### `state/combatSelectors.ts`

Derived battle state.

* active unit
* available skills
* available targets
* queue summary
* can-act flags

---

### `hooks/useBattleActions.ts`

UI bridge for dispatching combat actions.

### `hooks/useAutoBattle.ts`

Auto-battle trigger and decision hook.

---

### `types/combatTypes.ts`

Shared combat types.

* units
* skills
* gear
* statuses
* stats
* queue entries
* battle state

### `types/battleTypes.ts`

Battle-specific enums and interfaces.

* battle phase
* encounter type
* result states

### `types/actionTypes.ts`

Action payloads.

* attack
* skill
* item ability
* defend
* flee

---

## 4) Combat data model

```ts id="combat-types"
type ResourceCostType = 'ct' | 'mp' | 'hp' | 'none';
type SkillType = 'basic' | 'active' | 'passive';
type ItemSlot = 'weapon' | 'armour' | 'accessory';
type BattlePhase = 'preparation' | 'queueing' | 'turn' | 'resolving' | 'reward' | 'finished';

type Element = 'neutral' | 'fire' | 'water' | 'earth' | 'wind' | 'ice' | 'energy' | 'light' | 'dark' | 'void' | 'harm';

type StatBlock = {
  strength: number;
  defense: number;
  speed: number;
  precision: number;
  health: number;
  mana: number;
  cdr: number;
};

interface Combatant {
  id: string;
  type: 'avatar' | 'boss';
  name: string;
  stats: StatBlock;
  hp: number;
  mp: number;
  shield: number;
  equipmentIds: string[];
  skillIds: string[];
  passiveIds: string[];
  autoBattle: boolean;
  resistances: Record<Element, number>;
}

interface Skill {
  id: string;
  classId: string;
  name: string;
  type: SkillType;
  costType: ResourceCostType;
  costValue: number;
  cooldownTurns: number;
  baseValue: number;
  primaryScalingStat: keyof StatBlock;
  secondaryScalingStat?: keyof StatBlock;
  targetType: 'self' | 'single' | 'boss';
}

interface Equipment {
  id: string;
  slot: ItemSlot;
  name: string;
  flatStatBonuses: Partial<StatBlock>;
  multiplicativeBonuses: Partial<Record<keyof StatBlock, number>>;
  ctReductionPercent?: number; // total gear CT reduction capped at 10%
  activeAbilitySkillId?: string;
  statSkewProfile?: Partial<StatBlock>;
}

interface QueueEntry {
  unitId: string;
  ct: number;
  tieOrder: number;
}

interface BattleState {
  id: string;
  phase: BattlePhase;
  queue: QueueEntry[];
  units: Combatant[];
  log: string[];
  selectedAction?: string;
  selectedTargetId?: string;
  result?: 'win' | 'lose' | 'flee';
}
```

---

## 5) Resolution rules

### Stat order

Use this fixed order:

1. flat gear bonuses
2. gear multipliers
3. passive multipliers
4. battle buffs

### Gear multiplier order

Use a fixed slot order:

**base stat × weapon bonus × armour bonus × accessory bonus × passive**

### CT reduction

* Gear may reduce CT.
* Total gear-based CT reduction is capped at **10%**.
* CT remains primarily skill-driven.

### Item abilities

* Active item abilities belong to equipped gear.
* They are permanent until the item is sold/discarded.
* They have resource cost.
* They are not consumables in v1.

---

## 6) Combat flow pseudocode

```ts id="combat-flow"
function startBattle(encounter) {
  const queue = buildQueue(encounter.units);
  return {
    ...encounter,
    phase: 'turn',
    queue,
    log: ['Battle started'],
  };
}

function resolvePlayerAction(state, action) {
  const actor = getActiveUnit(state);
  const target = resolveTarget(state, action, actor);

  const costPaid = payActionCost(actor, action);
  if (!costPaid.ok) return state;

  const outcome = resolveCombatAction(actor, target, action, state);
  const updated = applyOutcome(state, outcome);

  return advanceBattle(updated, action.ctCost);
}
```

---

## 7) Attack resolution pseudocode

```ts id="attack-resolution"
function resolveAttack(attacker, defender, skill) {
  const roll = rollD20(attacker.stats.precision);
  const successTier = getSuccessTier(roll);

  if (successTier === 'fail') {
    return { type: 'miss' };
  }

  let value = skill.baseValue + rollDamageDice(attacker.rank, skill);
  value += attacker.stats.strength * (skill.primaryScale ?? 1);
  value += attacker.stats.speed * (skill.secondaryScale ?? 0);

  value *= getTierMultiplier(successTier);
  if (successTier === 'critical') {
    value *= getCritSeverityMultiplier(rollCritSeverityD12());
  }

  value = applyFlatGearBonuses(attacker, value);
  value = applyGearMultipliers(attacker, value);
  value = applyPassiveMultipliers(attacker, value);
  value = applyBattleBuffs(attacker, value);

  value = applyShield(defender, value);
  value = applyDefenseRatio(defender, value);
  value = applyResistance(defender, skill.element, value);

  value = Math.max(1, Math.floor(value));

  return {
    type: 'damage',
    amount: value,
  };
}
```

---

## 8) Queue pseudocode

```ts id="queue-pipeline"
function buildQueue(units) {
  return units
    .map((unit, index) => ({
      unitId: unit.id,
      ct: Math.max(1, 100 - unit.stats.speed),
      tieOrder: index,
    }))
    .sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}

function advanceQueue(queue, actingUnitId, ctCost) {
  return queue
    .map(entry => {
      if (entry.unitId === actingUnitId) {
        return { ...entry, ct: ctCost };
      }
      return { ...entry, ct: Math.max(0, entry.ct - ctCost) };
    })
    .sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}
```

---

## 9) Auto-battle AI pseudocode

```ts id="auto-ai"
function chooseAutoAction(unit, battleState) {
  const skills = getAvailableSkills(unit);

  const scored = skills.map(skill => ({
    skill,
    score: scoreSkill(skill, unit, battleState),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.skill ?? getBasicAttack(unit);
}

function scoreSkill(skill, unit, battleState) {
  let score = 0;

  if (unit.hp / unit.maxHp < 0.65 && skill.heals) score += 100;
  if (skill.damage) score += 40;
  if (skill.buff && unit.hp < 0.5) score += 20;
  if (skill.costType === 'hp') score -= 10;
  if (skill.costType === 'ct' && skill.costValue > 40) score -= 15;

  return score;
}
```

---

## 10) Battle menu responsibilities

### Attack

* basic attack
* class basic shortcut
* target selection if required

### Skills

* equipped active skills only
* short summaries
* cost/cooldown state
* manual target selection where needed

### Items

* equipped item abilities only
* permanent items with resource cost
* no consumable count in v1

### Tactics/Other

* defend (cover planned)
* inspect enemy
* battle log
* auto-battle toggle
* future placeholder actions

### Flee

* attempt escape
* immediate action

---

## 11) Implementation order

1. `combatTypes.ts`
2. `combatMath.ts`
3. `combatQueue.ts`
4. `targetResolver.ts`
5. `costPipeline.ts`
6. `damagePipeline.ts`
7. `combatResolution.ts`
8. `combatReducer.ts`
9. `combatEngine.ts`
10. `BattleScreen.tsx`
11. `WaterfallCommandMenu.tsx`
12. `SkillList.tsx`
13. `TargetPicker.tsx`
14. `GearPanel.tsx`
15. `combatAI.ts`
16. `BattlePrepScreen.tsx`
17. `BattleRewardScreen.tsx`

---

## 12) Non-negotiable rules

* Single-boss raid encounters only for v1.
* Manual targeting is required.
* Gear may affect CT, but only slightly and capped at 10%.
* Equipment can have active abilities with resource cost.
* Gear multipliers apply before passive multipliers.
* Battle buffs apply last.
* Consumables are excluded from v1.
* Combat logic must be pure and testable.
* UI must not calculate combat outcomes directly.

---
