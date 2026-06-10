import type { ConsumableDef, ConsumableId } from './types';
import type { SkillId } from './types/ids';

// ═══════════════════════════════════════════════════════════════════
// STIMS CATALOG — 14 one-shot combat items
// Max 3 carried. Found as loot, bought at merchants, or from events.
// Used as a free action (no CT cost) during player's turn.
// ═══════════════════════════════════════════════════════════════════

export const STIMS: readonly ConsumableDef[] = [
  // ── COMMON (5) ────────────────────────────────────────────────
  {
    id: 'stim.adrenal',
    name: 'Adrenal Stim',
    description: 'Inject a combat stimulant. Your next attack deals +40% damage.',
    effectLabel: 'Next attack: +40% damage',
    rarity: 'common',
    effect: 'damage_boost',
    value: 40,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.nano_repair',
    name: 'Nano-Repair Patch',
    description: 'Deploy medical nanites. Instantly heal 25% of max HP.',
    effectLabel: 'Heal 25% HP',
    rarity: 'common',
    effect: 'heal',
    value: 25,
    requirePlayerTurn: false,
  },
  {
    id: 'stim.barrier_injector',
    name: 'Barrier Injector',
    description: 'Temporary energy barrier. Gain shield equal to 15% of max HP.',
    effectLabel: '+15% HP shield',
    rarity: 'common',
    effect: 'shield_grant',
    value: 15,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.mp_cell',
    name: 'MP Capacitor Cell',
    description: 'Quick-charge your arcane reserves. Restore 30% of max MP.',
    effectLabel: 'Restore 30% MP',
    rarity: 'common',
    effect: 'mp_restore',
    value: 30,
    requirePlayerTurn: false,
  },
  {
    id: 'stim.cleanse_ampoule',
    name: 'Cleanse Ampoule',
    description: 'Nano-fluid that purges foreign agents. Remove 1 random debuff.',
    effectLabel: 'Cleanse 1 debuff',
    rarity: 'common',
    effect: 'cleanse_debuff',
    value: 1,
    requirePlayerTurn: false,
  },

  // ── UNCOMMON (5) ──────────────────────────────────────────────
  {
    id: 'stim.overclock',
    name: 'Overclock Injector',
    description: 'Override safety limiters. Instantly reset your CT to 0 — act again immediately.',
    effectLabel: 'Instant CT reset',
    rarity: 'uncommon',
    effect: 'ct_reset',
    value: 0,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.emp_grenade',
    name: 'EMP Grenade',
    description: 'Discharge an electromagnetic pulse. Stun target enemy for 1 full turn.',
    effectLabel: 'Stun target 1 turn',
    rarity: 'uncommon',
    effect: 'stun_target',
    value: 1,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.phase_shift',
    name: 'Phase Shift Module',
    description: 'Briefly phase out of sync. Dodge the next incoming attack entirely.',
    effectLabel: 'Dodge next attack',
    rarity: 'uncommon',
    effect: 'dodge_next',
    value: 1,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.data_spike',
    name: 'Data Spike',
    description: 'Breach enemy tactical network. Reveal target enemy intent for 3 turns.',
    effectLabel: 'Reveal enemy intent 3 turns',
    rarity: 'uncommon',
    effect: 'reveal_intent',
    value: 3,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.ct_scrambler',
    name: 'CT Scrambler',
    description: 'Jam enemy targeting systems. Delay target enemy CT by +25 ticks.',
    effectLabel: 'Delay enemy CT +25',
    rarity: 'uncommon',
    effect: 'ct_delay',
    value: 25,
    requirePlayerTurn: true,
  },

  // ── RARE (4) ──────────────────────────────────────────────────
  {
    id: 'stim.crit_guarantor',
    name: 'Precision Calibrator',
    description: 'Neural targeting assist. Your next 2 attacks are guaranteed critical hits.',
    effectLabel: 'Next 2 attacks: guaranteed crit',
    rarity: 'rare',
    effect: 'crit_guarantee',
    value: 2,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.cooldown_reset',
    name: 'Cooldown Bypass',
    description: 'Jury-rig your skill systems. Reset all skill cooldowns to 0.',
    effectLabel: 'Reset all cooldowns',
    rarity: 'rare',
    effect: 'cooldown_reset',
    value: 0,
    requirePlayerTurn: true,
  },
  {
    id: 'stim.full_restore',
    name: 'Full Restore Ampoule',
    description: 'Military-grade recovery nanites. Heal 50% HP, restore 50% MP, and cleanse all debuffs.',
    effectLabel: 'Heal 50% HP + 50% MP + full cleanse',
    rarity: 'rare',
    effect: 'heal',
    value: 50,
    requirePlayerTurn: false,
  },
  {
    id: 'stim.phantom_drive',
    name: 'Phantom Drive',
    description: 'Overload phase circuits. Gain Stealth and +30% damage for 2 turns.',
    effectLabel: 'Stealth + 30% damage, 2 turns',
    rarity: 'rare',
    effect: 'damage_boost',
    value: 30,
    requirePlayerTurn: true,
  },
];

export const STIM_BY_ID: ReadonlyMap<ConsumableId, ConsumableDef> = new Map(
  STIMS.map((stim) => [stim.id, stim]),
);

// ─── Helpers ──────────────────────────────────────────────────────

/** Stim IDs that can appear from common loot drops. */
export const COMMON_STIM_IDS: readonly ConsumableId[] =
  STIMS.filter((s) => s.rarity === 'common').map((s) => s.id);

/** Stim IDs that can appear from elite/boss loot. */
export const UNCOMMON_STIM_IDS: readonly ConsumableId[] =
  STIMS.filter((s) => s.rarity === 'uncommon').map((s) => s.id);

/** Stim IDs that only appear from rare events or boss drops. */
export const RARE_STIM_IDS: readonly ConsumableId[] =
  STIMS.filter((s) => s.rarity === 'rare').map((s) => s.id);

/** Maximum number of stims the player can carry at once. */
export const MAX_CARRIED_STIMS = 3;

/**
 * Weighted random stim selection based on rarity.
 * Common: 55%, Uncommon: 30%, Rare: 15%
 */
export const pickRandomStim = (
  rng: () => number,
  allowRare: boolean = false,
): ConsumableId => {
  const roll = rng();
  if (allowRare && roll < 0.15) {
    return RARE_STIM_IDS[Math.floor(rng() * RARE_STIM_IDS.length)];
  }
  if (roll < 0.45) {
    return UNCOMMON_STIM_IDS[Math.floor(rng() * UNCOMMON_STIM_IDS.length)];
  }
  return COMMON_STIM_IDS[Math.floor(rng() * COMMON_STIM_IDS.length)];
};

// ─── Stim → Skill Mapping ────────────────────────────────────────

/**
 * Map each ConsumableId to its corresponding item SkillId.
 * The engine resolves stims by looking up the skill via skillLookup(itemSkillId).
 */
const STIM_TO_SKILL_MAP: ReadonlyMap<ConsumableId, SkillId> = new Map([
  ['stim.adrenal',           'item.adrenal_stim'],
  ['stim.nano_repair',       'item.nano_repair'],
  ['stim.barrier_injector',  'item.barrier_injector'],
  ['stim.mp_cell',           'item.mp_cell'],
  ['stim.cleanse_ampoule',   'item.cleanse_ampoule'],
  ['stim.overclock',         'item.overclock_injector'],
  ['stim.emp_grenade',       'item.emp_grenade'],
  ['stim.phase_shift',       'item.phase_shift'],
  ['stim.data_spike',        'item.data_spike'],
  ['stim.ct_scrambler',      'item.ct_scrambler'],
  ['stim.crit_guarantor',    'item.precision_calibrator'],
  ['stim.cooldown_reset',    'item.cooldown_bypass'],
  ['stim.full_restore',      'item.full_restore'],
  ['stim.phantom_drive',     'item.phantom_drive'],
]);

/** Get the SkillId that the engine should resolve when using a given stim. */
export const getStimSkillId = (stimId: ConsumableId): SkillId | undefined =>
  STIM_TO_SKILL_MAP.get(stimId);
