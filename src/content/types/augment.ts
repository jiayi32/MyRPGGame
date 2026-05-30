export type AugmentCategory = 'neutral' | 'positive' | 'sacrificial';

export type AugmentTier = 'bronze' | 'silver' | 'gold' | 'prismatic';

import type { AugmentId } from './ids';

export interface AugmentDef {
  id: AugmentId;
  name: string;
  description: string;
  effectLabel: string;
  category: AugmentCategory;
  tier: AugmentTier;
  /** Optional synergy tags — reserved for future integration with P4.2 tag system. */
  tags?: readonly string[];
}
