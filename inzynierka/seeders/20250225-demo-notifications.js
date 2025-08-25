'use strict';

module.exports = {
  async up (qi) {
    const now = new Date();
    await qi.bulkInsert('notifications', [
      {
        type: 'low_stock',
        title: 'Niski stan: LAPTOP-001',
        message: 'Produkt spadł poniżej progu',
        productId: null,
        userId: null,
        targetRole: 'manager',
        isRead: false,
        isSent: false,
        priority: 'high',
        scheduledAt: null,
        sentAt: null,
        readAt: null,
        metadata: JSON.stringify({ sku: 'LAPTOP-001', min: 20, qty: 15 }),
        createdAt: now,
        updatedAt: now,
      },
      {
        type: 'system_alert',
        title: 'Backup zakończony',
        message: 'Kopia zapasowa wykonana pomyślnie',
        targetRole: 'all',
        isRead: false,
        isSent: false,
        priority: 'low',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down (qi) {
    await qi.bulkDelete('notifications', null, {});
  }
};
