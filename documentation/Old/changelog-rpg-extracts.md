# RPG Changelog Extracts

> Sections lifted from `documentation/core_docs/CHANGELOG.md` (CCPAY Split). These cover all RPG/campaign/combat/town/companion-related entries. Listed newest first, same order as the source.

---

## Status Effect Depth & Dice Regression Fix (Apr 13-14, 2026)

Phase 6 of the combat system overhaul: formalized the status effect taxonomy, centralized all buff/debuff application, added on-sprite badge UI, and fixed a runtime crash in the dice animation.

### Status Effect Taxonomy (DoT/HoT, Stacks, UI)
- **Subtype union added** — `StatusSubtype` (`poison | burn | bleed | regen | stun | shield | stat_buff | stat_debuff | generic`) with `StackPolicy` (`refresh | stack | unique`) for per-effect collision rules.
- **Centralized `applyStatusEffect` helper** — All status pushes (buff, debuff, taunt, dodge, cover shield, DoT, HoT) now route through a single helper that enforces stack policy and uses `(subtype, sourceSkillId)` as the refresh key. Zero raw `statusEffects.push` sites remain outside the helper.
- **Tick log enrichment** — `tickStatusEffects` now builds per-effect named fragments (e.g. `"Rogue takes 12 poison damage"`, `"Ally regenerates 8 HP (regen)"`) using a `SUBTYPE_DISPLAY_NAME` map for readable battle logs.
- **TickConfig subtype annotations** — `rogue_poison_blade`, `alchemist_healing_salve`, and `harbinger_curse` now declare explicit subtypes in their tickConfig entries; `resolveTickConfig` propagates these and defaults unconfigured DoTs to `poison` / HoTs to `regen`.
- **Module-load validator extended** — `validateTickConfigCoverage` now asserts subtype presence against DOT/HOT subtype sets and validates `stackPolicy` values on load.
- **StatusEffectBadges component added** — New pure presentational component at `src/screens/campaign/components/StatusEffectBadges.tsx` with per-subtype glyph (☠🔥🩸✚⚡🛡▲▼✦) and color maps. Mounted in `BattleScreen.tsx` beneath each player and enemy sprite, showing `turnsRemaining` per effect.

### Dice Animation Crash Fix
- **`getSuccessTier` regression fixed** — `DiceAnimation.tsx` still imported the removed `getSuccessTier` function, throwing `TypeError: getSuccessTier is not a function` on any battle roll. Replaced with inline tier derivation using existing `roll.isCrit` and `roll.rollValue` fields; legacy `DiceRoll.tier` field preserved for replay compat.

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
- **Root cause fixed (Firestore rule mismatch)** — `getActiveSoloCampaign()` queried by `ownerUserId`, but rules only allowed reads via `memberUserIds`. Updated rules to allow owner reads as well, fixing "new solo campaign every app reopen" behavior.
- **Campaign selection intermediary screen** — Added `CampaignSelectScreen` as the new entry point from Companion, with Active/Past segmented filtering, active campaign badge, and quick switch behavior.
- **Single active solo campaign enforcement** — `MAX_ACTIVE_CAMPAIGNS` set to `1` for solo campaign flow.
- **Campaign state restore hardening** — Campaign context now restores from local cache first, verifies with Firestore, and supports explicit `switchCampaign`/`archiveCampaign`.
- **Listener resilience** — Added error handlers to campaign snapshot listeners to prevent uncaught permission-denied listener crashes.
- **Navigation + UX fixes** — Companion now routes to campaign selection first; empty hub state redirects to campaign selection; floating action button respects tab-bar-safe bottom positioning.
- **Indexes/rules deployment parity** — Added/deployed campaign and party indexes needed by new queries.

### Combat Formula Rework (D20 + Damage Dice + Crit Severity)
- **Damage model redesigned** — Replaced double-randomized d20 variance formula with a guaranteed base + damage dice system (d4/d6/d8/d10/d12 by rank) so strategy and stats dominate outcomes.
- **Crit system strengthened** — Crit now uses d12 severity tiers (`minor`, `major`, `devastating`, `perfect`) with stronger multipliers, preserving high-roll excitement.
- **Defense model updated** — Switched to a Pokemon-style defense ratio (`100 / (100 + 2*DEF)`) instead of flat subtraction for smoother scaling across low/high damage skills.
- **Healing updated** — Healing now includes a small dice bonus on top of guaranteed baseline.
- **DoT/HoT predictability improved** — Tick effects now compute and store per-effect `tickValue` at application time for consistent turn planning.
- **Battle logs/records extended** — Added crit severity metadata and expanded dice roll purposes (`damage_dice`, `crit_severity`) for replay/log fidelity.
- **Damage preview updated** — Preview now reflects the new min/avg/max model based on dice + crit baseline assumptions.

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
- **Switch Class action on Hub** — New "Switch Class" button on CampaignHubScreen avatar card. Navigates to ClassPickerScreen in `respec` mode.
- **ClassPickerScreen respec mode** — Reuses the existing class picker. Shows per-class rank badges on each card. Confirms via new `switchClass` context action instead of `createSoloCampaign`.
- **Per-class rank persistence** — New `classRanks` and `classRankXP` maps on `CampaignAvatar`. Switching classes preserves rank progress for every class played. Legacy avatars auto-migrated inside Firestore transactions.
- **`CampaignService.switchClass()`** — Firestore transaction: swaps class, resets stats to new class baseline, rebuilds loadout from new class's unlocked skills, refunds all universal stat points.
- **`CampaignService.awardClassRankXP()`** — Awards XP to the current primary class. Auto-ranks up (multi-level) when threshold met (rank × 10 XP per level, cap rank 10).
- **`CampaignTypes` helpers** — `getClassRankXPThreshold(rank)`, `getAvatarClassRank(avatar, classId)` with legacy fallback.
- **Quest completion now awards class rank XP** — `completeQuest` in CampaignContext calls `awardClassRankXP` when `rewards.classRankXP > 0`.

### Bug Fixes
- **Queueing auto-advance called wrong function** — Manual mode `useEffect` called `executeBattleTurn()` instead of `advanceQueue()` during queueing phase. This caused the engine to pick an auto-action instead of just advancing CT to the next turn. Replaced with dedicated `advanceQueue()` (new context function wrapping `CombatEngine.advanceToNextTurn`).
- **BattleLog nested scroll conflict** — Replaced `FlatList` with `ScrollView` + `.map()` and added `nestedScrollEnabled` to fix scroll interception inside the battle screen's parent ScrollView.

### Hub UI Polish
- **Avatar card layout** — "Allocate Stats" and "Switch Class" buttons in a horizontal row. Class rank display now shows `/10` cap.

### Files Changed
| File | Change |
|---|---|
| `src/services/gamification/CampaignService.ts` | `switchClass()`, `awardClassRankXP()` transactions, legacy migration |
| `src/services/gamification/CampaignTypes.ts` | `classRanks`, `classRankXP` fields; `getClassRankXPThreshold`, `getAvatarClassRank` helpers |
| `src/contexts/CampaignContext.tsx` | `switchClass`, `advanceQueue` exposed; `completeQuest` awards class rank XP |
| `src/screens/campaign/BattleScreen.tsx` | Queueing auto-advance uses `advanceQueue()` instead of `executeBattleTurn()` |
| `src/screens/campaign/ClassPickerScreen.tsx` | Respec mode, rank badges, `switchClass` integration |
| `src/screens/campaign/CampaignHubScreen.tsx` | "Switch Class" button, horizontal card actions, rank `/10` display |
| `src/components/campaign/BattleLog.tsx` | FlatList → ScrollView with `nestedScrollEnabled` |

---

## Campaign Battle UX, Progression Fixes & Endless Mode (Apr 8, 2026)

Beta tester feedback drove three bug fixes, a UX overhaul of the battle system, and a new endless arena mode.

### Bug Fixes
- **SkillBar not visible in manual mode** — After `beginBattle()` set phase to `queueing`, no effect advanced to `player_turn` in manual mode. Added a queueing auto-advance `useEffect` that calls `executeBattleTurn()` to transition immediately.
- **CT queue boxes too tall** — Reduced item width from 52px to 48px, sprites from 32x32 to 24x24, tightened padding, added `maxHeight: 72` on ScrollView.
- **Quest progression blocked** — All quests after #1 gated on `requiredBossesDefeated` (boss spawns require payments). Lowered requirements across all 8 quests and added `totalQuestsCompleted` as an alternative unlock condition.
- **Unknown skill crash** — `getSkillById` didn't include enemy attack skills. Added 10 enemy skill definitions (`ENEMY_SKILLS` array) and updated the lookup.
- **CampaignCompleteModal crash** — Fixed `BlurModal` import (default -> named export).
- **TypeScript errors** — Added type predicate to SkillBar filter for `SkillDefinition` narrowing; cast `BattleResult` to `'victory' | 'defeat'` in `onBattleComplete` event emission.

### Battle UX Overhaul
- **Toggleable auto-battle** — Replaced one-shot "Fast Forward" (which ran entire battle synchronously) with a toggle that steps one turn at a time at 500ms intervals. Player can switch between manual and auto mid-battle.
- **Dice animation slowed** — Default duration increased from 700ms to 1000ms. New `duration` prop on `DiceAnimation` scales all keyframe timings proportionally (auto-battle uses 400ms).
- **Battle summary overlay** — Victory/defeat screen now shows turn count, dice rolls, total damage/healing stats, and a scrollable battle log before navigating away.

### Endless Arena Mode
- New "Endless Arena" card on CampaignHubScreen — infinite waves of enemies with scaling difficulty.
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

## Campaign RPG System — Full Implementation (Apr 5, 2026)

Built the complete campaign RPG system: turn-based combat, class selection, quest board, boss encounters, stat allocation, and campaign archive. 15 new files, 6 modified.

### Phase A: Foundation (Services + Types)
- **`CampaignTypes.ts`** — Full type system: Campaign, CampaignAvatar, CampaignBoss, CampaignQuest, BattleState, QueueUnit, TurnRecord, DiceRoll, StatBlock, ArchiveEntry, 6 primary + 6 secondary class IDs
- **`CampaignDefinitions.ts`** — 6 primary classes (Warrior, Mage, Rogue, Cleric, Ranger, Monk) with stat biases, cost biases, 6 active skills each, 4 passives, 3 rank thresholds. 6 secondary classes (Berserker, Enchanter, Assassin, Paladin, Summoner, Bard) with 2 active + 2 passive. 36+ skill definitions with targeting, CT cost, mana cost, power, elements, status effects
- **`CampaignService.ts`** — Firestore CRUD for campaigns, avatars, bosses, quests, archive. Solo campaign creation, boss generation from expenses (archetype from category, level scaling, trait assignment), quest generation (main/side/bounty), fled rival queries, stat point allocation with `increment()`, archive entries
- **`CombatEngine.ts`** — CT queue (units start at `100 - SPD`, tick to 0, act, reset to ctCost). D20 attack rolls (crit on 18-20, damage variance d20/10). Skill execution with mana costs, cooldowns, targeting (single/all_enemies/all_allies/self). Shield absorption, status effects (burn/poison/regen/stun/haste/slow/atk_up/def_down), auto-battle AI, full battle runner
- **`CampaignContext.tsx`** — React context provider: campaign state, avatar, party, quests, boss management. `startBattle()`, `executeBattleTurn()`, `runAutoBattle()`, `completeQuest()`, `defeatBoss()`, `createSoloCampaign()`. Auto-loads active campaign on auth. Campaign completion detection

### Phase B: Battle Screen + Combat UI (6 components)
- **`BattleUnitSprite`** — Wraps SpriteAnimator for battle context with flip support (scaleX: -1 for enemies). Resolves companion character to SPRITE_REGISTRY asset
- **`CTQueueDisplay`** — Horizontal scroll of unit thumbnails sorted by CT. Mini sprites, HP bars, CT badges. Active unit highlighted
- **`SkillBar`** — Bottom skill button bar with mana cost badges, cooldown overlays. Grey out when insufficient mana
- **`DiceAnimation`** — D20 roll overlay using react-native-reanimated (withSequence/withTiming). Gold highlight for crits (18-20)
- **`BattleLog`** — FlatList of turn descriptions. Color-coded: player=blue, enemy=red, crit=gold, heal=green. Auto-scrolls
- **`BattleScreen`** — Full-screen immersive battle. ImageBackground, all 5 components composed. Per-unit animation states (idle→atk→idle, dying→dead, win). 1200ms turn step delay. Auto-battle fast forward. Victory/Defeat overlay. Tab bar hidden

### Phase C: Hub + Navigation + Roster (4 screens)
- **`CampaignHubScreen`** — Central dashboard: avatar card (sprite, class, level, XP bar), boss status card (HP bar, archetype, traits, "Challenge" button), fled rivals section, quest board link with badge, roster link, archive link. "Start Campaign" CTA when no active campaign
- **`ClassPickerScreen`** — Grid selection of 6 primary + 6 secondary classes. Stat bias and cost display. Create/respec modes
- **`StatAllocationScreen`** — 6 stats (STR/MNA/SPD/HP/DEF/LCK) with +/- buttons. 3 points per level. Delta preview. Confirm writes to Firestore
- **`RosterScreen`** — FlatList of party avatars with expandable stat blocks and equipped skills

### Phase D: Quest Board + Quest Flow (3 screens)
- **`QuestBoardScreen`** — AnimatedSegmentedControl tabs (Main/Side/Bounty). Quest cards with difficulty, status badges, rewards summary
- **`QuestPrepScreen`** — Pre-battle prep: encounters list, party lineup with sprites, rewards preview. "Begin Battle" starts combat. Tab bar hidden
- **`RewardResolutionScreen`** — Post-battle results. Victory: XP/gold/item rewards with claim. Defeat: retry/retreat options. Tab bar hidden

### Phase E: Boss Pipeline UI
- **`RivalBossCard`** — Card component for fled rival bosses with level, archetype, and "Challenge" button
- Boss status integrated into CampaignHubScreen and QuestPrepScreen

### Phase F: Archive + Polish
- **`CampaignArchiveScreen`** — Segmented tabs (All/Bosses/Quests/Milestones). FlatList of archive entries with title, description, date
- **`CampaignCompleteModal`** — BlurModal overlay for campaign completion. Stats summary, "Start New Campaign" / "View Archive" buttons

### Infrastructure Changes
- **`App.js`** — Wrapped Navigation in `<CampaignProvider>`
- **`types.ts`** — Added 9 campaign screen params to CompanionStackParamList
- **`CompanionTabNavigator.tsx`** — Registered all 9 campaign screens
- **`CompanionScreen.tsx`** — Added Campaign ActionCard
- **`appEvents.ts`** — Added campaign event types (BOSS_DEFEATED, QUEST_COMPLETED, CAMPAIGN_COMPLETED)

### Files Changed
| File | Change |
|---|---|
| `src/services/gamification/CampaignTypes.ts` | **NEW** — Campaign RPG type system |
| `src/services/gamification/CampaignDefinitions.ts` | **NEW** — Class, skill, and passive definitions |
| `src/services/gamification/CampaignService.ts` | **NEW** — Firestore campaign CRUD + generation |
| `src/services/gamification/CombatEngine.ts` | **NEW** — CT queue combat engine |
| `src/contexts/CampaignContext.tsx` | **NEW** — Campaign state provider |
| `src/components/campaign/BattleUnitSprite.tsx` | **NEW** — Battle sprite wrapper |
| `src/components/campaign/CTQueueDisplay.tsx` | **NEW** — Turn queue display |
| `src/components/campaign/SkillBar.tsx` | **NEW** — Skill button bar |
| `src/components/campaign/DiceAnimation.tsx` | **NEW** — D20 roll overlay |
| `src/components/campaign/BattleLog.tsx` | **NEW** — Turn log display |
| `src/components/campaign/RivalBossCard.tsx` | **NEW** — Rival boss card |
| `src/components/campaign/CampaignCompleteModal.tsx` | **NEW** — Completion modal |
| `src/screens/campaign/BattleScreen.tsx` | **NEW** — Full battle screen |
| `src/screens/campaign/CampaignHubScreen.tsx` | **NEW** — Campaign dashboard |
| `src/screens/campaign/ClassPickerScreen.tsx` | **NEW** — Class selection |
| `src/screens/campaign/StatAllocationScreen.tsx` | **NEW** — Stat allocation |
| `src/screens/campaign/RosterScreen.tsx` | **NEW** — Party roster |
| `src/screens/campaign/QuestBoardScreen.tsx` | **NEW** — Quest board |
| `src/screens/campaign/QuestPrepScreen.tsx` | **NEW** — Quest prep |
| `src/screens/campaign/RewardResolutionScreen.tsx` | **NEW** — Battle results |
| `src/screens/campaign/CampaignArchiveScreen.tsx` | **NEW** — Campaign archive |
| `App.js` | Added CampaignProvider |
| `src/navigation/types.ts` | Added 9 campaign screen params |
| `src/navigation/CompanionTabNavigator.tsx` | Registered 9 campaign screens |
| `src/screens/companion/CompanionScreen.tsx` | Added Campaign ActionCard |
| `src/utils/appEvents.ts` | Added campaign event types |

---

## Isometric Tile Map — Interaction Fixes & Architecture Refactor (Apr 3, 2026)

Fixed three tile-interaction bugs in the isometric town map and refactored the projection math into a single-source-of-truth module.

### Bug 1: Wrong tile highlighted when tapping near diamond edges
- **Root cause**: `screenToGrid` used `Math.floor` to snap fractional grid coordinates to integers, creating rectangular selection regions that don't align with the diamond-shaped tiles. Taps near the pointy tips of a diamond would snap to the wrong tile.
- **Fix**: Replaced `Math.floor` with `Math.round` in the inverse projection. This creates selection regions that closely approximate the diamond shape. Additionally added a 4-candidate diamond containment check (floor and floor+1 for both row/col) with taxicab-distance validation for geometrically exact selection at tile boundaries.

### Bug 2: Unresponsive taps on pannable/zoomable surface
- **Root cause**: Tap gesture had `maxDuration(300)` — users pressing deliberately on an interactive map easily exceeded 300ms. Pan gesture `minDistance(10)` also swallowed taps with slight finger drift.
- **Fix**: Increased tap `maxDuration` to 500ms; increased pan `minDistance` to 15px.

### Bug 3: Only left-side isometric tiles responded to taps
- **Root cause**: The `GestureDetector` was attached to the `Animated.View` that had scale/translate transforms applied. The map Canvas (640×460px for an 8×8 grid) is wider than the phone screen (~390px). When the animated transform scales the view down (~0.55×), the platform's native hit-testing inverse-transforms tap coordinates back to the view's local space. Taps on the right portion of the screen mapped to local coordinates beyond the view's 390px bounds, so the platform rejected them before RNGH could process them. Skia renders correctly regardless (GPU-direct), which is why right-side tiles were visible but not tappable.
- **Fix**: Separated rendering from gesture detection into two layers:
  - **Render layer**: `Animated.View` with `pointerEvents="none"` — handles visual zoom/pan transforms, passes all touches through
  - **Gesture layer**: Plain `View` with `collapsable={false}` — static full-screen overlay with no transforms, receives touches across the entire screen
  - The hit-test worklet continues to use `e.absoluteX/Y` with the inverse transform math, which is correct since the gesture view occupies the full window with no transforms applied.

### Projection Refactor: `tileProjection.ts`
- **New file** `src/components/town/tileProjection.ts` — single source of truth for all isometric coordinate math: `gridToScreen`, `screenToGrid`, `isPointInDiamond`, `hitTestTile`, `computeMapDimensions`, `getInitialFitTransform`. All arithmetic functions tagged `'worklet'` for dual JS/UI thread use.
- **`isometricUtils.ts`** — stripped of all coordinate math and constants; now imports from `tileProjection.ts` and re-exports for backward compatibility. Retains `buildTileCells` and `buildRenderList` (asset-dependent).
- **`useMapGestures.ts`** — hit-test logic inlined in the tap worklet with hardcoded literal constants (`HW=40`, `HS=20`) to avoid Reanimated Babel plugin issues with derived cross-module constant capture. Uses diamond-accurate 4-candidate checking.
- **`IsometricTileMap.tsx`** — accepts `mapDims` prop (no longer computes internally), imports from `tileProjection.ts`.
- **`TownScreen.tsx`** — uses `buildTileCells` for both occupancy checks and rendering (eliminated redundant `buildTownGrid` call); replaced stale `Dimensions.get('window')` module-scope constants with dynamic `screenSize` state.

### Files Changed
| File | Change |
|---|---|
| `src/components/town/tileProjection.ts` | **NEW** — Centralized projection math module |
| `src/components/town/isometricUtils.ts` | Stripped to grid/render builders; re-exports from tileProjection |
| `src/components/town/useMapGestures.ts` | Inlined diamond hit-test; removed cross-module worklet import |
| `src/components/town/IsometricTileMap.tsx` | Accepts `mapDims` prop; imports from tileProjection |
| `src/screens/companion/TownScreen.tsx` | Two-layer render/gesture architecture; unified grid model |

---

## Town Building — Phase 2: Isometric Tile Map (Apr 3, 2026)

Replaced the icon-based flat grid with a full isometric tile map renderer using Skia Canvas and pixel art assets from `assets/miniatureworld/`. Added pan/zoom gestures and tap-to-place building placement.

### Isometric Renderer
- Skia Canvas renders 32×32 pixel art tiles at 2.5× scale (80×80dp) in isometric projection
- Painter's algorithm: iterates rows back-to-front, columns left-to-right, rendering terrain → decorations → buildings per cell
- 31 assets preloaded via fixed-count `useImage()` hook (hooks-safe, same pattern as `useCharacterImages.ts`)
- Grass tile variety: alternates `Grass Block 1` / `Grass Block 2` based on `(row + col) % 3`

### Pan / Zoom / Tap Gestures
- **Pinch-to-zoom** toward focal point, clamped [0.3×, 4.0×]
- **Pan** to drag the map freely
- **Tap** an empty tile to select it for building placement (diamond highlight overlay)
- **Double-tap** to reset view to initial fit-to-screen
- Gesture composition: `Gesture.Simultaneous(Pinch, Simultaneous(Pan, Exclusive(DoubleTap, Tap)))`

### Tap-to-Place Building Placement
- Replaces auto-sequential placement — users now choose where to build
- Tap empty tile → diamond highlight + "Tile selected" bar → pick building from shop → confirm → building placed at chosen cell
- Shop buttons show "Select tile" prompt when no tile is selected
- `purchaseTownBuilding()` now accepts optional `targetGridIndex` parameter (backward-compatible)
- `buildTownGrid()` updated to use each building's `gridIndex` field instead of array position

### Asset Mapping (27 buildings → pixel art sprites)
- **Buildings** → House/Tower/Market sprites from `Without outline/Houses/`
- **Infrastructure** → Terrain tiles (Dirt, Path, Rock) replace the grass tile
- **Fences/Decorations** → Small sprites (Barrel, Well, Sign, Bush, Fence) centered on tile diamond
- **Companion Fixtures** → Box, Stump, Wide House sprites

### Files
| File | Action |
|---|---|
| `src/components/town/tileMapTypes.ts` | **NEW** — TypeScript types: `TileCell`, `RenderItem`, `MapDimensions`, `TileAssetDef` |
| `src/components/town/tileAssetRegistry.ts` | **NEW** — 31-asset registry mapping building IDs/terrain to PNGs + `useTileMapImages()` preloader hook |
| `src/components/town/isometricUtils.ts` | **NEW** — `gridToScreen`, `screenToGrid`, `buildRenderList`, `hitTestTile`, `getInitialFitTransform`, `buildTileCells` |
| `src/components/town/IsometricTileMap.tsx` | **NEW** — Skia Canvas component: layered rendering, selection highlight, gesture integration |
| `src/components/town/useMapGestures.ts` | **NEW** — Pan/pinch/tap/double-tap gesture hook (gesture-handler + reanimated) |
| `src/services/gamification/TownService.ts` | `buildTownGrid()` uses `gridIndex` field; `purchaseTownBuilding()` accepts `targetGridIndex` |
| `src/contexts/GamificationContext.tsx` | `purchaseTownBuilding` wrapper passes `targetGridIndex` through |
| `src/screens/companion/TownScreen.tsx` | Full rewrite: isometric map + tap-to-place flow + selection state |

---

## Town Building — Phase 1 (Apr 2, 2026)

Implemented Town Building feature (COMPANIONS.md §3.10 Phase 1) — visual tile grid where users spend gold on buildings to grow their town. The retention loop: earn gold (expeditions, adventure map, quests) → spend gold on buildings → see town grow → return to earn more.

### Town Grid
- Dark-themed (`#1a1a2e`) tile grid with auto-placement (left-to-right, top-to-bottom)
- Grid expands with tier progression: 4×4 → 6×6 → 8×8 → 10×10 → 12×12
- MaterialCommunityIcons as placeholder building sprites (pixel art assets deferred)
- Empty cells show subtle grass icons; occupied cells show building icon in its theme color

### Tier Progression
| Tier | Name | Gold Threshold | Grid |
|------|------|----------------|------|
| 1 | Hamlet | 0g | 4×4 (16 cells) |
| 2 | Village | 500g | 6×6 (36 cells) |
| 3 | Township | 1500g | 8×8 (64 cells) |
| 4 | Town | 3500g | 10×10 (100 cells) |
| 5 | City | 7000g | 12×12 (144 cells) |

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
- Town action card subtitle now shows dynamic info: "Hamlet · 3 buildings" (or default text if empty)

### Files
| File | Action |
|---|---|
| `src/services/gamification/ExpeditionTypes.ts` | Added 6 new types (TownBuildingCategory, TownBuildingDefinition, PlacedBuilding, TownState, TownTier, TownPurchaseResult) |
| `src/services/gamification/TownService.ts` | **NEW** — Building definitions, tier definitions, `purchaseTownBuilding()`, `buildTownGrid()`, `getBuildingDef()` |
| `src/utils/appEvents.ts` | Added `TOWN_BUILDING_PURCHASED` event + interface |
| `src/contexts/GamificationContext.tsx` | Added town state derivation (`townState`, `townBuildings`, `townTotalGoldSpent`, `currentTownTier`) + `purchaseTownBuilding` callback |
| `src/screens/companion/TownScreen.tsx` | Full rewrite: placeholder → grid + tier banner + building shop |
| `src/screens/companion/CompanionScreen.tsx` | Dynamic Town card subtitle |

---

## Adventure Map — Full-Screen Fix (Apr 2, 2026)

### AdventureMapScreen — Tab Bar Hidden for Immersive Layout

The Adventure Map screen was being obscured by the bottom tab bar (height 90dp, `position: absolute`) because it sits inside the `CompanionTabNavigator` NativeStack which is itself nested inside the bottom `Tab.Navigator`.

**Fix:** Added a `useFocusEffect` hook in `AdventureMapScreen.tsx` that calls `navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })` on focus to hide the tab bar, and restores it via the cleanup function on blur/back-navigation.

- No navigation restructuring required — fix is self-contained within the screen
- Tab bar is restored automatically when the user presses "Leave Adventure" or navigates back
- Consistent with the intended full-screen immersive experience of the idle battle loop

---

## Gamification System — Implemented (Feb 25–26, 2026)

Introduces a Duolingo-inspired engagement loop to reward users for financial responsibility actions (creating expenses, settling debts, maintaining activity streaks). All gamification calls are fire-and-forget — never blocking critical payment/expense flows.

### New Firestore Collections
- `userGameProfiles/{userId}` — XP, level, streak, lastActiveDate
- `userAchievements/{docId}` — earned badges per user
- `xpLedger/{docId}` — idempotency-safe XP award log (prevents double-awards)
- `achievementDefinitions/{achievementId}` — static badge definitions (auto-seeded on first boot)

### New Source Files
- `src/services/GamificationService.js` — `awardXP`, `checkAndAwardAchievements`, `updateStreak`, `getGroupLeaderboard`, `seedAchievementDefinitions`
- `src/contexts/GamificationContext.js` — real-time XP/streak/achievement subscriptions, `addXP` helper, auto-seed of achievement definitions
- `src/components/XPToast.js` — floating "+25 XP" toast after qualifying actions
- `src/components/AchievementUnlockModal.js` — full-screen celebration modal with 22-particle confetti (RN Animated)
- `src/components/StreakDisplay.js` — compact 🔥 streak counter for HomeScreen header
- `src/components/QuestProgressWidget.js` — collapsible XP milestone progress card for HomeScreen
- `src/components/GroupLeaderboardWidget.js` — group members ranked by payments settled count
- `src/screens/300_SettingsScreen/AchievementsScreen.js` — achievement gallery (locked/unlocked, 2-column grid)

### Modified Files
- `src/utils/appEvents.js` — added `GAMIFICATION_XP_AWARDED`, `GAMIFICATION_ACHIEVEMENT_UNLOCKED` events
- `App.js` — added `GamificationProvider` after `TransactionsProvider`
- `src/navigation/index.js` — registered `AchievementsScreen` in SettingsStack; mounted XPToast + AchievementModal as navigation-level overlays; added onboarding XP hook (+30 XP on currency onboarding complete/skip)
- `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js` — fires `addXP` after `createExpense` (+50 first, +10 subsequent)
- `src/screens/PaymentRecordingScreen.js` — fires `addXP` after payment lifecycle completes (+25 full, +10 partial)
- `src/screens/250_SettlementScreen/SettlementScreen.js` — fires `addXP` after CASH `approvePayment` (+25), `checkAndAwardAchievements` (settler, prompt_payer), `updateStreak`
- `src/screens/GroupCreationScreen.js` — fires `addXP` after first group created (+50)
- `src/screens/000_HomeScreen/HomeScreen.js` — added `StreakDisplay` in header row + `QuestProgressWidget` below hero
- `src/components/GroupStatsTab.js` — added `GroupLeaderboardWidget` as first section above settlement ring
- `src/screens/300_SettingsScreen/SettingsScreen.js` — enhanced profile card (level badge overlay, gamification stat row, mini XP progress bar) + new "Progress" section with Achievements navigation

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
