/**
 * CampaignTypes.ts — TypeScript types for the campaign system.
 *
 * Covers: campaigns, avatars, classes, skills, stats, quests, bosses,
 * encounters, battles, combat engine, and campaign archive.
 *
 * @see documentation/integration/EXPENSERPG.md §4–§17
 */

// ---------------------------------------------------------------------------
// Class & Skill IDs
// ---------------------------------------------------------------------------

export type PrimaryClassId =
  | 'vanguard'
  | 'arcanist'
  | 'ranger'
  | 'cleric'
  | 'rogue'
  | 'warden';

export type SecondaryClassId =
  | 'tactician'
  | 'alchemist'
  | 'duelist'
  | 'enchanter'
  | 'sentinel'
  | 'harbinger';

export type ClassId = PrimaryClassId | SecondaryClassId;

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface StatBlock {
  strength: number;
  defense: number;
  speed: number;
  health: number;
  mana: number;
  cdr: number;
  precision: number;
}

/** The four stat layers that stack to produce a unit's effective stats. */
export interface StatLayers {
  baseline: StatBlock;           // from class bias at campaign creation
  campaignEarned: StatBlock;     // from campaign-level stat point allocation
  equipment: StatBlock;          // from equipped items (future)
  battleTemp: StatBlock;         // from buffs/debuffs, cleared after battle
}

export type StatKey = keyof StatBlock;

// ---------------------------------------------------------------------------
// Gear & Equipment
// ---------------------------------------------------------------------------

export type ItemSlot = 'weapon' | 'armour' | 'accessory';

/** Canonical slot order — also the order in which multipliers compose (weapon first). */
export const ITEM_SLOTS: readonly ItemSlot[] = ['weapon', 'armour', 'accessory'] as const;

/** Hard cap on total gear-based CT reduction, per COMBATSYSTEM.md §8.4. */
export const GEAR_CT_REDUCTION_CAP = 0.10;

/**
 * A piece of equipment. All effect fields are optional — absent keys are treated
 * as the neutral element (empty object, zero, null). This lets definitions stay
 * minimal and self-documenting.
 *
 * Stat math resolution order (COMBATSYSTEM.md §9):
 *   final = ((base + flatStatBonuses) × weapon.mult × armour.mult × accessory.mult)
 * Passives and battle buffs apply later, in the combat pipeline — not here.
 */
export interface Equipment {
  id: string;
  slot: ItemSlot;
  name: string;
  description: string;
  /** Display/gating rank, 1+. */
  rank?: number;
  /** Flat stat bonuses added before any multiplicative step. */
  flatStatBonuses?: Partial<StatBlock>;
  /** Multiplicative stat bonuses, e.g. `{ strength: 1.20 }` = +20%. */
  multiplicativeBonuses?: Partial<Record<StatKey, number>>;
  /** Gear CT reduction (0..1). Total across all equipped gear is capped at GEAR_CT_REDUCTION_CAP. */
  ctReductionPercent?: number;
  /** Additive stat skew applied after multipliers (AQ-style lean). */
  statSkewProfile?: Partial<StatBlock>;
  /** If set, the item exposes an active ability — resolves to a SkillDefinition. */
  activeAbilitySkillId?: string;
}

/** An avatar's currently equipped gear, keyed by slot. Missing slot = empty. */
export type EquippedGear = Partial<Record<ItemSlot, string>>;

// ---------------------------------------------------------------------------
// Skill System
// ---------------------------------------------------------------------------

export type SkillType = 'basic' | 'active' | 'passive';
export type SkillCostType = 'none' | 'cooldown' | 'mana' | 'hp' | 'mixed';

/** Damage die types — from small (d4) to large (d12). */
export type DamageDie = 'd4' | 'd6' | 'd8' | 'd10' | 'd12';

/** Critical hit severity tiers, determined by a d12 roll. */
export type CritSeverity = 'minor' | 'major' | 'devastating' | 'perfect';

export type SkillTargetType =
  | 'single_enemy'
  | 'all_enemies'
  | 'random_enemies'
  | 'single_ally'
  | 'all_allies'
  | 'self'
  | 'self_and_allies';

export type SkillEffectTag =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'dot'
  | 'hot'
  | 'taunt'
  | 'stun'
  | 'counter'
  | 'revive'
  | 'dispel'
  | 'steal'
  | 'dodge'
  | 'reflect'
  | 'ko_immunity';

/**
 * Named flavor of a status effect — drives log text, icons, future cleanse and
 * resistance scoping. Every StatusEffect constructed in the engine must carry
 * one. The refresh key in `applyStatusEffect` is `(subtype, sourceSkillId)`,
 * so two different skills with the same subtype coexist on a target — e.g.
 * a Warrior stat buff and a Mage stat buff both live as `'stat_buff'`. Only
 * re-application of the same skill collapses to a single instance.
 */
export type StatusSubtype =
  // damage-over-time flavors
  | 'poison'
  | 'burn'
  | 'bleed'
  // heal-over-time flavors
  | 'regen'
  // control / debuff
  | 'stun'
  // defensive buffs
  | 'shield'
  // ad-hoc stat modifiers
  | 'stat_buff'
  | 'stat_debuff'
  // fallback bucket — try not to use this outside legacy paths
  | 'generic';

/** Valid DoT subtypes — the union of flavors a DoT tickConfig may declare. */
export const DOT_SUBTYPES = ['poison', 'burn', 'bleed'] as const;
export type DotSubtype = typeof DOT_SUBTYPES[number];

/** Valid HoT subtypes — currently only 'regen'. */
export const HOT_SUBTYPES = ['regen'] as const;
export type HotSubtype = typeof HOT_SUBTYPES[number];

/**
 * How re-application of the same subtype is resolved on a target.
 *   refresh → one instance; duration = max(existing, new), tickValue = max.
 *   stack   → push unconditionally. Bleed-style linear accumulation.
 *   unique  → drop re-application silently if any same-subtype instance exists.
 */
export type StackPolicy = 'refresh' | 'stack' | 'unique';

export const STACK_POLICIES: readonly StackPolicy[] = ['refresh', 'stack', 'unique'];

export interface SkillTickEffectConfig {
  /** Per-turn value as fraction of max HP (0.08 = 8% max HP/turn). */
  value: number;
  /** Number of turns this effect should remain active. */
  durationTurns: number;
  /** Flavor for the resulting StatusEffect. Required for DoT/HoT configs. */
  subtype: StatusSubtype;
  /** Stack handling when the same subtype is re-applied. Defaults to 'refresh'. */
  stackPolicy?: StackPolicy;
}

export interface SkillTickConfig {
  hot?: SkillTickEffectConfig;
  dot?: SkillTickEffectConfig;
}

export interface SkillDefinition {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  skillType: SkillType;
  costType: SkillCostType;
  /** Mana cost (if costType is 'mana' or 'mixed'). */
  manaCost: number;
  /** Cooldown in turns (if costType is 'cooldown' or 'mixed'). */
  cooldownTurns: number;
  /** HP cost as fraction of current HP (if costType is 'hp' or 'mixed'). */
  hpCostPct: number;
  /** Primary stat that scales this skill's effect. */
  scalingStat: StatKey | null;
  /** Secondary scaling stat (optional). */
  secondaryScalingStat: StatKey | null;
  /** Base damage/heal value before stat scaling. */
  baseValue: number;
  /** Multiplier applied to scaling stat. */
  skillMultiplier: number;
  /** Target type for this skill. */
  targetType: SkillTargetType;
  /** Number of hits (for multi-hit skills like Rapid Fire). */
  hitCount: number;
  /** Rank at which this skill unlocks (1-10 for primary, 0 for secondary). */
  unlockRank: number;
  /** Semantic tags describing what this skill does. */
  effectTags: SkillEffectTag[];
  /** Optional explicit per-tag tick settings (HoT/DoT). */
  tickConfig?: SkillTickConfig;
  /** CT cost — how much CT is added after using this skill. */
  ctCost: number;
  /** Damage die type for this skill. Defaults based on unlockRank if omitted. */
  damageDie?: DamageDie;
  /** Number of damage dice to roll. Defaults based on unlockRank if omitted. */
  diceCount?: number;
}

/** Passive skill effect — applied as a constant modifier. */
export interface PassiveDefinition {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  skillType: 'passive';
  unlockRank: number;
  effectTags: SkillEffectTag[];
  /**
   * Passive effects are implemented as modifiers in the combat engine.
   * The `modifiers` array describes each effect this passive provides.
   */
  modifiers: PassiveModifier[];
}

export interface PassiveModifier {
  /** What this modifier affects. */
  target: 'self' | 'party' | 'enemies';
  /** The stat or property being modified. */
  property: string;
  /** The type of modification. */
  type: 'flat' | 'percent' | 'conditional';
  /** The value of the modification (percent as decimal, e.g. 0.10 = +10%). */
  value: number;
  /** Condition for conditional modifiers (e.g. 'hp_below_30'). */
  condition?: string;
  /** Max stack count for stackable passives. */
  maxStacks?: number;
  /** Trigger limit per battle (e.g. Second Wind triggers once). */
  triggerLimit?: number;
}

// ---------------------------------------------------------------------------
// Class Definitions
// ---------------------------------------------------------------------------

export interface PrimaryClassDefinition {
  id: PrimaryClassId;
  name: string;
  description: string;
  statBias: { primary: StatKey; secondary: StatKey };
  costBias: SkillCostType;
  /** Starting stat values when this class is selected. */
  baselineStats: StatBlock;
  /** All skills (basic + actives + passives) in unlock order. */
  skills: (SkillDefinition | PassiveDefinition)[];
}

export interface SecondaryClassDefinition {
  id: SecondaryClassId;
  name: string;
  description: string;
  focus: string;
  /** 2 active skills + 2 passives, all unlocked from start. */
  skills: (SkillDefinition | PassiveDefinition)[];
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export type CampaignType = 'solo' | 'group';
export type CampaignStatus = 'active' | 'completed' | 'archived';

export interface Campaign {
  campaignId: string;
  type: CampaignType;
  status: CampaignStatus;
  groupId: string | null;
  ownerUserId: string;
  memberUserIds: string[];
  currentChapter: number;
  currentBossId: string | null;
  bossesDefeated: number;
  totalQuestsCompleted: number;
  totalGoldEarned: number;
  totalXPEarned: number;
  campaignName: string;       // auto-generated display name, e.g. "Vanguard Campaign"
  lastPlayedAt: any;          // Firestore Timestamp — tracks most recent activity
  createdAt: any;             // Firestore Timestamp
  updatedAt: any;
}

/** Maximum number of simultaneously active solo campaigns per user. */
export const MAX_ACTIVE_CAMPAIGNS = 1;

// ---------------------------------------------------------------------------
// Campaign Avatar
// ---------------------------------------------------------------------------

export interface EquippedLoadout {
  basicAttackSkillId: string;
  activeSkillIds: string[];     // max 4
  passiveSkillIds: string[];    // max 5 (determined by classRank)
}

export interface CampaignAvatar {
  userId: string;
  campaignId: string;
  companionCharacterId: string;      // links to existing CharacterId sprite
  primaryClassId: PrimaryClassId;
  secondaryClassId: SecondaryClassId | null;
  classRank: number;                 // 1-10 — convenience, always equals classRanks[primaryClassId]
  classRanks: Record<string, number>;   // per-class rank, e.g. { vanguard: 3, arcanist: 1 }
  classRankXP: Record<string, number>;  // per-class rank XP, e.g. { vanguard: 45, arcanist: 0 }
  campaignLevel: number;
  campaignXP: number;
  stats: StatBlock;
  equippedLoadout: EquippedLoadout;
  /** Currently equipped gear by slot. Optional for legacy avatars. */
  equippedGear?: EquippedGear;
  /** IDs of all owned equipment. Optional for legacy avatars. */
  gearInventory?: string[];
  universalPointsAllocated: number;
  createdAt: any;
  updatedAt: any;
}

/**
 * Returns the number of passive slots available at a given class rank.
 * Rank 2→1, Rank 4→2, Rank 6→3, Rank 8→4, Rank 10→5.
 */
export function getPassiveSlotCount(classRank: number): number {
  if (classRank < 2) return 0;
  return Math.min(5, Math.floor(classRank / 2));
}

/**
 * Returns the number of active skills unlocked at a given class rank.
 * Rank 3→1, Rank 5→2, Rank 7→3, Rank 9→4.
 */
export function getActiveSkillCount(classRank: number): number {
  if (classRank < 3) return 0;
  return Math.min(4, Math.floor((classRank - 1) / 2));
}

/**
 * Returns the class rank XP required to advance from `currentRank` to `currentRank + 1`.
 * Rank 1→2 = 10, Rank 2→3 = 20, ..., Rank 9→10 = 90.
 * Returns Infinity if already at max rank (10).
 */
export function getClassRankXPThreshold(currentRank: number): number {
  if (currentRank >= 10) return Infinity;
  return currentRank * 10;
}

/**
 * Safely read per-class rank from an avatar, handling legacy avatars
 * that don't have the classRanks map yet.
 */
export function getAvatarClassRank(avatar: CampaignAvatar, classId: string): number {
  if (avatar.classRanks?.[classId] != null) return avatar.classRanks[classId];
  // Legacy fallback: if asking for the current primary class, use classRank field
  if (classId === avatar.primaryClassId) return avatar.classRank;
  return 0; // never played this class
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export type QuestType = 'main' | 'side' | 'bounty';
export type QuestStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface EncounterDef {
  enemyArchetype: string;
  enemyLevel: number;
  enemyTraits: string[];
  isBoss: boolean;
  bossId: string | null;
}

export interface QuestReward {
  xp: number;
  gold: number;
  materialId: string | null;
  itemId: string | null;
  classRankXP: number;
}

export interface CampaignQuest {
  questId: string;
  campaignId: string;
  type: QuestType;
  title: string;
  description: string;
  difficulty: number;                // 1-10
  requiredBossesDefeated: number;    // gate for main quests
  encounters: EncounterDef[];        // inline, 1-3
  rewards: QuestReward;
  status: QuestStatus;
  completedAt: any | null;
  completedBy: string[];
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

export type BossStatus = 'active' | 'defeated' | 'fled';

export type BossArchetype =
  | 'the_gourmand'
  | 'the_road_warden'
  | 'the_revelmaster'
  | 'the_hoarder'
  | 'the_siphon'
  | 'the_landlord'
  | 'the_wanderer'
  | 'the_plague_lord'
  | 'the_anomaly';

export type BossTrait = 'balanced' | 'cunning' | 'greedy' | 'precise';

export interface RivalData {
  learnedClassType: PrimaryClassId | null;
  stealChance: number;
  recurrenceScore: number;
  stolenRewardPool: BossReward[];
  fleeCount: number;
}

export interface BossReward {
  xp: number;
  gold: number;
  materialIds: string[];
  itemIds: string[];
  cosmeticId: string | null;
  archiveEntry: boolean;
}

export interface CampaignBoss {
  bossId: string;
  campaignId: string;
  sourceExpenseId: string;
  sourceGroupId: string;
  archetype: BossArchetype;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  phases: number;
  traits: BossTrait[];
  status: BossStatus;
  isRival: boolean;
  rivalData: RivalData | null;
  defeatedAt: any | null;
  defeatedBy: string[];
  rewardsClaimed: boolean;
  rewards: BossReward;
  createdAt: any;
}

// ---------------------------------------------------------------------------
// Combat Engine — Battle State
// ---------------------------------------------------------------------------

export type UnitType = 'player' | 'enemy';
export type BattleResult = 'victory' | 'defeat' | 'in_progress';

export type BattlePhase =
  | 'preparation'
  | 'queueing'
  | 'player_turn'
  | 'enemy_turn'
  | 'resolving'
  | 'reward'
  | 'finished';

export interface QueueUnit {
  unitId: string;
  unitType: UnitType;
  /** Display name. */
  name: string;
  /** Current CT value — when it reaches 0, unit acts. */
  ct: number;
  /** Current stats (baseline + buffs/debuffs applied). */
  currentStats: StatBlock;
  /** Max HP for this battle. */
  maxHp: number;
  /** Max Mana for this battle. */
  maxMana: number;
  /** Current HP. */
  hp: number;
  /** Current Mana. */
  mana: number;
  /** Shield HP (absorbs damage before HP). */
  shield: number;
  /** Whether this unit is KO'd. */
  isKO: boolean;
  /** Active buffs/debuffs. */
  statusEffects: StatusEffect[];
  /** Skill cooldowns — maps skillId to remaining turns. */
  cooldowns: Record<string, number>;
  /** Skills available to this unit. */
  skillIds: string[];
  /** Primary class ID (for players) or archetype (for enemies). */
  classId: string;
  /** Whether this unit is controlled by auto-battle AI. */
  isAutoBattle: boolean;
  /** Passive effects active on this unit. */
  passiveIds: string[];
  /** Companion character ID for sprite rendering (players only). */
  companionCharacterId?: string;
  /**
   * Fraction of skill CT cost removed by equipped gear (0..GEAR_CT_REDUCTION_CAP).
   * Already capped at construction — the combat engine does not re-cap.
   * Undefined is treated as 0 (enemies, legacy units).
   */
  gearCtReduction?: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  /** What stat or property is affected ('dot' | 'hot' | stat key | 'shield' | ...). */
  property: string;
  /**
   * Named flavor — drives tick log text, icon selection, and stack-policy
   * grouping in `applyStatusEffect`. Use `'generic'` for ad-hoc stat buffs.
   */
  subtype: StatusSubtype;
  /** Modification value. */
  value: number;
  /** Turns remaining. */
  turnsRemaining: number;
  /** Source unit ID (who applied this). */
  sourceUnitId: string;
  /** Source skill ID. */
  sourceSkillId: string;
  /** Pre-computed per-tick value for DoT/HoT (set at application via dice roll). */
  tickValue?: number;
}

export type SuccessTier = 'fail' | 'normal' | 'strong' | 'critical';

export interface DiceRoll {
  rollValue: number;      // raw die value
  modifier: number;       // from stats or bonuses
  total: number;          // rollValue + modifier
  purpose: 'attack' | 'damage' | 'damage_dice' | 'crit' | 'crit_severity' | 'dodge' | 'flee';
  isCrit: boolean;        // natural 18-20 on d20, or highest severity on crit
  /** Success tier derived from roll value (legacy — kept for replay compat). */
  tier?: SuccessTier;
}

export interface TurnRecord {
  turnNumber: number;
  actingUnitId: string;
  skillId: string;
  targetUnitIds: string[];
  diceRolls: DiceRoll[];
  damageDealt: Record<string, number>;    // targetUnitId → damage
  healingDone: Record<string, number>;    // targetUnitId → healing
  statusEffectsApplied: StatusEffect[];
  statusEffectsRemoved: string[];         // effect IDs
  resultDescription: string;              // human-readable log line
  /** Highest crit severity this turn (if any hit critted). */
  critSeverity?: CritSeverity;
}

export interface BattleState {
  battleId: string;
  campaignId: string;
  questId: string | null;
  bossId: string | null;
  /** All units in the battle (players + enemies). */
  units: QueueUnit[];
  /** Ordered turn history. */
  turnHistory: TurnRecord[];
  /** All dice rolls for replay. */
  diceHistory: DiceRoll[];
  /** Current turn number. */
  currentTurn: number;
  /** Battle result. */
  result: BattleResult;
  /** ID of the unit whose turn it currently is (null if battle not started or ended). */
  activeUnitId: string | null;
  /** Current phase of the battle state machine. */
  phase: BattlePhase;
  /** Which side won ('players' | 'enemies'), set when battle ends. */
  winner?: 'players' | 'enemies';
  /** True if the battle ended via a successful flee action. */
  fleeFlag?: boolean;
  /** Difficulty level (used for flee threshold calculation). */
  difficulty?: number;
  /** Endless mode: current wave number (1-indexed). */
  endlessWave?: number;
  /** Endless mode: accumulated rewards across completed waves. */
  endlessRewards?: { xp: number; gold: number };
  createdAt: any;
  completedAt: any | null;
}

/** Persisted to Firestore after battle completes. */
export interface BattleEncounter {
  battleId: string;
  campaignId: string;
  questId: string | null;
  bossId: string | null;
  participantIds: string[];
  turnHistory: TurnRecord[];
  diceHistory: DiceRoll[];
  result: BattleResult;
  createdAt: any;
  completedAt: any | null;
}

// ---------------------------------------------------------------------------
// Campaign Archive
// ---------------------------------------------------------------------------

export type ArchiveEntryType =
  | 'boss_defeated'
  | 'chapter_completed'
  | 'quest_completed'
  | 'milestone';

export interface ArchiveEntry {
  entryId: string;
  type: ArchiveEntryType;
  title: string;
  description: string;
  metadata: Record<string, any>;
  earnedRewards: QuestReward[];
  timestamp: any;
}

// ---------------------------------------------------------------------------
// Boss Generation — Expense-to-Boss mapping
// ---------------------------------------------------------------------------

export interface BossArchetypeMapping {
  /** Expense category string that maps to this archetype. */
  expenseCategory: string;
  archetype: BossArchetype;
  namePattern: string;           // e.g. "Glutton of {source}"
  visualFlavor: string;
}

export interface BossGenerationInput {
  expenseId: string;
  groupId: string;
  totalAmount: number;
  category: string;
  itemCount: number;
  participantCount: number;
  splitType: string;
  expenseTitle: string;
}

// ---------------------------------------------------------------------------
// Quest Templates
// ---------------------------------------------------------------------------

export interface MainQuestTemplate {
  chapter: number;
  title: string;
  description: string;
  difficulty: number;
  requiredBossesDefeated: number;
  encounterCount: number;         // 1-3
  rewardScale: number;            // multiplier on base rewards
}

export interface SideQuestGenerator {
  /** Expense category that triggers this side quest type. */
  triggerCategory: string;
  titlePattern: string;
  descriptionPattern: string;
  difficultyRange: { min: number; max: number };
  rewardScale: number;
}

// ---------------------------------------------------------------------------
// Auto-Battle AI
// ---------------------------------------------------------------------------

export type AutoBattlePriority =
  | 'heal_critical'     // Heal if ally HP < 30%
  | 'debuff_boss'       // Apply debuffs to boss
  | 'buff_party'        // Apply buffs to party
  | 'highest_damage'    // Use highest damage skill available
  | 'basic_attack';     // Fallback

export interface AutoBattleConfig {
  priorities: AutoBattlePriority[];
  healThreshold: number;          // fraction of max HP (default 0.3)
}

export const DEFAULT_AUTO_BATTLE_CONFIG: AutoBattleConfig = {
  priorities: ['heal_critical', 'debuff_boss', 'buff_party', 'highest_damage', 'basic_attack'],
  healThreshold: 0.3,
};
