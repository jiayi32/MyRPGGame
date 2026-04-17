# Gamification System — Implementation Plan

**Status**: ✅ Fully implemented (Feb 25–26, 2026)
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

> Full schema in `documentation/architecture/FIRESTORE_SCHEMA.md` → "Gamification Data Model" section.

| Collection | Purpose |
|-----------|---------|
| `userGameProfiles/{userId}` | XP, level, streak, lastActiveDate, counters |
| `userAchievements/{docId}` | Earned badges per user (top-level, not subcollection) |
| `xpLedger/{docId}` | Append-only XP award log — idempotency guard |
| `achievementDefinitions/{achievementId}` | Static badge metadata — seed once, read-only |

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
**Level thresholds**: 0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000 XP → Lv.1–10

---

## Achievement Badges (9)

| ID | Title | Icon | Category | Condition |
|----|-------|------|----------|-----------|
| `first_step` | First Step | `walk` | expense | First expense created |
| `settler` | Settler | `handshake` | payment | First full payment settlement |
| `group_founder` | Group Founder | `account-group` | social | First group created |
| `squad_goals` | Squad Goals | `account-multiple-plus` | social | Group with 5+ members |
| `big_spender` | Big Spender | `cash-multiple` | expense | Expense ≥ $100 equivalent |
| `on_a_roll` | On a Roll | `fire` | streak | 7-day active streak reached |
| `century_club` | Century Club | `lightning-bolt` | streak | 100 XP total |
| `globetrotter` | Globetrotter | `earth` | expense | First multi-currency transaction |
| `prompt_payer` | Prompt Payer | `clock-fast` | payment | Payment within 24h of expense creation |

---

## Task List (Phased)

### Phase 1 — Foundation ✅ Complete

- [x] **1a** — `src/utils/appEvents.js`: Add two event constants *(~5 min)*
  ```javascript
  GAMIFICATION_XP_AWARDED: 'gamification:xpAwarded',
  GAMIFICATION_ACHIEVEMENT_UNLOCKED: 'gamification:achievementUnlocked',
  ```

- [x] **1b** — Create `src/services/GamificationService.js` *(~2h)*
  - `XP_AWARDS` constants object
  - `QUEST_MILESTONES = [20, 50, 100, 250, 500, 1000]`
  - `LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000]`
  - `initUserGameProfile(userId)` — create doc if missing with all-zero defaults
  - `awardXP(userId, xpDelta, reason, referenceId, referenceType, groupId?)` — idempotency check → Firestore transaction → emit event
  - `checkAndAwardAchievements(userId, triggerEvent, context)` — check defs vs earned → write new → emit events
  - `updateStreak(userId)` — compare `lastActiveDate` vs today → increment/reset → award 7-day bonus
  - `getGroupLeaderboard(groupId, memberIds)` — count payments by fromUserId → fetch profiles → return ranked array
  - `loadAchievementDefinitions()` — one-time `getDocs` of `achievementDefinitions`

- [x] **1c** — Seed `achievementDefinitions` collection in Firestore (9 documents, one per badge) *(~30 min)*
  - Auto-seeded on first boot by `GamificationContext` (detects empty Firestore collection and calls `seedAchievementDefinitions()`). No manual step required.

- [x] **1d** — Create `src/contexts/GamificationContext.js` *(~1.5h)*
  - `useAuth()` dependency only (not TransactionsContext)
  - `onSnapshot` listener on `userGameProfiles/{userId}`
  - `onSnapshot` listener on `userAchievements` where `userId == uid`
  - One-time `getDocs` on `achievementDefinitions`
  - `AppEvents.on(GAMIFICATION_XP_AWARDED)` → `pendingXPToast` state
  - `AppEvents.on(GAMIFICATION_ACHIEVEMENT_UNLOCKED)` → `pendingAchievement` state
  - Anonymous user guard: if `user?.isAnonymous || !user?.uid`, set `loading = false` and return early
  - Exported: `{ xp, level, streak, achievements, achievementDefs, currentMilestone, previousMilestone, pendingXPToast, pendingAchievement, addXP, clearXPToast, clearAchievementModal, hasAchievement(id), loading }`

- [x] **1e** — `App.js`: Wrap `<GamificationProvider>` inside `<TransactionsProvider>` *(~5 min)*
  ```jsx
  <TransactionsProvider>
    <GamificationProvider>
      <Navigation />
    </GamificationProvider>
  </TransactionsProvider>
  ```

- [x] **1f** — Smoke test: boot app, confirm no errors, confirm `userGameProfiles/{uid}` doc created on first login

---

### Phase 2 — XP Integration Hooks ✅ Complete

- [x] **2a** — `src/screens/PaymentRecordingScreen.js` *(~30 min)*
  - After the `createPaymentApplications` loop completes (before `AppEvents.emit(PAYMENT_COMPLETED)`)
  - Determine if full or partial payment by comparing `totalInBaseCurrency` vs total owed
  - Call `addXP(isFullPayment ? 25 : 10, isFullPayment ? 'settle_full' : 'settle_partial', ...)`
  - Call `GamificationService.checkAndAwardAchievements(user.uid, APP_EVENTS.PAYMENT_COMPLETED, { isFullPayment, amount, groupId }).catch(console.warn)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2b** — `src/screens/250_SettlementScreen/SettlementScreen.js` *(~20 min)*
  - Inside `handleConfirm()`, after `createPaymentApplications` resolves (CASH approve path)
  - Call `addXP(25, 'settle_full_cash_approved', payment.id, 'payment', groupId)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2c** — `src/screens/ExpenseFlowWizard/ExpenseFlowWizard.js` *(~30 min)*
  - After `createExpense()` returns `expenseId` (around line 800)
  - Check `hasAchievement('first_step')` to determine bonus vs normal XP
  - Call `addXP(isFirst ? 50 : 10, isFirst ? 'expense_first' : 'expense_create', expenseId, 'expense', groupId)`
  - Call `GamificationService.checkAndAwardAchievements(user.uid, APP_EVENTS.EXPENSE_STATUS_CHANGED, { expenseId, groupId, isFirstExpense: isFirst, isMultiCurrency }).catch(console.warn)`
  - Call `GamificationService.updateStreak(user.uid).catch(console.warn)`

- [x] **2d** — `src/screens/GroupCreationScreen.js` *(~20 min)*
  - After `GroupService.createGroup()` returns `groupId`
  - Check `hasAchievement('group_founder')` for one-time bonus
  - If first group: `addXP(50, 'create_group_first', groupId, 'group', groupId)`
  - Call `GamificationService.checkAndAwardAchievements(...).catch(console.warn)`

- [x] **2e** — `src/navigation/index.js` onboarding `onComplete` callback *(~10 min)*
  - After `updatePreferredCurrency` resolves
  - Call `awardXP(user.uid, 30, 'onboarding_complete', user.uid + '_onboarding', 'onboarding', null).catch(console.warn)`
  - Also fires in `onSkip` callback (both represent onboarding completion)

- [x] **2f** — Verify: Perform a test expense creation and payment → confirm `userGameProfiles.xp` increments in Firestore, `xpLedger` entry written, no double-award on second action with same expenseId

---

### Phase 3 — UI Components ✅ Complete

- [x] **3a** — Create `src/components/XPToast.js` *(~1h)*
  - `Animated.View` with `position: absolute`, `bottom: 120`, `alignSelf: center`
  - Content: `⚡ +25 XP` in `rgba(66,0,255,0.9)` pill with white text
  - Animation sequence: slide up 24px + fade in (300ms) → hold 900ms → fade out (300ms)
  - Auto-dismiss: calls `onDismiss` after animation completes
  - Props: `{ xpDelta: number, visible: boolean, onDismiss: () => void }`

- [x] **3b** — Create `src/components/AchievementUnlockModal.js` *(~2h)*
  - React Native `Modal` (transparent) — same pattern as `PaymentSuccessOverlay`
  - Confetti: 25 colored dots using `Reanimated.useSharedValue` arrays + `withSpring` / `withDelay`
  - Content: achievement icon (80px, `Colors.primary`), title, description, XP badge, "Awesome!" button
  - `haptics.success()` on appear
  - Props: `{ achievement: { id, title, description, icon }, visible: boolean, onDismiss: () => void }`

- [x] **3c** — Create `src/components/StreakDisplay.js` *(~20 min)*
  - Inline: `🔥 {streak}` in `Colors.warning` + `" day streak"` label
  - Shows `"Start a streak!"` when `streak === 0`
  - Props: `{ streak: number, style?: object }`

- [x] **3d** — Create `src/components/QuestProgressWidget.js` *(~1.5h)*
  - Collapsible card (local `expanded` state, defaults to `true` if `xp < 100`)
  - Progress bar: fill = `(xp - previousMilestone) / (currentMilestone - previousMilestone) * 100%`
  - Milestone dots row: `check-circle` (achieved, `Colors.primary`) vs `circle-outline` (future, `Colors.border`)
  - Collapse/expand uses `Animated.View` height animation
  - Props: `{ xp: number, currentMilestone: number, previousMilestone: number, style?: object }`

- [x] **3e** — `src/navigation/index.js`: Mount `XPToast` and `AchievementUnlockModal` as overlays *(~20 min)*
  - Import `useGamification` in the `Navigation` function component
  - After `<NavigationContainer>...</NavigationContainer>`, add:
    ```jsx
    {pendingXPToast && <XPToast xpDelta={pendingXPToast.xpDelta} visible onDismiss={clearXPToast} />}
    {pendingAchievement && <AchievementUnlockModal achievement={pendingAchievement} visible onDismiss={clearAchievementModal} />}
    ```

- [x] **3f** — Verify: Create an expense → XPToast appears and auto-dismisses. Trigger first-time achievement → AchievementUnlockModal shows with confetti.

---

### Phase 4 — HomeScreen + GroupStatsTab ✅ Complete

- [x] **4a** — Create `src/components/GroupLeaderboardWidget.js` *(~1.5h)*
  - Self-fetching: `useEffect` on mount calls `GamificationService.getGroupLeaderboard(groupId, memberIds)`
  - Shows `ActivityIndicator` while loading
  - Per-row: rank medal emoji (👑 / 🥈 / 🥉 / number) + displayName + `"X paid"` + XP badge
  - Current user row: highlighted background (`Colors.primaryBackground`)
  - Empty state: `"No payments recorded yet"` when all counts are 0
  - Props: `{ groupId: string, memberIds: string[], currentUserId: string, style?: object }`

- [x] **4b** — `src/screens/000_HomeScreen/HomeScreen.js` *(~45 min)*
  - Import `useGamification`, `StreakDisplay`, `QuestProgressWidget`
  - Destructure `{ xp, streak, currentMilestone, previousMilestone }` from `useGamification()`
  - Add `<StreakDisplay streak={streak} />` to the header row (right side)
  - Add `<QuestProgressWidget xp={xp} ... />` between header and Quick Access groups section

- [x] **4c** — `src/components/GroupStatsTab.js` *(~20 min)*
  - Import `GroupLeaderboardWidget`
  - Insert `<GroupLeaderboardWidget groupId={groupId} memberIds={...} currentUserId={currentUserId} />` as the first section, above the existing settlement ring
  - `memberIds` derived from `(group?.members || []).map(m => typeof m === 'string' ? m : m.userId)`

- [x] **4d** — Verify: GroupDetail → Stats tab shows leaderboard. HomeScreen shows streak + quest progress.

---

### Phase 5 — AchievementsScreen + SettingsScreen ✅ Complete

- [x] **5a** — Create `src/screens/300_SettingsScreen/AchievementsScreen.js` *(~2h)*
  - ScrollView with section headers: "Expenses", "Payments", "Social", "Streaks"
  - 2-column grid of achievement cards per section
  - Unlocked card: full color icon + title + unlock date (`unlockedAt.toDate().toLocaleDateString()`)
  - Locked card: grayscale icon + title + description (smaller font)
  - Header: `"X / 9 Achievements Unlocked"` subtitle + total XP display
  - Uses `useGamification()` for `achievements` and `achievementDefs`

- [x] **5b** — `src/navigation/index.js`: Register `AchievementsScreen` in `SettingsStackNavigator` *(~10 min)*
  ```javascript
  <Stack.Screen
    name="Achievements"
    component={AchievementsScreen}
    options={{ headerShown: true, title: "My Achievements", headerBackTitle: "Settings" }}
  />
  ```

- [x] **5c** — `src/screens/300_SettingsScreen/SettingsScreen.js` *(~1.5h)*
  - Import `useGamification`
  - Destructure `{ xp, level, streak, achievements, achievementDefs, currentMilestone, previousMilestone }`
  - **Profile card** enhancements:
    - Wrap `avatarPlaceholder` in `avatarContainer` (position: relative) + add `levelBadge` overlay (22×22 circle, bottom-right, `Colors.primary` bg, `"Lv.{level}"`)
    - Add `gamificationStatRow` below the email input: three chips showing 🔥 streak, ⚡ XP, 🏆 badge count
    - Add `xpProgressBar` below stat row (height 6, `Colors.primary` fill, label `"{xp} / {currentMilestone} XP"`)
  - **New "Progress" section** (between Profile and Currency):
    ```jsx
    <ListItem
      title="My Achievements"
      subtitle={`${achievements.length} of ${achievementDefs.length} unlocked · ${xp} XP total`}
      left={<MaterialCommunityIcons name="trophy" size={22} color={Colors.warning} />}
      onPress={() => { haptics.selection(); navigation.navigate('Achievements'); }}
    />
    ```
  - Add 12 new styles: `avatarContainer`, `levelBadge`, `levelBadgeText`, `gamificationStatRow`, `statChip`, `statChipValue`, `statChipLabel`, `xpProgressContainer`, `xpProgressTrack`, `xpProgressFill`, `xpProgressLabel`, `progressSection`

- [x] **5d** — Verify full Settings screen flow:
  - Level badge visible on avatar
  - Stat row shows streak / XP / badge count
  - XP bar fills proportionally
  - Tapping "My Achievements" navigates to AchievementsScreen
  - Achievements show locked (grayscale) vs unlocked (color + date)

---

## Verification Checklist (End-to-End)

- [ ] Create expense → `+10 XP` toast appears, `userGameProfiles.xp` increments in Firestore
- [ ] Create same expense twice (same expenseId) → second call skipped, no double-award
- [ ] First ever expense → `+50 XP` (bonus), "First Step" achievement modal fires
- [ ] Full payment settlement → `+25 XP` toast
- [ ] CASH payment: record → approve → recipient gets `+25 XP`
- [ ] First group created → `+50 XP` one-time bonus, "Group Founder" achievement fires
- [ ] XP crosses 100 → "Century Club" achievement fires
- [ ] 7-day streak → `+50 XP` bonus, "On a Roll" achievement fires
- [ ] HomeScreen header shows 🔥 streak counter
- [ ] HomeScreen shows QuestProgressWidget with XP progress bar
- [ ] GroupDetail → Stats tab shows leaderboard sorted by payments settled count
- [ ] SettingsScreen profile card shows Lv.X badge, stat row, XP bar
- [ ] Settings → My Achievements → gallery shows locked/unlocked states
- [ ] Anonymous user: zero crashes, no Firestore subscriptions created
- [ ] Restart app → all XP and streak persists from Firestore

---

## Key Files Reference

| File | Role |
|------|------|
| `src/services/GamificationService.js` | All Firestore read/write logic — XP, streaks, achievements, leaderboard |
| `src/contexts/GamificationContext.js` | Real-time listeners, event bridge, `addXP` helper for screens |
| `src/utils/appEvents.js` | Add `GAMIFICATION_XP_AWARDED` + `GAMIFICATION_ACHIEVEMENT_UNLOCKED` |
| `App.js` | Insert `GamificationProvider` |
| `src/navigation/index.js` | Mount overlays (XPToast, AchievementModal) + register AchievementsScreen |
| `src/components/XPToast.js` | Floating "+N XP" feedback |
| `src/components/AchievementUnlockModal.js` | Celebration modal with confetti |
| `src/components/StreakDisplay.js` | 🔥 inline streak indicator |
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
Every `awardXP` call queries `xpLedger` for an existing doc with matching `userId + referenceId + reason`. If found → early return. The `referenceId` is always a Firestore document ID so it is globally unique. This handles: double-taps, app restarts after partial failure, repeated event emissions.

### Fire-and-Forget Pattern
All gamification calls after critical writes:
```javascript
// CORRECT — never blocks the payment flow
GamificationService.updateStreak(user.uid).catch(console.warn);
addXP(25, 'settle_full', expenseId, 'payment', groupId);

// WRONG — never do this
await GamificationService.updateStreak(user.uid); // blocks if Firestore slow
```

### Provider Position
`GamificationProvider` must be inside `AuthProvider` (needs `user.uid`) and inside `TransactionsProvider` (context ordering). It does NOT depend on `TransactionsContext` — this is intentional to keep gamification decoupled from financial data.

### Anonymous Users
`GamificationContext` checks `user?.isAnonymous` on initialization. If true (or `!user?.uid`), it skips all Firestore subscriptions, returns all-zero defaults, and `addXP` is a no-op.
