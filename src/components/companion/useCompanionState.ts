/**
 * useCompanionState — derives companion mood and characterId from GamificationContext.
 *
 * Priority:
 * 1. pendingLevelUp || pendingAchievement || pendingXPToast → 'excited'
 * 2. expedition active → 'adventuring' (future)
 * 3. 3+ days since lastActiveDate → 'sleepy'
 * 4. default → 'idle'
 */

import { useMemo } from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import type { CharacterId, CompanionMood } from './types';

function daysSinceDate(dateValue: any): number {
  if (!dateValue) return 999; // No date → treat as very old
  try {
    const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export interface CompanionState {
  mood: CompanionMood;
  characterId: CharacterId;
}

export function useCompanionState(): CompanionState {
  const ctx = useGamification();

  const mood: CompanionMood = useMemo(() => {
    // Manual override: use companionMood from context if set
    if (ctx.companionMood) return ctx.companionMood;

    // 1. Excited: any pending gamification toast/modal
    if (ctx.pendingLevelUp || ctx.pendingAchievement || ctx.pendingXPToast) {
      return 'excited';
    }

    // 2. Adventuring: expedition active and not yet collected
    if (ctx.expedition?.active && !ctx.expedition?.resolved) return 'adventuring';

    // 3. Sleepy: no activity for 3+ days
    // gameProfile may have lastActiveDate as a Firestore Timestamp or ISO string
    const lastActive = (ctx as any).gameProfile?.lastActiveDate;
    if (lastActive && daysSinceDate(lastActive) >= 3) {
      return 'sleepy';
    }

    // 4. Default
    return 'idle';
  }, [ctx.companionMood, ctx.pendingLevelUp, ctx.pendingAchievement, ctx.pendingXPToast, ctx.expedition]);

  const characterId: CharacterId = (ctx as any).companionCharacter || 'KingMont';

  return { mood, characterId };
}
