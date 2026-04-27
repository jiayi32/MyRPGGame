import type { ShopOffer } from './types';

const ROLES = ['tank', 'dps', 'support', 'hybrid', 'control'] as const;
const SLOTS = ['weapon', 'armor', 'accessory'] as const;

const TIER_GOLD_PRICES: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 180,
  2: 420,
  3: 900,
  4: 1750,
};

const OFFERS: ShopOffer[] = [];
for (const tier of [1, 2, 3, 4] as const) {
  for (const role of ROLES) {
    for (const slot of SLOTS) {
      OFFERS.push({
        templateId: `${role}.t${tier}.${slot}`,
        priceGold: TIER_GOLD_PRICES[tier],
      });
    }
  }
}

export const SHOP_OFFERS: readonly ShopOffer[] = [
  ...OFFERS,
  // Drakehorn Forge T5 signature set — available for dev playtesting
  { templateId: 'drakehorn_forge.worldbreaker_fang',      priceGold: 4500 },
  { templateId: 'drakehorn_forge.molten_sovereign_plate', priceGold: 4500 },
  { templateId: 'drakehorn_forge.ashfire_sigil',          priceGold: 4000 },
];

const OFFER_BY_ID: ReadonlyMap<string, ShopOffer> = new Map(
  SHOP_OFFERS.map((offer) => [offer.templateId, offer]),
);

export const getShopOfferById = (templateId: string): ShopOffer | null => {
  return OFFER_BY_ID.get(templateId) ?? null;
};
