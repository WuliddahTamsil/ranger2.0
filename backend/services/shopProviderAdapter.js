/**
 * shopProviderAdapter.js
 * Integration interface for external Supermarket / Pharmacy partner systems
 * Adheres to Section T: PROVIDER INTEGRATION
 */

const MarketplaceProduct = require("../models/MarketplaceProduct");

class ShopProviderAdapter {
  constructor(providerName = "LOCAL_CATALOG") {
    this.providerName = providerName;
  }

  /**
   * Search products from provider or synced admin-managed catalog
   */
  async searchProducts(query, storeId = null) {
    const filter = { isActive: true };
    if (storeId) filter.storeId = storeId;
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { cat: { $regex: query, $options: "i" } },
      ];
    }
    const products = await MarketplaceProduct.find(filter).limit(30).lean();
    return products.map((p) => ({
      ...p,
      isRealtimeInventory: Boolean(p.providerProductId),
      providerName: this.providerName,
      lastSyncAt: p.lastSyncAt || p.updatedAt,
    }));
  }

  /**
   * Fetch single product detail
   */
  async getProduct(productId) {
    const product = await MarketplaceProduct.findById(productId).lean();
    if (!product) return null;
    return {
      ...product,
      isRealtimeInventory: Boolean(product.providerProductId),
      providerName: this.providerName,
      lastSyncAt: product.lastSyncAt || product.updatedAt,
    };
  }

  /**
   * Check availability and stock for cart items
   */
  async checkAvailability(items = []) {
    const results = [];
    for (const item of items) {
      const product = await MarketplaceProduct.findById(item.productId).lean();
      if (!product || !product.isActive) {
        results.push({
          productId: item.productId,
          available: false,
          currentStock: 0,
          requestedQty: item.quantity,
          reason: "Produk tidak aktif atau tidak ditemukan",
        });
      } else if (product.stock < item.quantity) {
        results.push({
          productId: item.productId,
          available: false,
          currentStock: product.stock,
          requestedQty: item.quantity,
          reason: `Stok tidak mencukupi (tersedia: ${product.stock})`,
        });
      } else {
        results.push({
          productId: item.productId,
          available: true,
          currentStock: product.stock,
          requestedQty: item.quantity,
          priceSnapshot: product.promoPrice != null && product.promoPrice > 0 ? product.promoPrice : product.price,
        });
      }
    }
    const allAvailable = results.every((r) => r.available);
    return { allAvailable, items: results };
  }

  /**
   * Create order in provider system (stubbed for external ERP/POS integration)
   */
  async createOrder(order) {
    return {
      success: true,
      providerOrderRef: `EXT-ORD-${Date.now()}`,
      syncedAt: new Date(),
    };
  }

  /**
   * Cancel order in provider system
   */
  async cancelOrder(orderId) {
    return {
      success: true,
      orderId,
      cancelledAt: new Date(),
    };
  }

  /**
   * Query status from provider
   */
  async getOrderStatus(orderId) {
    return {
      orderId,
      providerStatus: "PROCESSING",
      updatedAt: new Date(),
    };
  }
}

module.exports = new ShopProviderAdapter();
