import { onCall } from 'firebase-functions/v2/https';
import { requireAuth, requirePayloadSize, requireRateLimit } from './shared/guards';
import { SHOP_OFFERS } from './shared/shopCatalog';
import type { GetShopOfferPayload, GetShopOfferResponse } from './shared/types';

export const getShopOffer = onCall<GetShopOfferPayload, Promise<GetShopOfferResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 256, 'getShopOffer.data');
    const uid = requireAuth(request);
    requireRateLimit(`getShopOffer:${uid}`, 30, 60_000);

    return { offers: [...SHOP_OFFERS] };
  },
);
