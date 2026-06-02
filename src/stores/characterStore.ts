// ─── Character Store ──────────────────────────────────────────────
// Persistent character state for the sci-fi RPG.
// Replaces the run-centric playerStore with a persistent-world paradigm.
// Tracks level, XP, unlocked specializations, inventory, and corp ranks.

import { create } from 'zustand';
import type { CorporationId, TechTier } from '@/content/types/corporation';
import type { ClassId } from '@/content/types';

// ─── XP Curve ──────────────────────────────────────────────────────

/** XP required for each level. Level 1 = 0 XP. */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.8) - 100);
}

/** Tier band based on level (maps to spawn tiers). */
export function tierForLevel(level: number): number {
  if (level < 10) return 1;
  if (level < 25) return 2;
  if (level < 50) return 3;
  if (level < 75) return 4;
  if (level < 100) return 5;
  if (level < 130) return 6;
  if (level < 160) return 7;
  if (level < 190) return 8;
  if (level < 220) return 9;
  return 10;
}

// ─── Currencies ────────────────────────────────────────────────────

export interface CharacterCurrencies {
  /** Standard credits for purchases. */
  credits: number;
  /** Premium currency for specialization unlocks (like Orna's Orns). */
  techPoints: number;
  /** Crafting materials from dismantling. */
  scrap: number;
  /** Rare components for high-tier crafting. */
  quantumCores: number;
}

// ─── State Shape ───────────────────────────────────────────────────

export interface CharacterStoreState {
  // ── Identity ──
  uid: string | null;
  characterName: string;
  level: number;
  xp: number;
  tier: number;

  // ── Specializations ──
  /** Currently active specialization. */
  activeSpecId: ClassId | null;
  /** All permanently unlocked specialization IDs. */
  unlockedSpecIds: ClassId[];
  /** Corp mastery ranks (0-10 per corp). */
  corpRanks: Record<CorporationId, number>;

  // ── Economy ──
  currencies: CharacterCurrencies;

  // ── Equipment ──
  equippedWeaponId: string | null;
  equippedArmorId: string | null;
  equippedAccessoryIds: string[];

  // ── Inventory ──
  inventoryIds: string[];

  // ── Stats (computed) ──
  maxHp: number;
  currentHp: number;

  // ── Actions ──
  /** Gain XP and handle level-ups. */
  addXp: (amount: number) => void;
  /** Spend tech points to unlock a specialization. */
  unlockSpecialization: (specId: ClassId, cost: number) => boolean;
  /** Switch active specialization. */
  setActiveSpec: (specId: ClassId) => void;
  /** Add credits. */
  addCredits: (amount: number) => void;
  /** Add tech points. */
  addTechPoints: (amount: number) => void;
  /** Equip an item by ID. */
  equipItem: (itemId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  /** Unequip an item. */
  unequipItem: (slot: 'weapon' | 'armor' | 'accessory') => void;
  /** Set character identity. */
  setIdentity: (uid: string, name: string) => void;
  /** Heal to full (resting, checkpoint). */
  fullHeal: () => void;
  /** Take damage. */
  takeDamage: (amount: number) => void;
}

// ─── Store ─────────────────────────────────────────────────────────

export const useCharacterStore = create<CharacterStoreState>()((set, get) => ({
  uid: null,
  characterName: 'Runner',
  level: 1,
  xp: 0,
  tier: 1,
  activeSpecId: null,
  unlockedSpecIds: [],
  corpRanks: {},
  currencies: {
    credits: 100,
    techPoints: 50,
    scrap: 0,
    quantumCores: 0,
  },
  equippedWeaponId: null,
  equippedArmorId: null,
  equippedAccessoryIds: [],
  inventoryIds: [],
  maxHp: 100,
  currentHp: 100,

  // ── XP & Leveling ──
  addXp: (amount: number) => {
    const state = get();
    let { xp, level } = state;
    xp += amount;

    // Check for level-ups
    let leveled = false;
    while (xp >= xpForLevel(level + 1)) {
      level += 1;
      leveled = true;
    }

    const tier = tierForLevel(level);
    const maxHp = 100 + (level - 1) * 20 + tier * 30;

    set({
      xp,
      level,
      tier,
      maxHp,
      currentHp: leveled ? maxHp : state.currentHp, // Full heal on level-up
    });
  },

  // ── Specializations ──
  unlockSpecialization: (specId: ClassId, cost: number): boolean => {
    const state = get();
    if (state.currencies.techPoints < cost) return false;
    if (state.unlockedSpecIds.includes(specId)) return false;

    set({
      unlockedSpecIds: [...state.unlockedSpecIds, specId],
      currencies: {
        ...state.currencies,
        techPoints: state.currencies.techPoints - cost,
      },
    });
    return true;
  },

  setActiveSpec: (specId: ClassId) => {
    const state = get();
    if (!state.unlockedSpecIds.includes(specId)) return;
    set({ activeSpecId: specId });
  },

  // ── Economy ──
  addCredits: (amount: number) => {
    set((s) => ({
      currencies: { ...s.currencies, credits: s.currencies.credits + amount },
    }));
  },

  addTechPoints: (amount: number) => {
    set((s) => ({
      currencies: { ...s.currencies, techPoints: s.currencies.techPoints + amount },
    }));
  },

  // ── Equipment ──
  equipItem: (itemId: string, slot: 'weapon' | 'armor' | 'accessory') => {
    set((s) => {
      if (slot === 'weapon') return { equippedWeaponId: itemId };
      if (slot === 'armor') return { equippedArmorId: itemId };
      return {
        equippedAccessoryIds: [...s.equippedAccessoryIds, itemId].slice(0, 2),
      };
    });
  },

  unequipItem: (slot: 'weapon' | 'armor' | 'accessory') => {
    set((s) => {
      if (slot === 'weapon') return { equippedWeaponId: null };
      if (slot === 'armor') return { equippedArmorId: null };
      return { equippedAccessoryIds: s.equippedAccessoryIds.slice(0, -1) };
    });
  },

  // ── Identity ──
  setIdentity: (uid: string, name: string) => {
    set({ uid, characterName: name });
  },

  // ── Health ──
  fullHeal: () => {
    set((s) => ({ currentHp: s.maxHp }));
  },

  takeDamage: (amount: number) => {
    set((s) => ({
      currentHp: Math.max(0, s.currentHp - amount),
    }));
  },
}));
