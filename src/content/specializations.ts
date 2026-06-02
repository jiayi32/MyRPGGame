// ─── Specializations Catalog ──────────────────────────────────────
// Sci-fi specializations replacing the fantasy ClassData.
// Each corp has a tech tree: T1 (starter) → T2 → T3 → T4 → T5 (apex).

import type { ClassData } from './types/class';
import type { TechTier } from './types/corporation';

// ─── Helper ────────────────────────────────────────────────────────

function spec(
  id: string,
  name: string,
  corpId: string,
  tier: TechTier,
  role: ClassData['role'],
  archetype: ClassData['combatArchetype'],
  ctProfile: ClassData['ctProfile'],
  resource: ClassData['primaryResource'],
  basicAtk: string,
  skillIds: string[],
  description: string,
  gearSynergy: string,
  evolutionTargets: string[] = [],
): ClassData {
  return {
    id,
    name,
    lineageId: corpId,
    tier: tier as ClassData['tier'],
    role,
    combatArchetype: archetype,
    ctProfile,
    ctRange: { min: 0, max: 0 },
    primaryResource: resource,
    basicAttackSkillId: basicAtk,
    skillIds,
    passives: [],
    evolutionTargetClassIds: evolutionTargets,
    description,
    gearSynergy,
    damageIdentity: archetype,
    survivalIdentity: role === 'Tank' ? 'shield+defense' : 'evasion+lifesteal',
  };
}

// ─── T1 Specializations (Starters, 4 options) ─────────────────────

export const SPECIALIZATIONS: Record<string, ClassData> = {
  // ── Nova Dynamics T1 ──
  'nova_dynamics.t1.plasma_runner': spec(
    'nova_dynamics.t1.plasma_runner',
    'Plasma Runner',
    'nova_dynamics', 1,
    'DPS', 'burst_dps', 'Fast', 'MP',
    'skill.plasma_burst',
    ['skill.plasma_burst', 'skill.heat_vent', 'skill.thermal_lance'],
    'A frontline striker wielding plasma-charged blades. Builds Heat with every strike, then vents it in a devastating thermal explosion.',
    'Weapon: Plasma Blades (+plasma dmg). Armor: Heat Sinks (-overheat penalty).',
  ),

  // ── Aegis Core T1 ──
  'aegis_core.t1.barrier_sentinel': spec(
    'aegis_core.t1.barrier_sentinel',
    'Barrier Sentinel',
    'aegis_core', 1,
    'Tank', 'tank', 'Slow', 'None',
    'skill.shield_bash',
    ['skill.shield_bash', 'skill.fortify', 'skill.kinetic_redirect'],
    'An immovable defender equipped with a reactive shield generator. Stacks Guard with every defensive action, unleashing counter-attacks.',
    'Armor: Reactive Plating (+defense). Accessory: Shield Capacitor (+shield strength).',
  ),

  // ── Umbral Net T1 ──
  'umbral_net.t1.ghost_operative': spec(
    'umbral_net.t1.ghost_operative',
    'Ghost Operative',
    'umbral_net', 1,
    'DPS', 'trickster', 'Medium-Fast', 'MP',
    'skill.data_slice',
    ['skill.data_slice', 'skill.shadow_step', 'skill.backdoor_exploit'],
    'A stealth specialist who vanishes from the Grid. Strikes from concealment with data-corrupting blades, then fades before retaliation.',
    'Weapon: Monofilament Edge (+crit). Armor: Stealth Field Generator (+evasion).',
  ),

  // ── Slipstream T1 ──
  'slipstream.t1.velocity_runner': spec(
    'slipstream.t1.velocity_runner',
    'Velocity Runner',
    'slipstream', 1,
    'DPS', 'sustain_dps', 'Fast', 'None',
    'skill.quick_strike',
    ['skill.quick_strike', 'skill.momentum_swing', 'skill.after_image'],
    'A speed-augmented operative who attacks faster than the eye can track. Builds Momentum for instant-speed finishing moves.',
    'Weapon: Accelerator Fists (+speed). Accessory: Reflex Booster (+CT speed).',
  ),
};

// ─── T2 Specializations (4 options) ────────────────────────────────

// Nova Dynamics T2
Object.assign(SPECIALIZATIONS, {
  'nova_dynamics.t2.thermal_blade': spec(
    'nova_dynamics.t2.thermal_blade',
    'Thermal Blade',
    'nova_dynamics', 2,
    'DPS', 'burst_dps', 'Medium-Fast', 'MP',
    'skill.plasma_burst',
    ['skill.plasma_burst', 'skill.heat_vent', 'skill.thermal_lance', 'skill.supernova_slash'],
    'Advances plasma weaponry to superheated levels. Vents now leave plasma burns that continue to deal damage.',
    'Weapon: Thermal Katana (+plasma dmg, +crit). Armor: Heat Sink Array.',
    ['nova_dynamics.t3.fusion_lancer'],
  ),

  'nova_dynamics.t2.arc_caster': spec(
    'nova_dynamics.t2.arc_caster',
    'Arc Caster',
    'nova_dynamics', 2,
    'DPS', 'sustain_dps', 'Medium', 'MP',
    'skill.arc_bolt',
    ['skill.arc_bolt', 'skill.chain_lightning', 'skill.emp_burst', 'skill.overcharge'],
    'Wields electricity as a precision weapon. Chain lightning jumps between targets; EMP burst disables enemy tech for a turn.',
    'Weapon: Arc Projector (+electro dmg). Accessory: Conduit Coil (+chain range).',
    ['nova_dynamics.t3.storm_weaver'],
  ),

  // Aegis Core T2
  'aegis_core.t2.bulwark': spec(
    'aegis_core.t2.bulwark',
    'Bulwark',
    'aegis_core', 2,
    'Tank', 'tank', 'Slow', 'None',
    'skill.shield_bash',
    ['skill.shield_bash', 'skill.fortify', 'skill.kinetic_redirect', 'skill.bastion_wall'],
    'Reinforced plating and enhanced shield capacitors. Guard stacks now also grant allies damage reduction.',
    'Armor: Fortress Plate (+maxHP, +def). Accessory: Ally Relay (+ally DR share).',
    ['aegis_core.t3.juggernaut'],
  ),

  // Umbral Net T2
  'umbral_net.t2.shadow_infiltrator': spec(
    'umbral_net.t2.shadow_infiltrator',
    'Shadow Infiltrator',
    'umbral_net', 2,
    'DPS', 'trickster', 'Fast', 'MP',
    'skill.data_slice',
    ['skill.data_slice', 'skill.shadow_step', 'skill.backdoor_exploit', 'skill.system_crash'],
    'Deeper infiltration protocols. Can stay stealthed longer and execute enemies below 30% HP instantly.',
    'Weapon: Phase Blade (+data dmg, execute). Armor: Cloaking Field.',
    ['umbral_net.t3.phantom_breaker'],
  ),

  // Slipstream T2
  'slipstream.t2.blitz_runner': spec(
    'slipstream.t2.blitz_runner',
    'Blitz Runner',
    'slipstream', 2,
    'DPS', 'sustain_dps', 'Fast', 'None',
    'skill.quick_strike',
    ['skill.quick_strike', 'skill.momentum_swing', 'skill.after_image', 'skill.triple_slash'],
    'Pushes velocity to lethal extremes. Triple-slash hits three times; each hit builds Momentum separately.',
    'Weapon: Twin Accelerators (+multi-hit). Accessory: Adrenal Pump (+momentum gain).',
    ['slipstream.t3.tempest_runner'],
  ),
});

// ─── T3 Specializations (4 options) ────────────────────────────────

Object.assign(SPECIALIZATIONS, {
  'nova_dynamics.t3.fusion_lancer': spec(
    'nova_dynamics.t3.fusion_lancer',
    'Fusion Lancer',
    'nova_dynamics', 3,
    'DPS', 'burst_dps', 'Medium', 'MP',
    'skill.plasma_burst',
    ['skill.plasma_burst', 'skill.heat_vent', 'skill.thermal_lance', 'skill.supernova_slash', 'skill.fusion_beam'],
    'Channels stellar-core temperatures. Fusion Beam pierces all enemies in a line, applying max Heat instantly.',
    'Weapon: Fusion Lance (+plasma dmg, pierce). Armor: Containment Suit.',
  ),

  'nova_dynamics.t3.storm_weaver': spec(
    'nova_dynamics.t3.storm_weaver',
    'Storm Weaver',
    'nova_dynamics', 3,
    'Control', 'trickster', 'Medium', 'MP',
    'skill.arc_bolt',
    ['skill.arc_bolt', 'skill.chain_lightning', 'skill.emp_burst', 'skill.overcharge', 'skill.ion_storm'],
    'Commands electricity on a battlefield scale. Ion Storm is a persistent AoE that damages and slows all enemies.',
    'Armor: Storm Conduit (+electro dmg). Accessory: Tempest Coil (+AoE size).',
  ),

  'aegis_core.t3.juggernaut': spec(
    'aegis_core.t3.juggernaut',
    'Juggernaut',
    'aegis_core', 3,
    'Tank', 'tank', 'Slow', 'None',
    'skill.shield_bash',
    ['skill.shield_bash', 'skill.fortify', 'skill.kinetic_redirect', 'skill.bastion_wall', 'skill.unstoppable_charge'],
    'Becomes an unstoppable force. Charge breaks enemy formations; Guard stacks now also increase attack damage.',
    'Armor: Juggernaut Frame (+maxHP, +atk). Accessory: Rage Converter (+guard→atk).',
  ),

  'umbral_net.t3.phantom_breaker': spec(
    'umbral_net.t3.phantom_breaker',
    'Phantom Breaker',
    'umbral_net', 3,
    'DPS', 'trickster', 'Fast', 'MP',
    'skill.data_slice',
    ['skill.data_slice', 'skill.shadow_step', 'skill.backdoor_exploit', 'skill.system_crash', 'skill.total_wipe'],
    'The ultimate digital assassin. Total Wipe can delete a non-boss enemy from existence if stealthed.',
    'Weapon: Null Blade (+data dmg, delete). Armor: Phantom Shroud.',
  ),

  'slipstream.t3.tempest_runner': spec(
    'slipstream.t3.tempest_runner',
    'Tempest Runner',
    'slipstream', 3,
    'DPS', 'sustain_dps', 'Fast', 'None',
    'skill.quick_strike',
    ['skill.quick_strike', 'skill.momentum_swing', 'skill.after_image', 'skill.triple_slash', 'skill.cyclone_barrage'],
    'A blur of motion on the battlefield. Cyclone Barrage hits all enemies and resets Momentum to max stacks.',
    'Weapon: Storm Fists (+speed, +AoE). Accessory: Velocity Core (+instant cap).',
  ),
});
