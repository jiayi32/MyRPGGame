# CCPAY Gamification Expansion Proposal

## Context

Beta testers loved the existing gamification system (XP, achievements, cosmetics, streaks, leaderboards). Several requested a "cute digital pet or pixel knight that goes on RPG adventures with daily quests and expense-triggered quests." This proposal expands gamification in four tiers — from quick wins to the full companion RPG system — so the team can pick and choose what to implement.

The team has no game development experience, so every feature is designed to be implementable with the existing tech stack (React Native, Reanimated, Skia, Firestore) and includes concrete schemas, UI placement, and day estimates.

---

## Core Retention Loop

Understanding how features connect is critical before building any of them. Every successful gamification system has a tight daily loop that keeps users returning, surrounded by longer-horizon goals that keep them invested.

```
  DAILY (habit layer)                WEEKLY (progress layer)               LONG-TERM (identity layer)
  ─────────────────────              ──────────────────────                ──────────────────────────
  ┌─────────────────┐                ┌──────────────────┐                  ┌──────────────────────┐
  │  Open app       │──streak+1──▶  │  Weekly quest    │──complete──▶     │  Level up            │
  │  Log expense    │──quest+1───▶  │  board clears    │                  │  New companion stage │
  │  Settle debt    │──XP+gold───▶  │  Group leaderboard reset           │  Town grows          │
  │  Send expedition│──away XP───▶  │  Seasonal progress                 │  Adventure map region│
  └────────┬────────┘                └──────────────────┘                  │  Cosmetics unlock    │
                                                                           │  Lore unlocks        │
           │                                                               └──────────────────────┘
           ▼
  ┌─────────────────┐
  │  Companion      │
  │  reacts, gains  │
  │  mood, returns  │
  │  from expedition│
  └─────────────────┘
```

**Inspiration sources used in this proposal:**
- **Duolingo** — Streak system, leagues, weekly quests, streak freeze
- **Habitica** — Party boss fights, mutual accountability, pet/item drops
- **Pokémon GO** — Daily research + 7-stamp breakthrough, buddy system (walking companion)
- **Fortune City** — Expense logging builds a visible world (city/map)
- **AFK Arena / Idle Heroes** — Offline expedition returns with resources
- **Clash Royale** — Variable reward chests, appointment mechanics
- **Forest App** — Passive growing with visible accumulation
- **Long Game Savings** — Variable reward psychology driving boring-but-good behavior
- **Animal Crossing** — Slow, pressure-free town growth; decorations and buildings placed freely; no punishment for absence; cosy loop of earning → spending → visible world change
- **Stardew Valley** — Pixel art fantasy aesthetic; building upgrades feel meaningful; farm expansion as core motivation; seasonal variety
- **Pokopia** — Town building with pixel art tile grid; gold spent on structures and roads; progression visible as the town fills in

---

## Balancing Principles

1. **XP Inflation Control.** Current cap is Level 10 at 12,000 XP. At ~15 XP/day average, that's ~8-9 months. New XP sources should not more than double this rate (target: Level 10 in 4-6 months with new features).
2. **Dual Currency Design.** XP (progression, never spent) and Gold (spendable, earned from quests/expeditions, spent on town buildings and infrastructure). Separation prevents progression economy from being compromised. Gold's primary spend sink is the Town Building system — buying structures, roads, fences, and decorations that visibly grow the player's pixel art town.
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
| 1.1 Streak Milestones | 1 | **Done** ✅ (7/14/30/60/100-day milestones with XP, gold, achievements, cosmetics) |
| 1.2 Streak Freeze | 5 | **Done** ✅ (purchasable for 15g, max 2, consumed on missed day, free at 7-day streak) |
| 1.3 Weekly XP Summary | Post-launch | Planned |
| 1.4 Achievement Progress | 2 | **Done** ✅ (progress bars for 8 achievements in AchievementsScreen) |
| 1.5 Level-Up Celebration Modal | 1 | **Done** ✅ (particle animation, per-level colors, cosmetic unlock display) |
| 1.6 Expanded XP Events | 1 | **Done** ✅ |
| 1.7 Randomised Motivational Messages | 1 | **Done** ✅ (20+ reason-specific message pools in XPToast) |
| 1.8 Comeback Bonus | 1 | **Done** ✅ (25 XP when returning after 5+ days away) |
| 2.1 Daily Quest System | 2 | **Done** |
| 2.5 Title / Flair System | 3 | **Done** |
| 4.2 Weekly Group Leaderboard | 3 | **Done** |
| 2.6 XP Multiplier Events | 3 | **Done** |
| **3.1 Companion Core** | **4** | **Done** ✅ |
| **3.1b Companion Tab + Hybrid Architecture** | **4b** | **Done** ✅ |
| **3.2 Idle Expedition System** | **5** | **Done** ✅ |
| **3.4 Gold Currency + Companion Shop** | **5** | **Done** ✅ |
| **3.10 Town Building (Phase 1)** | **7** | **Done** ✅ (icon-based, auto-placement) |

---

## TIER 1: Quick Wins (0.5–1.5 days each)

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

### 1.6 Expanded XP Events ✅ DONE
6 new XP awards for unrewarded desirable behaviors: `expense_with_photo` (5 XP), `first_group_settle` (50 XP), `invite_friend` (10 XP), `approve_expense_fast` (8 XP).

---

### 1.7 Randomised Motivational Messages
XPToast appends context-specific random praise: "+10 XP — Nice split!". ~8 messages per reason category. **~0.5 days.**

---

### 1.8 Comeback Bonus
If user hasn't opened the app for 5+ days, on next open: "+25 XP — Welcome back!" Companion enters excited animation state. **~0.5 days.**

---

## TIER 2: Medium Features (2–5 days each)

### 2.1 Daily Quest System ✅ DONE
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

### 2.5 Title / Flair System ✅ DONE
Unlockable text titles displayed under username. 9 titles with level-gated, achievement-gated, and stat-gated unlock conditions.

**Implementation:** `TITLE_DEFINITIONS` in GamificationService, `equippedTitle` field on `userGameProfiles`, title section in CosmeticGalleryScreen.

---

### 2.6 XP Multiplier Events ✅ DONE
"Double XP Weekend!" — configurable multiplier via `gameConfig/xpMultiplier` Firestore doc. `XPMultiplierBanner` on HomeScreen with countdown timer. Applied inside `awardXP()` with 5-minute client-side cache.

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

The original vision is for companions to add interactiveness to what would otherwise be a pure expense calculation app. The Markov chain animation system on the HomeScreen widget is the primary engagement hook — dynamic, non-repetitive, and fun to watch.

---

### 3.1 Companion Core: The Character — DONE ✅

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
- **frameRect.x/y:** Original game anchor position — unused for rendering
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
| `limit_atk` | Yes | Adventuring rare attack — large, flashy |
| `magic_standby` | Yes | Idle mood transition variant |
| `dying` | Yes | Sleepy transition + micro-stir in dead state |
| `dead` | Yes | Sleepy hold state (with Zzz overlay) |

**Excluded:** `jump` (static, single frame), `atk1`, `super_limit_atk_before`, `brave_shift`, `limit_move` (not universal)

#### Mood System (4 moods) — Markov Chain Driven

Each mood defines a configurable **Markov chain** of animation states with weighted probabilistic transitions, hold durations, and loop counts. This replaces the earlier linear sequence approach, making animations feel dynamic and non-repetitive. Designers tune probabilities and durations in `companionMarkov.ts` without touching component logic.

| Mood | Entry State | Markov States | Trigger |
|---|---|---|---|
| **idle** | `idle` | idle(50%)→idle/standby(30%)/magic_standby(20%). Standby and magic_standby always return to idle. | Default — user is active |
| **excited** | `win_before` | win_before→win(100%). win→win(40%)/idle(60%). idle→win_before(40%)/standby(30%)/magic_standby(30%). Idle never goes directly to win — always through win_before. | XP earned, achievement, level-up |
| **sleepy** | `idle` | idle→dying(100%). dying→dead(100%). dead→dead(90%)/dying_micro(10%). dying_micro→dead. + "Zzz" overlay on dead/dying. | 3+ days since last activity |
| **adventuring** | `idle_start` | idle_start→atk(50%)/move(30%)/standby(20%). idle→atk(40%)/limit_atk(10%)/standby(25%)/move(25%). Attack states return to idle. | Expedition active / manual |

**Auto-drift:** Moods periodically shift for variety. Each mood has configurable drift settings:
- **idle:** Every 90s, 30% chance → excited(40%) or adventuring(60%), burst of 2 transitions then return
- **excited:** Every 120s, 20% chance → idle(70%) or adventuring(30%), burst of 1
- **adventuring:** Every 90s, 25% chance → idle(50%) or excited(50%), burst of 2
- **sleepy:** No drift (stays locked)

**State types:**
- **Loop-based:** Play N full animation cycles before transitioning (e.g. `win: loops: 3`)
- **Time-based:** Hold for N seconds before transitioning (e.g. `idle: holdSeconds: 10`)

#### HomeScreen Widget Container (Compact — Sprint 4b)

- **Position:** Below greeting text, above hero balance card
- **Width:** Matches hero card width (full width minus screen padding)
- **Height:** 100dp sprite container
- **Background:** Semi-transparent card (placeholder — will be replaced with commissioned backgrounds and enemy sprites in future sprints)
- **Overflow:** Hidden — sprite animations that exceed the container bounds are clipped
- **Animation:** Full Markov chain with drift (key engagement/interactivity point)
- **Mood display:** Read-only mood pill/chip (e.g. "⚔️ Adventure") — not interactive
- **Tap action:** Navigates to Companion tab (full interaction hub)
- **Performance:** Pauses SpriteAnimator and Markov timers when Home tab is not focused (`useIsFocused()`)

#### Speech Bubble System

The companion displays contextual speech bubbles with messages and mood emojis:
- **Idle:** Tips, greetings ("Hey! 👋", "Log an expense? 📝")
- **Excited:** Celebration ("Woohoo! 🎉", "+XP! ⚡")
- **Sleepy:** "💤", "Zzz...", "I missed you..."
- **Adventuring:** "Take that! ⚔️", "On my way! 🏃"

Bubbles appear periodically (~15-30s on idle) or immediately on mood change. Fade in/out animation.

#### Character Unlock System

Characters are unlocked through level progression and achievements:
- **~8 characters free** from start (simpler, smaller sprites)
- **Higher-level unlocks:** Characters with more complex/flashy attack animations require higher levels
- **Achievement unlocks:** Some characters tied to specific achievements
- **Beta testers:** All 23 characters unlocked (override flag in profile)
- Locked characters shown greyed out with requirement on selection screen

#### Rendering Architecture

**Skia Canvas + useImage + Group clip** — leverages existing `@shopify/react-native-skia` v2.0.0-next.4 infrastructure already used for shader effects (SkiaSplashScreen, LiquidSilkGradient, etc.)

**Animation driver:** Reanimated `useFrameCallback` (UI thread, ~60fps) with tick accumulator respecting per-frame `frameDelays`.

**Sprite frame selection:**
```
currentFrame shared value → useDerivedValue → imageXOffset = -frame * frameWidth
<Canvas> → <Group clip={frameRect} transform={[{translateX: offsetX}, {translateY: offsetY}]}> → <Image x={imageXOffset} />
```

**No scaling** — sprites render at native pixel resolution. Anchoring keeps feet planted.

#### Anchor Point System

Sprites are anchored to **80% of container width, bottom edge** — a fixed point in the container that the sprite's foot position aligns to. Each animation has per-frame anchor offsets (`fromRight`, `fromBottom` in `SpriteAnimMeta`) that compensate for varying frame sizes across animations, preventing "jumping" during transitions.

```
anchorX = displayWidth × 0.8
offsetX = anchorX - frameWidth + fromRight
offsetY = displayHeight - frameHeight + fromBottom
```

Anchor data is defined per-animation in `spriteRegistry.ts`. Characters without explicit anchors default to `(0, 0)`.

#### Image Preloading

`useCharacterImages(characterId)` preloads all 11 animation PNGs for the active character upfront using fixed `useImage()` calls (hooks-safe — always 11 calls regardless of which animations exist). Returns `Partial<Record<SpriteAnimName, SkImage>>`. Eliminates the 1-2 frame flicker that occurred when `useImage` loaded a new PNG during animation transitions.

#### Schema

```javascript
// Addition to userGameProfiles/{uid}:
companionCharacter: string | null,  // CharacterId, e.g. 'KingMont'
```

#### File Structure

```
src/components/companion/
  types.ts                       — TypeScript types (CharacterId, SpriteAnimName, CompanionMood, SpriteAnimMeta, etc.)
  spriteRegistry.ts              — Auto-generated static require() map + inlined JSON metadata + anchor points
  SpriteAnimator.tsx             — Skia sprite sheet renderer (useFrameCallback, configurable loops, anchor system)
  CompanionWidget.tsx            — Full Markov chain state machine + speech bubble + mood picker (used on CompanionScreen)
  CompanionWidgetCompact.tsx     — Compact HomeScreen widget (Markov chain + mood pill, no speech/mood picker) [Sprint 4b]
  CompanionSpeechBubble.tsx      — Speech bubble with mood-contextual messages + emojis
  companionMarkov.ts             — Markov chain config: states, transitions, probabilities, durations, drift per mood
  useCompanionState.ts           — Hook deriving mood from GamificationContext (priority: manual > excited > sleepy > idle)
  useCharacterImages.ts          — Preloads all 11 animation PNGs per character (flicker-free transitions)
  companionUnlocks.ts            — Unlock tier definitions (level/achievement gates, beta tester override)
src/screens/companion/
  CompanionScreen.tsx            — Full companion interaction hub (large sprite, mood picker, action cards) [Sprint 4b]
src/screens/settings/
  CompanionSelectScreen.tsx      — 3-column character grid browser with mood preview and unlock states
src/navigation/
  CompanionTabNavigator.tsx      — Stack navigator for Companion bottom tab [Sprint 4b]
scripts/
  generateSpriteRegistry.js      — Node script scanning assets/sprites/companions/ to generate spriteRegistry.ts
```

**Sprint 4 (3.1): ~5–7 days.** Done ✅
**Sprint 4b (3.1b): ~2–3 days.** Done ✅ — Compact widget + CompanionScreen + Companion tab

---

### 3.1b Companion Tab + Hybrid Architecture — DONE ✅

#### Problem

Beta testers noted the companion widget feels "odd" sitting above the hero balance card, and future features (expeditions, adventure map, shop, boss fights) need far more screen real estate than a HomeScreen widget can provide.

#### Decision: Hybrid Architecture

Keep a **compact widget on HomeScreen** (always visible, "living app" feel) + add a **dedicated Companion bottom tab** for full interaction. This mirrors patterns from Duolingo (Duo appears everywhere, Adventures is separate), Pokemon GO (buddy on map, tap for buddy screen), and Habitica (pet in avatar, tap for management).

```
HomeScreen                          CompanionTab (6th bottom tab)
┌─────────────────────┐             ┌─────────────────────┐
│ Hi, User            │             │ CompanionScreen      │
│ ┌─ Compact Widget ─┐ │  tap ──►   │   Large sprite       │
│ │ [Markov anims]   │ │             │   Speech bubble      │
│ │   ⚔️ Adventure   │ │             │   Mood picker        │
│ └──────────────────┘ │             │   Action cards       │
│ ┌─ Hero Balance ───┐ │             │   (Choose, Expd...)  │
│ └──────────────────┘ │             └─────────────────────┘
└─────────────────────┘
```

#### Compact Widget (HomeScreen)

- 100dp sprite container with full Markov chain + drift (key interactivity)
- Read-only mood pill (e.g. "⚔️ Adventure") — mood changes only on CompanionScreen
- No speech bubble or mood picker (moved to CompanionScreen)
- Pauses animation when Home tab not focused (performance)
- Tap → navigates to Companion tab

#### CompanionScreen (Companion Tab Hub)

Full interaction screen — the home for all future companion features:
1. Large sprite display (~200dp) with full Markov animation + speech bubble
2. Mood picker (AnimatedSegmentedControl: Idle, Excited, Sleepy, Adventure)
3. Action cards:
   - "Choose Companion" — navigates to CompanionSelectScreen
   - "Send on Expedition" — Coming Soon (Sprint 7)
   - "Adventure Map" — Coming Soon (Sprint 9)
   - "Companion Shop" — Coming Soon (Sprint 6)

#### Navigation Changes

- **6 bottom tabs:** Home | Contacts | Groups | SettleUp | Companion | Settings
- Companion tab icon: `gamepad-variant` (MaterialCommunityIcons)
- Badge infrastructure on Companion tab (ready for expedition returns, unlocks)
- Settings → "My Companion" redirects to Companion tab (not CompanionSelectScreen)
- CompanionSelectScreen back-navigation fixed for CompanionTab context

**~2–3 days.**

---

### 3.2 Idle Expedition System — DONE ✅

When the user is away from the app, their companion can be sent on a timed expedition that returns with gold and XP. Companion's widget changes to "Adventuring" mood with move/attack animation cycles. Materials/crafting deferred — expeditions reward gold + XP only.

**Expedition Types:**
| Name | Duration | Gold range | XP | Unlock |
|---|---|---|---|---|
| Quick Errand | 30 min | 2–5 gold | 5 XP | Level 1 |
| Village Patrol | 2 hours | 8–15 gold | 10 XP | Level 1 |
| Forest Hunt | 6 hours | 20–35 gold | 15 XP | Level 3 |
| Mountain Climb | 12 hours | 40–65 gold | 20 XP | Level 5 |
| Dragon's Lair | 24 hours | 80–140 gold | 30 XP | Level 7 |

**Schema:**
```javascript
// On userGameProfiles/{uid}:
expedition: {
  active: bool,
  expeditionType: string,    // 'quick_errand' | 'village_patrol' | 'forest_hunt' | 'mountain_climb' | 'dragon_lair'
  startedAt: Timestamp,      // serverTimestamp() — anti-cheat
  returnsAt: Timestamp,      // startedAt + duration — anti-cheat
  resolved: bool             // true after loot collected (idempotency guard)
}
```

**UI:** ExpeditionScreen (3 states: selection list, countdown timer, loot collect). ExpeditionLootModal with coin burst animation. Badge ("!") on Companion tab icon when expedition returns. CompanionScreen action card shows dynamic subtitle (remaining time / returned). Commit-only (no cancel).

**Anti-cheat:** `startedAt`/`returnsAt` use `serverTimestamp()`. `resolveExpedition()` checks `resolved: true` inside `runTransaction`. Gold ledger idempotency guard prevents double-collect.

**Files:** `src/screens/companion/ExpeditionScreen.tsx`, `src/components/ExpeditionLootModal.tsx`, `src/services/ExpeditionService.ts`

---

### 3.3 Quest System with Companion Narrative (~5 days)

Re-skins the Daily Quest System (2.1) with companion dialogue and narrative. Same mechanics, richer presentation.

**Depends on:** Daily Quest System (2.1) ✅, Companion Core (3.1).

---

### 3.4 Gold Currency + Companion Shop — DONE ✅

Secondary currency ("Gold") earned from expeditions, daily quest bonus, and streak milestones. The current shipped implementation provides a companion gear shop as a mechanics placeholder. The long-term gold spend sink is the **Town Building system (see 3.10)** — structures, roads, fences, and decorations that visibly grow a pixel art town. The companion gear shop may be retained as a secondary spend category or folded into the town system.

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

**Current Shop Items (placeholder — will evolve into Town Building):**
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
// goldLedger/{autoId} — mirrors xpLedger pattern for audit/idempotency
```

**UI:** ShopScreen with AnimatedSegmentedControl category tabs, BlurModal purchase confirmation. GoldDisplay on CompanionScreen + ExpeditionScreen headers. GoldToast notification.

**Anti-cheat:** `deductGold()` checks balance inside `runTransaction`. `goldLedger` query (userId + referenceId + reason) prevents duplicate awards.

**Files:** `src/screens/companion/ShopScreen.tsx`, `src/components/GoldToast.tsx`, `src/components/GoldDisplay.tsx`, `src/services/ExpeditionService.ts`, `src/services/ExpeditionTypes.ts`

---

### 3.5 Companion Mood System ✅ Included in 3.1

Client-side computed mood state — merged into the Companion Core (3.1) implementation. Four moods: idle, excited, sleepy, adventuring. Derived from GamificationContext state.

---

### 3.6 Group Campfire (~3 days)

In group views, all members' companions appear together around a pixel campfire.

---

### 3.7 Companion Evolution (~3 days)

Companion visually evolves at level milestones. Future sprint — requires additional sprite stages to be commissioned.

---

### 3.8 Adventure Map: World Progression (~8–10 days)

Scrollable pixel-art world map with 10 regions (one per level). Requires separate art commission.

---

### 3.9 Group Party Boss Fight (~5 days)

Group takes on a shared challenge-boss together. Cooperative mechanic with shared HP bar.

---

### 3.10 Pixel Art Town Building (~10–14 days) — Phase 1 DONE ✅

> **Beta tester feedback:** "It might be better to have a town building game where the gold is spent on buildings, fences, roads, etc."
> Inspired by Animal Crossing, Stardew Valley, Pokopia, Fortune City.

#### Phase 1 Implementation Notes (Apr 2, 2026)

**What shipped:** Visual tile grid with auto-placement, 27 buildings across 5 categories, all 5 town tiers (Hamlet → City), MaterialCommunityIcons as building sprites, BlurModal purchase flow, Firestore transaction-backed purchases, tier progress banner.

**What's deferred to Phase 2:**
- Pixel art building assets (requires art commission)
- Free placement / drag-to-place (currently auto-placement: left-to-right, top-to-bottom)
- Companion wander animation in town
- Tier-up cutscene animation
- Building details on long-press

**Key files:** `TownService.ts` (definitions + purchase), `TownScreen.tsx` (UI), `GamificationContext.tsx` (state).

#### Concept

Gold is the primary input. The town is the primary output. Every gold coin spent makes the town visibly larger or more detailed — the town is a living record of the user's financial activity turned into something tangible and beautiful.

The town uses a **pixel art fantasy aesthetic**: cobblestone paths, thatched roofs, lantern posts, oak fences, market stalls. Companions wander or stand in the town when not on expedition.

#### Town Screen

A new full-screen scrollable tile grid displayed on the Companion tab (or as a dedicated tab). The grid starts nearly empty — a patch of grass with one small house (the companion's dwelling). As the user spends gold, structures appear, paths connect buildings, and the town fills in.

```
  ┌──────────────────────────────────────────────────┐
  │  🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿  │
  │  🌿🌿🌿🌿  [Bakery]  🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿  │
  │  🌿🌿🌿🌿══════🌿🌿🌿🌿[Fountain]🌿🌿🌿🌿  │
  │  🌿🌿[House]══════[Market]══════[Inn]🌿🌿🌿  │
  │  🌿🌿🌿🌿══════🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿  │
  │  🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿  │
  └──────────────────────────────────────────────────┘
```

#### Building Categories

| Category | Examples | Price Range | Effect |
|---|---|---|---|
| **Buildings** | Bakery, Blacksmith, Windmill, Inn, Market, Town Hall, Library, Chapel | 50–500g | Visual landmark; higher-tier buildings unlock when level gate met |
| **Infrastructure** | Stone Path, Dirt Road, Cobblestone Bridge, Garden Bed | 10–80g | Connect buildings; make the town feel lived-in |
| **Fences & Borders** | Wooden Fence, Stone Wall, Iron Gate, Hedge Row | 15–60g | Define zones; purely decorative |
| **Decorations** | Lamp Post, Well, Flower Patch, Barrel Stack, Signpost, Campfire | 5–40g | Fill empty tiles; cheapest category — good for early spend |
| **Companion Fixtures** | Companion Hut upgrade (Lv2 / Lv3), Notice Board, Training Dummy | 100–300g | Tied to companion narrative; Notice Board surfaces daily quests in-world |

#### Town Progression Model

Towns grow across **5 tiers** as more gold is spent:

| Tier | Total gold spent | Town size | Unlocks |
|---|---|---|---|
| 1 — Hamlet | 0g | 4×4 tiles | Starter house, dirt road, fence, flower patches |
| 2 — Village | 500g | 6×6 tiles | Bakery, stone path, well, lamp posts |
| 3 — Township | 1500g | 8×8 tiles | Market, blacksmith, cobblestone, windmill |
| 4 — Town | 3500g | 10×10 tiles | Inn, chapel, iron gate, fountain |
| 5 — City | 7000g | 12×12 tiles | Town Hall, library, grand bridge, animated flags |

Each tier unlock triggers an animated "town expands" cutscene (brief, skippable).

#### Design Rules (Anti-Pattern Compliance)

- **No decay.** Buildings never crumble or disappear. Gold spent is permanent.
- **No FOMO.** No time-limited buildings (or if seasonal, clearly flagged as cosmetic-only).
- **No pay-to-win.** Buildings are cosmetic or provide minor QoL (e.g., Notice Board surfaces quests in-world). No buildings that give XP multipliers or expedition bonuses that non-builders can't get.
- **Free placement.** Player drags buildings onto any unlocked tile — no forced layout. Animal Crossing / Stardew philosophy.
- **Companions wander.** When the companion is not on expedition, its sprite can be seen walking around the town (uses existing `move` animation from the Markov system). This makes the town feel alive.

#### Schema

```javascript
// Addition to userGameProfiles/{uid}:
town: {
  tier: number,                       // 1–5, derived from totalGoldSpent
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
- **Tile assets:** Commissioned pixel art sprites (16×16 or 32×32 base tile). Same fantasy palette as companion sprites.
- **Companion wander:** Reuses `CompanionWidgetCompact` Markov system inside the town view, constrained to path tiles.
- **Placement UI:** Tap an empty tile → bottom sheet of affordable buildings → drag to confirm. Highlight valid tiles green.

#### Dependencies

- Gold currency system (3.4) ✅
- Pixel art building assets — requires art commission (same pipeline as companion sprites)
- Town screen (new `TownScreen.tsx` in `src/screens/companion/`)

**Estimated effort:** ~10–14 days (excluding art commission time). Art-blocking — can ship tile grid + building definitions as a placeholder while assets are commissioned.

---

## TIER 4: Social & Competitive Features

### 4.1 Friend 1v1 Challenge (~4 days)
Challenge a contact: "Who can settle more debts this week?"

### 4.2 Weekly Group Leaderboard ✅ DONE
"This Week" tab added to existing `GroupLeaderboardWidget`. Weekly XP aggregated from `xpLedger` with Monday–Sunday window.

### 4.3 Social Activity Feed (~3 days)
Feed of noteworthy gamification events from group members.

### 4.4 Emoji Kudos on Feed (~1.5 days)
Tap feed events to react with emoji. **Depends on:** 4.3.

---

## Recommended Implementation Roadmap

| Sprint | Weeks | Features | Status |
|---|---|---|---|
| **1** | 1–2 | Expanded XP, Random Messages, Comeback Bonus, Streak Milestones, Level-Up Modal | Partial ✅ |
| **2** | 3–4 | Daily Quest System, Achievement Progress | Done ✅ |
| **3** | 5–6 | Titles, Weekly Leaderboard, XP Multipliers | Done ✅ |
| **4** | 7–8 | **Companion Foundation (3.1)**: Sprite rendering, Markov chains, character select, speech bubbles, anchor points, image preloading, unlock system | **Done** ✅ |
| **4b** | 8 | **Companion Tab + Hybrid Architecture (3.1b)**: Compact widget, CompanionScreen hub, 6th bottom tab, navigation rewire | **Done** ✅ |
| **5** | 9–10 | **Companion Economy (3.2 + 3.4)**: Expeditions + Gold Currency + Shop, shipped as complete earn/spend loop | **Done** ✅ |
| **6** | 11–12 | Quest Narrative (3.3), Streak Freeze (1.2), Evolution (3.7) | Planned |
| **7** | 13–15 | **Town Building Phase 1 (3.10)**: Town screen, tile grid, all 5 tiers, 27 buildings, icon-based (no art assets) | **Done** ✅ |
| **8** | 16–18 | **Town Building Phase 2 (3.10)**: Pixel art assets, companion wander in town, free placement UI | Planned |
| **9** | 19–20 | Adventure Map (3.8), Group Campfire (3.6) | Planned |
| **10** | 21–22 | Loot Drops (2.2), Party Boss Fight (3.9) | Planned |

---

## Audio & Haptic Design Notes

| Event | Haptic | Sound (future) |
|---|---|---|
| +XP toast | `impactLight` (existing) | Soft chime |
| Achievement unlock | `notificationSuccess` (existing) | Fanfare jingle |
| Level up | `impactHeavy` | Grand chord |
| Quest complete | `impactMedium` | Completion ding |
| Loot drop | `impactLight` × 2 | Item pickup sound |
| Expedition returns | `notificationSuccess` | Adventure fanfare |
| Boss defeated | `impactHeavy` × 3 | Victory anthem |

---

## Critical Files

- `src/services/GamificationService.ts` — Core gamification service (XP, achievements, streaks, gold integration)
- `src/services/ExpeditionService.ts` — Gold economy, expedition system, shop purchases [Sprint 5]
- `src/services/ExpeditionTypes.ts` — TypeScript types for expedition/gold/shop [Sprint 5]
- `src/contexts/GamificationContext.tsx` — Provider (companionCharacter, companionMood, XP, achievements, gold, expedition, shop)
- `src/navigation/index.tsx` — Screen + tab registration, overlay modals (XPToast, GoldToast, LevelUpModal, ExpeditionLootModal)
- `src/navigation/CompanionTabNavigator.tsx` — Companion tab stack (CompanionScreen, CompanionSelect, ExpeditionScreen, ShopScreen)
- `src/utils/appEvents.ts` — Event bus (includes gold, expedition, shop events)
- `src/screens/home/HomeScreen.tsx` — Compact widget placement
- `src/screens/companion/CompanionScreen.tsx` — Companion interaction hub (action cards, GoldDisplay)
- `src/screens/companion/ExpeditionScreen.tsx` — Expedition selection, countdown, loot collect [Sprint 5]
- `src/screens/companion/ShopScreen.tsx` — Shop with category tabs, purchase flow [Sprint 5]
- `src/components/GoldToast.tsx` — "+N Gold" notification [Sprint 5]
- `src/components/GoldDisplay.tsx` — Inline gold balance pill [Sprint 5]
- `src/components/ExpeditionLootModal.tsx` — Loot chest reveal modal [Sprint 5]
- `src/components/companion/` — Companion system (Sprint 4)
  - `companionMarkov.ts` — Markov chain config (tune animation behavior here)
  - `CompanionWidget.tsx` — Full animation widget (used on CompanionScreen)
  - `CompanionWidgetCompact.tsx` — Compact HomeScreen widget
  - `SpriteAnimator.tsx` — Skia sprite renderer
  - `spriteRegistry.ts` — Auto-generated asset registry + anchor points
  - `useCharacterImages.ts` — Image preloader
  - `useCompanionState.ts` — Mood derivation (includes adventuring mood from expedition)
