// ─── Daily Quests Content ─────────────────────────────────────────
// Sci-fi daily and weekly quest definitions.
// Inspired by Orna's daily quest + Astraltree system.

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export type QuestObjective =
  | { readonly kind: 'defeat'; readonly target: string; readonly count: number }
  | { readonly kind: 'defeat_type'; readonly spawnType: string; readonly count: number }
  | { readonly kind: 'collect'; readonly itemId: string; readonly count: number }
  | { readonly kind: 'explore'; readonly tiles: number }
  | { readonly kind: 'use_skill'; readonly skillTag: string; readonly count: number };

export interface QuestReward {
  readonly credits: number;
  readonly techPoints: number;
  readonly scrap: number;
  readonly xp: number;
  readonly itemIds: readonly string[];
}

export interface DailyQuest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly difficulty: QuestDifficulty;
  readonly objective: QuestObjective;
  readonly reward: QuestReward;
}

export interface WeeklyQuest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objective: QuestObjective;
  readonly reward: QuestReward;
}

// ─── Daily Quest Pool ──────────────────────────────────────────────

export const DAILY_QUEST_POOL: Record<string, DailyQuest[]> = {
  // Tier 1-2 players
  easy: [
    {
      id: 'daily.t1.patrol_sweep',
      name: 'Patrol Sweep',
      description: 'Clear 5 hostile patrols from the Grid.',
      difficulty: 'easy',
      objective: { kind: 'defeat_type', spawnType: 'patrol', count: 5 },
      reward: { credits: 50, techPoints: 5, scrap: 10, xp: 30, itemIds: [] },
    },
    {
      id: 'daily.t1.scrap_run',
      name: 'Scrap Run',
      description: 'Collect 3 resource nodes.',
      difficulty: 'easy',
      objective: { kind: 'defeat_type', spawnType: 'resource_node', count: 3 },
      reward: { credits: 30, techPoints: 3, scrap: 20, xp: 20, itemIds: [] },
    },
    {
      id: 'daily.t1.grid_walker',
      name: 'Grid Walker',
      description: 'Explore 10 new grid tiles.',
      difficulty: 'easy',
      objective: { kind: 'explore', tiles: 10 },
      reward: { credits: 40, techPoints: 5, scrap: 5, xp: 25, itemIds: [] },
    },
  ],
  // Tier 3-5 players
  medium: [
    {
      id: 'daily.t3.elite_hunter',
      name: 'Elite Hunter',
      description: 'Defeat 2 elite enemies.',
      difficulty: 'medium',
      objective: { kind: 'defeat_type', spawnType: 'elite', count: 2 },
      reward: { credits: 120, techPoints: 15, scrap: 25, xp: 80, itemIds: [] },
    },
    {
      id: 'daily.t3.vault_breaker',
      name: 'Vault Breaker',
      description: 'Clear 1 data vault.',
      difficulty: 'medium',
      objective: { kind: 'defeat_type', spawnType: 'data_vault', count: 1 },
      reward: { credits: 150, techPoints: 20, scrap: 30, xp: 100, itemIds: [] },
    },
    {
      id: 'daily.t3.skill_mastery',
      name: 'Skill Mastery',
      description: 'Use burst-tagged skills 10 times in combat.',
      difficulty: 'medium',
      objective: { kind: 'use_skill', skillTag: 'burst', count: 10 },
      reward: { credits: 100, techPoints: 12, scrap: 15, xp: 60, itemIds: [] },
    },
  ],
  // Tier 6+ players
  hard: [
    {
      id: 'daily.t6.boss_slayer',
      name: 'Boss Slayer',
      description: 'Defeat 1 world boss.',
      difficulty: 'hard',
      objective: { kind: 'defeat_type', spawnType: 'boss', count: 1 },
      reward: { credits: 300, techPoints: 40, scrap: 50, xp: 200, itemIds: [] },
    },
    {
      id: 'daily.t6.anomaly_containment',
      name: 'Anomaly Containment',
      description: 'Contain 2 signal anomalies.',
      difficulty: 'hard',
      objective: { kind: 'defeat_type', spawnType: 'anomaly', count: 2 },
      reward: { credits: 250, techPoints: 35, scrap: 40, xp: 180, itemIds: [] },
    },
    {
      id: 'daily.t6.total_war',
      name: 'Total War',
      description: 'Defeat 15 enemies of any type.',
      difficulty: 'hard',
      objective: { kind: 'defeat_type', spawnType: 'patrol', count: 15 },
      reward: { credits: 200, techPoints: 30, scrap: 35, xp: 150, itemIds: [] },
    },
  ],
};

// ─── Weekly Quest Pool ─────────────────────────────────────────────

export const WEEKLY_QUEST_POOL: WeeklyQuest[] = [
  {
    id: 'weekly.complete_dailies',
    name: 'Dedicated Runner',
    description: 'Complete 10 daily quests this week.',
    objective: { kind: 'defeat_type', spawnType: 'patrol', count: 10 },
    reward: { credits: 500, techPoints: 100, scrap: 100, xp: 500, itemIds: [] },
  },
  {
    id: 'weekly.boss_gauntlet',
    name: 'Boss Gauntlet',
    description: 'Defeat 5 bosses this week.',
    objective: { kind: 'defeat_type', spawnType: 'boss', count: 5 },
    reward: { credits: 800, techPoints: 150, scrap: 150, xp: 800, itemIds: [] },
  },
  {
    id: 'weekly.explorer',
    name: 'Grid Explorer',
    description: 'Explore 50 new grid tiles this week.',
    objective: { kind: 'explore', tiles: 50 },
    reward: { credits: 600, techPoints: 120, scrap: 80, xp: 600, itemIds: [] },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────

/** Pick daily quests for a player tier. Returns 1 easy, 1 medium, 1 hard at higher tiers. */
export function pickDailyQuests(playerTier: number): DailyQuest[] {
  const quests: DailyQuest[] = [];

  // Always get an easy quest
  const easyPool = DAILY_QUEST_POOL['easy'] ?? [];
  quests.push(easyPool[Math.floor(Math.random() * easyPool.length)]!);

  // Tier 3+ gets a medium quest
  if (playerTier >= 3) {
    const medPool = DAILY_QUEST_POOL['medium'] ?? [];
    quests.push(medPool[Math.floor(Math.random() * medPool.length)]!);
  }

  // Tier 6+ gets a hard quest
  if (playerTier >= 6) {
    const hardPool = DAILY_QUEST_POOL['hard'] ?? [];
    quests.push(hardPool[Math.floor(Math.random() * hardPool.length)]!);
  }

  return quests;
}

/** Pick a weekly quest. */
export function pickWeeklyQuest(): WeeklyQuest {
  return WEEKLY_QUEST_POOL[Math.floor(Math.random() * WEEKLY_QUEST_POOL.length)]!;
}
