/**
 * CampaignContext.tsx — React context for campaign state management.
 *
 * Sibling to GamificationContext (not child). Provides:
 * - Active campaign state (Firestore onSnapshot)
 * - Campaign avatars, quests, bosses
 * - Action methods: createCampaign, startQuest, startBattle, defeatBoss, etc.
 * - PAYMENT_COMPLETED → boss generation listener
 * - Campaign rewards cross-fire into GamificationService (awardXP/awardGold)
 *
 * @see documentation/integration/EXPENSERPG.md §4, §7.3
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { onSnapshot, doc, collection } from 'firebase/firestore';
import { getFirebaseDb } from '../config/firebaseConfig';
import { useAuth } from './AuthContext';
import { AppEvents, APP_EVENTS } from '../utils/appEvents';
import { awardXP } from '../services/gamification/GamificationService';
import { awardGold } from '../services/gamification/ExpeditionService';
import { getExpense } from '../services/expense/expenseService';
import * as CampaignService from '../services/gamification/CampaignService';
import * as CombatEngine from '../services/gamification/CombatEngine';
import { buildAvatarQueueUnit } from '../services/gamification/CampaignUnitBuilder';
import { BOSS_ARCHETYPE_MAPPINGS, getPrimaryClass } from '../services/gamification/CampaignDefinitions';
import {
  get as cacheGet,
  set as cacheSet,
  remove as cacheRemove,
  getAll as cacheGetAll,
} from '../services/offline/LocalStorageAdapter';
import type {
  Campaign,
  CampaignAvatar,
  CampaignQuest,
  CampaignBoss,
  BattleState,
  PrimaryClassId,
  SecondaryClassId,
  EquippedLoadout,
  QuestReward,
  BossGenerationInput,
} from '../services/gamification/CampaignTypes';

// ═══════════════════════════════════════════════════════════════════════
// Context type
// ═══════════════════════════════════════════════════════════════════════

interface CampaignContextValue {
  // State
  campaign: Campaign | null;
  avatar: CampaignAvatar | null;
  partyAvatars: CampaignAvatar[];
  quests: CampaignQuest[];
  currentBoss: CampaignBoss | null;
  battleState: BattleState | null;
  loading: boolean;
  campaignComplete: boolean;

  // Campaign lifecycle
  createSoloCampaign: (companionCharacterId: string, primaryClassId: PrimaryClassId, secondaryClassId: SecondaryClassId | null) => Promise<string>;
  createGroupCampaign: (groupId: string, memberUserIds: string[], companionCharacterId: string, primaryClassId: PrimaryClassId, secondaryClassId: SecondaryClassId | null) => Promise<string>;
  switchCampaign: (campaignId: string) => void;
  archiveCampaign: (campaignId: string) => Promise<void>;
  setCampaignId: (id: string | null) => void;

  // Avatar
  updateLoadout: (loadout: EquippedLoadout) => Promise<void>;
  switchClass: (primaryClassId: PrimaryClassId, secondaryClassId: SecondaryClassId | null) => Promise<void>;

  // Quests
  startQuest: (questId: string) => Promise<void>;
  completeQuest: (questId: string) => Promise<QuestReward>;

  // Boss
  generateBoss: (input: BossGenerationInput) => Promise<void>;
  defeatBoss: (bossId: string) => Promise<void>;

  // Battle
  startBattle: (questId: string | null, bossId: string | null, enemyArchetype: string, enemyLevel: number, enemyCount: number, bossHp?: number) => void;
  beginBattle: () => void;
  advanceQueue: () => void;
  executeBattleTurn: (skillId?: string, targetUnitIds?: string[]) => void;
  runAutoBattle: () => void;
  clearBattle: () => void;

  // Endless mode
  startEndlessBattle: () => void;
  advanceEndlessWave: () => void;
  claimEndlessRewards: (battleId: string, xp: number, gold: number) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

const ENDLESS_PENDING_COLLECTION = 'campaignPendingEndlessRewards';

interface PendingEndlessRewardSnapshot {
  battleId: string;
  userId: string;
  campaignId: string | null;
  groupId: string | null;
  wave: number;
  rewards: { xp: number; gold: number };
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // ── Core state ────────────────────────────────────────────────────
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [avatar, setAvatar] = useState<CampaignAvatar | null>(null);
  const [partyAvatars, setPartyAvatars] = useState<CampaignAvatar[]>([]);
  const [quests, setQuests] = useState<CampaignQuest[]>([]);
  const [currentBoss, setCurrentBoss] = useState<CampaignBoss | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(false);

  // Prevent double-fire of boss generation
  const processedExpenseIds = useRef(new Set<string>());

  // Stable ref for quests (avoids adding quests to PAYMENT_COMPLETED effect deps)
  const questsStateRef = useRef(quests);
  useEffect(() => { questsStateRef.current = quests; }, [quests]);

  const persistPendingEndlessSnapshot = useCallback(async (snapshot: PendingEndlessRewardSnapshot) => {
    await cacheSet(ENDLESS_PENDING_COLLECTION, snapshot.battleId, snapshot);
  }, []);

  const clearPendingEndlessSnapshot = useCallback(async (battleId: string) => {
    await cacheRemove(ENDLESS_PENDING_COLLECTION, battleId);
  }, []);

  const retryPendingEndlessRewards = useCallback(async () => {
    if (!uid) return;

    const snapshots = await cacheGetAll<PendingEndlessRewardSnapshot>(ENDLESS_PENDING_COLLECTION);
    const pending = snapshots
      .filter(s => s.userId === uid)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    for (const snapshot of pending) {
      try {
        const writes: Promise<any>[] = [
          awardXP(uid, snapshot.rewards.xp, 'endless_arena', snapshot.battleId, 'endless', snapshot.groupId),
          awardGold(uid, snapshot.rewards.gold, 'Endless Arena', snapshot.battleId, 'endless', false),
        ];
        if (snapshot.campaignId && snapshot.rewards.xp > 0) {
          writes.push(CampaignService.awardCampaignXP(snapshot.campaignId, uid, snapshot.rewards.xp));
        }
        await Promise.all(writes);
        await clearPendingEndlessSnapshot(snapshot.battleId);
      } catch (error) {
        console.warn('[Campaign] Pending endless reward retry failed:', error);
      }
    }
  }, [uid, clearPendingEndlessSnapshot]);

  // ── Campaign ID caching (AsyncStorage for instant restore) ─────────
  const CAMPAIGN_CACHE_COLLECTION = 'lastCampaignId';

  const persistCampaignId = useCallback(async (id: string | null, userId: string) => {
    if (id) {
      await cacheSet(CAMPAIGN_CACHE_COLLECTION, userId, { campaignId: id });
    } else {
      await cacheRemove(CAMPAIGN_CACHE_COLLECTION, userId);
    }
  }, []);

  // ── Auto-load active campaign on auth ──────────────────────────────
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      // 1. Instant restore from AsyncStorage cache
      try {
        const cached = await cacheGet<{ campaignId: string }>(CAMPAIGN_CACHE_COLLECTION, uid);
        if (cached?.campaignId && !cancelled) {
          setCampaignId(cached.campaignId);
        }
      } catch {
        // cache miss — no problem, Firestore query will resolve
      }

      // 2. Verify / refresh from Firestore (source of truth)
      try {
        const c = await CampaignService.getActiveSoloCampaign(uid);
        if (!cancelled) {
          if (c) {
            setCampaignId(c.campaignId);
            persistCampaignId(c.campaignId, uid).catch(console.warn);
          }
          // Note: don't clear if Firestore returns null — user may have
          // switched to a different campaign that's still valid via the cache.
        }
      } catch (err) {
        console.warn('[Campaign] Failed to load active campaign from Firestore:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [uid, persistCampaignId]);

  useEffect(() => {
    retryPendingEndlessRewards().catch(console.warn);
  }, [retryPendingEndlessRewards]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        retryPendingEndlessRewards().catch(console.warn);
      }
    });

    return () => subscription.remove();
  }, [retryPendingEndlessRewards]);

  // ── Firestore listeners ────────────────────────────────────────────
  // Listen to campaign document
  useEffect(() => {
    if (!campaignId) {
      setCampaign(null);
      return;
    }
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, 'campaigns', campaignId), (snap) => {
      if (snap.exists()) {
        setCampaign(snap.data() as Campaign);
      } else {
        setCampaign(null);
      }
    }, (err) => {
      console.warn('[Campaign] Campaign doc snapshot error:', err);
      setCampaign(null);
    });
    return unsub;
  }, [campaignId]);

  // Listen to avatars subcollection
  useEffect(() => {
    if (!campaignId) {
      setAvatar(null);
      setPartyAvatars([]);
      return;
    }
    const db = getFirebaseDb();
    const unsub = onSnapshot(collection(db, 'campaigns', campaignId, 'avatars'), (snap) => {
      const avatars = snap.docs.map(d => d.data() as CampaignAvatar);
      setPartyAvatars(avatars);
      if (uid) {
        setAvatar(avatars.find(a => a.userId === uid) ?? null);
      }
    }, (err) => {
      console.warn('[Campaign] Avatars snapshot error:', err);
    });
    return unsub;
  }, [campaignId, uid]);

  // Listen to quests
  useEffect(() => {
    if (!campaignId) { setQuests([]); return; }
    const db = getFirebaseDb();
    const unsub = onSnapshot(collection(db, 'campaigns', campaignId, 'quests'), (snap) => {
      setQuests(snap.docs.map(d => d.data() as CampaignQuest));
    }, (err) => {
      console.warn('[Campaign] Quests snapshot error:', err);
    });
    return unsub;
  }, [campaignId]);

  // Listen to current boss
  useEffect(() => {
    if (!campaignId || !campaign?.currentBossId) { setCurrentBoss(null); return; }
    const db = getFirebaseDb();
    const unsub = onSnapshot(
      doc(db, 'campaigns', campaignId, 'bosses', campaign.currentBossId),
      (snap) => {
        setCurrentBoss(snap.exists() ? (snap.data() as CampaignBoss) : null);
      },
      (err) => {
        console.warn('[Campaign] Boss snapshot error:', err);
        setCurrentBoss(null);
      },
    );
    return unsub;
  }, [campaignId, campaign?.currentBossId]);

  // ── PAYMENT_COMPLETED → boss generation ────────────────────────────
  useEffect(() => {
    if (!campaignId || !campaign) return;

    const unsub = AppEvents.on(APP_EVENTS.PAYMENT_COMPLETED, (data) => {
      if (!data.groupId || !data.expenseIds?.length) return;
      if (campaign.groupId && data.groupId !== campaign.groupId) return;

      for (const expenseId of data.expenseIds) {
        if (processedExpenseIds.current.has(expenseId)) continue;
        processedExpenseIds.current.add(expenseId);

        // Load actual expense data, then generate boss + side quest
        getExpense(expenseId)
          .then(async (expense) => {
            const category = expense.items?.[0]?.category || 'Other';
            const difficulty = Math.max(1, Math.min(10, Math.floor((expense.totalAmount ?? 50) / 20)));

            // Boss generation with real expense data
            await CampaignService.generateBossFromSettlement(campaignId, {
              expenseId,
              groupId: data.groupId!,
              totalAmount: expense.totalAmount ?? 50,
              category,
              itemCount: expense.items?.length ?? 1,
              participantCount: expense.participantIds?.length ?? 1,
              splitType: expense.splitType ?? 'EQUAL',
              expenseTitle: expense.name ?? 'Expense',
            });

            // Side quest generation (cap at 10 active)
            const activeSideQuests = questsStateRef.current.filter(
              q => q.type === 'side' && q.status !== 'completed',
            );
            if (activeSideQuests.length < 10) {
              await CampaignService.generateSideQuest(
                campaignId, category, expense.name ?? 'Expense', difficulty,
              );
            }

            // Settlement XP award (15 XP per settlement)
            if (uid) {
              CampaignService.awardCampaignXP(campaignId, uid, 15).catch(console.warn);
            }
          })
          .catch(console.warn);
      }
    });

    return unsub;
  }, [campaignId, campaign]);

  // ── Campaign completion detection ──────────────────────────────────
  const [campaignComplete, setCampaignComplete] = useState(false);
  const completionAwardedRef = useRef(false);

  useEffect(() => {
    if (!campaign || !uid || !campaignId) return;
    // Final chapter = 8, requires 10+ bosses defeated
    if (campaign.currentChapter >= 8 && campaign.totalQuestsCompleted >= 8 && campaign.bossesDefeated >= 10) {
      if (!campaignComplete) setCampaignComplete(true);

      // Award completion rewards once per session
      if (!completionAwardedRef.current) {
        completionAwardedRef.current = true;
        awardXP(uid, 500, 'campaign_complete', campaignId, 'campaign', campaign.groupId ?? null).catch(console.warn);
        awardGold(uid, 200, 'Campaign complete', campaignId, 'campaign', false).catch(console.warn);
        CampaignService.awardCampaignXP(campaignId, uid, 500).catch(console.warn);
        CampaignService.createArchiveEntry(campaignId, {
          type: 'milestone',
          title: 'Campaign Complete!',
          description: 'All chapters conquered. The ledger is balanced.',
          metadata: { bossesDefeated: campaign.bossesDefeated, questsCompleted: campaign.totalQuestsCompleted },
          earnedRewards: [{ xp: 500, gold: 200, materialId: null, itemId: null, classRankXP: 0 }],
        }).catch(console.warn);
      }
    }
  }, [campaign?.currentChapter, campaign?.totalQuestsCompleted, campaign?.bossesDefeated, uid, campaignId]);

  // ── Actions ────────────────────────────────────────────────────────

  const createSoloCampaign = useCallback(async (
    companionCharacterId: string,
    primaryClassId: PrimaryClassId,
    secondaryClassId: SecondaryClassId | null,
  ): Promise<string> => {
    if (!uid) throw new Error('Not authenticated');
    const cls = getPrimaryClass(primaryClassId);
    const campaignName = `${cls?.name ?? primaryClassId} Campaign`;
    setLoading(true);
    try {
      const id = await CampaignService.createCampaign({
        type: 'solo',
        groupId: null,
        ownerUserId: uid,
        memberUserIds: [uid],
        campaignName,
      });
      await CampaignService.createAvatar({
        campaignId: id,
        userId: uid,
        companionCharacterId,
        primaryClassId,
        secondaryClassId,
      });
      await CampaignService.seedMainQuests(id);
      setCampaignId(id);
      persistCampaignId(id, uid).catch(console.warn);
      return id;
    } finally {
      setLoading(false);
    }
  }, [uid, persistCampaignId]);

  const createGroupCampaign = useCallback(async (
    groupId: string,
    memberUserIds: string[],
    companionCharacterId: string,
    primaryClassId: PrimaryClassId,
    secondaryClassId: SecondaryClassId | null,
  ): Promise<string> => {
    if (!uid) throw new Error('Not authenticated');
    const cls = getPrimaryClass(primaryClassId);
    const campaignName = `${cls?.name ?? primaryClassId} Group Campaign`;
    setLoading(true);
    try {
      const id = await CampaignService.createCampaign({
        type: 'group',
        groupId,
        ownerUserId: uid,
        memberUserIds,
        campaignName,
      });
      // Create avatar for the current user; other members create theirs on join
      await CampaignService.createAvatar({
        campaignId: id,
        userId: uid,
        companionCharacterId,
        primaryClassId,
        secondaryClassId,
      });
      await CampaignService.seedMainQuests(id);
      setCampaignId(id);
      persistCampaignId(id, uid).catch(console.warn);
      return id;
    } finally {
      setLoading(false);
    }
  }, [uid, persistCampaignId]);

  // ── Switch between campaigns ───────────────────────────────────────
  const handleSwitchCampaign = useCallback((id: string) => {
    setCampaignId(id);
    setBattleState(null);
    if (uid) {
      persistCampaignId(id, uid).catch(console.warn);
      CampaignService.touchLastPlayed(id);
    }
  }, [uid, persistCampaignId]);

  // ── Archive (retire) a campaign ────────────────────────────────────
  const handleArchiveCampaign = useCallback(async (id: string) => {
    await CampaignService.archiveCampaign(id);
    // If the archived campaign is currently active, clear it
    if (id === campaignId) {
      setCampaignId(null);
      setBattleState(null);
      if (uid) persistCampaignId(null, uid).catch(console.warn);
    }
  }, [campaignId, uid, persistCampaignId]);

  const handleUpdateLoadout = useCallback(async (loadout: EquippedLoadout) => {
    if (!campaignId || !uid) return;
    await CampaignService.updateLoadout(campaignId, uid, loadout);
  }, [campaignId, uid]);

  const handleSwitchClass = useCallback(async (
    primaryClassId: PrimaryClassId,
    secondaryClassId: SecondaryClassId | null,
  ) => {
    if (!campaignId || !uid) return;
    await CampaignService.switchClass(campaignId, uid, primaryClassId, secondaryClassId);
    // Firestore listener will pick up the updated avatar
  }, [campaignId, uid]);

  const handleStartQuest = useCallback(async (questId: string) => {
    if (!campaignId) return;
    // Mark quest in_progress (optimistic — Firestore update)
    // The actual battle is started separately via startBattle
  }, [campaignId]);

  const handleCompleteQuest = useCallback(async (questId: string): Promise<QuestReward> => {
    if (!campaignId || !uid) throw new Error('No active campaign');

    // Replay: quest already completed — award 50% rewards without updating quest/counters
    const quest = quests.find(q => q.questId === questId);
    if (quest?.status === 'completed') {
      const replayRewards: QuestReward = {
        xp: Math.floor(quest.rewards.xp * 0.5),
        gold: Math.floor(quest.rewards.gold * 0.5),
        materialId: null,
        itemId: null,
        classRankXP: Math.floor(quest.rewards.classRankXP * 0.5),
      };
      const replayRef = `${questId}_replay_${Date.now()}`;
      const replayWrites: Promise<any>[] = [
        awardXP(uid, replayRewards.xp, 'quest_replay', replayRef, 'campaign_quest', campaign?.groupId ?? null),
        awardGold(uid, replayRewards.gold, 'Quest replay', replayRef, 'campaign_quest', false),
        CampaignService.awardCampaignXP(campaignId, uid, replayRewards.xp),
      ];
      if (replayRewards.classRankXP > 0) {
        replayWrites.push(CampaignService.awardClassRankXP(campaignId, uid, replayRewards.classRankXP));
      }
      await Promise.all(replayWrites);
      return replayRewards;
    }

    // First completion
    const rewards = await CampaignService.completeQuest(campaignId, questId, uid);

    // Cross-fire into account-level gamification (fire-and-forget)
    const writes: Promise<any>[] = [
      awardXP(uid, rewards.xp, 'campaign_quest', questId, 'campaign_quest', campaign?.groupId ?? null),
      awardGold(uid, rewards.gold, 'Campaign quest', questId, 'campaign_quest', false),
      CampaignService.awardCampaignXP(campaignId, uid, rewards.xp),
    ];

    if (rewards.classRankXP > 0) {
      writes.push(CampaignService.awardClassRankXP(campaignId, uid, rewards.classRankXP));
    }

    await Promise.all(writes);

    return rewards;
  }, [campaignId, uid, campaign, quests]);

  const handleGenerateBoss = useCallback(async (input: BossGenerationInput) => {
    if (!campaignId) return;
    await CampaignService.generateBossFromSettlement(campaignId, input);
  }, [campaignId]);

  const handleDefeatBoss = useCallback(async (bossId: string) => {
    if (!campaignId || !uid) return;
    const defeatedBy = partyAvatars.map(a => a.userId);
    await CampaignService.defeatBoss(campaignId, bossId, defeatedBy);

    // Award boss rewards to all participants
    if (currentBoss) {
      for (const participantId of defeatedBy) {
        await Promise.all([
          awardXP(participantId, currentBoss.rewards.xp, 'campaign_boss', bossId, 'campaign_boss', campaign?.groupId ?? null),
          awardGold(participantId, currentBoss.rewards.gold, 'Boss defeat', bossId, 'campaign_boss', false),
          CampaignService.awardCampaignXP(campaignId, participantId, currentBoss.rewards.xp),
        ]);
      }
    }
  }, [campaignId, uid, partyAvatars, currentBoss, campaign]);

  // ── Battle management (local state, not persisted until complete) ──

  const startBattle = useCallback((
    questId: string | null,
    bossId: string | null,
    enemyArchetype: string,
    enemyLevel: number,
    enemyCount: number,
    bossHp?: number,
  ) => {
    if (!avatar) return;

    // Build player unit from avatar
    const playerUnit = buildAvatarQueueUnit(avatar);
    const enemyUnits = CombatEngine.createEnemyUnits(enemyArchetype, enemyLevel, enemyCount, bossHp);

    const state = CombatEngine.createBattleState({
      battleId: `battle_${Date.now()}`,
      campaignId: campaignId || '',
      questId,
      bossId,
      playerUnits: [playerUnit],
      enemyUnits,
    });

    setBattleState(state);

    AppEvents.emit(APP_EVENTS.CAMPAIGN_BATTLE_STARTED, {
      campaignId: campaignId || '',
      battleId: state.battleId,
      questId,
      bossId,
      participantIds: [avatar.userId],
    });
  }, [avatar, campaignId]);

  const beginBattle = useCallback(() => {
    if (!battleState || battleState.phase !== 'preparation') return;
    setBattleState(CombatEngine.beginBattle(battleState));
  }, [battleState]);

  const advanceQueue = useCallback(() => {
    if (!battleState || battleState.result !== 'in_progress') return;
    if (battleState.phase !== 'queueing') return;
    const newState = CombatEngine.advanceToNextTurn(battleState);
    setBattleState(newState);
  }, [battleState]);

  const executeBattleTurn = useCallback((skillId?: string, targetUnitIds?: string[]) => {
    if (!battleState || battleState.result !== 'in_progress') return;

    const manualAction = skillId ? { skillId, targetUnitIds: targetUnitIds || [] } : undefined;
    const newState = CombatEngine.executeBattleStep(battleState, manualAction);
    setBattleState(newState);

    if (newState.result !== 'in_progress') {
      onBattleComplete(newState);
    }
  }, [battleState]);

  const runAutoBattle = useCallback(() => {
    if (!battleState || battleState.result !== 'in_progress') return;
    const finalState = CombatEngine.runFullAutoBattle(battleState);
    setBattleState(finalState);
    if (finalState.result !== 'in_progress') {
      onBattleComplete(finalState);
    }
  }, [battleState]);

  const clearBattle = useCallback(() => {
    setBattleState(null);
  }, []);

  // ── Endless mode ────────────────────────────────────────────────────

  const startEndlessBattle = useCallback(() => {
    if (!avatar) return;
    const playerUnit = buildAvatarQueueUnit(avatar);
    const enemyUnits = CombatEngine.createEnemyUnits('generic', 2, 1);
    const state = CombatEngine.createBattleState({
      battleId: `endless_${Date.now()}`,
      campaignId: campaignId || '',
      questId: null,
      bossId: null,
      playerUnits: [playerUnit],
      enemyUnits,
    });
    setBattleState({ ...state, endlessWave: 1, endlessRewards: { xp: 0, gold: 0 } });
  }, [avatar, campaignId]);

  const advanceEndlessWave = useCallback(() => {
    if (!battleState || !avatar) return;
    const prevWave = battleState.endlessWave ?? 1;
    const nextWave = prevWave + 1;
    const prevRewards = battleState.endlessRewards ?? { xp: 0, gold: 0 };

    // Award for the wave just completed
    const wasBossWave = prevWave % 5 === 0;
    const waveXP = wasBossWave ? 25 : 5;
    const waveGold = wasBossWave ? 15 : 3;
    const accumulated = { xp: prevRewards.xp + waveXP, gold: prevRewards.gold + waveGold };

    // Generate next wave enemies
    const level = nextWave + 1;
    const count = nextWave >= 10 ? 3 : nextWave >= 5 ? 2 : 1;
    const isNextBoss = nextWave % 5 === 0;
    const archetype = isNextBoss
      ? BOSS_ARCHETYPE_MAPPINGS[nextWave % BOSS_ARCHETYPE_MAPPINGS.length].archetype
      : 'generic';
    const baseHp = (8 + level * 2) * 5;
    const bossHp = isNextBoss ? baseHp * 2 : undefined;
    const enemyUnits = CombatEngine.createEnemyUnits(archetype, level, count, bossHp);

    // Carry over surviving player units (HP/mana preserved, cooldowns/effects reset)
    const carryPlayers = battleState.units
      .filter(u => u.unitType === 'player' && !u.isKO)
      .map(u => ({
        ...u,
        cooldowns: {},
        statusEffects: [],
        ct: Math.max(1, 100 - u.currentStats.speed),
      }));

    const allUnits = CombatEngine.initializeCT([...carryPlayers, ...enemyUnits]);

    setBattleState({
      ...battleState,
      units: allUnits,
      turnHistory: [],
      diceHistory: [],
      currentTurn: 1,
      result: 'in_progress',
      activeUnitId: null,
      phase: 'preparation',
      endlessWave: nextWave,
      endlessRewards: accumulated,
      completedAt: null,
    });
  }, [battleState, avatar]);

  useEffect(() => {
    if (!uid || !battleState?.endlessWave || !battleState.endlessRewards || !battleState.battleId) return;

    persistPendingEndlessSnapshot({
      battleId: battleState.battleId,
      userId: uid,
      campaignId,
      groupId: campaign?.groupId ?? null,
      wave: battleState.endlessWave,
      rewards: battleState.endlessRewards,
      updatedAt: Date.now(),
    }).catch(console.warn);
  }, [
    uid,
    campaignId,
    campaign?.groupId,
    battleState?.battleId,
    battleState?.endlessWave,
    battleState?.endlessRewards?.xp,
    battleState?.endlessRewards?.gold,
    persistPendingEndlessSnapshot,
  ]);

  const handleClaimEndlessRewards = useCallback(async (battleId: string, xp: number, gold: number) => {
    if (!uid) throw new Error('No authenticated user for endless reward claim');

    await persistPendingEndlessSnapshot({
      battleId,
      userId: uid,
      campaignId,
      groupId: campaign?.groupId ?? null,
      wave: battleState?.endlessWave ?? 1,
      rewards: { xp, gold },
      updatedAt: Date.now(),
    });

    const writes: Promise<any>[] = [
      awardXP(uid, xp, 'endless_arena', battleId, 'endless', campaign?.groupId ?? null),
      awardGold(uid, gold, 'Endless Arena', battleId, 'endless', false),
    ];

    if (campaignId && xp > 0) {
      writes.push(CampaignService.awardCampaignXP(campaignId, uid, xp));
    }

    await Promise.all(writes);
    await clearPendingEndlessSnapshot(battleId);
  }, [uid, campaignId, campaign, battleState?.endlessWave, persistPendingEndlessSnapshot, clearPendingEndlessSnapshot]);

  const onBattleComplete = useCallback(async (state: BattleState) => {
    if (!campaignId) return;

    // Skip Firestore save for endless intermediate waves — the same battleId is
    // reused across waves, so subsequent setDoc calls hit "allow update: if false".
    // A summary is not persisted for endless; rewards are claimed via claimEndlessRewards.
    if (state.endlessWave) return;

    // Persist battle record
    await CampaignService.saveBattleEncounter(campaignId, {
      battleId: state.battleId,
      campaignId: state.campaignId,
      questId: state.questId,
      bossId: state.bossId,
      participantIds: state.units.filter(u => u.unitType === 'player').map(u => u.unitId),
      turnHistory: state.turnHistory,
      diceHistory: state.diceHistory,
      result: state.result,
      createdAt: state.createdAt,
      completedAt: Date.now(),
    }).catch(console.warn);

    AppEvents.emit(APP_EVENTS.CAMPAIGN_BATTLE_RESOLVED, {
      campaignId,
      battleId: state.battleId,
      result: state.result as 'victory' | 'defeat',
      turnCount: state.currentTurn,
      participantIds: state.units.filter(u => u.unitType === 'player').map(u => u.unitId),
    });
  }, [campaignId]);

  // ── Context value ──────────────────────────────────────────────────

  const value = useMemo<CampaignContextValue>(() => ({
    campaign,
    avatar,
    partyAvatars,
    quests,
    currentBoss,
    battleState,
    loading,
    campaignComplete,
    createSoloCampaign,
    createGroupCampaign,
    switchCampaign: handleSwitchCampaign,
    archiveCampaign: handleArchiveCampaign,
    setCampaignId,
    updateLoadout: handleUpdateLoadout,
    switchClass: handleSwitchClass,
    startQuest: handleStartQuest,
    completeQuest: handleCompleteQuest,
    generateBoss: handleGenerateBoss,
    defeatBoss: handleDefeatBoss,
    startBattle,
    beginBattle,
    advanceQueue,
    executeBattleTurn,
    runAutoBattle,
    clearBattle,
    startEndlessBattle,
    advanceEndlessWave,
    claimEndlessRewards: handleClaimEndlessRewards,
  }), [
    campaign, avatar, partyAvatars, quests, currentBoss, battleState, loading, campaignComplete,
    createSoloCampaign, createGroupCampaign, handleSwitchCampaign, handleArchiveCampaign,
    handleUpdateLoadout, handleSwitchClass, handleStartQuest, handleCompleteQuest,
    handleGenerateBoss, handleDefeatBoss,
    startBattle, beginBattle, advanceQueue, executeBattleTurn, runAutoBattle, clearBattle,
    startEndlessBattle, advanceEndlessWave, handleClaimEndlessRewards,
  ]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Consumer hook
// ═══════════════════════════════════════════════════════════════════════

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
}

