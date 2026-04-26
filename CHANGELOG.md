# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed — Beta usability pass: pacing, button visuals, ability descriptions (2026-04-27)

- **Auto-battle pacing**: the auto-play toggle previously called `combatStore.autoPlayToFinish` synchronously, which ran the entire engine to terminal in microseconds with no visible animations. [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx) now extends the existing AI-tick `useEffect` with a "player ready + auto-play on" branch that issues a basic-attack on a 350 ms timer (slightly slower than the 250 ms enemy AI to preserve readability). Auto-play now plays *visibly* through the same animation pipeline as manual combat. Removed the unused `handleAutoPlay` and the unused `autoPlayToFinish` selector.
- **Button visual states**: React Native's stock `<Button>` renders muted on Android Material — making *enabled* buttons look "greyed out". Added [src/components/PrimaryButton.tsx](src/components/PrimaryButton.tsx), a TouchableOpacity-based component with three variants (`primary`/`secondary`/`destructive`), explicit enabled (solid colour) vs disabled (faded) styling, busy-state spinner support. Swapped every `<Button>` in the alpha critical path: [HubScreen](src/screens/HubScreen.tsx) Start/Resume Run, [ClassSelectScreen](src/screens/ClassSelectScreen.tsx) Begin Run, [BattleScreen](src/screens/BattleScreen.tsx) Submit & Continue + Clear Battle (now `__DEV__`-gated), [RewardResolutionScreen](src/screens/RewardResolutionScreen.tsx) Back/End Run/Play Again.
- **Ability descriptions on long-press**: new [src/components/AbilityDetailsModal.tsx](src/components/AbilityDetailsModal.tsx) — semi-transparent scrim Modal showing the skill's name, full description, cost/CT/cooldown/target stats row, tag chips, and a structured per-effect breakdown (kind, magnitude formatted by unit, damage type, duration, stacks, chance, statTag). Resolves both `SKILL_BY_ID` registry skills and the synthetic basic attack. [BattleScreen](src/screens/BattleScreen.tsx) `AbilityButton` accepts a new required `onLongPress` prop with a 350 ms threshold; long-press works even on currently-disabled abilities so the player can read what they don't yet have access to. Tap-outside-to-close.

### Verification

- Client typecheck clean.
- Client tests: 95/95 pass (no engine behavior change).
- Manual on Android emulator: auto-play toggle on now shows each player action with the 350 ms cadence and the existing damage-popup / HP-drain animations. Begin Run / Submit & Continue / End Run buttons are visibly highlighted when enabled. Long-press any ability button to inspect its full effect list.

### Fixed — Begin Run / Resume Run infinite-loop crash (2026-04-26)

**Root cause**: [src/stores/combatStore.ts](src/stores/combatStore.ts) `selectAliveEnemies` selector ran `Object.values(...).filter(...)` and returned a fresh array on every call. Zustand v5's `useSyncExternalStore` integration uses `Object.is` to detect selector-result changes — a fresh array fails that check on every render, so React thinks the snapshot changed → re-render → selector runs again → another fresh array → React aborts the render with `Maximum update depth exceeded` and the canonical `The result of getSnapshot should be cached to avoid an infinite loop` warning.

The bug fired only after `startRun` succeeded and `navigation.replace('Battle')` mounted the BattleScreen, which is the first consumer of `selectAliveEnemies`. The "Resume Run greyed out" report on app reopen was a symptom of the same crash — tapping Resume mounts BattleScreen, which loops, blocking the React render commit so the Button looks non-interactive (the TouchableOpacity Forfeit link in the run card stayed responsive because tapping it doesn't mount BattleScreen).

- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): wrap `selectAliveEnemies` with `useShallow` from `zustand/react/shallow`. The selector still computes a fresh array each call, but `useShallow` does an element-wise identity compare so React only re-renders when an enemy unit reference actually changes (i.e., when the engine produces a new BattleState). `selectPlayerUnit` (returns a stable Unit ref) and `selectReadyUnitId` (returns a string id) are already reference-stable and don't need wrapping.
- [src/screens/DevToolsScreen.tsx](src/screens/DevToolsScreen.tsx): replaced the bare `usePlayerStore()` and `useRunStore()` whole-store subscribes with `useShallow`-wrapped object projections (only the fields the JSON dump renders). Whole-store identity changes on every `set()`, so without shallow-equality DevToolsScreen would have triggered the same loop the moment any store updated while it was mounted.

### Verification

- Client typecheck: clean.
- Client tests: 95/95 pass (no behavior change in engine).
- Manual on Android emulator (production target): sign in → Start New Run → pick Ember Initiate → Begin Run navigates cleanly to BattleScreen with no `Maximum update depth` error in logcat. Force-quit mid-stage and reopen → Resume Run renders and is interactive. Profile → Dev Tools → JSON dump renders without looping; dev callables fire normally.

### Fixed — Sign-in not-found error / first production deploy of new callables (2026-04-26)

- **Root cause**: app's `playerStore.bootstrap` calls `getOrCreatePlayer` immediately after Firebase Auth succeeds, but the callable had never been deployed to production (only the original `helloWorld` from P0 was live). The error surfaced as `not-found: NOT_FOUND` on sign-in.
- **Diagnostics**: [src/services/firebase.ts](src/services/firebase.ts) startup log now prints `projectId=...` alongside `target=...`, plus a hint when targeting production explaining `firebase deploy --only functions` is required. [src/services/runApi.ts](src/services/runApi.ts) `formatCallableError` now appends a contextual hint for `functions/not-found` / `not-found` codes — emulator path suggests restart, production path suggests deploy.
- **Deploy**: ran `npx firebase deploy --only functions --project myrpggame-c6f35`. Created (first time live in production): `getOrCreatePlayer`, `devSkipStage`, `devGrantAllClasses`, `devResetPlayer`, `devSetCurrencies`. Updated: `helloWorld`, `startRun`, `submitStageOutcome`, `bankCheckpoint`, `endRun`. **Caveat**: `auditRunCompletion` (Firestore trigger) failed first time with Eventarc Service Agent propagation delay — Firebase's known first-2nd-gen-deploy timing issue. Retry deploy succeeded after ~3 min wait. The audit trigger is non-critical (background invariant check on terminal run transition); sign-in and the run loop work without it.
- [.env.example](.env.example): added quick-reference comment block listing the four valid `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` values (empty / `10.0.2.2` / `localhost` / `<LAN IP>`) with their device targets.
- [documentation/OPERATIONS.md](documentation/OPERATIONS.md): rewrote the "Deploying functions" section with the production-deploy command + listing of every export. Added a new "Switching between production and emulator (alpha workflow)" section walking through both directions, including the emulator hot-reload trap (functions emulator caches exports at startup; new exports may need an emulator restart).

### Added — Stage 4.5 Alpha Pass (2026-04-26)

Three items closed to make Stages 1–4 a self-testable alpha for solo dogfooding.

#### Item C — Email+password auth migration

- [src/stores/playerStore.ts](src/stores/playerStore.ts): rewrote bootstrap. New status enum adds `'awaiting_sign_in'` and `'signing_in'`. Bootstrap now checks `currentUser()` (Firebase persists session across launches): if signed in, refresh token + load profile; if not, transitions to `awaiting_sign_in` for SignInScreen to drive. New actions: `signIn(email, password)`, `register(email, password)`, `signOutAndReset()`. Removed `signInAnonymously` from app code.
- [src/stores/runStore.ts](src/stores/runStore.ts): bootstrap returns to `idle` when player is `null` (awaiting sign-in) instead of crashing on `player.currentRunId`.
- [src/screens/SignInScreen.tsx](src/screens/SignInScreen.tsx): new screen with email + password inputs, Sign In / Register tabs, `KeyboardAvoidingView`, `ActivityIndicator` while signing in, error surfacing from `playerStore.error`. In `__DEV__` mode pre-fills `testuser@test.com` / `1234567890` so launch → tap Sign In is one tap.
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx): top-level navigator now gates on `playerStore.status`. Renders `BootstrapGate` (loader) during init, `SignInScreen` while awaiting/signing/error, `MainStack` once `ready`. Auto-runs `playerStore.bootstrap()` on mount.
- [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx): added Sign Out button with confirmation `Alert`. Calls `clearCombat`, `resetRun`, then `signOutAndReset` so post-sign-out state is fully clean.

#### Item A — Dev iteration tooling

- [firebase/functions/src/getOrCreatePlayer.ts](firebase/functions/src/getOrCreatePlayer.ts): starter pack now includes all 5 Drakehorn classes (T1 ember_initiate → T5 apocalypse_bringer) instead of just T1. Lets the solo dev test any build path on day-1 without grinding the unlock chain.
- [firebase/functions/src/shared/guards.ts](firebase/functions/src/shared/guards.ts): added `requireDevTools()` gate — passes when `process.env.ALLOW_DEV_TOOLS === 'true'` OR running under the Firebase emulator (`FUNCTIONS_EMULATOR === 'true'`). Production calls without the env flag fail with `permission-denied`.
- [firebase/functions/src/dev.ts](firebase/functions/src/dev.ts): new file exporting four dev callables, each composed of `requireDevTools` + `requireAuth` + `requirePayloadSize` + `requireRateLimit`:
  - `devSkipStage(runId, targetStage)` — write `runs/{runId}.stage = targetStage` (1..30) on the caller's active run.
  - `devGrantAllClasses()` — append all 5 Drakehorn class IDs to the caller's `ownedClassIds`, deduplicated.
  - `devResetPlayer()` — wipe player profile, all gear sub-collection docs, and all runs (with checkpoint sub-collections) for the caller. Idempotent.
  - `devSetCurrencies({goldBank?, ascensionCells?, xpScrollMinor?, ...})` — bulk absolute-set; missing fields preserved.
- [firebase/functions/src/index.ts](firebase/functions/src/index.ts): exported the four dev callables.
- [firebase/functions/src/shared/types.ts](firebase/functions/src/shared/types.ts): added payload + response types for all four dev callables.
- [src/services/runApi.ts](src/services/runApi.ts): added `devSkipStage` / `devGrantAllClasses` / `devResetPlayer` / `devSetCurrencies` client wrappers.
- [src/screens/DevToolsScreen.tsx](src/screens/DevToolsScreen.tsx): new screen — dark theme dev panel with: skip-stage input + button (refreshes run snapshot), grant-all-classes button, currency setters (gold + cells, blank fields preserve), reset-save destructive button with confirm Alert, plus live JSON dump of `playerStore` and `runStore` state for inspection. Shows last action result inline.
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx): added `DevTools` route to the root stack, gated by `__DEV__` so release builds don't ship it.
- [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx): added "🛠 Dev Tools" link visible only in `__DEV__`.
- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): added **Forfeit Run** button (visible while a run is active and not ending) that calls `runStore.endRun('fled')` after confirm Alert, then clears combat + navigates back to MainTabs.
- [src/screens/HubScreen.tsx](src/screens/HubScreen.tsx): added "Forfeit Run" link inside the active-run card for the off-battle case.

#### Item B — Visual juice

- [src/hooks/useCombatEventStream.ts](src/hooks/useCombatEventStream.ts): new hook that subscribes to Zustand `combatStore` log changes via `useCombatStore.subscribe`. Tracks last-seen log index in a ref and invokes a handler with each newly-appended `BattleEvent`. Resets cursor when the engine instance changes (battle restart).
- [src/components/AnimatedHpBar.tsx](src/components/AnimatedHpBar.tsx): drop-in HP bar using Reanimated `useSharedValue` + `withTiming` (280ms, ease-out cubic) for smooth width transitions. Replaces the inline static bar in BattleScreen.
- [src/components/DamagePopup.tsx](src/components/DamagePopup.tsx): `DamagePopupOverlay({ unitId })` listens on the event stream and spawns float-and-fade text ("−42", "+8", "miss", crit "−92!"). Uses `useSharedValue` + `withTiming` for translateY rise (-36px over 700ms) + opacity fade. Self-removes via `runOnJS(onComplete)` callback. Color-coded: damage red, crit orange-red and larger font, heal green, dot purple, hot light green, miss grey.
- [src/components/CastPulse.tsx](src/components/CastPulse.tsx): wraps a unit card with a brief scale pulse (1.0 → 1.04 → 1.0 over 330ms) + glow border on `skill_cast` events for the matching unit. Uses `withSequence`.
- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): wired the new components — player card now uses `<CastPulse>` wrapper with `<DamagePopupOverlay>` overlay; each enemy row also gets its own `<DamagePopupOverlay>`. Static `HpBar` internals replaced by `<AnimatedHpBar>`.

### Verification

- Client typecheck clean.
- Client tests: **95/95 pass** (17 suites).
- Functions build clean; functions tests: **41/41 pass**.
- Reanimated previously unused; now drives 4 distinct combat animations.

---

### Added — Stage 4: boss combat unblocked + 3 real bosses authored (2026-04-25)

- **Critical bugfix**: boss stages (5/10/30) previously threw `MVP stage simulation currently supports procedural stages only` from [src/features/run/orchestrator.ts](src/features/run/orchestrator.ts) — runs could not progress past stage 4. Stage 4's first deliverable is unblocking the loop end-to-end.
- [src/content/skills/bosses.ts](src/content/skills/bosses.ts): new file — 10 boss skills authored as `BOSS_SKILLS`. Three thematic ability sets:
  - **Pyre Warden** (stage 5): `boss.pyre.scorch` (basic fire), `boss.pyre.heat_surge` (fire + DoT), `boss.pyre.ignite_aura` (self-buff +25% damage).
  - **Vortex Colossus** (stage 10): `boss.vortex.crush` (basic physical), `boss.vortex.ct_rewind` (CT shift +30 + glance damage), `boss.vortex.gravity_well` (area arcane + defense −15% debuff).
  - **Rimefang Hydra** (stage 30): `boss.rimefang.ice_bite` (basic ice), `boss.rimefang.frostbite_aegis` (shield + defense buff), `boss.rimefang.regrow_head` (15% max HP heal), `boss.rimefang.tail_whip` (cone ice + speed −20% debuff).
  - All magnitudes are playable placeholders, flagged as P6 retune candidates.
- [src/content/skills.ts](src/content/skills.ts): registered `BOSS_SKILLS` in `SKILLS` and `SKILL_BY_ID`.
- [src/content/types/boss.ts](src/content/types/boss.ts): extended `BossDef` with optional `skillIds: SkillId[]`, `basicAttackSkillId: UnspecifiedOr<SkillId>`, and `speed: number`.
- [src/content/bosses.ts](src/content/bosses.ts): 3 real bosses now have wired skill sets, basic attacks, and speed; HP/atk/def magnitudes scaled up (Pyre 320/18/8, Vortex 720/26/14, Rimefang 1600/38/22) so each boss feels meaningfully harder than a tier-equivalent procedural enemy.
- [src/domain/combat/factory.ts](src/domain/combat/factory.ts): added `buildBossUnit(boss, opts)` factory — converts `BossDef` to `Unit`, defaults speed to 80 and crit to 8% / 1.6×, falls back to synthetic basic attack when boss has no `basicAttackSkillId`.
- [src/features/run/orchestrator.ts](src/features/run/orchestrator.ts): `prepareStage` now branches on `selection.kind`. Boss stages build a single boss unit via `buildBossUnit`, encounter is labeled `boss.<bossId>`, and rewards come from a new `resolveBossRewards(stage, bossName)` helper (stage 5: 250g/2 cells/3 scrolls; stage 10: 600g/5 cells/3 scrolls; stage 30: 1500g/12 cells/3 scrolls + 2 grand). Procedural path unchanged.
- [src/features/run/__tests__/orchestratorBoss.test.ts](src/features/run/__tests__/orchestratorBoss.test.ts): 4 new tests covering stage-5/10/30 boss prep, terminal-state auto-play, reward magnitudes on win, and a regression check that procedural stages still work. All green; full client suite now 95 tests across 17 suites.

### Notes — Stage 4 scope

- **Phase mechanics deferred**: BossDef.phases description text remains flavor-only. The combat engine has no on-HP-threshold hook; mechanically, bosses are tougher enemies with a unique skill set. User chose "Simple stat-block" scope; multi-phase ability swaps + on-trigger mechanics are a follow-up.
- **Bull Cathedral / Tide Shell / Thorn Ledger / gear T1–T4** — out of scope for this session; tracked for a future Stage 4 sub-iteration. Sentinel audit unchanged for those areas.

### Added — Stage 3 follow-up: gear inventory + interactive battle (2026-04-25)

- [src/content/gear.ts](src/content/gear.ts): added `lookupGearTemplate(templateId)` helper that resolves either a unique T5 `GearItem` (via `GEAR_BY_ID`) or a procedural T1–T4 `GearTemplate` (via new `GEAR_TEMPLATES_BY_ID`); returns a unified `GearLookupResult` shape (name, slot, tier, rarity, source). Re-exported `GearRarity`/`GearSlot`/`GearTier`/`GearRole`/`GearItem`/`GearTemplate` types from the module barrel so screens/hooks can import without dipping into `./types`.
- [src/hooks/useGearInventory.ts](src/hooks/useGearInventory.ts): new hook that subscribes to `players/{uid}/gear` via `onSnapshot`, resolves each instance's template metadata, exposes `bySlot`/`equippedBySlot` views, and provides `equip(instanceId)` (atomic batch — flips equipped flags so only one item per slot is equipped) / `unequip(instanceId)` helpers. Empty until playerStore has bootstrapped.
- [src/screens/EquipmentScreen.tsx](src/screens/EquipmentScreen.tsx): replaced the stub with a full inventory view — three slot sections (Weapon/Armor/Accessory) with rarity-coloured tier badges, currently-equipped indicator, equip/unequip buttons with busy state, empty-state hints, error surfacing, and unknown-template fallback.
- [src/features/run/orchestrator.ts](src/features/run/orchestrator.ts): refactored to expose `prepareStage(input)` (engine + encounter metadata), `autoPlayStage(prepared)` (basic-attack loop to terminal), `buildStageReport(prepared, engine)` (terminal-state report builder). `simulateProceduralStage` now composes these three. Lets interactive and auto-play modes share setup.
- [src/stores/combatStore.ts](src/stores/combatStore.ts): added interactive mode — store now holds the live `engine` + `prepared` stage. New actions: `beginInteractive` (setup without auto-play), `tickAdvance` (engine.advance when no unit ready), `step` (single action; returns StepError reason on rejection without throwing), `autoPlayToFinish` (run to terminal from current state). Status enum extended with `preparing`/`in_progress`. Selectors `selectPlayerUnit`/`selectAliveEnemies`/`selectReadyUnitId` for component subscriptions.
- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): rewritten for interactive combat. Player card with HP bar (green), MP bar (blue), CT chip ("READY" when actionable), status chips. Enemy rows with HP bars, CT chips, status chips, tap-to-target highlighting. Ability button grid (basic attack + each owned skill); each button shows MP/HP cost, cooldown, and a `canCast`-derived disabled reason. Auto-play toggle in stage banner runs `autoPlayToFinish` when flipped on. Enemy AI auto-acts via `setTimeout` when a non-player unit is ready (250ms delay). Time auto-advances via `tickAdvance` (50ms tick) when no unit is ready. Event log of last 8 events at bottom. Result card with submit-and-continue button when battle ends. Auto-prepares on stage advance (clears stale `combatStatus === 'finished'` from previous stage).

### Added — Stage 3 UI screens & tab navigator (2026-04-25)

- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx): replaced the flat stack navigator with a root stack + bottom tab navigator. Tab navigator (`@react-navigation/bottom-tabs`) wraps the three always-accessible screens (Hub, Equipment, Profile). In-run screens (ClassSelect, Battle, RunMap, RewardResolution) are pushed as full-screen root stack screens over the tab bar. Placeholder/diagnostics retained as a root stack screen accessible from Profile.
- [src/screens/ClassSelectScreen.tsx](src/screens/ClassSelectScreen.tsx): new pre-run class selection screen. Shows owned classes as selectable cards (name, tier badge, role badge, description). Shows reachable-but-locked evolution targets dimmed with a lock indicator. Calls `runStore.startRun(classId)` on "Begin Run" and replaces itself with BattleScreen.
- [src/screens/RunMapScreen.tsx](src/screens/RunMapScreen.tsx): new 30-stage visual run map. Renders stage nodes in a `ScrollView` with type markers (Mini-Boss at 5, Checkpoint Gate at 10/20, Counter Boss at 30). Completed stages, current stage, and future stages are visually distinct. Accessible via "View Map" links in BattleScreen and RewardResolutionScreen.
- [src/screens/EquipmentScreen.tsx](src/screens/EquipmentScreen.tsx): new Equipment tab screen. Currently a stub showing "no gear yet" with owned-class count; gear instance rendering will be added once the Firestore gear sub-collection fetch is wired in Stage 4+.
- [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx): new Profile tab screen. Shows UID, gold bank, ascension cells, per-lineage ranks (filtered to non-zero), owned classes with tier badges, and a link to the Diagnostics screen.
- [src/screens/HubScreen.tsx](src/screens/HubScreen.tsx): rewritten to be a tab-nested screen. Uses `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` to navigate to ClassSelect (root stack). Shows active-run resume card if `runStore.status === 'run_active'`. No longer calls `startRun` directly.
- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): replaced diagnostic text cards with a stage-type banner (coloured by stage type, with "View Map →" link), active class card (name, tier, role, description), and simulation result card (WIN/LOSS badge, enemy/tick/time summary, reward row with emoji labels). Navigation fallback changed from `'Hub'` to `'MainTabs'`.
- [src/screens/RewardResolutionScreen.tsx](src/screens/RewardResolutionScreen.tsx): replaced flat text list with typed reward blocks (banked/vaulted, left-colour-coded), run result badge, and a progression delta card that appears after `endRun` settles (ascension cells earned, lineage rank delta, newly unlocked classes). Stores `ProgressionDelta` from the `endRun` response in component state. "Play Again" now navigates to `'MainTabs'`.

### Added — Stage 2 meta-progression & player profile (2026-04-25)

- [firebase/functions/src/shared/types.ts](firebase/functions/src/shared/types.ts): extended `PlayerDoc` with `goldBank`, `xpScrolls`, `currentRunId`, `createdAt`/`updatedAt`; extended `RunDoc` with `activeLineageId` and `evolutionTargetClassId`; added `XpScrollPouch`, `GearInstanceDoc`, `ProgressionDelta`, `GetOrCreatePlayerResponse` types.
- [firebase/functions/src/shared/progression.ts](firebase/functions/src/shared/progression.ts): new pure-arithmetic server-side module mirroring client formulas — `rankDeltaForOutcome`, `ascensionCellsForOutcome`, `clampLineageRank`, `computeProgression`. No content registry lookup; `evolutionTargetClassId` is stamped onto the run doc at `startRun` time by the client.
- [firebase/functions/src/getOrCreatePlayer.ts](firebase/functions/src/getOrCreatePlayer.ts): new idempotent `getOrCreatePlayer` callable. Creates starter profile (`ownedClassIds: ['drakehorn_forge.ember_initiate']`, all counters zeroed, `currentRunId: null`) in a Firestore transaction on first call; returns existing profile on subsequent calls.
- [firebase/functions/src/startRun.ts](firebase/functions/src/startRun.ts): extended to accept `activeLineageId` + `evolutionTargetClassId` in the payload; validates class ownership; auto-creates player profile if missing; rejects start if `player.currentRunId` already set; stamps `currentRunId = runRef.id` on the player doc atomically with run creation.
- [firebase/functions/src/endRun.ts](firebase/functions/src/endRun.ts): extended to perform full meta-progression settle — reads player doc in the same transaction as run settlement; calls `computeProgression`; updates `goldBank`, `xpScrolls`, `ascensionCells`, `lineageRanks`, `ownedClassIds`, and clears `currentRunId` on the player doc; creates gear instance docs in `players/{uid}/gear/` sub-collection; returns `ProgressionDelta` with `playerTotals` snapshot.
- [firebase/functions/src/index.ts](firebase/functions/src/index.ts): exported new `getOrCreatePlayer` callable.
- [firebase/functions/src/__tests__/progression.test.ts](firebase/functions/src/__tests__/progression.test.ts): 14 new `node:test` cases covering `isCompletedRun`, `rankDeltaForOutcome`, `ascensionCellsForOutcome`, `clampLineageRank`, and `computeProgression` (unlock logic, rank capping, fled/zero-stage edge cases).
- [firebase/functions/src/scripts/smokeRun.ts](firebase/functions/src/scripts/smokeRun.ts): extended smoke test to call `getOrCreatePlayer` (idempotence check), pass `activeLineageId`/`evolutionTargetClassId` in `startRun`, verify `player.currentRunId` is set mid-run, and after `endRun` verify `player.goldBank`, `ascensionCells`, `lineageRanks`, and `currentRunId = null` from the Firestore doc.
- [src/features/run/types.ts](src/features/run/types.ts): added `XpScrollPouch`/`EMPTY_XP_SCROLLS`; updated `StartRunPayload` with `activeLineageId` + `evolutionTargetClassId`; updated `EndRunResponse` with `progression: ProgressionDelta`; added `PlayerSnapshot`, `GetOrCreatePlayerResponse`, `ProgressionDelta`; added `activeLineageId`/`evolutionTargetClassId` to `RunSnapshot`.
- [src/services/runApi.ts](src/services/runApi.ts): added normalizer helpers (`asNullableString`, `asStringArray`, `asIntRecord`, `normalizeXpScrolls`, `normalizeProgressionDelta`, `normalizePlayerSnapshot`); new exports `getOrCreatePlayer()` and `getPlayerSnapshot(uid)` (Firestore read); updated `startRun` to send new payload fields; updated `endRun` to decode `progression`; updated `getRunSnapshot` to decode new run fields.
- [src/domain/run/progression.ts](src/domain/run/progression.ts): exported `findSameLineageEvolutionTarget` (was private `nextSameLineageTierTarget`) so `runStore.startRun` can compute the evolution target from content without duplicating the lookup.
- [src/stores/playerStore.ts](src/stores/playerStore.ts): new Zustand player store — `bootstrap` (Firebase init → anonymous auth → `getOrCreatePlayer`), `refresh` (Firestore `getPlayerSnapshot`), `applyEndRunDelta` (applies `ProgressionDelta` locally post-settle without a round-trip), `reset`. Mirrors `runStore` status machine (`idle → initializing → ready → error`).
- [src/stores/runStore.ts](src/stores/runStore.ts): `bootstrap` now delegates to `playerStore.bootstrap` for auth and player init; on bootstrap, if `player.currentRunId !== null`, fetches the run snapshot and hydrates the store (`run_active` status for ongoing runs); `startRun` uses `CLASS_BY_ID` + `findSameLineageEvolutionTarget` to compute `activeLineageId`/`evolutionTargetClassId` before calling the server; `endRun` calls `playerStore.applyEndRunDelta` after settlement; removed `userId` field (now sourced from `playerStore.uid`); `resetRun` defers to `playerStore.status` for the post-reset status.
- [src/stores/index.ts](src/stores/index.ts): exported `playerStore` from the barrel.
- [src/screens/HubScreen.tsx](src/screens/HubScreen.tsx): updated Auth UID display to source `uid` from `playerStore` instead of the removed `runStore.userId`.

### Added — Stage 1 backend hardening (2026-04-25)


- [firebase/functions/src/shared/guards.ts](firebase/functions/src/shared/guards.ts): added `requirePayloadSize` (16 KiB default cap, exact UTF-8 byte counting via `Buffer.byteLength`) and `requireRateLimit` (per-uid sliding-window throttle, in-memory per warm instance, bounded to 5000 keys). Plus `__resetRateLimitsForTest` helper for unit tests.
- [firebase/functions/src/startRun.ts](firebase/functions/src/startRun.ts), [submitStageOutcome.ts](firebase/functions/src/submitStageOutcome.ts), [bankCheckpoint.ts](firebase/functions/src/bankCheckpoint.ts), [endRun.ts](firebase/functions/src/endRun.ts): wired payload size + rate-limit guards (per-callable budgets: 6/min start, 60/min submit, 12/min bank/end). Added `maxInstances`, `timeoutSeconds`, `memory` runtime options to bound cost and catch runaways.
- [firebase/functions/src/auditReplay.ts](firebase/functions/src/auditReplay.ts): new `auditRunCompletion` Firestore trigger on `runs/{runId}` that fires on transition into terminal state. Recomputes expected aggregates from the stage outcome ledger (using shared `splitRewards`/`addRewards`) and writes an `audit: { ok, discrepancies, checkpointCount, auditedAt }` field back onto the run doc. Catches reward inflation, gear fabrication, and won-run vault/banked invariant violations. Engine-level replay deferred until shared module structure is set up in Stage 2.
- [firebase/functions/src/index.ts](firebase/functions/src/index.ts): exported the new `auditRunCompletion` trigger.
- [firebase/functions/src/scripts/smokeRun.ts](firebase/functions/src/scripts/smokeRun.ts): new end-to-end emulator smoke driving the full lifecycle (`startRun → submitStageOutcome ×9 → bankCheckpoint @ stage 10 → endRun(won)`). Verifies callable responses, Firestore doc state, and the audit trigger writes `audit.ok=true`. Uses raw `fetch` against auth/functions/firestore emulators with anonymous sign-in for Bearer token.
- [firebase/functions/package.json](firebase/functions/package.json): added `smoke` script; switched `test` script to directory-mode `node --test lib/__tests__/` (Windows shell glob expansion was unreliable).
- [package.json](package.json): added top-level `fn:test` and `fn:smoke` shortcuts mirroring the existing `fn:build` / `fn:lint` pattern.
- [firebase/functions/src/__tests__/guards.test.ts](firebase/functions/src/__tests__/guards.test.ts): added 9 new test cases covering `requirePayloadSize` (cap, null/undefined, circular refs, multi-byte UTF-8) and `requireRateLimit` (under-cap, cap-cross, key isolation, window rollover). 19 tests, all green.

### Notes — App Check deferred (2026-04-25)

- App Check re-enable was originally scoped to Stage 1 but deferred to Stage 7 (launch-prep) per developer direction. Debug-token registration friction is not worth it during pre-launch iteration. [src/services/firebase.ts](src/services/firebase.ts) keeps the no-op init with a top-of-file comment block listing the re-enable steps.

### Fixed — Firebase Auth bootstrap and callable connectivity (2026-04-25)

- [.env](.env): cleared `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (was `10.0.2.2`, routing all traffic to a non-running emulator and causing `auth/network-request-failed` on every launch).
- [src/env.d.ts](src/env.d.ts): new file — `process.env` TypeScript declarations for `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` and `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN`; module augmentation stub for `ReactNativeFirebaseAppCheckProvider` constructor signature.
- [src/services/firebase.ts](src/services/firebase.ts): removed App Check initialization entirely (TODO P3 — re-enable after registering a valid debug token); added startup `console.log` showing active backend target and emulator host.
- [src/services/auth.ts](src/services/auth.ts): made `signInAnonymously` idempotent (returns existing user when already signed in); added `ensureUsableToken` that detects unsigned/emulator-leaked JWTs and forces token refresh; added `waitForIdTokenPropagation` helper that gates on `onIdTokenChanged` (up to 1 200 ms) so the Bearer token is valid before any callable is dispatched.
- [src/services/runApi.ts](src/services/runApi.ts): introduced `callCallable` wrapper — attempts the `@react-native-firebase/functions` SDK callable first, then falls back to an explicit `fetch` with `Authorization: Bearer <token>` on `UNAUTHENTICATED` errors; added `callableEndpoint` that resolves the correct URL for both emulator and production; updated `startRun`, `submitStageOutcome`, and `endRun` to use the new wrapper.
- [src/screens/PlaceholderScreen.tsx](src/screens/PlaceholderScreen.tsx): diagnostics flow now labels errors by phase (`[init]` / `[auth]` / `[helloWorld]`); added `callHelloWorldViaFetch` explicit-Bearer fetch path used in the unauthenticated retry branch (sign-out → re-sign-in → fetch fallback).
- [src/stores/runStore.ts](src/stores/runStore.ts): `bootstrap` now always calls `await signInAnonymously()` directly instead of the `currentUser() ??` shortcut that previously bypassed token validation.
- [firebase.json](firebase.json): added `predeploy: ["npm run fn:build"]` hook to the functions config so a stale build can no longer be deployed accidentally.

### Changed — Documentation (2026-04-25)

- [documentation/OPERATIONS.md](documentation/OPERATIONS.md): added backend mode quick-reference table (real Firebase vs. emulator env-var matrix) and a troubleshooting section for `auth/network-request-failed` / emulator-not-running scenarios.
- [.env.example](.env.example): rewrote inline comments with explicit "real Firebase (leave blank)" vs. "Android emulator" mode labels for each `EXPO_PUBLIC_*` variable.

### Added — P3 MVP backend run lifecycle (Firebase Functions)

- [firebase/functions/src/shared/types.ts](firebase/functions/src/shared/types.ts): introduced standalone backend contracts for `RewardBundle`, `RunDoc`, `StageOutcomeDoc`, and callable payload/response types.
- [firebase/functions/src/shared/guards.ts](firebase/functions/src/shared/guards.ts): added reusable callable guards for auth, run ownership/state checks, stage validation, and reward bundle/plausibility validation.
- [firebase/functions/src/shared/rewards.ts](firebase/functions/src/shared/rewards.ts): added deterministic reward helpers (`addRewards`, `splitRewards`, `mergeVaultIntoBank`, `forfeitVault`, `emptyReward`).
- [firebase/functions/src/startRun.ts](firebase/functions/src/startRun.ts): implemented `startRun` callable (auth-gated run creation with server seed and initial run doc state).
- [firebase/functions/src/submitStageOutcome.ts](firebase/functions/src/submitStageOutcome.ts): implemented `submitStageOutcome` callable with transactional checkpoint commit + run stage/reward ledger updates.
- [firebase/functions/src/bankCheckpoint.ts](firebase/functions/src/bankCheckpoint.ts): implemented checkpoint banking callable (10/20/30 gate + vault merge in transaction).
- [firebase/functions/src/endRun.ts](firebase/functions/src/endRun.ts): implemented run settlement callable (win merges vault, loss/flee forfeits vault).
- [firebase/functions/src/index.ts](firebase/functions/src/index.ts): exported the new MVP callables from the functions entrypoint.
- [firebase/functions/src/__tests__/guards.test.ts](firebase/functions/src/__tests__/guards.test.ts) and [firebase/functions/src/__tests__/rewards.test.ts](firebase/functions/src/__tests__/rewards.test.ts): added `node:test` coverage for backend shared validation/reward logic.
- [firebase/functions/package.json](firebase/functions/package.json): added `test` script (`npm run build && node --test lib/__tests__/*.test.js`).
- [firebase/firestore.rules](firebase/firestore.rules): replaced P0 deny-all placeholder with Phase 3 rules for `players/*`, `runs/*`, `runs/*/checkpoints/*`, static content collections, and telemetry create-only.

### Added — Emulator MVP vertical slice (P4/P5 foundation)

- [src/features/run/types.ts](src/features/run/types.ts): added client-side run/callable contracts aligned to backend payload shapes.
- [src/services/runApi.ts](src/services/runApi.ts): added callable wrappers (`startRun`, `submitStageOutcome`, `endRun`) plus run snapshot fetch and error normalization.
- [src/features/run/orchestrator.ts](src/features/run/orchestrator.ts): added deterministic stage simulation orchestrator (seeded stage selection + local combat replay + outcome payload build).
- [src/stores/runStore.ts](src/stores/runStore.ts): added Zustand run lifecycle store (bootstrap/auth, start run, submit outcome, end run, snapshot refresh, reset).
- [src/stores/combatStore.ts](src/stores/combatStore.ts): added Zustand combat simulation store for stage execution/reporting.
- [src/stores/index.ts](src/stores/index.ts): exported run/combat stores from barrel.
- [src/screens/HubScreen.tsx](src/screens/HubScreen.tsx): added MVP hub/start-run UI.
- [src/screens/BattleScreen.tsx](src/screens/BattleScreen.tsx): added stage simulation + submit outcome UI.
- [src/screens/RewardResolutionScreen.tsx](src/screens/RewardResolutionScreen.tsx): added server-ledger reward view + end-run closure UI.
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx): replaced placeholder-only startup flow with `Hub → Battle → RewardResolution`, retaining Placeholder as diagnostics route.

### Fixed

- [src/domain/combat/queue.ts](src/domain/combat/queue.ts): resolved stun-related CT deadlock by making `nextReadyDelta` advance toward the earliest actionable event (ready non-stunned unit or stun expiry), including fallback handling when all alive units are stunned.
- [src/domain/combat/__tests__/queue.test.ts](src/domain/combat/__tests__/queue.test.ts): added regression tests for stalled-ready-unit stun scenarios and time advancement correctness.
- [src/domain/combat/stateUtils.ts](src/domain/combat/stateUtils.ts): introduced shared `clamp`/`patchUnit`/`appendLog` helpers and removed duplicate local implementations from [src/domain/combat/effects.ts](src/domain/combat/effects.ts), [src/domain/combat/step.ts](src/domain/combat/step.ts), and [src/domain/combat/queue.ts](src/domain/combat/queue.ts).
- [src/content/__tests__/integrity.test.ts](src/content/__tests__/integrity.test.ts): added hard canonical lineage registry assertion (exactly 12 expected IDs) and corrected Drakehorn chain test label to `T1→T5`.

### Changed — Documentation

- [documentation/New/LineageSystem.md](documentation/New/LineageSystem.md): replaced inconsistent 11-node adjacency example with canonical 12-node archetype structure (including Tempest).
- [documentation/INTEGRATION_REPORT.md](documentation/INTEGRATION_REPORT.md): clarified lineage progress wording to avoid misreading seeded-authoring count as total canonical lineage count.
- [documentation/INTEGRATION_REPORT.md](documentation/INTEGRATION_REPORT.md): fixed minor wording/spacing drift in legacy quarantine section text.

### Notes

- Backend unit tests currently validate shared callable logic (`guards`/`rewards`) via `node:test`; end-to-end callable emulator smoke remains the next validation gate for the new UI flow.

### Added — Placeholder icon pack registry

- [src/assets/icons/types.ts](src/assets/icons/types.ts): introduced `IconStyle`, `IconTheme`, `IconSize`, plus literal slug unions for the imported PNG placeholder pack.
- [src/assets/icons/registry.ts](src/assets/icons/registry.ts): added Metro-safe literal `require()` registries for 190 solid icons and 45 brand icons from `assets/icons/PNG/for-light-mode/48px/`.
- [src/assets/icons/index.ts](src/assets/icons/index.ts): exported the icon types and registry helpers from a single barrel.
- [src/assets/icons/__tests__/registry.test.ts](src/assets/icons/__tests__/registry.test.ts): added coverage checks for registry counts, asset resolution, lookup helpers, and namespace collisions.

### Documentation

- [documentation/New/IconPack.md](documentation/New/IconPack.md): documented the raw asset pack layout, current runtime scope, slug normalization rules, Metro literal-`require()` constraint, and suggested placeholder mappings for future sprite replacement work.

### Added — Class framework (lineage × combat archetype)

- Schema additions to extract the structural insight from [documentation/New/ClassDesignBrainstorm.md](documentation/New/ClassDesignBrainstorm.md) without adopting its specific skill names, reversed tier direction, or new primary resources.
- [src/content/types/class.ts](src/content/types/class.ts): new `CombatArchetype` type (`'burst_dps' | 'sustain_dps' | 'tank' | 'support' | 'trickster'`); required `combatArchetype` field on `ClassData`; optional `coreLoop`, `damageIdentity`, `survivalIdentity` identity one-liners.
- [src/content/types/lineage.ts](src/content/types/lineage.ts): new `LineageUniqueMechanic` interface (`{ id, name, shortDescription, evolutionByTier: Record<ClassTier, string> }`) and required `uniqueMechanic: UnspecifiedOr<...>` field on `Lineage`.
- [src/content/classes/drakehornForge.ts](src/content/classes/drakehornForge.ts): retrofitted all 5 Drakehorn classes with `combatArchetype` + identity one-liners (T5 burst_dps, T4 sustain_dps, T3 support, T2 burst_dps, T1 trickster). No passive/skill behavior changed.
- [src/content/lineages.ts](src/content/lineages.ts): Drakehorn Forge `uniqueMechanic` filled with Heat spec + T5 → T1 evolution; other 11 lineages `uniqueMechanic: UNSPECIFIED`.
- [src/content/classes/stubs.ts](src/content/classes/stubs.ts): stub factory defaults `combatArchetype: 'burst_dps'` (to be re-evaluated when each lineage is authored in P1.5).

### Documentation

- [documentation/New/LineageMechanicCatalog.md](documentation/New/LineageMechanicCatalog.md): new authoritative per-lineage spec (12 entries). Each lineage lists its unique mechanic, encoding (stack-based via `StatusInstance.stacks`, not a new `primaryResource`), archetype-per-tier assignments, and T5 → T1 mechanic evolution. 1 lineage authored (Drakehorn/Heat); 11 seeded for P1.5.
- [documentation/New/LineageSystem.md](documentation/New/LineageSystem.md): pointer added to the new catalog near the top; cross-evolution graph content unchanged.
- [documentation/BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): new "Lineage unique mechanics" section tracks `uniqueMechanic` sentinel status alongside `upgradeBonuses`.

### Notes

- No combat engine changes. Heat and the 11 seeded mechanics are intended to ride on existing `StatusInstance.stacks` + `statTag` — no new `primaryResource` enum entries, no new effect kinds.
- Brainstorm's reversed tier direction (T1=simple, T5=apex in its second 60-class breakdown) is explicitly rejected; codebase convention remains **T5 = starter, T1 = apex**.

## [0.4.0] — 2026-04-21

### Added — P2 CombatEngine (client-authoritative domain core)

- [src/domain/combat/](src/domain/combat/): deterministic, pure-function combat engine sized for the locked 0.3.0 architecture (runs identically on client and in a Cloud Function for replay audit).
- [types.ts](src/domain/combat/types.ts): `Unit`, `BattleState`, `StatusInstance` (snapshot-based), `BattleEvent` discriminated union (10 variants), `Action`, `StepResult`, branded `InstanceId`.
- [prng.ts](src/domain/combat/prng.ts): Mulberry32 (seed, cursor) → u32 / `[0,1)` / range-int / chance. 32-bit seeds match the server-issued-seed contract.
- [d20.ts](src/domain/combat/d20.ts): 4-tier hit system (fail `1–9`, normal `10–17`, strong `18–19`, critical `20`) + d12 severity on crit (`1.25–4.0`). Mitigation `100 / (100 + 2 × DEF)`. Linear resistance clamped to `[0, 1]`.
- [stats.ts](src/domain/combat/stats.ts): base → effective pipeline; buff/debuff deltas via `statTag` aliasing; `CT_REDUCTION_CAP = 0.10` clamped at both base and effective layers.
- [queue.ts](src/domain/combat/queue.ts): CT queue (`ct asc`, `speed desc`, `insertionIndex asc`); event-driven `advance` ticks `dt = nextReadyDelta`, decrements cooldowns, ticks DoT/HoT with snapshot math, expires statuses, resolves win/loss/draw.
- [defaults.ts](src/domain/combat/defaults.ts): placeholder magnitude/duration/stacks/chance table for `UNSPECIFIED` sentinels; see [BALANCE_TUNING.md](documentation/BALANCE_TUNING.md) "Engine defaults".
- [factory.ts](src/domain/combat/factory.ts): `buildPlayerUnit` (tier baseline + passive stat overlays, HP from stamina, MP from intellect), `buildEnemyUnit` (archetype scaling row → unit stats), `buildBattleState`, `SYNTHETIC_BASIC_ATTACK` fallback for units without an authored basic attack.
- [validate.ts](src/domain/combat/validate.ts): `canCast` returns `{ ok, mpCost, hpCost, ctCost } | { ok: false, reason }` — enumerated `StepError` codes (`battle_ended`, `unit_dead`, `not_ready`, `unit_stunned`, `skill_not_owned`, `skill_on_cooldown`, `insufficient_resource`, `invalid_target`).
- [effects.ts](src/domain/combat/effects.ts): discriminated-union registry over all 15 `SkillEffectKind` values — damage, dot, heal, hot, buff, debuff, shield (with absorb logic), counter, ct_shift, execute, cleanse, lifesteal, status (generic), summon/utility (stub events for balance audit).
- [step.ts](src/domain/combat/step.ts): single-action reducer. Rolls d20 once per cast, deducts resources, charges CT, sets cooldown, resolves targets, applies all effects, re-sorts turn order, seals `battle_ended`.
- [index.ts](src/domain/combat/index.ts): barrel + `createEngine({ seed, units, skillLookup })` returning a `CombatEngine` façade (`ready`, `timeUntilReady`, `advance`, `step`, `withState`).
- Tests ([src/domain/combat/__tests__/](src/domain/combat/__tests__/)): `prng`, `d20`, `stats`, `queue`, `effects`, `determinism` (same seed → byte-identical log + state), `integration` (full-cycle battle, cooldown gating, MP deduction, DoT persistence across `advance`). 46 tests, all green.

### Fixed

- `advance` DoT/HoT tick accounting now clamps `effectiveDt = min(dt, remainingSec)` before computing `ticksFired`, so a status whose remaining duration is shorter than `dt` still fires the expected number of ticks before expiring (previously fired zero).
- Initial `turnOrder` in `buildBattleState` / test fixtures is now sorted through `sortedTurnOrder` so `pickReady` respects the speed and `insertionIndex` tiebreakers from turn zero.

### Documentation

- [BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): new "Engine defaults (P2 CombatEngine)" section captures the prototype placeholder magnitudes, CT cap, D20 severity curve, and synthetic basic attack — each flagged as a P6 tuning candidate.

## [0.3.0] — 2026-04-21

### Changed — Documentation

- [INTEGRATION_REPORT.md §4](documentation/INTEGRATION_REPORT.md) rewritten to reflect the locked **client-authoritative combat with server-issued seeds** architecture (runtime topology, combat authority model, security & anti-cheat subsections). Supersedes the earlier hybrid client-prediction + per-action reconciliation model.
- Aligned edits in the same file: §2 bullet 2 reworded; §5 data model updated (`Run.state` removed, `PlayerAction` removed, `BattleState` moved to client-side P2 spec with a pointer note, `StageOutcome` added); §5 Firestore rules drop `runs/{runId}/actions/{actionId}` and add `runs/{runId}/checkpoints/{stageIndex}`; §6 Networking row; §9 P3 Cloud Function list (`processAction` → `submitStageOutcome` + `bankCheckpoint` + `rollAnomaly`) and P4 wiring; §10 P3 and P4 done-criteria; Appendix B elevator pitch.

### Notes

- No code changed. Any future P3 (Firebase backend) plan must cite the updated §5 schema, not the pre-0.3.0 shape.

## [0.2.0] — 2026-04-20

### Added — P1 content (vertical slice)

- Typed content schema under [src/content/types/](src/content/types/): `sentinel`, `ids`, `lineage`, `class`, `skill`, `gear`, `boss`, `enemy`, `anomaly`, `encounter`.
- `UNSPECIFIED` sentinel + `UnspecifiedOr<T>` helpers for tuning placeholders.
- [src/content/lineages.ts](src/content/lineages.ts): all 12 lineages encoded with adjacency graph; Drakehorn Forge has a full 10-rank upgrade table (magnitudes sentinel).
- [src/content/classes/drakehornForge.ts](src/content/classes/drakehornForge.ts): 5 Drakehorn classes (T1–T5) with full passives + cross-lineage evolution edges into Thorn Ledger and Tide Shell.
- [src/content/skills/drakehornForge.ts](src/content/skills/drakehornForge.ts): 25 Drakehorn skills.
- [src/content/classes/stubs.ts](src/content/classes/stubs.ts): 55 stub classes (11 lineages × 5 tiers) to resolve cross-lineage evolution edges.
- [src/content/gear.ts](src/content/gear.ts): Dragon T5 set (Worldbreaker Fang, Molten Sovereign Plate, Ashfire Sigil) + 60 T1–T4 procedural templates keyed by `{role, tier, slot}`.
- [src/content/enemies.ts](src/content/enemies.ts): 12 enemy archetypes with 4-tier scaling tables.
- [src/content/anomalies.ts](src/content/anomalies.ts): 4 anomaly categories (class_infusion, gear_mutation, lineage_shift, rule_break) with shared charge trigger.
- [src/content/bosses.ts](src/content/bosses.ts): 3 authored bosses (Pyre Warden mini, Vortex Colossus gate, Rimefang Hydra Drakehorn counter) + 24 boss stubs.
- [src/content/encounters.ts](src/content/encounters.ts): Run Director default weights + encounter registry.
- [src/content/__tests__/integrity.test.ts](src/content/__tests__/integrity.test.ts): cross-ref validator (id uniqueness, skill/class/lineage resolution, Drakehorn evolution chain walk, adjacency resolution, sentinel audit snapshot).
- [documentation/BALANCE_TUNING.md](documentation/BALANCE_TUNING.md): P6 tuning work index keyed off the sentinel audit.

### Notes

- `ClassPassive.magnitudeUnit` widened to include `'max_hp_percent'` for the Lava Heart rank-10 passive.
- Adjacency graph warns (not asserts) on asymmetric edges so typos surface without blocking the vertical slice.

### Added — P0 scaffold

- React Native + TypeScript + Expo SDK 55 project shape with strict `tsconfig` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`) and `@/*` path alias.
- Firebase client wiring via `@react-native-firebase/*` (app, auth, firestore, functions, app-check). App Check: debug provider in `__DEV__`, Play Integrity in production Android; iOS deferred.
- `src/` skeleton: `components/`, `content/`, `domain/`, `features/`, `hooks/`, `navigation/`, `screens/`, `services/`, `stores/`.
- Navigation stub: [App.tsx](App.tsx) → [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx) → [src/screens/PlaceholderScreen.tsx](src/screens/PlaceholderScreen.tsx) (anon sign-in + `helloWorld` callable smoke test).
- Cloud Functions project at [firebase/functions/](firebase/functions/) with `helloWorld` HTTPS callable (v2).
- Firebase root config: [firebase.json](firebase.json), [.firebaserc](.firebaserc), minimal deny-all [firebase/firestore.rules](firebase/firestore.rules), empty [firebase/firestore.indexes.json](firebase/firestore.indexes.json).
- Tooling: Jest (`jest-expo` preset), ESLint 9 flat config via `eslint-config-universe/flat/*`, Prettier, Reanimated babel plugin, Metro config.
- `.env.example` with `EXPO_PUBLIC_FIREBASE_*` placeholders + emulator host override.
- Smoke test [src/__tests__/smoke.test.ts](src/__tests__/smoke.test.ts).
- Operations runbook [documentation/OPERATIONS.md](documentation/OPERATIONS.md).

### Changed — Documentation

- Renamed Dream Ocean archetype "Beast" → "Spirit" across [INTEGRATION_REPORT.md](documentation/INTEGRATION_REPORT.md), [ClassDesignDeepResearch.md](documentation/New/ClassDesignDeepResearch.md), [DeepResearch2.md](documentation/New/DeepResearch2.md), [DeepResearch3.md](documentation/New/DeepResearch3.md). In-world names (Beast Bite, Beast's Instinct, etc.) preserved.
- §3 lineage mapping locked: Tide Shell → Rift, Arrow Creed → Tempest, Dream Ocean → Spirit. G1 marked Resolved.
- Architecture revised to **client-authoritative combat with server-issued seeds**; Firebase stores outcomes only, no battle logs. Supersedes [INTEGRATION_REPORT.md §4](documentation/INTEGRATION_REPORT.md) (rewrite tracked as follow-up).

### Added — Content docs

- [documentation/New/EnemyDesign.md](documentation/New/EnemyDesign.md): 12 parameterized enemy archetypes (stat_wall, speed_pressure, sustain_denial, dps_race, ct_manipulator, summoner, nullshield, chaos_dps, oracle, engineer, harrier, resonator) with 4-tier scaling tables and TypeScript schema. Closes G2.

### Notes

- `App.js` removed; [App.tsx](App.tsx) is the sole root (resolved via [index.js](index.js)).
- ESLint bumped 8 → 9 to satisfy `eslint-config-universe@14` peer requirement.
- `ignoreDeprecations` removed from both tsconfigs — TS 5.9 rejects the value.
