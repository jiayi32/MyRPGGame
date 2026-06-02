// ─── Quest Store ──────────────────────────────────────────────────
// Zustand store for tracking daily and weekly quest progress.
// Quests refresh daily at midnight UTC.

import { create } from 'zustand';
import type { DailyQuest, WeeklyQuest } from '@/content/dailyQuests';
import { pickDailyQuests, pickWeeklyQuest } from '@/content/dailyQuests';

interface QuestProgress {
  readonly questId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

interface QuestStoreState {
  dailyQuests: DailyQuest[];
  dailyProgress: QuestProgress[];
  weeklyQuest: WeeklyQuest | null;
  weeklyProgress: QuestProgress | null;
  lastRefreshAt: number; // unix ms

  /** Initialize or refresh daily quests for a given player tier. */
  refreshDailyQuests: (playerTier: number) => void;
  /** Increment progress on a quest objective. */
  incrementProgress: (questId: string, amount: number) => void;
  /** Claim a completed quest's reward. Returns the reward or null if not completable. */
  claimQuest: (questId: string) => DailyQuest['reward'] | null;
  /** Check if daily refresh is needed (past midnight UTC). */
  checkDailyRefresh: (playerTier: number) => void;
}

const MIDNIGHT_MS = 24 * 60 * 60 * 1000;

function daysSinceEpoch(ts: number): number {
  return Math.floor(ts / MIDNIGHT_MS);
}

export const useQuestStore = create<QuestStoreState>()((set, get) => ({
  dailyQuests: [],
  dailyProgress: [],
  weeklyQuest: null,
  weeklyProgress: null,
  lastRefreshAt: 0,

  refreshDailyQuests: (playerTier: number) => {
    const quests = pickDailyQuests(playerTier);
    const weekly = pickWeeklyQuest();

    set({
      dailyQuests: quests,
      dailyProgress: quests.map((q) => ({
        questId: q.id,
        current: 0,
        completed: false,
        claimed: false,
      })),
      weeklyQuest: weekly,
      weeklyProgress: {
        questId: weekly.id,
        current: 0,
        completed: false,
        claimed: false,
      },
      lastRefreshAt: Date.now(),
    });
  },

  incrementProgress: (questId: string, amount: number) => {
    set((state) => {
      const updateProgress = (prog: QuestProgress): QuestProgress => {
        if (prog.questId !== questId || prog.completed) return prog;
        const allQuests: readonly (DailyQuest | WeeklyQuest)[] = [
          ...state.dailyQuests,
          ...(state.weeklyQuest ? [state.weeklyQuest] : []),
        ];
        const quest = allQuests.find((q) => q.id === questId);
        if (!quest) return prog;

        const target =
          quest.objective.kind === 'explore'
            ? quest.objective.tiles
            : quest.objective.count;

        const newCurrent = prog.current + amount;
        return {
          ...prog,
          current: newCurrent,
          completed: newCurrent >= target,
        };
      };

      return {
        dailyProgress: state.dailyProgress.map(updateProgress),
        weeklyProgress: state.weeklyProgress ? updateProgress(state.weeklyProgress) : null,
      };
    });
  },

  claimQuest: (questId: string) => {
    const state = get();
    const allQuests: readonly (DailyQuest | WeeklyQuest)[] = [
      ...state.dailyQuests,
      ...(state.weeklyQuest ? [state.weeklyQuest] : []),
    ];

    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) return null;

    const progress = [
      ...state.dailyProgress,
      ...(state.weeklyProgress ? [state.weeklyProgress] : []),
    ].find((p) => p.questId === questId && p.completed && !p.claimed);
    if (!progress) return null;

    // Mark as claimed
    set((s) => ({
      dailyProgress: s.dailyProgress.map((p) =>
        p.questId === questId ? { ...p, claimed: true } : p,
      ),
      weeklyProgress:
        s.weeklyProgress?.questId === questId
          ? { ...s.weeklyProgress, claimed: true }
          : s.weeklyProgress,
    }));

    return quest.reward;
  },

  checkDailyRefresh: (playerTier: number) => {
    const { lastRefreshAt } = get();
    const now = Date.now();

    if (lastRefreshAt === 0 || daysSinceEpoch(now) > daysSinceEpoch(lastRefreshAt)) {
      get().refreshDailyQuests(playerTier);
    }
  },
}));
