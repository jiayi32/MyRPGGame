// ─── Consumable Types ─────────────────────────────────────────────
// "Stims" — one-shot sci-fi combat items. Inspired by StS potions
// and Balatro Tarot/Spectral cards. Max 3 carried at a time.

export type ConsumableId = string;

export type ConsumableRarity = 'common' | 'uncommon' | 'rare';

export type ConsumableEffect =
  | 'heal'
  | 'damage_boost'
  | 'ct_reset'
  | 'ct_delay'
  | 'stun_target'
  | 'dodge_next'
  | 'reveal_intent'
  | 'cleanse_debuff'
  | 'shield_grant'
  | 'cooldown_reset'
  | 'crit_guarantee'
  | 'mp_restore';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  description: string;
  effectLabel: string;
  rarity: ConsumableRarity;
  /** Which effect type this stim produces. */
  effect: ConsumableEffect;
  /** Numeric parameter for the effect (e.g., heal amount, damage boost %). */
  value: number;
  /** If true, this stim can only be used during the player's turn. */
  requirePlayerTurn: boolean;
}
