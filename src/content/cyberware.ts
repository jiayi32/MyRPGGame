// ─── Cyberware & Equipment Catalog ────────────────────────────────
// Sci-fi cyberware and equipment replacing the fantasy Gear system.
// Cyberware = permanent body mods (replaces accessories in some slots).
// Equipment = weapons, armor, shields (traditional gear slots).

import type { GearItem, GearTemplate, GearSlot, GearTier, GearRole } from './types/gear';

// ─── Helpers ────────────────────────────────────────────────────────

function item(
  id: string,
  name: string,
  slot: GearSlot,
  tier: GearTier,
  rarity: GearItem['rarity'],
  baseStats: Record<string, number>,
  passives: GearItem['passives'] = [],
  triggers: GearItem['triggers'] = [],
  description: string = '',
  corpId?: string,
): GearItem {
  const result: GearItem = {
    id,
    name,
    slot,
    tier,
    rarity,
    baseStats,
    multStats: {},
    passives,
    triggers,
    tradeoffs: {},
    upgradeLevels: [],
    description,
  };
  if (corpId !== undefined) {
    (result as { lineageId?: string }).lineageId = corpId;
  }
  return result;
}

function template(
  id: string,
  tier: Exclude<GearTier, 5>,
  role: GearRole,
  slot: GearSlot,
  description: string,
  baseStatsHint: Record<string, number>,
): GearTemplate {
  return { id, tier, role, slot, description, baseStatsHint, passives: [], triggers: [] };
}

// ─── T1 Gear ────────────────────────────────────────────────────────

export const CYBERWARE: Record<string, GearItem> = {
  // ── Weapons ──
  'gear.t1.plasma_blade': item('gear.t1.plasma_blade', 'Plasma Blade', 'weapon', 1, 'common',
    { strength: 5, agility: 2 }, [], [], 'A blade wreathed in superheated plasma. Standard issue for Nova Dynamics runners.'),
  'gear.t1.monofilament_edge': item('gear.t1.monofilament_edge', 'Monofilament Edge', 'weapon', 1, 'common',
    { strength: 3, agility: 4 }, [{ category: 'crit', effect: '+8% crit chance', magnitude: 8, magnitudeUnit: 'percent' }], [],
    'A blade honed to a single molecule. Silent and deadly.'),
  'gear.t1.accelerator_fists': item('gear.t1.accelerator_fists', 'Accelerator Fists', 'weapon', 1, 'common',
    { strength: 4, agility: 3 }, [{ category: 'speed', effect: '+5% CT speed', magnitude: 5, magnitudeUnit: 'percent' }], [],
    'Kinetic accelerators worn on the knuckles. Each punch lands faster than the last.'),
  'gear.t1.arc_projector': item('gear.t1.arc_projector', 'Arc Projector', 'weapon', 1, 'common',
    { intellect: 5, agility: 2 }, [], [], 'Projects directed electrical arcs. Favored by Arc Casters.'),

  // ── Armor ──
  'gear.t1.reactive_plating': item('gear.t1.reactive_plating', 'Reactive Plating', 'armor', 1, 'common',
    { defense: 6, stamina: 3 }, [], [], 'Armor that hardens on impact. Standard Aegis Core issue.'),
  'gear.t1.stealth_field': item('gear.t1.stealth_field', 'Stealth Field Generator', 'armor', 1, 'common',
    { defense: 2, agility: 5 }, [{ category: 'evasion', effect: '+8% evasion', magnitude: 8, magnitudeUnit: 'percent' }], [],
    'Bends light around the wearer. Umbral Net signature tech.'),
  'gear.t1.heat_sink_array': item('gear.t1.heat_sink_array', 'Heat Sink Array', 'armor', 1, 'common',
    { defense: 3, stamina: 4 }, [{ category: 'heat', effect: '+1 max Heat stack', magnitude: 1, magnitudeUnit: 'flat' }], [],
    'Dissipates thermal buildup. Essential for Nova Dynamics operatives.'),
  'gear.t1.kinetic_weave': item('gear.t1.kinetic_weave', 'Kinetic Weave Armor', 'armor', 1, 'common',
    { defense: 4, agility: 3 }, [], [], 'Flexible armor that disperses kinetic energy. Slipstream standard gear.'),

  // ── Accessories ──
  'gear.t1.shield_capacitor': item('gear.t1.shield_capacitor', 'Shield Capacitor', 'accessory', 1, 'common',
    { stamina: 5 }, [{ category: 'shield', effect: '+10% shield strength', magnitude: 10, magnitudeUnit: 'percent' }], [],
    'Stores excess energy as a personal barrier.'),
  'gear.t1.reflex_booster': item('gear.t1.reflex_booster', 'Reflex Booster', 'accessory', 1, 'common',
    { agility: 5 }, [{ category: 'speed', effect: '+3% CT speed', magnitude: 3, magnitudeUnit: 'percent' }], [],
    'Neural implant that sharpens reaction time.'),
  'gear.t1.conduit_coil': item('gear.t1.conduit_coil', 'Conduit Coil', 'accessory', 1, 'common',
    { intellect: 5 }, [{ category: 'electro', effect: '+8% electro damage', magnitude: 8, magnitudeUnit: 'percent' }], [],
    'Amplifies electrical output.'),
};

// ─── T2 Gear ────────────────────────────────────────────────────────

Object.assign(CYBERWARE, {
  'gear.t2.thermal_katana': item('gear.t2.thermal_katana', 'Thermal Katana', 'weapon', 2, 'rare',
    { strength: 8, agility: 4 },
    [{ category: 'plasma', effect: '+12% plasma damage', magnitude: 12, magnitudeUnit: 'percent' }],
    [],
    'A blade that reaches fusion temperatures. Signature weapon of the Thermal Blade.',
    'nova_dynamics'),
  'gear.t2.fortress_plate': item('gear.t2.fortress_plate', 'Fortress Plate', 'armor', 2, 'rare',
    { defense: 12, stamina: 6 },
    [{ category: 'hp', effect: '+10% max HP', magnitude: 10, magnitudeUnit: 'percent' }],
    [],
    'Military-grade heavy armor. Only the strongest can move in this.',
    'aegis_core'),
  'gear.t2.phase_blade': item('gear.t2.phase_blade', 'Phase Blade', 'weapon', 2, 'rare',
    { strength: 6, agility: 6 },
    [{ category: 'data', effect: '+12% data damage', magnitude: 12, magnitudeUnit: 'percent' }],
    [],
    'A blade that exists partially out of phase with reality. Passes through conventional armor.',
    'umbral_net'),
  'gear.t2.twin_accelerators': item('gear.t2.twin_accelerators', 'Twin Accelerators', 'weapon', 2, 'rare',
    { strength: 6, agility: 6 },
    [{ category: 'multi', effect: 'Multi-hit attacks +10% damage', magnitude: 10, magnitudeUnit: 'percent' }],
    [],
    'Dual kinetic accelerators. Each punch fuels the next.',
    'slipstream'),
  'gear.t2.storm_conduit': item('gear.t2.storm_conduit', 'Storm Conduit', 'armor', 2, 'rare',
    { intellect: 8, defense: 4 },
    [{ category: 'electro', effect: '+15% electro damage', magnitude: 15, magnitudeUnit: 'percent' }],
    [],
    'Channels atmospheric electricity through the wearer.',
    'nova_dynamics'),
});
