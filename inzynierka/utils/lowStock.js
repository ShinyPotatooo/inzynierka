// utils/lowStock.js
const { sequelize, InventoryItem, Product, Notification } = require('../models');

/**
 * Liczy globalnie dostępność SKU i – jeśli ≤ próg (reorderPoint/minStockLevel) –
 * tworzy (idempotentnie) powiadomienie typu "low_stock".
 */
async function recomputeAndNotifyLowStock(productId) {
  const product = await Product.findByPk(productId);
  if (!product) return;

  // Suma ilości i rezerwacji (null -> 0)
  const total = (await InventoryItem.sum('quantity', { where: { productId } })) || 0;
  const reserved = (await InventoryItem.sum('reservedQuantity', { where: { productId } })) || 0;
  const available = total - reserved;

  const threshold =
    product.reorderPoint != null ? Number(product.reorderPoint)
    : product.minStockLevel != null ? Number(product.minStockLevel)
    : null;

  if (threshold == null) return; // brak progu -> brak alertu

  // Twórz alert tylko jeśli faktycznie niski stan
  if (available <= threshold) {
    // Nie dubluj nieprzeczytanych alertów dla tego produktu
    const exists = await Notification.findOne({
      where: { type: 'low_stock', productId, isRead: false },
      order: [['createdAt', 'DESC']],
    });
    if (!exists) {
      await Notification.create({
        type: 'low_stock',
        title: `Niski stan: ${product.name}${product.sku ? ` (${product.sku})` : ''}`,
        message: `Dostępne: ${available} ≤ próg ${threshold}`,
        productId,
        userId: null,
        targetRole: 'manager',
        isRead: false,
        isSent: false,
        priority: 'high',
        scheduledAt: null,
        sentAt: null,
        readAt: null,
        metadata: {
          productId,
          sku: product.sku || null,
          available,
          total,
          reserved,
          minStockLevel: product.minStockLevel,
          reorderPoint: product.reorderPoint,
          scope: 'global',
        },
      });
    }
  }
}

module.exports = { recomputeAndNotifyLowStock };
