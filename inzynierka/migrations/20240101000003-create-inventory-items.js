'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      location: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'A1-01-01'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reservedQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      batchNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      manufacturingDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      supplier: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      purchaseOrderNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      condition: {
        type: Sequelize.ENUM('new', 'good', 'fair', 'damaged', 'expired'),
        allowNull: false,
        defaultValue: 'new'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lastUpdatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.addIndex('inventory_items', ['productId']);
    await queryInterface.addIndex('inventory_items', ['location']);
    await queryInterface.addIndex('inventory_items', ['batchNumber']);
    await queryInterface.addIndex('inventory_items', ['expiryDate']);
    await queryInterface.addIndex('inventory_items', ['condition']);
    await queryInterface.addIndex('inventory_items', ['lastUpdatedBy']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_items');
  }
}; 