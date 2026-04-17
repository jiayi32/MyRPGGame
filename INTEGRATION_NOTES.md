# INTEGRATION_NOTES — Phase 2 Surgery Checklist

This document is the runbook for **removing the RPG layer from the expense app** after Phase 1 staging is complete. Every item below describes a change to apply to the live `src/` tree (or related root-level files) so the expense app reclaims its identity. The corresponding sources are already preserved in this `RPG_CODE_FOLDER/`.

> Reference: User has confirmed the expense app retains only **XP / levels / streaks** and **cosmetics**. Achievements, daily quests, and the companion widget on HomeScreen are NOT retained.

---

## 1. Provider wiring — `App.js`

Currently wraps:
```
<GamificationProvider>
  <CampaignProvider>
    <Navigation />
  </CampaignProvider>
</GamificationProvider>
```

**Action:**
- Remove `<CampaignProvider>` entirely (along with the import).
- Keep `<GamificationProvider>` but it will be backed by a trimmed context (see §6).

---

## 2. Navigation — `src/navigation/index.tsx`

| Line (approx) | Current | Action |
|---|---|---|
| ~57 | `import CompanionTabNavigator from "./CompanionTabNavigator";` | **Delete** |
| ~68 | `import { isExpeditionComplete } from "../services/gamification/ExpeditionService";` | **Delete** |
| ~72-75 | imports of GoldToast / ExpeditionLootModal / LootDropToast / WeeklyXPSummaryModal / AchievementUnlockModal | **Delete** all except XPToast and LevelUpModal |
| ~277 | `isExpeditionComplete(...)` badge usage on Companion bottom-tab icon | **Delete** the whole tab (see ~373) |
| ~373 | `<Tab.Screen name="CompanionTab" component={CompanionTabNavigator} ... />` | **Delete** the entire tab registration |
| ~708-715 | overlay renders for GoldToast / ExpeditionLootModal / LootDropToast / WeeklyXPSummaryModal / AchievementUnlockModal | **Delete** these — keep only `<XPToast />` and `<LevelUpModal />` |

---

## 3. Route types — `src/navigation/types.ts`

Delete the entire `CompanionStackParamList` type block (~lines 106-125 at staging time) and any references to it elsewhere in the file. The 17 routes to drop:

```
CompanionScreen, CompanionSelect, ExpeditionScreen, ShopScreen, TownScreen,
AdventureMapScreen, CampaignSelectScreen, CampaignHubScreen, ClassPickerScreen,
StatAllocationScreen, RosterScreen, GearScreen, BattleScreen, QuestBoardScreen,
QuestPrepScreen, RewardResolutionScreen, CampaignArchiveScreen
```

---

## 4. Files / directories to delete from `src/`

**Whole directories (delete recursively):**
- `src/screens/campaign/` (and its `components/` subfolder)
- `src/screens/companion/`
- `src/components/campaign/`
- `src/components/companion/`
- `src/components/town/`

**Individual files:**
- `src/contexts/CampaignContext.tsx`
- `src/navigation/CompanionTabNavigator.tsx`
- `src/screens/settings/CompanionSelectScreen.tsx`
- `src/screens/settings/AchievementsScreen.tsx` (achievements not retained)
- `src/components/DailyQuestsCard.tsx` (daily quests not retained)
- `src/components/AchievementUnlockModal.js` (achievements not retained)
- `src/components/QuestProgressWidget.js` (daily quests not retained)
- `src/components/WeeklyXPSummaryModal.tsx` (RPG-flavored — verify before delete)
- `src/components/GoldToast.tsx`
- `src/components/LootDropToast.tsx`
- `src/components/ExpeditionLootModal.tsx`
- `src/components/GoldDisplay.tsx` (used only by RPG screens — verify with grep before delete)
- `src/components/XPMultiplierBanner.tsx` (verify with grep — if unused after the trim, delete)

**RPG-only services in `src/services/gamification/` (delete):**
- `CampaignDefinitions.ts`
- `CampaignService.ts`
- `CampaignTypes.ts`
- `CampaignUnitBuilder.ts`
- `CombatEngine.ts`
- `ExpeditionService.ts`
- `ExpeditionTypes.ts`
- `GearAbilityDefinitions.ts`
- `GearDefinitions.ts`
- `GearMath.ts`
- `TownService.ts`

**Keep in `src/services/gamification/`** (but trim — see §6):
- `GamificationService.ts`
- `awardKeyHelpers.ts`

---

## 5. Cross-reference surgery (consumers of RPG hooks)

These files import from the RPG layer and need targeted edits:

### `src/screens/home/HomeScreen.tsx`
- Lines ~42-43: imports `CompanionWidgetCompact` and `useCompanionState`. **Remove both imports** and the JSX that renders the widget. (User confirmed companion widget is NOT retained.)

### `src/screens/expenses/ExpenseFlowWizard/useExpenseFlowState.ts`
- Lines ~26-27: `useGamification` and `updateStreak` / `checkAndAwardAchievements`. **Keep** `useGamification` and `updateStreak` (XP and streak are retained). **Remove** `checkAndAwardAchievements` calls.

### `src/screens/groups/GroupCreationScreen.tsx`
- Uses `useGamification` to award XP for group creation. **Keep** XP awarding. Verify it does not call achievement-related functions.

### `src/screens/settle-up/GroupBalancesScreen.tsx`
- Uses `useGamification`. **Keep** any XP/streak awarding. Remove any gold/expedition references.

### `src/screens/settle-up/InlinePaymentPanel.tsx`
- Same as above — keep XP/streak, drop gold/expedition.

### `src/components/QuickSplitSheet.tsx`
- Same — keep XP/streak only.

### `src/screens/settings/SettingsScreen.tsx`
- May reference level/XP UI. **Keep** level/XP rendering. Remove navigation entry to `Achievements` screen.

### `src/screens/settings/CosmeticGalleryScreen.tsx`
- **Keep** the file. Cosmetics are retained.

### `src/utils/appEvents.ts`
- Remove campaign-specific event types: `BOSS_DEFEATED`, `QUEST_COMPLETED`, `CAMPAIGN_COMPLETED`, `TOWN_BUILDING_PURCHASED`, `EXPEDITION_COMPLETED`, `LOOT_DROPPED`, `GAMIFICATION_ACHIEVEMENT_UNLOCKED` (achievements dropped). Keep `GAMIFICATION_XP_AWARDED`.

### `src/components/GroupStatsTab.tsx` (or `.js`)
- May render `GroupLeaderboardWidget`. The leaderboard is XP-based — **keep** it (it queries `userGameProfiles`, not the campaign collections).

---

## 6. Mixed file trim — `src/contexts/GamificationContext.tsx`

The full version is preserved in `RPG_CODE_FOLDER/src/contexts/GamificationContext.tsx`. In the live `src/` copy, **keep**:

- `xp`, `level`, `streak`, `longestStreak`, `lastActiveDate` state
- `addXP()` function and the local optimistic delta logic
- `localXPDelta` and reset-on-snapshot
- `email` sync to `userGameProfiles` on login
- Cosmetic state (equipped cosmetic id, cosmetic lookup helpers)
- Title state (if used by SettingsScreen profile card)
- The `userGameProfiles` Firestore subscription
- The `xpLedger` write path (still needed for idempotency)

**Remove**:
- `gold`, `localGoldDelta`, `addGold()`, `clearGoldToast()`
- `expedition`, `handleStartExpedition()`, `handleResolveExpedition()`, `handleClearExpedition()`
- `townState`, `townBuildings`, `townTotalGoldSpent`, `currentTownTier`, `vaultStatus`, `handlePurchaseTownBuilding()`, `handlePurchaseTierUpgrade()`, `handleDemolishBuilding()`, `handleClaimVaultGold()`
- `ownedShopItems`, shop-related callbacks
- `streakFreezes` (RPG concept — base streak doesn't need freezes)
- `dailyQuestProgress` state and quest hooks
- `achievements` state + `hasAchievement()` + `checkAndAwardAchievements()` wiring
- All loot drop event listeners
- All imports of `ExpeditionService`, `TownService`, `CampaignService`, `CombatEngine`

---

## 7. Mixed file trim — `src/services/gamification/GamificationService.ts`

Full version preserved in `RPG_CODE_FOLDER/src/services/gamification/GamificationService.ts`. In the live copy, **keep**:

- `awardXP(userId, delta, reason, referenceId, referenceType, groupId)`
- `calculateLevel(xp)` and the level threshold table
- `updateStreak(userId)`
- `seedAchievementDefinitions()` — **delete** unless cosmetics seeding needs the same pattern (verify)
- The 10 XP award constants used by retained call sites: `expense_first`, `expense_create`, `settle_full`, `settle_partial`, `create_group_first`, `onboarding_complete`, `streak_7_day` (drop the rest)
- Cosmetic helpers (if any exist here vs. in a separate `CosmeticService`)

**Remove:**
- `checkAndAwardAchievements()` and all achievement check logic
- All references to `ExpeditionService`, `TownService`, `CampaignService`, `CombatEngine`
- Daily quest resolution logic
- Loot drop / gold helpers
- `getGroupLeaderboard()` — **verify**: if `GroupLeaderboardWidget` still uses it, keep it (queries `userGameProfiles`, not campaign data)

---

## 8. Firestore — `firestore.rules`

The current rules block (lines 358-548 at staging time) covers a mix of retained and dropped collections. After Phase 2, the file should keep:

- `userGameProfiles` (XP/level/streak/cosmetic)
- `xpLedger` (idempotency for XP awards)
- `gameConfig` (read-only multiplier window — retain only if the expense app uses XP multipliers; otherwise drop)

**Drop these match blocks:**
- `userAchievements/{achievementId}`
- `goldLedger/{entryId}`
- `rewardIdempotency/{entryId}`
- `achievementDefinitions/{defId}`
- `dailyQuestProgress/{docId}`
- The entire `campaigns/{campaignId}` block (lines 502-548) including all 5 subcollection rules: `avatars`, `bosses`, `quests`, `battles`, `archive`

---

## 9. Firestore — `firestore.indexes.json`

After Phase 2, drop these indexes:

- `userAchievements` (`userId ASC + unlockedAt DESC`)
- `goldLedger` (`userId ASC + createdAt ASC`)
- Both `campaigns` indexes
- Both `parties` indexes (party system was already removed, these are stale anyway)

**Keep:**
- Both `xpLedger` indexes (idempotency guard + chronological feed)

---

## 10. Assets — physically move (not in Phase 1)

These are referenced by RPG code and should be moved to the spinoff repo during Phase 2. They were **not** copied into `RPG_CODE_FOLDER/` to save disk space.

| Source path | Notes |
|---|---|
| `assets/sprites/companions/` | 24 character folders, ~880 files (PNG + JSON sprite sheets + GIF previews). Characters: AceWild, EdwardFMA, KingMont, Lenneth, LightningOdin, LightningX1/X2/X3, Nier2B, Nier9S, NierA2, Olberic, Primrose, RainDemon, RainKing, RainNormal, RoyNV, Serah, Therion, Tilith, Tressa, WOL, Yshtola |
| `assets/sprites/Backgrounds/` | Battle environment backgrounds (`battle_bg_*.jpg`) |
| `assets/miniatureworld/` | Isometric tiles + town buildings (Tiles/, Without outline/Houses/, Decorations/, Objects/, Fences) |

**Process for Phase 2:**
1. Copy these directories into `RPG_CODE_FOLDER/assets/` (or directly into the spinoff repo).
2. Delete from `assets/` in the expense app.
3. Search the expense-app source for any `require("../assets/sprites/...")` or `require("../assets/miniatureworld/...")` and confirm there are zero matches outside of files already deleted in §4.

---

## 11. CHANGELOG.md cleanup

The 8 RPG sections are preserved in `documentation/changelog-rpg-extracts.md` here. In the main expense-app `documentation/core_docs/CHANGELOG.md`, the recommended approach is to **delete those sections** (they describe features no longer present) and add a single one-line note at the top: *"April 2026 RPG/Campaign work was spun off into a separate repository — see RPG spinoff repo for those changelogs."*

Sections to delete from `CHANGELOG.md`:
- Status Effect Depth & Dice Regression Fix (Apr 13-14, 2026)
- Campaign Persistence, Selection Hub & Combat Formula Rework (Apr 11-12, 2026)
- Class Switching, Class Rank XP & Battle Fixes (Apr 9, 2026)
- Campaign Battle UX, Progression Fixes & Endless Mode (Apr 8, 2026)
- Campaign RPG System — Full Implementation (Apr 5, 2026)
- Isometric Tile Map — Interaction Fixes & Architecture Refactor (Apr 3, 2026)
- Town Building — Phase 2: Isometric Tile Map (Apr 3, 2026)
- Town Building — Phase 1 (Apr 2, 2026)
- Adventure Map — Full-Screen Fix (Apr 2, 2026)
- Gamification System — Implemented (Feb 25–26, 2026) — **modify rather than delete**: trim down to mention only the XP/streak/cosmetic features being retained.

---

## 12. Documentation cleanup

Delete or move out of `documentation/`:

- `documentation/integration/EXPENSERPG.md` (canonical RPG product spec)
- `documentation/future/COMBATSYSTEM.md`
- `documentation/future/COMPANIONS.md`
- `documentation/redundant/records/GAMIFICATION_IMPLEMENTATION_PLAN.md` (already in records, can be left as historical)
- `documentation/redundant/records/PARTY_FLOW_*.md` (party system was already removed)
- `documentation/redundant/records/PHASE_1.6_PARTY_CONTACTS.md`

In `documentation/architecture/FIRESTORE_SCHEMA.md`, the gamification section (lines 625-751 at staging time) should be **trimmed** to describe only `userGameProfiles` and `xpLedger` (drop the `userAchievements` and `achievementDefinitions` sections).

---

## 13. Smoke test after Phase 2

After all the above, the expense app should:

1. Boot without runtime errors. The `GamificationProvider` should still subscribe to `userGameProfiles`.
2. Show no Companion tab in the bottom navigation.
3. Award XP on expense creation and payment settlement (via the retained `awardXP` path).
4. Display the user's level/XP on the Settings profile card.
5. Have no broken imports — `npm run typecheck` (or `tsc --noEmit`) must pass.
6. Pass the `useExpenseFlowState` and `GamificationContext` test suites.

If any cross-reference was missed, TypeScript/runtime errors will surface them. Search for the deleted symbols (`CampaignContext`, `useCampaign`, `CombatEngine`, `ExpeditionService`, `TownService`, `CompanionWidgetCompact`, `useCompanionState`, `checkAndAwardAchievements`) to confirm zero references remain.
