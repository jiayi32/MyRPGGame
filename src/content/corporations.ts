// ─── Corporations Catalog ─────────────────────────────────────────
// 12 sci-fi mega-corporations replacing the fantasy lineages.
// Each corp defines a tech tree identity, unique mechanic, and upgrade path.

import type { CorporationDef } from './types/corporation';

export const CORPORATIONS: Record<string, CorporationDef> = {
  // ─── 1. Nova Dynamics — Plasma/Energy ───────────────────────────
  nova_dynamics: {
    id: 'nova_dynamics',
    name: 'Nova Dynamics',
    archetype: 'energy',
    themeTags: ['plasma', 'energy', 'burst', 'overheat'],
    adjacentCorpIds: ['aegis_core', 'chrono_logic', 'quantum_mind'],
    uniqueMechanic: {
      id: 'heat_gauge',
      name: 'Heat Gauge',
      shortDescription: 'Abilities generate Heat stacks. At max Heat, your next attack deals bonus plasma damage and vents all stacks.',
      evolutionByTier: {
        1: 'Max 3 Heat stacks. Vent deals +15% damage.',
        2: 'Max 5 Heat stacks. Vent deals +25% damage.',
        3: 'Max 7 Heat stacks. Vent applies burn (plasma DoT).',
        4: 'Max 10 Heat stacks. Vent is guaranteed critical.',
        5: 'Max 12 Heat stacks. Overheat: vent deals AoE plasma damage.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+3% plasma damage', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+5% max HP', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+2% CT speed', magnitude: 2, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+5% plasma damage', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 5, effect: '+1 max Heat stack', magnitude: 1, magnitudeUnit: 'flat' },
      { rank: 6, effect: '+8% max HP', magnitude: 8, magnitudeUnit: 'percent' },
      { rank: 7, effect: '+3% crit chance', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 8, effect: '+7% plasma damage', magnitude: 7, magnitudeUnit: 'percent' },
      { rank: 9, effect: '+2 max Heat stack', magnitude: 2, magnitudeUnit: 'flat' },
      { rank: 10, effect: 'Overheat: vent damage +50%', magnitude: 50, magnitudeUnit: 'percent' },
    ],
    description: 'Nova Dynamics harnesses stellar plasma for weapons and power systems. Specialists in overwhelming thermal damage that builds to critical mass.',
  },

  // ─── 2. Aegis Core — Defense/Shields ────────────────────────────
  aegis_core: {
    id: 'aegis_core',
    name: 'Aegis Core',
    archetype: 'defense',
    themeTags: ['shield', 'defense', 'fortification', 'counter'],
    adjacentCorpIds: ['nova_dynamics', 'harmonic_initiative', 'bio_forge'],
    uniqueMechanic: {
      id: 'guard_stack',
      name: 'Guard Stacks',
      shortDescription: 'Defensive actions generate Guard stacks. Each stack provides +3% damage reduction. Stacks are consumed when you counter-attack.',
      evolutionByTier: {
        1: 'Max 5 Guard stacks. Counter deals 80% ATK.',
        2: 'Max 7 Guard stacks. +4% DR per stack.',
        3: 'Max 10 Guard stacks. Counter also applies slow.',
        4: 'Max 12 Guard stacks. +5% DR per stack. Counter heals 5% HP.',
        5: 'Max 15 Guard stacks. Counter is AoE. DR applies to allies.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+5% defense', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+3% max HP', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+5% shield strength', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+1 max Guard stack', magnitude: 1, magnitudeUnit: 'flat' },
      { rank: 5, effect: '+8% defense', magnitude: 8, magnitudeUnit: 'percent' },
      { rank: 6, effect: '+2 max Guard stack', magnitude: 2, magnitudeUnit: 'flat' },
      { rank: 7, effect: '+10% max HP', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 8, effect: 'Counter damage +20%', magnitude: 20, magnitudeUnit: 'percent' },
      { rank: 9, effect: '+3 max Guard stack', magnitude: 3, magnitudeUnit: 'flat' },
      { rank: 10, effect: 'Guard stacks persist between battles in same zone', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Aegis Core develops military-grade shielding and fortification systems. Their operatives are immovable bastions, absorbing punishment and retaliating with calculated force.',
  },

  // ─── 3. Quantum Mind — Probability/Reality ──────────────────────
  quantum_mind: {
    id: 'quantum_mind',
    name: 'Quantum Mind',
    archetype: 'psionic',
    themeTags: ['psionic', 'probability', 'chaos', 'adaptive'],
    adjacentCorpIds: ['nova_dynamics', 'umbral_net', 'void_cartel'],
    uniqueMechanic: {
      id: 'echo',
      name: 'Echo Protocol',
      shortDescription: 'After using a skill, Echo Protocol has a chance to duplicate the effect at reduced power. Chance scales with tier.',
      evolutionByTier: {
        1: '15% chance to echo at 40% power.',
        2: '20% chance to echo at 50% power.',
        3: '25% chance to echo at 60% power. Echoes can trigger chain echoes (10%).',
        4: '30% chance to echo at 70% power.',
        5: '35% chance to echo at 80% power. Echoes ignore target resistances.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+3% echo chance', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+5% psionic damage', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+2% crit chance', magnitude: 2, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+5% echo power', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 5, effect: '+3% echo chance', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 6, effect: '+8% psionic damage', magnitude: 8, magnitudeUnit: 'percent' },
      { rank: 7, effect: '+4% echo chance', magnitude: 4, magnitudeUnit: 'percent' },
      { rank: 8, effect: 'Chain echo chance +5%', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 9, effect: '+10% echo power', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Echoes apply random debuff from a pool', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Quantum Mind manipulates probability itself. Their operatives can fork reality, creating echoes of their actions that cascade into devastating effect chains.',
  },

  // ─── 4. Umbral Net — Stealth/Data ───────────────────────────────
  umbral_net: {
    id: 'umbral_net',
    name: 'Umbral Net',
    archetype: 'digital',
    themeTags: ['data', 'stealth', 'assassination', 'ct_theft'],
    adjacentCorpIds: ['quantum_mind', 'slipstream', 'toxin_syndicate'],
    uniqueMechanic: {
      id: 'ghost_protocol',
      name: 'Ghost Protocol',
      shortDescription: 'Enter stealth after not taking damage for 2 turns. While stealthed, +20% damage and +10% crit. Broken on attack.',
      evolutionByTier: {
        1: 'Stealth: +20% damage, +10% crit. 2-turn cooldown after breaking.',
        2: 'Stealth: +25% damage, +15% crit. Stealth skills available.',
        3: 'Stealth: +30% damage, +20% crit. First attack from stealth ignores 50% defense.',
        4: 'Stealth: +35% damage, +25% crit. Can re-stealth immediately after kill.',
        5: 'Stealth: +40% damage, +30% crit. Attacks from stealth steal 10 CT from target.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+5% data damage', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+3% crit chance', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+2% CT speed', magnitude: 2, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+7% stealth damage bonus', magnitude: 7, magnitudeUnit: 'percent' },
      { rank: 5, effect: '+5% crit multiplier', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 6, effect: '+10% data damage', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 7, effect: '-1 turn stealth cooldown', magnitude: -1, magnitudeUnit: 'flat' },
      { rank: 8, effect: '+5% crit chance', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 9, effect: 'Stealth break damage +15%', magnitude: 15, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Can remain stealthed for 1 extra action before breaking', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Umbral Net operates in the shadows of the Grid. Their agents are masters of digital infiltration, striking from concealment and vanishing before counter-attack.',
  },

  // ─── 5. Slipstream — Speed/Velocity ─────────────────────────────
  slipstream: {
    id: 'slipstream',
    name: 'Slipstream',
    archetype: 'speed',
    themeTags: ['speed', 'velocity', 'multi-strike', 'evasion'],
    adjacentCorpIds: ['umbral_net', 'chrono_logic', 'nexus_collective'],
    uniqueMechanic: {
      id: 'momentum',
      name: 'Momentum',
      shortDescription: 'Each action builds Momentum. At 5 stacks, your next action executes instantly (CT=0) and resets stacks.',
      evolutionByTier: {
        1: 'Momentum at 5 stacks: instant action. Max 1 instant per 3 turns.',
        2: 'Momentum at 5 stacks: instant action. +10% damage on instant.',
        3: 'Momentum at 4 stacks triggers. Max 1 per 2 turns.',
        4: 'Momentum at 4 stacks triggers. +20% damage. Can double-act.',
        5: 'Momentum at 3 stacks triggers. Instant actions chain (max 3 in a row).',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+3% CT speed', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+5% evasion', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+2% CT speed', magnitude: 2, magnitudeUnit: 'percent' },
      { rank: 4, effect: 'Momentum threshold -1', magnitude: -1, magnitudeUnit: 'flat' },
      { rank: 5, effect: '+5% crit chance', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 6, effect: '+5% CT speed', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 7, effect: 'Instant action damage +15%', magnitude: 15, magnitudeUnit: 'percent' },
      { rank: 8, effect: '+10% evasion', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 9, effect: '+5% CT speed', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Momentum persists between battles for 30 seconds', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Slipstream pioneers velocity-enhancement tech. Their runners operate at superhuman speeds, chaining actions faster than enemies can react.',
  },

  // ─── 6. Bio Forge — Biotech/Self-mod ────────────────────────────
  bio_forge: {
    id: 'bio_forge',
    name: 'Bio Forge',
    archetype: 'bio',
    themeTags: ['bio', 'adaptation', 'hp_cost', 'regeneration'],
    adjacentCorpIds: ['aegis_core', 'toxin_syndicate', 'radiant_order'],
    uniqueMechanic: {
      id: 'adaptive_physiology',
      name: 'Adaptive Physiology',
      shortDescription: 'Taking damage of a type grants stacking resistance to that type for the battle. HP-cost skills are more powerful.',
      evolutionByTier: {
        1: '+5% resist per hit (max 15%). HP skills +15% effect.',
        2: '+7% resist per hit (max 21%). HP skills +20% effect.',
        3: '+10% resist per hit (max 30%). HP skills also heal for 10% of cost.',
        4: '+12% resist per hit (max 36%). HP skills +30% effect.',
        5: '+15% resist per hit (max 45%). Adapt instantly to first hit of each type.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+5% max HP', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 2, effect: '+3% HP regen per turn', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+5% adaptation cap', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 4, effect: 'HP skill bonus +5%', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 5, effect: '+8% max HP', magnitude: 8, magnitudeUnit: 'percent' },
      { rank: 6, effect: '+5% HP regen per turn', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 7, effect: '+10% adaptation cap', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 8, effect: 'HP costs reduced by 10%', magnitude: -10, magnitudeUnit: 'percent' },
      { rank: 9, effect: '+10% max HP', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Adapted resistances persist for 2 battles', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Bio Forge specializes in organic augmentation and adaptive biology. Their forged soldiers grow stronger through damage, turning enemy attacks into their own armor.',
  },

  // ─── 7. Chrono Logic — Time Manipulation ────────────────────────
  chrono_logic: {
    id: 'chrono_logic',
    name: 'Chrono Logic',
    archetype: 'chrono',
    themeTags: ['chrono', 'ct_manipulation', 'control', 'rewind'],
    adjacentCorpIds: ['nova_dynamics', 'slipstream', 'void_cartel'],
    uniqueMechanic: {
      id: 'voltage_cycle',
      name: 'Voltage Cycle',
      shortDescription: 'Skills alternate between "Charge" and "Discharge" phases. Charge skills build voltage; Discharge skills consume it for amplified effects.',
      evolutionByTier: {
        1: 'Max 50 Voltage. Discharge +20% effect at full voltage.',
        2: 'Max 75 Voltage. Discharge +30% effect. Charge skills also buff.',
        3: 'Max 100 Voltage. Discharge can rewind target CT by 20.',
        4: 'Max 125 Voltage. Discharge +40% effect. Double-discharge possible.',
        5: 'Max 150 Voltage. Overflow voltage becomes a shield.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+10 max voltage', magnitude: 10, magnitudeUnit: 'flat' },
      { rank: 2, effect: '+3% CT speed', magnitude: 3, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+5% discharge effect', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+15 max voltage', magnitude: 15, magnitudeUnit: 'flat' },
      { rank: 5, effect: 'CT rewind +5', magnitude: 5, magnitudeUnit: 'flat' },
      { rank: 6, effect: '+10% discharge effect', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 7, effect: '+20 max voltage', magnitude: 20, magnitudeUnit: 'flat' },
      { rank: 8, effect: '+5% CT speed', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 9, effect: 'Overflow shield strength +25%', magnitude: 25, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Voltage persists at 25% between battles', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Chrono Logic manipulates the flow of time itself. Their chrononauts build and release temporal voltage, rewinding enemy actions and accelerating their own timeline.',
  },

  // ─── 8. Nexus Collective — Swarm/Networked ──────────────────────
  nexus_collective: {
    id: 'nexus_collective',
    name: 'Nexus Collective',
    archetype: 'swarm',
    themeTags: ['swarm', 'drone', 'network', 'heal'],
    adjacentCorpIds: ['slipstream', 'harmonic_initiative', 'void_cartel'],
    uniqueMechanic: {
      id: 'drone_network',
      name: 'Drone Network',
      shortDescription: 'Deploy combat drones that act as extensions. Drones can attack, shield, or heal. Max drones scale with tier.',
      evolutionByTier: {
        1: 'Max 2 drones. Drones have 30% of your stats. Basic attack + shield.',
        2: 'Max 3 drones. Drones have 40% stats. Add heal drone type.',
        3: 'Max 4 drones. Drones have 50% stats. Drone actions share no CT cost.',
        4: 'Max 5 drones. Drones have 60% stats. Drone death triggers AoE shield.',
        5: 'Max 6 drones. Drones inherit your buffs. Swarm protocol: all drones act simultaneously.',
      },
    },
    upgradeBonuses: [
      { rank: 1, effect: '+1 max drone', magnitude: 1, magnitudeUnit: 'flat' },
      { rank: 2, effect: 'Drone stats +5%', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 3, effect: '+5% healing received', magnitude: 5, magnitudeUnit: 'percent' },
      { rank: 4, effect: '+1 max drone', magnitude: 1, magnitudeUnit: 'flat' },
      { rank: 5, effect: 'Drone stats +10%', magnitude: 10, magnitudeUnit: 'percent' },
      { rank: 6, effect: 'Drone deployment CT cost -10', magnitude: -10, magnitudeUnit: 'flat' },
      { rank: 7, effect: '+1 max drone', magnitude: 1, magnitudeUnit: 'flat' },
      { rank: 8, effect: 'Drone death shield +20%', magnitude: 20, magnitudeUnit: 'percent' },
      { rank: 9, effect: 'Drone stats +15%', magnitude: 15, magnitudeUnit: 'percent' },
      { rank: 10, effect: 'Swarm protocol: all drones act on deployment turn', magnitude: 0, magnitudeUnit: 'flat' },
    ],
    description: 'Nexus Collective believes strength lies in numbers. Their swarm controllers deploy networked combat drones that overwhelm enemies through coordinated action.',
  },
};
