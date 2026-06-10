import type { InnDecisionDef, RunPassiveDef, RunPassiveId } from './types';

// ═══════════════════════════════════════════════════════════════════
// RUN PASSIVES — 40 total (6 per element + 4 wildcard)
// Drafted every 3 stages (3, 6, 9, 12, 15, 18, 21, 24, 27)
// Max 9 per run. Each pick is 1-of-3.
// Sci-fi themed: Thermal / Cryo / Void / Radiant / Kinetic / Digital
// Trait tiers unlock at 2/4/6 passives of the same element.
// Wildcards are stronger but grant no trait progress.
// ═══════════════════════════════════════════════════════════════════

export const RUN_PASSIVES: readonly RunPassiveDef[] = [
  // ── THERMAL (6) ──────────────────────────────────────────────
  {
    id: 'passive.fire_ignition',
    name: 'Ignition Protocol',
    description: 'First fire skill each battle deals double damage.',
    effectLabel: 'First fire skill: 2× damage',
    draftStageInterval: 3,
    tags: ['thermal'],
  },
  {
    id: 'passive.fire_thermal',
    name: 'Thermal Feedback',
    description: 'When you apply burn to an enemy, heal 3% of your max HP.',
    effectLabel: 'Apply burn → heal 3% HP',
    draftStageInterval: 3,
    tags: ['thermal'],
  },
  {
    id: 'passive.fire_overheat',
    name: 'Overheat Core',
    description: 'Thermal skills cost 10% less CT and deal 15% more damage.',
    effectLabel: 'Thermal: −10% CT cost, +15% damage',
    draftStageInterval: 3,
    tags: ['thermal'],
  },
  {
    id: 'passive.fire_scorched',
    name: 'Scorched Earth',
    description: 'Defeating an enemy with thermal damage applies 1 burn stack to all remaining enemies.',
    effectLabel: 'Thermal kill → 1 burn to all enemies',
    draftStageInterval: 3,
    tags: ['thermal'],
  },
  {
    id: 'passive.thermal_afterburn',
    name: 'Afterburn Protocol',
    description: 'After using a thermal skill, your next basic attack deals +25% bonus thermal damage.',
    effectLabel: 'Thermal skill → next basic +25%',
    draftStageInterval: 3,
    tags: ['thermal'],
  },
  {
    id: 'passive.thermal_meltdown',
    name: 'Meltdown',
    description: 'When an enemy dies with Burn active, explode for 15% of their max HP as thermal damage to all enemies.',
    effectLabel: 'Burn death → 15% HP AoE',
    draftStageInterval: 3,
    tags: ['thermal'],
  },

  // ── CRYO (6) ─────────────────────────────────────────────────
  {
    id: 'passive.frost_cryo',
    name: 'Cryo-Lock Protocol',
    description: 'Frost skills delay enemy CT by an additional +10 ticks.',
    effectLabel: 'Frost: +10 CT delay on hit',
    draftStageInterval: 3,
    tags: ['cryo'],
  },
  {
    id: 'passive.frost_armor',
    name: 'Permafrost Armor',
    description: 'Gain shield equal to 8% of max HP at battle start. Doubled if Cryo trait is active.',
    effectLabel: '8–16% HP as shield at start',
    draftStageInterval: 3,
    tags: ['cryo'],
  },
  {
    id: 'passive.frost_flash',
    name: 'Flash Freeze',
    description: 'First time falling below 30% HP each battle, freeze all enemies for 1 CT tick.',
    effectLabel: '<30% HP → freeze all enemies',
    draftStageInterval: 3,
    tags: ['cryo'],
  },
  {
    id: 'passive.frost_glacial',
    name: 'Glacial Momentum',
    description: 'Each consecutive cryo skill reduces the next cryo skill CT cost by 5 (max −15).',
    effectLabel: 'Cryo chain: −5 CT per cast (max 15)',
    draftStageInterval: 3,
    tags: ['cryo'],
  },
  {
    id: 'passive.cryo_shatter',
    name: 'Shatter Protocol',
    description: 'Attacks against CT-frozen enemies deal +40% damage and consume the freeze.',
    effectLabel: '+40% dmg vs frozen, consumes freeze',
    draftStageInterval: 3,
    tags: ['cryo'],
  },
  {
    id: 'passive.cryo_hailstorm',
    name: 'Hailstorm Core',
    description: 'Every 12s in combat, apply 1 Chill stack to all enemies.',
    effectLabel: 'Every 12s: AoE Chill',
    draftStageInterval: 3,
    tags: ['cryo'],
  },

  // ── VOID (6) ─────────────────────────────────────────────────
  {
    id: 'passive.shadow_ghost',
    name: 'Ghost Protocol',
    description: 'First attack from stealth each battle is a guaranteed critical hit.',
    effectLabel: 'Stealth opener: guaranteed crit',
    draftStageInterval: 3,
    tags: ['void'],
  },
  {
    id: 'passive.shadow_leech',
    name: 'Umbral Leech',
    description: 'Void damage heals you for 12% of damage dealt.',
    effectLabel: '12% void lifesteal',
    draftStageInterval: 3,
    tags: ['void'],
  },
  {
    id: 'passive.shadow_cloak',
    name: 'Cloak & Dagger',
    description: 'After using a void skill, gain Stealth for 1 CT tick (avoid enemy targeting).',
    effectLabel: 'Void skill → stealth 1 tick',
    draftStageInterval: 3,
    tags: ['void'],
  },
  {
    id: 'passive.shadow_economy',
    name: 'Shadow Economy',
    description: 'Defeating an enemy with a void skill grants +15% bonus gold for that stage.',
    effectLabel: 'Void kill: +15% stage gold',
    draftStageInterval: 3,
    tags: ['void'],
  },
  {
    id: 'passive.void_event_horizon',
    name: 'Event Horizon',
    description: 'When you drop below 20% HP, gain Stealth and +30% void damage for 8s. Once per battle.',
    effectLabel: '<20% HP → Stealth +30% void dmg',
    draftStageInterval: 3,
    tags: ['void'],
  },
  {
    id: 'passive.void_singularity',
    name: 'Singularity Drive',
    description: 'Every 5th void hit pulls the target, delaying their CT by +20.',
    effectLabel: 'Every 5th void hit: +20 CT delay',
    draftStageInterval: 3,
    tags: ['void'],
  },

  // ── RADIANT (6) ──────────────────────────────────────────────
  {
    id: 'passive.light_emergency',
    name: 'Emergency Broadcast',
    description: 'When falling below 25% HP, instantly heal 20% of max HP. Once per battle.',
    effectLabel: '<25% HP → heal 20% (1×/battle)',
    draftStageInterval: 3,
    tags: ['radiant'],
  },
  {
    id: 'passive.light_overheal',
    name: 'Overheal Converter',
    description: 'Excess healing beyond max HP converts to shield (up to 15% max HP).',
    effectLabel: 'Overheal → shield (max 15% HP)',
    draftStageInterval: 3,
    tags: ['radiant'],
  },
  {
    id: 'passive.light_cleanse',
    name: 'Radiant Cleanse',
    description: 'At battle start, cleanse 1 debuff. If Radiant trait is active, cleanse 2 instead.',
    effectLabel: 'Cleanse 1–2 debuffs at start',
    draftStageInterval: 3,
    tags: ['radiant'],
  },
  {
    id: 'passive.light_beacon',
    name: 'Beacon of Hope',
    description: 'While above 75% HP, all damage dealt is increased by 10%.',
    effectLabel: '>75% HP → +10% all damage',
    draftStageInterval: 3,
    tags: ['radiant'],
  },
  {
    id: 'passive.radiant_lens',
    name: 'Focusing Lens',
    description: 'Single-target radiant skills deal +20% damage but lose any AoE capability.',
    effectLabel: '+20% radiant single-target dmg',
    draftStageInterval: 3,
    tags: ['radiant'],
  },
  {
    id: 'passive.radiant_echo',
    name: 'Photon Echo',
    description: 'When you receive healing, 15% of the amount also heals a random ally (or self if solo).',
    effectLabel: 'Healing splashes 15%',
    draftStageInterval: 3,
    tags: ['radiant'],
  },

  // ── KINETIC (6) ──────────────────────────────────────────────
  {
    id: 'passive.physical_momentum',
    name: 'Momentum',
    description: 'Consecutive physical attacks gain +8% damage each (stacks 3×). Resets on non-physical action.',
    effectLabel: 'Physical chain: +8/16/24% damage',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },
  {
    id: 'passive.physical_breach',
    name: 'Breach & Clear',
    description: 'Critical hits with kinetic skills ignore 30% of enemy defense.',
    effectLabel: 'Kinetic crit: ignore 30% defense',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },
  {
    id: 'passive.physical_adrenal',
    name: 'Adrenal Surge',
    description: 'When HP drops below 50%, gain +15% CT speed for the rest of the battle.',
    effectLabel: '<50% HP → +15% CT speed',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },
  {
    id: 'passive.physical_scavenger',
    name: "Scavenger's Instinct",
    description: 'Elite room rewards include one bonus gear drop.',
    effectLabel: 'Elite rooms: +1 bonus gear',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },
  {
    id: 'passive.kinetic_ricochet',
    name: 'Ricochet Rounds',
    description: 'Kinetic crits have a 30% chance to hit a second random enemy for 50% damage.',
    effectLabel: 'Kinetic crit: 30% ricochet (50% dmg)',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },
  {
    id: 'passive.kinetic_juggernaut',
    name: 'Juggernaut Protocol',
    description: 'Gain +3% defense for each consecutive kinetic hit (max +15%). Resets on non-kinetic action.',
    effectLabel: '+3% def per kinetic hit (max 15%)',
    draftStageInterval: 3,
    tags: ['kinetic'],
  },

  // ── DIGITAL (6) ──────────────────────────────────────────────
  {
    id: 'passive.arcane_overflow',
    name: 'Overflow Protocol',
    description: 'When MP is full, excess regeneration converts to +25% damage on your next arcane skill.',
    effectLabel: 'Full MP → +25% next arcane hit',
    draftStageInterval: 3,
    tags: ['digital'],
  },
  {
    id: 'passive.arcane_echo',
    name: 'Spell Fork',
    description: '25% chance to cast a digital skill a second time at 50% effectiveness.',
    effectLabel: '25% spell fork (50% power)',
    draftStageInterval: 3,
    tags: ['digital'],
  },
  {
    id: 'passive.arcane_siphon',
    name: 'Data Siphon',
    description: 'Digital skills restore MP equal to 8% of damage dealt.',
    effectLabel: 'Digital: 8% damage → MP',
    draftStageInterval: 3,
    tags: ['digital'],
  },
  {
    id: 'passive.arcane_tear',
    name: 'Reality Tear',
    description: 'Once per battle, reset the cooldown of a random digital skill on cooldown.',
    effectLabel: '1×/battle: reset digital cooldown',
    draftStageInterval: 3,
    tags: ['digital'],
  },
  {
    id: 'passive.digital_firewall',
    name: 'Firewall',
    description: 'At battle start, gain a digital barrier that absorbs the first incoming debuff.',
    effectLabel: 'Absorb first debuff each battle',
    draftStageInterval: 3,
    tags: ['digital'],
  },
  {
    id: 'passive.digital_overclock',
    name: 'System Overclock',
    description: 'Every 3rd digital skill cast has its cooldown instantly reset.',
    effectLabel: 'Every 3rd digital: reset cooldown',
    draftStageInterval: 3,
    tags: ['digital'],
  },

  // ── WILDCARD (4) — stronger individual effects, no trait progress ──
  {
    id: 'passive.wild_vault',
    name: 'Vault Gambler',
    description: 'Your vault streak multiplier starts at 1.5× instead of 1.0×. Higher risk, higher reward.',
    effectLabel: 'Vault multiplier: 1.5× base',
    draftStageInterval: 3,
    // No tags — wildcard, no trait progress
  },
  {
    id: 'passive.wild_merchant',
    name: 'Black Market Access',
    description: 'All shop and merchant prices reduced by 25%. Merchant rooms always stock 1 rare item.',
    effectLabel: '−25% prices, +1 rare stock',
    draftStageInterval: 3,
  },
  {
    id: 'passive.wild_map',
    name: 'Full Map Hack',
    description: 'Reveal ALL room types and conditions on the current map layer.',
    effectLabel: 'Reveal all rooms + conditions',
    draftStageInterval: 3,
  },
  {
    id: 'passive.wild_adaptive',
    name: 'Adaptive Circuitry',
    description: 'Gain +5% to all stats for each different trait tier active (max +45% at 6 traits × tier 3).',
    effectLabel: '+5% all stats per active trait tier',
    draftStageInterval: 3,
  },
];

export const RUN_PASSIVE_BY_ID: ReadonlyMap<RunPassiveId, RunPassiveDef> = new Map(
  RUN_PASSIVES.map((passive) => [passive.id, passive]),
);

// ═══════════════════════════════════════════════════════════════════
// INN DECISIONS — 10 total (rest node choices)
// ═══════════════════════════════════════════════════════════════════

export const INN_DECISIONS: readonly InnDecisionDef[] = [
  {
    id: 'inn.recover',
    name: 'Recover',
    description: 'Restore a significant portion of HP before the next combat.',
    effectLabel: 'Heal 35% HP',
  },
  {
    id: 'inn.cleanse',
    name: 'Cleanse',
    description: 'Remove one negative status effect at the next battle start.',
    effectLabel: 'Cleanse 1 debuff',
  },
  {
    id: 'inn.focus',
    name: 'Focus Drill',
    description: 'Grant a temporary battle opener buff — start with +15 CT advantage.',
    effectLabel: '+15 opening CT',
  },
  {
    id: 'inn.repair',
    name: 'Gear Repair',
    description: 'Restore durability to all equipped gear and gain +5% defense for the next stage.',
    effectLabel: 'Repair gear, +5% defense',
  },
  {
    id: 'inn.intel',
    name: 'Intel Gathering',
    description: 'Reveal all room types on the current map layer before choosing your next room.',
    effectLabel: 'Reveal all current-layer rooms',
  },
  {
    id: 'inn.salvage',
    name: 'Salvage Run',
    description: 'Scavenge the area for resources. Gain 30–60 gold immediately.',
    effectLabel: 'Gain 30–60 gold',
  },
  {
    id: 'inn.overclock',
    name: 'Overclock Rest',
    description: 'Push your systems harder. +10% damage for next stage, but −8% max HP.',
    effectLabel: '+10% damage / −8% HP',
  },
  {
    id: 'inn.meditate',
    name: 'Deep Meditation',
    description: 'Regenerate 40% of max MP and reduce all skill cooldowns by 1 turn.',
    effectLabel: '+40% MP, −1 cooldown',
  },
  {
    id: 'inn.trade',
    name: 'Black Market Contact',
    description: 'A shady vendor appears. Sell one gear piece for 1.5× its value.',
    effectLabel: 'Sell 1 gear at 1.5× price',
  },
  {
    id: 'inn.recon',
    name: 'Tactical Recon',
    description: 'Study enemy patterns. First enemy action in the next battle is fully revealed.',
    effectLabel: 'Reveal enemy opener intent',
  },
];
