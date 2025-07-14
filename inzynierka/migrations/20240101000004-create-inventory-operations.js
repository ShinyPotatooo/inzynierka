'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_operations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      operationType: {
        type: Sequelize.ENUM('in', 'out', 'transfer', 'adjustment', 'reservation', 'release'),
        allowNull: false
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      inventoryItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'inventory_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      quantityBefore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      quantityAfter: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      fromLocation: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      toLocation: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      referenceNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      referenceType: {
        type: Sequelize.ENUM('purchase_order', 'sales_order', 'transfer_order', 'adjustment', 'inventory_count'),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      operationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('inventory_operations', ['operationType']);
    await queryInterface.addIndex('inventory_operations', ['productId']);
    await queryInterface.addIndex('inventory_operations', ['inventoryItemId']);
    await queryInterface.addIndex('inventory_operations', ['userId']);
    await queryInterface.addIndex('inventory_operations', ['operationDate']);
    await queryInterface.addIndex('inventory_operations', ['referenceType']);
    await queryInterface.addIndex('inventory_operations', ['referenceNumber']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_operations');
  }
}; 