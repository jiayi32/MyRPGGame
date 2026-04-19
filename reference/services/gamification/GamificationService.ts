/**
 * GamificationService.js — XP, achievements, streaks, and leaderboard
 *
 * Design principles:
 * - Fire-and-forget: all public functions are async and wrapped in try/catch.
 *   Callers should `.catch(console.warn)` — never block critical payment/expense flows.
 * - Idempotent: reward idempotency docs guard against duplicate awards on retry/crash.
 * - Anonymous-safe: early return if userId is falsy.
 *
 * @see documentation/features/GAMIFICATION_IMPLEMENTATION_PLAN.md
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { getFirebaseDb, getFirebaseAuth } from '../../config/firebaseConfig'
import { AppEvents, APP_EVENTS } from '../../utils/appEvents'
import { awardGold, consumeStreakFreeze, awardStreakFreeze } from './ExpeditionService'
import {
  buildRewardIdempotencyDocId,
  checkAndUpdateAwardedKeys,
  isPermissionDeniedError,
  markRewardIdempotencyPermissionDenied,
  maybeResetRewardIdempotencyMode,
  shouldUseLegacyRewardIdempotency,
} from './awardKeyHelpers'

/** Get the current Firebase Auth user's email, or null if unavailable. */
function getCurrentUserEmail(): string | null {
  try {
    const auth = getFirebaseAuth();
    return auth?.currentUser?.email || null;
  } catch {
    return null;
  }
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
}

// ---------------------------------------------------------------------------
// Cosmetics — borders & avatar frames unlocked by level or achievements
// ---------------------------------------------------------------------------

export interface CosmeticDefinition {
  id: string;
  name: string;
  type: 'border' | 'avatar_frame';
  /** Gradient/solid colors for the border ring */
  colors: string[];
  /** Minimum level required (0 = unlocked by achievement instead) */
  levelRequired: number;
  /** Achievement ID that unlocks this (null = level-gated only) */
  achievementId: string | null;
  /** Preview icon for gallery */
  icon: string;
  /** Animation type for premium borders. Undefined = static. */
  animationType?: 'rotate' | 'pulse' | 'rainbow' | 'fire';
}

export interface EquippedCosmetics {
  border: string | null;       // cosmeticDefinition id
  avatar_frame: string | null; // cosmeticDefinition id
}

export const COSMETIC_DEFINITIONS: CosmeticDefinition[] = [
  // Level-gated borders
  { id: 'border_default',   name: 'Classic',       type: 'border', colors: ['#C4C4DC'],                levelRequired: 1,  achievementId: null,         icon: 'circle-outline' },
  { id: 'border_bronze',    name: 'Bronze Ring',    type: 'border', colors: ['#CD7F32', '#A0522D'],      levelRequired: 2,  achievementId: null,         icon: 'circle-slice-2' },
  { id: 'border_silver',    name: 'Silver Ring',    type: 'border', colors: ['#C0C0C0', '#A8A8A8'],      levelRequired: 4,  achievementId: null,         icon: 'circle-slice-4' },
  { id: 'border_gold',      name: 'Gold Ring',      type: 'border', colors: ['#FFD700', '#FFA500'],      levelRequired: 6,  achievementId: null,         icon: 'circle-slice-6' },
  { id: 'border_diamond',   name: 'Diamond Ring',   type: 'border', colors: ['#B9F2FF', '#00CED1', '#4169E1'], levelRequired: 8, achievementId: null,   icon: 'circle-slice-8' },
  { id: 'border_legendary', name: 'Legendary Aura', type: 'border', colors: ['#9B59B6', '#E74C3C', '#F39C12'], levelRequired: 10, achievementId: null,  icon: 'star-circle' },

  // Achievement-gated borders
  { id: 'border_fire',      name: 'On Fire',        type: 'border', colors: ['#FF6B35', '#FF2D00'],      levelRequired: 0,  achievementId: 'on_a_roll',  icon: 'fire' },
  { id: 'border_globe',     name: 'Globetrotter',   type: 'border', colors: ['#2196F3', '#4CAF50'],      levelRequired: 0,  achievementId: 'globetrotter', icon: 'earth' },
  { id: 'border_speed',     name: 'Speed Demon',    type: 'border', colors: ['#00BCD4', '#FFEB3B'],      levelRequired: 0,  achievementId: 'prompt_payer', icon: 'clock-fast' },

  // Avatar frames
  { id: 'frame_star',       name: 'Star Frame',     type: 'avatar_frame', colors: ['#FFD700'],           levelRequired: 3,  achievementId: null,         icon: 'star-four-points' },
  { id: 'frame_shield',     name: 'Shield Frame',   type: 'avatar_frame', colors: ['#4200FF', '#6B4FFF'], levelRequired: 5,  achievementId: null,        icon: 'shield-star' },
  { id: 'frame_crown',      name: 'Crown Frame',    type: 'avatar_frame', colors: ['#FFD700', '#FF6B35'], levelRequired: 7,  achievementId: null,        icon: 'crown' },

  // Animated borders (premium tier)
  { id: 'border_pulse_gold', name: 'Golden Pulse',    type: 'border', colors: ['#FFD700', '#FFA500', '#FF8C00'],                             levelRequired: 7,  achievementId: null,           icon: 'pulse',          animationType: 'pulse' },
  { id: 'border_rainbow',    name: 'Prismatic',       type: 'border', colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'], levelRequired: 9,  achievementId: null,        icon: 'palette',        animationType: 'rainbow' },
  { id: 'border_inferno',    name: 'Inferno',         type: 'border', colors: ['#FF4500', '#FF6347', '#FFD700', '#FF2D00'],                   levelRequired: 0,  achievementId: 'on_a_roll',    icon: 'fire-circle',    animationType: 'fire' },
  { id: 'border_aurora',     name: 'Aurora Borealis', type: 'border', colors: ['#00CED1', '#7B68EE', '#9370DB', '#48D1CC'],                   levelRequired: 10, achievementId: null,           icon: 'weather-night', animationType: 'rainbow' },

  // Sprint 1 — Streak milestone cosmetics
  { id: 'border_flame_crown',   name: 'Flame Crown',    type: 'border', colors: ['#FF6B35', '#FFD700', '#FF4500'],                             levelRequired: 0,  achievementId: 'streak_30',    icon: 'fire',           animationType: 'fire' },
  { id: 'border_eternal_flame', name: 'Eternal Flame',  type: 'border', colors: ['#FF2D00', '#FF6347', '#FFD700', '#FF8C00'],                   levelRequired: 0,  achievementId: 'streak_100',   icon: 'fire-circle',    animationType: 'fire' },
]

// ---------------------------------------------------------------------------
// Daily Quest System
// ---------------------------------------------------------------------------

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  /** APP_EVENT key that increments this quest's progress */
  triggerEvent: string;
  /** Number of times the trigger must fire to complete */
  target: number;
}

export interface QuestProgress {
  questId: string;
  progress: number;
  target: number;
  completed: boolean;
  xpAwarded: boolean;
}

export interface DailyQuestState {
  date: string;
  userId: string;
  quests: QuestProgress[];
  bonusClaimed: boolean;
  updatedAt: any;
}

/** Pool of possible daily quests, grouped by difficulty */
export const QUEST_POOL: QuestDefinition[] = [
  // Easy (5 XP)
  { id: 'q_open_app',       title: 'Check In',           description: 'Open the app',                 icon: 'login',               difficulty: 'easy',   xpReward: 5,  triggerEvent: 'quest:app_opened',      target: 1 },
  { id: 'q_view_balance',   title: 'Balance Check',      description: 'View your balance summary',    icon: 'scale-balance',       difficulty: 'easy',   xpReward: 5,  triggerEvent: 'quest:balance_viewed',  target: 1 },
  { id: 'q_view_group',     title: 'Group Inspector',    description: 'Visit a group detail page',    icon: 'account-group',       difficulty: 'easy',   xpReward: 5,  triggerEvent: 'quest:group_viewed',    target: 1 },
  // Medium (10 XP)
  { id: 'q_log_expense',    title: 'Track It',           description: 'Log an expense',               icon: 'receipt',             difficulty: 'medium', xpReward: 10, triggerEvent: APP_EVENTS.EXPENSE_CREATED,   target: 1 },
  { id: 'q_approve_expense',title: 'Stamp of Approval',  description: 'Approve a pending expense',    icon: 'check-decagram',      difficulty: 'medium', xpReward: 10, triggerEvent: APP_EVENTS.EXPENSE_APPROVED,  target: 1 },
  { id: 'q_view_summary',   title: 'Big Picture',        description: 'View the group overview tab',  icon: 'chart-box-outline',   difficulty: 'medium', xpReward: 10, triggerEvent: 'quest:overview_viewed',     target: 1 },
  // Hard (15 XP)
  { id: 'q_settle_payment', title: 'Settle Up',          description: 'Make a payment settlement',    icon: 'cash-check',          difficulty: 'hard',   xpReward: 15, triggerEvent: APP_EVENTS.PAYMENT_COMPLETED, target: 1 },
  { id: 'q_add_photo',      title: 'Receipt Keeper',     description: 'Add a photo to an expense',    icon: 'camera',              difficulty: 'hard',   xpReward: 15, triggerEvent: 'quest:photo_attached',      target: 1 },
  { id: 'q_log_3_expenses', title: 'Triple Tracker',     description: 'Log 3 expenses today',         icon: 'numeric-3-circle',    difficulty: 'hard',   xpReward: 15, triggerEvent: APP_EVENTS.EXPENSE_CREATED,   target: 3 },
];

const DAILY_BONUS_XP = 20;

// ---------------------------------------------------------------------------
// Loot Drop System — RNG material drops from quest completion
// ---------------------------------------------------------------------------

export interface MaterialDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  { id: 'mat_iron_ore',    name: 'Iron Ore',       description: 'A chunk of raw iron',              icon: 'diamond-stone',     rarity: 'common' },
  { id: 'mat_wood',        name: 'Ancient Wood',    description: 'Sturdy wood from the old forest',  icon: 'tree',              rarity: 'common' },
  { id: 'mat_cloth',       name: 'Fine Cloth',      description: 'Soft fabric for capes and robes',  icon: 'tshirt-crew',       rarity: 'common' },
  { id: 'mat_crystal',     name: 'Magic Crystal',   description: 'Pulsing with arcane energy',       icon: 'diamond',           rarity: 'uncommon' },
  { id: 'mat_feather',     name: 'Phoenix Feather', description: 'A rare feather from a firebird',   icon: 'feather',           rarity: 'uncommon' },
  { id: 'mat_dragon_scale', name: 'Dragon Scale',   description: 'A shimmering scale of legend',     icon: 'shield-half-full',  rarity: 'rare' },
];

/** Drop rate by quest difficulty. Value = % chance of getting a drop. */
const DROP_RATES: Record<string, number> = {
  easy: 15,    // 15% chance
  medium: 30,  // 30% chance
  hard: 50,    // 50% chance
};

/** Rarity weights (higher = more likely to be selected when a drop occurs). */
const RARITY_WEIGHTS: Record<string, number> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};

/**
 * Roll for a material drop. Returns material ID or null if no drop.
 */
export function rollLootDrop(difficulty: string): string | null {
  const dropChance = DROP_RATES[difficulty] || 15;
  if (Math.random() * 100 > dropChance) return null;

  // Weighted random selection by rarity
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  let selectedRarity = 'common';
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { selectedRarity = rarity; break; }
  }

  const candidates = MATERIAL_DEFINITIONS.filter(m => m.rarity === selectedRarity);
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/**
 * Award a material drop to a user. Increments the count in their materials map.
 */
export async function awardMaterial(userId: string, materialId: string): Promise<void> {
  if (!userId || !materialId) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) return;

    const materials = profileSnap.data().materials || {};
    materials[materialId] = (materials[materialId] || 0) + 1;

    await setDoc(profileRef, { materials, updatedAt: serverTimestamp() }, { merge: true });

    const matDef = MATERIAL_DEFINITIONS.find(m => m.id === materialId);
    console.log(`[Gamification] Loot drop: ${matDef?.name || materialId} → ${userId}`);

    AppEvents.emit(APP_EVENTS.GAMIFICATION_LOOT_DROP, { userId, materialId, materialName: matDef?.name || materialId });
  } catch (error) {
    console.warn('[Gamification] awardMaterial error:', error);
  }
}

/**
 * Simple string hash (djb2) for deterministic quest selection.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Select 3 daily quests for a user on a given date (deterministic).
 * Returns one easy, one medium, one hard quest.
 */
export function selectDailyQuests(userId: string, dateStr: string): QuestDefinition[] {
  const easy = QUEST_POOL.filter(q => q.difficulty === 'easy');
  const medium = QUEST_POOL.filter(q => q.difficulty === 'medium');
  const hard = QUEST_POOL.filter(q => q.difficulty === 'hard');

  const seed = hashString(`${userId}_${dateStr}`);
  return [
    easy[seed % easy.length],
    medium[(seed >> 4) % medium.length],
    hard[(seed >> 8) % hard.length],
  ];
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Load or initialize today's daily quest progress from Firestore.
 */
export const loadDailyQuests = async (userId: string): Promise<DailyQuestState | null> => {
  if (!userId) return null;

  const db = getFirebaseDb();
  if (!db) return null;

  const today = getTodayDateStr();
  const docId = `${today}_${userId}`;

  try {
    const docRef = doc(db, 'dailyQuestProgress', docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as DailyQuestState;
    }

    // Initialize today's quests
    const selectedQuests = selectDailyQuests(userId, today);
    const newState: DailyQuestState = {
      date: today,
      userId,
      quests: selectedQuests.map(q => ({
        questId: q.id,
        progress: 0,
        target: q.target,
        completed: false,
        xpAwarded: false,
      })),
      bonusClaimed: false,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, newState);
    return newState;
  } catch (error) {
    console.warn('[Gamification] loadDailyQuests error:', error);
    return null;
  }
};

/**
 * Increment quest progress for a specific trigger event.
 * Called by AppEvents listeners when relevant actions happen.
 */
export const incrementQuestProgress = async (
  userId: string,
  triggerEvent: string
): Promise<void> => {
  if (!userId) return;

  const db = getFirebaseDb();
  if (!db) return;

  const today = getTodayDateStr();
  const docId = `${today}_${userId}`;

  try {
    const docRef = doc(db, 'dailyQuestProgress', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const state = snap.data() as DailyQuestState;
    const todayQuests = selectDailyQuests(userId, today);
    let changed = false;

    for (let i = 0; i < state.quests.length; i++) {
      const qp = state.quests[i];
      const def = todayQuests.find(q => q.id === qp.questId);
      if (!def || def.triggerEvent !== triggerEvent) continue;
      if (qp.completed) continue;

      qp.progress = Math.min(qp.progress + 1, qp.target);
      changed = true;

      if (qp.progress >= qp.target) {
        qp.completed = true;

        // Award quest XP
        if (!qp.xpAwarded) {
          qp.xpAwarded = true;
          await awardXP(userId, def.xpReward, 'daily_quest', `${docId}_${def.id}`, 'quest', null);
          AppEvents.emit(APP_EVENTS.GAMIFICATION_QUEST_COMPLETE, {
            userId, questId: def.id, xpReward: def.xpReward,
          });

          // Roll for loot drop (fire-and-forget)
          const droppedMaterial = rollLootDrop(def.difficulty);
          if (droppedMaterial) {
            setTimeout(() => awardMaterial(userId, droppedMaterial).catch(console.warn), 500);
          }
        }
      }

      AppEvents.emit(APP_EVENTS.GAMIFICATION_QUEST_PROGRESS, {
        userId, questId: def.id, progress: qp.progress, target: qp.target, completed: qp.completed,
      });
    }

    // Check for daily bonus (all 3 complete)
    if (changed) {
      const allComplete = state.quests.every(q => q.completed);
      if (allComplete && !state.bonusClaimed) {
        state.bonusClaimed = true;
        await awardXP(userId, DAILY_BONUS_XP, 'daily_quest_bonus', `${docId}_bonus`, 'quest', null);
        setTimeout(() => awardGold(userId, 10, 'daily_quest_bonus', `${docId}_bonus_gold`, 'quest').catch(console.warn), 1000);
        AppEvents.emit(APP_EVENTS.GAMIFICATION_DAILY_BONUS, { userId, xpReward: DAILY_BONUS_XP });
      }

      state.updatedAt = serverTimestamp();
      await setDoc(docRef, state);
    }
  } catch (error) {
    console.warn('[Gamification] incrementQuestProgress error:', error);
  }
};

// ---------------------------------------------------------------------------
// Title / Flair System
// ---------------------------------------------------------------------------

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Condition type for unlocking */
  unlockType: 'default' | 'level' | 'achievement' | 'stat';
  /** For level-gated: minimum level required */
  levelRequired?: number;
  /** For achievement-gated: achievement ID */
  achievementId?: string;
  /** For stat-gated: { field, threshold } */
  statCondition?: { field: string; threshold: number };
}

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'the_newcomer',     name: 'The Newcomer',     description: 'Everyone starts here',                       icon: 'account',               unlockType: 'default' },
  { id: 'expense_tracker',  name: 'Expense Tracker',  description: 'Logged 10+ expenses',                        icon: 'receipt',               unlockType: 'stat',        statCondition: { field: 'totalExpensesCreated', threshold: 10 } },
  { id: 'debt_slayer',      name: 'Debt Slayer',      description: 'Made 5+ full settlements',                   icon: 'sword-cross',           unlockType: 'stat',        statCondition: { field: 'totalPaymentsMade', threshold: 5 } },
  { id: 'prompt_payer_t',   name: 'Prompt Payer',     description: 'Earned the Prompt Payer achievement',        icon: 'clock-fast',            unlockType: 'achievement', achievementId: 'prompt_payer' },
  { id: 'globetrotter_t',   name: 'Globetrotter',     description: 'Earned the Globetrotter achievement',        icon: 'earth',                 unlockType: 'achievement', achievementId: 'globetrotter' },
  { id: 'streak_legend',    name: 'Streak Legend',     description: 'Maintained a 30-day streak',                 icon: 'fire',                  unlockType: 'achievement', achievementId: 'streak_30' },
  { id: 'guild_master',     name: 'Guild Master',      description: 'Created a group with 5+ members',           icon: 'shield-crown',          unlockType: 'achievement', achievementId: 'squad_goals' },
  { id: 'expense_master',   name: 'Expense Master',   description: 'Reached Level 7',                            icon: 'star-shooting',         unlockType: 'level',       levelRequired: 7 },
  { id: 'legend',           name: 'Legend',            description: 'Reached Level 10',                           icon: 'crown',                 unlockType: 'level',       levelRequired: 10 },
];

/**
 * Get titles a user has unlocked based on level, achievements, and stats.
 */
export function getUnlockedTitles(
  level: number,
  earnedAchievementIds: string[],
  stats: { totalExpensesCreated: number; totalPaymentsMade: number }
): TitleDefinition[] {
  return TITLE_DEFINITIONS.filter((t) => {
    switch (t.unlockType) {
      case 'default': return true;
      case 'level': return level >= (t.levelRequired || 0);
      case 'achievement': return t.achievementId ? earnedAchievementIds.includes(t.achievementId) : false;
      case 'stat': {
        if (!t.statCondition) return false;
        const val = stats[t.statCondition.field as keyof typeof stats] || 0;
        return val >= t.statCondition.threshold;
      }
      default: return false;
    }
  });
}

/**
 * Equip a title for the current user.
 */
export const equipTitle = async (userId: string, titleId: string): Promise<void> => {
  if (!userId) return;
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    await setDoc(profileRef, { equippedTitle: titleId, updatedAt: serverTimestamp() }, { merge: true });
    console.log(`[Gamification] Equipped title "${titleId}" for ${userId}`);
  } catch (error) {
    console.warn('[Gamification] equipTitle error:', error);
  }
};

/**
 * Unequip title (set to null).
 */
export const unequipTitle = async (userId: string): Promise<void> => {
  if (!userId) return;
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    await setDoc(profileRef, { equippedTitle: null, updatedAt: serverTimestamp() }, { merge: true });
    console.log(`[Gamification] Unequipped title for ${userId}`);
  } catch (error) {
    console.warn('[Gamification] unequipTitle error:', error);
  }
};

// ---------------------------------------------------------------------------
// Companion Character
// ---------------------------------------------------------------------------

/**
 * Set the user's equipped companion character.
 */
export const equipCompanion = async (userId: string, characterId: string): Promise<void> => {
  if (!userId) return;
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    await setDoc(profileRef, { companionCharacter: characterId, updatedAt: serverTimestamp() }, { merge: true });
    console.log(`[Gamification] Equipped companion ${characterId} for ${userId}`);
  } catch (error) {
    console.warn('[Gamification] equipCompanion error:', error);
  }
};

// ---------------------------------------------------------------------------
// XP Multiplier Events
// ---------------------------------------------------------------------------

export interface XPMultiplierConfig {
  active: boolean;
  multiplier: number;
  label: string;
  startTime: { toDate?: () => Date } | null;
  endTime: { toDate?: () => Date } | null;
}

const DEFAULT_MULTIPLIER: XPMultiplierConfig = {
  active: false,
  multiplier: 1,
  label: '',
  startTime: null,
  endTime: null,
};

let _cachedMultiplier: XPMultiplierConfig = DEFAULT_MULTIPLIER;
let _multiplierLastFetched = 0;
const MULTIPLIER_CACHE_MS = 5 * 60 * 1000; // 5 min

/**
 * Fetch the current XP multiplier config from Firestore.
 * Caches for 5 minutes to avoid excessive reads.
 */
export const getXPMultiplier = async (): Promise<XPMultiplierConfig> => {
  const now = Date.now();
  if (now - _multiplierLastFetched < MULTIPLIER_CACHE_MS) {
    return _cachedMultiplier;
  }

  const db = getFirebaseDb();
  if (!db) return DEFAULT_MULTIPLIER;

  try {
    const snap = await getDoc(doc(db, 'gameConfig', 'xpMultiplier'));
    if (!snap.exists()) {
      _cachedMultiplier = DEFAULT_MULTIPLIER;
    } else {
      const data = snap.data();
      const endTime = data.endTime;
      const endDate = endTime?.toDate ? endTime.toDate() : endTime ? new Date(endTime) : null;

      // Auto-expire if endTime has passed
      const isActive = data.active && endDate && endDate.getTime() > now;

      _cachedMultiplier = {
        active: !!isActive,
        multiplier: isActive ? (data.multiplier || 1) : 1,
        label: data.label || '',
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      };
    }
    _multiplierLastFetched = now;
    return _cachedMultiplier;
  } catch (error) {
    console.warn('[Gamification] getXPMultiplier error:', error);
    return DEFAULT_MULTIPLIER;
  }
};

/**
 * Get the cached multiplier synchronously (for UI display).
 * Call getXPMultiplier() first to ensure cache is warm.
 */
export const getCachedXPMultiplier = (): XPMultiplierConfig => _cachedMultiplier;

interface AchievementContext {
  isFirstExpense?: boolean;
  isFirstFullSettlement?: boolean;
  isFirstGroup?: boolean;
  isFirstMultiCurrency?: boolean;
  memberCount?: number;
  expenseAmountBase?: number;
  streak?: number;
  totalXP?: number;
  paymentCreatedAt?: number;
  expenseCreatedAt?: number;
}

interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  paymentsSettledCount: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XP awarded per action. Keys match the `reason` field in xpLedger. */
export const XP_AWARDS: Record<string, number> = {
  expense_first: 50,
  expense_create: 10,
  settle_full: 25,
  settle_partial: 10,
  approve_expense: 5,
  add_member: 5,
  create_group_first: 50,
  multicurrency_first: 20,
  onboarding_complete: 30,
  streak_7_day: 50,
  // Sprint 1 — Expanded XP events
  expense_with_photo: 5,
  expense_with_location: 5,
  first_group_settle: 50,
  recurring_template_create: 15,
  invite_friend: 10,
  approve_expense_fast: 8,
  // Streak milestones
  streak_14_day: 75,
  streak_30_day: 150,
  streak_60_day: 300,
  streak_100_day: 500,
  // Daily quests
  daily_quest: 0, // Variable — actual XP set by quest definition (5/10/15)
  daily_quest_bonus: 20,
  // Comeback bonus — awarded when user returns after 5+ days away
  comeback_bonus: 25,
}

/**
 * Quest milestone XP targets (Duolingo-style progress checkpoints).
 * Progress bar fills from previous milestone to current.
 */
export const QUEST_MILESTONES: number[] = [20, 50, 100, 250, 500, 1000]

/**
 * Minimum XP required to reach each level (index 0 = Level 1).
 * Level 10 = 12 000+ XP.
 */
export const LEVEL_THRESHOLDS: number[] = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000]

/**
 * Local fallback achievement definitions.
 * These mirror the `achievementDefinitions` Firestore collection.
 * Seed with `seedAchievementDefinitions()` on first run.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Created your first expense',
    icon: 'shoe-print',
    category: 'expenses',
    xpReward: 0,
  },
  {
    id: 'settler',
    title: 'Settler',
    description: 'Made your first full payment settlement',
    icon: 'check-circle',
    category: 'payments',
    xpReward: 0,
  },
  {
    id: 'group_founder',
    title: 'Group Founder',
    description: 'Created your first group',
    icon: 'account-group',
    category: 'social',
    xpReward: 0,
  },
  {
    id: 'squad_goals',
    title: 'Squad Goals',
    description: 'Added 5 or more members to a group',
    icon: 'account-multiple-check',
    category: 'social',
    xpReward: 0,
  },
  {
    id: 'big_spender',
    title: 'Big Spender',
    description: 'Logged a single expense of $100 or more (base currency)',
    icon: 'cash-multiple',
    category: 'expenses',
    xpReward: 0,
  },
  {
    id: 'on_a_roll',
    title: 'On a Roll',
    description: 'Maintained a 7-day active streak',
    icon: 'fire',
    category: 'streaks',
    xpReward: 0,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Earned 100 XP total',
    icon: 'star-circle',
    category: 'milestones',
    xpReward: 0,
  },
  {
    id: 'globetrotter',
    title: 'Globetrotter',
    description: 'Logged your first multi-currency transaction',
    icon: 'earth',
    category: 'expenses',
    xpReward: 0,
  },
  {
    id: 'prompt_payer',
    title: 'Prompt Payer',
    description: 'Settled a payment within 24 hours of expense creation',
    icon: 'clock-fast',
    category: 'payments',
    xpReward: 0,
  },
  // Sprint 1 — Streak milestone achievements
  {
    id: 'streak_14',
    title: 'Two-Week Warrior',
    description: 'Maintained a 14-day active streak',
    icon: 'fire',
    category: 'streaks',
    xpReward: 0,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintained a 30-day active streak',
    icon: 'fire',
    category: 'streaks',
    xpReward: 0,
  },
  {
    id: 'streak_60',
    title: 'Dedicated',
    description: 'Maintained a 60-day active streak',
    icon: 'fire',
    category: 'streaks',
    xpReward: 0,
  },
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'Maintained a 100-day active streak',
    icon: 'fire',
    category: 'streaks',
    xpReward: 0,
  },
]

// ---------------------------------------------------------------------------
// Pure helpers (no Firestore)
// ---------------------------------------------------------------------------

/**
 * Derive level (1–10) from total XP.
 * @param {number} xp
 * @returns {number}
 */
export const calculateLevel = (xp: number): number => {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

/**
 * Get the current quest milestone (next target) and previous milestone.
 * Once the user exceeds the last milestone, both equal the last value.
 * @param {number} xp
 * @returns {{ currentMilestone: number, previousMilestone: number }}
 */
export const getQuestMilestones = (xp: number): { currentMilestone: number; previousMilestone: number } => {
  for (let i = 0; i < QUEST_MILESTONES.length; i++) {
    if (xp < QUEST_MILESTONES[i]) {
      return {
        currentMilestone: QUEST_MILESTONES[i],
        previousMilestone: i > 0 ? QUEST_MILESTONES[i - 1] : 0,
      }
    }
  }
  // Past all milestones
  const last = QUEST_MILESTONES[QUEST_MILESTONES.length - 1]
  return { currentMilestone: last, previousMilestone: last }
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/**
 * Award XP to a user with idempotency guard via reward idempotency docs.
 *
 * Safe to call fire-and-forget: `awardXP(...).catch(console.warn)`
 *
 * @param {string} userId
 * @param {number} xpDelta - Positive integer XP amount
 * @param {string} reason - Reason key from XP_AWARDS (e.g. 'expense_create')
 * @param {string} referenceId - Firestore doc ID used as idempotency key
 * @param {string} referenceType - 'payment' | 'expense' | 'group' | 'streak' | 'onboarding'
 * @param {string|null} [groupId]
 */
export const awardXP = async (
  userId: string,
  xpDelta: number,
  reason: string,
  referenceId: string,
  referenceType: string,
  groupId: string | null = null
): Promise<void> => {
  if (!userId) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    maybeResetRewardIdempotencyMode()

    // Apply XP multiplier if active
    const multiplierConfig = await getXPMultiplier()
    if (multiplierConfig.active && multiplierConfig.multiplier > 1) {
      xpDelta = Math.round(xpDelta * multiplierConfig.multiplier)
    }

    let newXp = 0
    let newLevel = 1
    let skipped = false

    const runLegacyAwardTxn = async () => {
      await runTransaction(db, async (txn) => {
        const profileRef = doc(db, 'userGameProfiles', userId)
        const profileSnap = await txn.get(profileRef)
        const existingKeys = profileSnap.exists() ? profileSnap.data().awardedKeys : undefined
        const { isDuplicate, updatedKeys } = checkAndUpdateAwardedKeys(existingKeys, referenceId, reason)

        if (isDuplicate) {
          console.log(`[Gamification] XP already awarded for ${referenceId}:${reason} — skipping`)
          skipped = true
          return
        }

        const currentXp = profileSnap.exists() ? (profileSnap.data().xp || 0) : 0
        newXp = currentXp + xpDelta
        newLevel = calculateLevel(newXp)

        if (!profileSnap.exists()) {
          txn.set(profileRef, {
            email: getCurrentUserEmail(),
            xp: newXp,
            level: newLevel,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            totalPaymentsMade: 0,
            totalExpensesCreated: 0,
            awardedKeys: updatedKeys,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          txn.update(profileRef, {
            xp: newXp,
            level: newLevel,
            awardedKeys: updatedKeys,
            updatedAt: serverTimestamp(),
          })
        }

        const ledgerRef = doc(collection(db, 'xpLedger'))
        txn.set(ledgerRef, {
          userId,
          xpDelta,
          reason,
          referenceId,
          referenceType,
          groupId,
          createdAt: serverTimestamp(),
        })
      })
    }

    const runRewardDocAwardTxn = async () => {
      await runTransaction(db, async (txn) => {
        const profileRef = doc(db, 'userGameProfiles', userId)
        const profileSnap = await txn.get(profileRef)
        const idempotencyDocId = buildRewardIdempotencyDocId(userId, referenceId, reason)
        const idempotencyRef = doc(db, 'rewardIdempotency', idempotencyDocId)
        const idempotencySnap = await txn.get(idempotencyRef)

        if (idempotencySnap.exists()) {
          console.log(`[Gamification] XP already awarded for ${referenceId}:${reason} — skipping`)
          skipped = true
          return
        }

        const currentXp = profileSnap.exists() ? (profileSnap.data().xp || 0) : 0
        newXp = currentXp + xpDelta
        newLevel = calculateLevel(newXp)

        if (!profileSnap.exists()) {
          txn.set(profileRef, {
            email: getCurrentUserEmail(),
            xp: newXp,
            level: newLevel,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            totalPaymentsMade: 0,
            totalExpensesCreated: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          txn.update(profileRef, { xp: newXp, level: newLevel, updatedAt: serverTimestamp() })
        }

        txn.set(idempotencyRef, {
          userId,
          referenceId,
          reason,
          createdAt: serverTimestamp(),
        })

        const ledgerRef = doc(collection(db, 'xpLedger'))
        txn.set(ledgerRef, {
          userId,
          xpDelta,
          reason,
          referenceId,
          referenceType,
          groupId,
          createdAt: serverTimestamp(),
        })
      })
    }

    if (shouldUseLegacyRewardIdempotency()) {
      await runLegacyAwardTxn()
    } else {
      try {
        await runRewardDocAwardTxn()
      } catch (error) {
        if (!isPermissionDeniedError(error)) throw error
        if (markRewardIdempotencyPermissionDenied()) {
          console.warn('[Gamification] rewardIdempotency unavailable; temporarily using legacy awardedKeys idempotency')
        }
        await runLegacyAwardTxn()
      }
    }

    if (skipped) return

    console.log(`[Gamification] +${xpDelta} XP → ${userId} (${reason}). Total: ${newXp}`)
    AppEvents.emit(APP_EVENTS.GAMIFICATION_XP_AWARDED, { userId, xpDelta, newXp, newLevel, reason })

  } catch (error) {
    console.warn('[Gamification] awardXP error:', error)
    throw error
  }
}

/**
 * Check achievement conditions and unlock any that now qualify.
 * Reads earned achievements from Firestore to avoid false duplicates.
 *
 * @param {string} userId
 * @param {object} context
 * @param {boolean} [context.isFirstExpense]
 * @param {boolean} [context.isFirstFullSettlement]
 * @param {boolean} [context.isFirstGroup]
 * @param {boolean} [context.isFirstMultiCurrency]
 * @param {number}  [context.memberCount]
 * @param {number}  [context.expenseAmountBase] - Amount in group base currency
 * @param {number}  [context.streak]
 * @param {number}  [context.totalXP] - XP AFTER the award (for century_club)
 * @param {number}  [context.paymentCreatedAt] - ms timestamp
 * @param {number}  [context.expenseCreatedAt] - ms timestamp
 */
export const checkAndAwardAchievements = async (userId: string, context: AchievementContext = {}): Promise<void> => {
  if (!userId) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    // Load already-earned achievement IDs (single read)
    const earnedSnap = await getDocs(
      query(collection(db, 'userAchievements'), where('userId', '==', userId))
    )
    const earnedIds = new Set(earnedSnap.docs.map(d => d.data().achievementId))

    const toAward = []

    if (!earnedIds.has('first_step') && context.isFirstExpense) toAward.push('first_step')
    if (!earnedIds.has('settler') && context.isFirstFullSettlement) toAward.push('settler')
    if (!earnedIds.has('group_founder') && context.isFirstGroup) toAward.push('group_founder')
    if (!earnedIds.has('squad_goals') && (context.memberCount || 0) >= 5) toAward.push('squad_goals')
    if (!earnedIds.has('big_spender') && (context.expenseAmountBase || 0) >= 100) toAward.push('big_spender')
    if (!earnedIds.has('on_a_roll') && (context.streak || 0) >= 7) toAward.push('on_a_roll')
    if (!earnedIds.has('streak_14') && (context.streak || 0) >= 14) toAward.push('streak_14')
    if (!earnedIds.has('streak_30') && (context.streak || 0) >= 30) toAward.push('streak_30')
    if (!earnedIds.has('streak_60') && (context.streak || 0) >= 60) toAward.push('streak_60')
    if (!earnedIds.has('streak_100') && (context.streak || 0) >= 100) toAward.push('streak_100')
    if (!earnedIds.has('century_club') && (context.totalXP || 0) >= 100) toAward.push('century_club')
    if (!earnedIds.has('globetrotter') && context.isFirstMultiCurrency) toAward.push('globetrotter')
    if (!earnedIds.has('prompt_payer') && context.paymentCreatedAt && context.expenseCreatedAt) {
      const diffMs = context.paymentCreatedAt - context.expenseCreatedAt
      if (diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000) toAward.push('prompt_payer')
    }

    for (const achievementId of toAward) {
      const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === achievementId)
      if (!def) continue

      await addDoc(collection(db, 'userAchievements'), {
        userId,
        achievementId,
        unlockedAt: serverTimestamp(),
        xpAwarded: def.xpReward || 0,
      })

      console.log(`[Gamification] Achievement unlocked: ${achievementId} for ${userId}`)
      AppEvents.emit(APP_EVENTS.GAMIFICATION_ACHIEVEMENT_UNLOCKED, { userId, achievement: def })
    }
  } catch (error) {
    console.warn('[Gamification] checkAndAwardAchievements error:', error)
  }
}

/**
 * Update the user's daily activity streak.
 * - Same day → no-op.
 * - Yesterday → streak++.
 * - Gap > 1 day → streak resets to 1.
 * - Streak reaches 7 → award 50 XP bonus + check on_a_roll achievement.
 *
 * @param {string} userId
 */
export const updateStreak = async (userId: string): Promise<void> => {
  if (!userId) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
    const profileRef = doc(db, 'userGameProfiles', userId)
    const profileSnap = await getDoc(profileRef)

    const profile = profileSnap.exists() ? profileSnap.data() : {}
    const lastActiveDate = profile.lastActiveDate || null
    const currentStreak = profile.streak || 0
    const longestStreak = profile.longestStreak || 0

    if (lastActiveDate === today) return // Already counted today

    let newStreak = 1
    if (lastActiveDate) {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        newStreak = currentStreak + 1
      } else if (diffDays === 2) {
        // Missed exactly 1 day — try to consume a streak freeze
        const froze = await consumeStreakFreeze(userId)
        if (froze) {
          newStreak = currentStreak + 1
          console.log(`[Gamification] Streak Shield consumed for ${userId} — streak preserved at ${newStreak}`)
        } else {
          newStreak = 1
        }
      } else {
        // Gap > 2 days — streak resets (freeze only covers 1 missed day)
        newStreak = 1
      }

      // Comeback bonus: award XP when returning after 5+ days away
      if (diffDays >= 5) {
        // Fire-and-forget — don't block streak update
        awardXP(userId, XP_AWARDS.comeback_bonus, 'comeback_bonus', `${userId}_comeback_${today}`, 'streak', null).catch(console.warn)
        console.log(`[Gamification] Comeback bonus awarded for ${userId} (${diffDays} days away)`)
      }
    }

    const update = {
      streak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastActiveDate: today,
      updatedAt: serverTimestamp(),
    }

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        email: getCurrentUserEmail(),
        xp: 0,
        level: 1,
        totalPaymentsMade: 0,
        totalExpensesCreated: 0,
        createdAt: serverTimestamp(),
        ...update,
      })
    } else {
      await setDoc(profileRef, update, { merge: true })
    }

    console.log(`[Gamification] Streak updated for ${userId}: ${newStreak} day(s)`)

    // Streak milestone rewards
    const STREAK_MILESTONES = [
      { days: 7,   xpKey: 'streak_7_day',   achievementId: 'on_a_roll', gold: 15 },
      { days: 14,  xpKey: 'streak_14_day',  achievementId: 'streak_14', gold: 25 },
      { days: 30,  xpKey: 'streak_30_day',  achievementId: 'streak_30', gold: 50 },
      { days: 60,  xpKey: 'streak_60_day',  achievementId: 'streak_60', gold: 100 },
      { days: 100, xpKey: 'streak_100_day', achievementId: 'streak_100', gold: 200 },
    ]

    for (const milestone of STREAK_MILESTONES) {
      if (newStreak === milestone.days) {
        await awardXP(userId, XP_AWARDS[milestone.xpKey], milestone.xpKey, `${userId}_streak${milestone.days}_${today}`, 'streak', null)
        setTimeout(() => awardGold(userId, milestone.gold, 'streak_milestone', `${userId}_streak${milestone.days}_${today}_gold`, 'streak').catch(console.warn), 1000)
        await checkAndAwardAchievements(userId, { streak: newStreak })
        // Award 1 free streak freeze at 7-day milestone
        if (milestone.days === 7) {
          setTimeout(() => awardStreakFreeze(userId).catch(console.warn), 1500)
        }
        break // Only one milestone per day
      }
    }
  } catch (error) {
    console.warn('[Gamification] updateStreak error:', error)
  }
}

/**
 * Fetch a group leaderboard ranked by number of payments settled in the group.
 *
 * @param {string} groupId
 * @param {string[]} memberIds
 * @returns {Promise<Array<{userId, xp, level, paymentsSettledCount, rank}>>}
 */
export const getGroupLeaderboard = async (groupId: string, memberIds: string[]): Promise<LeaderboardEntry[]> => {
  if (!groupId || !memberIds?.length) return []

  const db = getFirebaseDb()
  if (!db) return []

  try {
    // Count settled payments per member
    const paymentsSnap = await getDocs(
      query(
        collection(db, 'payments'),
        where('groupId', '==', groupId),
        where('status', 'in', ['CAPTURED', 'APPLIED'])
      )
    )

    const paymentCounts: Record<string, number> = {}
    paymentsSnap.docs.forEach(d => {
      const fromUserId = d.data().fromUserId as string | undefined
      if (fromUserId) {
        paymentCounts[fromUserId] = (paymentCounts[fromUserId] || 0) + 1
      }
    })

    // Fetch XP profiles in parallel
    const profileSnaps = await Promise.all(
      memberIds.map(uid => getDoc(doc(db, 'userGameProfiles', uid)).catch(() => null))
    )

    const entries = memberIds.map((uid, i) => {
      const profile = profileSnaps[i]?.exists() ? profileSnaps[i].data() : {}
      return {
        userId: uid,
        xp: profile.xp || 0,
        level: profile.level || 1,
        paymentsSettledCount: paymentCounts[uid] || 0,
      }
    })

    // Primary sort: payments settled; secondary: XP (tiebreaker)
    entries.sort((a, b) =>
      b.paymentsSettledCount - a.paymentsSettledCount || b.xp - a.xp
    )

    return entries.map((entry, i) => ({ ...entry, rank: i + 1 }))
  } catch (error) {
    console.warn('[Gamification] getGroupLeaderboard error:', error)
    return []
  }
}

/**
 * Fetch a weekly group leaderboard ranked by XP earned this week.
 * Queries xpLedger for entries within the current Monday–Sunday window.
 */
export const getWeeklyGroupLeaderboard = async (
  groupId: string,
  memberIds: string[]
): Promise<LeaderboardEntry[]> => {
  if (!groupId || !memberIds?.length) return []

  const db = getFirebaseDb()
  if (!db) return []

  try {
    // Compute Monday 00:00 of current week
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    // Query xpLedger for this week, filtered to group
    const ledgerSnap = await getDocs(
      query(
        collection(db, 'xpLedger'),
        where('groupId', '==', groupId),
        where('createdAt', '>=', monday)
      )
    )

    // Aggregate XP per user
    const xpByUser: Record<string, number> = {}
    memberIds.forEach(uid => { xpByUser[uid] = 0 })
    ledgerSnap.docs.forEach(d => {
      const data = d.data()
      if (data.userId && memberIds.includes(data.userId)) {
        xpByUser[data.userId] = (xpByUser[data.userId] || 0) + (data.xpDelta || 0)
      }
    })

    // Also include non-group XP (quests, streaks) — query without groupId filter
    const personalLedgerSnap = await getDocs(
      query(
        collection(db, 'xpLedger'),
        where('createdAt', '>=', monday),
        where('groupId', '==', null)
      )
    )
    personalLedgerSnap.docs.forEach(d => {
      const data = d.data()
      if (data.userId && memberIds.includes(data.userId)) {
        xpByUser[data.userId] = (xpByUser[data.userId] || 0) + (data.xpDelta || 0)
      }
    })

    const entries = memberIds.map(uid => ({
      userId: uid,
      xp: xpByUser[uid] || 0,
      level: 0, // Not needed for weekly view
      paymentsSettledCount: 0,
    }))

    entries.sort((a, b) => b.xp - a.xp)
    return entries.map((entry, i) => ({ ...entry, rank: i + 1 }))
  } catch (error) {
    console.warn('[Gamification] getWeeklyGroupLeaderboard error:', error)
    return []
  }
}

/**
 * Load achievement definitions from Firestore.
 * Falls back to the local ACHIEVEMENT_DEFINITIONS constant if the collection is empty or unreadable.
 * @returns {Promise<Array>}
 */
export const loadAchievementDefinitions = async (): Promise<AchievementDefinition[]> => {
  const db = getFirebaseDb()
  if (!db) return ACHIEVEMENT_DEFINITIONS

  try {
    const snap = await getDocs(collection(db, 'achievementDefinitions'))
    if (snap.empty) return ACHIEVEMENT_DEFINITIONS
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as AchievementDefinition[]
  } catch {
    return ACHIEVEMENT_DEFINITIONS
  }
}

/**
 * Seed achievement definitions into Firestore (run once; safe to re-run — uses setDoc).
 * Call this from a dev screen or emulator seed script.
 */
export const seedAchievementDefinitions = async (): Promise<void> => {
  const db = getFirebaseDb()
  if (!db) return

  try {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await setDoc(doc(db, 'achievementDefinitions', def.id), def)
    }
    console.log('[Gamification] Achievement definitions seeded')
  } catch (error) {
    console.warn('[Gamification] seedAchievementDefinitions error:', error)
  }
}

// ---------------------------------------------------------------------------
// Cosmetics service functions
// ---------------------------------------------------------------------------

/**
 * Check which cosmetics a user has unlocked based on level + achievements.
 */
export const getUnlockedCosmetics = (
  level: number,
  earnedAchievementIds: string[]
): CosmeticDefinition[] => {
  return COSMETIC_DEFINITIONS.filter((c) => {
    if (c.achievementId) return earnedAchievementIds.includes(c.achievementId)
    return level >= c.levelRequired
  })
}

/**
 * Equip a cosmetic for the current user. Validates ownership.
 */
export const equipCosmetic = async (
  userId: string,
  cosmeticId: string,
  slot: 'border' | 'avatar_frame'
): Promise<void> => {
  if (!userId) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    const profileRef = doc(db, 'userGameProfiles', userId)
    const profileSnap = await getDoc(profileRef)

    const currentEquipped: EquippedCosmetics = profileSnap.exists()
      ? (profileSnap.data().equippedCosmetics || { border: null, avatar_frame: null })
      : { border: null, avatar_frame: null }

    currentEquipped[slot] = cosmeticId

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        email: getCurrentUserEmail(),
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalPaymentsMade: 0,
        totalExpensesCreated: 0,
        equippedCosmetics: currentEquipped,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      await updateDoc(profileRef, {
        equippedCosmetics: currentEquipped,
        updatedAt: serverTimestamp(),
      })
    }

    console.log(`[Gamification] Equipped ${cosmeticId} in ${slot} for ${userId}`)
  } catch (error) {
    console.warn('[Gamification] equipCosmetic error:', error)
  }
}

/**
 * Unequip a cosmetic slot (set to null).
 */
export const unequipCosmetic = async (
  userId: string,
  slot: 'border' | 'avatar_frame'
): Promise<void> => {
  if (!userId) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    const profileRef = doc(db, 'userGameProfiles', userId)
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) return

    const currentEquipped: EquippedCosmetics = profileSnap.data().equippedCosmetics || { border: null, avatar_frame: null }
    currentEquipped[slot] = null

    await updateDoc(profileRef, {
      equippedCosmetics: currentEquipped,
      updatedAt: serverTimestamp(),
    })

    console.log(`[Gamification] Unequipped ${slot} for ${userId}`)
  } catch (error) {
    console.warn('[Gamification] unequipCosmetic error:', error)
  }
}

// ---------------------------------------------------------------------------
// Batch-fetch helpers — for displaying other users' cosmetics
// ---------------------------------------------------------------------------

/**
 * Fetch game profiles for a list of user IDs (e.g. contacts list).
 * Returns a Map<userId, { level, equippedCosmetics }>.
 */
export const batchGetGameProfiles = async (
  userIds: string[]
): Promise<Map<string, { level: number; equippedCosmetics: EquippedCosmetics }>> => {
  const result = new Map<string, { level: number; equippedCosmetics: EquippedCosmetics }>();
  if (userIds.length === 0) return result;

  const db = getFirebaseDb();
  if (!db) return result;

  const settled = await Promise.allSettled(
    userIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'userGameProfiles', uid));
      if (snap.exists()) {
        const data = snap.data();
        return [uid, {
          level: (data.level as number) || 1,
          equippedCosmetics: (data.equippedCosmetics as EquippedCosmetics) || { border: null, avatar_frame: null },
        }] as const;
      }
      return [uid, { level: 1, equippedCosmetics: { border: null, avatar_frame: null } }] as const;
    })
  );

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const [uid, profile] = r.value;
      result.set(uid, profile);
    }
  }
  return result;
};

/**
 * Batch-fetch showLevel privacy setting for a list of user IDs.
 * Returns Map<userId, boolean>. Default = true (show level).
 */
export const batchGetShowLevelSettings = async (
  userIds: string[]
): Promise<Map<string, boolean>> => {
  const result = new Map<string, boolean>();
  if (userIds.length === 0) return result;

  const db = getFirebaseDb();
  if (!db) return result;

  const settled = await Promise.allSettled(
    userIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const privacy = snap.data()?.privacySettings;
        return [uid, privacy?.showLevel !== false] as const;
      }
      return [uid, true] as const;
    })
  );

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const [uid, show] = r.value;
      result.set(uid, show);
    }
  }
  return result;
};
