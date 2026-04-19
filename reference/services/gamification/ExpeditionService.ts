/**
 * ExpeditionService.ts — Gold currency, expeditions, and shop.
 *
 * Design principles (same as GamificationService):
 * - Fire-and-forget: async + try/catch. Callers `.catch(console.warn)`.
 * - Idempotent: reward idempotency docs guard duplicate awards via referenceId.
 * - Anonymous-safe: early return if userId is falsy.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../config/firebaseConfig';
import { AppEvents, APP_EVENTS } from '../../utils/appEvents';
import {
  buildRewardIdempotencyDocId,
  checkAndUpdateAwardedKeys,
  isPermissionDeniedError,
  markRewardIdempotencyPermissionDenied,
  maybeResetRewardIdempotencyMode,
  shouldUseLegacyRewardIdempotency,
} from './awardKeyHelpers';
import type {
  ExpeditionTypeId,
  ExpeditionDefinition,
  ActiveExpedition,
  ExpeditionLoot,
  ShopItemDefinition,
  ShopCategory,
  PurchaseResult,
} from './ExpeditionTypes';

// ---------------------------------------------------------------------------
// Expedition Definitions
// ---------------------------------------------------------------------------

export const EXPEDITION_DEFINITIONS: ExpeditionDefinition[] = [
  {
    id: 'quick_errand',
    name: 'Quick Errand',
    description: 'A short trip to the nearby village',
    icon: 'run-fast',
    durationMinutes: 30,
    goldRange: { min: 5, max: 8 },
    levelRequired: 1,
  },
  {
    id: 'village_patrol',
    name: 'Village Patrol',
    description: 'Patrol the surrounding countryside',
    icon: 'shield-search',
    durationMinutes: 60,
    goldRange: { min: 15, max: 25 },
    levelRequired: 1,
  },
  {
    id: 'forest_hunt',
    name: 'Forest Hunt',
    description: 'Venture into the dark forest',
    icon: 'pine-tree',
    durationMinutes: 120,
    goldRange: { min: 30, max: 50 },
    levelRequired: 3,
  },
  {
    id: 'mountain_climb',
    name: 'Mountain Climb',
    description: 'Scale the treacherous peaks',
    icon: 'image-filter-hdr',
    durationMinutes: 360,
    goldRange: { min: 55, max: 85 },
    levelRequired: 5,
  },
  {
    id: 'dragon_lair',
    name: "Dragon's Lair",
    description: 'Challenge the dragon in its den',
    icon: 'fire',
    durationMinutes: 720,
    goldRange: { min: 110, max: 170 },
    levelRequired: 7,
  },
];

// ---------------------------------------------------------------------------
// Shop Item Definitions
// ---------------------------------------------------------------------------

export const SHOP_ITEMS: ShopItemDefinition[] = [
  // Hats
  { id: 'hat_knight_helm', name: 'Knight Helm', description: 'A trusty knight helmet', category: 'hats', icon: 'hard-hat', price: 50, levelRequired: 1 },
  { id: 'hat_wizard', name: 'Wizard Hat', description: 'Pointy and magical', category: 'hats', icon: 'wizard-hat', price: 80, levelRequired: 3 },
  { id: 'hat_crown', name: 'Royal Crown', description: 'A crown fit for royalty', category: 'hats', icon: 'crown', price: 200, levelRequired: 5 },
  // Capes
  { id: 'cape_red', name: 'Red Cape', description: 'A bold crimson cloak', category: 'capes', icon: 'coat-rack', price: 60, levelRequired: 1 },
  { id: 'cape_shadow', name: 'Shadow Cloak', description: 'Shrouded in darkness', category: 'capes', icon: 'ghost', price: 120, levelRequired: 4 },
  // Weapons
  { id: 'weapon_sword', name: 'Iron Sword', description: 'A simple but reliable blade', category: 'weapons', icon: 'sword', price: 75, levelRequired: 2 },
  { id: 'weapon_staff', name: 'Crystal Staff', description: 'Channels arcane energy', category: 'weapons', icon: 'magic-staff', price: 150, levelRequired: 5 },
  // Effects
  { id: 'effect_sparkle', name: 'Sparkle Trail', description: 'Leaves a trail of sparkles', category: 'effects', icon: 'shimmer', price: 100, levelRequired: 3 },
  { id: 'effect_fire_aura', name: 'Fire Aura', description: 'A blazing aura surrounds your companion', category: 'effects', icon: 'fire-circle', price: 250, levelRequired: 7 },
  // Consumables
  { id: 'streak_shield', name: 'Streak Shield', description: 'Protects your streak for one missed day (max 2)', category: 'consumables', icon: 'shield-check', price: 15, levelRequired: 1 },
];

// ---------------------------------------------------------------------------
// Gold Functions
// ---------------------------------------------------------------------------

/**
 * Award gold to a user with idempotency guard via reward idempotency docs.
 * Atomic transaction: idempotency check + increment gold + write ledger entry.
 */
export async function awardGold(
  userId: string,
  goldDelta: number,
  reason: string,
  referenceId: string,
  referenceType: string,
  silent: boolean = false,
): Promise<void> {
  if (!userId || goldDelta <= 0) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    maybeResetRewardIdempotencyMode();

    let newGold = 0;
    let skipped = false;

    const runLegacyAwardTxn = async () => {
      await runTransaction(db, async (txn) => {
        const profileRef = doc(db, 'userGameProfiles', userId);
        const profileSnap = await txn.get(profileRef);
        const existingKeys = profileSnap.exists() ? profileSnap.data().awardedKeys : undefined;
        const { isDuplicate, updatedKeys } = checkAndUpdateAwardedKeys(existingKeys, referenceId, reason);

        if (isDuplicate) {
          console.log(`[Expedition] Gold already awarded for ${referenceId}:${reason} — skipping`);
          skipped = true;
          return;
        }

        const currentGold = profileSnap.exists() ? (profileSnap.data().gold || 0) : 0;
        newGold = currentGold + goldDelta;

        if (!profileSnap.exists()) {
          txn.set(profileRef, {
            xp: 0,
            level: 1,
            gold: newGold,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            totalPaymentsMade: 0,
            totalExpensesCreated: 0,
            awardedKeys: updatedKeys,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          txn.update(profileRef, {
            gold: newGold,
            awardedKeys: updatedKeys,
            updatedAt: serverTimestamp(),
          });
        }

        const ledgerRef = doc(collection(db, 'goldLedger'));
        txn.set(ledgerRef, {
          userId,
          goldDelta,
          reason,
          referenceId,
          referenceType,
          createdAt: serverTimestamp(),
        });
      });
    };

    const runRewardDocAwardTxn = async () => {
      await runTransaction(db, async (txn) => {
        const profileRef = doc(db, 'userGameProfiles', userId);
        const profileSnap = await txn.get(profileRef);
        const idempotencyDocId = buildRewardIdempotencyDocId(userId, referenceId, reason);
        const idempotencyRef = doc(db, 'rewardIdempotency', idempotencyDocId);
        const idempotencySnap = await txn.get(idempotencyRef);

        if (idempotencySnap.exists()) {
          console.log(`[Expedition] Gold already awarded for ${referenceId}:${reason} — skipping`);
          skipped = true;
          return;
        }

        const currentGold = profileSnap.exists() ? (profileSnap.data().gold || 0) : 0;
        newGold = currentGold + goldDelta;

        if (!profileSnap.exists()) {
          txn.set(profileRef, {
            xp: 0,
            level: 1,
            gold: newGold,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            totalPaymentsMade: 0,
            totalExpensesCreated: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          txn.update(profileRef, { gold: newGold, updatedAt: serverTimestamp() });
        }

        txn.set(idempotencyRef, {
          userId,
          referenceId,
          reason,
          createdAt: serverTimestamp(),
        });

        const ledgerRef = doc(collection(db, 'goldLedger'));
        txn.set(ledgerRef, {
          userId,
          goldDelta,
          reason,
          referenceId,
          referenceType,
          createdAt: serverTimestamp(),
        });
      });
    };

    if (shouldUseLegacyRewardIdempotency()) {
      await runLegacyAwardTxn();
    } else {
      try {
        await runRewardDocAwardTxn();
      } catch (error) {
        if (!isPermissionDeniedError(error)) throw error;
        if (markRewardIdempotencyPermissionDenied()) {
          console.warn('[Expedition] rewardIdempotency unavailable; temporarily using legacy awardedKeys idempotency');
        }
        await runLegacyAwardTxn();
      }
    }

    if (skipped) return;

    console.log(`[Expedition] +${goldDelta} Gold → ${userId} (${reason}). Total: ${newGold}`);
    if (!silent) {
      AppEvents.emit(APP_EVENTS.GAMIFICATION_GOLD_AWARDED, { userId, goldDelta, newGold, reason });
    }
  } catch (error) {
    console.warn('[Expedition] awardGold error:', error);
    throw error;
  }
}

/**
 * Deduct gold from a user (for purchases). Returns false if insufficient.
 * Atomic transaction: decrement gold + write negative ledger entry.
 */
export async function deductGold(
  userId: string,
  goldAmount: number,
  reason: string,
  referenceId: string,
  referenceType: string,
): Promise<boolean> {
  if (!userId || goldAmount <= 0) return false;

  const db = getFirebaseDb();
  if (!db) return false;

  try {
    let success = false;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);

      const currentGold = profileSnap.exists() ? (profileSnap.data().gold || 0) : 0;
      if (currentGold < goldAmount) {
        success = false;
        return;
      }

      const newGold = currentGold - goldAmount;
      txn.update(profileRef, { gold: newGold, updatedAt: serverTimestamp() });

      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: -goldAmount,
        reason,
        referenceId,
        referenceType,
        createdAt: serverTimestamp(),
      });

      success = true;
    });

    if (success) {
      console.log(`[Expedition] -${goldAmount} Gold ← ${userId} (${reason})`);
    }
    return success;
  } catch (error) {
    console.warn('[Expedition] deductGold error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Streak Freeze Functions
// ---------------------------------------------------------------------------

const MAX_STREAK_FREEZES = 2;

/**
 * Purchase a streak freeze using gold. Max 2 owned at a time.
 * Returns { success, error?, newCount? }.
 */
export async function purchaseStreakFreeze(
  userId: string,
): Promise<{ success: boolean; error?: string; newCount?: number }> {
  if (!userId) return { success: false, error: 'not_authenticated' };

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'no_db' };

  const PRICE = 15;

  try {
    let result: { success: boolean; error?: string; newCount?: number; goldSpent?: number; newGold?: number } = {
      success: false,
    };

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) { result = { success: false, error: 'no_profile' }; return; }

      const data = profileSnap.data();
      const currentGold = data.gold || 0;
      const currentFreezes = data.streakFreezes || 0;

      if (currentFreezes >= MAX_STREAK_FREEZES) {
        result = { success: false, error: 'max_reached' };
        return;
      }
      if (currentGold < PRICE) {
        result = { success: false, error: 'insufficient_gold' };
        return;
      }

      const newGold = currentGold - PRICE;
      const newFreezes = currentFreezes + 1;

      txn.update(profileRef, {
        gold: newGold,
        streakFreezes: newFreezes,
        updatedAt: serverTimestamp(),
      });

      // Write negative gold ledger entry
      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: -PRICE,
        reason: 'streak_freeze_purchase',
        referenceId: `${userId}_freeze_${Date.now()}`,
        referenceType: 'shop',
        createdAt: serverTimestamp(),
      });

      result = {
        success: true,
        newCount: newFreezes,
        goldSpent: PRICE,
        newGold,
      };
    });

    if (result.success && result.goldSpent != null && result.newGold != null) {
      console.log(`[Expedition] Streak Shield purchased for ${userId}. Count: ${result.newCount}`);
      AppEvents.emit(APP_EVENTS.SHOP_ITEM_PURCHASED, {
        userId,
        itemId: 'streak_shield',
        goldSpent: result.goldSpent,
        newGold: result.newGold,
      });
    }
    return result;
  } catch (error) {
    console.warn('[Expedition] purchaseStreakFreeze error:', error);
    return { success: false, error: 'unknown' };
  }
}

/**
 * Consume one streak freeze. Called by updateStreak when a gap > 1 day is detected.
 * Returns true if a freeze was consumed (streak preserved), false if none available.
 */
export async function consumeStreakFreeze(userId: string): Promise<boolean> {
  if (!userId) return false;

  const db = getFirebaseDb();
  if (!db) return false;

  try {
    let consumed = false;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) return;

      const currentFreezes = profileSnap.data().streakFreezes || 0;
      if (currentFreezes <= 0) return;

      txn.update(profileRef, {
        streakFreezes: currentFreezes - 1,
        updatedAt: serverTimestamp(),
      });

      consumed = true;
    });

    if (consumed) {
      console.log(`[Expedition] Streak Shield consumed for ${userId}`);
    }
    return consumed;
  } catch (error) {
    console.warn('[Expedition] consumeStreakFreeze error:', error);
    return false;
  }
}

/**
 * Award a free streak freeze (e.g. at 7-day streak milestone). Respects max cap.
 */
export async function awardStreakFreeze(userId: string): Promise<void> {
  if (!userId) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) return;

    const currentFreezes = profileSnap.data().streakFreezes || 0;
    if (currentFreezes >= MAX_STREAK_FREEZES) {
      console.log(`[Expedition] Streak freeze cap reached for ${userId} — skipping award`);
      return;
    }

    await updateDoc(profileRef, {
      streakFreezes: currentFreezes + 1,
      updatedAt: serverTimestamp(),
    });

    console.log(`[Expedition] Free Streak Shield awarded to ${userId}. Count: ${currentFreezes + 1}`);
  } catch (error) {
    console.warn('[Expedition] awardStreakFreeze error:', error);
  }
}

// ---------------------------------------------------------------------------
// Expedition Functions
// ---------------------------------------------------------------------------

/**
 * Send companion on an expedition.
 */
export async function startExpedition(
  userId: string,
  expeditionType: ExpeditionTypeId,
  userLevel: number,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'not_authenticated' };

  const def = EXPEDITION_DEFINITIONS.find((d) => d.id === expeditionType);
  if (!def) return { success: false, error: 'invalid_type' };
  if (userLevel < def.levelRequired) return { success: false, error: 'level_too_low' };

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'no_db' };

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    const profileSnap = await getDoc(profileRef);
    const data = profileSnap.data();

    if (data?.expedition?.active && !data.expedition.resolved) {
      return { success: false, error: 'expedition_active' };
    }

    const now = Timestamp.now();
    const returnsAt = Timestamp.fromMillis(now.toMillis() + def.durationMinutes * 60 * 1000);

    await updateDoc(profileRef, {
      expedition: {
        active: true,
        expeditionType,
        startedAt: serverTimestamp(),
        returnsAt,
        resolved: false,
      },
      updatedAt: serverTimestamp(),
    });

    console.log(`[Expedition] ${userId} sent on ${expeditionType}, returns in ${def.durationMinutes}m`);
    AppEvents.emit(APP_EVENTS.EXPEDITION_STARTED, { userId, expeditionType, returnsAt });
    return { success: true };
  } catch (error) {
    console.warn('[Expedition] startExpedition error:', error);
    return { success: false, error: 'unknown' };
  }
}

/**
 * Generate randomized loot for an expedition type. Pure function.
 */
export function generateLoot(expeditionType: ExpeditionTypeId): ExpeditionLoot {
  const def = EXPEDITION_DEFINITIONS.find((d) => d.id === expeditionType);
  if (!def) return { gold: 0 };

  const gold = Math.floor(Math.random() * (def.goldRange.max - def.goldRange.min + 1)) + def.goldRange.min;
  return { gold };
}

/**
 * Check if an expedition timer has completed. Client-side helper.
 */
export function isExpeditionComplete(expedition: ActiveExpedition | null): boolean {
  if (!expedition || !expedition.active) return false;
  try {
    const returnsAt = expedition.returnsAt?.toDate
      ? expedition.returnsAt.toDate()
      : new Date(expedition.returnsAt);
    return Date.now() >= returnsAt.getTime();
  } catch {
    return false;
  }
}

/**
 * Resolve a completed expedition. Awards gold + XP, marks resolved.
 */
export async function resolveExpedition(userId: string): Promise<ExpeditionLoot | null> {
  if (!userId) return null;

  const db = getFirebaseDb();
  if (!db) return null;

  try {
    let loot: ExpeditionLoot | null = null;
    let expeditionType: string | null = null;
    let startMillis: number = Date.now();

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) return;

      const data = profileSnap.data();
      const expedition = data.expedition as ActiveExpedition | null;

      if (!expedition?.active || expedition.resolved) return;

      // Check timer has elapsed
      const returnsAt = expedition.returnsAt?.toDate
        ? expedition.returnsAt.toDate()
        : new Date(expedition.returnsAt);
      if (Date.now() < returnsAt.getTime()) return;

      // Capture expedition info for post-transaction use
      expeditionType = expedition.expeditionType;
      startMillis = expedition.startedAt?.toMillis?.() || Date.now();

      // Generate loot
      loot = generateLoot(expedition.expeditionType);

      // Award gold atomically on profile + mark resolved
      const currentGold = data.gold || 0;
      const newGold = currentGold + loot.gold;

      txn.update(profileRef, {
        gold: newGold,
        'expedition.resolved': true,
        updatedAt: serverTimestamp(),
      });
    });

    const resolvedLoot = loot as ExpeditionLoot | null;
    if (resolvedLoot) {
      console.log(`[Expedition] ${userId} resolved expedition: +${resolvedLoot.gold} Gold`);

      // Write gold ledger entry outside transaction (audit log, not balance-critical)
      addDoc(collection(db, 'goldLedger'), {
        userId,
        goldDelta: resolvedLoot.gold,
        reason: 'expedition_loot',
        referenceId: `expedition_${expeditionType}_${startMillis}`,
        referenceType: 'expedition',
        createdAt: serverTimestamp(),
      }).catch(console.warn);

      const profileSnap = await getDoc(doc(db, 'userGameProfiles', userId));
      AppEvents.emit(APP_EVENTS.EXPEDITION_RESOLVED, { userId, loot: resolvedLoot });
      AppEvents.emit(APP_EVENTS.GAMIFICATION_GOLD_AWARDED, {
        userId,
        goldDelta: resolvedLoot.gold,
        newGold: (profileSnap.data()?.gold || 0),
        reason: 'expedition_loot',
      });
    }

    return resolvedLoot;
  } catch (error) {
    console.warn('[Expedition] resolveExpedition error:', error);
    return null;
  }
}

/**
 * Clear a resolved expedition from the profile so a new one can start.
 */
export async function clearExpedition(userId: string): Promise<void> {
  if (!userId) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    await updateDoc(profileRef, { expedition: null, updatedAt: serverTimestamp() });
  } catch (error) {
    console.warn('[Expedition] clearExpedition error:', error);
  }
}

// ---------------------------------------------------------------------------
// Shop Functions
// ---------------------------------------------------------------------------

/**
 * Purchase a shop item. Validates ownership, gold, and level.
 */
export async function purchaseShopItem(
  userId: string,
  itemId: string,
  userLevel: number,
  currentGold: number,
  ownedItems: string[],
): Promise<PurchaseResult> {
  if (!userId) return { success: false, error: 'insufficient_gold' };

  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { success: false, error: 'insufficient_gold' };
  if (ownedItems.includes(itemId)) return { success: false, error: 'already_owned' };
  if (userLevel < item.levelRequired) return { success: false, error: 'level_too_low' };
  if (currentGold < item.price) return { success: false, error: 'insufficient_gold' };

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'insufficient_gold' };

  try {
    let newGoldBalance = 0;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) throw new Error('no_profile');

      const data = profileSnap.data();
      const gold = data.gold || 0;
      if (gold < item.price) throw new Error('insufficient_gold');

      const owned = data.ownedShopItems || [];
      if (owned.includes(itemId)) throw new Error('already_owned');

      newGoldBalance = gold - item.price;

      txn.update(profileRef, {
        gold: newGoldBalance,
        ownedShopItems: arrayUnion(itemId),
        updatedAt: serverTimestamp(),
      });

      // Write gold ledger entry
      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: -item.price,
        reason: 'shop_purchase',
        referenceId: `shop_${itemId}_${Date.now()}`,
        referenceType: 'shop',
        createdAt: serverTimestamp(),
      });
    });

    console.log(`[Expedition] ${userId} purchased ${itemId} for ${item.price} Gold`);
    AppEvents.emit(APP_EVENTS.SHOP_ITEM_PURCHASED, {
      userId,
      itemId,
      goldSpent: item.price,
      newGold: newGoldBalance,
    });

    return { success: true, newGoldBalance };
  } catch (error: any) {
    console.warn('[Expedition] purchaseShopItem error:', error);
    if (error.message === 'already_owned') return { success: false, error: 'already_owned' };
    if (error.message === 'level_too_low') return { success: false, error: 'level_too_low' };
    return { success: false, error: 'insufficient_gold' };
  }
}
