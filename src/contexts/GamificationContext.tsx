import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from "react";
import { collection, doc, onSnapshot, query, where, orderBy, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../config/firebaseConfig";
import { useAuth } from "./AuthContext";
import { AppEvents, APP_EVENTS } from "../utils/appEvents";
import {
  awardXP,
  checkAndAwardAchievements,
  loadAchievementDefinitions,
  seedAchievementDefinitions,
  getQuestMilestones,
  getUnlockedCosmetics,
  equipCosmetic,
  unequipCosmetic,
  loadDailyQuests,
  incrementQuestProgress,
  selectDailyQuests,
  getTodayDateStr,
  getUnlockedTitles,
  equipTitle,
  unequipTitle,
  equipCompanion,
  getXPMultiplier,
  getCachedXPMultiplier,
  ACHIEVEMENT_DEFINITIONS,
  COSMETIC_DEFINITIONS,
  TITLE_DEFINITIONS,
  QUEST_POOL,
  MATERIAL_DEFINITIONS,
  calculateLevel,
} from "../services/gamification/GamificationService";
import type { EquippedCosmetics, CosmeticDefinition, QuestProgress, QuestDefinition, DailyQuestState, TitleDefinition, XPMultiplierConfig } from "../services/gamification/GamificationService";
import {
  startExpedition as startExpeditionService,
  resolveExpedition as resolveExpeditionService,
  clearExpedition as clearExpeditionService,
  purchaseShopItem as purchaseShopItemService,
  purchaseStreakFreeze as purchaseStreakFreezeService,
  isExpeditionComplete,
  awardGold,
} from "../services/gamification/ExpeditionService";
import type { ActiveExpedition, ExpeditionLoot, ExpeditionTypeId, TownState, PlacedBuilding, TownTier } from "../services/gamification/ExpeditionTypes";
import { purchaseTownBuilding as purchaseTownBuildingService, purchaseTierUpgrade as purchaseTierUpgradeService, demolishTownBuilding as demolishTownBuildingService, TOWN_TIERS, getTownTier, computeVaultStatus, claimVaultGold as claimVaultGoldService } from "../services/gamification/TownService";
import type { VaultStatus } from "../services/gamification/ExpeditionTypes";
import { checkAndSendReminders } from "../services/notification/ReminderService";

const GamificationContext = createContext<Record<string, any> | null>(null);

const DEFAULT_PROFILE: Record<string, any> = {
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  totalPaymentsMade: 0,
  totalExpensesCreated: 0,
  equippedCosmetics: { border: null, avatar_frame: null },
};

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [gameProfile, setGameProfile] = useState(DEFAULT_PROFILE);
  // Companion mood (manual override, in-memory)
  const [companionMood, setCompanionMood] = useState<string | null>(null); // null = auto
  const [achievements, setAchievements] = useState<Record<string, any>[]>([]);
  const [achievementDefs, setAchievementDefs] = useState(ACHIEVEMENT_DEFINITIONS);
  const [pendingXPToast, setPendingXPToast] = useState<{ xpDelta: number; newXp: number; reason: string } | null>(null);
  const [pendingAchievement, setPendingAchievement] = useState<Record<string, unknown> | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ newLevel: number; unlockedCosmetics: CosmeticDefinition[] } | null>(null);
  const [dailyQuestState, setDailyQuestState] = useState<DailyQuestState | null>(null);
  const [xpMultiplier, setXpMultiplier] = useState<XPMultiplierConfig>({ active: false, multiplier: 1, label: '', startTime: null, endTime: null });
  const [pendingGoldToast, setPendingGoldToast] = useState<{ goldDelta: number; newGold: number; reason: string } | null>(null);
  const [pendingExpeditionLoot, setPendingExpeditionLoot] = useState<ExpeditionLoot | null>(null);
  const [pendingLootDrop, setPendingLootDrop] = useState<{ materialId: string; materialName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  // Optimistic local deltas — applied instantly before Firestore round-trip
  const [localXPDelta, setLocalXPDelta] = useState(0);
  const [localGoldDelta, setLocalGoldDelta] = useState(0);

  const uid = user?.uid;
  const isAnonymous = user?.isAnonymous ?? true;

  // Load achievement definitions — auto-seed if Firestore collection is empty.
  // Must wait for uid so the Firestore write is authenticated (rules require auth).
  useEffect(() => {
    if (!uid || isAnonymous) return;

    loadAchievementDefinitions().then((defs) => {
      setAchievementDefs(defs);
      // If loadAchievementDefinitions returned the local fallback (same reference),
      // Firestore collection is empty — seed it once so future loads are richer.
      if (defs === ACHIEVEMENT_DEFINITIONS) {
        seedAchievementDefinitions().catch(console.warn);
      }
    });
  }, [uid, isAnonymous]);

  // Fetch XP multiplier config
  useEffect(() => {
    if (!uid || isAnonymous) return;
    getXPMultiplier().then(setXpMultiplier).catch(console.warn);
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      getXPMultiplier().then(setXpMultiplier).catch(console.warn);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [uid, isAnonymous]);

  // Real-time Firestore subscriptions — skipped for anonymous / unauthenticated users
  useEffect(() => {
    if (!uid || isAnonymous) {
      setGameProfile(DEFAULT_PROFILE);
      setAchievements([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    // userGameProfiles/{uid}
    const profileRef = doc(db, "userGameProfiles", uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          setGameProfile(snap.data());
          // Firestore now has confirmed values — clear optimistic deltas
          setLocalXPDelta(0);
          setLocalGoldDelta(0);
        }
        setLoading(false);
      },
      (error) => {
        console.warn("[GamificationContext] profile subscription error:", error);
        setLoading(false);
      }
    );

    // userAchievements where userId == uid
    const achievementsQ = query(
      collection(db, "userAchievements"),
      where("userId", "==", uid),
      orderBy("unlockedAt", "desc")
    );
    const unsubAchievements = onSnapshot(
      achievementsQ,
      (snap) => {
        setAchievements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.warn("[GamificationContext] achievements subscription error:", error);
      }
    );

    // Sync email to game profile on login (ensures existing profiles get the field)
    const email = user?.email || null;
    if (email) {
      setDoc(profileRef, { email, updatedAt: serverTimestamp() }, { merge: true })
        .catch(console.warn);
    }

    return () => {
      unsubProfile();
      unsubAchievements();
    };
  }, [uid, isAnonymous]);

  // Load daily quests on mount and when date changes
  useEffect(() => {
    if (!uid || isAnonymous) {
      setDailyQuestState(null);
      return;
    }

    loadDailyQuests(uid).then((state) => {
      if (state) setDailyQuestState(state);
    });

    // Also auto-complete "open app" quest on load
    incrementQuestProgress(uid, 'quest:app_opened').then(() => {
      // Reload state after potential progress
      loadDailyQuests(uid).then((state) => {
        if (state) setDailyQuestState(state);
      });
    });

    // Check for balance digest / settle-up nudge reminders (fire-and-forget)
    checkAndSendReminders(uid).catch(console.warn);
  }, [uid, isAnonymous]);

  // Listen to app events to increment quest progress
  useEffect(() => {
    if (!uid || isAnonymous) return;

    const questTriggerEvents = [
      APP_EVENTS.EXPENSE_CREATED,
      APP_EVENTS.EXPENSE_APPROVED,
      APP_EVENTS.PAYMENT_COMPLETED,
    ];

    const unsubs = questTriggerEvents.map((event) =>
      AppEvents.on(event, () => {
        incrementQuestProgress(uid, event).then(() => {
          loadDailyQuests(uid).then((state) => {
            if (state) setDailyQuestState(state);
          });
        });
      })
    );

    // Also listen for quest-specific triggers (custom events for views)
    const customTriggers = ['quest:balance_viewed', 'quest:group_viewed', 'quest:overview_viewed', 'quest:photo_attached'];
    const customUnsubs = customTriggers.map((event) =>
      AppEvents.on(event as any, () => {
        incrementQuestProgress(uid, event).then(() => {
          loadDailyQuests(uid).then((state) => {
            if (state) setDailyQuestState(state);
          });
        });
      })
    );

    return () => {
      unsubs.forEach(u => u());
      customUnsubs.forEach(u => u());
    };
  }, [uid, isAnonymous]);

  // AppEvents listeners — drive XPToast and AchievementUnlockModal
  useEffect(() => {
    if (!uid || isAnonymous) return;

    const unsubXP = AppEvents.on(APP_EVENTS.GAMIFICATION_XP_AWARDED, (data) => {
      if (data.userId !== uid) return;
      setPendingXPToast({ xpDelta: data.xpDelta, newXp: data.newXp, reason: data.reason });

      // Level-up detection: compare previous level with new level
      const prevLevel = calculateLevel(data.newXp - data.xpDelta);
      if (data.newLevel > prevLevel) {
        // Compute cosmetics newly unlocked at this level
        const newCosmetics = COSMETIC_DEFINITIONS.filter(
          (c) => !c.achievementId && c.levelRequired === data.newLevel
        );
        setPendingLevelUp({ newLevel: data.newLevel, unlockedCosmetics: newCosmetics });
      }

      // century_club check: fired here because only after the award do we know newXp
      if (data.newXp >= 100) {
        checkAndAwardAchievements(uid, { totalXP: data.newXp }).catch(console.warn);
      }
    });

    const unsubAchievement = AppEvents.on(
      APP_EVENTS.GAMIFICATION_ACHIEVEMENT_UNLOCKED,
      (data) => {
        if (data.userId !== uid) return;
        setPendingAchievement(data.achievement);
      }
    );

    const unsubGold = AppEvents.on(APP_EVENTS.GAMIFICATION_GOLD_AWARDED, (data) => {
      if (data.userId !== uid) return;
      setPendingGoldToast({ goldDelta: data.goldDelta, newGold: data.newGold, reason: data.reason });
    });

    const unsubExpeditionResolved = AppEvents.on(APP_EVENTS.EXPEDITION_RESOLVED, (data) => {
      if (data.userId !== uid) return;
      setPendingExpeditionLoot(data.loot);
    });

    const unsubLootDrop = AppEvents.on(APP_EVENTS.GAMIFICATION_LOOT_DROP, (data) => {
      if (data.userId !== uid) return;
      setPendingLootDrop({ materialId: data.materialId, materialName: data.materialName });
    });

    return () => {
      unsubXP();
      unsubAchievement();
      unsubGold();
      unsubExpeditionResolved();
      unsubLootDrop();
    };
  }, [uid, isAnonymous]);

  // Convenience wrapper — callers don't need to pass uid
  const addXP = useCallback(
    (xpDelta: number, reason: string, referenceId: string, referenceType: string, groupId: string | null = null) => {
      if (!uid || isAnonymous) return;
      // Optimistic: update local state immediately for instant UI
      setLocalXPDelta(prev => prev + xpDelta);
      awardXP(uid, xpDelta, reason, referenceId, referenceType, groupId).catch(console.warn);
    },
    [uid, isAnonymous]
  );

  // Gold convenience wrapper — mirrors addXP pattern
  const addGold = useCallback(
    (goldDelta: number, reason: string, referenceId: string, referenceType: string, silent: boolean = false) => {
      if (!uid || isAnonymous) return;
      // Optimistic: update local state immediately for instant UI
      setLocalGoldDelta(prev => prev + goldDelta);
      awardGold(uid, goldDelta, reason, referenceId, referenceType, silent).catch(console.warn);
    },
    [uid, isAnonymous]
  );

  // In-memory achievement check (avoids Firestore read in callers)
  const hasAchievement = useCallback(
    (achievementId: string) => achievements.some((a) => a.achievementId === achievementId),
    [achievements]
  );

  const clearXPToast = useCallback(() => setPendingXPToast(null), []);
  const clearAchievementModal = useCallback(() => setPendingAchievement(null), []);
  const clearLevelUp = useCallback(() => setPendingLevelUp(null), []);

  const { currentMilestone, previousMilestone } = getQuestMilestones((gameProfile.xp || 0) + localXPDelta);

  // Cosmetics + earned IDs (needed by both cosmetics and titles)
  const equippedCosmetics: EquippedCosmetics = gameProfile.equippedCosmetics || { border: null, avatar_frame: null };
  const earnedAchievementIds = achievements.map((a: any) => a.achievementId);
  const unlockedCosmetics = getUnlockedCosmetics(gameProfile.level || 1, earnedAchievementIds);

  // Titles
  const equippedTitle: string | null = gameProfile.equippedTitle || null;
  const titleStats = useMemo(() => ({
    totalExpensesCreated: gameProfile.totalExpensesCreated || 0,
    totalPaymentsMade: gameProfile.totalPaymentsMade || 0,
  }), [gameProfile.totalExpensesCreated, gameProfile.totalPaymentsMade]);

  const unlockedTitles = useMemo(
    () => getUnlockedTitles(gameProfile.level || 1, earnedAchievementIds, titleStats),
    [gameProfile.level, earnedAchievementIds, titleStats]
  );

  const handleEquipTitle = useCallback(
    (titleId: string) => { if (uid) equipTitle(uid, titleId).catch(console.warn); },
    [uid]
  );
  const handleUnequipTitle = useCallback(
    () => { if (uid) unequipTitle(uid).catch(console.warn); },
    [uid]
  );

  const getEquippedTitleDef = useCallback(
    (): TitleDefinition | null => {
      if (!equippedTitle) return null;
      return TITLE_DEFINITIONS.find(t => t.id === equippedTitle) || null;
    },
    [equippedTitle]
  );

  // Companion
  const companionCharacter: string | null = gameProfile.companionCharacter || null;
  const handleEquipCompanion = useCallback(
    (characterId: string) => { if (uid) equipCompanion(uid, characterId).catch(console.warn); },
    [uid]
  );

  // Gold & Economy — derived from gameProfile + optimistic delta
  const gold: number = (gameProfile.gold || 0) + localGoldDelta;
  const expedition: ActiveExpedition | null = gameProfile.expedition || null;
  const ownedShopItems: string[] = gameProfile.ownedShopItems || [];
  const streakFreezes: number = gameProfile.streakFreezes || 0;

  // Town — derived from gameProfile (delivered via existing onSnapshot)
  const townState: TownState | null = gameProfile.town || null;
  const townBuildings: PlacedBuilding[] = townState?.buildings || [];
  const townTotalGoldSpent = townState?.totalGoldSpent || 0;
  const currentTownTier: TownTier = getTownTier(townState);

  // Vault — passive gold accumulation (recomputed each render; cheap pure function)
  const vaultStatus: VaultStatus = useMemo(
    () => computeVaultStatus(townState),
    [townState],
  );

  const clearGoldToast = useCallback(() => setPendingGoldToast(null), []);
  const clearExpeditionLoot = useCallback(() => setPendingExpeditionLoot(null), []);
  const clearLootDrop = useCallback(() => setPendingLootDrop(null), []);

  const handleStartExpedition = useCallback(
    (expeditionType: ExpeditionTypeId) => {
      if (!uid || isAnonymous) return Promise.resolve({ success: false, error: 'not_authenticated' });
      return startExpeditionService(uid, expeditionType, gameProfile.level || 1);
    },
    [uid, isAnonymous, gameProfile.level],
  );

  const handleResolveExpedition = useCallback(
    async () => {
      if (!uid || isAnonymous) return null;
      return resolveExpeditionService(uid);
    },
    [uid, isAnonymous],
  );

  const handleClearExpedition = useCallback(
    () => {
      if (!uid || isAnonymous) return;
      clearExpeditionService(uid).catch(console.warn);
    },
    [uid, isAnonymous],
  );

  const handlePurchaseShopItem = useCallback(
    async (itemId: string) => {
      if (!uid || isAnonymous) return { success: false as const, error: 'insufficient_gold' as const };
      return purchaseShopItemService(uid, itemId, gameProfile.level || 1, gold, ownedShopItems);
    },
    [uid, isAnonymous, gameProfile.level, gold, ownedShopItems],
  );

  const handlePurchaseStreakFreeze = useCallback(
    async () => {
      if (!uid || isAnonymous) return { success: false as const, error: 'not_authenticated' };
      return purchaseStreakFreezeService(uid);
    },
    [uid, isAnonymous],
  );

  const handlePurchaseTownBuilding = useCallback(
    async (buildingId: string, targetGridIndex?: number) => {
      if (!uid || isAnonymous) return { success: false as const, error: 'insufficient_gold' as const };
      return purchaseTownBuildingService(uid, buildingId, gold, townState, targetGridIndex);
    },
    [uid, isAnonymous, gold, townState],
  );

  const handlePurchaseTierUpgrade = useCallback(
    async () => {
      if (!uid || isAnonymous) return { success: false as const, error: 'insufficient_gold' as const };
      return purchaseTierUpgradeService(uid, gold, townState);
    },
    [uid, isAnonymous, gold, townState],
  );

  const handleClaimVaultGold = useCallback(
    async () => {
      if (!uid || isAnonymous) return { claimed: 0, newGoldBalance: 0 };
      return claimVaultGoldService(uid, townState);
    },
    [uid, isAnonymous, townState],
  );

  const handleDemolishTownBuilding = useCallback(
    async (gridIndex: number) => {
      if (!uid || isAnonymous) return { success: false as const, error: 'not_found' };
      return demolishTownBuildingService(uid, gridIndex, townState);
    },
    [uid, isAnonymous, townState],
  );

  // Daily quests — compute definitions for today's selected quests
  const dailyQuests = dailyQuestState?.quests ?? [];
  const dailyQuestDefs: QuestDefinition[] = useMemo(() => {
    if (!uid || !dailyQuestState) return [];
    return selectDailyQuests(uid, dailyQuestState.date);
  }, [uid, dailyQuestState]);
  const dailyBonusClaimed = dailyQuestState?.bonusClaimed ?? false;

  // Helper to emit custom quest trigger events from screens
  const emitQuestTrigger = useCallback((triggerEvent: string) => {
    AppEvents.emit(triggerEvent as any, {} as any);
  }, []);

  const handleEquipCosmetic = useCallback(
    (cosmeticId: string, slot: 'border' | 'avatar_frame') => {
      if (!uid) return;
      equipCosmetic(uid, cosmeticId, slot).catch(console.warn);
    },
    [uid]
  );

  const handleUnequipCosmetic = useCallback(
    (slot: 'border' | 'avatar_frame') => {
      if (!uid) return;
      unequipCosmetic(uid, slot).catch(console.warn);
    },
    [uid]
  );

  // Get the full cosmetic definition for an equipped slot
  const getEquippedCosmeticDef = useCallback(
    (slot: 'border' | 'avatar_frame'): CosmeticDefinition | null => {
      const id = equippedCosmetics[slot];
      if (!id) return null;
      return COSMETIC_DEFINITIONS.find((c) => c.id === id) || null;
    },
    [equippedCosmetics]
  );

  const value = useMemo(() => ({
    // Profile stats (with optimistic local deltas)
    xp: (gameProfile.xp || 0) + localXPDelta,
    level: calculateLevel((gameProfile.xp || 0) + localXPDelta),
    streak: gameProfile.streak || 0,
    longestStreak: gameProfile.longestStreak || 0,
    // Achievements
    achievements,
    achievementDefs,
    // Quest progress
    currentMilestone,
    previousMilestone,
    // Cosmetics
    equippedCosmetics,
    unlockedCosmetics,
    cosmeticDefinitions: COSMETIC_DEFINITIONS,
    equipCosmetic: handleEquipCosmetic,
    unequipCosmetic: handleUnequipCosmetic,
    getEquippedCosmeticDef,
    // Titles
    equippedTitle,
    unlockedTitles,
    titleDefinitions: TITLE_DEFINITIONS,
    equipTitle: handleEquipTitle,
    unequipTitle: handleUnequipTitle,
    getEquippedTitleDef,
    // Daily quests
    dailyQuests,
    dailyQuestDefs,
    dailyBonusClaimed,
    emitQuestTrigger,
    // Companion
    companionCharacter,
    equipCompanion: handleEquipCompanion,
    companionMood,
    setCompanionMood,
    gameProfile,
    // XP Multiplier
    xpMultiplier,
    // Gold & Economy
    gold,
    expedition,
    ownedShopItems,
    streakFreezes,
    startExpedition: handleStartExpedition,
    resolveExpedition: handleResolveExpedition,
    clearExpedition: handleClearExpedition,
    purchaseShopItem: handlePurchaseShopItem,
    purchaseStreakFreeze: handlePurchaseStreakFreeze,
    // Town
    townState,
    townBuildings,
    townTotalGoldSpent,
    currentTownTier,
    purchaseTownBuilding: handlePurchaseTownBuilding,
    purchaseTierUpgrade: handlePurchaseTierUpgrade,
    demolishTownBuilding: handleDemolishTownBuilding,
    vaultStatus,
    claimVaultGold: handleClaimVaultGold,
    // Materials / Loot
    materials: gameProfile.materials || {},
    materialDefinitions: MATERIAL_DEFINITIONS,
    // Pending UI triggers
    pendingXPToast,
    pendingAchievement,
    pendingLevelUp,
    pendingGoldToast,
    pendingExpeditionLoot,
    pendingLootDrop,
    // Actions
    addXP,
    addGold,
    hasAchievement,
    clearXPToast,
    clearAchievementModal,
    clearLevelUp,
    clearGoldToast,
    clearExpeditionLoot,
    clearLootDrop,
    // Meta
    loading,
  }), [gameProfile, localXPDelta, localGoldDelta, achievements, achievementDefs, currentMilestone, previousMilestone,
       equippedCosmetics, unlockedCosmetics, handleEquipCosmetic, handleUnequipCosmetic,
       getEquippedCosmeticDef, equippedTitle, unlockedTitles, handleEquipTitle, handleUnequipTitle,
       getEquippedTitleDef, dailyQuests, dailyQuestDefs, dailyBonusClaimed, emitQuestTrigger,
       companionCharacter, handleEquipCompanion, companionMood, xpMultiplier,
       gold, expedition, ownedShopItems, streakFreezes, handleStartExpedition, handleResolveExpedition,
       handleClearExpedition, handlePurchaseShopItem, handlePurchaseStreakFreeze,
       townState, townBuildings, townTotalGoldSpent, currentTownTier, handlePurchaseTownBuilding, handlePurchaseTierUpgrade, handleDemolishTownBuilding, vaultStatus, handleClaimVaultGold,
       pendingXPToast, pendingAchievement, pendingLevelUp, pendingGoldToast, pendingExpeditionLoot, pendingLootDrop,
       addXP, addGold, hasAchievement, clearXPToast, clearAchievementModal, clearLevelUp,
       clearGoldToast, clearExpeditionLoot, clearLootDrop, loading]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within GamificationProvider");
  }
  return context;
}
