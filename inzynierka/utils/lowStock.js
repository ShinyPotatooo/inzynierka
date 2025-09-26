// utils/lowStock.js
const { sequelize, InventoryItem, Product, Notification, NotificationState } = require('../models');
const { Op } = require('sequelize');

/**
 * Policz dostępność produktu:
 *  - sumujemy (quantity - reservedQuantity), ale tylko dla pozycji,
 *    które NIE są w tranzycie i NIE są uszkodzone.
 */
async function computeAvailableForProduct(productId, { tx } = {}) {
  const items = await InventoryItem.findAll({
    where: {
      productId,
      flowStatus: { [Op.notIn]: ['in_transit', 'damaged'] },
    },
    transaction: tx,
  });

  let available = 0;
  for (const it of items) {
    const q = Number(it.quantity || 0) - Number(it.reservedQuantity || 0);
    if (q > 0) available += q;
  }
  return available;
}

/** usuń stany „przeczytane” aby nowe/odświeżone powiadomienie znów było nieprzeczytane dla wszystkich */
async function markNotificationUnreadForAll(notificationId, { tx } = {}) {
  await NotificationState.destroy({ where: { notificationId }, transaction: tx });
}

/**
 * Zapewnij powiadomienie określonego typu dla produktu (upsert bez duplikatów).
 * Zasada unikalności: (type, productId)
 */
async function ensureNotification({ type, product, available, threshold, priority }, { tx } = {}) {
  const baseTitle =
    type === 'empty_stock'
      ? `Brak stanu: ${product.name} (${product.sku || '—'})`
      : `Niski stan: ${product.name} (${product.sku || '—'})`;

  const baseMsg =
    type === 'empty_stock'
      ? `Dostępne: 0 (próg: ${threshold || 0}).`
      : `Dostępne: ${available} (próg: ${threshold || 0}).`;

  const [row, created] = await Notification.findOrCreate({
    where: { type, productId: product.id },
    defaults: {
      type,
      title: baseTitle,
      message: baseMsg,
      productId: product.id,
      priority,
      targetRole: 'manager',     // domyślnie kierownik + admin (patrz audience w routes/notifications.js)
      isRead: false,
      isSent: false,
      metadata: { available, minStockLevel: product.minStockLevel, reorderPoint: product.reorderPoint },
    },
    transaction: tx,
  });

  // jeśli już było – odśwież tytuł/treść/czas/prior.
  if (!created) {
    await row.update(
      {
        title: baseTitle,
        message: baseMsg,
        priority,
        metadata: { available, minStockLevel: product.minStockLevel, reorderPoint: product.reorderPoint },
      },
      { transaction: tx }
    );
  }

  // spraw, by znów było „nieprzeczytane” dla wszystkich
  await markNotificationUnreadForAll(row.id, { tx });
  return row;
}

/**
 * Skasuj / oznacz rozwiązane poprzednie powiadomienia low/empty jeśli stan wrócił do normy.
 * (tu: usuwamy — prościej niż prowadzić historię stanów)
 */
async function clearResolved(productId, { tx } = {}) {
  await Notification.destroy({
    where: { productId, type: { [Op.in]: ['low_stock', 'empty_stock'] } },
    transaction: tx,
  });
}

/**
 * Główna funkcja: przelicz i utwórz/odśwież powiadomienia.
 * Logika:
 *  - brak progu (minStockLevel || reorderPoint) → czyścimy low/empty i wychodzimy,
 *  - available === 0 → empty_stock (priority: 'urgent'),
 *  - available <= próg → low_stock (priority: 'high'),
 *  - inaczej czyścimy poprzednie.
 */
async function recomputeAndNotifyLowStock(productId) {
  return sequelize.transaction(async (tx) => {
    const product = await Product.findByPk(productId, { transaction: tx });
    if (!product) return;

    const threshold = Number(product.minStockLevel || product.reorderPoint || 0) || 0;
    const available = await computeAvailableForProduct(productId, { tx });

    if (!threshold) {
      await clearResolved(productId, { tx });
      return;
    }

    if (available <= 0) {
      await ensureNotification(
        {
          type: 'empty_stock',
          product,
          available,
          threshold,
          priority: 'urgent',
        },
        { tx }
      );
      return;
    }

    if (available <= threshold) {
      await ensureNotification(
        {
          type: 'low_stock',
          product,
          available,
          threshold,
          priority: 'high',
        },
        { tx }
      );
      return;
    }

    // stan OK → usuń stare komunikaty
    await clearResolved(productId, { tx });
  });
}

/** masowy przelicz wszystkich produktów */
async function recomputeAndNotifyAllProducts() {
  const ids = (await Product.findAll({ attributes: ['id'] })).map((p) => p.id);
  for (const id of ids) {
    await recomputeAndNotifyLowStock(id);
  }
}

module.exports = {
  recomputeAndNotifyLowStock,
  recomputeAndNotifyAllProducts,
};
