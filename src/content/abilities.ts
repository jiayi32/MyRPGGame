// ─── Abilities Catalog ────────────────────────────────────────────
// Sci-fi tech abilities replacing the fantasy Skill definitions.
// Used by the combat engine for action resolution.

import type { Skill, SkillTag } from './types/skill';
import type { SciFiDamageType } from './types/damageTypes';

// ─── Helpers ────────────────────────────────────────────────────────

function ability(
  id: string,
  name: string,
  desc: string,
  ctCost: number,
  cooldownSec: number,
  target: Skill['target'],
  tags: SkillTag[],
  effects: Skill['effects'],
  resourceType: Skill['resource']['type'] = 'MP',
  resourceCost: number = 0,
): Skill {
  return {
    id,
    name,
    description: desc,
    ctCost,
    cooldownSec,
    target,
    tags,
    effects,
    resource: { type: resourceType, cost: resourceCost },
  };
}

function dmg(
  desc: string,
  magnitude: number,
  dmgType: SciFiDamageType,
  chance: number = 100,
): Skill['effects'][number] {
  return {
    kind: 'damage',
    description: desc,
    magnitude,
    magnitudeUnit: 'percent',
    damageType: dmgType as any, // SciFiDamageType maps to legacy DamageType via engine
    chance,
  };
}

function dot(desc: string, magnitude: number, dmgType: SciFiDamageType, durationSec: number): Skill['effects'][number] {
  return {
    kind: 'dot',
    description: desc,
    magnitude,
    magnitudeUnit: 'percent',
    damageType: dmgType as any,
    durationSec,
    stacks: 1,
  };
}

function buff(desc: string, stat: string, magnitude: number, durationSec: number): Skill['effects'][number] {
  return {
    kind: 'buff',
    description: desc,
    magnitude,
    magnitudeUnit: 'percent',
    statTag: stat,
    durationSec,
  };
}

function debuff(desc: string, stat: string, magnitude: number, durationSec: number): Skill['effects'][number] {
  return {
    kind: 'debuff',
    description: desc,
    magnitude,
    magnitudeUnit: 'percent',
    statTag: stat,
    durationSec,
  };
}

function shield(desc: string, magnitude: number, durationSec: number): Skill['effects'][number] {
  return {
    kind: 'shield',
    description: desc,
    magnitude,
    magnitudeUnit: 'flat',
    durationSec,
  };
}

function ctShift(desc: string, amount: number): Skill['effects'][number] {
  return {
    kind: 'ct_shift',
    description: desc,
    magnitude: amount,
    magnitudeUnit: 'flat',
  };
}

function heal(desc: string, magnitude: number): Skill['effects'][number] {
  return {
    kind: 'heal',
    description: desc,
    magnitude,
    magnitudeUnit: 'percent',
  };
}

// ─── Basic Attacks ──────────────────────────────────────────────────

export const ABILITIES: Record<string, Skill> = {
  // ── Basic Attacks (CT=0, no cooldown) ──
  'skill.plasma_burst': ability('skill.plasma_burst', 'Plasma Burst', 'Fire a burst of superheated plasma at a single target.', 0, 0, 'single', ['ranged'], [dmg('Plasma damage', 100, 'plasma')], 'none', 0),
  'skill.shield_bash': ability('skill.shield_bash', 'Shield Bash', 'Bash with a kinetic shield. Reduces damage taken this turn.', 0, 0, 'single', ['burst'], [dmg('Kinetic damage', 85, 'kinetic'), buff('Self defense', 'defense', 20, 3)], 'none', 0),
  'skill.data_slice': ability('skill.data_slice', 'Data Slice', 'Corrupt target systems with a data-blade. 15% chance to apply random debuff.', 0, 0, 'single', ['control'], [dmg('Data damage', 90, 'data')], 'none', 0),
  'skill.quick_strike': ability('skill.quick_strike', 'Quick Strike', 'A lightning-fast strike. Builds 1 Momentum.', 0, 0, 'single', ['sustain'], [dmg('Kinetic damage', 80, 'kinetic'), buff('Self speed', 'speed', 5, 3)], 'none', 0),
  'skill.arc_bolt': ability('skill.arc_bolt', 'Arc Bolt', 'Fire an electrical bolt. 20% chance to chain to a nearby enemy.', 0, 0, 'single', ['ranged'], [dmg('Electro damage', 95, 'electro')], 'none', 0),
  // Defend + Items (universal)
  'skill.defend': ability('skill.defend', 'Defend', 'Take a defensive stance. +30% defense for 8s. Reduces next action CT by 20.', 10, 0, 'self', [], [buff('Defense up', 'defense', 30, 8)], 'none', 0),
  'skill.use_stimpack': ability('skill.use_stimpack', 'Stimpack', 'Combat stim. Restores 25% HP.', 15, 30, 'self', [], [heal('HP restored', 25)], 'none', 0),
  'skill.use_energy_cell': ability('skill.use_energy_cell', 'Energy Cell', 'Recharges power. Restores 30% MP.', 15, 30, 'self', [], [{ kind: 'heal', description: 'MP restored', magnitude: 30, magnitudeUnit: 'mp_percent' }], 'none', 0),

  // ── Nova Dynamics Abilities ──
  'skill.heat_vent': ability('skill.heat_vent', 'Heat Vent', 'Vent all accumulated Heat stacks. +15% damage per stack vented.', 50, 8, 'single', ['burst'], [dmg('Vented plasma damage', 120, 'plasma')], 'MP', 15),
  'skill.thermal_lance': ability('skill.thermal_lance', 'Thermal Lance', 'A piercing beam of concentrated plasma. Pierces 30% defense.', 65, 10, 'single', ['ranged', 'defense_break'], [dmg('Piercing plasma damage', 150, 'plasma')], 'MP', 25),
  'skill.supernova_slash': ability('skill.supernova_slash', 'Supernova Slash', 'A wide arc of stellar plasma hitting all enemies. Generates max Heat.', 90, 20, 'area', ['aoe', 'burst'], [dmg('AoE plasma damage', 180, 'plasma')], 'MP', 40),
  'skill.fusion_beam': ability('skill.fusion_beam', 'Fusion Beam', 'Channel stellar-core energy. Hits all enemies in a line. Instant max Heat.', 120, 30, 'cone', ['cone', 'ultimate'], [dmg('Fusion damage', 250, 'plasma'), dot('Plasma burn', 30, 'plasma', 10)], 'MP', 60),
  'skill.chain_lightning': ability('skill.chain_lightning', 'Chain Lightning', 'Lightning jumps to up to 3 nearby targets.', 55, 8, 'area', ['aoe', 'multi-hit'], [dmg('Electro damage', 100, 'electro')], 'MP', 20),
  'skill.emp_burst': ability('skill.emp_burst', 'EMP Burst', 'Disable enemy electronics. Stuns target for 1 turn.', 70, 25, 'single', ['control'], [dmg('Electro damage', 60, 'electro'), debuff('Stun', 'stun', 100, 5)], 'MP', 30),
  'skill.overcharge': ability('skill.overcharge', 'Overcharge', 'Overload your own systems. +30% damage for 10s, but take 10% HP as recoil.', 30, 15, 'self', ['self-sacrifice'], [buff('Self damage boost', 'strength', 30, 10)], 'HP', 10),
  'skill.ion_storm': ability('skill.ion_storm', 'Ion Storm', 'Create a persistent electrical storm. AoE DoT for 15 seconds.', 100, 30, 'area', ['aoe', 'dot', 'ultimate'], [dot('Ion storm damage', 40, 'electro', 15), debuff('Slowed', 'speed', 20, 15)], 'MP', 50),

  // ── Aegis Core Abilities ──
  'skill.fortify': ability('skill.fortify', 'Fortify', 'Reinforce defenses. Gain 3 Guard stacks and a shield.', 40, 12, 'self', ['defense_break'], [shield('Kinetic shield', 150, 10)], 'none', 0),
  'skill.kinetic_redirect': ability('skill.kinetic_redirect', 'Kinetic Redirect', 'Absorb incoming damage and redirect 50% back at attacker.', 50, 18, 'self', ['counter'], [buff('Self defense', 'defense', 40, 5), dmg('Redirected damage', 50, 'kinetic')], 'none', 0),
  'skill.bastion_wall': ability('skill.bastion_wall', 'Bastion Wall', 'Create a massive barrier. Grant shield to all allies equal to 30% max HP.', 80, 25, 'global', ['defense_break'], [shield('Bastion shield', 300, 15)], 'none', 0),
  'skill.unstoppable_charge': ability('skill.unstoppable_charge', 'Unstoppable Charge', 'Charge through enemies. Deal damage + break enemy guard. Consume all Guard stacks for +10% damage each.', 110, 30, 'area', ['aoe', 'ultimate'], [dmg('Charge damage', 200, 'kinetic'), debuff('Defense broken', 'defense', 30, 8)], 'none', 0),

  // ── Umbral Net Abilities ──
  'skill.shadow_step': ability('skill.shadow_step', 'Shadow Step', 'Instantly reposition in stealth. Next attack gains +25% crit chance.', 15, 10, 'self', ['ct_manipulation'], [buff('Stealth crit', 'critChance', 25, 5)], 'MP', 10),
  'skill.backdoor_exploit': ability('skill.backdoor_exploit', 'Backdoor Exploit', 'Exploit a vulnerability. Ignores 50% defense. Must be stealthed.', 60, 12, 'single', ['defense_break'], [dmg('Exploit damage', 180, 'data')], 'MP', 25),
  'skill.system_crash': ability('skill.system_crash', 'System Crash', 'Overload enemy systems. If target below 30% HP, execute.', 80, 20, 'single', ['execute'], [dmg('Crash damage', 160, 'data')], 'MP', 35),
  'skill.total_wipe': ability('skill.total_wipe', 'Total Wipe', 'Delete a non-boss enemy from the Grid. Must be stealthed. 3-min cooldown.', 100, 180, 'single', ['execute', 'ultimate'], [dmg('Wipe damage', 999, 'true')], 'MP', 80),

  // ── Slipstream Abilities ──
  'skill.momentum_swing': ability('skill.momentum_swing', 'Momentum Swing', 'Build significant Momentum. Gain +2 Momentum stacks.', 35, 6, 'single', ['sustain'], [dmg('Kinetic damage', 110, 'kinetic')], 'none', 0),
  'skill.after_image': ability('skill.after_image', 'After Image', 'Move so fast you leave an afterimage. +30% evasion for 8 seconds.', 25, 14, 'self', [], [buff('Self evasion', 'speed', 30, 8)], 'none', 0),
  'skill.triple_slash': ability('skill.triple_slash', 'Triple Slash', 'Three rapid strikes. Each hit builds Momentum separately.', 45, 8, 'single', ['multi-hit'], [dmg('First slash', 60, 'kinetic'), dmg('Second slash', 60, 'kinetic'), dmg('Third slash', 60, 'kinetic')], 'none', 0),
  'skill.cyclone_barrage': ability('skill.cyclone_barrage', 'Cyclone Barrage', 'A whirlwind of attacks hitting all enemies. Resets Momentum to max stacks on completion.', 75, 25, 'area', ['aoe', 'multi-hit', 'ultimate'], [dmg('Cyclone damage', 140, 'kinetic')], 'none', 0),
};
