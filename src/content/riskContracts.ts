import type { RiskContractDef, RiskContractId } from './types';

export const RISK_CONTRACTS: readonly RiskContractDef[] = [
  {
    id: 'contract.no_merchant_route',
    name: 'Sealed Purse',
    description: 'Merchant rooms are removed from your run map routing options.',
    rewardBonusLabel: '+20% score at settle',
    tags: ['map', 'economy', 'hard'],
  },
  {
    id: 'contract.enemy_barrier_tick',
    name: 'Fortified Hostile',
    description: 'Enemies begin encounters with a small barrier pulse.',
    rewardBonusLabel: '+15% score at settle',
    tags: ['combat', 'defense', 'medium'],
  },
  {
    id: 'contract.no_forfeit',
    name: 'No Retreat Oath',
    description: 'You cannot voluntarily forfeit this run.',
    rewardBonusLabel: '+25% score at settle',
    tags: ['rules', 'pressure', 'hard'],
  },
];

export const RISK_CONTRACT_BY_ID: ReadonlyMap<RiskContractId, RiskContractDef> = new Map(
  RISK_CONTRACTS.map((contract) => [contract.id, contract]),
);
