# Product Specification Report

## Co-op / Solo Expense RPG for React Native

> **Document role**: This is the integration roadmap and product narrative for CCPay Split RPG. It provides long-horizon planning context and implementation status summaries.
>
> **Authority note**: [COMBATSYSTEM.md](../future/COMBATSYSTEM.md) is the canonical direction document. [CHANGELOG.md](../core_docs/CHANGELOG.md) is the authoritative source for shipped behavior. If this roadmap conflicts with either, do not change development direction until the conflict is explicitly confirmed.
>
> **Last reconciled**: April 12, 2026 — against [CHANGELOG.md](../core_docs/CHANGELOG.md) and [COMBATSYSTEM.md](../future/COMBATSYSTEM.md).

---

## Implementation Status Matrix

| Section | Area | Status | Phase | Evidence |
|---|---|---|---|---|
| §1–3 | Product summary, objectives, design principles | ✅ Done (foundational) | 0–1 | App embodies finance-first integrity + fantasy-first presentation |
| §3.3 | Solo mode principle | ✅ Done | 2+ | Solo campaign mode is shipped and available |
| §4 | Campaign model | ✅ Done | 2+ | `campaigns` collection, CampaignTypes.ts, CampaignService.ts, CampaignContext.tsx, CampaignHubScreen + full navigation |
| §5.1 | Expense loop | ✅ Done | 1 | Expense creation, itemization, split types, approval flow shipped |
| §5.2 | Settlement loop | ✅ Done | 1 | Settle-up redesign (Mar 2026) shipped; PAYMENT_COMPLETED → boss generation pipeline wired in CampaignContext |
| §5.3 | Campaign progression loop | ✅ Done | 2 | Campaign entity, quest system, boss generation, combat engine, battle screen, quest flow, reward resolution all shipped |
| §5.4 | Account progression loop | ⚠️ Partial | 2 | User XP + levels shipped; universal stat points UI shipped (StatAllocationScreen) |
| §5.5 | Town / identity loop | ✅ Done | 2 | Isometric tile map, 71 buildings, 5 tiers, gold economy, vault passive income |
| §6.1 | User XP | ✅ Done | 1 | GamificationService.awardXP(), xpLedger collection |
| §6.2 | Campaign XP | ✅ Done | 2 | Campaign-scoped XP via CampaignService.awardCampaignXP(); cross-fire to account XP on quest/boss completion |
| §6.3 | Universal stat points | ✅ Done | 3 | StatAllocationScreen with CampaignService.allocateStatPoints() |
| §7 | Stat model | ✅ Done | 3+8 | StatBlock (7 stats incl. precision) + StatLayers in CampaignTypes.ts; baseline stats per class; StatAllocationScreen with 7 stat rows |
| §8–9 | Class system + loadout rules | ✅ Done | 3 | 12 classes in CampaignDefinitions.ts; ClassPickerScreen for selection; loadout rules in CampaignTypes.ts |
| §10 | Combat system | ⚠️ Partial | 4+8 | CombatEngine.ts + BattleScreen.tsx. Precision-driven hit model and D20 tiering are active. **Cover remains planned in canonical direction. Gap:** item action (needs inventory). |
| §10A | Combat engine implementation spec | ⚠️ Partial | 8 | Precision and success tiers are active; cover remains planned per canonical direction in COMBATSYSTEM. **Gap:** item action |
| §11 | Dice system | ✅ Done | 4+8 | D20 roll with injectable RNG, 4-tier success system (fail/normal/strong/critical), precision modifier `floor(precision/5)`, DiceAnimation with tier labels |
| §12–13 | Skill costs + damage model | ⚠️ Partial | 4+8 | All cost types + damage formula + defense mitigation + cover damage reduction; SkillBar with cost display + innate buttons. **Gap:** item use in combat |
| §14 | Boss and rival system | ✅ Done | 5 | Expense→boss pipeline; rival boss flee/reappear; boss card on hub; RivalBossCard.tsx; boss battle flow |
| §15 | Side quests and bounties | ⚠️ Partial | 2/5 | Daily quest system shipped; QuestBoardScreen with Main/Side/Bounty tabs; narrative quests partially connected |
| §16 | Screen map | ✅ Done | 1–7 | All screens shipped — see per-screen status below |
| §17 | Data model | ✅ Done (~90%) | 1–7 | Finance entities + Campaign/Avatar/Quest/Boss/Battle types + Firestore CRUD all shipped; remaining: minor schema tuning |
| §18 | Architecture guidance | ✅ Done | 0 | TypeScript, modular feature-based, domain-separated |
| §19 | Phased implementation plan | ✅ Done | 0–7 | Phases 0–6 complete; Phase 7 (hardening) partially complete |
| §20–22 | Constraints, priorities, product statement | ✅ Done (foundational) | — | Guiding principles remain unchanged |

**Status key**: ✅ Done — shipped and validated | ⚠️ Partial — some elements shipped, gaps remain | 📋 Planned — designed but not yet implemented

## Canonical Override Notes (Apr 12, 2026)

The following overrides apply across this roadmap document:
- COMBATSYSTEM defines active development direction.
- CHANGELOG defines shipped behavior.
- Cover remains planned in canonical direction.
- Combat math canonical model is base damage + rank-based dice, layered crit resolution, and defense ratio mitigation.
- Precision is shipped and is the hit modifier stat.

When older sections below disagree, treat them as historical context until they are fully refreshed.

---

## 1) Product summary — ✅ Done (Foundational)

This product is a mobile app that combines **expense tracking** with a **lightweight RPG layer**. It supports both:

* **SOLO mode**: the user tracks their own expenses and progresses through a solo campaign.
* **CO-OP mode**: a trusted group of users splits expenses, confirms settlements, and progresses through a shared campaign.

The core design decision is that the app is **finance-first in integrity** and **fantasy-first in presentation**.

That means:

* the ledger is always the source of truth,
* the RPG layer is a derived presentation and gameplay system,
* no fantasy mechanic may change balances, splits, or settlement truth.

This product is not trying to replace accounting software. It is trying to make expense tracking feel engaging enough that people actually use it consistently.

> **Current state (Apr 2026):** The finance layer is fully shipped. The RPG layer is substantially shipped: companion system, town building, daily quests, expedition system, gold economy, XP/levels/achievements, and now the full campaign system — 12 classes with skill trees, CT-queue combat with D20 dice, expense-to-boss pipeline, quest board, battle screen, campaign hub, stat allocation, roster, archive, and campaign completion flow. Remaining: balance tuning, offline solo mode, audit export.

---

## 2) Product objectives — ✅ Done (Foundational)

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

## 3) Design principles — ✅ Done (Foundational)

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
* A solo mode broadens the app’s usefulness and reduces onboarding friction.
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

## 4) Product model — ✅ Done (Phases A–F shipped)

## 4.1 Campaign concept

Every solo user and every group has an ongoing campaign. Campaigns are **separate entities linked to groups** — each group can start its own campaign, and a group may have multiple sequential campaigns over time.

### Solo campaign

One user, one campaign, one avatar, one progression track.

### Group campaign

A trusted group shares one campaign, but each member has their own avatar and class setup within that campaign.

Why this is useful:

* It gives the app a consistent progression wrapper.
* Expenses do not feel like isolated records; they feel like events inside a persistent world.
* The campaign format creates recurring engagement.

> **Current state (Apr 2026):** Campaign entity now implemented in Phase A:
> - **CampaignTypes.ts** — Full TypeScript interfaces for campaigns, avatars, classes, skills, stats, quests, bosses, battles, combat engine, archive.
> - **CampaignService.ts** — Firestore CRUD for `campaigns/{campaignId}` + subcollections (`avatars`, `quests`, `bosses`, `battles`, `archive`). Campaign creation (solo + group), avatar creation with class-based baseline stats, boss generation from expenses, quest management.
> - **CampaignContext.tsx** — React context with real-time Firestore listeners + actions (createCampaign, startBattle, executeSkill, defeatBoss, completeQuest).
> - **CampaignDefinitions.ts** — 12 fully-defined classes with skill trees, boss archetype mappings, quest templates.
> - **CombatEngine.ts** — Pure combat engine: CT queue turns, D20 dice, damage formula, skill cost resolution, status effects, shield absorption, auto-battle AI.
> - **appEvents.ts** — 8 campaign event constants wired into typed event system.
>
> **Shipped (Phases B–F):** CampaignHubScreen, ClassPickerScreen, StatAllocationScreen, RosterScreen, BattleScreen (with CTQueueDisplay, SkillBar, DiceAnimation, BattleLog), QuestBoardScreen, QuestPrepScreen, RewardResolutionScreen, CampaignArchiveScreen, CampaignCompleteModal, RivalBossCard. All registered in CompanionTabNavigator. Campaign ActionCard entry in CompanionScreen.

## 4.2 Campaign persistence

Campaign data should persist while the campaign is active. If a group disbands and reforms, that is a new campaign.

Why this matters:

* Group identity should feel meaningful.
* A re-formed group should not accidentally inherit stale campaign state.
* The archive should preserve history, but the live campaign should remain clean.

---

## 5) Core loops — ⚠️ Partial

Core loops are the heart of the product. They must be understandable, short, and repeatable.

> **Status summary:** Expense loop ✅ | Settlement loop ✅ | Campaign progression ⚠️ | Account progression ⚠️ | Town/identity ✅

## 5.1 Expense loop — ✅ Done

1. User creates an expense.
2. Itemization is entered if needed.
3. The expense is assigned to a group (solo assignment planned).
4. The ledger calculates balances.
5. Payment is confirmed manually.
6. The expense becomes settled.
7. The fantasy layer may convert it into campaign content later (planned — Phase 5).

Why this loop matters:

* This is the actual utility of the app.
* It must be fast and reliable.
* The fantasy layer should not slow it down.

Developer note:
The expense creation flow should minimize taps and reduce ambiguity. The user should never wonder whether an entry was saved or how it was split.

> **Current state (Apr 2026):** Steps 1–6 are fully shipped. The ExpenseFlowWizard supports itemization, multi-member splitting (EQUAL/PERCENTAGE/EXACT/SHARES), group picker with duplicate detection, receipt OCR scanning, and approval flows. Step 7 (expense→campaign content conversion) is a Phase 5 deliverable. See CHANGELOG entries for Split Types Activation (Apr 2, 2026) and Settle-Up Flow Redesign (Mar 22–23, 2026).

## 5.2 Settlement loop — ⚠️ Partial

1. A user sees what is owed.
2. They confirm payment or receive confirmation.
3. The balance updates.
4. The settlement history is recorded.
5. The campaign state becomes cleaner and more rewarding (planned — settlement→campaign XP linkage not yet built).

Why this loop matters:

* Settlement is the main behavior the app is trying to encourage.
* The app should reward the feeling of resolution.

Developer note:
Settlement confirmation is social trust infrastructure, not a cosmetic feature. It needs explicit state, history, and auditability.

> **Current state (Apr 2026):** Steps 1–5 fully shipped. The settle-up flow was completely redesigned (Mar 2026) with hero balance cards, direction-based sections, inline Confirm/Decline, Send Reminder, and min-cash-flow debt simplification. Step 5 (settlement→campaign progression) is wired: `PAYMENT_COMPLETED` AppEvent triggers `CampaignService.generateBossFromSettlement()` via `CampaignContext`, which maps expense categories to boss archetypes and spawns encounters. Settlement confirmations award campaign XP via `CampaignService.awardCampaignXP()`.

## 5.3 Campaign progression loop — ⚠️ Partial

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
> - **Companion system** ✅ — 23 pixel art characters with Markov chain mood animations, mood auto-drift, speech bubbles. See COMPANIONS.md §3.1.
> - **Expedition system** ✅ — 5 timed expedition types (30min–24hr) returning gold + XP. See COMPANIONS.md §3.2.
> - **Daily quest system** ✅ — 3 quests/day (easy/medium/hard + all-complete bonus). Deterministic per user/day. See COMPANIONS.md §2.1.
> - **Battles** ✅ — CT queue combat engine (`CombatEngine.ts`), `BattleScreen` with dice, sprites, skill bar. Boss encounters via `CampaignService.generateBossFromSettlement()`.
> - **Campaign-scoped XP** ✅ — `CampaignService.awardCampaignXP()` scopes XP per-campaign. Avatar leveling tracked on `CampaignAvatar.campaignXP`/`campaignLevel`.
>
> **Phase 8 (in progress):** Combat engine v2 focuses on phased battle flow, precision-driven hit resolution, D20 success tiers, and preview tooling; cover remains planned in canonical direction.

## 5.4 Account progression loop — ⚠️ Partial

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
> - **Steps 1–2** ✅ — User XP is earned from 10+ event types (expense creation, settlement, photo upload, streaks, daily quests, expeditions, etc.). XP is tracked in `xpLedger` with idempotency guards. Levels 1–10 with increasing thresholds. See COMPANIONS.md §1.6.
> - **Gold economy** ✅ — Dual-currency system (XP for progression, Gold for spending). Gold earned from expeditions (2–140g), daily quest bonus (+10g), streak milestones (+15–200g), town vault passive income. Gold spent on town buildings (71 items across 5 categories). See COMPANIONS.md §3.4.
> - **Steps 3–4** ✅ — Universal stat points and campaign avatar allocation shipped. `StatAllocationScreen` (7 stats: STR/MNA/SPD/HP/DEF/PRC/LCK) with +/- allocation. Each level grants 3 points. `CampaignService.allocateStatPoints()` persists via Firestore `updateDoc` with `increment`. Phase 8 added precision (PRC) as 7th stat.

## 5.5 Town / identity loop — ✅ Done

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
> - **Phase 1 (Apr 2):** Icon-based tile grid with auto-placement, 27 buildings across 5 categories (Buildings, Infrastructure, Fences, Decorations, Companion Fixtures), 5 tiers (Hamlet→City), BlurModal purchase flow, Firestore transaction-backed purchases. See COMPANIONS.md §3.10.
> - **Phase 2 (Apr 3):** Isometric pixel-art tile map using Skia Canvas with 31 preloaded assets from `assets/miniatureworld/`. Tap-to-place building placement. Pan/zoom/tap gestures. Projection math refactored into `tileProjection.ts` single source of truth. See CHANGELOG (Apr 3, 2026).
> - **Building catalog:** Expanded to 71 buildings with passive vault income (gold collection over time).
> - **Town vault:** Passive gold accumulation adds a persistent earning loop.
>
> **Planned enhancements:** Companion wander animation in town, tier-up cutscene, building details on long-press. See COMPANIONS.md §3.10 Phase 2 deferred items.

---

## 6) Progression system — ⚠️ Partial

> **Status summary:** User XP ✅ | Campaign XP ✅ | Universal stat points 📋

## 6.1 User XP — ✅ Done

User XP is the account-wide progression level.

It grants:

* universal stat points,
* account-level progression feedback,
* long-term continuity between campaigns.

Why it exists:

* It preserves progression when the user starts a new campaign.
* It rewards the user regardless of which campaign they are in.

> **Current state (Apr 2026):** Fully shipped. `GamificationService.awardXP()` writes to `xpLedger` with idempotency guards (userId + referenceId + reason). 10+ XP event types including expense creation, settlement, photo upload, fast approval, friend invite, streaks, daily quests. Level 1–10 progression (12,000 XP cap). Level-up celebration modal with particle animation. XP multiplier events via `gameConfig/xpMultiplier`. See COMPANIONS.md §1.5, §1.6, §2.6.

## 6.2 Campaign XP — ⚠️ Partial

Campaign XP is avatar progression inside one specific solo or group campaign.

It grants:

* campaign-level stat points,
* campaign level-up feedback,
* local progression inside the current group or solo campaign.

Why it exists:

* Each campaign needs its own identity and growth curve.
* It makes groups feel like separate RPG saves.

> **Current state (Apr 2026):** Campaign-scoped XP fully shipped. `CampaignService.awardCampaignXP()` writes XP to `CampaignAvatar.campaignXP` within the campaign's Firestore subcollection (`campaigns/{cid}/avatars/{uid}`). Account-level XP still accumulates on `userGameProfiles/{uid}.xp` for global progression. Both scopes coexist — campaign XP drives avatar leveling and stat allocation, account XP drives global unlocks.

## 6.3 Universal stat points — ✅ Done

Universal stat points are earned by the account, but can be allocated to campaign avatars.

Why this matters:

* The account’s long-term growth should remain useful.
* A user should not feel like they “missed” progress because they joined a new campaign later.

Implementation note:
A campaign avatar should track:

* how many universal points exist in the account,
* how many have already been allocated to that avatar,
* how many remain available to spend.

That explicit bookkeeping will prevent confusion and future bugs.

> **Current state (Apr 2026):** Fully shipped. `StatAllocationScreen` provides a 7-stat allocation UI (STR/MNA/SPD/HP/DEF/PRC/LCK). Each campaign level grants 3 universal stat points. `CampaignAvatar.universalPointsAllocated` tracks how many points have been spent. `CampaignService.allocateStatPoints()` persists allocation to `campaigns/{cid}/avatars/{uid}` via Firestore `updateDoc` with `increment`.

---

## 7) Stat model — ⚠️ Partial (Phase 3 core done; precision stat planned)

The combat stat model is linear and intentionally simple.

> **Current state (Apr 2026):** 6-stat `StatBlock` implemented in `CampaignTypes.ts` (strength, defense, speed, health, mana, cdr) with baseline stats per class, `StatLayers` (baseline/campaignEarned/equipment/battleTemp), `StatAllocationScreen` for point allocation. **Gap:** the combat engine spec requires a 7th stat — `precision` — governing hit accuracy and D20 roll modifiers. Currently speed handles both queue position AND hit modifiers (`d20 + floor(speed/10)`). Planned separation: speed → queue/dodge only, precision → hit accuracy/roll modifier.

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

## 8) Class system — ⚠️ Partial (Phase A — Definitions shipped)

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

## 9) Class structure and loadout rules — ✅ Done

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

* Rank 2 → 1 passive slot
* Rank 4 → 2 passive slots
* Rank 6 → 3 passive slots
* Rank 8 → 4 passive slots
* Rank 10 → 5 passive slots

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

## 10) Combat system — ✅ Done (Phase 4 + 8; item action deferred)

> **Current state (Apr 2026):** Combat engine fully implemented in `CombatEngine.ts` (pure, no Firestore/React dependencies):
> - **CT queue** — Units start at `100 - SPD`, tick down until 0, act, reset to skill's `ctCost`. Ties resolved by queue order.
> - **D20 + dice model** — Attack rolls use precision (`d20 + precision/5`), while damage uses guaranteed baseline plus rank-based dice (d4-d12). Injectable RNG via `rollD20(rng?)`.
> - **D20 success tiers** (Phase 8) — `getSuccessTier()`: fail (1-5, 0.65x), normal (6-12, 1.0x), strong (13-17, 1.15x), critical (18-20, 1.5x + passive bonus).
> - **Damage formula** — `(skillBase + scalingStat * multiplier + damageDice) * tierMultiplier`, then mitigated by defense ratio `100 / (100 + 2*DEF)` and other modifiers.
> - **Skill costs** — Cooldowns (tick 1/turn, CDR cap 25%), mana (regen 5/turn + bonuses), HP costs (self-KO prevention on enemy kill).
> - **Status effects** — DoTs, HoTs, buffs, debuffs, damage_reduction (from cover) with duration tracking + tick.
> - **Shield absorption** — Absorbs before HP.
> - **Innate actions** (Phase 8) — Flee is available (D20 + SPD/10 vs difficulty threshold, blocked in boss battles). Cover remains planned in canonical direction.
> - **BattlePhase state machine** (Phase 8) — `preparation` → `queueing` → `player_turn`/`enemy_turn` → `resolving` → `reward`/`finished`.
> - **Precision stat** (Phase 8) — 7th stat on StatBlock. Attack modifier: `floor(precision/5)`. Speed now exclusively controls queue position and dodge.
> - **Damage preview** (Phase 8) — `previewDamageRange()` returns min/max/avg. SkillBar shows tooltip on long-press.
> - **Auto-battle AI** — Priority chain: heal critical (or cover if no heal) → debuff boss → buff party → highest damage → basic attack.
> - **Battle state factory** — `createBattleState()`, `createEnemyUnits()`, `beginBattle()`, `finishBattle()`.
> - **Full auto-resolve** — `runFullAutoBattle(state, maxTurns, rng?)` for quick-resolve or deterministic testing.
> - **CampaignContext integration** — `startBattle`, `beginBattle`, `executeBattleTurn`, `runAutoBattle` actions.
>
> **Shipped (Phase B):** BattleScreen.tsx (full-screen battle view with phase-aware rendering), CTQueueDisplay.tsx (horizontal turn order), SkillBar.tsx (skill buttons with cooldown/mana + cover/flee innate buttons + damage preview tooltip), DiceAnimation.tsx (D20 roll overlay with success tier labels), BattleLog.tsx (color-coded turn log), BattleUnitSprite.tsx (sprite wrapper for combat). All registered in CompanionTabNavigator.
>
> **Gaps (Phase 8 — see §10A):** `item` action remains pending inventory integration. Cover also remains planned in canonical direction.

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

## 10A) Combat engine implementation spec — ⚠️ Partial (Phase 8, item action remaining)

This section defines the target architecture for the combat engine overhaul. The current `CombatEngine.ts` (931 lines, pure TypeScript, no React/Firestore dependencies) implements the core loop. This spec formalizes the design contract, identifies gaps, and sets acceptance criteria for Phase 8.

> **Current state (Apr 2026):** `CombatEngine.ts` in `src/services/gamification/` implements the full combat loop: CT queue, D20 rolls with 4-tier success system (fail/normal/strong/critical), damage formula with tier multipliers, skill costs, status effects, shield absorption, auto-battle AI, flee action (D20 vs difficulty threshold, blocked in boss battles); cover remains planned in canonical direction, BattlePhase state machine (preparation → queueing → player_turn/enemy_turn → resolving → reward → finished), injectable RNG for deterministic testing, precision stat integration, and damage preview function. All functions are pure. **Remaining gap:** `item` action (requires inventory system, Phase 6 dependency).

## 10A.1 Architecture

The combat engine is a **pure TypeScript domain module** — no React Native rendering or Firestore dependencies. All functions must be testable without mounting a component tree.

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
CombatEngine.ts     → combatQueue.ts (CT logic), combatMath.ts (damage/dice),
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
  | 'finished';      // Terminal state — navigate away
```

Extend `BattleState` with:

```ts
interface BattleState {
  // ... existing fields ...
  phase: BattlePhase;          // NEW — current state machine phase
  turnIndex: number;           // NEW — alias for currentTurn (spec alignment)
  rewards?: RewardBundle;      // NEW — populated when phase = 'reward'
  winner?: 'players' | 'enemies'; // NEW — set when battle ends
}
```

**Why:** A state machine prevents messy battle logic. The engine always knows what phase it is in, whose turn it is, and what happens after an action resolves. The UI renders phase-appropriate controls.

**Migration:** The current `result: BattleResult` field remains for backward compatibility. `winner` is set when `result` transitions from `'in_progress'`.

## 10A.3 Queue system (existing — spec alignment)

The current CT queue matches the spec:

* **Init:** `CT = max(1, 100 - speed)`. Higher speed → lower starting CT → acts sooner.
* **Advance:** Subtract minimum CT from all alive units. First unit reaching 0 acts.
* **Reset:** After acting, `CT = skill.ctCost`.
* **Tie-breaking:** Array position (queue order) — deterministic.
* **Speed buffs/debuffs:** Adjust CT but cannot jump ahead of a unit already at 0 CT.

Queue pseudocode (reference — already implemented in `advanceCTQueue()`):

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
| `attack` | ✅ Shipped | Basic attack — always available, costs no mana. Uses `skillType: 'basic'`. |
| `skill` | ✅ Shipped | Active skill from loadout. Costs mana/cooldown/HP per `SkillDefinition`. |
| `item` | 📋 Planned | Use a consumable from inventory. Applies effect, consumes item. No CT cost penalty. Blocked on inventory system (Phase 6). |
| `cover` | 📋 Planned | Defend-style mitigation action reserved for canonical planned scope; not treated as shipped until rollout confirmation. |
| `flee` | ✅ Shipped | Attempt to escape battle. D20 + SPD/10 vs `10 + difficulty*2`. Success → battle ends with `fleeFlag=true`. Failure → lose turn (CT=100). Blocked in boss battles. `executeFlee()` in CombatEngine. |

### Implementation notes for planned actions

**Cover:**
* Add `'cover'` to `SkillEffectTag` union.
* Implement as a self-targeted buff: `{ type: 'buff', property: 'damage_reduction', value: 0.5, turnsRemaining: 1 }`.
* CT cost: 60 (roughly half a normal turn — rewards defensive play by getting next turn sooner).
* Every class has cover innately — it is not part of the loadout. Add to `executeSkill` as a special-case action.

**Flee:**
* Add `'flee'` action type alongside skill execution.
* D20 roll: `d20 + floor(speed/10)` vs `10 + (difficulty * 2)`. Success → `phase = 'finished'`, `result = 'defeat'` with `fleeFlag = true` (no penalty beyond lost rewards).
* Blocked when `bossId` is non-null (boss battles cannot be fled).
* UI: flee button in SkillBar, greyed out in boss encounters.

**Item:**
* Requires inventory system (Phase 6 gap — `InventoryItem` type exists in data model §17 but no runtime inventory).
* Item use resolves like a skill with `costType: 'none'` and `ctCost: 0` (does not cost a full turn).
* Item effects: heal potion (restore HP%), mana potion (restore mana%), antidote (clear debuffs), bomb (AoE damage).
* Deferred until inventory system ships.

### Why a small action set matters

The app is not building a complex tactics simulator. It is building a readable encounter loop that supports expense-as-boss gameplay. Five actions (attack, skill, item, cover, flee) are easy to teach and easy to animate.

## 10A.5 Skill resolution pipeline

Every skill resolves in the same order. This creates a consistent mental model and prevents edge-case bugs.

### Resolution order (currently implemented in `executeSkill()`)

1. **Pay cost** — Deduct mana, apply cooldown, or deduct HP. Cost check happens before execution.
2. **Roll D20** — Attack roll: `d20 + floor(precision/5)` *(currently uses `floor(speed/10)`)*.
3. **Determine hit/success tier** — Compare roll to dodge threshold.
4. **Compute damage or effect** — Base damage formula with tier multiplier.
5. **Apply shields, defense, HP** — Shield absorbs first, then defense mitigates, then HP.
6. **Apply status effects** — Buffs, debuffs, DoTs, HoTs from skill effect tags.
7. **Check defeat/down state** — KO units at HP ≤ 0. Self-KO prevention on enemy-kill turn.
8. **Update queue** — Reset acting unit's CT to `skill.ctCost`.
9. **Append battle log** — Build `TurnRecord` with damage, healing, effects applied.

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

* **Step 4:** Tier multipliers: fail → 0.65x, normal → 1.0x, strong → 1.15x, critical → 1.5x (matches existing crit behavior, adds granularity).

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

* **Hit or miss** — attack roll vs dodge threshold.
* **Damage variance** — `rollValue / 10` multiplier (0.1x to 2.0x range).
* **Success tiers** — fail (1-5), normal (6-12), strong (13-17), critical (18-20).

### Preview behavior (planned)

Before committing to a skill, the UI should show an expected outcome range based on the unit's precision stat and skill base values. This gives the player informed choice without removing uncertainty.

## 10A.7 Damage and defense handling

### Current formula (implemented in `calculateDamage()`)

```ts
scalingValue = attacker.currentStats[skill.scalingStat]
d20Variance  = damageRoll.rollValue / 10    // 0.1x to 2.0x
rawDamage    = (skill.baseValue + scalingValue * skill.skillMultiplier) * d20Variance
```

Crit: `rawDamage *= (1.5 + critDamageBonus)` — natural 18-20.
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
| `cooldown` | Skill unavailable for N turns; ticks down 1/turn; CDR stat reduces (cap 25%) | ✅ |
| `mana` | Deducted from `unit.mana`; regen 5/turn + bonuses; passive reduction possible | ✅ |
| `hp` | `round(hp * skill.hpCostPct)` deducted; self-KO prevention on enemy-kill turn | ✅ |
| `none` | Basic attack — always available, never costs mana | ✅ |
| `mixed` | Combination of mana + cooldown | ✅ |
| `ct_cost` | Heavier skills set higher CT after use, delaying next turn | ✅ |

### Rules

* HP-cost skills can down the user (except mercy rule on enemy-kill).
* Mana is restored at 5/turn + passive bonuses.
* Basic attack always exists and never costs mana — a player is never locked out of acting.
* CDR from raw stat caps at 25%; additional reduction comes only from passives or active effects.

## 10A.9 Auto-battle support

### Current AI priority chain (implemented in `getAutoBattleAction()`)

1. `heal_critical` — If any ally HP < 30% threshold, use a heal skill.
2. `debuff_boss` — If an enemy is a boss (classId starts with `'the_'`), apply a debuff.
3. `buff_party` — Use a buff skill (targeting `all_allies` or `self`) if off cooldown.
4. `highest_damage` — Pick highest damage skill the unit can afford; target lowest-HP enemy.
5. `basic_attack` — Fallback to basic attack on lowest-HP enemy.

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
* Show skill buttons (SkillBar) — including cover and flee when implemented.
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

1. ✅ Start a battle from a quest.
2. ✅ Build a speed-based CT queue.
3. ✅ Resolve turns with D20.
4. ✅ Apply skill cost and effect.
5. ✅ Handle HP, mana, shield, and cooldown.
6. ✅ End battle on win/lose.
7. ✅ Produce a reward bundle.
8. ✅ Persist battle history in campaign state.
9. 📋 `BattlePhase` state machine governs all transitions.
10. 📋 `cover` action available to all units.
11. 📋 `flee` action with D20 check (blocked in boss battles).
12. 📋 `item` action consumes inventory item.
13. 📋 Precision stat modifies D20 rolls (separating from speed).
14. 📋 Explicit success tiers (fail/normal/strong/critical) replace binary hit/crit.
15. 📋 UI previews expected outcome range before skill commitment.

**Status key:** ✅ Shipped | 📋 Planned (Phase 8)

---

## 11) Dice system — ⚠️ Partial (D20 + crits shipped; success tiers + precision planned)

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

## 12) Skill costs and resources — ⚠️ Partial (item action planned)

> **Current state (Apr 2026):** All skill cost types shipped: cooldown, mana, HP, mixed, and none in `CombatEngine.ts executeSkill()`. CDR stat reduces cooldowns (cap 25%). Mana regen 5/turn + passive bonuses. HP self-KO prevention on enemy-kill turn. Basic attack always available at zero cost. `SkillBar.tsx` shows mana cost badges, cooldown overlays, plus innate Flee (D20 roll, blocked in boss battles); cover remains planned in canonical direction. **Remaining gap:** `item` action (requires inventory system).

## Cost types

Active skills can cost:

* cooldown,
* mana,
* HP.

In addition, the following non-skill actions are part of the action grammar:

* **cover** *(planned)* — no resource cost; applies a damage reduction buff + sets CT to 60. See §10A.4.
* **item** *(planned)* — consumes an inventory item; no CT cost (does not count as a full turn). Requires inventory system.
* **flee** *(planned)* — no resource cost; D20 roll vs difficulty threshold. Blocked in boss battles. See §10A.4.

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
* It prevents “no move” soft-locks.
* It keeps the early implementation manageable.

---

## 13) Damage and defense model — ⚠️ Partial (formula shipped; success tiers planned)

The first implementation uses a D20-based damage framework.

> **Current state (Apr 2026):** Damage formula implemented in `CombatEngine.ts calculateDamage()`: `(skillBase + scalingStat * multiplier) * d20Variance`. Crit multiplier 1.5x + passive bonuses. Defense mitigation: `max(1, rawDamage - defense * (1 - piercePct))`. Shield absorption before HP in `applyDamageToUnit()`. Passive bonuses for crit damage, damage vs debuffed targets, class damage. **Gaps:** no 4-tier damage multiplier (fail/normal/strong/critical — see §10A.7), defense pierce hardcoded at 0%.

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

## 14) Boss and rival system — ✅ Done (Pipeline + UI shipped)

> **Current state (Apr 2026):** Expense→boss pipeline fully implemented in `CampaignService.generateBossFromSettlement()`:
> - **Boss generation** from expense properties: `totalAmount→HP`, `category→archetype` (9 mappings), `items.length→phases`, `splitType→trait`.
> - **9 boss archetypes** with name patterns and visual flavors (Gourmand, Road Warden, Revelmaster, Hoarder, Siphon, Landlord, Wanderer, Plague Lord, Anomaly).
> - **Rival system** — Every 5th boss has 30% chance to become a Rival. Rivals learn player's class, can flee (tracked), reappear with +10% stats. `rivalData` on boss document.
> - **PAYMENT_COMPLETED event hook** in CampaignContext triggers boss generation automatically.
> - **Boss defeat** increments `bossesDefeated`, clears `currentBossId`, creates archive entry, awards XP/gold cross-fired to GamificationService.
> - **Shipped (Phase E):** Boss status card on CampaignHubScreen with HP bar, archetype, traits, rival badge. RivalBossCard.tsx for fled rivals. Boss challenge → QuestPrepScreen → BattleScreen → RewardResolutionScreen flow. Remaining: rival stat boost on reappearance.

## 14.1 Boss generation

Bosses can be generated from whole expense records.

Why this is interesting:

* It turns financial events into campaign content.
* It creates a memory layer for group or solo play.
* It makes the ledger feel like story material.

## 14.2 Rival bosses

One expense record can generate one rival boss variant.

A rival:

* learns the player’s class type,
* may counter the player’s preferred style,
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

## 15) Side quests and bounties — ⚠️ Partial

If the main boss is too difficult, the campaign should offer side quests or bounties.

Why:

* This keeps players from hitting a hard wall.
* It gives underpowered groups a path to recover.
* It makes the campaign feel like an explorable RPG structure rather than a single linear challenge.

Developer note:
This should be introduced as a pressure-release mechanism, not as filler content.

> **Current state (Apr 2026):**
> - **Daily quest system** ✅ — 3 daily quests (5/10/15 XP + 20 XP all-complete bonus + 10 gold bonus). Deterministic selection per user/day from 8 quest types. Tracked in `dailyQuestProgress/{date}_{userId}`. See COMPANIONS.md §2.1.
> - **Narrative/boss-linked quests** ❌ — No connection between quests and expense data, bosses, or campaign narrative. The daily quest system is generic ("log an expense", "settle a debt") not plot-driven.
> - **Materials/loot drops** ✅ — 6 material types with RNG by quest difficulty. Materials are a precursor to the InventoryItem system described in §17. See COMPANIONS.md §2.2.
>
> **Planned:** Full narrative quest integration (COMPANIONS.md §3.3) and boss-linked bounties require the combat engine (Phase 4) and boss system (Phase 5).

---

## 16) Screen map — ✅ Done

The app should have a small but clear navigation structure.

> **Status summary:**
> | Screen | Status |
> |---|---|
> | 16.1 Welcome / onboarding | ⚠️ Partial (auth shipped; RPG onboarding planned) |
> | 16.2 Mode selection | 📋 Planned |
> | 16.3 Town / home screen | ✅ Done |
> | 16.4 Campaign dashboard | ✅ Done (CampaignHubScreen) |
> | 16.5 Add expense | ✅ Done |
> | 16.6 Expense detail | ✅ Done |
> | 16.7 Settlement screen | ✅ Done |
> | 16.8 Battle screen | ✅ Done (BattleScreen + CTQueueDisplay, SkillBar, DiceAnimation, BattleLog) |
> | 16.9 Class screen | ✅ Done (ClassPickerScreen) |
> | 16.10 Stat screen | ✅ Done (StatAllocationScreen) |
> | 16.11 Archive screen | ✅ Done (CampaignArchiveScreen) |
> | 16.12 Settings | ✅ Done |

## 16.1 Welcome / onboarding — ⚠️ Partial

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

## 16.2 Mode selection — 📋 Planned

Purpose:

* choose solo campaign or co-op campaign.

Why:

* This is a major product identity decision and should be explicit.

> **Current state (Apr 2026):** No mode selection screen exists. The app enters directly into the group-based expense flow. This screen requires the solo mode implementation (Phase 2+).

## 16.3 Town / home screen — ✅ Done

Purpose:

* central emotional hub,
* show avatar,
* show town or guild hall,
* show campaign status,
* show quick access to expense creation and battle.

Why:

* This is the “home base” of the RPG layer.
* It gives users a persistent world.

## 16.4 Campaign dashboard — ✅ Done

Purpose:

* show campaign level,
* show active quests and bosses,
* show group state,
* show campaign progress.

Why:

* This is the operational hub for the campaign loop.

> **Current state (Apr 2026):** Shipped. `CampaignHubScreen` serves as the central campaign dashboard. Shows avatar card with sprite, class, level, XP bar; boss status card with HP bar, archetype, traits, and "Challenge Boss" button; fled rivals section; quest board link with pending quest badge; party roster link (group campaigns); archive link. "Start Campaign" CTA when no active campaign navigates to ClassPickerScreen.

## 16.5 Add expense — ✅ Done

Purpose:

* quick expense entry,
* itemization,
* participant selection,
* settlement intent.

Why:

* This is the highest-friction real-world task.
* It needs to be efficient.

> **Current state (Apr 2026):** Fully shipped. ExpenseFlowWizard with group picker, member picker, itemization, 4 split types (EQUAL/PERCENTAGE/EXACT/SHARES), receipt OCR scanning (dual-AI: Gemini + GPT), category picker (30+ categories), approval flow. See CHANGELOG (Apr 2, 2026: Split Types Activation).

## 16.6 Expense detail — ✅ Done

Purpose:

* show the ledger view,
* show line items,
* show settlement state,
* show fantasy translation if relevant.

Why:

* This is the trust screen.
* The user must always understand the account state.

> **Current state (Apr 2026):** Shipped. Expense detail shows ledger view, line items, settlement state, inline payment panel with hero amount display and currency chips.

## 16.7 Settlement screen — ✅ Done

Purpose:

* confirm payments,
* mark partial or full settlement,
* show outstanding balance.

Why:

* Settlement is the behavioral objective of the app.

> **Current state (Apr 2026):** Fully redesigned (Mar 2026). SettleUpScreen hub with hero balance, AnimatedSegmentedControl (People/Groups toggle), visually distinct action items (orange approval cards, green cash cards). GroupBalancesScreen with direction sections, flow bars, dual Cash/Transfer buttons, Send Reminder, min-cash-flow debt simplification banner. See CHANGELOG (Mar 22–23, 2026).

## 16.8 Battle screen — ✅ Done

Purpose:

* turn-based combat,
* queue visibility,
* skill selection,
* dice preview and outcome,
* health, mana, cooldowns.

Why:

* This is where the RPG identity becomes concrete.

> **Current state (Apr 2026):** Shipped. `BattleScreen` — full-screen immersive battle with ImageBackground, CTQueueDisplay (horizontal turn-order bar), BattleUnitSprite (Skia sprites with flip support), SkillBar (mana cost badges, cooldown overlays), DiceAnimation (D20 roll overlay with reanimated), BattleLog (color-coded turn log). Steps one turn at a time with ~1200ms animation delay. Auto-battle "Fast Forward" mode. Victory/Defeat overlay navigates to RewardResolutionScreen.

## 16.9 Class screen — ✅ Done

Purpose:

* show primary and secondary class,
* show ranks and unlocked skills,
* allow primary class switching,
* allow secondary class assignment before campaign start.

Why:

* Class identity is a major part of player attachment.

> **Current state (Apr 2026):** Shipped. `ClassPickerScreen` — grid selection of 6 primary classes (Warrior, Mage, Rogue, Cleric, Ranger, Monk) with stat bias and cost bias display, plus 6 optional secondary classes (Berserker, Enchanter, Assassin, Paladin, Summoner, Bard) with focus labels. Supports `create` and `respec` modes. Confirm creates a solo campaign via CampaignContext and navigates back.

## 16.10 Stat screen — ✅ Done

Purpose:

* show current stats,
* show baseline, campaign, and universal point sources,
* allow free respec.

Why:

* The stat model needs to be understandable and editable.

> **Current state (Apr 2026):** Shipped. `StatAllocationScreen` — 7-stat allocation UI (STR, MNA, SPD, HP, DEF, PRC, LCK) with +/- buttons, per-stat descriptions, delta display (+N in green), remaining points counter. Precision (PRC) added in Phase 8. Each level grants 3 universal points. Confirm calls `CampaignService.allocateStatPoints()` (Firestore `updateDoc` with `increment`).

## 16.11 Archive screen — ✅ Done

Purpose:

* show previous campaigns,
* show defeated bosses,
* show rewards and class history.

Why:

* This provides long-term memory and continuity.

> **Current state (Apr 2026):** Shipped. `CampaignArchiveScreen` — AnimatedSegmentedControl tabs (All / Bosses / Quests / Milestones). FlatList of `ArchiveEntry` items from `CampaignService.getArchiveEntries()`. Entries display title, description, and formatted date.

## 16.12 Settings — ✅ Done

Purpose:

* group permissions,
* notifications,
* privacy,
* account management.

Why:

* Trust and control are essential in finance-adjacent apps.

> **Current state (Apr 2026):** Shipped. SettingsScreen with group permissions, notifications, privacy controls, security (PIN/biometric lock), AI provider selection, achievement display, companion selection, currency settings, migration dashboard.

---

## 17) Data model — ✅ Done (~90%)

This is the recommended conceptual data model. The table below shows entity-by-entity implementation status.

> **Entity status:**
> | Entity | Status | Evidence |
> |---|---|---|
> | User | ✅ Done | `userGameProfiles/{uid}`: xp, level, streak, gold, companionCharacter, equippedCosmetics, equippedTitle, materials, townState |
> | Campaign | ✅ Done | `campaigns/{cid}`: type, ownerId, groupId, currentChapter, bossesDefeated, totalQuestsCompleted, status. CampaignService + CampaignContext |
> | Group | ✅ Done | `groups/{gid}`: name, members, joinCode, status, type (one-on-one / multi-member) |
> | GroupMembership | ✅ Done | Implicit via group `members` array and role fields |
> | CampaignAvatar | ✅ Done | `campaigns/{cid}/avatars/{uid}`: primaryClassId, secondaryClassId, classRank, campaignLevel, campaignXP, stats (StatBlock), universalPointsAllocated, skillIds, passiveIds, companionCharacterId |
> | Class | ✅ Done | `CampaignDefinitions.ts`: 6 primary classes (warrior/mage/rogue/cleric/ranger/monk) + 6 secondary classes with stat biases, skill IDs, passives, rank thresholds |
> | Skill | ✅ Done | `CampaignDefinitions.ts`: 36+ skills with targetType, ctCost, manaCost, power, element, statusEffects |
> | Loadout | ✅ Done | Avatar `skillIds[]` + `passiveIds[]` determined by class + rank |
> | StatAllocation | ✅ Done | `StatAllocationScreen` + `CampaignService.allocateStatPoints()`. 6 stats: STR/MNA/SPD/HP/DEF/LCK. 3 points per level |
> | Expense | ✅ Done | `group_expenses/{eid}`: payer, title, amount, currency, category, status, splitType, splitConfig |
> | ExpenseLineItem | ✅ Done | `splits` subcollection on expense documents |
> | ExpenseShare | ✅ Done | Per-member share amounts in split documents |
> | PaymentConfirmation | ✅ Done | `payments/{pid}`: from, to, amount, status, method, currency |
> | LedgerBalance | ✅ Done | Computed by BalanceCalculationService with caching |
> | Boss | ✅ Done | `campaigns/{cid}/bosses/{bid}`: name, level, archetype, hp, maxHp, traits, isRival, generatedFrom. CampaignService.generateBoss/getFledRivals |
> | RivalBoss | ✅ Done | Boss with `isRival: true`, `fleeThreshold`, `stolenRewards`. getFledRivals query, RivalBossCard component |
> | BattleEncounter | ✅ Done | `CombatEngine.ts`: initBattle → BattleState with queue, turnLog, status. stepOneTurn/runFullAutoBattle for execution |
> | QueueUnit | ✅ Done | `CampaignTypes.ts`: unitId, unitType, ct, currentStats, hp/mana/shield, statusEffects, cooldowns, skillIds, classId |
> | InventoryItem | ⚠️ Partial | Materials (6 types) stored on `userGameProfiles.materials`; shop items in `ownedShopItems[]`; full equipment system planned |
> | AuditEvent | 📋 Planned | No formal audit trail; `xpLedger` and `goldLedger` provide partial traceability for gamification events |

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

> **Current state (Apr 2026):** ✅ Shipped. `campaigns` collection fully implemented in Phase A. `CampaignService.createCampaign()` creates campaign documents with type (solo/group), status, chapter tracking, boss/quest counters. Linked to Group via `groupId`. Sequential campaigns per group supported. `CampaignContext` provides real-time Firestore listeners.

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

Represents the user’s character inside one campaign.

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

> **Current state (Apr 2026):** ✅ Shipped. `CampaignAvatar` stored in `campaigns/{cid}/avatars/{uid}` with fields: `userId`, `campaignId`, `companionCharacterId`, `primaryClassId`, `secondaryClassId`, `classRank` (1-10), `campaignLevel`, `campaignXP`, `stats` (StatBlock with 7 stats including precision), `equippedLoadout` (basic + 4 actives + 5 passives), `universalPointsAllocated`. Created via `ClassPickerScreen`, managed by `CampaignContext`.

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

Represents the campaign avatar’s selected combat configuration.

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

Represents each user’s share of a line item.

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

> **Current state (Apr 2026):** ⚠️ Partial. Materials (6 types) are tracked on `userGameProfiles.materials` as `{materialId: count}`. Shop items are tracked in `ownedShopItems[]`. These are precursors to a full InventoryItem system. The complete equipment model (slotType, rarity, statBonuses, activeBonusState) requires the stat model (§7) and combat system (§10).

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

> **Current state (Apr 2026):** 📋 Planned as a formal system. Partial traceability exists through `xpLedger` and `goldLedger` collections (gamification events) and Firestore document history. A comprehensive AuditEvent system covering expense edits, payment confirmations, and deletions is a Phase 7 deliverable.

---

## 18) Architecture and implementation guidance — ✅ Done

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

> **Current state (Apr 2026):** All recommendations are implemented. The codebase was migrated to TypeScript (74 files converted in Phase 6D, Mar 11–15, 2026). Architecture follows modular feature-based patterns with domain-separated services (`src/services/`), contexts (`src/contexts/`), schemas (`src/schemas/`), and screens organized by domain (`src/screens/{domain}/`). Rendering uses React Native + Skia (sprites, isometric tiles) + Reanimated (animations). State management uses React Contexts with clear server/local separation. See CHANGELOG (Phase 6D, Mar 2026).

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

## 19) Phased React Native implementation plan — ⚠️ Partial (Phases 0–6 complete; Phase 7 partial; Phase 8 planned)

> **Phase completion summary:**
> | Phase | Status | Key Evidence |
> |---|---|---|
> | Phase 0 — Foundation | ✅ Done | TypeScript, navigation shell, design tokens, Expo + Firebase stack |
> | Phase 1 — Finance core | ✅ Done | Expense creation, 4 split types, settlement, balances, payment confirmation |
> | Phase 2 — Campaign & avatar layer | ✅ Done | Companion system (23 characters), town building (isometric), account XP, daily quests, expeditions, gold economy |
> | Phase 3 — Class system | ✅ Done | 12 classes in CampaignDefinitions.ts; ClassPickerScreen + StatAllocationScreen shipped |
> | Phase 4 — Combat engine | ⚠️ Partial | CombatEngine.ts + BattleScreen shipped; cover and item remain planned in canonical direction |
> | Phase 5 — Boss & rival system | ✅ Done | Expense→boss pipeline + boss card on hub + RivalBossCard + boss battle flow |
> | Phase 6 — Rewards & cosmetics | ✅ Done | Cosmetics shipped; QuestBoardScreen, RewardResolutionScreen, CampaignArchiveScreen, CampaignCompleteModal |
> | Phase 7 — Hardening | ⚠️ Partial | Firebase security rules, transaction-backed writes shipped; audit export, offline solo planned |
> | Phase 8 — Combat engine v2 | ⚠️ Partial | Precision stat ✅, success tiers ✅, damage preview ✅, injectable RNG ✅. Cover and item remain planned in canonical direction. |

## Phase 0 — foundation — ✅ Done

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

## Phase 1 — finance core — ✅ Done

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

## Phase 2 — campaign and avatar layer — ✅ Done (Substantially)

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

* This is where the app’s identity becomes visible.
* Users should start feeling that this is more than a spreadsheet.

Acceptance target:
The app visibly rewards use and shows persistent progression.

> **Substantially completed.** The app rewards use through multiple shipped systems:
> - **Avatar rendering** ✅ — 23 pixel art characters with 11 animation types, Markov chain mood system (idle/excited/sleepy/adventuring), Skia Canvas rendering, anchor point system, image preloading. HomeScreen compact widget + CompanionScreen full hub.
> - **Town/guild hall** ✅ — Isometric pixel art tile map, 71 buildings, 5 tiers, tap-to-place, pan/zoom gestures, passive vault income.
> - **Account XP** ✅ — 10+ XP event types, xpLedger with idempotency, level 1–10 progression, level-up celebration modal, XP multiplier events.
> - **Gold economy** ✅ — Dual currency (XP + Gold), earned from expeditions/quests/streaks/vault, spent on town buildings.
> - **Daily quests** ✅ — 3 quests/day, all-complete bonus, material drops.
> - **Expeditions** ✅ — 5 timed types (30min–24hr), gold + XP returns, anti-cheat.
> - **Streaks** ✅ — 7/14/30/60/100-day milestones with tiered rewards + streak freeze.
> - **Achievements** ✅ — 8 achievements with progress bars, 9 unlockable titles.
> - **Cosmetics** ✅ — 20 borders/frames, companion shop items.
> - **Leaderboard** ✅ — Weekly group XP leaderboard.
>
> **Remaining gaps:** Campaign-scoped XP visibility (currently uses global XP system). These are minor polish items.

## Phase 3 — class system — ✅ Done

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

## Phase 4 — combat engine — ⚠️ Partial (core shipped; v2 enhancements in Phase 8)

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

## Phase 5 — boss and rival system — ✅ Done

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

## Phase 6 — rewards, cosmetics, town evolution — ⚠️ Partial

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

> **Partially complete.** Cosmetic unlocks (✅ from streaks/achievements), town upgrades (✅ isometric with 71 buildings), avatar progression visuals (✅ companion mood system + character unlocks). Remaining: inventory system (full equipment model), boss-earned cosmetics, group member presence in town (companion wander), archive presentation.

## Phase 7 — hardening and reliability — ⚠️ Partial

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

> **Partially complete.** Firebase security rules (✅), transaction-backed writes for state changes (✅), crash handling via Firebase Crashlytics (✅), permissions and roles (✅ group admin/member/leader). Remaining: audit log export, conflict resolution for complex concurrent edits, data recovery, offline handling for solo mode, performance optimization at scale.

## Phase 8 — combat engine v2 — ⚠️ Partial (item action remaining)

Goal: bring the combat engine to full spec alignment with the KOPAP3-style campaign battle loop (§10A).

Deliverables:

* ✅ `BattlePhase` state machine (`preparation` → `queueing` → `player_turn` → `enemy_turn` → `resolving` → `reward` → `finished`)
* ✅ `precision` stat added to `StatBlock` (7th stat) — replaces speed's role in hit accuracy
* ✅ `cover` action — self-targeted 50% damage reduction buff, CT=60, available to all units innately
* ✅ `flee` action — D20 + SPD/10 vs `10 + difficulty*2`, blocked in boss battles
* 📋 `item` action — consume inventory item in combat (requires Phase 6 inventory system)
* ✅ Explicit D20 success tiers: fail (1-5, 0.65x), normal (6-12, 1.0x), strong (13-17, 1.15x), critical (18-20, 1.5x) with tier-specific damage multipliers
* ✅ Damage preview UI — `previewDamageRange()` + long-press tooltip in SkillBar showing min-max range
* ✅ Injectable RNG for deterministic testing — `rollD20(rng?)` threaded through all combat functions

Why this phase matters:

* Completes the combat grammar with defensive/escape options.
* Precision stat separates hit accuracy from queue speed, enabling more build diversity.
* BattlePhase state machine makes the engine self-documenting and easier to debug.
* Success tiers add granularity beyond binary hit/crit.

Acceptance target:
All 15 criteria in §10A.12 are met. A full encounter uses cover, flee (non-boss), and item actions alongside attack/skill. BattlePhase governs all state transitions. Precision stat is reflected in D20 modifiers and class baselines.

Dependencies:

* Phase 6 inventory system (for `item` action)
* Class baseline rebalance to include precision values
* StatAllocationScreen update to show 7th stat

---

## 20) Constraints and non-goals — ✅ Done (Foundational)

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

## 21) Developer priorities — ✅ Done (Foundational)

If a developer starts implementation, the order of importance should be:

1. Ledger correctness ✅
2. Expense splitting and settlement clarity ✅
3. Campaign model 📋 (next major RPG milestone)
4. Account and campaign progression separation ⚠️ (account XP shipped; campaign scoping planned)
5. Class/loadout data model 📋
6. Battle queue logic 📋
7. Boss conversion 📋
8. Town and cosmetic layer ✅ (substantially shipped ahead of schedule)
9. Polishing and expansion ⚠️ (ongoing)

Why:

* If the ledger is wrong, the app fails.
* If the fantasy layer is missing, the app is merely less exciting.
* That asymmetry is critical.

> **Note (Apr 2026):** Priorities 1–2 and 8 were completed ahead of the original sequence. Town and cosmetics (priority 8) were built during Phase 2 as part of the companion system, before the class/combat systems (priorities 3–7). This was a deliberate decision to ship retention-driving features (companion, town, expeditions, gold) while the combat system design matured. The next engineering milestone is priority 3 (Campaign model) which unblocks priorities 4–7.

---

## 22) Final product statement — ✅ Done (Foundational)

This app should feel like a **co-op or solo campaign where expenses become encounters, settlements become progress, and financial discipline becomes visible world-building**.

The important discipline is not to let the RPG layer obscure the finance layer. The user must always understand:

* what was spent,
* who owes what,
* what has been settled,
* what remains open,
* and how their campaign is progressing.

If that remains true, the fantasy layer will amplify the utility instead of competing with it.
