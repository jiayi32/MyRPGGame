import type { StageConditionId } from './ids';

export interface StageConditionDef {
  id: StageConditionId;
  name: string;
  description: string;
  effectLabel: string;
  /** Room types this condition can appear on. */
  allowedRoomTypes: readonly string[];
  /** Base probability weight (0-100). Modified by room type tier in generation. */
  weight: number;
}
