// ─── Daily Challenge ─────────────────────────────────────────────
// Seeded daily run with fixed class + modifier.
// All players share the same seed for a given UTC date.
// Wildfrost daily voyage / StS daily climb pattern.

import type { ClassId } from './types';

export interface DailyChallenge {
  /** YYYY-MM-DD key. */
  dateKey: string;
  /** Fixed corporation for this challenge. */
  corpId: string;
  /** Fixed specialization for this challenge. */
  classId: ClassId;
  /** Challenge name for display. */
  name: string;
  /** Flavor text shown on the challenge screen. */
  description: string;
  /** Modifiers active for this challenge. */
  modifiers: readonly string[];
  /** Fixed threat level for this challenge. */
  threatLevel: number;
}

/**
 * Derive a deterministic daily challenge from the current UTC date.
 * Uses a simple hash of the date string to pick from pools.
 */
export const generateDailyChallenge = (dateKey: string): DailyChallenge => {
  // Simple hash function for deterministic selection
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash << 5) - hash + dateKey.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);

  // Available corps and their starter specs
  const corps = [
    { corpId: 'drakehorn_forge', classId: 'drakehorn_forge.ember_initiate' as ClassId, name: 'Nova Dynamics' },
    { corpId: 'bull_cathedral', classId: 'bull_cathedral.t1.barrier_sentinel' as ClassId, name: 'Aegis Core' },
    { corpId: 'twin_mirror', classId: 'twin_mirror.t1.ghost_operative' as ClassId, name: 'Umbral Net' },
    { corpId: 'tide_shell', classId: 'tide_shell.t1.velocity_runner' as ClassId, name: 'Slipstream' },
  ];

  const corpIndex = absHash % corps.length;
  const selected = corps[corpIndex];
  if (!selected) throw new Error('Daily challenge corp selection failed');

  // Rotate through 4 challenge themes
  const themes = [
    { name: 'Thermal Tuesday', description: 'Plasma weapons only. Burn everything.', modifiers: ['Thermal skills only'] },
    { name: 'Glass Cannon', description: 'Double damage dealt AND received. No room for error.', modifiers: ['2× damage both ways'] },
    { name: 'Speed Run', description: 'CT costs halved. Enemies act twice as fast too.', modifiers: ['Halved CT, doubled enemy speed'] },
    { name: 'Frugal Run', description: 'No shop access. Survive on what you find.', modifiers: ['No merchant rooms'] },
  ];

  const themeIndex = (absHash >> 8) % themes.length;
  const theme = themes[themeIndex];
  if (!theme) throw new Error('Daily challenge theme selection failed');

  return {
    dateKey,
    corpId: selected.corpId,
    classId: selected.classId,
    name: `${selected.name} — ${theme.name}`,
    description: theme.description,
    modifiers: theme.modifiers,
    threatLevel: 3 + ((absHash >> 16) % 5), // TL 3-7
  };
};

/** Get today's challenge key in YYYY-MM-DD UTC. */
export const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};
