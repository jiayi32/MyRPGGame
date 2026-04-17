# RPG_CODE_FOLDER — Spinoff Staging Area

This folder is a **staging area** for the RPG/campaign/companion/town side of CCPAY Split, which has been approved for breakoff into a standalone game repository. It is **not yet a runnable project** — it's a snapshot of every RPG-relevant file copied out of the live `src/` tree, plus extracted documentation, Firebase rules, and integration notes.

## Why this exists

The gamification system that began as a small XP/streak feature in February 2026 grew across April 2026 into a full turn-based RPG (Campaign system, Combat Engine, classes/skills/gear, boss encounters, quests, expeditions, an isometric Town builder, an Adventure Map, and 24+ companion sprite characters). The expense splitting app no longer feels like an expense splitting app. Management decided to spin the RPG off so each product can keep its own identity.

## Two phase plan

This folder represents **Phase 1 (staging)** only:
- Phase 1 — **Copy** every RPG file into this folder. The expense app keeps working unchanged. ← **you are here**
- Phase 2 — Surgically remove the originals from `src/`, trim mixed files (e.g. `GamificationContext`), unwire the navigation, and physically move assets. Then this folder gets lifted into a fresh repo as the spinoff project.

See [INTEGRATION_NOTES.md](./INTEGRATION_NOTES.md) for the Phase 2 surgery checklist.

## What stays in the expense app (Phase 2)

The "simple gamification" baseline stays:
- **XP / levels / streaks** tied to payment activity
- **Cosmetics** (UserGameProfiles already stores the equipped cosmetic; cosmetic gallery screen retained)

The following are **not** retained — they ship with the spinoff:
- Achievements / `AchievementsScreen` / `AchievementUnlockModal`
- Daily quests / `DailyQuestsCard`
- Companion widget on HomeScreen / companion sprites
- All Campaign / Battle / Town / Expedition / Adventure Map UI and services

## Folder layout

```
RPG_CODE_FOLDER/
├── README.md                         (this file)
├── INTEGRATION_NOTES.md              (Phase 2 surgery checklist)
├── src/
│   ├── screens/
│   │   ├── campaign/                 (11 screens + components subfolder)
│   │   ├── companion/                (5 screens)
│   │   └── settings/
│   │       └── CompanionSelectScreen.tsx
│   ├── components/
│   │   ├── campaign/                 (6 files)
│   │   ├── companion/                (10 files)
│   │   ├── town/                     (6 files)
│   │   ├── GoldToast.tsx
│   │   ├── LootDropToast.tsx
│   │   └── ExpeditionLootModal.tsx
│   ├── services/gamification/        (13 files — full GamificationService.ts copied as-is)
│   ├── contexts/
│   │   ├── CampaignContext.tsx
│   │   └── GamificationContext.tsx   (full copy)
│   └── navigation/
│       └── CompanionTabNavigator.tsx
├── documentation/
│   ├── EXPENSERPG.md
│   ├── COMBATSYSTEM.md
│   ├── COMPANIONS.md
│   ├── GAMIFICATION_IMPLEMENTATION_PLAN.md
│   ├── PARTY_FLOW_ARCHITECTURE.md
│   ├── PARTY_FLOW_PHASE_UPDATES.md
│   ├── PHASE_1.6_PARTY_CONTACTS.md
│   ├── changelog-rpg-extracts.md     (8 RPG sections lifted from CHANGELOG.md)
│   └── architecture-rpg-extracts.md  (gamification sections from FIRESTORE_SCHEMA / SYSTEM_ARCHITECTURE / INPUT_OUTPUTS)
└── firebase/
    ├── firestore.rules.rpg.txt       (extracted rule blocks)
    └── firestore.indexes.rpg.json    (extracted index entries)
```

## What is NOT in this folder (yet)

- **Asset binaries** — `assets/sprites/companions/` (~880 files across 24 characters), `assets/sprites/Backgrounds/`, and `assets/miniatureworld/` (isometric tiles + town buildings) are referenced in [INTEGRATION_NOTES.md](./INTEGRATION_NOTES.md) but were **not duplicated** into this folder to save disk. They will be physically moved during Phase 2.
- **Mixed-file trim** — `GamificationContext.tsx` and `GamificationService.ts` are copied here in **full**. The Phase 2 step splits them into a "trimmed" version that stays in the expense app and a "full" version that ships with the spinoff. INTEGRATION_NOTES.md spells out what to keep vs. drop.

## Spinoff repo bootstrap (future)

When the RPG team is ready to lift this folder into a new repo:

1. `cp -r RPG_CODE_FOLDER/* /path/to/new-rpg-repo/`
2. Add a `package.json` and React Native scaffold (the `package.json` in the parent expense app already lists every needed dep — react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, @react-navigation/*, firebase, etc.)
3. Move the asset directories listed in `INTEGRATION_NOTES.md` over.
4. Create a Firebase project and apply `firebase/firestore.rules.rpg.txt` + `firebase/firestore.indexes.rpg.json`.
5. Wire up `CampaignProvider` + `GamificationProvider` in the new App.js.
6. The 9 routes from `CompanionStackParamList` need to be re-registered against the new app's navigation root.
