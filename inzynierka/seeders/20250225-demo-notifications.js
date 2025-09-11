'use strict';

module.exports = {
  async up (queryInterface /*, Sequelize */) {
    const now = new Date();
    const rows = [
      {
        type: 'low_stock',
        title: 'Niski stan: LAPTOP-001',
        message: 'Produkt spadł poniżej progu',
        targetRole: 'manager',
        priority: 'high',
        metadata: { sku: 'LAPTOP-001', min: 20, qty: 15 },
      },
      {
        type: 'system_alert',
        title: 'Backup zakończony',
        message: 'Kopia zapasowa wykonana pomyślnie',
        targetRole: 'all',
        priority: 'low',
        metadata: { job: 'nightly_backup' },
      },
    ];

    for (const r of rows) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO "notifications"
          ("type","title","message","productId","userId","targetRole",
           "isRead","isSent","priority","scheduledAt","sentAt","readAt",
           "metadata","createdAt","updatedAt")
        SELECT
          :type, :title, :message, NULL, NULL, :targetRole,
          FALSE, FALSE, :priority, NULL, NULL, NULL,
          CAST(:metadata AS JSONB), :now, :now
        WHERE NOT EXISTS (
          SELECT 1 FROM "notifications" n
          WHERE n."type" = :type AND n."title" = :title
        )
        `,
        {
          replacements: {
            type: r.type,
            title: r.title,
            message: r.message,
            targetRole: r.targetRole,
            priority: r.priority,
            metadata: JSON.stringify(r.metadata || {}),
            now,
          },
        }
      );
    }
  },

  async down (queryInterface, Sequelize) {
    const { Op } = Sequelize;
    await queryInterface.bulkDelete(
      'notifications',
      { title: { [Op.in]: ['Niski stan: LAPTOP-001', 'Backup zakończony'] } },
      {}
    );
  },
};
