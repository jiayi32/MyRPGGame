# RPG-Related Architecture Extracts

> Sections lifted from `documentation/architecture/{FIRESTORE_SCHEMA,SYSTEM_ARCHITECTURE,INPUT_OUTPUTS}.md`. The campaign/combat/town/companion data model was never formally added to `FIRESTORE_SCHEMA.md` — the source of truth for those types is `src/services/gamification/CampaignTypes.ts` and `ExpeditionTypes.ts` (both copied to this folder). Only the **gamification core** (XP, achievements, ledger, definitions) was documented in the architecture docs; that text is reproduced below.

---

## From `FIRESTORE_SCHEMA.md` — Gamification Data Model (Phase 2.4)

> **Status**: Fully implemented. Collections live in Firestore. Achievement definitions are **auto-seeded** on first app boot — `GamificationContext` detects an empty `achievementDefinitions` collection and calls `seedAchievementDefinitions()` automatically (idempotent — uses `setDoc`, safe to re-run). No manual seed step required.

These four collections support the gamification system (XP, streaks, achievements, group leaderboards). They are independent of the expense/payment data model and can be rolled back without affecting financial data.

### UserGameProfiles Collection

**Path**: `/userGameProfiles/{userId}`

One document per user, keyed by Firebase UID (same key as `users/{userId}`). Kept as a separate top-level collection so gamification security rules don't require modifying the existing `users` collection rules.

```typescript
interface UserGameProfile {
  xp:                   number;    // Total XP earned all-time (never decrements)
  level:                number;    // 1–10, derived from XP thresholds
  streak:               number;    // Consecutive active days
  longestStreak:        number;    // All-time best streak
  lastActiveDate:       string;    // "YYYY-MM-DD"
  totalPaymentsMade:    number;
  totalExpensesCreated: number;
  createdAt:            Timestamp;
  updatedAt:            Timestamp;
}
```

**Level thresholds** (XP → Level):

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

**Security rules**: User can read their own achievements. User can create entries for themselves. No updates or deletes — append-only.

**9 defined achievement IDs**:

| ID | Title | Condition |
|----|-------|-----------|
| `first_step` | First Step | First expense created |
| `settler` | Settler | First full payment settlement |
| `group_founder` | Group Founder | First group created |
| `squad_goals` | Squad Goals | Group with 5+ members |
| `big_spender` | Big Spender | Single expense ≥ $100 equivalent |
| `on_a_roll` | On a Roll | 7-day active streak |
| `century_club` | Century Club | 100 XP total |
| `globetrotter` | Globetrotter | First multi-currency transaction |
| `prompt_payer` | Prompt Payer | Settle payment within 24h of expense creation |

---

### XPLedger Collection

**Path**: `/xpLedger/{docId}`

Append-only log of every XP award. Primary purpose: **idempotency guard** — before any `awardXP` call, `GamificationService` queries for an existing doc with matching `userId + referenceId + reason`. If found, the award is skipped.

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

**Security rules**: User can read and create their own entries. No updates or deletes — append-only.

---

### AchievementDefinitions Collection

**Path**: `/achievementDefinitions/{achievementId}`

Static seed data — written once during setup, read-only at runtime. Allows badge metadata to be updated (icon, description) without a code release.

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

## From `SYSTEM_ARCHITECTURE.md` — Provider Wiring

| 6 | **GamificationContext** | `src/contexts/GamificationContext.tsx` | XP, streaks, achievements. Anonymous user guard skips Firestore subscriptions |

```
<GamificationProvider>  // 6. Depends on Auth + Transactions
   ...
</GamificationProvider>
```

Gamification events on the global event bus:
`GAMIFICATION_XP_AWARDED`, `GAMIFICATION_ACHIEVEMENT_UNLOCKED`

(See also `BOSS_DEFEATED`, `QUEST_COMPLETED`, `CAMPAIGN_COMPLETED`, `TOWN_BUILDING_PURCHASED` event types added in later phases — see `src/utils/appEvents.ts`.)

---

## From `INPUT_OUTPUTS.md` — Gamification Collections & Indexes

### Collections
| Collection | Doc ID | Key Fields | Notes |
|---|---|---|---|
| `userGameProfiles` | Firebase Auth UID | xp, level, streak, longestStreak, lastActiveDate, totalPaymentsMade, totalExpensesCreated, createdAt, updatedAt | Gamification profile per user (separate from `users` to isolate security rules) |
| `userAchievements` | auto-generated | userId, achievementId, unlockedAt, xpAwarded | Earned achievement badges. One doc per user per badge. |
| `xpLedger` | auto-generated | userId, xpDelta, reason, referenceId, referenceType, groupId, createdAt | Append-only XP audit log; idempotency guard (`userId + referenceId + reason`) |
| `achievementDefinitions` | achievementId | id, title, description, icon, category, xpReward | Static seed data — 9 defined achievements. |

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| userAchievements | userId ASC + unlockedAt DESC | User's achievements in unlock order |
| xpLedger | userId ASC + referenceId ASC + reason ASC | Idempotency guard for duplicate XP award prevention |

### Onboarding XP Hook (referenced from index.tsx)
| Trigger | Call | Effect |
|---|---|---|
| Select & Confirm | `onComplete(selectedCurrency)` → `updatePreferredCurrency(currency, true)` + `awardXP(user.uid, 30, 'onboarding_complete', ...)` | Writes `users/{uid}.preferredCurrency` + `.hasCompletedCurrencyOnboarding = true` → awards +30 XP (idempotent via xpLedger) → resets to MainApp |
| Skip | `onSkip()` → `updatePreferredCurrency('USD', true)` + `awardXP(user.uid, 30, 'onboarding_complete', ...)` | Same write with default currency + XP award → resets to MainApp |

---

## Campaign / Combat / Town / Expedition Collections (Not in Architecture Docs)

The campaign-RPG-era collections (added Apr 2026) were never written into `FIRESTORE_SCHEMA.md`. The schema lives in code. Quick reference:

| Collection | Path | Source of truth |
|---|---|---|
| Campaigns | `/campaigns/{campaignId}` | `CampaignTypes.ts` → `Campaign` |
| Avatars | `/campaigns/{campaignId}/avatars/{avatarUserId}` | `CampaignTypes.ts` → `CampaignAvatar` |
| Bosses | `/campaigns/{campaignId}/bosses/{bossId}` | `CampaignTypes.ts` → `CampaignBoss` |
| Quests | `/campaigns/{campaignId}/quests/{questId}` | `CampaignTypes.ts` → `CampaignQuest` |
| Battles | `/campaigns/{campaignId}/battles/{battleId}` | `CampaignTypes.ts` → `BattleState` |
| Archive | `/campaigns/{campaignId}/archive/{entryId}` | `CampaignTypes.ts` → `ArchiveEntry` |
| Gold ledger | `/goldLedger/{entryId}` | `ExpeditionTypes.ts` (TownService writes) |
| Reward idempotency | `/rewardIdempotency/{entryId}` | `ExpeditionService.ts` |
| Daily quest progress | `/dailyQuestProgress/{docId}` | `GamificationService.ts` |
| Game config | `/gameConfig/{configId}` | `GamificationService.ts` (XP multiplier event window, etc.) |

Refer to the corresponding `*.ts` files in `RPG_CODE_FOLDER/src/services/gamification/` for the canonical interfaces.
