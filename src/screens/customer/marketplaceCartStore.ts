export interface MarketplaceCartSeed {
  productId: string | number;
  quantity: number;
}

let pendingMarketplaceCart: MarketplaceCartSeed[] = [];

export const setPendingMarketplaceCart = (items: MarketplaceCartSeed[]) => {
  pendingMarketplaceCart = items.filter((item) => item.quantity > 0);
};

export const consumePendingMarketplaceCart = () => {
  const items = pendingMarketplaceCart;
  pendingMarketplaceCart = [];
  return items;
};
