# Archived Documentation (Combined)

**Consolidated**: June 1, 2026  
**Original files**: 9

## Table of Contents

  1. [architecture-rpg-extracts](#architecture-rpg-extracts)
  2. [changelog-rpg-extracts](#changelog-rpg-extracts)
  3. [COMBATSYSTEM](#combatsystem)
  4. [COMPANIONS](#companions)
  5. [EXPENSERPG](#expenserpg)
  6. [GAMIFICATION_IMPLEMENTATION_PLAN](#gamification-implementation-plan)
  7. [PARTY_FLOW_ARCHITECTURE](#party-flow-architecture)
  8. [PARTY_FLOW_PHASE_UPDATES](#party-flow-phase-updates)
  9. [PHASE_1.6_PARTY_CONTACTS](#phase-1-6-party-contacts)

---

# architecture-rpg-extracts

# RPG-Related Architecture Extracts

> Sections lifted from `documentation/architecture/{FIRESTORE_SCHEMA,SYSTEM_ARCHITECTURE,INPUT_OUTPUTS}.md`. The campaign/combat/town/companion data model was never formally added to `FIRESTORE_SCHEMA.md` â€” the source of truth for those types is `src/services/gamification/CampaignTypes.ts` and `ExpeditionTypes.ts` (both copied to this folder). Only the **gamification core** (XP, achievements, ledger, definitions) was documented in the architecture docs; that text is reproduced below.

---

## From `FIRESTORE_SCHEMA.md` â€” Gamification Data Model (Phase 2.4)

> **Status**: Fully implemented. Collections live in Firestore. Achievement definitions are **auto-seeded** on first app boot â€” `GamificationContext` detects an empty `achievementDefinitions` collection and calls `seedAchievementDefinitions()` automatically (idempotent â€” uses `setDoc`, safe to re-run). No manual seed step required.

These four collections support the gamification system (XP, streaks, achievements, group leaderboards). They are independent of the expense/payment data model and can be rolled back without affecting financial data.

### UserGameProfiles Collection

**Path**: `/userGameProfiles/{userId}`

One document per user, keyed by Firebase UID (same key as `users/{userId}`). Kept as a separate top-level collection so gamification security rules don't require modifying the existing `users` collection rules.

```typescript
interface UserGameProfile {
  xp:                   number;    // Total XP earned all-time (never decrements)
  level:                number;    // 1â€“10, derived from XP thresholds
  streak:               number;    // Consecutive active days
  longestStreak:        number;    // All-time best streak
  lastActiveDate:       string;    // "YYYY-MM-DD"
  totalPaymentsMade:    number;
  totalExpensesCreated: number;
  createdAt:            Timestamp;
  updatedAt:            Timestamp;
}
```

**Level thresholds** (XP â†’ Level):

| Level | Min XP |
|-------|--------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 1000 |
| 6 | 2000 |
| 7 | 3500 |
| 8 | 5500 |
| 9 | 8000 |
| 10 | 12000 |

**Security rules**: User can only read/write their own document (`userId == request.auth.uid`).

---

### UserAchievements Collection

**Path**: `/userAchievements/{docId}`

Top-level collection (not a subcollection of `userGameProfiles`) to allow efficient cross-user queries for group leaderboards. Each document represents one earned badge.

```typescript
interface UserAchievement {
  userId:        string;
  achievementId: string;     // e.g. "first_step", "settler", "on_a_roll"
  unlockedAt:    Timestamp;
  xpAwarded:     number;
}
```

**Required composite index**: `userId ASC, unlockedAt DESC`.

**Security rules**: User can read their own achievements. User can create entries for themselves. No updates or deletes â€” append-only.

**9 defined achievement IDs**:

| ID | Title | Condition |
|----|-------|-----------|
| `first_step` | First Step | First expense created |
| `settler` | Settler | First full payment settlement |
| `group_founder` | Group Founder | First group created |
| `squad_goals` | Squad Goals | Group with 5+ members |
| `big_spender` | Big Spender | Single expense â‰¥ $100 equivalent |
| `on_a_roll` | On a Roll | 7-day active streak |
| `century_club` | Century Club | 100 XP total |
| `globetrotter` | Globetrotter | First multi-currency transaction |
| `prompt_payer` | Prompt Payer | Settle payment within 24h of expense creation |

---

### XPLedger Collection

**Path**: `/xpLedger/{docId}`

Append-only log of every XP award. Primary purpose: **idempotency guard** â€” before any `awardXP` call, `GamificationService` queries for an existing doc with matching `userId + referenceId + reason`. If found, the award is skipped.

```typescript
interface XPLedgerEntry {
  userId:        string;
  xpDelta:       number;    // Always positive
  reason:        string;    // "expense_create" | "settle_full" | "settle_partial" |
                            // "create_group_first" | "expense_first" |
                            // "onboarding_complete" | "streak_7_day"
  referenceId:   string;    // Firestore doc ID of the triggering entity.
                            // Combined with reason forms the idempotency key.
  referenceType: string;    // "payment" | "expense" | "group" | "streak" | "onboarding"
  groupId:       string | null;
  createdAt:     Timestamp;
}
```

**Security rules**: User can read and create their own entries. No updates or deletes â€” append-only.

---

### AchievementDefinitions Collection

**Path**: `/achievementDefinitions/{achievementId}`

Static seed data â€” written once during setup, read-only at runtime. Allows badge metadata to be updated (icon, description) without a code release.

```typescript
interface AchievementDefinition {
  id:           string;
  title:        string;
  description:  string;
  icon:         string;    // MaterialCommunityIcons name
  category:     string;    // "expenses" | "payments" | "social" | "streaks" | "milestones"
  xpReward:     number;
}
```

**Note**: Achievement conditions are hardcoded in `checkAndAwardAchievements()`, not stored in Firestore. The `triggerEvent` and `condition` fields from the original design were not implemented.

**Security rules**: Authenticated users can read. Authenticated users can create/update (for initial seeding via `seedAchievementDefinitions`). No deletes.

---

## From `SYSTEM_ARCHITECTURE.md` â€” Provider Wiring

| 6 | **GamificationContext** | `src/contexts/GamificationContext.tsx` | XP, streaks, achievements. Anonymous user guard skips Firestore subscriptions |

```
<GamificationProvider>  // 6. Depends on Auth + Transactions
   ...
</GamificationProvider>
```

Gamification events on the global event bus:
`GAMIFICATION_XP_AWARDED`, `GAMIFICATION_ACHIEVEMENT_UNLOCKED`

(See also `BOSS_DEFEATED`, `QUEST_COMPLETED`, `CAMPAIGN_COMPLETED`, `TOWN_BUILDING_PURCHASED` event types added in later phases â€” see `src/utils/appEvents.ts`.)

---

## From `INPUT_OUTPUTS.md` â€” Gamification Collections & Indexes

### Collections
| Collection | Doc ID | Key Fields | Notes |
|---|---|---|---|
| `userGameProfiles` | Firebase Auth UID | xp, level, streak, longestStreak, lastActiveDate, totalPaymentsMade, totalExpensesCreated, createdAt, updatedAt | Gamification profile per user (separate from `users` to isolate security rules) |
| `userAchievements` | auto-generated | userId, achievementId, unlockedAt, xpAwarded | Earned achievement badges. One doc per user per badge. |
| `xpLedger` | auto-generated | userId, xpDelta, reason, referenceId, referenceType, groupId, createdAt | Append-only XP audit log; idempotency guard (`userId + referenceId + reason`) |
| `achievementDefinitions` | achievementId | id, title, description, icon, category, xpReward | Static seed data â€” 9 defined achievements. |

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| userAchievements | userId ASC + unlockedAt DESC | User's achievements in unlock order |
| xpLedger | userId ASC + referenceId ASC + reason ASC | Idempotency guard for duplicate XP award prevention |

### Onboarding XP Hook (referenced from index.tsx)
| Trigger | Call | Effect |
|---|---|---|
| Select & Confirm | `onComplete(selectedCurrency)` â†’ `updatePreferredCurrency(currency, true)` + `awardXP(user.uid, 30, 'onboarding_complete', ...)` | Writes `users/{uid}.preferredCurrency` + `.hasCompletedCurrencyOnboarding = true` â†’ awards +30 XP (idempotent via xpLedger) â†’ resets to MainApp |
| Skip | `onSkip()` â†’ `updatePreferredCurrency('USD', true)` + `awardXP(user.uid, 30, 'onboarding_complete', ...)` | Same write with default currency + XP award â†’ resets to MainApp |

---

## Campaign / Combat / Town / Expedition Collections (Not in Architecture Docs)

The campaign-RPG-era collections (added Apr 2026) were never written into `FIRESTORE_SCHEMA.md`. The schema lives in code. Quick reference:

| Collection | Path | Source of truth |
|---|---|---|
| Campaigns | `/campaigns/{campaignId}` | `CampaignTypes.ts` â†’ `Campaign` |
| Avatars | `/campaigns/{campaignId}/avatars/{avatarUserId}` | `CampaignTypes.ts` â†’ `CampaignAvatar` |
| Bosses | `/campaigns/{campaignId}/bosses/{bossId}` | `CampaignTypes.ts` â†’ `CampaignBoss` |
| Quests | `/campaigns/{campaignId}/quests/{questId}` | `CampaignTypes.ts` â†’ `CampaignQuest` |
| Battles | `/campaigns/{campaignId}/battles/{battleId}` | `CampaignTypes.ts` â†’ `BattleState` |
| Archive | `/campaigns/{campaignId}/archive/{entryId}` | `CampaignTypes.ts` â†’ `ArchiveEntry` |
| Gold ledger | `/goldLedger/{entryId}` | `ExpeditionTypes.ts` (TownService writes) |
| Reward idempotency | `/rewardIdempotency/{entryId}` | `ExpeditionService.ts` |
| Daily quest progress | `/dailyQuestProgress/{docId}` | `GamificationService.ts` |
| Game config | `/gameConfig/{configId}` | `GamificationService.ts` (XP multiplier event window, etc.) |

Refer to the corresponding `*.ts` files in `RPG_CODE_FOLDER/src/services/gamification/` for the canonical interfaces.

---

# changelog-rpg-extracts

# RPG Changelog Extracts

> Sections lifted from `documentation/core_docs/CHANGELOG.md` (CCPAY Split). These cover all RPG/campaign/combat/town/companion-related entries. Listed newest first, same order as the source.

---

## Status Effect Depth & Dice Regression Fix (Apr 13-14, 2026)

Phase 6 of the combat system overhaul: formalized the status effect taxonomy, centralized all buff/debuff application, added on-sprite badge UI, and fixed a runtime crash in the dice animation.

### Status Effect Taxonomy (DoT/HoT, Stacks, UI)
- **Subtype union added** â€” `StatusSubtype` (`poison | burn | bleed | regen | stun | shield | stat_buff | stat_debuff | generic`) with `StackPolicy` (`refresh | stack | unique`) for per-effect collision rules.
- **Centralized `applyStatusEffect` helper** â€” All status pushes (buff, debuff, taunt, dodge, cover shield, DoT, HoT) now route through a single helper that enforces stack policy and uses `(subtype, sourceSkillId)` as the refresh key. Zero raw `statusEffects.push` sites remain outside the helper.
- **Tick log enrichment** â€” `tickStatusEffects` now builds per-effect named fragments (e.g. `"Rogue takes 12 poison damage"`, `"Ally regenerates 8 HP (regen)"`) using a `SUBTYPE_DISPLAY_NAME` map for readable battle logs.
- **TickConfig subtype annotations** â€” `rogue_poison_blade`, `alchemist_healing_salve`, and `harbinger_curse` now declare explicit subtypes in their tickConfig entries; `resolveTickConfig` propagates these and defaults unconfigured DoTs to `poison` / HoTs to `regen`.
- **Module-load validator extended** â€” `validateTickConfigCoverage` now asserts subtype presence against DOT/HOT subtype sets and validates `stackPolicy` values on load.
- **StatusEffectBadges component added** â€” New pure presentational component at `src/screens/campaign/components/StatusEffectBadges.tsx` with per-subtype glyph (â˜ ðŸ”¥ðŸ©¸âœšâš¡ðŸ›¡â–²â–¼âœ¦) and color maps. Mounted in `BattleScreen.tsx` beneath each player and enemy sprite, showing `turnsRemaining` per effect.

### Dice Animation Crash Fix
- **`getSuccessTier` regression fixed** â€” `DiceAnimation.tsx` still imported the removed `getSuccessTier` function, throwing `TypeError: getSuccessTier is not a function` on any battle roll. Replaced with inline tier derivation using existing `roll.isCrit` and `roll.rollValue` fields; legacy `DiceRoll.tier` field preserved for replay compat.

### Files Changed
| File | Change |
|---|---|
| `src/services/gamification/CombatEngine.ts` | Added `applyStatusEffect` helper, `SUBTYPE_DISPLAY_NAME`, enriched tick fragments, routed all status pushes through helper |
| `src/services/gamification/CampaignTypes.ts` | Added `StatusSubtype` and `StackPolicy` unions; `subtype` field on `StatusEffect` |
| `src/services/gamification/CampaignDefinitions.ts` | Annotated tickConfigs with subtypes; extended `validateTickConfigCoverage` |
| `src/screens/campaign/components/StatusEffectBadges.tsx` | New badge component |
| `src/screens/campaign/BattleScreen.tsx` | Mounted badges under player and enemy sprites |
| `src/components/campaign/DiceAnimation.tsx` | Removed broken `getSuccessTier` import; inlined tier derivation |

---

## Campaign Persistence, Selection Hub & Combat Formula Rework (Apr 11-12, 2026)

Implemented campaign persistence fixes for beta testers, added a campaign selection hub flow, and reworked combat math to use predictable baseline damage with bounded dice variance and stronger crit identity.

### Campaign Persistence & Selection
- **Root cause fixed (Firestore rule mismatch)** â€” `getActiveSoloCampaign()` queried by `ownerUserId`, but rules only allowed reads via `memberUserIds`. Updated rules to allow owner reads as well, fixing "new solo campaign every app reopen" behavior.
- **Campaign selection intermediary screen** â€” Added `CampaignSelectScreen` as the new entry point from Companion, with Active/Past segmented filtering, active campaign badge, and quick switch behavior.
- **Single active solo campaign enforcement** â€” `MAX_ACTIVE_CAMPAIGNS` set to `1` for solo campaign flow.
- **Campaign state restore hardening** â€” Campaign context now restores from local cache first, verifies with Firestore, and supports explicit `switchCampaign`/`archiveCampaign`.
- **Listener resilience** â€” Added error handlers to campaign snapshot listeners to prevent uncaught permission-denied listener crashes.
- **Navigation + UX fixes** â€” Companion now routes to campaign selection first; empty hub state redirects to campaign selection; floating action button respects tab-bar-safe bottom positioning.
- **Indexes/rules deployment parity** â€” Added/deployed campaign and party indexes needed by new queries.

### Combat Formula Rework (D20 + Damage Dice + Crit Severity)
- **Damage model redesigned** â€” Replaced double-randomized d20 variance formula with a guaranteed base + damage dice system (d4/d6/d8/d10/d12 by rank) so strategy and stats dominate outcomes.
- **Crit system strengthened** â€” Crit now uses d12 severity tiers (`minor`, `major`, `devastating`, `perfect`) with stronger multipliers, preserving high-roll excitement.
- **Defense model updated** â€” Switched to a Pokemon-style defense ratio (`100 / (100 + 2*DEF)`) instead of flat subtraction for smoother scaling across low/high damage skills.
- **Healing updated** â€” Healing now includes a small dice bonus on top of guaranteed baseline.
- **DoT/HoT predictability improved** â€” Tick effects now compute and store per-effect `tickValue` at application time for consistent turn planning.
- **Battle logs/records extended** â€” Added crit severity metadata and expanded dice roll purposes (`damage_dice`, `crit_severity`) for replay/log fidelity.
- **Damage preview updated** â€” Preview now reflects the new min/avg/max model based on dice + crit baseline assumptions.

### Files Changed
| File | Change |
|---|---|
| `firestore.rules` | Campaign read rule updated to allow owner-based reads |
| `firestore.indexes.json` | Added campaign/party composite indexes for new query patterns |
| `src/services/gamification/CampaignTypes.ts` | Added campaign fields, single-campaign cap, and combat types (`DamageDie`, `CritSeverity`, `tickValue`, turn crit metadata) |
| `src/services/gamification/CampaignService.ts` | Added user campaign listing, last-played touch updates, campaign-name support |
| `src/contexts/CampaignContext.tsx` | Cache-first restore, campaign switching/archiving actions, snapshot error handlers |
| `src/screens/campaign/CampaignSelectScreen.tsx` | New selection hub screen with segmented filter and corrected FAB placement |
| `src/navigation/CompanionTabNavigator.tsx` | Registered campaign selection screen |
| `src/navigation/types.ts` | Added `CampaignSelectScreen` route typing |
| `src/screens/companion/CompanionScreen.tsx` | Campaign card now routes to campaign selection |
| `src/screens/campaign/CampaignHubScreen.tsx` | Empty state routes users to campaign selection |
| `src/services/gamification/CombatEngine.ts` | Reworked damage/heal/crit/tick formulas and preview logic |

---

## Class Switching, Class Rank XP & Battle Fixes (Apr 9, 2026)

Added the ability to switch classes mid-campaign with per-class rank persistence, introduced class rank XP progression, and fixed several battle system issues.

### Class Switching & Rank Progression
- **Switch Class action on Hub** â€” New "Switch Class" button on CampaignHubScreen avatar card. Navigates to ClassPickerScreen in `respec` mode.
- **ClassPickerScreen respec mode** â€” Reuses the existing class picker. Shows per-class rank badges on each card. Confirms via new `switchClass` context action instead of `createSoloCampaign`.
- **Per-class rank persistence** â€” New `classRanks` and `classRankXP` maps on `CampaignAvatar`. Switching classes preserves rank progress for every class played. Legacy avatars auto-migrated inside Firestore transactions.
- **`CampaignService.switchClass()`** â€” Firestore transaction: swaps class, resets stats to new class baseline, rebuilds loadout from new class's unlocked skills, refunds all universal stat points.
- **`CampaignService.awardClassRankXP()`** â€” Awards XP to the current primary class. Auto-ranks up (multi-level) when threshold met (rank Ã— 10 XP per level, cap rank 10).
- **`CampaignTypes` helpers** â€” `getClassRankXPThreshold(rank)`, `getAvatarClassRank(avatar, classId)` with legacy fallback.
- **Quest completion now awards class rank XP** â€” `completeQuest` in CampaignContext calls `awardClassRankXP` when `rewards.classRankXP > 0`.

### Bug Fixes
- **Queueing auto-advance called wrong function** â€” Manual mode `useEffect` called `executeBattleTurn()` instead of `advanceQueue()` during queueing phase. This caused the engine to pick an auto-action instead of just advancing CT to the next turn. Replaced with dedicated `advanceQueue()` (new context function wrapping `CombatEngine.advanceToNextTurn`).
- **BattleLog nested scroll conflict** â€” Replaced `FlatList` with `ScrollView` + `.map()` and added `nestedScrollEnabled` to fix scroll interception inside the battle screen's parent ScrollView.

### Hub UI Polish
- **Avatar card layout** â€” "Allocate Stats" and "Switch Class" buttons in a horizontal row. Class rank display now shows `/10` cap.

### Files Changed
| File | Change |
|---|---|
| `src/services/gamification/CampaignService.ts` | `switchClass()`, `awardClassRankXP()` transactions, legacy migration |
| `src/services/gamification/CampaignTypes.ts` | `classRanks`, `classRankXP` fields; `getClassRankXPThreshold`, `getAvatarClassRank` helpers |
| `src/contexts/CampaignContext.tsx` | `switchClass`, `advanceQueue` exposed; `completeQuest` awards class rank XP |
| `src/screens/campaign/BattleScreen.tsx` | Queueing auto-advance uses `advanceQueue()` instead of `executeBattleTurn()` |
| `src/screens/campaign/ClassPickerScreen.tsx` | Respec mode, rank badges, `switchClass` integration |
| `src/screens/campaign/CampaignHubScreen.tsx` | "Switch Class" button, horizontal card actions, rank `/10` display |
| `src/components/campaign/BattleLog.tsx` | FlatList â†’ ScrollView with `nestedScrollEnabled` |

---

## Campaign Battle UX, Progression Fixes & Endless Mode (Apr 8, 2026)

Beta tester feedback drove three bug fixes, a UX overhaul of the battle system, and a new endless arena mode.

### Bug Fixes
- **SkillBar not visible in manual mode** â€” After `beginBattle()` set phase to `queueing`, no effect advanced to `player_turn` in manual mode. Added a queueing auto-advance `useEffect` that calls `executeBattleTurn()` to transition immediately.
- **CT queue boxes too tall** â€” Reduced item width from 52px to 48px, sprites from 32x32 to 24x24, tightened padding, added `maxHeight: 72` on ScrollView.
- **Quest progression blocked** â€” All quests after #1 gated on `requiredBossesDefeated` (boss spawns require payments). Lowered requirements across all 8 quests and added `totalQuestsCompleted` as an alternative unlock condition.
- **Unknown skill crash** â€” `getSkillById` didn't include enemy attack skills. Added 10 enemy skill definitions (`ENEMY_SKILLS` array) and updated the lookup.
- **CampaignCompleteModal crash** â€” Fixed `BlurModal` import (default -> named export).
- **TypeScript errors** â€” Added type predicate to SkillBar filter for `SkillDefinition` narrowing; cast `BattleResult` to `'victory' | 'defeat'` in `onBattleComplete` event emission.

### Battle UX Overhaul
- **Toggleable auto-battle** â€” Replaced one-shot "Fast Forward" (which ran entire battle synchronously) with a toggle that steps one turn at a time at 500ms intervals. Player can switch between manual and auto mid-battle.
- **Dice animation slowed** â€” Default duration increased from 700ms to 1000ms. New `duration` prop on `DiceAnimation` scales all keyframe timings proportionally (auto-battle uses 400ms).
- **Battle summary overlay** â€” Victory/defeat screen now shows turn count, dice rolls, total damage/healing stats, and a scrollable battle log before navigating away.

### Endless Arena Mode
- New "Endless Arena" card on CampaignHubScreen â€” infinite waves of enemies with scaling difficulty.
- Wave scaling: enemy level = wave + 1, count increases at waves 5 and 10, every 5th wave is a mini-boss (2x HP, boss archetype).
- Player HP/mana carry over between waves; cooldowns and status effects reset.
- Rewards: 5 XP + 3 gold per normal wave, 25 XP + 15 gold per boss wave. Accumulated total shown between waves.
- "Collect & Leave" between waves or continue to next wave. On defeat, rewards from completed waves only.

### Files Changed
| File | Change |
|---|---|
| `src/screens/campaign/BattleScreen.tsx` | Auto-battle toggle, queueing auto-advance, battle summary, endless wave logic |
| `src/components/campaign/DiceAnimation.tsx` | Default 1000ms, `duration` prop with proportional scaling |
| `src/components/campaign/CTQueueDisplay.tsx` | Compact items, maxHeight constraint |
| `src/components/campaign/SkillBar.tsx` | Type predicate filter for SkillDefinition |
| `src/components/campaign/CampaignCompleteModal.tsx` | Fixed BlurModal import |
| `src/services/gamification/CampaignDefinitions.ts` | Enemy skills, lowered quest boss requirements |
| `src/services/gamification/CampaignTypes.ts` | `endlessWave`, `endlessRewards` on BattleState |
| `src/services/gamification/CampaignService.ts` | `totalQuestsCompleted` fallback in quest unlock |
| `src/contexts/CampaignContext.tsx` | `startEndlessBattle`, `advanceEndlessWave`, result type cast |
| `src/navigation/types.ts` | `endlessMode` param, endless reward params |
| `src/screens/campaign/CampaignHubScreen.tsx` | Endless Arena card |
| `src/screens/campaign/QuestBoardScreen.tsx` | Updated lock text |
| `src/screens/campaign/RewardResolutionScreen.tsx` | Endless rewards display + claiming |

---

## Campaign RPG System â€” Full Implementation (Apr 5, 2026)

Built the complete campaign RPG system: turn-based combat, class selection, quest board, boss encounters, stat allocation, and campaign archive. 15 new files, 6 modified.

### Phase A: Foundation (Services + Types)
- **`CampaignTypes.ts`** â€” Full type system: Campaign, CampaignAvatar, CampaignBoss, CampaignQuest, BattleState, QueueUnit, TurnRecord, DiceRoll, StatBlock, ArchiveEntry, 6 primary + 6 secondary class IDs
- **`CampaignDefinitions.ts`** â€” 6 primary classes (Warrior, Mage, Rogue, Cleric, Ranger, Monk) with stat biases, cost biases, 6 active skills each, 4 passives, 3 rank thresholds. 6 secondary classes (Berserker, Enchanter, Assassin, Paladin, Summoner, Bard) with 2 active + 2 passive. 36+ skill definitions with targeting, CT cost, mana cost, power, elements, status effects
- **`CampaignService.ts`** â€” Firestore CRUD for campaigns, avatars, bosses, quests, archive. Solo campaign creation, boss generation from expenses (archetype from category, level scaling, trait assignment), quest generation (main/side/bounty), fled rival queries, stat point allocation with `increment()`, archive entries
- **`CombatEngine.ts`** â€” CT queue (units start at `100 - SPD`, tick to 0, act, reset to ctCost). D20 attack rolls (crit on 18-20, damage variance d20/10). Skill execution with mana costs, cooldowns, targeting (single/all_enemies/all_allies/self). Shield absorption, status effects (burn/poison/regen/stun/haste/slow/atk_up/def_down), auto-battle AI, full battle runner
- **`CampaignContext.tsx`** â€” React context provider: campaign state, avatar, party, quests, boss management. `startBattle()`, `executeBattleTurn()`, `runAutoBattle()`, `completeQuest()`, `defeatBoss()`, `createSoloCampaign()`. Auto-loads active campaign on auth. Campaign completion detection

### Phase B: Battle Screen + Combat UI (6 components)
- **`BattleUnitSprite`** â€” Wraps SpriteAnimator for battle context with flip support (scaleX: -1 for enemies). Resolves companion character to SPRITE_REGISTRY asset
- **`CTQueueDisplay`** â€” Horizontal scroll of unit thumbnails sorted by CT. Mini sprites, HP bars, CT badges. Active unit highlighted
- **`SkillBar`** â€” Bottom skill button bar with mana cost badges, cooldown overlays. Grey out when insufficient mana
- **`DiceAnimation`** â€” D20 roll overlay using react-native-reanimated (withSequence/withTiming). Gold highlight for crits (18-20)
- **`BattleLog`** â€” FlatList of turn descriptions. Color-coded: player=blue, enemy=red, crit=gold, heal=green. Auto-scrolls
- **`BattleScreen`** â€” Full-screen immersive battle. ImageBackground, all 5 components composed. Per-unit animation states (idleâ†’atkâ†’idle, dyingâ†’dead, win). 1200ms turn step delay. Auto-battle fast forward. Victory/Defeat overlay. Tab bar hidden

### Phase C: Hub + Navigation + Roster (4 screens)
- **`CampaignHubScreen`** â€” Central dashboard: avatar card (sprite, class, level, XP bar), boss status card (HP bar, archetype, traits, "Challenge" button), fled rivals section, quest board link with badge, roster link, archive link. "Start Campaign" CTA when no active campaign
- **`ClassPickerScreen`** â€” Grid selection of 6 primary + 6 secondary classes. Stat bias and cost display. Create/respec modes
- **`StatAllocationScreen`** â€” 6 stats (STR/MNA/SPD/HP/DEF/LCK) with +/- buttons. 3 points per level. Delta preview. Confirm writes to Firestore
- **`RosterScreen`** â€” FlatList of party avatars with expandable stat blocks and equipped skills

### Phase D: Quest Board + Quest Flow (3 screens)
- **`QuestBoardScreen`** â€” AnimatedSegmentedControl tabs (Main/Side/Bounty). Quest cards with difficulty, status badges, rewards summary
- **`QuestPrepScreen`** â€” Pre-battle prep: encounters list, party lineup with sprites, rewards preview. "Begin Battle" starts combat. Tab bar hidden
- **`RewardResolutionScreen`** â€” Post-battle results. Victory: XP/gold/item rewards with claim. Defeat: retry/retreat options. Tab bar hidden

### Phase E: Boss Pipeline UI
- **`RivalBossCard`** â€” Card component for fled rival bosses with level, archetype, and "Challenge" button
- Boss status integrated into CampaignHubScreen and QuestPrepScreen

### Phase F: Archive + Polish
- **`CampaignArchiveScreen`** â€” Segmented tabs (All/Bosses/Quests/Milestones). FlatList of archive entries with title, description, date
- **`CampaignCompleteModal`** â€” BlurModal overlay for campaign completion. Stats summary, "Start New Campaign" / "View Archive" buttons

### Infrastructure Changes
- **`App.js`** â€” Wrapped Navigation in `<CampaignProvider>`
- **`types.ts`** â€” Added 9 campaign screen params to CompanionStackParamList
- **`CompanionTabNavigator.tsx`** â€” Registered all 9 campaign screens
- **`CompanionScreen.tsx`** â€” Added Campaign ActionCard
- **`appEvents.ts`** â€” Added campaign event types (BOSS_DEFEATED, QUEST_COMPLETED, CAMPAIGN_COMPLETED)

### Files Changed
| File | Change |
|---|---|
| `src/services/gamification/CampaignTypes.ts` | **NEW** â€” Campaign RPG type system |
| `src/services/gamification/CampaignDefinitions.ts` | **NEW** â€” Class, skill, and passive definitions |
| `src/services/gamification/CampaignService.ts` | **NEW** â€” Firestore campaign CRUD + generation |
| `src/services/gamification/CombatEngine.ts` | **NEW** â€” CT queue combat engine |
| `src/contexts/CampaignContext.tsx` | **NEW** â€” Campaign state provider |
| `src/components/campaign/BattleUnitSprite.tsx` | **NEW** â€” Battle sprite wrapper |
| `src/components/campaign/CTQueueDisplay.tsx` | **NEW** â€” Turn queue display |
| `src/components/campaign/SkillBar.tsx` | **NEW** â€” Skill button bar |
| `src/components/campaign/DiceAnimation.tsx` | **NEW** â€” D20 roll overlay |
| `src/components/campaign/BattleLog.tsx` | **NEW** â€” Turn log display |
| `src/components/campaign/RivalBossCard.tsx` | **NEW** â€” Rival boss card |
| `src/components/campaign/CampaignCompleteModal.tsx` | **NEW** â€” Completion modal |
| `src/screens/campaign/BattleScreen.tsx` | **NEW** â€” Full battle screen |
| `src/screens/campaign/CampaignHubScreen.tsx` | **NEW** â€” Campaign dashboard |
| `src/screens/campaign/ClassPickerScreen.tsx` | **NEW** â€” Class selection |
| `src/screens/campaign/StatAllocationScreen.tsx` | **NEW** â€” Stat allocation |
| `src/screens/campaign/RosterScreen.tsx` | **NEW** â€” Party roster |
| `src/screens/campaign/QuestBoardScreen.tsx` | **NEW** â€” Quest board |
| `src/screens/campaign/QuestPrepScreen.tsx` | **NEW** â€” Quest prep |
| `src/screens/campaign/RewardResolutionScreen.tsx` | **NEW** â€” Battle results |
| `src/screens/campaign/CampaignArchiveScreen.tsx` | **NEW** â€” Campaign archive |
| `App.js` | Added CampaignProvider |
| `src/navigation/types.ts` | Added 9 campaign screen params |
| `src/navigation/CompanionTabNavigator.tsx` | Registered 9 campaign screens |
| `src/screens/companion/CompanionScreen.tsx` | Added Campaign ActionCard |
| `src/utils/appEvents.ts` | Added campaign event types |

---

## Isometric Tile Map â€” Interaction Fixes & Architecture Refactor (Apr 3, 2026)

Fixed three tile-interaction bugs in the isometric town map and refactored the projection math into a single-source-of-truth module.

### Bug 1: Wrong tile highlighted when tapping near diamond edges
- **Root cause**: `screenToGrid` used `Math.floor` to snap fractional grid coordinates to integers, creating rectangular selection regions that don't align with the diamond-shaped tiles. Taps near the pointy tips of a diamond would snap to the wrong tile.
- **Fix**: Replaced `Math.floor` with `Math.round` in the inverse projection. This creates selection regions that closely approximate the diamond shape. Additionally added a 4-candidate diamond containment check (floor and floor+1 for both row/col) with taxicab-distance validation for geometrically exact selection at tile boundaries.

### Bug 2: Unresponsive taps on pannable/zoomable surface
- **Root cause**: Tap gesture had `maxDuration(300)` â€” users pressing deliberately on an interactive map easily exceeded 300ms. Pan gesture `minDistance(10)` also swallowed taps with slight finger drift.
- **Fix**: Increased tap `maxDuration` to 500ms; increased pan `minDistance` to 15px.

### Bug 3: Only left-side isometric tiles responded to taps
- **Root cause**: The `GestureDetector` was attached to the `Animated.View` that had scale/translate transforms applied. The map Canvas (640Ã—460px for an 8Ã—8 grid) is wider than the phone screen (~390px). When the animated transform scales the view down (~0.55Ã—), the platform's native hit-testing inverse-transforms tap coordinates back to the view's local space. Taps on the right portion of the screen mapped to local coordinates beyond the view's 390px bounds, so the platform rejected them before RNGH could process them. Skia renders correctly regardless (GPU-direct), which is why right-side tiles were visible but not tappable.
- **Fix**: Separated rendering from gesture detection into two layers:
  - **Render layer**: `Animated.View` with `pointerEvents="none"` â€” handles visual zoom/pan transforms, passes all touches through
  - **Gesture layer**: Plain `View` with `collapsable={false}` â€” static full-screen overlay with no transforms, receives touches across the entire screen
  - The hit-test worklet continues to use `e.absoluteX/Y` with the inverse transform math, which is correct since the gesture view occupies the full window with no transforms applied.

### Projection Refactor: `tileProjection.ts`
- **New file** `src/components/town/tileProjection.ts` â€” single source of truth for all isometric coordinate math: `gridToScreen`, `screenToGrid`, `isPointInDiamond`, `hitTestTile`, `computeMapDimensions`, `getInitialFitTransform`. All arithmetic functions tagged `'worklet'` for dual JS/UI thread use.
- **`isometricUtils.ts`** â€” stripped of all coordinate math and constants; now imports from `tileProjection.ts` and re-exports for backward compatibility. Retains `buildTileCells` and `buildRenderList` (asset-dependent).
- **`useMapGestures.ts`** â€” hit-test logic inlined in the tap worklet with hardcoded literal constants (`HW=40`, `HS=20`) to avoid Reanimated Babel plugin issues with derived cross-module constant capture. Uses diamond-accurate 4-candidate checking.
- **`IsometricTileMap.tsx`** â€” accepts `mapDims` prop (no longer computes internally), imports from `tileProjection.ts`.
- **`TownScreen.tsx`** â€” uses `buildTileCells` for both occupancy checks and rendering (eliminated redundant `buildTownGrid` call); replaced stale `Dimensions.get('window')` module-scope constants with dynamic `screenSize` state.

### Files Changed
| File | Change |
|---|---|
| `src/components/town/tileProjection.ts` | **NEW** â€” Centralized projection math module |
| `src/components/town/isometricUtils.ts` | Stripped to grid/render builders; re-exports from tileProjection |
| `src/components/town/useMapGestures.ts` | Inlined diamond hit-test; removed cross-module worklet import |
| `src/components/town/IsometricTileMap.tsx` | Accepts `mapDims` prop; imports from tileProjection |
| `src/screens/companion/TownScreen.tsx` | Two-layer render/gesture architecture; unified grid model |

---

## Town Building â€” Phase 2: Isometric Tile Map (Apr 3, 2026)

Replaced the icon-based flat grid with a full isometric tile map renderer using Skia Canvas and pixel art assets from `assets/miniatureworld/`. Added pan/zoom gestures and tap-to-place building placement.

### Isometric Renderer
- Skia Canvas renders 32Ã—32 pixel art tiles at 2.5Ã— scale (80Ã—80dp) in isometric projection
- Painter's algorithm: iterates rows back-to-front, columns left-to-right, rendering terrain â†’ decorations â†’ buildings per cell
- 31 assets preloaded via fixed-count `useImage()` hook (hooks-safe, same pattern as `useCharacterImages.ts`)
- Grass tile variety: alternates `Grass Block 1` / `Grass Block 2` based on `(row + col) % 3`

### Pan / Zoom / Tap Gestures
- **Pinch-to-zoom** toward focal point, clamped [0.3Ã—, 4.0Ã—]
- **Pan** to drag the map freely
- **Tap** an empty tile to select it for building placement (diamond highlight overlay)
- **Double-tap** to reset view to initial fit-to-screen
- Gesture composition: `Gesture.Simultaneous(Pinch, Simultaneous(Pan, Exclusive(DoubleTap, Tap)))`

### Tap-to-Place Building Placement
- Replaces auto-sequential placement â€” users now choose where to build
- Tap empty tile â†’ diamond highlight + "Tile selected" bar â†’ pick building from shop â†’ confirm â†’ building placed at chosen cell
- Shop buttons show "Select tile" prompt when no tile is selected
- `purchaseTownBuilding()` now accepts optional `targetGridIndex` parameter (backward-compatible)
- `buildTownGrid()` updated to use each building's `gridIndex` field instead of array position

### Asset Mapping (27 buildings â†’ pixel art sprites)
- **Buildings** â†’ House/Tower/Market sprites from `Without outline/Houses/`
- **Infrastructure** â†’ Terrain tiles (Dirt, Path, Rock) replace the grass tile
- **Fences/Decorations** â†’ Small sprites (Barrel, Well, Sign, Bush, Fence) centered on tile diamond
- **Companion Fixtures** â†’ Box, Stump, Wide House sprites

### Files
| File | Action |
|---|---|
| `src/components/town/tileMapTypes.ts` | **NEW** â€” TypeScript types: `TileCell`, `RenderItem`, `MapDimensions`, `TileAssetDef` |
| `src/components/town/tileAssetRegistry.ts` | **NEW** â€” 31-asset registry mapping building IDs/terrain to PNGs + `useTileMapImages()` preloader hook |
| `src/components/town/isometricUtils.ts` | **NEW** â€” `gridToScreen`, `screenToGrid`, `buildRenderList`, `hitTestTile`, `getInitialFitTransform`, `buildTileCells` |
| `src/components/town/IsometricTileMap.tsx` | **NEW** â€” Skia Canvas component: layered rendering, selection highlight, gesture integration |
| `src/components/town/useMapGestures.ts` | **NEW** â€” Pan/pinch/tap/double-tap gesture hook (gesture-handler + reanimated) |
| `src/services/gamification/TownService.ts` | `buildTownGrid()` uses `gridIndex` field; `purchaseTownBuilding()` accepts `targetGridIndex` |
| `src/contexts/GamificationContext.tsx` | `purchaseTownBuilding` wrapper passes `targetGridIndex` through |
| `src/screens/companion/TownScreen.tsx` | Full rewrite: isometric map + tap-to-place flow + selection state |

---

## Town Building â€” Phase 1 (Apr 2, 2026)

Implemented Town Building feature (COMPANIONS.md Â§3.10 Phase 1) â€” visual tile grid where users spend gold on buildings to grow their town. The retention loop: earn gold (expeditions, adventure map, quests) â†’ spend gold on buildings â†’ see town grow â†’ return to earn more.

### Town Grid
- Dark-themed (`#1a1a2e`) tile grid with auto-placement (left-to-right, top-to-bottom)
- Grid expands with tier progression: 4Ã—4 â†’ 6Ã—6 â†’ 8Ã—8 â†’ 10Ã—10 â†’ 12Ã—12
- MaterialCommunityIcons as placeholder building sprites (pixel art assets deferred)
- Empty cells show subtle grass icons; occupied cells show building icon in its theme color

### Tier Progression
| Tier | Name | Gold Threshold | Grid |
|------|------|----------------|------|
| 1 | Hamlet | 0g | 4Ã—4 (16 cells) |
| 2 | Village | 500g | 6Ã—6 (36 cells) |
| 3 | Township | 1500g | 8Ã—8 (64 cells) |
| 4 | Town | 3500g | 10Ã—10 (100 cells) |
| 5 | City | 7000g | 12Ã—12 (144 cells) |

Progress bar shows gold spent toward next tier with dynamic labels.

### Building Catalog (27 items across 5 categories)
- **Buildings** (7): Starter House, Bakery, Market, Blacksmith, Windmill, Inn, Chapel, Town Hall, Library
- **Infrastructure** (3): Dirt Road, Stone Path, Cobblestone Bridge
- **Fences** (5): Wooden Fence, Hedge Row, Stone Wall, Iron Gate
- **Decorations** (8): Flower Patch, Campfire, Barrel Stack, Signpost, Well, Lamp Post, Garden Bed, Fountain
- **Companion Fixtures** (3): Notice Board, Training Dummy, Companion Hut

Buildings are purchasable multiple times (core gold sink). Prices range from 5g (decorations) to 500g (Town Hall).

### Purchase Flow
- Category tabs via `AnimatedSegmentedControl` (Buildings, Roads, Fences, Decor, Fixtures)
- Item cards show icon, name, description, gold price, tier requirement
- `BlurModal` confirmation (matches ShopScreen pattern)
- Atomic Firestore `runTransaction`: deduct gold, append to `town.buildings`, write `goldLedger` entry
- Tier-locked buildings show lock badge; grid-full state shows "Full" badge

### CompanionScreen Integration
- Town action card subtitle now shows dynamic info: "Hamlet Â· 3 buildings" (or default text if empty)

### Files
| File | Action |
|---|---|
| `src/services/gamification/ExpeditionTypes.ts` | Added 6 new types (TownBuildingCategory, TownBuildingDefinition, PlacedBuilding, TownState, TownTier, TownPurchaseResult) |
| `src/services/gamification/TownService.ts` | **NEW** â€” Building definitions, tier definitions, `purchaseTownBuilding()`, `buildTownGrid()`, `getBuildingDef()` |
| `src/utils/appEvents.ts` | Added `TOWN_BUILDING_PURCHASED` event + interface |
| `src/contexts/GamificationContext.tsx` | Added town state derivation (`townState`, `townBuildings`, `townTotalGoldSpent`, `currentTownTier`) + `purchaseTownBuilding` callback |
| `src/screens/companion/TownScreen.tsx` | Full rewrite: placeholder â†’ grid + tier banner + building shop |
| `src/screens/companion/CompanionScreen.tsx` | Dynamic Town card subtitle |

---

## Adventure Map â€” Full-Screen Fix (Apr 2, 2026)

### AdventureMapScreen â€” Tab Bar Hidden for Immersive Layout

The Adventure Map screen was being obscured by the bottom tab bar (height 90dp, `position: absolute`) because it sits inside the `CompanionTabNavigator` NativeStack which is itself nested inside the bottom `Tab.Navigator`.

**Fix:** Added a `useFocusEffect` hook in `AdventureMapScreen.tsx` that calls `navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })` on focus to hide the tab bar, and restores it via the cleanup function on blur/back-navigation.

- No navigation restructuring required â€” fix is self-contained within the screen
- Tab bar is restored automatically when the user presses "Leave Adventure" or navigates back
- Consistent with the intended full-screen immersive experience of the idle battle loop

---

## Gamification System â€” Implemented (Feb 25â€“26, 2026)

Introduces a Duolingo-inspired engagement loop to reward users for financial responsibility actions (creating expenses, settling debts, maintaining activity streaks). All gamification calls are fire-and-forget â€” never blocking critical payment/expense flows.

### New Firestore Collections
- `userGameProfiles/{userId}` â€” XP, level, streak, lastActiveDate
- `userAchievements/{docId}` â€” earned badges per user
- `xpLedger/{docId}` â€” idempotency-safe XP award log (prevents double-awards)
- `achievementDefinitions/{achievementId}` â€” static badge definitions (auto-seeded on first boot)

### New Source Files
- `src/services/GamificationService.js` â€” `awardXP`, `checkAndAwardAchievements`, `updateStreak`, `getGroupLeaderboard`, `seedAchievementDefinitions`
- `src/contexts/GamificationContext.js` â€” real-time XP/streak/achievement subscriptions, `addXP` helper, auto-seed of achievement definitions
- `src/components/XPToast.js` â€” floating "+25 XP" toast after qualifying actions
- `src/components/AchievementUnlockModal.js` â€” full-screen celebration modal with 22-particle confetti (RN Animated)
- `src/components/StreakDisplay.js` â€” compact ðŸ”¥ streak counter for HomeScreen header
- `src/components/QuestProgressWidget.js` â€” collapsible XP milestone progress card for HomeScreen
- `src/components/GroupLeaderboardWidget.js` â€” group members ranked by payments settled count
- `src/screens/300_SettingsScreen/AchievementsScreen.js` â€” achievement gallery (locked/unlocked, 2-column grid)

### Modified Files
- `src/utils/appEvents.js` â€” added `GAMIFICATION_XP_AWARDED`, `GAMIFICATION_ACHIEVEMENT_UNLOCKED` events
- `App.js` â€” added `GamificationProvider` after `TransactionsProvider`
- `src/navigation/index.js` â€” registered `AchievementsScreen` in SettingsStack; mounted XPToast + AchievementModal as navigation-level overlays; added onboarding XP hook (+30 XP on currency onboarding complete/skip)
- `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js` â€” fires `addXP` after `createExpense` (+50 first, +10 subsequent)
- `src/screens/PaymentRecordingScreen.js` â€” fires `addXP` after payment lifecycle completes (+25 full, +10 partial)
- `src/screens/250_SettlementScreen/SettlementScreen.js` â€” fires `addXP` after CASH `approvePayment` (+25), `checkAndAwardAchievements` (settler, prompt_payer), `updateStreak`
- `src/screens/GroupCreationScreen.js` â€” fires `addXP` after first group created (+50)
- `src/screens/000_HomeScreen/HomeScreen.js` â€” added `StreakDisplay` in header row + `QuestProgressWidget` below hero
- `src/components/GroupStatsTab.js` â€” added `GroupLeaderboardWidget` as first section above settlement ring
- `src/screens/300_SettingsScreen/SettingsScreen.js` â€” enhanced profile card (level badge overlay, gamification stat row, mini XP progress bar) + new "Progress" section with Achievements navigation

### XP Award Table
| Action | XP | Reason Key |
|--------|-----|-----------|
| First expense ever | +50 | `expense_first` |
| Create expense | +10 | `expense_create` |
| Settle payment (full) | +25 | `settle_full` |
| Settle payment (partial) | +10 | `settle_partial` |
| Approve expense | +5 | `approve_expense` |
| Add group member | +5 | `add_member` |
| First group created | +50 | `create_group_first` |
| First multi-currency expense | +20 | `multicurrency_first` |
| Complete onboarding | +30 | `onboarding_complete` |
| 7-day active streak | +50 | `streak_7_day` |

### 9 Achievement Badges
`first_step`, `settler`, `group_founder`, `squad_goals`, `big_spender`, `on_a_roll` (7-day streak), `century_club` (100 XP), `globetrotter` (multi-currency), `prompt_payer` (pay within 24h)

---

# COMBATSYSTEM

# Integrated System Plan

## Co-op / Solo Expense RPG with AQ-inspired gear logic and CT raid-ready combat

This plan consolidates the current design into one coherent implementation target.

The system is built around five pillars:

1. **Finance-first ledger** â€” balances, settlements, and itemisation remain the source of truth.
2. **Fantasy-first presentation** â€” the app feels like a pixel-art RPG campaign.
3. **Campaign-local progression** â€” each solo campaign or group campaign is its own progression space.
4. **CT-based combat** â€” future-proof for single-boss raid encounters and later multi-player scaling.
5. **AQ-style gear identity** â€” gear matters, but skills remain the main tactical layer.

---

# 0) Documentation authority and conflict resolution

This document is the canonical source for combat and campaign development direction.

## Precedence

1. **COMBATSYSTEM.md** â€” authoritative for current design direction and implementation targets.
2. **CHANGELOG.md** â€” authoritative for what is currently shipped.
3. **EXPENSERPG.md** â€” roadmap context and planning support.

## Conflict protocol

If these documents clash:

1. Apply shipped truth from CHANGELOG to implementation assumptions.
2. Keep COMBATSYSTEM as the direction owner for next iterations.
3. If the clash changes development direction, stop and request explicit confirmation before coding.

## Status labels used in this document

* **SHIPPED** â€” implemented and validated against CHANGELOG.
* **PLANNED** â€” approved direction not yet implemented.
* **DEPRECATED** â€” superseded by newer shipped behavior.
* **NEEDS-CONFIRMATION** â€” unresolved conflict; do not implement until clarified.

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

That means the design cannot drift into a â€œfull RPG for its own sake.â€ Every game layer must support one of three outcomes:

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

* apply the gearâ€™s own multiplier in its fixed slot order.

## Fixed gear multiplier order

Use:

**base stat Ã— weapon bonus Ã— armour bonus Ã— accessory bonus Ã— passive**

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
hub â†’ choose â†’ prepare â†’ fight â†’ reward â†’ return.

---

# 19) Implementation phases

## Phase 1 â€” ledger and campaign foundation

Deliver:

* solo mode
* group mode
* expense entry
* split logic
* settlement confirmation
* campaign persistence

## Phase 2 â€” campaign hub and quest structure

Deliver:

* town hub
* quest board
* campaign dashboard
* quest detail

## Phase 3 â€” class and loadout system

Deliver:

* primary classes
* secondary classes
* ranks
* passives
* 5-skill loadout
* class-specific menu rendering

## Phase 4 â€” combat engine

Deliver:

* CT queue
* manual targeting
* D20 resolution
* cost system
* battle logs
* auto-battle rules

## Phase 5 â€” gear and item layer

Deliver:

* equipment slots
* flat bonuses
* multiplicative bonuses
* stat skew
* active item abilities
* CT reduction cap

## Phase 6 â€” boss/rival layer

Deliver:

* single-boss raid encounters
* rival boss learning
* reward stealing/recovery
* side quest fallback

## Phase 7 â€” polish and future-proofing

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

**base stat Ã— weapon bonus Ã— armour bonus Ã— accessory bonus Ã— passive**

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

---

# COMPANIONS

# CCPAY Gamification Expansion Proposal

## Context

Beta testers loved the existing gamification system (XP, achievements, cosmetics, streaks, leaderboards). Several requested a "cute digital pet or pixel knight that goes on RPG adventures with daily quests and expense-triggered quests." This proposal expands gamification in four tiers â€” from quick wins to the full companion RPG system â€” so the team can pick and choose what to implement.

The team has no game development experience, so every feature is designed to be implementable with the existing tech stack (React Native, Reanimated, Skia, Firestore) and includes concrete schemas, UI placement, and day estimates.

---

## Core Retention Loop

Understanding how features connect is critical before building any of them. Every successful gamification system has a tight daily loop that keeps users returning, surrounded by longer-horizon goals that keep them invested.

```
  DAILY (habit layer)                WEEKLY (progress layer)               LONG-TERM (identity layer)
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€              â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€                â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Open app       â”‚â”€â”€streak+1â”€â”€â–¶  â”‚  Weekly quest    â”‚â”€â”€completeâ”€â”€â–¶     â”‚  Level up            â”‚
  â”‚  Log expense    â”‚â”€â”€quest+1â”€â”€â”€â–¶  â”‚  board clears    â”‚                  â”‚  New companion stage â”‚
  â”‚  Settle debt    â”‚â”€â”€XP+goldâ”€â”€â”€â–¶  â”‚  Group leaderboard reset           â”‚  Town grows          â”‚
  â”‚  Send expeditionâ”‚â”€â”€away XPâ”€â”€â”€â–¶  â”‚  Seasonal progress                 â”‚  Adventure map regionâ”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â”‚  Cosmetics unlock    â”‚
                                                                           â”‚  Lore unlocks        â”‚
           â”‚                                                               â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Companion      â”‚
  â”‚  reacts, gains  â”‚
  â”‚  mood, returns  â”‚
  â”‚  from expeditionâ”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Inspiration sources used in this proposal:**
- **Duolingo** â€” Streak system, leagues, weekly quests, streak freeze
- **Habitica** â€” Party boss fights, mutual accountability, pet/item drops
- **PokÃ©mon GO** â€” Daily research + 7-stamp breakthrough, buddy system (walking companion)
- **Fortune City** â€” Expense logging builds a visible world (city/map)
- **AFK Arena / Idle Heroes** â€” Offline expedition returns with resources
- **Clash Royale** â€” Variable reward chests, appointment mechanics
- **Forest App** â€” Passive growing with visible accumulation
- **Long Game Savings** â€” Variable reward psychology driving boring-but-good behavior
- **Animal Crossing** â€” Slow, pressure-free town growth; decorations and buildings placed freely; no punishment for absence; cosy loop of earning â†’ spending â†’ visible world change
- **Stardew Valley** â€” Pixel art fantasy aesthetic; building upgrades feel meaningful; farm expansion as core motivation; seasonal variety
- **Pokopia** â€” Town building with pixel art tile grid; gold spent on structures and roads; progression visible as the town fills in

---

## Balancing Principles

1. **XP Inflation Control.** Current cap is Level 10 at 12,000 XP. At ~15 XP/day average, that's ~8-9 months. New XP sources should not more than double this rate (target: Level 10 in 4-6 months with new features).
2. **Dual Currency Design.** XP (progression, never spent) and Gold (spendable, earned from quests/expeditions, spent on town buildings and infrastructure). Separation prevents progression economy from being compromised. Gold's primary spend sink is the Town Building system â€” buying structures, roads, fences, and decorations that visibly grow the player's pixel art town.
3. **No Punishment, Only Missed Rewards.** Users never lose XP or gold. Worst case: streak resets (existing, unchanged), companion enters "sleepy" state that reverses instantly on next open.
4. **Variable Rewards > Predictable Rewards.** Where possible, introduce an element of pleasant surprise (loot drops, variable gold amounts, rare expedition finds). Unpredictable rewards are neurochemically more engaging than fixed ones.
5. **Appointment Mechanics.** Expedition timers, daily quest refreshes, and 7-day breakthrough rewards create natural "reasons to return" without nagging.
6. **Social Comparison Is Opt-In.** Leaderboards only within joined groups. No global rankings.

## Anti-Patterns to Avoid

- **No pay-to-win.** No real-money purchases for XP/levels/competitive advantage.
- **No FOMO anxiety.** No "You missed yesterday's quest!" in red. Daily quests simply roll over or get replaced.
- **No punishment.** Never subtract XP or gold. Never make companion visibly ill or angry with guilt-tripping copy.
- **No dark patterns.** No "Your streak will break in 2 hours!" notifications. Frame positively: "Keep your streak going!"
- **One-sentence rule.** If you can't explain a mechanic in one sentence, simplify it.

---

## Implementation Status

| Feature | Sprint | Status |
|---|---|---|
| 1.1 Streak Milestones | 1 | **Done** âœ… (7/14/30/60/100-day milestones with XP, gold, achievements, cosmetics) |
| 1.2 Streak Freeze | 5 | **Done** âœ… (purchasable for 15g, max 2, consumed on missed day, free at 7-day streak) |
| 1.3 Weekly XP Summary | Post-launch | Planned |
| 1.4 Achievement Progress | 2 | **Done** âœ… (progress bars for 8 achievements in AchievementsScreen) |
| 1.5 Level-Up Celebration Modal | 1 | **Done** âœ… (particle animation, per-level colors, cosmetic unlock display) |
| 1.6 Expanded XP Events | 1 | **Done** âœ… |
| 1.7 Randomised Motivational Messages | 1 | **Done** âœ… (20+ reason-specific message pools in XPToast) |
| 1.8 Comeback Bonus | 1 | **Done** âœ… (25 XP when returning after 5+ days away) |
| 2.1 Daily Quest System | 2 | **Done** |
| 2.5 Title / Flair System | 3 | **Done** |
| 4.2 Weekly Group Leaderboard | 3 | **Done** |
| 2.6 XP Multiplier Events | 3 | **Done** |
| **3.1 Companion Core** | **4** | **Done** âœ… |
| **3.1b Companion Tab + Hybrid Architecture** | **4b** | **Done** âœ… |
| **3.2 Idle Expedition System** | **5** | **Done** âœ… |
| **3.4 Gold Currency + Companion Shop** | **5** | **Done** âœ… |
| **3.10 Town Building (Phase 1)** | **7** | **Done** âœ… (icon-based, auto-placement) |

---

## TIER 1: Quick Wins (0.5â€“1.5 days each)

### 1.1 Streak Milestones with Tiered Rewards
Extend `updateStreak` in `GamificationService.ts` to award bonus XP at extended milestones. Currently only day 7 is rewarded.

| Milestone | Reward |
|---|---|
| 7 days | 50 XP + "On a Roll" achievement (existing) |
| 14 days | 75 XP |
| 30 days | 150 XP + "Flame Crown" border (new cosmetic) |
| 60 days | 300 XP |
| 100 days | 500 XP + "Eternal Flame" animated border (new cosmetic) |

**Schema:** Extend existing `updateStreak`, add to `ACHIEVEMENT_DEFINITIONS` and `COSMETIC_DEFINITIONS`.
**UI:** Existing XPToast + AchievementUnlockModal fire automatically. **~1 day.**

---

### 1.2 Streak Freeze
Purchase a "Streak Shield" with gold (15 gold each, max 2 equipped) that auto-activates on a missed day, preserving the streak.

**Standalone version (no gold):** Award 1 free streak freeze at day-7 milestone. Cap at 1. Remove gold requirement until gold system ships. **~0.5 days.**

---

### 1.3 Weekly XP Summary Card
On first Monday open, show a dismissible recap card: "Last week: +85 XP, 3 expenses, 2 settlements, 4-day best streak."

**Schema:** Read-only query on existing `xpLedger`. AsyncStorage flag `lastWeeklyRecapShown: ISO date string`.
**UI:** Dismissible card on HomeScreen below hero balance. **~1.5 days.**

---

### 1.4 Achievement Progress Indicators
Show progress bars on locked achievements in AchievementsScreen: "Big Spender: $72 / $100", "Squad Goals: 3/5 members", "On a Roll: 4/7 days."

**Schema:** None. Computed client-side from existing `userGameProfiles` fields.
**UI:** Add thin progress bar + "X/Y" subtitle to each locked badge. **~1 day.**

---

### 1.5 Level-Up Celebration Modal
Full-screen modal when user crosses a level threshold, previewing unlocked cosmetics and companion evolution stage.

**Schema:** None. Client-side state: `pendingLevelUp: { newLevel, unlockedCosmetics[] }` in GamificationContext.
**UI:** New `LevelUpModal.tsx` mounted alongside XPToast/AchievementUnlockModal. **~1.5 days.**

---

### 1.6 Expanded XP Events âœ… DONE
6 new XP awards for unrewarded desirable behaviors: `expense_with_photo` (5 XP), `first_group_settle` (50 XP), `invite_friend` (10 XP), `approve_expense_fast` (8 XP).

---

### 1.7 Randomised Motivational Messages
XPToast appends context-specific random praise: "+10 XP â€” Nice split!". ~8 messages per reason category. **~0.5 days.**

---

### 1.8 Comeback Bonus
If user hasn't opened the app for 5+ days, on next open: "+25 XP â€” Welcome back!" Companion enters excited animation state. **~0.5 days.**

---

## TIER 2: Medium Features (2â€“5 days each)

### 2.1 Daily Quest System âœ… DONE
Three daily quests refresh at midnight local time, selected deterministically per user per day. One easy (5 XP), one medium (10 XP), one hard (15 XP). All three complete = 20 XP bonus.

**Implementation:** `dailyQuestProgress/{date}_{userId}` Firestore collection. `DailyQuestsCard` component on HomeScreen. Quest progress via `APP_EVENTS` listeners.

---

### 2.2 Variable Loot Drops from Quests & Expenses
Small chance of material item drops on quest completion or expense logging. Materials used to craft companion accessories (see 3.4).

---

### 2.3 Seasonal Challenges / Monthly Themes
Month-long challenge with a progress bar and exclusive cosmetic reward.

---

### 2.4 Group Challenges
Group-wide collaborative goal with shared progress bar. All members rewarded on completion.

---

### 2.5 Title / Flair System âœ… DONE
Unlockable text titles displayed under username. 9 titles with level-gated, achievement-gated, and stat-gated unlock conditions.

**Implementation:** `TITLE_DEFINITIONS` in GamificationService, `equippedTitle` field on `userGameProfiles`, title section in CosmeticGalleryScreen.

---

### 2.6 XP Multiplier Events âœ… DONE
"Double XP Weekend!" â€” configurable multiplier via `gameConfig/xpMultiplier` Firestore doc. `XPMultiplierBanner` on HomeScreen with countdown timer. Applied inside `awardXP()` with 5-minute client-side cache.

---

## TIER 3: Digital Companion System

### Design Philosophy
The companion is **NOT a Tamagotchi**. It does NOT die, starve, or guilt-trip. It is a cheerful pixel character that:
- Has a **persistent presence on HomeScreen** via a compact animated widget (always visible, "living app" feel)
- Has its own **dedicated Companion tab** for full interaction, mood changes, and future features
- Goes on timed **expeditions** while the user is away (the core idle RPG loop)
- Returns from expeditions with gold and materials
- Participates in group party quests alongside other users' companions

**A reward for using the app, never a burden. A friend, not a dependency.**

The original vision is for companions to add interactiveness to what would otherwise be a pure expense calculation app. The Markov chain animation system on the HomeScreen widget is the primary engagement hook â€” dynamic, non-repetitive, and fun to watch.

---

### 3.1 Companion Core: The Character â€” DONE âœ…

#### Commissioned Sprite Assets

23 pixel art characters have been commissioned and delivered in `assets/sprites/`. Each character has 10-15 animation types as horizontal PNG strip sprite sheets with JSON metadata.

**Characters:**
| Character | Source Inspiration | Notes |
|---|---|---|
| AceWild | Ace (Type-0) | |
| EdwardFMA | Edward Elric (FMA) | |
| KingMont | Mont (WotV) | Default companion |
| Lenneth | Lenneth (Valkyrie Profile) | |
| LightningOdin | Lightning on Odin (FF13) | Large sprite, mounted |
| LightningX1 | Lightning (FF13) | |
| LightningX2 | Lightning (FF13-2) | |
| LightningX3 | Lightning (LR:FF13) | Complex anims |
| Nier2B | 2B (NieR:Automata) | |
| Nier9S | 9S (NieR:Automata) | |
| NierA2 | A2 (NieR:Automata) | |
| Olberic | Olberic (Octopath) | |
| Primrose | Primrose (Octopath) | |
| RainDemon | Rain demon form (FFBE) | |
| RainKing | Rain king form (FFBE) | |
| RainNormal | Rain normal (FFBE) | |
| RoyNV | Roy Mustang (FMA) | |
| Serah | Serah (FF13-2) | |
| Therion | Therion (Octopath) | |
| Tilith | Tilith (Brave Frontier) | |
| Tressa | Tressa (Octopath) | |
| WOL | Warrior of Light (FF) | |
| Yshtola | Y'shtola (FF14) | |

#### Sprite Asset Format

Each sprite subfolder contains triplets per animation: `{unitId}-{animName}.png` + `{unitId}-{animName}.json` + `{unitId}-{animName}-anim.gif` (preview only).

**JSON metadata:**
```json
{
  "unitId": 339000607,
  "animName": "idle",
  "frameDelays": [12, 12, 12, 12],
  "frameRect": { "x": 944, "y": 939, "width": 120, "height": 78 },
  "imageWidth": 480,
  "imageHeight": 78
}
```

- **Frame count** = `frameDelays.length` = `imageWidth / frameRect.width`
- **PNG layout:** Horizontal strip, frames left-to-right, all same size per animation
- **frameDelays:** Variable per-frame, in 1/60s ticks (e.g. 12 ticks = 200ms)
- **frameRect.x/y:** Original game anchor position â€” unused for rendering
- **Frame sizes vary** between characters AND between animations of the same character

#### Widget Animation Set (11 animations used)

| Animation | All 23? | Used For |
|---|---|---|
| `idle` | Yes | Default state, Markov chain idle hold |
| `standby` | Yes | Battle stance, transition state in multiple moods |
| `win` | Yes | Excited celebration loop |
| `win_before` | Yes | Pre-celebration windup (excited mood entry) |
| `move` | Yes | Adventuring walk cycle |
| `atk` | Yes | Adventuring attack (common) |
| `magic_atk` | Yes | Magic attack variant |
| `limit_atk` | Yes | Adventuring rare attack â€” large, flashy |
| `magic_standby` | Yes | Idle mood transition variant |
| `dying` | Yes | Sleepy transition + micro-stir in dead state |
| `dead` | Yes | Sleepy hold state (with Zzz overlay) |

**Excluded:** `jump` (static, single frame), `atk1`, `super_limit_atk_before`, `brave_shift`, `limit_move` (not universal)

#### Mood System (4 moods) â€” Markov Chain Driven

Each mood defines a configurable **Markov chain** of animation states with weighted probabilistic transitions, hold durations, and loop counts. This replaces the earlier linear sequence approach, making animations feel dynamic and non-repetitive. Designers tune probabilities and durations in `companionMarkov.ts` without touching component logic.

| Mood | Entry State | Markov States | Trigger |
|---|---|---|---|
| **idle** | `idle` | idle(50%)â†’idle/standby(30%)/magic_standby(20%). Standby and magic_standby always return to idle. | Default â€” user is active |
| **excited** | `win_before` | win_beforeâ†’win(100%). winâ†’win(40%)/idle(60%). idleâ†’win_before(40%)/standby(30%)/magic_standby(30%). Idle never goes directly to win â€” always through win_before. | XP earned, achievement, level-up |
| **sleepy** | `idle` | idleâ†’dying(100%). dyingâ†’dead(100%). deadâ†’dead(90%)/dying_micro(10%). dying_microâ†’dead. + "Zzz" overlay on dead/dying. | 3+ days since last activity |
| **adventuring** | `idle_start` | idle_startâ†’atk(50%)/move(30%)/standby(20%). idleâ†’atk(40%)/limit_atk(10%)/standby(25%)/move(25%). Attack states return to idle. | Expedition active / manual |

**Auto-drift:** Moods periodically shift for variety. Each mood has configurable drift settings:
- **idle:** Every 90s, 30% chance â†’ excited(40%) or adventuring(60%), burst of 2 transitions then return
- **excited:** Every 120s, 20% chance â†’ idle(70%) or adventuring(30%), burst of 1
- **adventuring:** Every 90s, 25% chance â†’ idle(50%) or excited(50%), burst of 2
- **sleepy:** No drift (stays locked)

**State types:**
- **Loop-based:** Play N full animation cycles before transitioning (e.g. `win: loops: 3`)
- **Time-based:** Hold for N seconds before transitioning (e.g. `idle: holdSeconds: 10`)

#### HomeScreen Widget Container (Compact â€” Sprint 4b)

- **Position:** Below greeting text, above hero balance card
- **Width:** Matches hero card width (full width minus screen padding)
- **Height:** 100dp sprite container
- **Background:** Semi-transparent card (placeholder â€” will be replaced with commissioned backgrounds and enemy sprites in future sprints)
- **Overflow:** Hidden â€” sprite animations that exceed the container bounds are clipped
- **Animation:** Full Markov chain with drift (key engagement/interactivity point)
- **Mood display:** Read-only mood pill/chip (e.g. "âš”ï¸ Adventure") â€” not interactive
- **Tap action:** Navigates to Companion tab (full interaction hub)
- **Performance:** Pauses SpriteAnimator and Markov timers when Home tab is not focused (`useIsFocused()`)

#### Speech Bubble System

The companion displays contextual speech bubbles with messages and mood emojis:
- **Idle:** Tips, greetings ("Hey! ðŸ‘‹", "Log an expense? ðŸ“")
- **Excited:** Celebration ("Woohoo! ðŸŽ‰", "+XP! âš¡")
- **Sleepy:** "ðŸ’¤", "Zzz...", "I missed you..."
- **Adventuring:** "Take that! âš”ï¸", "On my way! ðŸƒ"

Bubbles appear periodically (~15-30s on idle) or immediately on mood change. Fade in/out animation.

#### Character Unlock System

Characters are unlocked through level progression and achievements:
- **~8 characters free** from start (simpler, smaller sprites)
- **Higher-level unlocks:** Characters with more complex/flashy attack animations require higher levels
- **Achievement unlocks:** Some characters tied to specific achievements
- **Beta testers:** All 23 characters unlocked (override flag in profile)
- Locked characters shown greyed out with requirement on selection screen

#### Rendering Architecture

**Skia Canvas + useImage + Group clip** â€” leverages existing `@shopify/react-native-skia` v2.0.0-next.4 infrastructure already used for shader effects (SkiaSplashScreen, LiquidSilkGradient, etc.)

**Animation driver:** Reanimated `useFrameCallback` (UI thread, ~60fps) with tick accumulator respecting per-frame `frameDelays`.

**Sprite frame selection:**
```
currentFrame shared value â†’ useDerivedValue â†’ imageXOffset = -frame * frameWidth
<Canvas> â†’ <Group clip={frameRect} transform={[{translateX: offsetX}, {translateY: offsetY}]}> â†’ <Image x={imageXOffset} />
```

**No scaling** â€” sprites render at native pixel resolution. Anchoring keeps feet planted.

#### Anchor Point System

Sprites are anchored to **80% of container width, bottom edge** â€” a fixed point in the container that the sprite's foot position aligns to. Each animation has per-frame anchor offsets (`fromRight`, `fromBottom` in `SpriteAnimMeta`) that compensate for varying frame sizes across animations, preventing "jumping" during transitions.

```
anchorX = displayWidth Ã— 0.8
offsetX = anchorX - frameWidth + fromRight
offsetY = displayHeight - frameHeight + fromBottom
```

Anchor data is defined per-animation in `spriteRegistry.ts`. Characters without explicit anchors default to `(0, 0)`.

#### Image Preloading

`useCharacterImages(characterId)` preloads all 11 animation PNGs for the active character upfront using fixed `useImage()` calls (hooks-safe â€” always 11 calls regardless of which animations exist). Returns `Partial<Record<SpriteAnimName, SkImage>>`. Eliminates the 1-2 frame flicker that occurred when `useImage` loaded a new PNG during animation transitions.

#### Schema

```javascript
// Addition to userGameProfiles/{uid}:
companionCharacter: string | null,  // CharacterId, e.g. 'KingMont'
```

#### File Structure

```
src/components/companion/
  types.ts                       â€” TypeScript types (CharacterId, SpriteAnimName, CompanionMood, SpriteAnimMeta, etc.)
  spriteRegistry.ts              â€” Auto-generated static require() map + inlined JSON metadata + anchor points
  SpriteAnimator.tsx             â€” Skia sprite sheet renderer (useFrameCallback, configurable loops, anchor system)
  CompanionWidget.tsx            â€” Full Markov chain state machine + speech bubble + mood picker (used on CompanionScreen)
  CompanionWidgetCompact.tsx     â€” Compact HomeScreen widget (Markov chain + mood pill, no speech/mood picker) [Sprint 4b]
  CompanionSpeechBubble.tsx      â€” Speech bubble with mood-contextual messages + emojis
  companionMarkov.ts             â€” Markov chain config: states, transitions, probabilities, durations, drift per mood
  useCompanionState.ts           â€” Hook deriving mood from GamificationContext (priority: manual > excited > sleepy > idle)
  useCharacterImages.ts          â€” Preloads all 11 animation PNGs per character (flicker-free transitions)
  companionUnlocks.ts            â€” Unlock tier definitions (level/achievement gates, beta tester override)
src/screens/companion/
  CompanionScreen.tsx            â€” Full companion interaction hub (large sprite, mood picker, action cards) [Sprint 4b]
src/screens/settings/
  CompanionSelectScreen.tsx      â€” 3-column character grid browser with mood preview and unlock states
src/navigation/
  CompanionTabNavigator.tsx      â€” Stack navigator for Companion bottom tab [Sprint 4b]
scripts/
  generateSpriteRegistry.js      â€” Node script scanning assets/sprites/companions/ to generate spriteRegistry.ts
```

**Sprint 4 (3.1): ~5â€“7 days.** Done âœ…
**Sprint 4b (3.1b): ~2â€“3 days.** Done âœ… â€” Compact widget + CompanionScreen + Companion tab

---

### 3.1b Companion Tab + Hybrid Architecture â€” DONE âœ…

#### Problem

Beta testers noted the companion widget feels "odd" sitting above the hero balance card, and future features (expeditions, adventure map, shop, boss fights) need far more screen real estate than a HomeScreen widget can provide.

#### Decision: Hybrid Architecture

Keep a **compact widget on HomeScreen** (always visible, "living app" feel) + add a **dedicated Companion bottom tab** for full interaction. This mirrors patterns from Duolingo (Duo appears everywhere, Adventures is separate), Pokemon GO (buddy on map, tap for buddy screen), and Habitica (pet in avatar, tap for management).

```
HomeScreen                          CompanionTab (6th bottom tab)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Hi, User            â”‚             â”‚ CompanionScreen      â”‚
â”‚ â”Œâ”€ Compact Widget â”€â” â”‚  tap â”€â”€â–º   â”‚   Large sprite       â”‚
â”‚ â”‚ [Markov anims]   â”‚ â”‚             â”‚   Speech bubble      â”‚
â”‚ â”‚   âš”ï¸ Adventure   â”‚ â”‚             â”‚   Mood picker        â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚             â”‚   Action cards       â”‚
â”‚ â”Œâ”€ Hero Balance â”€â”€â”€â” â”‚             â”‚   (Choose, Expd...)  â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Compact Widget (HomeScreen)

- 100dp sprite container with full Markov chain + drift (key interactivity)
- Read-only mood pill (e.g. "âš”ï¸ Adventure") â€” mood changes only on CompanionScreen
- No speech bubble or mood picker (moved to CompanionScreen)
- Pauses animation when Home tab not focused (performance)
- Tap â†’ navigates to Companion tab

#### CompanionScreen (Companion Tab Hub)

Full interaction screen â€” the home for all future companion features:
1. Large sprite display (~200dp) with full Markov animation + speech bubble
2. Mood picker (AnimatedSegmentedControl: Idle, Excited, Sleepy, Adventure)
3. Action cards:
   - "Choose Companion" â€” navigates to CompanionSelectScreen
   - "Send on Expedition" â€” Coming Soon (Sprint 7)
   - "Adventure Map" â€” Coming Soon (Sprint 9)
   - "Companion Shop" â€” Coming Soon (Sprint 6)

#### Navigation Changes

- **6 bottom tabs:** Home | Contacts | Groups | SettleUp | Companion | Settings
- Companion tab icon: `gamepad-variant` (MaterialCommunityIcons)
- Badge infrastructure on Companion tab (ready for expedition returns, unlocks)
- Settings â†’ "My Companion" redirects to Companion tab (not CompanionSelectScreen)
- CompanionSelectScreen back-navigation fixed for CompanionTab context

**~2â€“3 days.**

---

### 3.2 Idle Expedition System â€” DONE âœ…

When the user is away from the app, their companion can be sent on a timed expedition that returns with gold and XP. Companion's widget changes to "Adventuring" mood with move/attack animation cycles. Materials/crafting deferred â€” expeditions reward gold + XP only.

**Expedition Types:**
| Name | Duration | Gold range | XP | Unlock |
|---|---|---|---|---|
| Quick Errand | 30 min | 2â€“5 gold | 5 XP | Level 1 |
| Village Patrol | 2 hours | 8â€“15 gold | 10 XP | Level 1 |
| Forest Hunt | 6 hours | 20â€“35 gold | 15 XP | Level 3 |
| Mountain Climb | 12 hours | 40â€“65 gold | 20 XP | Level 5 |
| Dragon's Lair | 24 hours | 80â€“140 gold | 30 XP | Level 7 |

**Schema:**
```javascript
// On userGameProfiles/{uid}:
expedition: {
  active: bool,
  expeditionType: string,    // 'quick_errand' | 'village_patrol' | 'forest_hunt' | 'mountain_climb' | 'dragon_lair'
  startedAt: Timestamp,      // serverTimestamp() â€” anti-cheat
  returnsAt: Timestamp,      // startedAt + duration â€” anti-cheat
  resolved: bool             // true after loot collected (idempotency guard)
}
```

**UI:** ExpeditionScreen (3 states: selection list, countdown timer, loot collect). ExpeditionLootModal with coin burst animation. Badge ("!") on Companion tab icon when expedition returns. CompanionScreen action card shows dynamic subtitle (remaining time / returned). Commit-only (no cancel).

**Anti-cheat:** `startedAt`/`returnsAt` use `serverTimestamp()`. `resolveExpedition()` checks `resolved: true` inside `runTransaction`. Gold ledger idempotency guard prevents double-collect.

**Files:** `src/screens/companion/ExpeditionScreen.tsx`, `src/components/ExpeditionLootModal.tsx`, `src/services/ExpeditionService.ts`

---

### 3.3 Quest System with Companion Narrative (~5 days)

Re-skins the Daily Quest System (2.1) with companion dialogue and narrative. Same mechanics, richer presentation.

**Depends on:** Daily Quest System (2.1) âœ…, Companion Core (3.1).

---

### 3.4 Gold Currency + Companion Shop â€” DONE âœ…

Secondary currency ("Gold") earned from expeditions, daily quest bonus, and streak milestones. The current shipped implementation provides a companion gear shop as a mechanics placeholder. The long-term gold spend sink is the **Town Building system (see 3.10)** â€” structures, roads, fences, and decorations that visibly grow a pixel art town. The companion gear shop may be retained as a secondary spend category or folded into the town system.

**Gold Earning Sources:**
| Trigger | Gold Amount |
|---|---|
| Expedition loot | Variable (see 3.2 table) |
| Daily quest all-complete bonus | +10 gold |
| 7-day streak | +15 gold |
| 14-day streak | +25 gold |
| 30-day streak | +50 gold |
| 60-day streak | +100 gold |
| 100-day streak | +200 gold |

**Current Shop Items (placeholder â€” will evolve into Town Building):**
| Item | Category | Price | Level |
|---|---|---|---|
| Knight Helm | Hats | 50g | 1 |
| Wizard Hat | Hats | 80g | 3 |
| Royal Crown | Hats | 200g | 5 |
| Red Cape | Capes | 60g | 1 |
| Shadow Cloak | Capes | 120g | 4 |
| Iron Sword | Weapons | 75g | 2 |
| Crystal Staff | Weapons | 150g | 5 |
| Sparkle Trail | Effects | 100g | 3 |
| Fire Aura | Effects | 250g | 7 |

**Schema additions to `userGameProfiles/{uid}`:**
```javascript
gold: number,                    // default 0
ownedShopItems: string[],        // array of purchased item IDs

// New collection:
// goldLedger/{autoId} â€” mirrors xpLedger pattern for audit/idempotency
```

**UI:** ShopScreen with AnimatedSegmentedControl category tabs, BlurModal purchase confirmation. GoldDisplay on CompanionScreen + ExpeditionScreen headers. GoldToast notification.

**Anti-cheat:** `deductGold()` checks balance inside `runTransaction`. `goldLedger` query (userId + referenceId + reason) prevents duplicate awards.

**Files:** `src/screens/companion/ShopScreen.tsx`, `src/components/GoldToast.tsx`, `src/components/GoldDisplay.tsx`, `src/services/ExpeditionService.ts`, `src/services/ExpeditionTypes.ts`

---

### 3.5 Companion Mood System âœ… Included in 3.1

Client-side computed mood state â€” merged into the Companion Core (3.1) implementation. Four moods: idle, excited, sleepy, adventuring. Derived from GamificationContext state.

---

### 3.6 Group Campfire (~3 days)

In group views, all members' companions appear together around a pixel campfire.

---

### 3.7 Companion Evolution (~3 days)

Companion visually evolves at level milestones. Future sprint â€” requires additional sprite stages to be commissioned.

---

### 3.8 Adventure Map: World Progression (~8â€“10 days)

Scrollable pixel-art world map with 10 regions (one per level). Requires separate art commission.

---

### 3.9 Group Party Boss Fight (~5 days)

Group takes on a shared challenge-boss together. Cooperative mechanic with shared HP bar.

---

### 3.10 Pixel Art Town Building (~10â€“14 days) â€” Phase 1 DONE âœ…

> **Beta tester feedback:** "It might be better to have a town building game where the gold is spent on buildings, fences, roads, etc."
> Inspired by Animal Crossing, Stardew Valley, Pokopia, Fortune City.

#### Phase 1 Implementation Notes (Apr 2, 2026)

**What shipped:** Visual tile grid with auto-placement, 27 buildings across 5 categories, all 5 town tiers (Hamlet â†’ City), MaterialCommunityIcons as building sprites, BlurModal purchase flow, Firestore transaction-backed purchases, tier progress banner.

**What's deferred to Phase 2:**
- Pixel art building assets (requires art commission)
- Free placement / drag-to-place (currently auto-placement: left-to-right, top-to-bottom)
- Companion wander animation in town
- Tier-up cutscene animation
- Building details on long-press

**Key files:** `TownService.ts` (definitions + purchase), `TownScreen.tsx` (UI), `GamificationContext.tsx` (state).

#### Concept

Gold is the primary input. The town is the primary output. Every gold coin spent makes the town visibly larger or more detailed â€” the town is a living record of the user's financial activity turned into something tangible and beautiful.

The town uses a **pixel art fantasy aesthetic**: cobblestone paths, thatched roofs, lantern posts, oak fences, market stalls. Companions wander or stand in the town when not on expedition.

#### Town Screen

A new full-screen scrollable tile grid displayed on the Companion tab (or as a dedicated tab). The grid starts nearly empty â€” a patch of grass with one small house (the companion's dwelling). As the user spends gold, structures appear, paths connect buildings, and the town fills in.

```
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â”‚  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  [Bakery]  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â”‚  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿â•â•â•â•â•â•ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿[Fountain]ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â”‚  ðŸŒ¿ðŸŒ¿[House]â•â•â•â•â•â•[Market]â•â•â•â•â•â•[Inn]ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â”‚  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿â•â•â•â•â•â•ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â”‚  ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿ðŸŒ¿  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Building Categories

| Category | Examples | Price Range | Effect |
|---|---|---|---|
| **Buildings** | Bakery, Blacksmith, Windmill, Inn, Market, Town Hall, Library, Chapel | 50â€“500g | Visual landmark; higher-tier buildings unlock when level gate met |
| **Infrastructure** | Stone Path, Dirt Road, Cobblestone Bridge, Garden Bed | 10â€“80g | Connect buildings; make the town feel lived-in |
| **Fences & Borders** | Wooden Fence, Stone Wall, Iron Gate, Hedge Row | 15â€“60g | Define zones; purely decorative |
| **Decorations** | Lamp Post, Well, Flower Patch, Barrel Stack, Signpost, Campfire | 5â€“40g | Fill empty tiles; cheapest category â€” good for early spend |
| **Companion Fixtures** | Companion Hut upgrade (Lv2 / Lv3), Notice Board, Training Dummy | 100â€“300g | Tied to companion narrative; Notice Board surfaces daily quests in-world |

#### Town Progression Model

Towns grow across **5 tiers** as more gold is spent:

| Tier | Total gold spent | Town size | Unlocks |
|---|---|---|---|
| 1 â€” Hamlet | 0g | 4Ã—4 tiles | Starter house, dirt road, fence, flower patches |
| 2 â€” Village | 500g | 6Ã—6 tiles | Bakery, stone path, well, lamp posts |
| 3 â€” Township | 1500g | 8Ã—8 tiles | Market, blacksmith, cobblestone, windmill |
| 4 â€” Town | 3500g | 10Ã—10 tiles | Inn, chapel, iron gate, fountain |
| 5 â€” City | 7000g | 12Ã—12 tiles | Town Hall, library, grand bridge, animated flags |

Each tier unlock triggers an animated "town expands" cutscene (brief, skippable).

#### Design Rules (Anti-Pattern Compliance)

- **No decay.** Buildings never crumble or disappear. Gold spent is permanent.
- **No FOMO.** No time-limited buildings (or if seasonal, clearly flagged as cosmetic-only).
- **No pay-to-win.** Buildings are cosmetic or provide minor QoL (e.g., Notice Board surfaces quests in-world). No buildings that give XP multipliers or expedition bonuses that non-builders can't get.
- **Free placement.** Player drags buildings onto any unlocked tile â€” no forced layout. Animal Crossing / Stardew philosophy.
- **Companions wander.** When the companion is not on expedition, its sprite can be seen walking around the town (uses existing `move` animation from the Markov system). This makes the town feel alive.

#### Schema

```javascript
// Addition to userGameProfiles/{uid}:
town: {
  tier: number,                       // 1â€“5, derived from totalGoldSpent
  totalGoldSpent: number,             // cumulative for tier calculation
  placedBuildings: [                  // ordered list of placed structures
    {
      buildingId: string,             // e.g. 'bakery', 'stone_path_h'
      tileX: number,
      tileY: number,
      placedAt: Timestamp,
    }
  ]
}

// Static definitions (client-side or gameConfig Firestore doc):
BUILDING_DEFINITIONS: {
  id: string,
  name: string,
  category: 'building' | 'infrastructure' | 'fence' | 'decoration' | 'companion_fixture',
  price: number,
  levelRequired: number,
  tierRequired: number,              // town tier gate
  tileWidth: number,
  tileHeight: number,
  spriteAsset: string,               // path to pixel art tile asset
}
```

#### Rendering

- **Tile grid:** React Native `FlatList` or `ScrollView` with absolute-positioned tiles. No Skia required for static town view.
- **Tile assets:** Commissioned pixel art sprites (16Ã—16 or 32Ã—32 base tile). Same fantasy palette as companion sprites.
- **Companion wander:** Reuses `CompanionWidgetCompact` Markov system inside the town view, constrained to path tiles.
- **Placement UI:** Tap an empty tile â†’ bottom sheet of affordable buildings â†’ drag to confirm. Highlight valid tiles green.

#### Dependencies

- Gold currency system (3.4) âœ…
- Pixel art building assets â€” requires art commission (same pipeline as companion sprites)
- Town screen (new `TownScreen.tsx` in `src/screens/companion/`)

**Estimated effort:** ~10â€“14 days (excluding art commission time). Art-blocking â€” can ship tile grid + building definitions as a placeholder while assets are commissioned.

---

## TIER 4: Social & Competitive Features

### 4.1 Friend 1v1 Challenge (~4 days)
Challenge a contact: "Who can settle more debts this week?"

### 4.2 Weekly Group Leaderboard âœ… DONE
"This Week" tab added to existing `GroupLeaderboardWidget`. Weekly XP aggregated from `xpLedger` with Mondayâ€“Sunday window.

### 4.3 Social Activity Feed (~3 days)
Feed of noteworthy gamification events from group members.

### 4.4 Emoji Kudos on Feed (~1.5 days)
Tap feed events to react with emoji. **Depends on:** 4.3.

---

## Recommended Implementation Roadmap

| Sprint | Weeks | Features | Status |
|---|---|---|---|
| **1** | 1â€“2 | Expanded XP, Random Messages, Comeback Bonus, Streak Milestones, Level-Up Modal | Partial âœ… |
| **2** | 3â€“4 | Daily Quest System, Achievement Progress | Done âœ… |
| **3** | 5â€“6 | Titles, Weekly Leaderboard, XP Multipliers | Done âœ… |
| **4** | 7â€“8 | **Companion Foundation (3.1)**: Sprite rendering, Markov chains, character select, speech bubbles, anchor points, image preloading, unlock system | **Done** âœ… |
| **4b** | 8 | **Companion Tab + Hybrid Architecture (3.1b)**: Compact widget, CompanionScreen hub, 6th bottom tab, navigation rewire | **Done** âœ… |
| **5** | 9â€“10 | **Companion Economy (3.2 + 3.4)**: Expeditions + Gold Currency + Shop, shipped as complete earn/spend loop | **Done** âœ… |
| **6** | 11â€“12 | Quest Narrative (3.3), Streak Freeze (1.2), Evolution (3.7) | Planned |
| **7** | 13â€“15 | **Town Building Phase 1 (3.10)**: Town screen, tile grid, all 5 tiers, 27 buildings, icon-based (no art assets) | **Done** âœ… |
| **8** | 16â€“18 | **Town Building Phase 2 (3.10)**: Pixel art assets, companion wander in town, free placement UI | Planned |
| **9** | 19â€“20 | Adventure Map (3.8), Group Campfire (3.6) | Planned |
| **10** | 21â€“22 | Loot Drops (2.2), Party Boss Fight (3.9) | Planned |

---

## Audio & Haptic Design Notes

| Event | Haptic | Sound (future) |
|---|---|---|
| +XP toast | `impactLight` (existing) | Soft chime |
| Achievement unlock | `notificationSuccess` (existing) | Fanfare jingle |
| Level up | `impactHeavy` | Grand chord |
| Quest complete | `impactMedium` | Completion ding |
| Loot drop | `impactLight` Ã— 2 | Item pickup sound |
| Expedition returns | `notificationSuccess` | Adventure fanfare |
| Boss defeated | `impactHeavy` Ã— 3 | Victory anthem |

---

## Critical Files

- `src/services/GamificationService.ts` â€” Core gamification service (XP, achievements, streaks, gold integration)
- `src/services/ExpeditionService.ts` â€” Gold economy, expedition system, shop purchases [Sprint 5]
- `src/services/ExpeditionTypes.ts` â€” TypeScript types for expedition/gold/shop [Sprint 5]
- `src/contexts/GamificationContext.tsx` â€” Provider (companionCharacter, companionMood, XP, achievements, gold, expedition, shop)
- `src/navigation/index.tsx` â€” Screen + tab registration, overlay modals (XPToast, GoldToast, LevelUpModal, ExpeditionLootModal)
- `src/navigation/CompanionTabNavigator.tsx` â€” Companion tab stack (CompanionScreen, CompanionSelect, ExpeditionScreen, ShopScreen)
- `src/utils/appEvents.ts` â€” Event bus (includes gold, expedition, shop events)
- `src/screens/home/HomeScreen.tsx` â€” Compact widget placement
- `src/screens/companion/CompanionScreen.tsx` â€” Companion interaction hub (action cards, GoldDisplay)
- `src/screens/companion/ExpeditionScreen.tsx` â€” Expedition selection, countdown, loot collect [Sprint 5]
- `src/screens/companion/ShopScreen.tsx` â€” Shop with category tabs, purchase flow [Sprint 5]
- `src/components/GoldToast.tsx` â€” "+N Gold" notification [Sprint 5]
- `src/components/GoldDisplay.tsx` â€” Inline gold balance pill [Sprint 5]
- `src/components/ExpeditionLootModal.tsx` â€” Loot chest reveal modal [Sprint 5]
- `src/components/companion/` â€” Companion system (Sprint 4)
  - `companionMarkov.ts` â€” Markov chain config (tune animation behavior here)
  - `CompanionWidget.tsx` â€” Full animation widget (used on CompanionScreen)
  - `CompanionWidgetCompact.tsx` â€” Compact HomeScreen widget
  - `SpriteAnimator.tsx` â€” Skia sprite renderer
  - `spriteRegistry.ts` â€” Auto-generated asset registry + anchor points
  - `useCharacterImages.ts` â€” Image preloader
  - `useCompanionState.ts` â€” Mood derivation (includes adventuring mood from expedition)

---

# EXPENSERPG

# Product Specification Report

## Co-op / Solo Expense RPG for React Native

> **Document role**: This is the integration roadmap and product narrative for CCPay Split RPG. It provides long-horizon planning context and implementation status summaries.
>
> **Authority note**: [COMBATSYSTEM.md](../future/COMBATSYSTEM.md) is the canonical direction document. [CHANGELOG.md](../core_docs/CHANGELOG.md) is the authoritative source for shipped behavior. If this roadmap conflicts with either, do not change development direction until the conflict is explicitly confirmed.
>
> **Last reconciled**: April 12, 2026 â€” against [CHANGELOG.md](../core_docs/CHANGELOG.md) and [COMBATSYSTEM.md](../future/COMBATSYSTEM.md).

---

## Implementation Status Matrix

| Section | Area | Status | Phase | Evidence |
|---|---|---|---|---|
| Â§1â€“3 | Product summary, objectives, design principles | âœ… Done (foundational) | 0â€“1 | App embodies finance-first integrity + fantasy-first presentation |
| Â§3.3 | Solo mode principle | âœ… Done | 2+ | Solo campaign mode is shipped and available |
| Â§4 | Campaign model | âœ… Done | 2+ | `campaigns` collection, CampaignTypes.ts, CampaignService.ts, CampaignContext.tsx, CampaignHubScreen + full navigation |
| Â§5.1 | Expense loop | âœ… Done | 1 | Expense creation, itemization, split types, approval flow shipped |
| Â§5.2 | Settlement loop | âœ… Done | 1 | Settle-up redesign (Mar 2026) shipped; PAYMENT_COMPLETED â†’ boss generation pipeline wired in CampaignContext |
| Â§5.3 | Campaign progression loop | âœ… Done | 2 | Campaign entity, quest system, boss generation, combat engine, battle screen, quest flow, reward resolution all shipped |
| Â§5.4 | Account progression loop | âš ï¸ Partial | 2 | User XP + levels shipped; universal stat points UI shipped (StatAllocationScreen) |
| Â§5.5 | Town / identity loop | âœ… Done | 2 | Isometric tile map, 71 buildings, 5 tiers, gold economy, vault passive income |
| Â§6.1 | User XP | âœ… Done | 1 | GamificationService.awardXP(), xpLedger collection |
| Â§6.2 | Campaign XP | âœ… Done | 2 | Campaign-scoped XP via CampaignService.awardCampaignXP(); cross-fire to account XP on quest/boss completion |
| Â§6.3 | Universal stat points | âœ… Done | 3 | StatAllocationScreen with CampaignService.allocateStatPoints() |
| Â§7 | Stat model | âœ… Done | 3+8 | StatBlock (7 stats incl. precision) + StatLayers in CampaignTypes.ts; baseline stats per class; StatAllocationScreen with 7 stat rows |
| Â§8â€“9 | Class system + loadout rules | âœ… Done | 3 | 12 classes in CampaignDefinitions.ts; ClassPickerScreen for selection; loadout rules in CampaignTypes.ts |
| Â§10 | Combat system | âš ï¸ Partial | 4+8 | CombatEngine.ts + BattleScreen.tsx. Precision-driven hit model and D20 tiering are active. **Cover remains planned in canonical direction. Gap:** item action (needs inventory). |
| Â§10A | Combat engine implementation spec | âš ï¸ Partial | 8 | Precision and success tiers are active; cover remains planned per canonical direction in COMBATSYSTEM. **Gap:** item action |
| Â§11 | Dice system | âœ… Done | 4+8 | D20 roll with injectable RNG, 4-tier success system (fail/normal/strong/critical), precision modifier `floor(precision/5)`, DiceAnimation with tier labels |
| Â§12â€“13 | Skill costs + damage model | âš ï¸ Partial | 4+8 | All cost types + damage formula + defense mitigation + cover damage reduction; SkillBar with cost display + innate buttons. **Gap:** item use in combat |
| Â§14 | Boss and rival system | âœ… Done | 5 | Expenseâ†’boss pipeline; rival boss flee/reappear; boss card on hub; RivalBossCard.tsx; boss battle flow |
| Â§15 | Side quests and bounties | âš ï¸ Partial | 2/5 | Daily quest system shipped; QuestBoardScreen with Main/Side/Bounty tabs; narrative quests partially connected |
| Â§16 | Screen map | âœ… Done | 1â€“7 | All screens shipped â€” see per-screen status below |
| Â§17 | Data model | âœ… Done (~90%) | 1â€“7 | Finance entities + Campaign/Avatar/Quest/Boss/Battle types + Firestore CRUD all shipped; remaining: minor schema tuning |
| Â§18 | Architecture guidance | âœ… Done | 0 | TypeScript, modular feature-based, domain-separated |
| Â§19 | Phased implementation plan | âœ… Done | 0â€“7 | Phases 0â€“6 complete; Phase 7 (hardening) partially complete |
| Â§20â€“22 | Constraints, priorities, product statement | âœ… Done (foundational) | â€” | Guiding principles remain unchanged |

**Status key**: âœ… Done â€” shipped and validated | âš ï¸ Partial â€” some elements shipped, gaps remain | ðŸ“‹ Planned â€” designed but not yet implemented

## Canonical Override Notes (Apr 12, 2026)

The following overrides apply across this roadmap document:
- COMBATSYSTEM defines active development direction.
- CHANGELOG defines shipped behavior.
- Cover remains planned in canonical direction.
- Combat math canonical model is base damage + rank-based dice, layered crit resolution, and defense ratio mitigation.
- Precision is shipped and is the hit modifier stat.

When older sections below disagree, treat them as historical context until they are fully refreshed.

---

## 1) Product summary â€” âœ… Done (Foundational)

This product is a mobile app that combines **expense tracking** with a **lightweight RPG layer**. It supports both:

* **SOLO mode**: the user tracks their own expenses and progresses through a solo campaign.
* **CO-OP mode**: a trusted group of users splits expenses, confirms settlements, and progresses through a shared campaign.

The core design decision is that the app is **finance-first in integrity** and **fantasy-first in presentation**.

That means:

* the ledger is always the source of truth,
* the RPG layer is a derived presentation and gameplay system,
* no fantasy mechanic may change balances, splits, or settlement truth.

This product is not trying to replace accounting software. It is trying to make expense tracking feel engaging enough that people actually use it consistently.

> **Current state (Apr 2026):** The finance layer is fully shipped. The RPG layer is substantially shipped: companion system, town building, daily quests, expedition system, gold economy, XP/levels/achievements, and now the full campaign system â€” 12 classes with skill trees, CT-queue combat with D20 dice, expense-to-boss pipeline, quest board, battle screen, campaign hub, stat allocation, roster, archive, and campaign completion flow. Remaining: balance tuning, offline solo mode, audit export.

---

## 2) Product objectives â€” âœ… Done (Foundational)

## Primary objective

Create a trusted expense tracking system that people will willingly use because the interaction is fun, visually rewarding, and socially meaningful.

## Secondary objectives

* Make group expense settlement feel cooperative rather than administrative.
* Turn repeated financial behaviors into game progression.
* Give each solo user or group a persistent campaign identity.
* Allow users to understand balances immediately without navigating through game noise.
* Support a simple first version that can be implemented in React Native without excessive technical risk.

## Success targets

The product is successful if users can:

* create and split expenses quickly,
* confirm settlements without confusion,
* understand exactly who owes what,
* enjoy the campaign progression layer,
* keep returning because the town, avatar, and bosses feel persistent and rewarding.

---

## 3) Design principles â€” âœ… Done (Foundational)

## 3.1 Finance-first integrity

The financial ledger must remain deterministic, auditable, and easy to inspect.

Why this matters:

* Users will only trust the app if the money math is always clear.
* Fantasy visuals cannot be allowed to obscure liabilities or distort settlement history.
* The app is handling a socially sensitive workflow; ambiguity will destroy trust.

Implementation consequence:

* All balances should be computed from ledger events, not from UI state.
* Expense edits, payment confirmations, and deletions should be recorded in an audit trail.
* The app must always expose a plain-language accounting view.

## 3.2 Fantasy-first presentation

The visible interface should feel like a pixel-art RPG.

Why this matters:

* Expense tracking is inherently unexciting.
* The fantasy layer is the differentiator.
* The app should create emotional reward from ordinary actions such as settling a bill.

Implementation consequence:

* Avatars, town scenes, bosses, classes, loot, and campaigns are front-and-center.
* The user should feel like they are progressing even while simply paying or confirming an expense.

## 3.3 Solo and co-op are equally valid

Co-op should not be forced.

Why this matters:

* Some users only want to track personal spending.
* A solo mode broadens the appâ€™s usefulness and reduces onboarding friction.
* Solo mode also serves as a lower-complexity entry point for first-time users.

Implementation consequence:

* Every campaign system must support a one-user version.
* Multiplayer features should layer on top of the solo experience, not replace it.

## 3.4 Clear separation of progression scopes

There are three meaningful layers of progression:

* **Account progression**: user XP, which is global to the account.
* **Campaign progression**: avatar level and stats inside a specific solo or group campaign.
* **Class progression**: primary class rank progression inside a campaign.

Why this matters:

* Users need some progress to survive across campaigns.
* Campaigns also need to feel independent and self-contained.
* The system becomes confusing if all progression is mixed together.

Implementation consequence:

* Use explicit data objects for account-level universal points and campaign-level avatar points.
* Never infer stat ownership implicitly.

---

## 4) Product model â€” âœ… Done (Phases Aâ€“F shipped)

## 4.1 Campaign concept

Every solo user and every group has an ongoing campaign. Campaigns are **separate entities linked to groups** â€” each group can start its own campaign, and a group may have multiple sequential campaigns over time.

### Solo campaign

One user, one campaign, one avatar, one progression track.

### Group campaign

A trusted group shares one campaign, but each member has their own avatar and class setup within that campaign.

Why this is useful:

* It gives the app a consistent progression wrapper.
* Expenses do not feel like isolated records; they feel like events inside a persistent world.
* The campaign format creates recurring engagement.

> **Current state (Apr 2026):** Campaign entity now implemented in Phase A:
> - **CampaignTypes.ts** â€” Full TypeScript interfaces for campaigns, avatars, classes, skills, stats, quests, bosses, battles, combat engine, archive.
> - **CampaignService.ts** â€” Firestore CRUD for `campaigns/{campaignId}` + subcollections (`avatars`, `quests`, `bosses`, `battles`, `archive`). Campaign creation (solo + group), avatar creation with class-based baseline stats, boss generation from expenses, quest management.
> - **CampaignContext.tsx** â€” React context with real-time Firestore listeners + actions (createCampaign, startBattle, executeSkill, defeatBoss, completeQuest).
> - **CampaignDefinitions.ts** â€” 12 fully-defined classes with skill trees, boss archetype mappings, quest templates.
> - **CombatEngine.ts** â€” Pure combat engine: CT queue turns, D20 dice, damage formula, skill cost resolution, status effects, shield absorption, auto-battle AI.
> - **appEvents.ts** â€” 8 campaign event constants wired into typed event system.
>
> **Shipped (Phases Bâ€“F):** CampaignHubScreen, ClassPickerScreen, StatAllocationScreen, RosterScreen, BattleScreen (with CTQueueDisplay, SkillBar, DiceAnimation, BattleLog), QuestBoardScreen, QuestPrepScreen, RewardResolutionScreen, CampaignArchiveScreen, CampaignCompleteModal, RivalBossCard. All registered in CompanionTabNavigator. Campaign ActionCard entry in CompanionScreen.

## 4.2 Campaign persistence

Campaign data should persist while the campaign is active. If a group disbands and reforms, that is a new campaign.

Why this matters:

* Group identity should feel meaningful.
* A re-formed group should not accidentally inherit stale campaign state.
* The archive should preserve history, but the live campaign should remain clean.

---

## 5) Core loops â€” âš ï¸ Partial

Core loops are the heart of the product. They must be understandable, short, and repeatable.

> **Status summary:** Expense loop âœ… | Settlement loop âœ… | Campaign progression âš ï¸ | Account progression âš ï¸ | Town/identity âœ…

## 5.1 Expense loop â€” âœ… Done

1. User creates an expense.
2. Itemization is entered if needed.
3. The expense is assigned to a group (solo assignment planned).
4. The ledger calculates balances.
5. Payment is confirmed manually.
6. The expense becomes settled.
7. The fantasy layer may convert it into campaign content later (planned â€” Phase 5).

Why this loop matters:

* This is the actual utility of the app.
* It must be fast and reliable.
* The fantasy layer should not slow it down.

Developer note:
The expense creation flow should minimize taps and reduce ambiguity. The user should never wonder whether an entry was saved or how it was split.

> **Current state (Apr 2026):** Steps 1â€“6 are fully shipped. The ExpenseFlowWizard supports itemization, multi-member splitting (EQUAL/PERCENTAGE/EXACT/SHARES), group picker with duplicate detection, receipt OCR scanning, and approval flows. Step 7 (expenseâ†’campaign content conversion) is a Phase 5 deliverable. See CHANGELOG entries for Split Types Activation (Apr 2, 2026) and Settle-Up Flow Redesign (Mar 22â€“23, 2026).

## 5.2 Settlement loop â€” âš ï¸ Partial

1. A user sees what is owed.
2. They confirm payment or receive confirmation.
3. The balance updates.
4. The settlement history is recorded.
5. The campaign state becomes cleaner and more rewarding (planned â€” settlementâ†’campaign XP linkage not yet built).

Why this loop matters:

* Settlement is the main behavior the app is trying to encourage.
* The app should reward the feeling of resolution.

Developer note:
Settlement confirmation is social trust infrastructure, not a cosmetic feature. It needs explicit state, history, and auditability.

> **Current state (Apr 2026):** Steps 1â€“5 fully shipped. The settle-up flow was completely redesigned (Mar 2026) with hero balance cards, direction-based sections, inline Confirm/Decline, Send Reminder, and min-cash-flow debt simplification. Step 5 (settlementâ†’campaign progression) is wired: `PAYMENT_COMPLETED` AppEvent triggers `CampaignService.generateBossFromSettlement()` via `CampaignContext`, which maps expense categories to boss archetypes and spawns encounters. Settlement confirmations award campaign XP via `CampaignService.awardCampaignXP()`.

## 5.3 Campaign progression loop â€” âš ï¸ Partial

1. Users complete battles, settlements, and campaign interactions.
2. Campaign XP increases.
3. The avatar levels up inside that campaign.
4. Campaign stats and class ranks improve.
5. New bosses, side quests, and rewards unlock.
6. The campaign feels more alive over time.

Why this loop matters:

* It creates continuity and persistence.
* It turns financial management into a long-term narrative.

Developer note:
Campaign progression should remain local to the campaign so each group or solo save feels distinct.

> **Current state (Apr 2026):** All progression mechanisms shipped:
> - **Companion system** âœ… â€” 23 pixel art characters with Markov chain mood animations, mood auto-drift, speech bubbles. See COMPANIONS.md Â§3.1.
> - **Expedition system** âœ… â€” 5 timed expedition types (30minâ€“24hr) returning gold + XP. See COMPANIONS.md Â§3.2.
> - **Daily quest system** âœ… â€” 3 quests/day (easy/medium/hard + all-complete bonus). Deterministic per user/day. See COMPANIONS.md Â§2.1.
> - **Battles** âœ… â€” CT queue combat engine (`CombatEngine.ts`), `BattleScreen` with dice, sprites, skill bar. Boss encounters via `CampaignService.generateBossFromSettlement()`.
> - **Campaign-scoped XP** âœ… â€” `CampaignService.awardCampaignXP()` scopes XP per-campaign. Avatar leveling tracked on `CampaignAvatar.campaignXP`/`campaignLevel`.
>
> **Phase 8 (in progress):** Combat engine v2 focuses on phased battle flow, precision-driven hit resolution, D20 success tiers, and preview tooling; cover remains planned in canonical direction.

## 5.4 Account progression loop â€” âš ï¸ Partial

1. User completes real-world or app interactions.
2. User XP increases.
3. The account earns universal stat points.
4. Those universal points can be allocated to campaign avatars.

Why this matters:

* The app must not punish the user for starting a new campaign later.
* Account growth should still matter across campaigns.

Developer note:
This is one of the most important structural systems in the app. It prevents later campaigns from lagging behind earlier ones.

> **Current state (Apr 2026):**
> - **Steps 1â€“2** âœ… â€” User XP is earned from 10+ event types (expense creation, settlement, photo upload, streaks, daily quests, expeditions, etc.). XP is tracked in `xpLedger` with idempotency guards. Levels 1â€“10 with increasing thresholds. See COMPANIONS.md Â§1.6.
> - **Gold economy** âœ… â€” Dual-currency system (XP for progression, Gold for spending). Gold earned from expeditions (2â€“140g), daily quest bonus (+10g), streak milestones (+15â€“200g), town vault passive income. Gold spent on town buildings (71 items across 5 categories). See COMPANIONS.md Â§3.4.
> - **Steps 3â€“4** âœ… â€” Universal stat points and campaign avatar allocation shipped. `StatAllocationScreen` (7 stats: STR/MNA/SPD/HP/DEF/PRC/LCK) with +/- allocation. Each level grants 3 points. `CampaignService.allocateStatPoints()` persists via Firestore `updateDoc` with `increment`. Phase 8 added precision (PRC) as 7th stat.

## 5.5 Town / identity loop â€” âœ… Done

1. The user progresses.
2. The town or guild hall changes visually.
3. Avatar and group presence feels persistent.
4. The app becomes emotionally sticky.

Why this matters:

* People return to systems they feel attached to.
* The town is the visual memory of progress.

Developer note:
The town does not need to be a fully simulated city at launch. It only needs to feel alive, legible, and progressively embellished.

> **Current state (Apr 2026):** The town system is fully shipped across two phases:
> - **Phase 1 (Apr 2):** Icon-based tile grid with auto-placement, 27 buildings across 5 categories (Buildings, Infrastructure, Fences, Decorations, Companion Fixtures), 5 tiers (Hamletâ†’City), BlurModal purchase flow, Firestore transaction-backed purchases. See COMPANIONS.md Â§3.10.
> - **Phase 2 (Apr 3):** Isometric pixel-art tile map using Skia Canvas with 31 preloaded assets from `assets/miniatureworld/`. Tap-to-place building placement. Pan/zoom/tap gestures. Projection math refactored into `tileProjection.ts` single source of truth. See CHANGELOG (Apr 3, 2026).
> - **Building catalog:** Expanded to 71 buildings with passive vault income (gold collection over time).
> - **Town vault:** Passive gold accumulation adds a persistent earning loop.
>
> **Planned enhancements:** Companion wander animation in town, tier-up cutscene, building details on long-press. See COMPANIONS.md Â§3.10 Phase 2 deferred items.

---

## 6) Progression system â€” âš ï¸ Partial

> **Status summary:** User XP âœ… | Campaign XP âœ… | Universal stat points ðŸ“‹

## 6.1 User XP â€” âœ… Done

User XP is the account-wide progression level.

It grants:

* universal stat points,
* account-level progression feedback,
* long-term continuity between campaigns.

Why it exists:

* It preserves progression when the user starts a new campaign.
* It rewards the user regardless of which campaign they are in.

> **Current state (Apr 2026):** Fully shipped. `GamificationService.awardXP()` writes to `xpLedger` with idempotency guards (userId + referenceId + reason). 10+ XP event types including expense creation, settlement, photo upload, fast approval, friend invite, streaks, daily quests. Level 1â€“10 progression (12,000 XP cap). Level-up celebration modal with particle animation. XP multiplier events via `gameConfig/xpMultiplier`. See COMPANIONS.md Â§1.5, Â§1.6, Â§2.6.

## 6.2 Campaign XP â€” âš ï¸ Partial

Campaign XP is avatar progression inside one specific solo or group campaign.

It grants:

* campaign-level stat points,
* campaign level-up feedback,
* local progression inside the current group or solo campaign.

Why it exists:

* Each campaign needs its own identity and growth curve.
* It makes groups feel like separate RPG saves.

> **Current state (Apr 2026):** Campaign-scoped XP fully shipped. `CampaignService.awardCampaignXP()` writes XP to `CampaignAvatar.campaignXP` within the campaign's Firestore subcollection (`campaigns/{cid}/avatars/{uid}`). Account-level XP still accumulates on `userGameProfiles/{uid}.xp` for global progression. Both scopes coexist â€” campaign XP drives avatar leveling and stat allocation, account XP drives global unlocks.

## 6.3 Universal stat points â€” âœ… Done

Universal stat points are earned by the account, but can be allocated to campaign avatars.

Why this matters:

* The accountâ€™s long-term growth should remain useful.
* A user should not feel like they â€œmissedâ€ progress because they joined a new campaign later.

Implementation note:
A campaign avatar should track:

* how many universal points exist in the account,
* how many have already been allocated to that avatar,
* how many remain available to spend.

That explicit bookkeeping will prevent confusion and future bugs.

> **Current state (Apr 2026):** Fully shipped. `StatAllocationScreen` provides a 7-stat allocation UI (STR/MNA/SPD/HP/DEF/PRC/LCK). Each campaign level grants 3 universal stat points. `CampaignAvatar.universalPointsAllocated` tracks how many points have been spent. `CampaignService.allocateStatPoints()` persists allocation to `campaigns/{cid}/avatars/{uid}` via Firestore `updateDoc` with `increment`.

---

## 7) Stat model â€” âš ï¸ Partial (Phase 3 core done; precision stat planned)

The combat stat model is linear and intentionally simple.

> **Current state (Apr 2026):** 6-stat `StatBlock` implemented in `CampaignTypes.ts` (strength, defense, speed, health, mana, cdr) with baseline stats per class, `StatLayers` (baseline/campaignEarned/equipment/battleTemp), `StatAllocationScreen` for point allocation. **Gap:** the combat engine spec requires a 7th stat â€” `precision` â€” governing hit accuracy and D20 roll modifiers. Currently speed handles both queue position AND hit modifiers (`d20 + floor(speed/10)`). Planned separation: speed â†’ queue/dodge only, precision â†’ hit accuracy/roll modifier.

## Core stats

* **Strength**: attack output and offensive pressure.
* **Defense**: mitigation, armor, and shield support.
* **Speed**: queue position and dodge chance.
* **Health**: survivability.
* **Mana**: resource pool for skills.
* **CDR**: cooldown reduction.
* **Precision** *(planned)*: hit accuracy and D20 roll modifier. Replaces speed's current dual role in hit calculations.

## Stat behavior

* No soft caps for most stats.
* Linear scaling is preferred.
* CDR has a hard cap of 25% from raw stat allocation.
* Additional CDR may still come from class passives or active skill effects.

Why this structure works:

* It is easy to understand.
* It supports RPG identity without becoming a spreadsheet game.
* It is simpler to balance at the prototype stage.

## Stat layers

Each campaign avatar should expose four stat layers:

### 1. Starting baseline

At campaign creation, the avatar starts with:

* primary class bias,
* initial allocated stats.

Why:

* This ensures the avatar begins with a recognizable class identity.

### 2. Campaign-earned stats

Earned through campaign progression.

Why:

* This makes the campaign itself feel like the main play space.

### 3. Equipment/item bonuses

These apply while an item is equipped or a bonus is active.

Why:

* This gives room for loot, customization, and reward systems.

### 4. Temporary battle buffs

These apply only during the current battle.

Why:

* This allows tactical swing without permanent state pollution.

## Respec

Stat points can be reassigned freely outside combat.

Why:

* This reduces user regret.
* It encourages experimentation.
* It lowers the cost of learning the system.

---

## 8) Class system â€” âš ï¸ Partial (Phase A â€” Definitions shipped)

There are 12 classes total.

> **Current state (Apr 2026):** All 12 classes fully defined in `CampaignDefinitions.ts`:
> - **6 primary classes** (Vanguard, Arcanist, Ranger, Cleric, Rogue, Warden) with complete Rank 1-10 skill trees (1 basic + 4 actives + 5 passives each), stat biases, baseline stats, and cost biases.
> - **6 secondary classes** (Tactician, Alchemist, Duelist, Enchanter, Sentinel, Harbinger) with 2 actives + 2 passives each, fully unlocked from start.
> - **Skill definitions** include all combat properties: scaling stats, multipliers, CT costs, mana/cooldown/HP costs, target types, hit counts, effect tags.
> - **PassiveModifier system** supports flat/percent/conditional modifiers with triggers, stacks, and per-battle limits.
> - **CampaignTypes.ts** defines `PrimaryClassDefinition`, `SecondaryClassDefinition`, `SkillDefinition`, `PassiveDefinition` interfaces.
> - **Remaining:** Class picker screen, loadout editor UI, rank progression UI (Phase C).

* 6 primary classes
* 6 secondary classes

## 8.1 Primary classes

Primary classes define campaign identity and progression.

They:

* rank up from Rank 1 to Rank 10,
* unlock skills over time,
* provide the basic attack,
* define stat bias,
* define the core playstyle.

## 8.2 Secondary classes

Secondary classes are tactical overlays.

They:

* are selected per group campaign,
* are fully unlocked from the start of the campaign,
* can be switched mid-campaign,
* are unique within the group until the group exceeds six members.

Why this is useful:

* It creates group identity.
* It adds tactical depth.
* It prevents the secondary system from becoming another full progression tree.

---

## 9) Class structure and loadout rules â€” âœ… Done

> **Current state (Apr 2026):** Fully shipped. `ClassPickerScreen` provides class selection for 6 primary classes and 6 secondary classes with stat bias and cost bias display. Supports `create` and `respec` modes. Loadout defined by `CampaignAvatar.equippedLoadout` with `basicAttackSkillId`, `activeSkillIds[]` (max 4), `passiveSkillIds[]` (max 5, gated by classRank). `SkillBar.tsx` renders equipped skills during combat with mana cost badges, cooldown overlays, and innate flee action support (cover remains planned in canonical direction).

## 9.1 Primary class rank progression

Primary classes unlock as follows:

* Rank 1: basic attack
* Rank 2: passive
* Rank 3: active skill
* Rank 4: passive
* Rank 5: active skill
* Rank 6: passive
* Rank 7: active skill
* Rank 8: passive
* Rank 9: active skill
* Rank 10: passive capstone

Why this pattern works:

* It gives regular rewards.
* It creates a predictable growth curve.
* It keeps the class system readable.

## 9.2 Passive slot rule

The number of passive slots available is determined by primary class rank:

* Rank 2 â†’ 1 passive slot
* Rank 4 â†’ 2 passive slots
* Rank 6 â†’ 3 passive slots
* Rank 8 â†’ 4 passive slots
* Rank 10 â†’ 5 passive slots

Passives:

* are class-bound,
* stack multiplicatively,
* apply only to the owner character.

Why this works:

* It lets passives feel powerful.
* It avoids party-wide snowballing.
* It adds build identity without requiring a large active skill bar.

## 9.3 Active loadout rule

Each campaign avatar uses:

* 1 basic attack,
* 4 active skill slots.

The 4 active slots can be filled by any unique active skills from the chosen primary and secondary classes.

Why this matters:

* It creates a concise combat decision set.
* It allows flexible hybrid builds.
* It keeps the action bar small enough for mobile usage.

## 9.4 Duplicate skill rule

No direct duplicate skills are allowed. Similar effects are acceptable if the skills are technically distinct and class-bound.

Why:

* Prevents loadout redundancy.
* Preserves class identity.
* Simplifies selection logic.

---

## 10) Combat system â€” âœ… Done (Phase 4 + 8; item action deferred)

> **Current state (Apr 2026):** Combat engine fully implemented in `CombatEngine.ts` (pure, no Firestore/React dependencies):
> - **CT queue** â€” Units start at `100 - SPD`, tick down until 0, act, reset to skill's `ctCost`. Ties resolved by queue order.
> - **D20 + dice model** â€” Attack rolls use precision (`d20 + precision/5`), while damage uses guaranteed baseline plus rank-based dice (d4-d12). Injectable RNG via `rollD20(rng?)`.
> - **D20 success tiers** (Phase 8) â€” `getSuccessTier()`: fail (1-5, 0.65x), normal (6-12, 1.0x), strong (13-17, 1.15x), critical (18-20, 1.5x + passive bonus).
> - **Damage formula** â€” `(skillBase + scalingStat * multiplier + damageDice) * tierMultiplier`, then mitigated by defense ratio `100 / (100 + 2*DEF)` and other modifiers.
> - **Skill costs** â€” Cooldowns (tick 1/turn, CDR cap 25%), mana (regen 5/turn + bonuses), HP costs (self-KO prevention on enemy kill).
> - **Status effects** â€” DoTs, HoTs, buffs, debuffs, damage_reduction (from cover) with duration tracking + tick.
> - **Shield absorption** â€” Absorbs before HP.
> - **Innate actions** (Phase 8) â€” Flee is available (D20 + SPD/10 vs difficulty threshold, blocked in boss battles). Cover remains planned in canonical direction.
> - **BattlePhase state machine** (Phase 8) â€” `preparation` â†’ `queueing` â†’ `player_turn`/`enemy_turn` â†’ `resolving` â†’ `reward`/`finished`.
> - **Precision stat** (Phase 8) â€” 7th stat on StatBlock. Attack modifier: `floor(precision/5)`. Speed now exclusively controls queue position and dodge.
> - **Damage preview** (Phase 8) â€” `previewDamageRange()` returns min/max/avg. SkillBar shows tooltip on long-press.
> - **Auto-battle AI** â€” Priority chain: heal critical (or cover if no heal) â†’ debuff boss â†’ buff party â†’ highest damage â†’ basic attack.
> - **Battle state factory** â€” `createBattleState()`, `createEnemyUnits()`, `beginBattle()`, `finishBattle()`.
> - **Full auto-resolve** â€” `runFullAutoBattle(state, maxTurns, rng?)` for quick-resolve or deterministic testing.
> - **CampaignContext integration** â€” `startBattle`, `beginBattle`, `executeBattleTurn`, `runAutoBattle` actions.
>
> **Shipped (Phase B):** BattleScreen.tsx (full-screen battle view with phase-aware rendering), CTQueueDisplay.tsx (horizontal turn order), SkillBar.tsx (skill buttons with cooldown/mana + cover/flee innate buttons + damage preview tooltip), DiceAnimation.tsx (D20 roll overlay with success tier labels), BattleLog.tsx (color-coded turn log), BattleUnitSprite.tsx (sprite wrapper for combat). All registered in CompanionTabNavigator.
>
> **Gaps (Phase 8 â€” see Â§10A):** `item` action remains pending inventory integration. Cover also remains planned in canonical direction.

## 10.1 Queue-based turn system

Combat is turn-based using a CT queue.

How it works:

* Speed determines initial queue position.
* CT values count down until a unit reaches zero.
* The unit with zero CT acts.
* Its skill or action cost resets its CT.
* The next zero-CT unit acts according to queue order.

Why this is a good fit:

* It feels tactical.
* It is simpler than live-time combat.
* It supports async group participation.

## 10.2 Queue rules

* Equal CT is resolved by queue order.
* If multiple units hit zero simultaneously, queue order decides.
* Action interruptions are not used.
* Speed buffs and debuffs can move units forward or backward in queue.
* No unit may overtake the next character already at zero CT.

Why these rules matter:

* They eliminate ambiguity.
* They keep the battle engine deterministic.
* They make speed a meaningful tactical stat.

## 10.3 Solo and group behavior

* Solo campaigns can be fully standalone.
* Group campaigns must sync online as the source of truth.
* If a player is offline in a group campaign, the character should auto-battle or be controlled by an active player if group rules allow it.

Why:

* Group campaigns need reliability.
* The app should not break because one member is delayed.

---

## 10A) Combat engine implementation spec â€” âš ï¸ Partial (Phase 8, item action remaining)

This section defines the target architecture for the combat engine overhaul. The current `CombatEngine.ts` (931 lines, pure TypeScript, no React/Firestore dependencies) implements the core loop. This spec formalizes the design contract, identifies gaps, and sets acceptance criteria for Phase 8.

> **Current state (Apr 2026):** `CombatEngine.ts` in `src/services/gamification/` implements the full combat loop: CT queue, D20 rolls with 4-tier success system (fail/normal/strong/critical), damage formula with tier multipliers, skill costs, status effects, shield absorption, auto-battle AI, flee action (D20 vs difficulty threshold, blocked in boss battles); cover remains planned in canonical direction, BattlePhase state machine (preparation â†’ queueing â†’ player_turn/enemy_turn â†’ resolving â†’ reward â†’ finished), injectable RNG for deterministic testing, precision stat integration, and damage preview function. All functions are pure. **Remaining gap:** `item` action (requires inventory system, Phase 6 dependency).

## 10A.1 Architecture

The combat engine is a **pure TypeScript domain module** â€” no React Native rendering or Firestore dependencies. All functions must be testable without mounting a component tree.

Current file locations (kept in place per project convention):

```text
src/services/gamification/
  CombatEngine.ts          # Core engine: queue, skills, damage, AI
  CampaignTypes.ts         # All type definitions (BattleState, QueueUnit, etc.)
  CampaignDefinitions.ts   # Class/skill/boss constants
  CampaignService.ts       # Firestore CRUD (NOT part of engine)
```

Future extraction candidates (if engine grows beyond ~1500 lines):

```text
CombatEngine.ts     â†’ combatQueue.ts (CT logic), combatMath.ts (damage/dice),
                      combatAI.ts (auto-battle), combatReducer.ts (state transitions)
```

The engine must support:

* unit testing queue logic without rendering
* validating D20 rolls deterministically (injectable RNG)
* simulating full battles for balance debugging
* replaying encounters from saved `BattleState`

## 10A.2 Battle state machine

Add a `BattlePhase` type to `CampaignTypes.ts`:

```ts
type BattlePhase =
  | 'preparation'    // Party lineup shown, pre-battle buffs applied
  | 'queueing'       // CT queue advancing to find next actor
  | 'player_turn'    // Player unit at CT=0, awaiting input
  | 'enemy_turn'     // Enemy unit at CT=0, AI resolving
  | 'resolving'      // Skill execution animating
  | 'reward'         // Battle won, reward bundle displayed
  | 'finished';      // Terminal state â€” navigate away
```

Extend `BattleState` with:

```ts
interface BattleState {
  // ... existing fields ...
  phase: BattlePhase;          // NEW â€” current state machine phase
  turnIndex: number;           // NEW â€” alias for currentTurn (spec alignment)
  rewards?: RewardBundle;      // NEW â€” populated when phase = 'reward'
  winner?: 'players' | 'enemies'; // NEW â€” set when battle ends
}
```

**Why:** A state machine prevents messy battle logic. The engine always knows what phase it is in, whose turn it is, and what happens after an action resolves. The UI renders phase-appropriate controls.

**Migration:** The current `result: BattleResult` field remains for backward compatibility. `winner` is set when `result` transitions from `'in_progress'`.

## 10A.3 Queue system (existing â€” spec alignment)

The current CT queue matches the spec:

* **Init:** `CT = max(1, 100 - speed)`. Higher speed â†’ lower starting CT â†’ acts sooner.
* **Advance:** Subtract minimum CT from all alive units. First unit reaching 0 acts.
* **Reset:** After acting, `CT = skill.ctCost`.
* **Tie-breaking:** Array position (queue order) â€” deterministic.
* **Speed buffs/debuffs:** Adjust CT but cannot jump ahead of a unit already at 0 CT.

Queue pseudocode (reference â€” already implemented in `advanceCTQueue()`):

```ts
function sortQueue(queue: QueueEntry[]): QueueEntry[] {
  return [...queue].sort((a, b) => a.ct - b.ct || a.tieOrder - b.tieOrder);
}

function advanceQueue(queue: QueueEntry[], ctCost: number): QueueEntry[] {
  return queue.map(unit => ({
    ...unit,
    ct: Math.max(0, unit.ct - ctCost),
  }));
}

function applyActionCost(queue: QueueEntry[], actingUnitId: string, ctCost: number): QueueEntry[] {
  return queue.map(unit =>
    unit.unitId === actingUnitId ? { ...unit, ct: ctCost } : unit
  );
}
```

## 10A.4 Battle action set

The action grammar must be small, clear, and animation-friendly.

### Required actions

| Action | Status | Description |
|---|---|---|
| `attack` | âœ… Shipped | Basic attack â€” always available, costs no mana. Uses `skillType: 'basic'`. |
| `skill` | âœ… Shipped | Active skill from loadout. Costs mana/cooldown/HP per `SkillDefinition`. |
| `item` | ðŸ“‹ Planned | Use a consumable from inventory. Applies effect, consumes item. No CT cost penalty. Blocked on inventory system (Phase 6). |
| `cover` | ðŸ“‹ Planned | Defend-style mitigation action reserved for canonical planned scope; not treated as shipped until rollout confirmation. |
| `flee` | âœ… Shipped | Attempt to escape battle. D20 + SPD/10 vs `10 + difficulty*2`. Success â†’ battle ends with `fleeFlag=true`. Failure â†’ lose turn (CT=100). Blocked in boss battles. `executeFlee()` in CombatEngine. |

### Implementation notes for planned actions

**Cover:**
* Add `'cover'` to `SkillEffectTag` union.
* Implement as a self-targeted buff: `{ type: 'buff', property: 'damage_reduction', value: 0.5, turnsRemaining: 1 }`.
* CT cost: 60 (roughly half a normal turn â€” rewards defensive play by getting next turn sooner).
* Every class has cover innately â€” it is not part of the loadout. Add to `executeSkill` as a special-case action.

**Flee:**
* Add `'flee'` action type alongside skill execution.
* D20 roll: `d20 + floor(speed/10)` vs `10 + (difficulty * 2)`. Success â†’ `phase = 'finished'`, `result = 'defeat'` with `fleeFlag = true` (no penalty beyond lost rewards).
* Blocked when `bossId` is non-null (boss battles cannot be fled).
* UI: flee button in SkillBar, greyed out in boss encounters.

**Item:**
* Requires inventory system (Phase 6 gap â€” `InventoryItem` type exists in data model Â§17 but no runtime inventory).
* Item use resolves like a skill with `costType: 'none'` and `ctCost: 0` (does not cost a full turn).
* Item effects: heal potion (restore HP%), mana potion (restore mana%), antidote (clear debuffs), bomb (AoE damage).
* Deferred until inventory system ships.

### Why a small action set matters

The app is not building a complex tactics simulator. It is building a readable encounter loop that supports expense-as-boss gameplay. Five actions (attack, skill, item, cover, flee) are easy to teach and easy to animate.

## 10A.5 Skill resolution pipeline

Every skill resolves in the same order. This creates a consistent mental model and prevents edge-case bugs.

### Resolution order (currently implemented in `executeSkill()`)

1. **Pay cost** â€” Deduct mana, apply cooldown, or deduct HP. Cost check happens before execution.
2. **Roll D20** â€” Attack roll: `d20 + floor(precision/5)` *(currently uses `floor(speed/10)`)*.
3. **Determine hit/success tier** â€” Compare roll to dodge threshold.
4. **Compute damage or effect** â€” Base damage formula with tier multiplier.
5. **Apply shields, defense, HP** â€” Shield absorbs first, then defense mitigates, then HP.
6. **Apply status effects** â€” Buffs, debuffs, DoTs, HoTs from skill effect tags.
7. **Check defeat/down state** â€” KO units at HP â‰¤ 0. Self-KO prevention on enemy-kill turn.
8. **Update queue** â€” Reset acting unit's CT to `skill.ctCost`.
9. **Append battle log** â€” Build `TurnRecord` with damage, healing, effects applied.

### Planned changes

* **Step 2:** Replace `floor(speed/10)` with `floor(precision/5)` once precision stat is added.
* **Step 3:** Add explicit `getSuccessTier()` function returning `'fail' | 'normal' | 'strong' | 'critical'` instead of binary hit/miss + crit flag.

```ts
function getSuccessTier(roll: number): 'fail' | 'normal' | 'strong' | 'critical' {
  if (roll <= 5) return 'fail';
  if (roll <= 12) return 'normal';
  if (roll <= 17) return 'strong';
  return 'critical';
}
```

* **Step 4:** Tier multipliers: fail â†’ 0.65x, normal â†’ 1.0x, strong â†’ 1.15x, critical â†’ 1.5x (matches existing crit behavior, adds granularity).

### Skill resolution pseudocode (reference)

```ts
function resolveSkillAction(
  state: BattleState,
  actorId: string,
  skillId: string,
  targetId: string
): BattleState {
  const actor = findUnit(state.units, actorId);
  const target = findUnit(state.units, targetId);
  const skill = findSkill(actor, skillId);

  const afterCost = paySkillCost(state, actor, skill);
  const roll = rollD20(actor.stats.precision);

  const hitResult = determineHit(actor, target, skill, roll);
  const effectResult = hitResult.hit
    ? applySkillEffect(afterCost, actor, target, skill, hitResult)
    : applyMissEffect(afterCost, actor, target, skill);

  const afterQueue = applyActionCost(effectResult, actorId, skill.ctCost);
  return appendLog(afterQueue, buildSkillLogEntry(actor, skill, target, hitResult));
}
```

## 10A.6 D20 system

D20 is the base randomizer. Currently implemented in `rollD20()` and `makeDiceRoll()`.

### Current implementation

```ts
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}
```

### Planned precision integration

```ts
function rollD20WithPrecision(precision: number): number {
  const raw = 1 + Math.floor(Math.random() * 20);
  const precisionBonus = Math.floor(precision / 5);
  return Math.min(20, raw + precisionBonus);
}
```

### What dice affect

* **Hit or miss** â€” attack roll vs dodge threshold.
* **Damage variance** â€” `rollValue / 10` multiplier (0.1x to 2.0x range).
* **Success tiers** â€” fail (1-5), normal (6-12), strong (13-17), critical (18-20).

### Preview behavior (planned)

Before committing to a skill, the UI should show an expected outcome range based on the unit's precision stat and skill base values. This gives the player informed choice without removing uncertainty.

## 10A.7 Damage and defense handling

### Current formula (implemented in `calculateDamage()`)

```ts
scalingValue = attacker.currentStats[skill.scalingStat]
d20Variance  = damageRoll.rollValue / 10    // 0.1x to 2.0x
rawDamage    = (skill.baseValue + scalingValue * skill.skillMultiplier) * d20Variance
```

Crit: `rawDamage *= (1.5 + critDamageBonus)` â€” natural 18-20.
Passive bonuses: `rawDamage *= (1 + classBonus + debuffedTargetBonus)`.
Mitigation: `finalDamage = max(1, round(rawDamage - defender.defense * (1 - piercePct)))`.

### Planned changes with success tiers

Replace binary crit with 4-tier multiplier:

```ts
const tierMultiplier =
  roll >= 18 ? 1.5 :    // critical
  roll >= 13 ? 1.15 :   // strong
  roll >= 6  ? 1.0 :    // normal
  0.65;                  // fail
```

### Shield absorption (implemented)

Shield HP is consumed before real HP. If shield absorbs all damage, no HP loss occurs. Warden class specializes in shield generation.

### Balance note

Temporary battle buffs expire when the battle ends. Defense pierce is hardcoded at 0% currently but the parameter exists for future boss/skill mechanics.

## 10A.8 Cost system

### Implemented cost types

| Type | Mechanism | Status |
|---|---|---|
| `cooldown` | Skill unavailable for N turns; ticks down 1/turn; CDR stat reduces (cap 25%) | âœ… |
| `mana` | Deducted from `unit.mana`; regen 5/turn + bonuses; passive reduction possible | âœ… |
| `hp` | `round(hp * skill.hpCostPct)` deducted; self-KO prevention on enemy-kill turn | âœ… |
| `none` | Basic attack â€” always available, never costs mana | âœ… |
| `mixed` | Combination of mana + cooldown | âœ… |
| `ct_cost` | Heavier skills set higher CT after use, delaying next turn | âœ… |

### Rules

* HP-cost skills can down the user (except mercy rule on enemy-kill).
* Mana is restored at 5/turn + passive bonuses.
* Basic attack always exists and never costs mana â€” a player is never locked out of acting.
* CDR from raw stat caps at 25%; additional reduction comes only from passives or active effects.

## 10A.9 Auto-battle support

### Current AI priority chain (implemented in `getAutoBattleAction()`)

1. `heal_critical` â€” If any ally HP < 30% threshold, use a heal skill.
2. `debuff_boss` â€” If an enemy is a boss (classId starts with `'the_'`), apply a debuff.
3. `buff_party` â€” Use a buff skill (targeting `all_allies` or `self`) if off cooldown.
4. `highest_damage` â€” Pick highest damage skill the unit can afford; target lowest-HP enemy.
5. `basic_attack` â€” Fallback to basic attack on lowest-HP enemy.

### Auto-battle rules

* Solo combat supports both manual and auto.
* Co-op group combat may allow some users to auto-battle.
* If a player is offline in a group campaign, the character defaults to auto-battle.
* `runFullAutoBattle()` executes up to 200 turns for quick-resolve.

## 10A.10 Reward resolution

At battle end:

* Award campaign XP via `CampaignService.awardCampaignXP()`.
* Award account XP + gold via `awardXP()` / `awardGold()` (fire-and-forget to GamificationService).
* Update boss/rival history if boss battle.
* Create archive entry via `CampaignService.createArchiveEntry()`.
* Return to hub or quest board via `RewardResolutionScreen`.

The campaign loop always closes with a visible reward moment, not a silent state transition.

## 10A.11 BattleScreen responsibilities (UI layer)

The `BattleScreen` (and its sub-components) is a **thin state renderer**. It should:

* Display queue order (CTQueueDisplay).
* Display current CT values, HP / mana / shields.
* Show skill buttons (SkillBar) â€” including cover and flee when implemented.
* Show dice preview (planned) and dice roll result (DiceAnimation).
* Show battle log output (BattleLog).
* Show reward summary at end.

The screen should **not**:

* Calculate combat rules directly.
* Own random logic.
* Decide turn order.
* Mutate `BattleState` manually.

All state transitions flow through `CombatEngine` functions.

## 10A.12 Acceptance criteria

The combat engine is not considered complete until:

1. âœ… Start a battle from a quest.
2. âœ… Build a speed-based CT queue.
3. âœ… Resolve turns with D20.
4. âœ… Apply skill cost and effect.
5. âœ… Handle HP, mana, shield, and cooldown.
6. âœ… End battle on win/lose.
7. âœ… Produce a reward bundle.
8. âœ… Persist battle history in campaign state.
9. ðŸ“‹ `BattlePhase` state machine governs all transitions.
10. ðŸ“‹ `cover` action available to all units.
11. ðŸ“‹ `flee` action with D20 check (blocked in boss battles).
12. ðŸ“‹ `item` action consumes inventory item.
13. ðŸ“‹ Precision stat modifies D20 rolls (separating from speed).
14. ðŸ“‹ Explicit success tiers (fail/normal/strong/critical) replace binary hit/crit.
15. ðŸ“‹ UI previews expected outcome range before skill commitment.

**Status key:** âœ… Shipped | ðŸ“‹ Planned (Phase 8)

---

## 11) Dice system â€” âš ï¸ Partial (D20 + crits shipped; success tiers + precision planned)

The app uses a D20 combat system.

> **Current state (Apr 2026):** D20 system fully shipped with Phase 8 enhancements. `rollD20(rng?)` accepts injectable RNG for deterministic testing. `getSuccessTier()` maps rolls to 4 tiers: fail (1-5, 0.65x), normal (6-12, 1.0x), strong (13-17, 1.15x), critical (18-20, 1.5x + passive crit bonus). Attack roll modifier: `floor(precision/5)` (precision stat, not speed). Damage variance: `rollValue/10` (0.1x-2.0x). `DiceAnimation.tsx` renders D20 overlay with tier-colored labels (FAIL/STRONG/CRIT). `previewDamageRange()` shows min-max damage tooltip on long-press in SkillBar.

## What dice affect

* damage variance,
* hit or miss,
* skill success tiers.

## Precision interaction

Precision modifies the raw D20 roll. Phase 8 shipped the dedicated precision stat: attack roll modifier is `floor(precision/5)`. Speed now focuses exclusively on CT queue position (lower starting CT) and dodge chance (`3 + floor(speed/20)`). All 12 classes and enemy archetypes include precision baseline values.

## Preview behavior

Before committing to a skill, the UI should show an expected outcome range.

Why this matters:

* Dice create excitement and unpredictability.
* Previewing the likely range keeps the experience fair.
* Users should understand the risk before acting.

Developer note:
The dice layer should never make the game feel arbitrary. It should create variance inside a comprehensible range.

---

## 12) Skill costs and resources â€” âš ï¸ Partial (item action planned)

> **Current state (Apr 2026):** All skill cost types shipped: cooldown, mana, HP, mixed, and none in `CombatEngine.ts executeSkill()`. CDR stat reduces cooldowns (cap 25%). Mana regen 5/turn + passive bonuses. HP self-KO prevention on enemy-kill turn. Basic attack always available at zero cost. `SkillBar.tsx` shows mana cost badges, cooldown overlays, plus innate Flee (D20 roll, blocked in boss battles); cover remains planned in canonical direction. **Remaining gap:** `item` action (requires inventory system).

## Cost types

Active skills can cost:

* cooldown,
* mana,
* HP.

In addition, the following non-skill actions are part of the action grammar:

* **cover** *(planned)* â€” no resource cost; applies a damage reduction buff + sets CT to 60. See Â§10A.4.
* **item** *(planned)* â€” consumes an inventory item; no CT cost (does not count as a full turn). Requires inventory system.
* **flee** *(planned)* â€” no resource cost; D20 roll vs difficulty threshold. Blocked in boss battles. See Â§10A.4.

## 12.1 Cooldown

Best for physical or tactical abilities.

Why:

* Keeps combat paced.
* Works well in a turn queue system.

## 12.2 Mana

Best for spells, utility, and support abilities.

Why:

* Creates a classic RPG resource loop.
* Allows mages and support classes to feel distinct.

## 12.3 HP

Best for risky burst abilities.

Why:

* Creates dramatic tradeoffs.
* Supports berserker-style gameplay.

## Resource rules

* HP-cost skills can down the user.
* Costs are paid first, then skill effect resolves, then final character status is checked.
* If the user spends themselves to zero HP but the enemy dies, the user is not treated as dead in that encounter.
* If the enemy survives, the user is downed.
* Mana regeneration can initially be kept simple, such as a fixed amount per turn.
* Basic attacks should always exist and should not cost mana, so a player is never fully locked out of action.

Why this design works:

* It gives every class a cost identity.
* It prevents â€œno moveâ€ soft-locks.
* It keeps the early implementation manageable.

---

## 13) Damage and defense model â€” âš ï¸ Partial (formula shipped; success tiers planned)

The first implementation uses a D20-based damage framework.

> **Current state (Apr 2026):** Damage formula implemented in `CombatEngine.ts calculateDamage()`: `(skillBase + scalingStat * multiplier) * d20Variance`. Crit multiplier 1.5x + passive bonuses. Defense mitigation: `max(1, rawDamage - defense * (1 - piercePct))`. Shield absorption before HP in `applyDamageToUnit()`. Passive bonuses for crit damage, damage vs debuffed targets, class damage. **Gaps:** no 4-tier damage multiplier (fail/normal/strong/critical â€” see Â§10A.7), defense pierce hardcoded at 0%.

## Core damage principles

* Strength increases offense.
* Defense reduces incoming damage.
* Speed influences dodge, crit, and queue position.
* Health defines survival.
* Mana defines skill access.
* CDR affects action reuse.

## Shield behavior

Warden-style shielding adds temporary HP above normal HP.

Why:

* It is easy to understand.
* It creates a clear defensive layer.
* It allows special mitigation effects without replacing HP.

## Defense pierce

Some bosses and characters may partially or fully pierce shields or defense.

Why:

* Adds variety.
* Prevents one defense style from solving everything.
* Makes boss traits matter.

## Balance note

At this stage, the damage model does not need to be heavily tuned. The priority is clarity and reliable state resolution.

---

## 14) Boss and rival system â€” âœ… Done (Pipeline + UI shipped)

> **Current state (Apr 2026):** Expenseâ†’boss pipeline fully implemented in `CampaignService.generateBossFromSettlement()`:
> - **Boss generation** from expense properties: `totalAmountâ†’HP`, `categoryâ†’archetype` (9 mappings), `items.lengthâ†’phases`, `splitTypeâ†’trait`.
> - **9 boss archetypes** with name patterns and visual flavors (Gourmand, Road Warden, Revelmaster, Hoarder, Siphon, Landlord, Wanderer, Plague Lord, Anomaly).
> - **Rival system** â€” Every 5th boss has 30% chance to become a Rival. Rivals learn player's class, can flee (tracked), reappear with +10% stats. `rivalData` on boss document.
> - **PAYMENT_COMPLETED event hook** in CampaignContext triggers boss generation automatically.
> - **Boss defeat** increments `bossesDefeated`, clears `currentBossId`, creates archive entry, awards XP/gold cross-fired to GamificationService.
> - **Shipped (Phase E):** Boss status card on CampaignHubScreen with HP bar, archetype, traits, rival badge. RivalBossCard.tsx for fled rivals. Boss challenge â†’ QuestPrepScreen â†’ BattleScreen â†’ RewardResolutionScreen flow. Remaining: rival stat boost on reappearance.

## 14.1 Boss generation

Bosses can be generated from whole expense records.

Why this is interesting:

* It turns financial events into campaign content.
* It creates a memory layer for group or solo play.
* It makes the ledger feel like story material.

## 14.2 Rival bosses

One expense record can generate one rival boss variant.

A rival:

* learns the playerâ€™s class type,
* may counter the playerâ€™s preferred style,
* may flee more often,
* can appear across unrelated encounters,
* may steal a portion of rewards,
* can be defeated to recover stolen rewards and earn a bonus reward.

Why rivals are useful:

* They create persistent antagonists.
* They make repeated play feel personal.
* They encourage users to care about settled expenses as story objects.

## 14.3 Rival frequency

Rival recurrence should primarily depend on the number of bosses defeated since the last rival encounter.

Why:

* It ties recurrence to actual gameplay.
* It is more meaningful than real-time frequency alone.
* It keeps the system readable.

---

## 15) Side quests and bounties â€” âš ï¸ Partial

If the main boss is too difficult, the campaign should offer side quests or bounties.

Why:

* This keeps players from hitting a hard wall.
* It gives underpowered groups a path to recover.
* It makes the campaign feel like an explorable RPG structure rather than a single linear challenge.

Developer note:
This should be introduced as a pressure-release mechanism, not as filler content.

> **Current state (Apr 2026):**
> - **Daily quest system** âœ… â€” 3 daily quests (5/10/15 XP + 20 XP all-complete bonus + 10 gold bonus). Deterministic selection per user/day from 8 quest types. Tracked in `dailyQuestProgress/{date}_{userId}`. See COMPANIONS.md Â§2.1.
> - **Narrative/boss-linked quests** âŒ â€” No connection between quests and expense data, bosses, or campaign narrative. The daily quest system is generic ("log an expense", "settle a debt") not plot-driven.
> - **Materials/loot drops** âœ… â€” 6 material types with RNG by quest difficulty. Materials are a precursor to the InventoryItem system described in Â§17. See COMPANIONS.md Â§2.2.
>
> **Planned:** Full narrative quest integration (COMPANIONS.md Â§3.3) and boss-linked bounties require the combat engine (Phase 4) and boss system (Phase 5).

---

## 16) Screen map â€” âœ… Done

The app should have a small but clear navigation structure.

> **Status summary:**
> | Screen | Status |
> |---|---|
> | 16.1 Welcome / onboarding | âš ï¸ Partial (auth shipped; RPG onboarding planned) |
> | 16.2 Mode selection | ðŸ“‹ Planned |
> | 16.3 Town / home screen | âœ… Done |
> | 16.4 Campaign dashboard | âœ… Done (CampaignHubScreen) |
> | 16.5 Add expense | âœ… Done |
> | 16.6 Expense detail | âœ… Done |
> | 16.7 Settlement screen | âœ… Done |
> | 16.8 Battle screen | âœ… Done (BattleScreen + CTQueueDisplay, SkillBar, DiceAnimation, BattleLog) |
> | 16.9 Class screen | âœ… Done (ClassPickerScreen) |
> | 16.10 Stat screen | âœ… Done (StatAllocationScreen) |
> | 16.11 Archive screen | âœ… Done (CampaignArchiveScreen) |
> | 16.12 Settings | âœ… Done |

## 16.1 Welcome / onboarding â€” âš ï¸ Partial

Purpose:

* explain SOLO vs CO-OP,
* create an account,
* create the first avatar,
* select a primary class,
* create or join a campaign.

Why:

* First-time users need clarity immediately.
* The app should not force group participation.

> **Current state (Apr 2026):** Authentication (WelcomeLoginScreen, EmailSignInScreen) and currency/feature onboarding are shipped. The onboarding flow covers 5 steps (welcome_home, quick_actions, groups_tab, settle_tab, gamification) but does **not** include solo vs co-op explanation, avatar creation, or class selection. These require the Campaign entity (Phase 2+) and class system (Phase 3).

## 16.2 Mode selection â€” ðŸ“‹ Planned

Purpose:

* choose solo campaign or co-op campaign.

Why:

* This is a major product identity decision and should be explicit.

> **Current state (Apr 2026):** No mode selection screen exists. The app enters directly into the group-based expense flow. This screen requires the solo mode implementation (Phase 2+).

## 16.3 Town / home screen â€” âœ… Done

Purpose:

* central emotional hub,
* show avatar,
* show town or guild hall,
* show campaign status,
* show quick access to expense creation and battle.

Why:

* This is the â€œhome baseâ€ of the RPG layer.
* It gives users a persistent world.

## 16.4 Campaign dashboard â€” âœ… Done

Purpose:

* show campaign level,
* show active quests and bosses,
* show group state,
* show campaign progress.

Why:

* This is the operational hub for the campaign loop.

> **Current state (Apr 2026):** Shipped. `CampaignHubScreen` serves as the central campaign dashboard. Shows avatar card with sprite, class, level, XP bar; boss status card with HP bar, archetype, traits, and "Challenge Boss" button; fled rivals section; quest board link with pending quest badge; party roster link (group campaigns); archive link. "Start Campaign" CTA when no active campaign navigates to ClassPickerScreen.

## 16.5 Add expense â€” âœ… Done

Purpose:

* quick expense entry,
* itemization,
* participant selection,
* settlement intent.

Why:

* This is the highest-friction real-world task.
* It needs to be efficient.

> **Current state (Apr 2026):** Fully shipped. ExpenseFlowWizard with group picker, member picker, itemization, 4 split types (EQUAL/PERCENTAGE/EXACT/SHARES), receipt OCR scanning (dual-AI: Gemini + GPT), category picker (30+ categories), approval flow. See CHANGELOG (Apr 2, 2026: Split Types Activation).

## 16.6 Expense detail â€” âœ… Done

Purpose:

* show the ledger view,
* show line items,
* show settlement state,
* show fantasy translation if relevant.

Why:

* This is the trust screen.
* The user must always understand the account state.

> **Current state (Apr 2026):** Shipped. Expense detail shows ledger view, line items, settlement state, inline payment panel with hero amount display and currency chips.

## 16.7 Settlement screen â€” âœ… Done

Purpose:

* confirm payments,
* mark partial or full settlement,
* show outstanding balance.

Why:

* Settlement is the behavioral objective of the app.

> **Current state (Apr 2026):** Fully redesigned (Mar 2026). SettleUpScreen hub with hero balance, AnimatedSegmentedControl (People/Groups toggle), visually distinct action items (orange approval cards, green cash cards). GroupBalancesScreen with direction sections, flow bars, dual Cash/Transfer buttons, Send Reminder, min-cash-flow debt simplification banner. See CHANGELOG (Mar 22â€“23, 2026).

## 16.8 Battle screen â€” âœ… Done

Purpose:

* turn-based combat,
* queue visibility,
* skill selection,
* dice preview and outcome,
* health, mana, cooldowns.

Why:

* This is where the RPG identity becomes concrete.

> **Current state (Apr 2026):** Shipped. `BattleScreen` â€” full-screen immersive battle with ImageBackground, CTQueueDisplay (horizontal turn-order bar), BattleUnitSprite (Skia sprites with flip support), SkillBar (mana cost badges, cooldown overlays), DiceAnimation (D20 roll overlay with reanimated), BattleLog (color-coded turn log). Steps one turn at a time with ~1200ms animation delay. Auto-battle "Fast Forward" mode. Victory/Defeat overlay navigates to RewardResolutionScreen.

## 16.9 Class screen â€” âœ… Done

Purpose:

* show primary and secondary class,
* show ranks and unlocked skills,
* allow primary class switching,
* allow secondary class assignment before campaign start.

Why:

* Class identity is a major part of player attachment.

> **Current state (Apr 2026):** Shipped. `ClassPickerScreen` â€” grid selection of 6 primary classes (Warrior, Mage, Rogue, Cleric, Ranger, Monk) with stat bias and cost bias display, plus 6 optional secondary classes (Berserker, Enchanter, Assassin, Paladin, Summoner, Bard) with focus labels. Supports `create` and `respec` modes. Confirm creates a solo campaign via CampaignContext and navigates back.

## 16.10 Stat screen â€” âœ… Done

Purpose:

* show current stats,
* show baseline, campaign, and universal point sources,
* allow free respec.

Why:

* The stat model needs to be understandable and editable.

> **Current state (Apr 2026):** Shipped. `StatAllocationScreen` â€” 7-stat allocation UI (STR, MNA, SPD, HP, DEF, PRC, LCK) with +/- buttons, per-stat descriptions, delta display (+N in green), remaining points counter. Precision (PRC) added in Phase 8. Each level grants 3 universal points. Confirm calls `CampaignService.allocateStatPoints()` (Firestore `updateDoc` with `increment`).

## 16.11 Archive screen â€” âœ… Done

Purpose:

* show previous campaigns,
* show defeated bosses,
* show rewards and class history.

Why:

* This provides long-term memory and continuity.

> **Current state (Apr 2026):** Shipped. `CampaignArchiveScreen` â€” AnimatedSegmentedControl tabs (All / Bosses / Quests / Milestones). FlatList of `ArchiveEntry` items from `CampaignService.getArchiveEntries()`. Entries display title, description, and formatted date.

## 16.12 Settings â€” âœ… Done

Purpose:

* group permissions,
* notifications,
* privacy,
* account management.

Why:

* Trust and control are essential in finance-adjacent apps.

> **Current state (Apr 2026):** Shipped. SettingsScreen with group permissions, notifications, privacy controls, security (PIN/biometric lock), AI provider selection, achievement display, companion selection, currency settings, migration dashboard.

---

## 17) Data model â€” âœ… Done (~90%)

This is the recommended conceptual data model. The table below shows entity-by-entity implementation status.

> **Entity status:**
> | Entity | Status | Evidence |
> |---|---|---|
> | User | âœ… Done | `userGameProfiles/{uid}`: xp, level, streak, gold, companionCharacter, equippedCosmetics, equippedTitle, materials, townState |
> | Campaign | âœ… Done | `campaigns/{cid}`: type, ownerId, groupId, currentChapter, bossesDefeated, totalQuestsCompleted, status. CampaignService + CampaignContext |
> | Group | âœ… Done | `groups/{gid}`: name, members, joinCode, status, type (one-on-one / multi-member) |
> | GroupMembership | âœ… Done | Implicit via group `members` array and role fields |
> | CampaignAvatar | âœ… Done | `campaigns/{cid}/avatars/{uid}`: primaryClassId, secondaryClassId, classRank, campaignLevel, campaignXP, stats (StatBlock), universalPointsAllocated, skillIds, passiveIds, companionCharacterId |
> | Class | âœ… Done | `CampaignDefinitions.ts`: 6 primary classes (warrior/mage/rogue/cleric/ranger/monk) + 6 secondary classes with stat biases, skill IDs, passives, rank thresholds |
> | Skill | âœ… Done | `CampaignDefinitions.ts`: 36+ skills with targetType, ctCost, manaCost, power, element, statusEffects |
> | Loadout | âœ… Done | Avatar `skillIds[]` + `passiveIds[]` determined by class + rank |
> | StatAllocation | âœ… Done | `StatAllocationScreen` + `CampaignService.allocateStatPoints()`. 6 stats: STR/MNA/SPD/HP/DEF/LCK. 3 points per level |
> | Expense | âœ… Done | `group_expenses/{eid}`: payer, title, amount, currency, category, status, splitType, splitConfig |
> | ExpenseLineItem | âœ… Done | `splits` subcollection on expense documents |
> | ExpenseShare | âœ… Done | Per-member share amounts in split documents |
> | PaymentConfirmation | âœ… Done | `payments/{pid}`: from, to, amount, status, method, currency |
> | LedgerBalance | âœ… Done | Computed by BalanceCalculationService with caching |
> | Boss | âœ… Done | `campaigns/{cid}/bosses/{bid}`: name, level, archetype, hp, maxHp, traits, isRival, generatedFrom. CampaignService.generateBoss/getFledRivals |
> | RivalBoss | âœ… Done | Boss with `isRival: true`, `fleeThreshold`, `stolenRewards`. getFledRivals query, RivalBossCard component |
> | BattleEncounter | âœ… Done | `CombatEngine.ts`: initBattle â†’ BattleState with queue, turnLog, status. stepOneTurn/runFullAutoBattle for execution |
> | QueueUnit | âœ… Done | `CampaignTypes.ts`: unitId, unitType, ct, currentStats, hp/mana/shield, statusEffects, cooldowns, skillIds, classId |
> | InventoryItem | âš ï¸ Partial | Materials (6 types) stored on `userGameProfiles.materials`; shop items in `ownedShopItems[]`; full equipment system planned |
> | AuditEvent | ðŸ“‹ Planned | No formal audit trail; `xpLedger` and `goldLedger` provide partial traceability for gamification events |

## User

Represents the account owner.

Fields:

* id
* displayName
* email or authId
* accountLevel
* accountXP
* universalStatPointsEarned
* createdAt
* settings

Why:

* This is the root identity object.
* It holds global progression and preferences.

> **Current state (Apr 2026):** Shipped as `userGameProfiles/{uid}` with fields: `xp`, `level`, `streak`, `longestStreak`, `totalPaymentsMade`, `totalExpensesCreated`, `equippedCosmetics` (border, avatar_frame), `equippedTitle`, `companionCharacter`, `gold`, `materials`, `activeExpedition`, `townState` (buildings[], tier, vaultLastCollectedAt), `awardedKeys[]`, `updatedAt`. Missing from spec: `universalStatPointsEarned`, `campaignIds[]`.

## Campaign

Represents one solo or group campaign.

Fields:

* id
* type: solo or group
* status: active, completed, archived
* groupId optional
* ownerUserId optional
* createdAt
* endedAt
* archiveMetadata

Why:

* Campaign is the central gameplay container.

> **Current state (Apr 2026):** âœ… Shipped. `campaigns` collection fully implemented in Phase A. `CampaignService.createCampaign()` creates campaign documents with type (solo/group), status, chapter tracking, boss/quest counters. Linked to Group via `groupId`. Sequential campaigns per group supported. `CampaignContext` provides real-time Firestore listeners.

## Group

Represents a co-op group.

Fields:

* id
* name
* description
* createdBy
* createdAt
* status

Why:

* A group defines the social container of a shared campaign.

## GroupMembership

Connects users to groups.

Fields:

* id
* groupId
* userId
* role: member, admin, leader
* secondaryClassId
* assignedBy
* assignedAt
* campaignLocked

Why:

* This supports the group-specific secondary class rule.

## CampaignAvatar

Represents the userâ€™s character inside one campaign.

Fields:

* id
* userId
* campaignId
* primaryClassId
* secondaryClassId
* appearance data
* campaignLevel
* campaignXP
* campaignStatPointsEarned
* baseline stats
* allocatedUniversalPointsUsed
* allocatedCampaignPointsUsed

Why:

* This is where campaign-local and account-wide progression intersect.

> **Current state (Apr 2026):** âœ… Shipped. `CampaignAvatar` stored in `campaigns/{cid}/avatars/{uid}` with fields: `userId`, `campaignId`, `companionCharacterId`, `primaryClassId`, `secondaryClassId`, `classRank` (1-10), `campaignLevel`, `campaignXP`, `stats` (StatBlock with 7 stats including precision), `equippedLoadout` (basic + 4 actives + 5 passives), `universalPointsAllocated`. Created via `ClassPickerScreen`, managed by `CampaignContext`.

## Class

Represents a playable class.

Fields:

* id
* name
* classType: primary or secondary
* primaryScalingStat
* secondaryScalingStat
* costBias
* description

Why:

* A shared class object simplifies UI, skill logic, and progression mapping.

## Skill

Represents a basic, active, or passive skill.

Fields:

* id
* classId
* name
* skillType: basic, active, passive
* costType: cooldown, mana, hp, none
* costValue
* scalingStatPrimary
* scalingStatSecondary
* baseValue
* cooldownTurns
* unlockRank
* effectTags

Why:

* Skills need to be data-driven, not hard-coded into UI logic.

## Loadout

Represents the campaign avatarâ€™s selected combat configuration.

Fields:

* id
* campaignAvatarId
* basicAttackSkillId
* activeSkillIds[4]
* passiveSkillIds[]
* lockedAtCampaignStart

Why:

* Loadouts are a key player choice and must be explicit.

## StatAllocation

Represents all stat distribution.

Fields:

* id
* campaignAvatarId
* source: baseline, universal, campaign
* strength
* defense
* speed
* health
* mana
* cdr

Why:

* Separate sources make respec and progression tracking possible.

## Expense

Represents the financial record.

Fields:

* id
* campaignId
* payerUserId
* title
* description
* totalAmount
* currency
* category
* status
* createdAt
* updatedAt
* isSoloExpense

Why:

* This is the accounting source object.

## ExpenseLineItem

Represents line-item itemization inside an expense.

Fields:

* id
* expenseId
* label
* amount
* participantRule
* splitMode
* metadata

Why:

* Itemization is central to accurate split behavior.

## ExpenseShare

Represents each userâ€™s share of a line item.

Fields:

* id
* lineItemId
* userId
* shareAmount
* sharePercent
* settlementStatus

Why:

* This is what makes settlement explicit.

## PaymentConfirmation

Represents manual settlement confirmation.

Fields:

* id
* expenseId
* fromUserId
* toUserId
* amount
* confirmedAt
* status
* note

Why:

* Payment is currently manual, so confirmation must be tracked clearly.

## LedgerBalance

Represents derived balances between users.

Fields:

* id
* campaignId
* fromUserId
* toUserId
* netAmount
* updatedAt

Why:

* This supports clear balance display without recomputing everything in the UI.

## Boss

Represents a campaign boss derived from an expense.

Fields:

* id
* sourceExpenseId
* campaignId
* bossType
* archetype
* traitTags
* level
* rarity
* status
* escapeCount

Why:

* Bosses need a stable identity and an origin record.

## RivalBoss

Represents the recurring nuisance variant of a boss.

Fields:

* id
* bossId
* learnedClassType
* stealChance
* recurrenceScore
* lastEncounterAtBossCount
* stolenRewardPool

Why:

* Rival bosses need their own persistence because they are behaviorally different from normal bosses.

## BattleEncounter

Represents one fight instance.

Fields:

* id
* campaignId
* bossId
* participantIds
* queueState
* turnHistory
* diceHistory
* result

Why:

* The combat engine needs a record of what happened for replay and debugging.

## QueueUnit

Represents one unit in the turn queue.

Fields:

* id
* battleEncounterId
* unitType: player or monster
* unitId
* speed
* ctValue
* isAutoBattle

Why:

* The queue is the core combat mechanism.

## InventoryItem

Represents equipment or cosmetic rewards.

Fields:

* id
* ownerUserId
* itemType
* slotType
* rarity
* statBonuses
* activeBonusState
* equippedAt

Why:

* Rewards and equipment need explicit modeling.

> **Current state (Apr 2026):** âš ï¸ Partial. Materials (6 types) are tracked on `userGameProfiles.materials` as `{materialId: count}`. Shop items are tracked in `ownedShopItems[]`. These are precursors to a full InventoryItem system. The complete equipment model (slotType, rarity, statBonuses, activeBonusState) requires the stat model (Â§7) and combat system (Â§10).

## AuditEvent

Represents a permanent change log.

Fields:

* id
* entityType
* entityId
* actionType
* actorUserId
* timestamp
* payload

Why:

* Finance-adjacent products need strong traceability.

> **Current state (Apr 2026):** ðŸ“‹ Planned as a formal system. Partial traceability exists through `xpLedger` and `goldLedger` collections (gamification events) and Firestore document history. A comprehensive AuditEvent system covering expense edits, payment confirmations, and deletions is a Phase 7 deliverable.

---

## 18) Architecture and implementation guidance â€” âœ… Done

## 18.1 Recommended technical direction

React Native is appropriate because the app is mobile-first, animation-heavy, and likely needs both iOS and Android.

Recommended implementation style:

* TypeScript
* modular feature-based architecture
* separated domain logic for ledger, combat, and progression
* state management with clear boundaries between server state and local UI state

Why:

* This reduces coupling.
* It makes the app easier to test and maintain.
* It avoids burying financial logic in visual components.

> **Current state (Apr 2026):** All recommendations are implemented. The codebase was migrated to TypeScript (74 files converted in Phase 6D, Mar 11â€“15, 2026). Architecture follows modular feature-based patterns with domain-separated services (`src/services/`), contexts (`src/contexts/`), schemas (`src/schemas/`), and screens organized by domain (`src/screens/{domain}/`). Rendering uses React Native + Skia (sprites, isometric tiles) + Reanimated (animations). State management uses React Contexts with clear server/local separation. See CHANGELOG (Phase 6D, Mar 2026).

## 18.2 Domain separation

The app should be divided into these major domains:

* auth and onboarding
* campaign and group management
* expense ledger
* settlement and balances
* classes and progression
* combat engine
* inventory and rewards
* archive and audit
* settings and permissions

Why:

* Each domain evolves at a different rate.
* Clear separation prevents the RPG and finance layers from contaminating each other.

---

## 19) Phased React Native implementation plan â€” âš ï¸ Partial (Phases 0â€“6 complete; Phase 7 partial; Phase 8 planned)

> **Phase completion summary:**
> | Phase | Status | Key Evidence |
> |---|---|---|
> | Phase 0 â€” Foundation | âœ… Done | TypeScript, navigation shell, design tokens, Expo + Firebase stack |
> | Phase 1 â€” Finance core | âœ… Done | Expense creation, 4 split types, settlement, balances, payment confirmation |
> | Phase 2 â€” Campaign & avatar layer | âœ… Done | Companion system (23 characters), town building (isometric), account XP, daily quests, expeditions, gold economy |
> | Phase 3 â€” Class system | âœ… Done | 12 classes in CampaignDefinitions.ts; ClassPickerScreen + StatAllocationScreen shipped |
> | Phase 4 â€” Combat engine | âš ï¸ Partial | CombatEngine.ts + BattleScreen shipped; cover and item remain planned in canonical direction |
> | Phase 5 â€” Boss & rival system | âœ… Done | Expenseâ†’boss pipeline + boss card on hub + RivalBossCard + boss battle flow |
> | Phase 6 â€” Rewards & cosmetics | âœ… Done | Cosmetics shipped; QuestBoardScreen, RewardResolutionScreen, CampaignArchiveScreen, CampaignCompleteModal |
> | Phase 7 â€” Hardening | âš ï¸ Partial | Firebase security rules, transaction-backed writes shipped; audit export, offline solo planned |
> | Phase 8 â€” Combat engine v2 | âš ï¸ Partial | Precision stat âœ…, success tiers âœ…, damage preview âœ…, injectable RNG âœ…. Cover and item remain planned in canonical direction. |

## Phase 0 â€” foundation â€” âœ… Done

Goal: establish the app shell and developer workflow.

Deliverables:

* project scaffold
* navigation shell
* TypeScript setup
* design tokens
* state architecture
* API contract skeleton
* test harness
* core domain interfaces

Why this phase matters:

* The app spans finance, RPG, and social systems.
* You need a clean base before feature work begins.

> **Completed.** React Native + Expo project scaffold, React Navigation with domain-grouped screens, TypeScript throughout (74-file migration), design tokens and theme system, Firebase/Firestore config with emulator support, Jest test harness.

## Phase 1 â€” finance core â€” âœ… Done

Goal: build a trustworthy expense tracker before adding game complexity.

Deliverables:

* account creation
* solo mode
* group creation and joining
* expense creation
* line-item itemization
* split logic
* balance calculation
* payment confirmation
* expense history

Why this comes first:

* The entire product fails if the finance layer is unclear.
* The fantasy layer should decorate a reliable ledger, not replace it.

Acceptance target:
A user can use the app as a basic expense tracker without ever touching combat.

> **Completed.** All deliverables shipped: account creation (email + Google auth), group creation/joining (join codes, duplicate detection), expense creation (ExpenseFlowWizard with group picker), line-item itemization, 4 split types (EQUAL/PERCENTAGE/EXACT/SHARES), balance calculation (BalanceCalculationService with caching), payment confirmation (InlinePaymentPanel with cash/bank methods), expense history. Additionally: receipt OCR scanning (dual-AI), multi-currency support (FX provider chain), recurring expenses, CSV export, 30+ categories. Solo mode not yet built.

## Phase 2 â€” campaign and avatar layer â€” âœ… Done (Substantially)

Goal: make the app feel like an RPG without changing ledger logic.

Deliverables:

* solo and group campaign dashboards
* avatar rendering
* town/guild hall shell
* account XP
* campaign XP
* stat screen
* baseline versus campaign stat visibility

Why this matters:

* This is where the appâ€™s identity becomes visible.
* Users should start feeling that this is more than a spreadsheet.

Acceptance target:
The app visibly rewards use and shows persistent progression.

> **Substantially completed.** The app rewards use through multiple shipped systems:
> - **Avatar rendering** âœ… â€” 23 pixel art characters with 11 animation types, Markov chain mood system (idle/excited/sleepy/adventuring), Skia Canvas rendering, anchor point system, image preloading. HomeScreen compact widget + CompanionScreen full hub.
> - **Town/guild hall** âœ… â€” Isometric pixel art tile map, 71 buildings, 5 tiers, tap-to-place, pan/zoom gestures, passive vault income.
> - **Account XP** âœ… â€” 10+ XP event types, xpLedger with idempotency, level 1â€“10 progression, level-up celebration modal, XP multiplier events.
> - **Gold economy** âœ… â€” Dual currency (XP + Gold), earned from expeditions/quests/streaks/vault, spent on town buildings.
> - **Daily quests** âœ… â€” 3 quests/day, all-complete bonus, material drops.
> - **Expeditions** âœ… â€” 5 timed types (30minâ€“24hr), gold + XP returns, anti-cheat.
> - **Streaks** âœ… â€” 7/14/30/60/100-day milestones with tiered rewards + streak freeze.
> - **Achievements** âœ… â€” 8 achievements with progress bars, 9 unlockable titles.
> - **Cosmetics** âœ… â€” 20 borders/frames, companion shop items.
> - **Leaderboard** âœ… â€” Weekly group XP leaderboard.
>
> **Remaining gaps:** Campaign-scoped XP visibility (currently uses global XP system). These are minor polish items.

## Phase 3 â€” class system â€” âœ… Done

Goal: add role identity and tactical choice.

Deliverables:

* 6 primary classes
* 6 secondary classes
* primary rank progression
* passive unlock logic
* secondary class assignment rules
* loadout editor
* class detail screens

Why this phase matters:

* Class identity is the main RPG hook.
* It gives users a reason to care about progression.

Acceptance target:
A user can choose a class identity and understand the build consequences.

> **Done (Apr 2026).** `CampaignDefinitions.ts` defines 6 primary classes (warrior/mage/rogue/cleric/ranger/monk) with stat biases, cost biases, 6 active skills each, 4 passives, and rank thresholds. 6 secondary classes with 2 active + 2 passive each. `ClassPickerScreen` for creation/respec. `StatAllocationScreen` for stat point allocation.

## Phase 4 â€” combat engine â€” âš ï¸ Partial (core shipped; v2 enhancements in Phase 8)

Goal: implement a readable, deterministic combat system.

Deliverables:

* CT queue
* speed-driven turn order
* D20 resolution
* active skill costs
* mana and HP costs
* basic attack always available
* shield and mitigation handling
* auto-battle support

Why this phase matters:

* The combat system is the mechanism that turns expenses into gameplay.

Acceptance target:
A full encounter can be executed end-to-end without ambiguity.

> **Core shipped (Apr 2026).** `CombatEngine.ts` implements CT queue turns, precision-modified D20 success tiers, and battle UI integration via CTQueueDisplay, SkillBar, DiceAnimation, BattleLog, and BattleUnitSprite. Canonical combat math now follows baseline-plus-dice damage with defense ratio mitigation. Cover and item remain planned in canonical direction.

## Phase 5 â€” boss and rival system â€” âœ… Done

Goal: convert financial history into replayable content.

Deliverables:

* boss generation from expenses
* rival boss logic
* boss recurrence tracking
* reward stealing and reclaiming
* side quest and bounty generation

Why this phase matters:

* This is where the product becomes memorable and personal.

Acceptance target:
Settled expenses can later reappear as interesting enemy content.

> **Done (Apr 2026).** `CampaignService.ts` implements `generateBoss()` from expenses (archetype derived from expense category, level scaled to campaign progress, traits from amount/category). Rival bosses have `fleeThreshold` and `stolenRewards`. `getFledRivals()` query. Quest generation via `generateQuests()` with main/side/bounty types. Boss defeat tracked in campaign doc (`bossesDefeated`, chapter progression). `RivalBossCard` component, boss status card in CampaignHubScreen, `QuestPrepScreen` for boss-specific prep.

## Phase 6 â€” rewards, cosmetics, town evolution â€” âš ï¸ Partial

Goal: increase emotional attachment and retention.

Deliverables:

* cosmetic unlocks
* inventory system
* town upgrades
* avatar progression visuals
* group member presence in town
* archive presentation

Why this phase matters:

* The town and avatar are the emotional memory of progress.

Acceptance target:
The app feels rewarding even when the user only performs ordinary finance actions.

> **Partially complete.** Cosmetic unlocks (âœ… from streaks/achievements), town upgrades (âœ… isometric with 71 buildings), avatar progression visuals (âœ… companion mood system + character unlocks). Remaining: inventory system (full equipment model), boss-earned cosmetics, group member presence in town (companion wander), archive presentation.

## Phase 7 â€” hardening and reliability â€” âš ï¸ Partial

Goal: prepare for real-world use.

Deliverables:

* sync robustness
* conflict resolution
* audit log export
* permissions and roles
* crash handling
* performance optimization
* data recovery
* offline handling for solo mode only

Why this phase matters:

* Users must trust the app with real group money relationships.

Acceptance target:
The app is stable, legible, and resilient enough for everyday use.

> **Partially complete.** Firebase security rules (âœ…), transaction-backed writes for state changes (âœ…), crash handling via Firebase Crashlytics (âœ…), permissions and roles (âœ… group admin/member/leader). Remaining: audit log export, conflict resolution for complex concurrent edits, data recovery, offline handling for solo mode, performance optimization at scale.

## Phase 8 â€” combat engine v2 â€” âš ï¸ Partial (item action remaining)

Goal: bring the combat engine to full spec alignment with the KOPAP3-style campaign battle loop (Â§10A).

Deliverables:

* âœ… `BattlePhase` state machine (`preparation` â†’ `queueing` â†’ `player_turn` â†’ `enemy_turn` â†’ `resolving` â†’ `reward` â†’ `finished`)
* âœ… `precision` stat added to `StatBlock` (7th stat) â€” replaces speed's role in hit accuracy
* âœ… `cover` action â€” self-targeted 50% damage reduction buff, CT=60, available to all units innately
* âœ… `flee` action â€” D20 + SPD/10 vs `10 + difficulty*2`, blocked in boss battles
* ðŸ“‹ `item` action â€” consume inventory item in combat (requires Phase 6 inventory system)
* âœ… Explicit D20 success tiers: fail (1-5, 0.65x), normal (6-12, 1.0x), strong (13-17, 1.15x), critical (18-20, 1.5x) with tier-specific damage multipliers
* âœ… Damage preview UI â€” `previewDamageRange()` + long-press tooltip in SkillBar showing min-max range
* âœ… Injectable RNG for deterministic testing â€” `rollD20(rng?)` threaded through all combat functions

Why this phase matters:

* Completes the combat grammar with defensive/escape options.
* Precision stat separates hit accuracy from queue speed, enabling more build diversity.
* BattlePhase state machine makes the engine self-documenting and easier to debug.
* Success tiers add granularity beyond binary hit/crit.

Acceptance target:
All 15 criteria in Â§10A.12 are met. A full encounter uses cover, flee (non-boss), and item actions alongside attack/skill. BattlePhase governs all state transitions. Precision stat is reflected in D20 modifiers and class baselines.

Dependencies:

* Phase 6 inventory system (for `item` action)
* Class baseline rebalance to include precision values
* StatAllocationScreen update to show 7th stat

---

## 20) Constraints and non-goals â€” âœ… Done (Foundational)

## Current non-goals

* monetization
* deep item crafting economy
* advanced AI boss strategy
* complex social chat
* real payment integrations
* highly tuned balance curves

Why these are deferred:

* The product is already large enough.
* Premature complexity would delay the core validation of the concept.
* The first build should prove that people enjoy using the system at all.

> **Reconciliation note (Apr 2026):** These constraints remain valid. The gold economy exists for in-app spending (town buildings) but involves no real-money purchases. Balance curves are intentionally untuned pending the combat system. AI integration exists for receipt scanning but not for boss strategy. See FUTURE_PIVOT.md for monetization contingency planning.

---

## 21) Developer priorities â€” âœ… Done (Foundational)

If a developer starts implementation, the order of importance should be:

1. Ledger correctness âœ…
2. Expense splitting and settlement clarity âœ…
3. Campaign model ðŸ“‹ (next major RPG milestone)
4. Account and campaign progression separation âš ï¸ (account XP shipped; campaign scoping planned)
5. Class/loadout data model ðŸ“‹
6. Battle queue logic ðŸ“‹
7. Boss conversion ðŸ“‹
8. Town and cosmetic layer âœ… (substantially shipped ahead of schedule)
9. Polishing and expansion âš ï¸ (ongoing)

Why:

* If the ledger is wrong, the app fails.
* If the fantasy layer is missing, the app is merely less exciting.
* That asymmetry is critical.

> **Note (Apr 2026):** Priorities 1â€“2 and 8 were completed ahead of the original sequence. Town and cosmetics (priority 8) were built during Phase 2 as part of the companion system, before the class/combat systems (priorities 3â€“7). This was a deliberate decision to ship retention-driving features (companion, town, expeditions, gold) while the combat system design matured. The next engineering milestone is priority 3 (Campaign model) which unblocks priorities 4â€“7.

---

## 22) Final product statement â€” âœ… Done (Foundational)

This app should feel like a **co-op or solo campaign where expenses become encounters, settlements become progress, and financial discipline becomes visible world-building**.

The important discipline is not to let the RPG layer obscure the finance layer. The user must always understand:

* what was spent,
* who owes what,
* what has been settled,
* what remains open,
* and how their campaign is progressing.

If that remains true, the fantasy layer will amplify the utility instead of competing with it.

---

# GAMIFICATION_IMPLEMENTATION_PLAN

# Gamification System â€” Implementation Plan

**Status**: âœ… Fully implemented (Feb 25â€“26, 2026)
**Planned Phase**: 2.4
**Reference**: Duolingo clone at `reference_only/UIUX_reference/duolingo-clone-main/`
**Design Decision**: Group-local leaderboard only (no global leaderboard). Ranked by number of payments settled within the group.

---

## Overview

Adds a Duolingo-inspired engagement loop to reward users for financial responsibility actions. Key features:

- **XP system**: Users earn points for creating expenses, settling payments, adding members, maintaining streaks
- **Daily streaks**: Consecutive days with any qualifying financial action
- **Quest milestones**: XP targets at 20 / 50 / 100 / 250 / 500 / 1000 XP
- **9 achievement badges**: Displayed in a Settings sub-screen
- **Group leaderboard**: Members ranked by payments settled count within a group (in GroupStatsTab)
- **UI feedback**: Floating XP toast + full-screen achievement unlock modal with confetti

**Principle**: Gamification is **always fire-and-forget**. No gamification call may block, delay, or catch an exception from a critical payment/expense flow. All calls are wrapped in `.catch(console.warn)`.

---

## New Firestore Collections

> Full schema in `documentation/architecture/FIRESTORE_SCHEMA.md` â†’ "Gamification Data Model" section.

| Collection | Purpose |
|-----------|---------|
| `userGameProfiles/{userId}` | XP, level, streak, lastActiveDate, counters |
| `userAchievements/{docId}` | Earned badges per user (top-level, not subcollection) |
| `xpLedger/{docId}` | Append-only XP award log â€” idempotency guard |
| `achievementDefinitions/{achievementId}` | Static badge metadata â€” seed once, read-only |

**Composite index required**: `userAchievements`: `userId ASC, unlockedAt DESC`

---

## XP Awards Table

| Action | XP | Reason Key | Reference ID |
|--------|-----|-----------|-------------|
| First expense ever (one-time) | +50 | `expense_first` | expenseId |
| Create expense (subsequent) | +10 | `expense_create` | expenseId |
| Settle payment (full) | +25 | `settle_full` | expenseId + `_payment` |
| Settle payment (partial) | +10 | `settle_partial` | expenseId + `_payment` |
| Approve expense | +5 | `approve_expense` | expenseId |
| Add group member | +5 | `add_member` | groupId + `_` + memberId |
| First group created (one-time) | +50 | `create_group_first` | groupId |
| First multi-currency expense (one-time) | +20 | `multicurrency_first` | expenseId |
| Complete onboarding | +30 | `onboarding_complete` | userId + `_onboarding` |
| 7-day streak bonus | +50 | `streak_7_day` | userId + `_streak7_` + weekNumber |

**Quest milestones**: 20, 50, 100, 250, 500, 1000 XP
**Level thresholds**: 0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000 XP â†’ Lv.1â€“10

---

## Achievement Badges (9)

| ID | Title | Icon | Category | Condition |
|----|-------|------|----------|-----------|
| `first_step` | First Step | `walk` | expense | First expense created |
| `settler` | Settler | `handshake` | payment | First full payment settlement |
| `group_founder` | Group Founder | `account-group` | social | First group created |
| `squad_goals` | Squad Goals | `account-multiple-plus` | social | Group with 5+ members |
| `big_spender` | Big Spender | `cash-multiple` | expense | Expense â‰¥ $100 equivalent |
| `on_a_roll` | On a Roll | `fire` | streak | 7-day active streak reached |
| `century_club` | Century Club | `lightning-bolt` | streak | 100 XP total |
| `globetrotter` | Globetrotter | `earth` | expense | First multi-currency transaction |
| `prompt_payer` | Prompt Payer | `clock-fast` | payment | Payment within 24h of expense creation |

---

## Task List (Phased)

### Phase 1 â€” Foundation âœ… Complete

- [x] **1a** â€” `src/utils/appEvents.js`: Add two event constants *(~5 min)*
  ```javascript
  GAMIFICATION_XP_AWARDED: 'gamification:xpAwarded',
  GAMIFICATION_ACHIEVEMENT_UNLOCKED: 'gamification:achievementUnlocked',
  ```

- [x] **1b** â€” Create `src/services/GamificationService.js` *(~2h)*
  - `XP_AWARDS` constants object
  - `QUEST_MILESTONES = [20, 50, 100, 250, 500, 1000]`
  - `LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000]`
  - `initUserGameProfile(userId)` â€” create doc if missing with all-zero defaults
  - `awardXP(userId, xpDelta, reason, referenceId, referenceType, groupId?)` â€” idempotency check â†’ Firestore transaction â†’ emit event
  - `checkAndAwardAchievements(userId, triggerEvent, context)` â€” check defs vs earned â†’ write new â†’ emit events
  - `updateStreak(userId)` â€” compare `lastActiveDate` vs today â†’ increment/reset â†’ award 7-day bonus
  - `getGroupLeaderboard(groupId, memberIds)` â€” count payments by fromUserId â†’ fetch profiles â†’ return ranked array
  - `loadAchievementDefinitions()` â€” one-time `getDocs` of `achievementDefinitions`

- [x] **1c** â€” Seed `achievementDefinitions` collection in Firestore (9 documents, one per badge) *(~30 min)*
  - Auto-seeded on first boot by `GamificationContext` (detects empty Firestore collection and calls `seedAchievementDefinitions()`). No manual step required.

- [x] **1d** â€” Create `src/contexts/GamificationContext.js` *(~1.5h)*
  - `useAuth()` dependency only (not TransactionsContext)
  - `onSnapshot` listener on `userGameProfiles/{userId}`
  - `onSnapshot` listener on `userAchievements` where `userId == uid`
  - One-time `getDocs` on `achievementDefinitions`
  - `AppEvents.on(GAMIFICATION_XP_AWARDED)` â†’ `pendingXPToast` state
  - `AppEvents.on(GAMIFICATION_ACHIEVEMENT_UNLOCKED)` â†’ `pendingAchievement` state
  - Anonymous user guard: if `user?.isAnonymous || !user?.uid`, set `loading = false` and return early
  - Exported: `{ xp, level, streak, achievements, achievementDefs, currentMilestone, previousMilestone, pendingXPToast, pendingAchievement, addXP, clearXPToast, clearAchievementModal, hasAchievement(id), loading }`

- [x] **1e** â€” `App.js`: Wrap `<GamificationProvider>` inside `<TransactionsProvider>` *(~5 min)*
  ```jsx
  <TransactionsProvider>
    <GamificationProvider>
      <Navigation />
    </GamificationProvider>
  </TransactionsProvider>
  ```

- [x] **1f** â€” Smoke test: boot app, confirm no errors, confirm `userGameProfiles/{uid}` doc created on first login

---

### Phase 2 â€” XP Integration Hooks âœ… Complete

- [x] **2a** â€” `src/screens/PaymentRecordingScreen.js` *(~30 min)*
  - After the `createPaymentApplications` loop completes (before `AppEvents.emit(PAYMENT_COMPLETED)`)
  - Determine if full or partial payment by comparing `totalInBaseCurrency` vs total owed
  - Call `addXP(isFullPayment ? 25 : 10, isFullPayment ? 'settle_full' : 'settle_partial', ...)`
  - Call `GamificationService.checkAndAwardAchievements(user.uid, APP_EVENTS.PAYMENT_COMPLETED, { isFullPayment, amount, groupId }).catch(console.warn)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2b** â€” `src/screens/250_SettlementScreen/SettlementScreen.js` *(~20 min)*
  - Inside `handleConfirm()`, after `createPaymentApplications` resolves (CASH approve path)
  - Call `addXP(25, 'settle_full_cash_approved', payment.id, 'payment', groupId)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2c** â€” `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js` *(~30 min)*
  - After `createExpense()` returns `expenseId` (around line 800)
  - Check `hasAchievement('first_step')` to determine bonus vs normal XP
  - Call `addXP(isFirst ? 50 : 10, isFirst ? 'expense_first' : 'expense_create', expenseId, 'expense', groupId)`
  - Call `GamificationService.checkAndAwardAchievements(user.uid, APP_EVENTS.EXPENSE_STATUS_CHANGED, { expenseId, groupId, isFirstExpense: isFirst, isMultiCurrency }).catch(console.warn)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2d** â€” `src/screens/GroupCreationScreen.js` *(~20 min)*
  - After `GroupService.createGroup()` returns `groupId`
  - Check `hasAchievement('group_founder')` for one-time bonus
  - If first group: `addXP(50, 'create_group_first', groupId, 'group', groupId)`
  - Call `GamificationService.checkAndAwardAchievements(...).catch(console.warn)`

- [x] **2e** â€” `src/navigation/index.js` onboarding `onComplete` callback *(~10 min)*
  - After `updatePreferredCurrency` resolves
  - Call `awardXP(user.uid, 30, 'onboarding_complete', user.uid + '_onboarding', 'onboarding', null).catch(console.warn)`
  - Also fires in `onSkip` callback (both represent onboarding completion)

- [x] **2f** â€” Verify: Perform a test expense creation and payment â†’ confirm `userGameProfiles.xp` increments in Firestore, `xpLedger` entry written, no double-award on second action with same expenseId

---

### Phase 3 â€” UI Components âœ… Complete

- [x] **3a** â€” Create `src/components/XPToast.js` *(~1h)*
  - `Animated.View` with `position: absolute`, `bottom: 120`, `alignSelf: center`
  - Content: `âš¡ +25 XP` in `rgba(66,0,255,0.9)` pill with white text
  - Animation sequence: slide up 24px + fade in (300ms) â†’ hold 900ms â†’ fade out (300ms)
  - Auto-dismiss: calls `onDismiss` after animation completes
  - Props: `{ xpDelta: number, visible: boolean, onDismiss: () => void }`

- [x] **3b** â€” Create `src/components/AchievementUnlockModal.js` *(~2h)*
  - React Native `Modal` (transparent) â€” same pattern as `PaymentSuccessOverlay`
  - Confetti: 25 colored dots using `Reanimated.useSharedValue` arrays + `withSpring` / `withDelay`
  - Content: achievement icon (80px, `Colors.primary`), title, description, XP badge, "Awesome!" button
  - `haptics.success()` on appear
  - Props: `{ achievement: { id, title, description, icon }, visible: boolean, onDismiss: () => void }`

- [x] **3c** â€” Create `src/components/StreakDisplay.js` *(~20 min)*
  - Inline: `ðŸ”¥ {streak}` in `Colors.warning` + `" day streak"` label
  - Shows `"Start a streak!"` when `streak === 0`
  - Props: `{ streak: number, style?: object }`

- [x] **3d** â€” Create `src/components/QuestProgressWidget.js` *(~1.5h)*
  - Collapsible card (local `expanded` state, defaults to `true` if `xp < 100`)
  - Progress bar: fill = `(xp - previousMilestone) / (currentMilestone - previousMilestone) * 100%`
  - Milestone dots row: `check-circle` (achieved, `Colors.primary`) vs `circle-outline` (future, `Colors.border`)
  - Collapse/expand uses `Animated.View` height animation
  - Props: `{ xp: number, currentMilestone: number, previousMilestone: number, style?: object }`

- [x] **3e** â€” `src/navigation/index.js`: Mount `XPToast` and `AchievementUnlockModal` as overlays *(~20 min)*
  - Import `useGamification` in the `Navigation` function component
  - After `<NavigationContainer>...</NavigationContainer>`, add:
    ```jsx
    {pendingXPToast && <XPToast xpDelta={pendingXPToast.xpDelta} visible onDismiss={clearXPToast} />}
    {pendingAchievement && <AchievementUnlockModal achievement={pendingAchievement} visible onDismiss={clearAchievementModal} />}
    ```

- [x] **3f** â€” Verify: Create an expense â†’ XPToast appears and auto-dismisses. Trigger first-time achievement â†’ AchievementUnlockModal shows with confetti.

---

### Phase 4 â€” HomeScreen + GroupStatsTab âœ… Complete

- [x] **4a** â€” Create `src/components/GroupLeaderboardWidget.js` *(~1.5h)*
  - Self-fetching: `useEffect` on mount calls `GamificationService.getGroupLeaderboard(groupId, memberIds)`
  - Shows `ActivityIndicator` while loading
  - Per-row: rank medal emoji (ðŸ‘‘ / ðŸ¥ˆ / ðŸ¥‰ / number) + displayName + `"X paid"` + XP badge
  - Current user row: highlighted background (`Colors.primaryBackground`)
  - Empty state: `"No payments recorded yet"` when all counts are 0
  - Props: `{ groupId: string, memberIds: string[], currentUserId: string, style?: object }`

- [x] **4b** â€” `src/screens/000_HomeScreen/HomeScreen.js` *(~45 min)*
  - Import `useGamification`, `StreakDisplay`, `QuestProgressWidget`
  - Destructure `{ xp, streak, currentMilestone, previousMilestone }` from `useGamification()`
  - Add `<StreakDisplay streak={streak} />` to the header row (right side)
  - Add `<QuestProgressWidget xp={xp} ... />` between header and Quick Access groups section

- [x] **4c** â€” `src/components/GroupStatsTab.js` *(~20 min)*
  - Import `GroupLeaderboardWidget`
  - Insert `<GroupLeaderboardWidget groupId={groupId} memberIds={...} currentUserId={currentUserId} />` as the first section, above the existing settlement ring
  - `memberIds` derived from `(group?.members || []).map(m => typeof m === 'string' ? m : m.userId)`

- [x] **4d** â€” Verify: GroupDetail â†’ Stats tab shows leaderboard. HomeScreen shows streak + quest progress.

---

### Phase 5 â€” AchievementsScreen + SettingsScreen âœ… Complete

- [x] **5a** â€” Create `src/screens/300_SettingsScreen/AchievementsScreen.js` *(~2h)*
  - ScrollView with section headers: "Expenses", "Payments", "Social", "Streaks"
  - 2-column grid of achievement cards per section
  - Unlocked card: full color icon + title + unlock date (`unlockedAt.toDate().toLocaleDateString()`)
  - Locked card: grayscale icon + title + description (smaller font)
  - Header: `"X / 9 Achievements Unlocked"` subtitle + total XP display
  - Uses `useGamification()` for `achievements` and `achievementDefs`

- [x] **5b** â€” `src/navigation/index.js`: Register `AchievementsScreen` in `SettingsStackNavigator` *(~10 min)*
  ```javascript
  <Stack.Screen
    name="Achievements"
    component={AchievementsScreen}
    options={{ headerShown: true, title: "My Achievements", headerBackTitle: "Settings" }}
  />
  ```

- [x] **5c** â€” `src/screens/300_SettingsScreen/SettingsScreen.js` *(~1.5h)*
  - Import `useGamification`
  - Destructure `{ xp, level, streak, achievements, achievementDefs, currentMilestone, previousMilestone }`
  - **Profile card** enhancements:
    - Wrap `avatarPlaceholder` in `avatarContainer` (position: relative) + add `levelBadge` overlay (22Ã—22 circle, bottom-right, `Colors.primary` bg, `"Lv.{level}"`)
    - Add `gamificationStatRow` below the email input: three chips showing ðŸ”¥ streak, âš¡ XP, ðŸ† badge count
    - Add `xpProgressBar` below stat row (height 6, `Colors.primary` fill, label `"{xp} / {currentMilestone} XP"`)
  - **New "Progress" section** (between Profile and Currency):
    ```jsx
    <ListItem
      title="My Achievements"
      subtitle={`${achievements.length} of ${achievementDefs.length} unlocked Â· ${xp} XP total`}
      left={<MaterialCommunityIcons name="trophy" size={22} color={Colors.warning} />}
      onPress={() => { haptics.selection(); navigation.navigate('Achievements'); }}
    />
    ```
  - Add 12 new styles: `avatarContainer`, `levelBadge`, `levelBadgeText`, `gamificationStatRow`, `statChip`, `statChipValue`, `statChipLabel`, `xpProgressContainer`, `xpProgressTrack`, `xpProgressFill`, `xpProgressLabel`, `progressSection`

- [x] **5d** â€” Verify full Settings screen flow:
  - Level badge visible on avatar
  - Stat row shows streak / XP / badge count
  - XP bar fills proportionally
  - Tapping "My Achievements" navigates to AchievementsScreen
  - Achievements show locked (grayscale) vs unlocked (color + date)

---

## Verification Checklist (End-to-End)

- [ ] Create expense â†’ `+10 XP` toast appears, `userGameProfiles.xp` increments in Firestore
- [ ] Create same expense twice (same expenseId) â†’ second call skipped, no double-award
- [ ] First ever expense â†’ `+50 XP` (bonus), "First Step" achievement modal fires
- [ ] Full payment settlement â†’ `+25 XP` toast
- [ ] CASH payment: record â†’ approve â†’ recipient gets `+25 XP`
- [ ] First group created â†’ `+50 XP` one-time bonus, "Group Founder" achievement fires
- [ ] XP crosses 100 â†’ "Century Club" achievement fires
- [ ] 7-day streak â†’ `+50 XP` bonus, "On a Roll" achievement fires
- [ ] HomeScreen header shows ðŸ”¥ streak counter
- [ ] HomeScreen shows QuestProgressWidget with XP progress bar
- [ ] GroupDetail â†’ Stats tab shows leaderboard sorted by payments settled count
- [ ] SettingsScreen profile card shows Lv.X badge, stat row, XP bar
- [ ] Settings â†’ My Achievements â†’ gallery shows locked/unlocked states
- [ ] Anonymous user: zero crashes, no Firestore subscriptions created
- [ ] Restart app â†’ all XP and streak persists from Firestore

---

## Key Files Reference

| File | Role |
|------|------|
| `src/services/GamificationService.js` | All Firestore read/write logic â€” XP, streaks, achievements, leaderboard |
| `src/contexts/GamificationContext.js` | Real-time listeners, event bridge, `addXP` helper for screens |
| `src/utils/appEvents.js` | Add `GAMIFICATION_XP_AWARDED` + `GAMIFICATION_ACHIEVEMENT_UNLOCKED` |
| `App.js` | Insert `GamificationProvider` |
| `src/navigation/index.js` | Mount overlays (XPToast, AchievementModal) + register AchievementsScreen |
| `src/components/XPToast.js` | Floating "+N XP" feedback |
| `src/components/AchievementUnlockModal.js` | Celebration modal with confetti |
| `src/components/StreakDisplay.js` | ðŸ”¥ inline streak indicator |
| `src/components/QuestProgressWidget.js` | Collapsible XP milestone card |
| `src/components/GroupLeaderboardWidget.js` | Group member ranking by payments paid |
| `src/screens/300_SettingsScreen/AchievementsScreen.js` | Achievement gallery |
| `src/screens/300_SettingsScreen/SettingsScreen.js` | Profile card + Progress section |
| `src/screens/000_HomeScreen/HomeScreen.js` | Streak + quest widgets |
| `src/components/GroupStatsTab.js` | Leaderboard in Stats tab |
| `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js` | XP trigger after expense creation |
| `src/screens/PaymentRecordingScreen.js` | XP trigger after payment settlement |
| `src/screens/250_SettlementScreen/SettlementScreen.js` | XP trigger after CASH approval |
| `src/screens/GroupCreationScreen.js` | XP trigger after first group |

---

## Architecture Notes

### Idempotency
Every `awardXP` call queries `xpLedger` for an existing doc with matching `userId + referenceId + reason`. If found â†’ early return. The `referenceId` is always a Firestore document ID so it is globally unique. This handles: double-taps, app restarts after partial failure, repeated event emissions.

### Fire-and-Forget Pattern
All gamification calls after critical writes:
```javascript
// CORRECT â€” never blocks the payment flow
GamificationService.updateStreak(user.uid).catch(console.warn);
addXP(25, 'settle_full', expenseId, 'payment', groupId);

// WRONG â€” never do this
await GamificationService.updateStreak(user.uid); // blocks if Firestore slow
```

### Provider Position
`GamificationProvider` must be inside `AuthProvider` (needs `user.uid`) and inside `TransactionsProvider` (context ordering). It does NOT depend on `TransactionsContext` â€” this is intentional to keep gamification decoupled from financial data.

### Anonymous Users
`GamificationContext` checks `user?.isAnonymous` on initialization. If true (or `!user?.uid`), it skips all Firestore subscriptions, returns all-zero defaults, and `addXP` is a no-op.

---

# PARTY_FLOW_ARCHITECTURE

# Party Flow Architecture

## Overview

The Party Expense Flow is a role-based system that provides two distinct experiences:

1. **Owner Path**: Full control over all members' expense assignments and party closure
2. **Guest Path**: Simple item selection for self, status marking with "Ready Up"

This document details the architecture, data flow, and navigation patterns.

---

## Core Concepts

### Member Identity (Firebase UID)

Members are identified using their Firebase Authentication UID (`user.uid`). In PartyContext, `userIdRef.current` is set to `user.uid` from AuthContext:

```javascript
// PartyContext.js
userIdRef.current = user.uid; // Firebase UID from AuthContext
```

This ensures:

- âœ… Globally unique identity tied to Firebase Auth
- âœ… Stable keys for downstream component reconciliation
- âœ… Consistent identification across sessions

### Role Determination

User role is determined by comparing `userId` with `ownerId`:

```javascript
const isOwner = userId === ownerId;
const isGuest = userId !== ownerId;
```

This comparison is used at every decision point in the flow to:

- Route to different screens
- Show different UI elements
- Apply different validation rules
- Enable/disable different actions

---

## Group Session vs External Guest Session (Feb 2026 Update)

Party sessions launched from a Group now behave differently from standalone sessions:

### Group Sessions (`activeParty.groupId` is set)
- **Entry**: GroupDetailScreen FAB â†’ `ExpenseFlow` wizard (party sessions are opt-in via "Start a Live Session â†’" on the What step)
- **QR code / party code**: Hidden by default in `PartySessionScreen`. Shown under a collapsible "Invite someone outside the group" accordion â€” only needed for guests outside the group.
- **Auto-join**: Group members join via `handleJoinGroupParty()` (by group membership â€” no code entry required). The GroupDetailScreen active-party banner triggers this automatically.
- **Notification**: When a session starts, `EXPENSE_SESSION_STARTED` push notifications are sent to all non-owner group members via `notificationService`.
- **Primary UI**: Member status list (who has joined, who is ready) is shown first.

### Non-Group Sessions (`activeParty.groupId` is null)
- **QR code / party code**: Shown prominently as primary UI (unchanged â€” strangers need the code).
- All other behaviour unchanged.

---

## Navigation Architecture

### Party Session Entry Point

**PartySessionScreen** is the central hub that routes based on role.

When "Split Items Collaboratively" is clicked:

```
userId === ownerId?
â”œâ”€ YES (Owner)
â”‚  â””â”€ Navigate("ExpenseFlow", { screen: "FoodItemList", params: { ...allMembers..., startStep: 0 } })
â””â”€ NO (Guest)
  â””â”€ Navigate("ExpenseFlow", { screen: "Choose", params: { ...onlyCurrentUser..., startStep: 2 } })
```

### Owner Path (Full Flow)

```
PartySessionScreen
  â†“
ExpenseFlowWizard (owner path)
  Items â†’ People â†’ Assign â†’ Review
  â†“
"Return/Close" back to PartySessionScreen (owner closes party after wizard finalize)
```

### Guest Path (Direct Selection)

```
PartySessionScreen
  â†“
ExpenseFlowWizard (guest path)
  Assign â†’ Review (People/Items skipped; user management disabled)
  â†“
"Ready Up" in finalize â†’ toggleReady(true)
  â†“
PartySessionScreen (status: Ready âœ…)
```

---

## Parameter Propagation

Parameters are passed through the navigation stack to preserve context:

### Key Parameters

| Parameter    | Type    | Source                                                   | Purpose                                           |
| ------------ | ------- | -------------------------------------------------------- | ------------------------------------------------- |
| `userId`     | string  | PartyContext.userIdRef (= user.uid)                      | Current user's Firebase UID                       |
| `ownerId`    | string  | PartySessionScreen                                       | Party owner's Firebase UID                        |
| `fromParty`  | boolean | PartySessionScreen                                       | Flag indicating party flow (vs. regular expense)  |
| `partyCode`  | string  | PartySessionScreen                                       | 6-char party code for back navigation             |
| `items`      | Array   | PartySessionScreen                                       | All receipt items                                 |
| `users`      | Array   | PartySessionScreen (all)                                 | User list (guest path filters to self in wizard)  |
| `startStep`  | number  | PartySessionScreen (0 owner, 2 guest)                    | Deep link into wizard step (Items=0, People=1, Assign=2, Review=3) |

### Flow Path (Owner - Wizard)

```
PartySessionScreen
  â†“ {items, users, userId, ownerId, fromParty, partyCode, startStep: 0}
ExpenseFlowWizard
  Items â†’ People â†’ Assign â†’ Review
  (Finalize: addTransaction + closePartySession)
```

### Flow Path (Guest - Wizard)

```
PartySessionScreen
  â†“ {items, users: [guest], userId, ownerId, fromParty, partyCode, startStep: 2}
ExpenseFlowWizard
  Assign â†’ Review (user management disabled; only self)
  (Finalize: toggleReady(true))
```

---

## Screen Behavior By Role

### FriendsListScreen

> **Note:** `020_FriendsListScreen/` has been deleted. This functionality is now handled by Step 1 (People) of ExpenseFlowWizard. The legacy `Friends` route maps to `ExpenseFlowWizard` with `startStep: 1` via ExpenseFlowNavigator.

### Wizard Behavior By Role

- **Owner**: Full 4 steps; can add/edit users and items; assigns any items to anyone; finalize creates pending transaction and closes party.
- **Guest**: Starts at Assign; People/Items read-only/hidden; only self available; finalize marks ready via `toggleReady(true)`.

```javascript
if (fromParty) {
  if (userId === ownerId) {
    // Owner: Return to Party Session
    <TouchableOpacity onPress={() => navigate("PartySession")}>
      <Text>Return to Party Session</Text>
    </TouchableOpacity>;
  } else {
    // Guest: Ready Up
    <TouchableOpacity
      onPress={async () => {
        await toggleReady(true);
        navigate("PartySession");
      }}
    >
      <Text>Ready Up</Text>
    </TouchableOpacity>;
  }
}
```

---

## Validation Rules

### ExpenseFlowWizard Validation (Review Step)

> **Note:** This validation was originally in `040_FoodFinalScreen` (now deleted). It is now part of ExpenseFlowWizard's Review step.

#### Guest Validation (Party Flow, Non-Owner)

```javascript
if (fromParty && userId !== ownerId) {
  const currentUser = users.find((u) => u.key === userId);
  // Guest must select at least 1 item for themselves
  return items.some((item) => item.party.includes(currentUser.name));
}
```

**Errors**:

- "You must select at least one item"

#### Owner/Regular Flow Validation

```javascript
// All users must have items
const allUsersHaveItems = users.every((user) =>
  items.some((item) => item.party.includes(user.name))
);

// All items must be selected
const allItemsSelected = items.every((item) => item.party.length > 0);

return allUsersHaveItems && allItemsSelected;
```

**Errors**:

- "All users must select at least one item"
- "All items must be selected by at least one user"

---

## Data Flow Diagram

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PartySessionScreen                                              â”‚
â”‚  â€¢ Shows all members with ready status badges                   â”‚
â”‚  â€¢ Owner can scan receipts and add items                        â”‚
â”‚  â€¢ "Split Items Collaboratively" button routes by role          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚
                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚                 â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ OWNER PATH     â”‚   â”‚ GUEST PATH    â”‚
        â”‚                â”‚   â”‚               â”‚
        â”‚ ExpenseFlow    â”‚   â”‚ ExpenseFlow   â”‚
        â”‚ Wizard         â”‚   â”‚ Wizard        â”‚
        â”‚ (startStep: 0) â”‚   â”‚ (startStep: 2)â”‚
        â”‚                â”‚   â”‚               â”‚
        â”‚ Step 0: Items  â”‚   â”‚ Step 2: Assignâ”‚
        â”‚ Step 1: People â”‚   â”‚ (self only)   â”‚
        â”‚ Step 2: Assign â”‚   â”‚               â”‚
        â”‚ Step 3: Review â”‚   â”‚ Step 3: Reviewâ”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚                 â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚                   â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”
        â”‚ Return to    â”‚    â”‚ Ready Up â†’  â”‚
        â”‚ PartySession â”‚    â”‚ toggleReady â”‚
        â”‚              â”‚    â”‚ Return to   â”‚
        â”‚              â”‚    â”‚ PartySessionâ”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Context Integration

### PartyContext

The `PartyContext` provides:

**State**:

- `activeParty`: Current party object with members, receipts, items
- `userId`: Derived value from `userIdRef.current` â€” current user's Firebase UID (exposed in context value for convenience)
- `userIdRef`: `useRef` holding the Firebase UID â€” used directly in async callbacks to avoid stale closure issues

**Methods**:

- `createPartySession({ ownerName, partyName, baseCurrency, groupId, initialMembers })`: Owner creates party
- `joinPartySession({ code, memberName })`: Guest joins party
- `toggleReady(isReady)`: Member updates their ready status
- `closePartySession()`: Owner closes party
- `switchActiveParty(code)`: Switch between multiple joined parties

**Key Feature**: `toggleReady()` uses `userIdRef.current` (stable ID) to update the correct member:

```javascript
const toggleReady = async (isReady) => {
  if (!activeParty?.id) return;
  // userIdRef.current is the Firebase UID
  await setMemberReady(activeParty.id, userIdRef.current, isReady);
};
```

This ensures that when a guest clicks "Ready Up", their status updates correctly.

---

## Firebase Data Structure

### Party Document

```javascript
{
  id: "auto-generated",
  code: "ABC123",                    // 6-char unique code
  name: "Team Lunch",
  ownerId: "firebase-uid-abc123",       // Firebase UID of owner
  status: "pending" | "completed",
  createdAt: timestamp,
  updatedAt: timestamp,

  members: {
    alice: {
      displayName: "Alice",
      ready: true,
      joinedAt: timestamp
    },
    bob_smith: {
      displayName: "Bob Smith",
      ready: false,
      joinedAt: timestamp
    },
    carol: {
      displayName: "Carol",
      ready: true,
      joinedAt: timestamp
    }
  },

  receipts: {
    mcdonalds: {
      name: "McDonald's",
      items: {
        burger: { name: "Big Mac", price: 12.50 },
        fries: { name: "Large Fries", price: 5.00 }
      }
    }
  }
}
```

---

## Error Handling

### Common Issues & Solutions

#### Issue: Guest sees all members instead of just themselves

- **Cause**: Incorrect filtering in FriendsListScreen
- **Check**: Verify `fromParty && userId !== ownerId` condition
- **Fix**: Ensure `FriendsListScreen` uses filtering logic

#### Issue: "Ready Up" button doesn't update status

- **Cause**: `toggleReady()` not called or using wrong user ID
- **Check**: Verify `userIdRef.current` is set correctly in PartyContext
- **Fix**: Ensure `createPartySession` and `joinPartySession` both set `userIdRef.current = user.uid`

#### Issue: Infinite loop / Maximum update depth exceeded

- **Cause**: Circular useEffect dependencies causing setState loops
- **Fix**: Remove conflicting useEffects, consolidate into single initialization

#### Issue: Guest navigates to FoodItemList instead of Choose

- **Cause**: Missing role check in PartySessionScreen
- **Check**: Verify `userId !== ownerId` comparison
- **Fix**: Add role-based navigation routing in "Split Items Collaboratively" handler

---

## Testing Checklist

- [ ] Owner creates party and sees all members
- [ ] Guest joins party via code with unique name
- [ ] Guest selects items (sees only themselves)
- [ ] Owner selects items for all members
- [ ] Guest clicks "Ready Up" and status changes to green dot
- [ ] Owner sees all members' ready status in PartySessionScreen
- [ ] Owner can close party only when all members are ready
- [ ] Transactions created with "pending" status
- [ ] Multiple parties can be joined simultaneously
- [ ] No infinite loops or maximum update depth errors
- [ ] Navigation flows work correctly (back buttons, screen transitions)

---

*Phase release notes (Phase 1.6, Jan 17, 2026; Phase 1.6.4, Jan 18, 2026) are archived in [`documentation/redundant/records/PARTY_FLOW_PHASE_UPDATES.md`](../redundant/records/PARTY_FLOW_PHASE_UPDATES.md).*

---

# PARTY_FLOW_PHASE_UPDATES

# Party Flow â€” Phase Release Notes (Archived)

**Source:** Extracted from `documentation/architecture/PARTY_FLOW_ARCHITECTURE.md`
**Archived:** February 18, 2026
**Reason:** These sections are dated phase-release notes (Jan 17â€“18, 2026) containing code snippets from the legacy `ContactsContext`/AsyncStorage implementation, which was superseded by the Firestore-based `GroupService` system in Phase 3+. They document intermediate development states, not current architecture.

For current party architecture reference, see:
- `documentation/architecture/PARTY_FLOW_ARCHITECTURE.md` (core concepts, navigation, data structure)
- `documentation/architecture/CCPAY_STATE_MACHINE.md` (Party Lifecycle State Machine)
- `documentation/architecture/OPTIMISATION_ANALYSIS.md` (Phase 9: Party Visibility & Groups-Parties Merge)

---

## Phase 1.6 Updates (Jan 17, 2026)

Comprehensive changes for party flows, contacts/groups, and payments notifications.

### 1) Party Disband Capability (Owner Only)
- Disband button visible only for owner when party status is `pending` **and** no items are assigned (`item.assignedTo` empty).
- Confirmation dialog before deletion; on success navigates home.
- Validation lives in `disbandParty()` (firebaseService) and is surfaced via `disbandPartySession()` (PartyContext).
- Files: `src/services/firebaseService.js`, `src/contexts/PartyContext.js`, `src/screens/090_Party/PartySessionScreen.js`.

**Validation Logic**
```javascript
// If any item has assigned members, disband is blocked
if (item?.assignedTo && Object.keys(item.assignedTo).length > 0) {
  throw new Error("Cannot disband party: items have been assigned to members");
}
```

### 2) Contact Management â€“ Detail & Removal
- List no longer has inline delete; tap opens a detail modal with large avatar + name.
- "Remove Contact" button uses confirmation dialog; on confirm deletes from AsyncStorage and closes modal.
- Files: `src/screens/100_ContactsScreen/ContactsScreen.js`, `src/contexts/ContactsContext.js`.

### 3) Group Management Enhancements
- **Edit Name:** Detail modal has "âœï¸ Edit Group Name"; inline TextInput with save/cancel; uses `updateGroup()`.
- **Add Members:** "+ Add Members" filters out existing members; taps add immediately; success alert; `addGroupMember()` ensures no duplicates.
- **Remove Members:** âœ• button per member removes instantly via `removeGroupMember()`.
- **Delete Group:** Destructive button in detail modal with confirmation; removed from list on success.
- Files: `src/contexts/ContactsContext.js`, `src/screens/100_ContactsScreen/ContactsScreen.js`.

### 4) Party Item Submission Guard
- `isAddingToParty` state wraps the add-to-party flow: shows spinner, disables button, re-enables in finally.
- Prevents rapid double submissions creating duplicate items.
- File: `src/screens/005_ReceiptReviewScreen/ReceiptReviewScreen.js`.

### 5) Payments Tab Pending Badge
- Red badge on Payments tab shows count of pending transactions (caps at "9+"); hidden when none pending.
- Uses TransactionsContext to count `status === "pending"` in real time.
- File: `src/navigation/index.js`.

### Diagrams (Phase 1.6)
```
Owner (pending party)
  â†“ sees "Disband Party" (only if no assignments)
  â†“ confirm?
  â”œâ”€ Cancel â†’ stay
  â””â”€ Confirm â†’ check receipts for assignedTo
        â”œâ”€ found assignments â†’ alert error
        â””â”€ none â†’ delete party â†’ navigate Home
```

```
Contacts list
  â†“ tap a contact
Detail modal (avatar + name)
  â†“ "Remove Contact" (confirm)
        â”œâ”€ Cancel â†’ modal stays
        â””â”€ Confirm â†’ delete contact â†’ close modal â†’ reload list
```

```
Group detail modal
  â†“ "+ Add Members"
Contact picker (filters existing)
  â†“ tap a contact
  â†“ addGroupMember(groupId, contactId)
  â†“ success alert â†’ close picker â†’ member shows in list
```

```
ReceiptReview: "Add to Party" tap
  â†“ setIsAddingToParty(true) â†’ disable button + spinner
  â†“ await add items/receipt
  â†“ finally setIsAddingToParty(false)
```

```
TransactionsContext pendingCount
  â†“ PaymentsTabIcon
  â†“ badge hidden when count = 0
  â†“ red badge shows count (caps at 9+) when pendingCount > 0
```

### Code Snippets (Phase 1.6)

**Disband guard (firebaseService.js)**
```javascript
export const disbandParty = async (partyId, actorId) => {
  const party = await getPartyById(partyId);
  if (!party || party.ownerId !== actorId) {
    throw new Error("Only the owner can disband this party");
  }

  const receipts = Object.values(party.receipts || {});
  for (const receipt of receipts) {
    for (const item of Object.values(receipt.items || {})) {
      if (item?.assignedTo && Object.keys(item.assignedTo).length > 0) {
        throw new Error("Cannot disband party: items have been assigned to members");
      }
    }
  }

  await deletePartyById(partyId);
};
```

**Group member add (ContactsContext.js)**
```javascript
const addGroupMember = async (groupId, contactId) => {
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) throw new Error("Contact not found");

  const updated = groups.map((group) => {
    if (group.id !== groupId) return group;
    const exists = group.members.some((m) => m.id === contactId);
    if (exists) throw new Error("Member already in group");
    return {
      ...group,
      members: [...group.members, { id: contact.id, name: contact.name }],
    };
  });

  await saveGroups(updated);
  setGroups(updated);
};
```

**Party add-to-flow guard (ReceiptReviewScreen.js)**
```javascript
const handleAddToParty = async () => {
  if (!partyId || !partyCode) return;
  setIsAddingToParty(true);
  try {
    await addReceiptToParty();
    Alert.alert("Success", "Receipt added to party");
  } catch (error) {
    Alert.alert("Error", error.message);
  } finally {
    setIsAddingToParty(false);
  }
};
```

**Payments tab badge (navigation/index.js)**
```javascript
const PaymentsTabIcon = ({ color, size }) => (
  <View style={styles.iconContainer}>
    <MaterialCommunityIcons name="credit-card" size={size} color={color} />
    {pendingCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {pendingCount > 9 ? "9+" : pendingCount}
        </Text>
      </View>
    )}
  </View>
);
```

### Summary of Changes

| Component | Changes | Impact |
|-----------|---------|--------|
| PartySessionScreen | +Disband button, handler, styles | Owners can clean up empty parties |
| ContactsScreen | Refactor to detail modals | Better UX, safer deletes |
| ContactsContext | +addGroupMember, +removeGroupMember | Full member CRUD in groups |
| ReceiptReviewScreen | +isAddingToParty state | Stops duplicate item submissions |
| navigation/index.js | +PaymentsTabIcon badge | Pending transactions visibly surfaced |

### Testing Checklist (Phase 1.6)
- [ ] Disband hidden when any item has assigned members
- [ ] Disband confirmation works and party is deleted
- [ ] Contact detail modal opens and removal confirms
- [ ] Group name edit save/cancel both work
- [ ] Add members filters existing members and adds successfully
- [ ] Remove member updates list immediately
- [ ] Delete group removes group after confirmation
- [ ] Party add-items button blocks double taps and shows spinner
- [ ] Payments badge appears only when pending transactions exist and hides when none

### Future Improvements (next)
1) Undo for contact/group deletion.
2) Bulk contact operations for groups.
3) Contact search/filter in add-members modal.
4) Group permissions for non-owners to leave.
5) Archive parties instead of hard delete for history.
6) Badge showing settlement state (pending vs waiting for others).

---

## Phase 1.6.4 Updates (Jan 18, 2026)

Bug fixes and improvements from multi-guest party testing feedback.

### 1) Closed Party Navigation & Session Cleanup
- **Issue**: Closed parties remained visible in active party list; could be re-opened
- **Fix**: Filter `status !== "completed" && status !== "disbanded"` in PartiesScreen
- **Fix**: Call `leavePartySession()` on party close to reset active party state
- **Navigation**: Close party button now navigates to Payments tab (shows created transaction)
- Files: `src/screens/100_PartiesScreen/PartiesScreen.js`, `src/screens/090_Party/PartySessionScreen.js`

### 2) Party Code Display Timing
- **Issue**: CreatePartyScreen showed stale party code from previous session
- **Fix**: Track `createdPartyCode` in local state, set on successful creation
- **Behavior**: Display only newly created code, not activeParty.code
- File: `src/screens/090_Party/CreatePartyScreen.js`

### 3) Guest Assignment Validation (Relaxed)
- **Issue**: Guest validation required all items to be assigned (too strict)
- **Fix**: Split validation logic: `isGuest ? guestHasItem : allItemsAssigned && allPeopleHaveItems`
- **Guest Rule**: Must assign â‰¥1 item to self (not all items)
- **Owner Rule**: Every item must have â‰¥1 person, every person must have â‰¥1 item
- File: `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js`

### 4) Guest Selection Visibility (Owner View)
- **Issue**: Owner couldn't see which items guests had already selected
- **Fix**: Added `preAssignedHint` text in assign step showing "Currently assigned: [names]"
- **Display**: Based on `item.party` array populated by guest assignments
- File: `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js`

### 5) Disbanded Status with Guest Notification
- **Issue**: Disbanded parties deleted entirely; no guest notification
- **Fix**: `disbandParty()` sets `status="disbanded"` + timestamp instead of `deleteDoc()`
- **Guest Detection**: useEffect monitors `activeParty.status === "disbanded"`
- **Notification**: Alert shown to guest with "Party Disbanded" message
- **Cleanup**: Guest calls `leavePartySession()` and navigates to PartiesTab
- Files: `src/services/firebaseService.js`, `src/screens/090_Party/PartySessionScreen.js`

**Guest Notification Code Pattern:**
```javascript
// PartySessionScreen.js
useEffect(() => {
  if (activeParty?.status === "disbanded" && !isOwner) {
    Alert.alert(
      "Party Disbanded",
      "The party owner has disbanded this party.",
      [
        {
          text: "OK",
          onPress: () => {
            leavePartySession();
            navigation.navigate("MainApp", {
              screen: "PartiesTab",
              params: { screen: "PartiesScreen" },
            });
          },
        },
      ],
      { cancelable: false }
    );
  }
}, [activeParty?.status, isOwner, navigation, leavePartySession]);
```

### 6) Transaction-Party Linking
- **Issue**: Transactions had no reference to originating party
- **Fix**: Added `partyId`, `partyCode`, `partyName` to `transaction.metadata`
- **Population**: Set on `closePartySession()` in ExpenseFlowWizard finalize step
- **Display**: PaymentsScreen shows "From Party: [name/code]" when metadata present
- Files: `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js`, `src/screens/200_PaymentsScreen/PaymentsScreen.js`

### 7) Profile/Settings Consolidation & Navigation Restructure
- **Issue**: Profile and Settings scattered across multiple tabs
- **Fix**: Removed ProfileTab and ProfileTabNavigator from navigation
- **Fix**: Settings tab goes directly to SettingsScreen (not a stack navigator)
- **Fix**: Merged profile fields (displayName, email) into top of SettingsScreen
- **UI**: Contacts tab icon changed from `people` to `magnify`
- **Known Limitation**: Profile Save button stubbed; persistence not implemented (future work)
- Files: `src/navigation/index.js`, `src/screens/300_SettingsScreen/SettingsScreen.js`

### PartyContext Method Additions
- **`leavePartySession()`**: Exported method to reset active party and unsubscribe listeners
- **Usage**: Called on party close, disband, and when guest detects disbanded status
- File: `src/contexts/PartyContext.js`

### Summary of Changes (Phase 1.6.4)

| Component | Changes | Impact |
|-----------|---------|--------|
| PartiesScreen | Filter completed/disbanded parties | Cleaner active party list |
| PartySessionScreen | Call leavePartySession on close, detect disbanded | Proper cleanup + guest notification |
| CreatePartyScreen | Local state for createdPartyCode | Shows correct code immediately |
| ExpenseFlowWizard | Relaxed guest validation, preAssignedHint display | Better UX for guests and owners |
| firebaseService | disbandParty sets status instead of delete | Preserves party history |
| PaymentsScreen | Display party metadata | Transaction traceability |
| navigation/index.js | Removed Profile stack, Settings direct | Simplified navigation |
| SettingsScreen | Merged profile section at top | Consolidated profile/settings |

---

## Future Enhancements (as of Jan 18, 2026)

*Note: Some of these may have been implemented in later phases (Phase 9, 11, 13). Check OPTIMISATION_ANALYSIS.md for current status.*

- [ ] Guest can edit their own selections after "Ready Up"
- [ ] Owner can remove members or reassign items for no-shows
- [ ] Real-time status updates with Firestore listeners
- [ ] Participant list shows who paid vs. who still owes
- [ ] Tip calculation and splitting logic
- [ ] Multi-currency support for international groups

---

## See Also

**Phase 1.6 Release Information**:
- **CHANGELOG**: [v1.6.3 - Party Management & Contacts (Jan 17, 2026)](../core_docs/CHANGELOG.md#version-163---party-management--contacts-jan-17-2026)
- **FEATURE_ROADMAP**: [Phase 1.6 - Party Management & Contacts (Completed Jan 17, 2026)](./FEATURE_ROADMAP.md#-phase-16-party-management--contacts-completed---jan-17-2026)
- **WORKING_PACKAGE_TRACKER**: [Recent Changes (2026-01-17)](../core_docs/WORKING_PACKAGE_TRACKER.md#recent-changes-2026-01-17)

---

# PHASE_1.6_PARTY_CONTACTS

# ðŸŸ¢ PHASE 1.6: PARTY MANAGEMENT & CONTACT ENHANCEMENTS (Jan 17, 2026)

## âœ… Feature: Party Disband & Contact/Group Management

**Status**: âœ… **IMPLEMENTED**

## Features Implemented

### 1. Party Disband Capability
**Description**: Party owner can now disband a party if no items have been assigned to members.

**What Works**:
- âœ… Disband button visible only to party owner
- âœ… Only available when party status is "pending"
- âœ… Validation prevents disbanding if items are assigned (`item.assignedTo` has members)
- âœ… Confirmation dialog to prevent accidental deletion
- âœ… Red danger button styling (#D32F2F)
- âœ… Success/error handling with appropriate alerts
- âœ… Navigation to home after successful disband

**User Flow**:
```
Party Owner
    â†“
Views "Disband Party" button (red danger)
    â†“
Taps to trigger confirmation dialog
    â†“
Confirms disbanding
    â†“
Server checks: any items with assignedTo?
    â”œâ”€ YES: Error alert "Cannot disband: items assigned"
    â””â”€ NO: Delete party document + navigate home
```

**Files Modified**:
- âœ… `src/services/firebaseService.js` - Added `disbandParty(partyId, actorId)` function
- âœ… `src/contexts/PartyContext.js` - Added `disbandPartySession()` method
- âœ… `src/screens/090_Party/PartySessionScreen.js` - Added UI button and handler

**Validation Logic**:
```javascript
// Checks each receipt's items for assignedTo field
// If any item has assigned members, throws error
if (item?.assignedTo && Object.keys(item.assignedTo).length > 0) {
  throw new Error("Cannot disband party: items have been assigned to members");
}
```

---

### 2. Contact Management - Detail & Removal
**Description**: Tapping a contact now opens a detail profile modal with remove capability.

**What Works**:
- âœ… Contacts list shows all contacts (no delete buttons inline)
- âœ… Tapping a contact opens detail modal
- âœ… Detail modal shows:
  - Large avatar (100x100px) with contact color
  - Contact name
  - "Remove Contact" button (red styling)
- âœ… Remove button triggers confirmation dialog
- âœ… Confirmed removal deletes contact from AsyncStorage
- âœ… Modal closes after successful removal

**User Flow**:
```
Contacts Tab
    â†“
View list of all contacts (no inline delete)
    â†“
Tap a contact
    â†“
Opens detail modal with large avatar + name
    â†“
Tap "Remove Contact" button
    â†“
Confirmation dialog
    â†“
Confirms â†’ Contact deleted + modal closes
```

**Files Modified**:
- âœ… `src/screens/100_ContactsScreen/ContactsScreen.js` - Complete refactor for detail modal
- âœ… Handler calls `deleteContact(contactId)` from context

---

### 3. Group Management Enhancements

#### A. Edit Group Name
**Description**: Group owners can edit group names directly.

**What Works**:
- âœ… Tapping a group opens detail modal
- âœ… "âœï¸ Edit Group Name" button enters edit mode
- âœ… TextInput becomes active for name editing
- âœ… Save button validates non-empty name
- âœ… Cancel button exits edit mode
- âœ… Modal title updates to show "Edit Group Name" state
- âœ… Changes persist via `updateGroup(groupId, updates)`

**User Flow**:
```
Groups Tab
    â†“
Tap a group
    â†“
Opens detail modal showing all members
    â†“
Tap "âœï¸ Edit Group Name" button
    â†“
TextInput becomes active
    â†“
Edit name + Tap "Save"
    â†“
Validates â†’ Updates via updateGroup() â†’ Modal title updates
```

**Implementation**:
```javascript
const handleEditGroupName = async () => {
  if (!editedGroupName.trim()) {
    Alert.alert("Error", "Group name cannot be empty.");
    return;
  }
  try {
    await updateGroup(selectedGroup.id, { name: editedGroupName.trim() });
    setSelectedGroup({ ...selectedGroup, name: editedGroupName.trim() });
    setEditingGroupName(false);
  } catch (error) {
    Alert.alert("Error", "Failed to update group name.");
  }
};
```

#### B. Add Members to Group
**Description**: Add contacts to existing groups with duplicate prevention.

**What Works**:
- âœ… "+ Add Members" button in group detail modal
- âœ… Opens contact selection modal
- âœ… Automatically filters out already-added members
- âœ… Shows "All contacts are already members" if full
- âœ… Tapping a contact adds them to the group
- âœ… Modal closes after adding (good UX)
- âœ… Group member list updates immediately
- âœ… Success alert confirmation

**Files Modified**:
- âœ… `src/contexts/ContactsContext.js` - Added `addGroupMember(groupId, contactId)`
- âœ… State: `addMemberMode` controls modal state

**Implementation**:
```javascript
const addGroupMember = async (groupId, contactId) => {
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) throw new Error("Contact not found");

  const updated = groups.map((g) => {
    if (g.id === groupId) {
      const memberExists = g.members.some((m) => m.id === contactId);
      if (memberExists) throw new Error("Member already in group");
      return {
        ...g,
        members: [...g.members, { id: contact.id, name: contact.name }],
      };
    }
    return g;
  });
  await saveGroups(updated);
};
```

#### C. Remove Members from Group
**Description**: Remove individual members from groups.

**What Works**:
- âœ… Each member in group detail shows "âœ•" button
- âœ… Tapping removes member immediately
- âœ… Group member list updates in real-time
- âœ… No confirmation needed (minor operation)
- âœ… API call to `removeGroupMember()`

**Files Modified**:
- âœ… `src/contexts/ContactsContext.js` - Added `removeGroupMember(groupId, contactId)`

**Implementation**:
```javascript
const removeGroupMember = async (groupId, contactId) => {
  const updated = groups.map((g) => {
    if (g.id === groupId) {
      return {
        ...g,
        members: g.members.filter((m) => m.id !== contactId),
      };
    }
    return g;
  });
  await saveGroups(updated);
};
```

#### D. Delete Group
**Description**: Delete entire group (moved from inline to detail modal).

**What Works**:
- âœ… "ðŸ—‘ï¸ Delete Group" button in group detail modal
- âœ… Red styling for destructive action
- âœ… Confirmation dialog
- âœ… Deletes group document completely
- âœ… Modal closes after deletion

---

### 4. Party Item Addition - Loading State Fix
**Description**: Prevent duplicate submissions when adding items to party.

**What Works**:
- âœ… Added `isAddingToParty` state variable
- âœ… Button shows ActivityIndicator spinner during submission
- âœ… Button disabled (`disabled={isAddingToParty}`)
- âœ… Button styled with reduced opacity when disabled
- âœ… State reset in finally block for proper cleanup
- âœ… Prevents race conditions from rapid clicks

**Files Modified**:
- âœ… `src/screens/005_ReceiptReviewScreen/ReceiptReviewScreen.js`

**Implementation**:
```javascript
if (partyId && partyCode) {
  setIsAddingToParty(true);
  try {
    // Add receipt and items...
    setIsAddingToParty(false);
    Alert.alert("Success", ...);
  } catch (error) {
    setIsAddingToParty(false);
    Alert.alert("Error", ...);
  }
}

// Button UI:
<TouchableOpacity
  style={[styles.proceedButton, isAddingToParty && styles.proceedButtonDisabled]}
  disabled={isAddingToParty}
>
  {isAddingToParty ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text>Add to Party â†’</Text>
  )}
</TouchableOpacity>
```

---

### 5. Notification Badge for Pending Transactions
**Description**: Visual indicator on Payments tab showing count of pending transactions.

**What Works**:
- âœ… Red badge (#D32F2F) on top-right of payments icon
- âœ… Shows pending transaction count
- âœ… Caps at "9+" for 10+ transactions
- âœ… Only displays when pending transactions exist
- âœ… Real-time updates via TransactionsContext
- âœ… White border for visibility
- âœ… Responsive positioning

**Files Modified**:
- âœ… `src/navigation/index.js` - Added custom PaymentsTabIcon component

**Badge Styling**:
```javascript
badge: {
  position: "absolute",
  right: -6,
  top: -3,
  backgroundColor: "#D32F2F",
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  borderWidth: 2,
  borderColor: "#FFF",
}
```

**Implementation**:
```javascript
const PaymentsTabIcon = ({ color, size }) => (
  <View style={styles.iconContainer}>
    <MaterialCommunityIcons name="credit-card" size={size} color={color} />
    {pendingCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {pendingCount > 9 ? "9+" : pendingCount}
        </Text>
      </View>
    )}
  </View>
);
```

---

## Summary of Changes

| Component | Changes | Impact |
|-----------|---------|--------|
| PartySessionScreen | +Disband button, handler, styles | Party owners can clean up empty parties |
| ContactsScreen | Complete refactor, +detail modals | Better UX, separation of concerns |
| ContactsContext | +addGroupMember, +removeGroupMember | Group member CRUD operations |
| ReceiptReviewScreen | +isAddingToParty state, loading UI | Prevent duplicate party item submissions |
| navigation/index.js | +PaymentsTabIcon, +badge styles, +useTransactions | Notification badge on payments |

---

## Testing Checklist

- [ ] Disband party button is hidden when items are assigned
- [ ] Disband confirmation dialog appears and works
- [ ] Party is deleted after confirmation
- [ ] Navigation returns to home after disband
- [ ] Contact detail modal opens on tap
- [ ] Remove contact confirmation works
- [ ] Contact is deleted from list after removal
- [ ] Edit group name save/cancel both work
- [ ] Group name updates immediately after save
- [ ] Add members filters already-added contacts
- [ ] Remove member button ("âœ•") works immediately
- [ ] Delete group button removes group completely
- [ ] Party add items button shows loading state
- [ ] Party add items doesn't create duplicates on rapid clicks
- [ ] Notification badge appears when pending transactions exist
- [ ] Badge count updates as transactions change status
- [ ] Badge disappears when no pending transactions

---

## Related Documentation

- See [CHANGELOG_2026-01-17.md](../CHANGELOG_2026-01-17.md) for detailed implementation notes
- See [PARTY_FLOW_ARCHITECTURE.md](./PARTY_FLOW_ARCHITECTURE.md) for party session flows
- See [WORKING_PACKAGE_TRACKER.md](../core_docs/WORKING_PACKAGE_TRACKER.md) for dependency versions

---

## Future Improvements

1. **Undo for Contact/Group Deletion**: Consider implementing undo stack
2. **Bulk Contact Operations**: Add/remove multiple contacts from groups
3. **Contact Search/Filter**: Search contacts in add members modal
4. **Group Permissions**: Allow non-owners to leave groups
5. **Archive Parties**: Instead of delete, archive completed parties for history
6. **Enhanced Badge**: Show settlement status (pending vs. waiting for others)

---
