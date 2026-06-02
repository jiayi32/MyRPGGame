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
  {
    id: 'contract.enemy_haste',
    name: 'Hastened Foe',
    description: 'All enemies gain +12% CT speed throughout the run.',
    rewardBonusLabel: '+18% score at settle',
    tags: ['combat', 'speed', 'medium'],
  },
  {
    id: 'contract.fragile_party',
    name: 'Glass Alliance',
    description: 'Your party takes 10% more damage from all sources.',
    rewardBonusLabel: '+18% score at settle',
    tags: ['combat', 'defense', 'medium'],
  },
  {
    id: 'contract.scarce_gold',
    name: 'Empty Coffers',
    description: 'All gold rewards from rooms are reduced by 15%.',
    rewardBonusLabel: '+20% score at settle',
    tags: ['economy', 'map', 'medium'],
  },
];

export const RISK_CONTRACT_BY_ID: ReadonlyMap<RiskContractId, RiskContractDef> = new Map(
  RISK_CONTRACTS.map((contract) => [contract.id, contract]),
);
