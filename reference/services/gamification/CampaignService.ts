/**
 * CampaignService.ts — Campaign CRUD, avatar creation, boss generation.
 *
 * Design principles (same as GamificationService):
 * - Fire-and-forget for non-critical writes
 * - Idempotent where possible (boss generation uses expenseId as key)
 * - Firestore transactions for state-sensitive operations
 *
 * @see documentation/integration/EXPENSERPG.md §4-§14
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../config/firebaseConfig';
import { AppEvents, APP_EVENTS } from '../../utils/appEvents';
import {
  getPrimaryClass,
  getSecondaryClass,
  getUnlockedSkills,
  getBossArchetype,
  getBaseQuestReward,
  SPLIT_TYPE_TO_TRAIT,
  MAIN_QUEST_TEMPLATES,
  SIDE_QUEST_GENERATORS,
} from './CampaignDefinitions';
import type {
  Campaign,
  CampaignAvatar,
  CampaignBoss,
  CampaignQuest,
  BattleEncounter,
  ArchiveEntry,
  BossGenerationInput,
  BossTrait,
  BossReward,
  RivalData,
  PrimaryClassId,
  SecondaryClassId,
  EquippedLoadout,
  QuestReward,
  EncounterDef,
  StatBlock,
  ItemSlot,
  EquippedGear,
} from './CampaignTypes';
import { getClassRankXPThreshold } from './CampaignTypes';
import { getEquipment } from './GearDefinitions';

// ═══════════════════════════════════════════════════════════════════════
// Firestore path helpers — call getFirebaseDb() at invocation time,
// matching the pattern used by GamificationService/ExpeditionService.
// ═══════════════════════════════════════════════════════════════════════

const campaignsRef = () => collection(getFirebaseDb(), 'campaigns');
const campaignDoc = (campaignId: string) => doc(getFirebaseDb(), 'campaigns', campaignId);
const avatarsRef = (campaignId: string) => collection(getFirebaseDb(), 'campaigns', campaignId, 'avatars');
const avatarDoc = (campaignId: string, userId: string) => doc(getFirebaseDb(), 'campaigns', campaignId, 'avatars', userId);
const bossesRef = (campaignId: string) => collection(getFirebaseDb(), 'campaigns', campaignId, 'bosses');
const bossDoc = (campaignId: string, bossId: string) => doc(getFirebaseDb(), 'campaigns', campaignId, 'bosses', bossId);
const questsRef = (campaignId: string) => collection(getFirebaseDb(), 'campaigns', campaignId, 'quests');
const questDoc = (campaignId: string, questId: string) => doc(getFirebaseDb(), 'campaigns', campaignId, 'quests', questId);
const battlesRef = (campaignId: string) => collection(getFirebaseDb(), 'campaigns', campaignId, 'battles');
const battleDoc = (campaignId: string, battleId: string) => doc(getFirebaseDb(), 'campaigns', campaignId, 'battles', battleId);
const archiveRef = (campaignId: string) => collection(getFirebaseDb(), 'campaigns', campaignId, 'archive');
const archiveDoc = (campaignId: string, entryId: string) => doc(getFirebaseDb(), 'campaigns', campaignId, 'archive', entryId);

// ═══════════════════════════════════════════════════════════════════════
// Campaign CRUD
// ═══════════════════════════════════════════════════════════════════════

/** Create a new campaign (solo or group). Returns the campaign ID. */
export async function createCampaign(params: {
  type: 'solo' | 'group';
  groupId: string | null;
  ownerUserId: string;
  memberUserIds: string[];
  campaignName: string;
}): Promise<string> {
  const campaignRef = doc(campaignsRef());
  const campaign: Campaign = {
    campaignId: campaignRef.id,
    type: params.type,
    status: 'active',
    groupId: params.groupId,
    ownerUserId: params.ownerUserId,
    memberUserIds: params.memberUserIds,
    currentChapter: 1,
    currentBossId: null,
    bossesDefeated: 0,
    totalQuestsCompleted: 0,
    totalGoldEarned: 0,
    totalXPEarned: 0,
    campaignName: params.campaignName,
    lastPlayedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(campaignRef, campaign);

  AppEvents.emit(APP_EVENTS.CAMPAIGN_CREATED, {
    campaignId: campaign.campaignId,
    type: campaign.type,
    groupId: campaign.groupId,
    ownerUserId: campaign.ownerUserId,
  });

  return campaign.campaignId;
}

/** Get a campaign by ID. */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const snap = await getDoc(campaignDoc(campaignId));
  return snap.exists() ? (snap.data() as Campaign) : null;
}

/** Get the active campaign for a group. */
export async function getActiveCampaignForGroup(groupId: string): Promise<Campaign | null> {
  const q = query(campaignsRef(), where('groupId', '==', groupId), where('status', '==', 'active'));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Campaign;
}

/** Get the active solo campaign for a user. */
export async function getActiveSoloCampaign(userId: string): Promise<Campaign | null> {
  const q = query(
    campaignsRef(),
    where('type', '==', 'solo'),
    where('ownerUserId', '==', userId),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Campaign;
}

/** Archive a campaign (mark completed). */
export async function archiveCampaign(campaignId: string): Promise<void> {
  await updateDoc(campaignDoc(campaignId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

/** Get all campaigns owned by a user, ordered by most recently played. */
export async function getUserCampaigns(userId: string): Promise<Campaign[]> {
  const q = query(
    campaignsRef(),
    where('ownerUserId', '==', userId),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Campaign);
}

/** Touch lastPlayedAt timestamp on a campaign (fire-and-forget). */
export function touchLastPlayed(campaignId: string): void {
  updateDoc(campaignDoc(campaignId), {
    lastPlayedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(console.warn);
}

// ═══════════════════════════════════════════════════════════════════════
// Avatar Management
// ═══════════════════════════════════════════════════════════════════════

/** Create a campaign avatar for a user. */
export async function createAvatar(params: {
  campaignId: string;
  userId: string;
  companionCharacterId: string;
  primaryClassId: PrimaryClassId;
  secondaryClassId: SecondaryClassId | null;
}): Promise<CampaignAvatar> {
  const primaryClass = getPrimaryClass(params.primaryClassId);
  if (!primaryClass) throw new Error(`Unknown primary class: ${params.primaryClassId}`);

  const basicSkill = primaryClass.skills.find(s => s.skillType === 'basic');
  if (!basicSkill) throw new Error(`No basic attack for class: ${params.primaryClassId}`);

  // Build initial loadout: basic attack + secondary class actives (if any)
  const activeSkillIds: string[] = [];
  const passiveSkillIds: string[] = [];

  if (params.secondaryClassId) {
    const secondaryClass = getSecondaryClass(params.secondaryClassId);
    if (secondaryClass) {
      for (const skill of secondaryClass.skills) {
        if (skill.skillType === 'active') activeSkillIds.push(skill.id);
        if (skill.skillType === 'passive') passiveSkillIds.push(skill.id);
      }
    }
  }

  const loadout: EquippedLoadout = {
    basicAttackSkillId: basicSkill.id,
    activeSkillIds,
    passiveSkillIds,
  };

  // Starter gear: one item per slot, equipped by default. Lets new players
  // exercise the gear pipeline immediately and demonstrates the resolution
  // chain (flat → multipliers → CT reduction) without requiring a shop loop.
  const starterGear: { inventory: string[]; equipped: EquippedGear } = {
    inventory: ['iron_sword', 'leather_hauberk', 'focus_charm'],
    equipped: { weapon: 'iron_sword', armour: 'leather_hauberk', accessory: 'focus_charm' },
  };

  const avatar: CampaignAvatar = {
    userId: params.userId,
    campaignId: params.campaignId,
    companionCharacterId: params.companionCharacterId,
    primaryClassId: params.primaryClassId,
    secondaryClassId: params.secondaryClassId,
    classRank: 1,
    classRanks: { [params.primaryClassId]: 1 },
    classRankXP: { [params.primaryClassId]: 0 },
    campaignLevel: 1,
    campaignXP: 0,
    stats: { ...primaryClass.baselineStats },
    equippedLoadout: loadout,
    gearInventory: starterGear.inventory,
    equippedGear: starterGear.equipped,
    universalPointsAllocated: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(avatarDoc(params.campaignId, params.userId), avatar);
  return avatar;
}

/** Get an avatar for a user in a campaign. */
export async function getAvatar(campaignId: string, userId: string): Promise<CampaignAvatar | null> {
  const snap = await getDoc(avatarDoc(campaignId, userId));
  return snap.exists() ? (snap.data() as CampaignAvatar) : null;
}

/** Get all avatars for a campaign. */
export async function getCampaignAvatars(campaignId: string): Promise<CampaignAvatar[]> {
  const snap = await getDocs(avatarsRef(campaignId));
  return snap.docs.map(d => d.data() as CampaignAvatar);
}

/** Update an avatar's loadout. */
export async function updateLoadout(
  campaignId: string,
  userId: string,
  loadout: EquippedLoadout,
): Promise<void> {
  await updateDoc(avatarDoc(campaignId, userId), {
    equippedLoadout: loadout,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Gear — inventory grant / equip / unequip
//
// All three mutations run inside a Firestore transaction so the avatar's
// inventory and equipped gear stay consistent even under concurrent writes.
// Unknown item IDs are rejected up front (checked against GearDefinitions).
// ═══════════════════════════════════════════════════════════════════════

/** Add an equipment item to the avatar's owned inventory. Idempotent — duplicates are ignored. */
export async function grantEquipment(
  campaignId: string,
  userId: string,
  equipmentId: string,
): Promise<void> {
  if (!getEquipment(equipmentId)) {
    throw new Error(`Unknown equipment: ${equipmentId}`);
  }
  const ref = avatarDoc(campaignId, userId);
  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) throw new Error('Avatar not found');
    const avatar = snap.data() as CampaignAvatar;
    const inventory = avatar.gearInventory ?? [];
    if (inventory.includes(equipmentId)) return;
    txn.update(ref, {
      gearInventory: [...inventory, equipmentId],
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Equip an item into its slot. The item must be in the avatar's inventory
 * and its slot must match the target slot. Any item previously in that slot
 * is automatically unequipped (returned to inventory).
 */
export async function equipItem(
  campaignId: string,
  userId: string,
  equipmentId: string,
): Promise<void> {
  const item = getEquipment(equipmentId);
  if (!item) throw new Error(`Unknown equipment: ${equipmentId}`);

  const ref = avatarDoc(campaignId, userId);
  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) throw new Error('Avatar not found');
    const avatar = snap.data() as CampaignAvatar;
    const inventory = avatar.gearInventory ?? [];
    if (!inventory.includes(equipmentId)) {
      throw new Error(`Item ${equipmentId} is not in inventory`);
    }
    const nextEquipped = { ...(avatar.equippedGear ?? {}), [item.slot]: equipmentId };
    txn.update(ref, {
      equippedGear: nextEquipped,
      updatedAt: serverTimestamp(),
    });
  });
}

/** Clear the item from the given slot. No-op if the slot is already empty. */
export async function unequipItem(
  campaignId: string,
  userId: string,
  slot: ItemSlot,
): Promise<void> {
  const ref = avatarDoc(campaignId, userId);
  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) throw new Error('Avatar not found');
    const avatar = snap.data() as CampaignAvatar;
    const current = avatar.equippedGear ?? {};
    if (!current[slot]) return;
    const nextEquipped = { ...current };
    delete nextEquipped[slot];
    txn.update(ref, {
      equippedGear: nextEquipped,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Switch a player's primary and/or secondary class.
 * Preserves per-class rank progression. Resets stats to new class baseline
 * and refunds universal stat points for reallocation.
 */
export async function switchClass(
  campaignId: string,
  userId: string,
  newPrimaryClassId: PrimaryClassId,
  newSecondaryClassId: SecondaryClassId | null,
): Promise<CampaignAvatar> {
  const ref = avatarDoc(campaignId, userId);
  let updated: CampaignAvatar | null = null;

  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) throw new Error('Avatar not found');
    const avatar = snap.data() as CampaignAvatar;

    // Migrate legacy avatars missing per-class fields
    const classRanks: Record<string, number> = avatar.classRanks
      ? { ...avatar.classRanks }
      : { [avatar.primaryClassId]: avatar.classRank };
    const classRankXPMap: Record<string, number> = avatar.classRankXP
      ? { ...avatar.classRankXP }
      : { [avatar.primaryClassId]: 0 };

    // Get rank for the new class (default 1 if never played)
    const newRank = classRanks[newPrimaryClassId] ?? 1;
    if (!classRanks[newPrimaryClassId]) {
      classRanks[newPrimaryClassId] = 1;
      classRankXPMap[newPrimaryClassId] = 0;
    }

    // Rebuild stats from new class baseline
    const newClass = getPrimaryClass(newPrimaryClassId);
    if (!newClass) throw new Error(`Unknown class: ${newPrimaryClassId}`);
    const newStats: StatBlock = { ...newClass.baselineStats };

    // Rebuild loadout for new class at its rank
    const basicSkill = newClass.skills.find(s => s.skillType === 'basic');
    if (!basicSkill) throw new Error(`No basic attack for class: ${newPrimaryClassId}`);

    const unlockedSkills = getUnlockedSkills(newPrimaryClassId, newRank);
    const activeSkillIds = unlockedSkills
      .filter(s => s.skillType === 'active')
      .map(s => s.id)
      .slice(0, 4);
    const passiveSkillIds = unlockedSkills
      .filter(s => s.skillType === 'passive')
      .map(s => s.id)
      .slice(0, 5);

    // Add secondary class skills
    if (newSecondaryClassId) {
      const sec = getSecondaryClass(newSecondaryClassId);
      if (sec) {
        for (const skill of sec.skills) {
          if (skill.skillType === 'active') activeSkillIds.push(skill.id);
          if (skill.skillType === 'passive') passiveSkillIds.push(skill.id);
        }
      }
    }

    const loadout: EquippedLoadout = {
      basicAttackSkillId: basicSkill.id,
      activeSkillIds,
      passiveSkillIds,
    };

    const patch = {
      primaryClassId: newPrimaryClassId,
      secondaryClassId: newSecondaryClassId,
      classRank: newRank,
      classRanks,
      classRankXP: classRankXPMap,
      stats: newStats,
      equippedLoadout: loadout,
      universalPointsAllocated: 0, // refund all points for reallocation
      updatedAt: serverTimestamp(),
    };

    txn.update(ref, patch);
    updated = { ...avatar, ...patch };
  });

  return updated!;
}

/**
 * Award class rank XP to the avatar's current primary class.
 * Automatically ranks up when threshold is met.
 */
export async function awardClassRankXP(
  campaignId: string,
  userId: string,
  xpAmount: number,
): Promise<{ newRank: number; rankedUp: boolean }> {
  const ref = avatarDoc(campaignId, userId);
  let result = { newRank: 0, rankedUp: false };

  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;
    const avatar = snap.data() as CampaignAvatar;
    const classId = avatar.primaryClassId;

    // Migrate legacy
    const classRanks: Record<string, number> = avatar.classRanks
      ? { ...avatar.classRanks }
      : { [classId]: avatar.classRank };
    const classRankXPMap: Record<string, number> = avatar.classRankXP
      ? { ...avatar.classRankXP }
      : { [classId]: 0 };

    let rank = classRanks[classId] ?? avatar.classRank;
    let xp = (classRankXPMap[classId] ?? 0) + xpAmount;
    let rankedUp = false;

    // Check for rank ups (can rank up multiple times in one award)
    while (rank < 10) {
      const threshold = getClassRankXPThreshold(rank);
      if (xp >= threshold) {
        xp -= threshold;
        rank += 1;
        rankedUp = true;
      } else {
        break;
      }
    }

    classRanks[classId] = rank;
    classRankXPMap[classId] = xp;

    txn.update(ref, {
      classRank: rank,
      classRanks,
      classRankXP: classRankXPMap,
      updatedAt: serverTimestamp(),
    });

    result = { newRank: rank, rankedUp };
  });

  return result;
}

/** Award campaign XP to an avatar. Returns new level if leveled up. */
export async function awardCampaignXP(
  campaignId: string,
  userId: string,
  xpAmount: number,
): Promise<{ newLevel: number; leveledUp: boolean }> {
  const ref = avatarDoc(campaignId, userId);
  let result = { newLevel: 0, leveledUp: false };

  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;
    const avatar = snap.data() as CampaignAvatar;

    const newXP = avatar.campaignXP + xpAmount;
    const newLevel = computeCampaignLevel(newXP);
    const leveledUp = newLevel > avatar.campaignLevel;

    txn.update(ref, {
      campaignXP: newXP,
      campaignLevel: newLevel,
      updatedAt: serverTimestamp(),
    });

    result = { newLevel, leveledUp };
  });

  if (result.leveledUp) {
    AppEvents.emit(APP_EVENTS.CAMPAIGN_AVATAR_LEVELED_UP, {
      campaignId,
      userId,
      newLevel: result.newLevel,
      previousLevel: result.newLevel - 1,
    });
  }

  return result;
}

/** Campaign level thresholds: level N requires CAMPAIGN_XP_TABLE[N-1] total XP. */
const CAMPAIGN_XP_TABLE = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200];

function computeCampaignLevel(totalXP: number): number {
  for (let i = CAMPAIGN_XP_TABLE.length - 1; i >= 0; i--) {
    if (totalXP >= CAMPAIGN_XP_TABLE[i]) return i + 1;
  }
  return 1;
}

// ═══════════════════════════════════════════════════════════════════════
// Boss Generation — Expense-to-Boss Pipeline
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a boss from a settled expense. Triggered by PAYMENT_COMPLETED.
 * Deterministic from expense properties — same input always produces same boss shape.
 */
export async function generateBossFromSettlement(
  campaignId: string,
  input: BossGenerationInput,
): Promise<CampaignBoss | null> {
  // Check for duplicate: one boss per expense
  const existingQ = query(
    bossesRef(campaignId),
    where('sourceExpenseId', '==', input.expenseId),
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) return null; // already generated

  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.status !== 'active') return null;

  // Map expense properties → boss properties
  const archetypeMapping = getBossArchetype(input.category);
  const hp = Math.max(50, Math.round(input.totalAmount * 10));
  const phases = input.itemCount <= 1 ? 1 : input.itemCount <= 3 ? 2 : 3;
  const trait = (SPLIT_TYPE_TO_TRAIT[input.splitType] || 'balanced') as BossTrait;
  const level = Math.max(1, Math.min(10, Math.floor(input.totalAmount / 20)));

  // Boss name from pattern
  const bossName = archetypeMapping.namePattern.replace('{source}', input.expenseTitle || 'Unknown');

  // Rival check: every 5th boss has 30% chance
  const bossCount = campaign.bossesDefeated + 1;
  const isRival = bossCount % 5 === 0 && Math.random() < 0.30;

  let rivalData: RivalData | null = null;
  if (isRival) {
    // Try to learn the primary class of the campaign owner's avatar
    const ownerAvatar = await getAvatar(campaignId, campaign.ownerUserId);
    rivalData = {
      learnedClassType: ownerAvatar?.primaryClassId ?? null,
      stealChance: 0.15,
      recurrenceScore: 0,
      stolenRewardPool: [],
      fleeCount: 0,
    };
  }

  const rewards: BossReward = {
    xp: 20 + level * 10,
    gold: 10 + level * 5,
    materialIds: [],
    itemIds: [],
    cosmeticId: null,
    archiveEntry: true,
  };

  const bossRef = doc(bossesRef(campaignId));
  const boss: CampaignBoss = {
    bossId: bossRef.id,
    campaignId,
    sourceExpenseId: input.expenseId,
    sourceGroupId: input.groupId,
    archetype: archetypeMapping.archetype,
    name: bossName,
    level,
    hp,
    maxHp: hp,
    phases,
    traits: [trait],
    status: 'active',
    isRival,
    rivalData,
    defeatedAt: null,
    defeatedBy: [],
    rewardsClaimed: false,
    rewards,
    createdAt: serverTimestamp(),
  };

  await setDoc(bossRef, boss);

  // Set as current boss on campaign
  await updateDoc(campaignDoc(campaignId), {
    currentBossId: boss.bossId,
    updatedAt: serverTimestamp(),
  });

  AppEvents.emit(APP_EVENTS.CAMPAIGN_BOSS_GENERATED, {
    campaignId,
    bossId: boss.bossId,
    sourceExpenseId: input.expenseId,
    archetype: boss.archetype,
    bossName: boss.name,
  });

  return boss;
}

/** Mark a boss as defeated. */
export async function defeatBoss(
  campaignId: string,
  bossId: string,
  defeatedBy: string[],
): Promise<void> {
  const ref = bossDoc(campaignId, bossId);
  await updateDoc(ref, {
    status: 'defeated',
    defeatedAt: serverTimestamp(),
    defeatedBy,
  });

  // Increment bossesDefeated on campaign
  await runTransaction(getFirebaseDb(), async (txn) => {
    const campaignSnap = await txn.get(campaignDoc(campaignId));
    if (!campaignSnap.exists()) return;
    const campaign = campaignSnap.data() as Campaign;

    txn.update(campaignDoc(campaignId), {
      bossesDefeated: campaign.bossesDefeated + 1,
      currentBossId: null,
      updatedAt: serverTimestamp(),
    });
  });

  // Unlock quests gated by the new bossesDefeated count
  await unlockAvailableQuests(campaignId);

  // Read boss for reward info
  const bossSnap = await getDoc(ref);
  const boss = bossSnap.exists() ? (bossSnap.data() as CampaignBoss) : null;

  AppEvents.emit(APP_EVENTS.CAMPAIGN_BOSS_DEFEATED, {
    campaignId,
    bossId,
    defeatedBy,
    isRival: boss?.isRival ?? false,
    xpEarned: boss?.rewards.xp ?? 0,
    goldEarned: boss?.rewards.gold ?? 0,
  });

  // Auto-create archive entry
  if (boss) {
    await createArchiveEntry(campaignId, {
      type: 'boss_defeated',
      title: `Defeated ${boss.name}`,
      description: `A level ${boss.level} ${boss.archetype} boss.`,
      metadata: { bossId, archetype: boss.archetype, level: boss.level, isRival: boss.isRival },
      earnedRewards: [{
        xp: boss.rewards.xp,
        gold: boss.rewards.gold,
        materialId: null,
        itemId: null,
        classRankXP: 0,
      }],
    });
  }
}

/** Handle a rival boss fleeing. */
export async function rivalBossFlee(campaignId: string, bossId: string): Promise<void> {
  const ref = bossDoc(campaignId, bossId);
  await runTransaction(getFirebaseDb(), async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;
    const boss = snap.data() as CampaignBoss;
    if (!boss.isRival || !boss.rivalData) return;

    txn.update(ref, {
      status: 'fled',
      'rivalData.fleeCount': boss.rivalData.fleeCount + 1,
      'rivalData.recurrenceScore': boss.rivalData.recurrenceScore + 1,
    });
  });

  await updateDoc(campaignDoc(campaignId), {
    currentBossId: null,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Quest Management
// ═══════════════════════════════════════════════════════════════════════

/** Seed main quests for a campaign from MAIN_QUEST_TEMPLATES. */
export async function seedMainQuests(campaignId: string): Promise<void> {
  for (const template of MAIN_QUEST_TEMPLATES) {
    const questRef = doc(questsRef(campaignId));
    const baseReward = getBaseQuestReward(template.difficulty);

    const encounters: EncounterDef[] = [];
    for (let i = 0; i < template.encounterCount; i++) {
      encounters.push({
        enemyArchetype: 'generic',
        enemyLevel: template.difficulty,
        enemyTraits: [],
        isBoss: false,
        bossId: null,
      });
    }

    const quest: CampaignQuest = {
      questId: questRef.id,
      campaignId,
      type: 'main',
      title: template.title,
      description: template.description,
      difficulty: template.difficulty,
      requiredBossesDefeated: template.requiredBossesDefeated,
      encounters,
      rewards: {
        xp: Math.round(baseReward.xp * template.rewardScale),
        gold: Math.round(baseReward.gold * template.rewardScale),
        materialId: null,
        itemId: null,
        classRankXP: Math.round(baseReward.classRankXP * template.rewardScale),
      },
      status: template.requiredBossesDefeated === 0 ? 'available' : 'locked',
      completedAt: null,
      completedBy: [],
    };

    await setDoc(questRef, quest);
  }
}

/** Get all quests for a campaign. */
export async function getCampaignQuests(campaignId: string): Promise<CampaignQuest[]> {
  const snap = await getDocs(questsRef(campaignId));
  return snap.docs.map(d => d.data() as CampaignQuest);
}

/** Complete a quest. */
export async function completeQuest(
  campaignId: string,
  questId: string,
  userId: string,
): Promise<QuestReward> {
  const ref = questDoc(campaignId, questId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Quest not found');
  const quest = snap.data() as CampaignQuest;

  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedBy: [...quest.completedBy, userId],
  });

  // Increment campaign quest counter
  await runTransaction(getFirebaseDb(), async (txn) => {
    const campaignSnap = await txn.get(campaignDoc(campaignId));
    if (!campaignSnap.exists()) return;
    const campaign = campaignSnap.data() as Campaign;
    txn.update(campaignDoc(campaignId), {
      totalQuestsCompleted: campaign.totalQuestsCompleted + 1,
      totalXPEarned: campaign.totalXPEarned + quest.rewards.xp,
      totalGoldEarned: campaign.totalGoldEarned + quest.rewards.gold,
      updatedAt: serverTimestamp(),
    });
  });

  // Unlock quests gated by bossesDefeated
  await unlockAvailableQuests(campaignId);

  AppEvents.emit(APP_EVENTS.CAMPAIGN_QUEST_COMPLETED, {
    campaignId,
    questId,
    questType: quest.type,
    userId,
    xpEarned: quest.rewards.xp,
    goldEarned: quest.rewards.gold,
  });

  return quest.rewards;
}

/** Unlock quests that are gated by bossesDefeated. */
async function unlockAvailableQuests(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return;

  const q = query(questsRef(campaignId), where('status', '==', 'locked'));
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const quest = d.data() as CampaignQuest;
    // Unlock if enough bosses defeated OR enough quests completed (fallback for no-payment players)
    if (quest.requiredBossesDefeated <= campaign.bossesDefeated ||
        quest.requiredBossesDefeated <= campaign.totalQuestsCompleted) {
      await updateDoc(d.ref, { status: 'available' });
    }
  }
}

/** Generate a side quest from expense data. */
export async function generateSideQuest(
  campaignId: string,
  expenseCategory: string,
  expenseTitle: string,
  difficulty: number,
): Promise<CampaignQuest | null> {
  const generator = SIDE_QUEST_GENERATORS.find(g => g.triggerCategory === expenseCategory);
  if (!generator) return null;

  const clampedDifficulty = Math.max(
    generator.difficultyRange.min,
    Math.min(generator.difficultyRange.max, difficulty),
  );

  const baseReward = getBaseQuestReward(clampedDifficulty);
  const questRef = doc(questsRef(campaignId));

  const quest: CampaignQuest = {
    questId: questRef.id,
    campaignId,
    type: 'side',
    title: generator.titlePattern,
    description: generator.descriptionPattern.replace('{source}', expenseTitle),
    difficulty: clampedDifficulty,
    requiredBossesDefeated: 0,
    encounters: [{
      enemyArchetype: getBossArchetype(expenseCategory).archetype,
      enemyLevel: clampedDifficulty,
      enemyTraits: [],
      isBoss: false,
      bossId: null,
    }],
    rewards: {
      xp: Math.round(baseReward.xp * generator.rewardScale),
      gold: Math.round(baseReward.gold * generator.rewardScale),
      materialId: null,
      itemId: null,
      classRankXP: Math.round(baseReward.classRankXP * generator.rewardScale),
    },
    status: 'available',
    completedAt: null,
    completedBy: [],
  };

  await setDoc(questRef, quest);
  return quest;
}

// ═══════════════════════════════════════════════════════════════════════
// Battle Persistence
// ═══════════════════════════════════════════════════════════════════════

/** Save a completed battle encounter to Firestore. */
export async function saveBattleEncounter(
  campaignId: string,
  encounter: BattleEncounter,
): Promise<void> {
  await setDoc(battleDoc(campaignId, encounter.battleId), encounter);
}

// ═══════════════════════════════════════════════════════════════════════
// Archive
// ═══════════════════════════════════════════════════════════════════════

/** Create an archive entry. */
export async function createArchiveEntry(
  campaignId: string,
  entry: Omit<ArchiveEntry, 'entryId' | 'timestamp'>,
): Promise<string> {
  const ref = doc(archiveRef(campaignId));
  const full: ArchiveEntry = {
    ...entry,
    entryId: ref.id,
    timestamp: serverTimestamp(),
  };
  await setDoc(ref, full);
  return ref.id;
}

/** Get all archive entries for a campaign. */
export async function getArchiveEntries(campaignId: string): Promise<ArchiveEntry[]> {
  const snap = await getDocs(query(archiveRef(campaignId), orderBy('timestamp', 'desc')));
  return snap.docs.map(d => d.data() as ArchiveEntry);
}

// ═══════════════════════════════════════════════════════════════════════
// Boss queries
// ═══════════════════════════════════════════════════════════════════════

/** Get the current active boss for a campaign. */
export async function getActiveBoss(campaignId: string): Promise<CampaignBoss | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign?.currentBossId) return null;
  const snap = await getDoc(bossDoc(campaignId, campaign.currentBossId));
  return snap.exists() ? (snap.data() as CampaignBoss) : null;
}

/** Get all bosses for a campaign. */
export async function getCampaignBosses(campaignId: string): Promise<CampaignBoss[]> {
  const snap = await getDocs(bossesRef(campaignId));
  return snap.docs.map(d => d.data() as CampaignBoss);
}

/** Get fled rivals that should reappear (3+ bosses defeated since they fled). */
export async function getFledRivals(campaignId: string): Promise<CampaignBoss[]> {
  const q = query(bossesRef(campaignId), where('status', '==', 'fled'));
  const snap = await getDocs(q);
  const campaign = await getCampaign(campaignId);
  if (!campaign) return [];

  return snap.docs
    .map(d => d.data() as CampaignBoss)
    .filter(boss => {
      if (!boss.rivalData) return false;
      // Reappear after 3 more boss defeats
      return boss.rivalData.recurrenceScore > 0;
    });
}

// ═══════════════════════════════════════════════════════════════════════
// Stat allocation
// ═══════════════════════════════════════════════════════════════════════

/** Allocate universal stat points earned from leveling. */
export async function allocateStatPoints(
  campaignId: string,
  userId: string,
  newStats: StatBlock,
  pointsUsed: number,
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, 'campaigns', campaignId, 'avatars', userId);
  await updateDoc(ref, {
    stats: newStats,
    universalPointsAllocated: increment(pointsUsed),
    updatedAt: serverTimestamp(),
  });
}
