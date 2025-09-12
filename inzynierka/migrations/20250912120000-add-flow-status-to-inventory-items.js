'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      // Postgres: stworzy typ enum automatycznie
      await queryInterface.addColumn(
        'inventory_items',
        'flowStatus',
        {
          type: Sequelize.ENUM('available', 'in_transit', 'damaged', 'reserved'),
          allowNull: false,
          defaultValue: 'available',
        },
        { transaction: t }
      );

      await queryInterface.addIndex(
        'inventory_items',
        ['flowStatus'],
        { name: 'inventory_items_flowStatus_idx', transaction: t }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeIndex('inventory_items', 'inventory_items_flowStatus_idx', { transaction: t });
      await queryInterface.removeColumn('inventory_items', 'flowStatus', { transaction: t });

      // Postgres: usuń typ enum po kolumnie (bezpiecznie jeśli istnieje)
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === 'postgres') {
        await queryInterface.sequelize.query(
          'DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = \'enum_inventory_items_flowStatus\') THEN DROP TYPE "enum_inventory_items_flowStatus"; END IF; END $$;',
          { transaction: t }
        );
      }
    });
  }
};
