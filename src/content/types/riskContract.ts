import type { RiskContractId } from './ids';

export interface RiskContractDef {
  id: RiskContractId;
  name: string;
  description: string;
  rewardBonusLabel: string;
  tags: readonly string[];
}
